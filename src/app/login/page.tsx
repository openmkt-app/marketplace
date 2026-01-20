'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isLoading, isLoggedIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Use the real login function from the auth context
      const success = await login(username, password);

      if (success) {
        router.push('/');
      } else {
        setError('Oops! Wrong username or password');
      }
    } catch (err) {
      setError(`Login hiccup: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="w-full max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
            <h2 className="text-center text-3xl font-extrabold text-text-primary mb-2">Welcome Back!</h2>
            <p className="text-center text-sm text-text-secondary">
              Jump back into your neighborhood marketplace
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

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-text-primary">
                Your Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-neutral-medium rounded-lg shadow-sm placeholder-text-secondary/50 focus:outline-none focus:ring-primary-color focus:border-primary-color sm:text-sm"
                  placeholder="username.bsky.social"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-neutral-medium rounded-lg shadow-sm placeholder-text-secondary/50 focus:outline-none focus:ring-primary-color focus:border-primary-color sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-color hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-color disabled:bg-primary-light/70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Just a sec...
                  </div>
                ) : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div>
              <div className="rounded-md bg-primary-light/10 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-primary-color" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex flex-col">
                    <h3 className="text-sm font-medium text-primary-color">Quick Tip</h3>
                    <div className="mt-1 text-sm text-text-secondary">
                      <p>
                        Already on Bluesky? Use those same login details here! No need to create a new account.
                      </p>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-center">
              <p className="text-text-secondary">
                New to this whole thing?{' '}
                <a
                  href="https://bsky.app/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary-color hover:text-primary-light"
                >
                  Get a Bluesky account
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
