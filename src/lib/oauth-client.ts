// src/lib/oauth-client.ts
/**
 * OAuth 2.1 Client for AT Protocol
 * Implements authorization code flow with PKCE and DPoP
 */

import { generatePKCE, generateState, generateDPoPKeyPair, createDPoPProof, storeDPoPKeyPair, retrieveDPoPKeyPair } from './crypto-utils';
import logger from './logger';

export interface OAuthTokens {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    sub: string; // User's DID
}

export interface OAuthState {
    codeVerifier: string;
    state: string;
    returnTo?: string;
}

/**
 * Resolve the authorization server for a given handle
 */
async function resolveAuthorizationServer(handle: string): Promise<string> {
    try {
        // Clean handle
        const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

        // Resolve DID from handle
        const didResponse = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(cleanHandle)}`);

        if (!didResponse.ok) {
            throw new Error('Failed to resolve handle to DID');
        }

        const { did } = await didResponse.json();

        // Resolve PDS from DID
        const didDocResponse = await fetch(`https://plc.directory/${did}`);

        if (!didDocResponse.ok) {
            throw new Error('Failed to resolve DID document');
        }

        const didDoc = await didDocResponse.json();

        // Find PDS service
        const pdsService = didDoc.service?.find((s: any) =>
            s.type === 'AtprotoPersonalDataServer'
        );

        if (!pdsService?.serviceEndpoint) {
            throw new Error('No PDS found for user');
        }

        // Fetch PDS metadata to get authorization server
        const pdsMetadataResponse = await fetch(`${pdsService.serviceEndpoint}/.well-known/oauth-protected-resource`);

        if (!pdsMetadataResponse.ok) {
            // Fallback to PDS as auth server
            return pdsService.serviceEndpoint;
        }

        const pdsMetadata = await pdsMetadataResponse.json();

        return pdsMetadata.authorization_servers?.[0] || pdsService.serviceEndpoint;
    } catch (error) {
        logger.error('Failed to resolve authorization server', error as Error);
        // Fallback to default Bluesky auth server
        return 'https://bsky.social';
    }
}

/**
 * Get or create DPoP key pair
 */
async function getDPoPKeyPair() {
    // Try to retrieve existing key pair
    let keyPair = await retrieveDPoPKeyPair();

    if (!keyPair) {
        // Generate new key pair
        console.log('[DPoP] No existing key pair found, generating new one');
        keyPair = await generateDPoPKeyPair();
        await storeDPoPKeyPair(keyPair.privateKey, keyPair.publicKey, keyPair.jwk);
    } else {
        console.log('[DPoP] Retrieved existing key pair from IndexedDB');
    }

    return keyPair;
}

/**
 * Build authorization URL for OAuth flow
 */
