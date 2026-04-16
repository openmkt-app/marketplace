'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { processOAuthCallback } from '@/lib/oauth-client';
import logger from '@/lib/logger';

function OAuthCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function handleCallback() {
            try {
                // Check for OAuth errors in the URL first
                const errorParam = searchParams.get('error');
                const errorDescription = searchParams.get('error_description');
                if (errorParam) {
                    throw new Error(errorDescription || errorParam);
                }

                logger.info('Processing OAuth callback');

                // Exchange the authorization code for tokens.
                // BrowserOAuthClient handles PKCE verification, DPoP key management,
                // and persists the session in IndexedDB automatically.
                const { session, state } = await processOAuthCallback();

                logger.info('OAuth callback processed', { meta: { did: session.did } });

                // Notify AuthContext so it can set up the user without a full page reload
                window.dispatchEvent(
                    new CustomEvent('oauth-login-success', { detail: { session } })
                );

                // Redirect to the page the user was on before login (stored in OAuth state param)
                const returnTo = state && state.startsWith('/') ? state : '/';
                router.push(returnTo);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to complete login';
                logger.error('OAuth callback error', err instanceof Error ? err : new Error(message));
                setError(message);
            }
        }

        handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
