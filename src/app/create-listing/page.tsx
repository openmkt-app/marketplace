'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CreateListingForm from '@/components/marketplace/CreateListingForm';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateListingPage() {
  const { client, isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  
  const handleCreateSuccess = () => {
    // Redirect to listings page after successful creation
    router.push('/browse');
  };
  
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-10 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 w-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
            <p className="text-gray-600">
              You need to be logged in to create a listing. Please sign in with your AT Protocol account.
            </p>
          </div>
          
          <div className="flex flex-col space-y-4">
            <Link
              href="/login"
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md text-center"
            >
              Sign In
            </Link>
            
            <Link
              href="/"
              className="text-center text-indigo-600 hover:text-indigo-500 font-medium"
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
    <div className="bg-gray-50 min-h-[calc(100vh-16rem)]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Create New Listing</h1>
          </div>
          
          <div className="p-6">
            <CreateListingForm client={client} onSuccess={handleCreateSuccess} />
          </div>
        </div>
      </div>
    </div>
  );
}