export async function getAuthorizationUrl(handle: string): Promise<{
    authUrl: string;
    codeVerifier: string;
    state: string;
    authServer: string;
}> {
    try {
        logger.info('Starting OAuth authorization flow', { meta: { handle } });

        // Generate PKCE parameters
        const { codeVerifier, codeChallenge } = await generatePKCE();
        const state = generateState();

        // Resolve authorization server for this user
        const authServer = await resolveAuthorizationServer(handle);
        logger.info('Resolved authorization server', { meta: { authServer } });

        // Get client metadata
        // client_id must match the URL where the metadata is hosted
        const clientId = 'https://openmkt.app/.well-known/oauth-client-metadata.json';
        let redirectUri = `${window.location.origin}/oauth/callback`;


        // Build authorization URL
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'atproto',
            state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            login_hint: handle
        });

        const authUrl = `${authServer}/oauth/authorize?${params.toString()}`;

        return {
            authUrl,
            codeVerifier,
            state,
            authServer
        };
    } catch (error) {
        logger.error('Failed to build authorization URL', error as Error);
        throw error;
    }
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    authServer: string
): Promise<OAuthTokens> {
    try {
        logger.info('Exchanging authorization code for tokens', { meta: { authServer } });

        if (!authServer || !authServer.startsWith('http')) {
            throw new Error(`Invalid auth server URL: ${authServer}`);
        }

        // Get DPoP key pair
        const dpopKeyPair = await getDPoPKeyPair();

        // Get token endpoint from auth server metadata
        const metadataUrl = `${authServer}/.well-known/oauth-authorization-server`;
        const metadataResponse = await fetch(metadataUrl);

        if (!metadataResponse.ok) {
            throw new Error(`Failed to fetch auth server metadata: ${metadataResponse.status} ${metadataResponse.statusText}`);
        }

        let metadata;
        try {
            metadata = await metadataResponse.json();
        } catch (e) {
            const text = await metadataResponse.text();
            console.error('Failed to parse metadata JSON:', text.substring(0, 100));
            throw new Error(`Invalid JSON from auth server metadata: ${e}`);
        }

        const tokenEndpoint = metadata.token_endpoint;

        if (!tokenEndpoint) {
            throw new Error('No token_endpoint found in auth server metadata');
        }

        // Helper to perform the request, optionally with a nonce
        const performRequest = async (nonce?: string) => {
            // Create DPoP proof for token request
            const dpopProof = await createDPoPProof(
                dpopKeyPair.privateKey,
                dpopKeyPair.jwk,
                'POST',
                tokenEndpoint,
                nonce
            );

            // Prepare token request
            // ALWAYS use production values to match what we expect
            const clientId = 'https://openmkt.app/.well-known/oauth-client-metadata.json';
            const redirectUri = 'https://openmkt.app/oauth/callback';

            const body = new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                code_verifier: codeVerifier
            });

            return fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'DPoP': dpopProof
                },
                body: body.toString()
            });
        };

        // Initial request
        let response = await performRequest();

        // Handle DPoP nonce error (use_dpop_nonce)
        if (!response.ok) {
            // Clone response to read body without consuming the original if we need to throw later
            const checkResponse = response.clone();
            try {
                const errorJson = await checkResponse.json();
                if (errorJson.error === 'use_dpop_nonce') {
                    const nonce = response.headers.get('DPoP-Nonce');
                    if (nonce) {
                        logger.info('Retrying token exchange with new DPoP nonce');
                        response = await performRequest(nonce);
                    }
                }
            } catch (e) {
                // Not a JSON error or other issue, ignore and let standard error handling take over
            }
        }

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token exchange failed: ${error}`);
        }

        const tokens: OAuthTokens = await response.json();

        logger.info('Successfully exchanged code for tokens');

        return tokens;
    } catch (error) {
        logger.error('Failed to exchange code for tokens', error as Error);
        throw error;
    }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
    refreshToken: string,
    authServer: string
): Promise<OAuthTokens> {
    try {
        logger.info('Refreshing access token');

        // Get DPoP key pair
        const dpopKeyPair = await getDPoPKeyPair();

        // Get token endpoint
        const metadataUrl = `${authServer}/.well-known/oauth-authorization-server`;
        const metadataResponse = await fetch(metadataUrl);

        if (!metadataResponse.ok) {
            throw new Error(`Failed to fetch auth server metadata: ${metadataResponse.status}`);
        }

        const metadata = await metadataResponse.json();
        const tokenEndpoint = metadata.token_endpoint;

        // Helper to perform the request, optionally with a nonce
        const performRequest = async (nonce?: string) => {
            // Create DPoP proof
            const dpopProof = await createDPoPProof(
                dpopKeyPair.privateKey,
                dpopKeyPair.jwk,
                'POST',
                tokenEndpoint,
                nonce
            );

            // Prepare refresh request
            const clientId = 'https://openmkt.app/.well-known/oauth-client-metadata.json';

            const body = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: clientId
            });

            return fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'DPoP': dpopProof
                },
                body: body.toString()
            });
        };

        // Initial request
        let response = await performRequest();

        // Handle DPoP nonce error (use_dpop_nonce)
        if (!response.ok) {
            const checkResponse = response.clone();
            try {
                const errorJson = await checkResponse.json();
                if (errorJson.error === 'use_dpop_nonce') {
                    const nonce = response.headers.get('DPoP-Nonce');
                    if (nonce) {
                        logger.info('Retrying token refresh with new DPoP nonce');
                        response = await performRequest(nonce);
                    }
                }
            } catch (e) {
                // Ignore
            }
        }

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token refresh failed: ${error}`);
        }

        const tokens: OAuthTokens = await response.json();

        logger.info('Successfully refreshed access token');

        return tokens;
    } catch (error) {
        logger.error('Failed to refresh access token', error as Error);
        throw error;
    }
}

/**
 * Create DPoP proof for authenticated requests
 */
export async function createRequestDPoPProof(
    method: string,
    url: string,
    nonce?: string
): Promise<string> {
    const dpopKeyPair = await getDPoPKeyPair();
    return createDPoPProof(dpopKeyPair.privateKey, dpopKeyPair.jwk, method, url, nonce);
}
