'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  React.useEffect(() => {
    if (!loading && isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return null; // Will be redirected
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-8 inline-block">
          ← Back to Home
        </Link>
        <LoginForm />
      </div>
    </main>
  );
}
