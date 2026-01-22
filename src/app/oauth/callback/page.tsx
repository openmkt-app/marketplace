'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { exchangeCodeForTokens } from '@/lib/oauth-client';
import logger from '@/lib/logger';

function OAuthCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        async function handleCallback() {
            try {
                // Get authorization code and state from URL
                const code = searchParams.get('code');
                const state = searchParams.get('state');
                const errorParam = searchParams.get('error');
                const errorDescription = searchParams.get('error_description');

                // Check for OAuth errors
                if (errorParam) {
                    throw new Error(errorDescription || errorParam);
                }

                if (!code || !state) {
                    throw new Error('Missing authorization code or state');
                }

                // Retrieve stored OAuth state
                const storedCodeVerifier = sessionStorage.getItem('oauth_verifier');
                const storedState = sessionStorage.getItem('oauth_state');
                const storedAuthServer = sessionStorage.getItem('oauth_auth_server');
                const returnTo = sessionStorage.getItem('oauth_return_to') || '/';

                if (!storedCodeVerifier || !storedState || !storedAuthServer) {
                    throw new Error('OAuth state not found. Please try logging in again.');
                }

                // Verify state matches (CSRF protection)
                if (state !== storedState) {
                    throw new Error('Invalid state parameter. Possible CSRF attack.');
                }

                logger.info('Processing OAuth callback', { meta: { code: code.substring(0, 10) + '...' } });

                // Exchange code for tokens
                const tokens = await exchangeCodeForTokens(code, storedCodeVerifier, storedAuthServer);

                // Store tokens in localStorage (include authServer for session resume)
                const tokenData = {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    tokenType: tokens.token_type,
                    expiresAt: Date.now() + (tokens.expires_in * 1000),
                    scope: tokens.scope,
                    did: tokens.sub,
                    authServer: storedAuthServer
                };

                localStorage.setItem('oauth_tokens', JSON.stringify(tokenData));

                // Clear OAuth state from sessionStorage
                sessionStorage.removeItem('oauth_verifier');
                sessionStorage.removeItem('oauth_state');
                sessionStorage.removeItem('oauth_auth_server');
                sessionStorage.removeItem('oauth_return_to');

                logger.info('OAuth login successful', { meta: { did: tokens.sub } });

                // Trigger a custom event to notify AuthContext
                window.dispatchEvent(new CustomEvent('oauth-login-success', { detail: tokenData }));

                // Redirect to original destination
                router.push(returnTo);
            } catch (err: any) {
                logger.error('OAuth callback error', err);
                setError(err.message || 'Failed to complete OAuth login');
                setIsProcessing(false);
            }
        }

        handleCallback();
    }, [searchParams, router]);

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mb-2">Login Failed</h1>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => router.push('/login')}
                            className="w-full py-2 px-4 bg-primary-color hover:bg-primary-light text-white font-medium rounded-md transition"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                        <div className="animate-spin h-6 w-6 border-2 border-primary-color border-t-transparent rounded-full"></div>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Completing Login...</h1>
                    <p className="text-gray-600">Please wait while we finish setting up your session.</p>
                </div>
            </div>
        </div>
    );
}

export default function OAuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary-color border-t-transparent rounded-full"></div>
            </div>
        }>
            <OAuthCallbackContent />
        </Suspense>
    );
}
