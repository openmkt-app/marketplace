import { Suspense } from 'react';
import { Metadata } from 'next';
import LoginPageClient from './LoginPageClient';

export const metadata: Metadata = {
  title: 'Login to Open Market',
  description: 'Sign in to your Open Market account to manage your store and listings.',
  alternates: {
    canonical: '/login',
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary-color border-t-transparent rounded-full"></div>
      </div>
    }>
      <LoginPageClient />
    </Suspense>
  );
}
