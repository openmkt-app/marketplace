import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Thin wrapper that delegates to the OAuth login flow.
 * The legacy password form has been removed.
 */
export default function LoginForm() {
  const { loginWithOAuth, isLoading } = useAuth();
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!handle) {
      setError('Handle is required');
      return;
    }

    try {
      await loginWithOAuth(handle);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Sign in with AT Protocol</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="handle" className="block text-sm font-medium mb-1">
            AT Protocol Handle
          </label>
          <input
            type="text"
            id="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="you.bsky.social or you.your-domain.com"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
        >
          {isLoading ? 'Redirecting...' : 'Sign in with AT Protocol'}
        </button>
      </form>
    </div>
  );
}
