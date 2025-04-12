// src/app/create-listing/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MarketplaceClient from '@/lib/marketplace-client';
import CreateListingForm from '@/components/marketplace/CreateListingForm';
import Link from 'next/link';

export default function CreateListingPage() {
  const [client, setClient] = useState<MarketplaceClient | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    // Initialize client
    const newClient = new MarketplaceClient();
    setClient(newClient);
    
    // Check login status
    // In a real app, you'd implement proper auth state management
    setIsLoggedIn(false);
  }, []);
  
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };
  
  const handleCreateSuccess = () => {
    // Redirect to listings page after successful creation
    router.push('/browse');
  };
  
  if (!client) {
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
          {/* In a real app, you'd have a login form here */}
          <button
            onClick={() => handleLoginSuccess()}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
          >
            Mock Login (Demo Only)
          </button>
        </div>
      </div>
    );
  }
  
  return <CreateListingForm client={client} onSuccess={handleCreateSuccess} />;
}