// src/lib/crypto-utils.ts
/**
 * Cryptographic utilities for OAuth 2.1 with PKCE and DPoP
 */

/**
 * Generate a cryptographically secure random string
 */
function generateRandomString(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Base64URL encode (without padding)
 */
function base64urlEncode(input: ArrayBuffer | Uint8Array): string {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Generate PKCE code verifier and challenge
 * @returns Object with codeVerifier and codeChallenge
 */
export async function generatePKCE(): Promise<{
    codeVerifier: string;
    codeChallenge: string;
}> {
    // Generate random code verifier (43-128 characters)
    const codeVerifier = generateRandomString(64); // 128 hex chars = 64 bytes

    // Create SHA-256 hash of the verifier
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Base64URL encode the hash
    const codeChallenge = base64urlEncode(hashBuffer);

    return {
        codeVerifier,
        codeChallenge
    };
}

/**
 * Generate a secure random state parameter for OAuth
 */
export function generateState(): string {
    return generateRandomString(32); // 64 hex chars
}

/**
 * Generate a JWK (JSON Web Key) for DPoP
 */
export async function generateDPoPKeyPair(): Promise<{
    privateKey: CryptoKey;
    publicKey: CryptoKey;
    jwk: JsonWebKey;
}> {
    // Generate ES256 key pair (ECDSA with P-256 and SHA-256)
    const keyPair = await crypto.subtle.generateKey(
        {
            name: 'ECDSA',
            namedCurve: 'P-256'
        },
        true, // extractable
        ['sign', 'verify']
    );

    // Export public key as JWK
    const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

    return {
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        jwk
    };
}

/**
 * Create a DPoP proof JWT
 * @param privateKey The private key to sign with
 * @param publicJwk The public key JWK to include in the header
 * @param htm HTTP method (e.g., 'GET', 'POST')
 * @param htu HTTP URI (the target URL)
 * @param nonce Optional server-provided nonce
 */
export async function createDPoPProof(
    privateKey: CryptoKey,
    publicJwk: JsonWebKey,
    htm: string,
    htu: string,
    nonce?: string
): Promise<string> {
    // Create header
    const header = {
        typ: 'dpop+jwt',
        alg: 'ES256',
        jwk: publicJwk
    };

    // Create payload
    const payload: Record<string, any> = {
        htm,
        htu,
        iat: Math.floor(Date.now() / 1000),
        jti: generateRandomString(16) // Unique identifier
    };

    if (nonce) {
        payload.nonce = nonce;
    }

    // Encode header and payload
    const encoder = new TextEncoder();
    const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
    const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));

    // Create signature
    const message = `${headerB64}.${payloadB64}`;
    const messageBuffer = encoder.encode(message);

    const signature = await crypto.subtle.sign(
        {
            name: 'ECDSA',
            hash: 'SHA-256'
        },
        privateKey,
        messageBuffer
    );

    const signatureB64 = base64urlEncode(signature);

    // Return complete JWT
    return `${message}.${signatureB64}`;
}

/**
 * Store DPoP key pair in IndexedDB for persistence
 */
export async function storeDPoPKeyPair(
    privateKey: CryptoKey,
    publicKey: CryptoKey,
    jwk: JsonWebKey
): Promise<void> {
    if (typeof window === 'undefined') return;

    const db = await openDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction('keys', 'readwrite');
        const store = tx.objectStore('keys');

        // Export keys for storage
        Promise.all([
            crypto.subtle.exportKey('jwk', privateKey),
            crypto.subtle.exportKey('jwk', publicKey)
        ]).then(([privateJwk, publicJwk]) => {
            const request = store.put({
                id: 'dpop-keypair',
                privateKey: privateJwk,
                publicKey: publicJwk,
                jwk
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        }).catch(reject);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Retrieve DPoP key pair from IndexedDB
 */
export async function retrieveDPoPKeyPair(): Promise<{
    privateKey: CryptoKey;
    publicKey: CryptoKey;
    jwk: JsonWebKey;
} | null> {
    if (typeof window === 'undefined') return null;

    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction('keys', 'readonly');
            const store = tx.objectStore('keys');
            const request = store.get('dpop-keypair');

            request.onsuccess = async () => {
                const data = request.result;
                if (!data) {
                    console.log('[DPoP IndexedDB] No key pair found in store');
                    resolve(null);
                    return;
                }

                console.log('[DPoP IndexedDB] Found stored key pair, importing...');

                try {
                    // Import keys from stored JWKs
                    const privateKey = await crypto.subtle.importKey(
                        'jwk',
                        data.privateKey,
                        {
                            name: 'ECDSA',
                            namedCurve: 'P-256'
                        },
                        true,
                        ['sign']
                    );

                    const publicKey = await crypto.subtle.importKey(
                        'jwk',
                        data.publicKey,
                        {
                            name: 'ECDSA',
                            namedCurve: 'P-256'
                        },
                        true,
                        ['verify']
                    );

                    console.log('[DPoP IndexedDB] Keys imported successfully');
                    resolve({
                        privateKey,
                        publicKey,
                        jwk: data.jwk
                    });
                } catch (err) {
                    console.error('[DPoP IndexedDB] Failed to import keys:', err);
                    reject(err);
                }
            };

            request.onerror = () => {
                console.error('[DPoP IndexedDB] Request error:', request.error);
                reject(request.error);
            };
        });
    } catch (err) {
        console.error('[DPoP IndexedDB] Failed to open database:', err);
        return null;
    }
}

/**
 * Open IndexedDB for key storage
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        console.log('[DPoP IndexedDB] Opening database...');
        const request = indexedDB.open('openmkt-oauth', 1);

        request.onerror = () => {
            console.error('[DPoP IndexedDB] Failed to open:', request.error);
            reject(request.error);
        };
        request.onsuccess = () => {
            console.log('[DPoP IndexedDB] Database opened successfully');
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            console.log('[DPoP IndexedDB] Upgrading database schema...');
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('keys')) {
                db.createObjectStore('keys', { keyPath: 'id' });
            }
        };
    });
}
