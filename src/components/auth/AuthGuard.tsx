import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  // Add a development mode toggle
  const [devMode, setDevMode] = useState(true);
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isLoggedIn && !devMode) {
      router.push('/login');
    }
  }, [isLoggedIn, loading, router, devMode]);

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

  if (!isLoggedIn && !devMode) {
    return null; // Will redirect to login
  }
  
  // Add a dev mode toggle UI if in dev mode
  if (devMode) {
    return (
      <>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 fixed bottom-0 right-0 z-50 mb-4 mr-4 shadow-lg">
          <div className="flex items-center">
            <div className="text-yellow-700">
              <p className="font-bold">Development Mode</p>
              <p>Authentication bypass enabled</p>
            </div>
            <button 
              onClick={() => setDevMode(false)}
              className="ml-4 px-2 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
            >
              Disable
            </button>
          </div>
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
