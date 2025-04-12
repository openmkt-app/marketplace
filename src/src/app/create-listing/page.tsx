'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CreateListingForm from '@/components/marketplace/CreateListingForm';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateListingPage() {
  const { client, isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  
  const handleCreateSuccess = () => {
    // Redirect to listings page after successful creation
    router.push('/browse');
  };
  
  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }
  
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Login Required</h1>
        <p className="mb-4">
          You need to be logged in to create a listing. Please log in with your AT Protocol account.
        </p>
        <div className="flex flex-col space-y-4">
          <Link href="/" className="text-blue-600 hover:underline">
            Return to Home
          </Link>
          {/* In a real app, you'd have a login form or button here */}
          <Link 
            href="/login" 
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-center"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }
  
  if (!client) {
    return <div className="p-4">Error: Client not initialized</div>;
  }
  
  return <CreateListingForm client={client} onSuccess={handleCreateSuccess} />;
}
