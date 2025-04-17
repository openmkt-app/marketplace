'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CreateListingForm from '@/components/marketplace/CreateListingForm';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateListingPage() {
  const { client, isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  
  const handleCreateSuccess = (listingUri?: string) => {
    console.log('Listing creation successful:', listingUri);
    
    // If we have a URI, redirect to the listing page with success flag
    if (listingUri) {
      // Extract the ID part from the URI to construct the URL
      const uriParts = listingUri.split('/');
      const listingId = uriParts[uriParts.length - 1];
      
      // Redirect to the listing page with a success flag
      // The flag will be used to show a confirmation message
      router.push(`/listing/${listingId}?newListing=true`);
    } else {
      // If no URI, redirect to browse with a generic success message
      router.push('/browse?listingCreated=true');
    }
  };
  
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-10 w-48 bg-neutral-light rounded mb-4"></div>
          <div className="h-4 w-64 bg-neutral-light rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2 text-text-primary">Authentication Required</h1>
            <p className="text-text-secondary">
              You need to be logged in to create a listing. Please sign in with your AT Protocol account.
            </p>
          </div>
          
          <div className="flex flex-col space-y-4">
            <Link
              href="/login"
              className="w-full py-2 px-4 bg-primary-color hover:bg-primary-light text-white font-medium rounded-md text-center"
            >
              Sign In
            </Link>
            
            <Link
              href="/"
              className="text-center text-primary-color hover:text-primary-light font-medium"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!client) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: Client not initialized. Please try refreshing the page.
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-background min-h-[calc(100vh-16rem)]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-primary-color to-primary-light px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Create New Listing</h1>
            <p className="text-white text-opacity-90 mt-1">List your item for sale in the marketplace</p>
          </div>
          
          <div className="p-6">
            <CreateListingForm 
              client={client} 
              onSuccess={handleCreateSuccess} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
