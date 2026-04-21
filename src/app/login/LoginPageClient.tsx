'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

function AtProtoIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
        </svg>
    );
}

export default function LoginPageClient() {
    const [handle, setHandle] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { loginWithOAuth, isLoggedIn, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoggedIn && !isLoading) {
            router.replace('/');
        }
    }, [isLoggedIn, isLoading, router]);

    const handleOAuthLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const trimmed = handle.trim();

        if (trimmed.includes('@') && !trimmed.startsWith('@')) {
            setError("Enter your AT Protocol handle (e.g. alice.bsky.social or alice.tangled.org), not your email address.");
            setIsSubmitting(false);
            return;
        }

        // Strip leading @ from handles
        const normalized = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

        try {
            await loginWithOAuth(normalized);
            // Browser redirects to Bluesky — this line won't be reached
        } catch (err) {
            setError(`Login failed: ${err instanceof Error ? err.message : String(err)}`);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="w-full max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
                    <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
                        <div className="flex justify-center mb-3">
                            <AtProtoIcon className="h-10 w-10 text-[#0085ff]" />
                        </div>
                        <h2 className="text-center text-3xl font-extrabold text-text-primary mb-2">Welcome Back!</h2>
                        <p className="text-center text-sm text-text-secondary">
                            Manage your Storefront and explore the Marketplace.
                        </p>
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-50 p-4 mb-6">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">Hmm, that didn&apos;t work</h3>
                                    <p className="text-sm text-red-700 mt-1">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleOAuthLogin}>
                        <div>
                            <label htmlFor="handle" className="block text-sm font-medium text-text-primary">
                                AT Protocol Handle
                            </label>
                            <div className="mt-1">
                                <input
                                    id="handle"
                                    name="handle"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={handle}
                                    onChange={(e) => setHandle(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-neutral-medium rounded-lg shadow-sm placeholder-text-secondary/50 focus:outline-none focus:ring-primary-color focus:border-primary-color sm:text-sm"
                                    placeholder="you.bsky.social or you.your-domain.com"
                                />
                            </div>
                            <p className="mt-2 text-xs text-text-secondary">
                                You&apos;ll be redirected to your PDS to securely authorize access.
                            </p>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting || isLoading}
                                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#0085ff] hover:bg-[#0073e6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0085ff] disabled:bg-[#0085ff]/70 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Redirecting to your provider...
                                    </>
                                ) : (
                                    <>
                                        <AtProtoIcon className="h-5 w-5" />
                                        Sign in with AT Protocol
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-blue-700">Secure by design</h3>
                                    <p className="mt-1 text-sm text-blue-600">
                                        Your password stays with your own PDS. Open Market only receives a scoped access token.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="text-sm text-center">
                            <p className="text-text-secondary">
                                New to the AT Protocol?{' '}
                                <a
                                    href="https://bsky.app/signup"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-primary-color hover:text-primary-light"
                                >
                                    Get started on Bluesky
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <Link href="/" className="text-sm font-medium text-primary-color hover:text-primary-light">
                        ← Back to browsing
                    </Link>
                </div>
            </div>
        </div>
    );
}
