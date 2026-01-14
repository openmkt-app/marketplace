'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <AuthGuard>
      <Navbar />
      <main className="max-w-4xl mx-auto p-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 text-blue-800 rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mr-4">
                {user?.handle?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user?.handle || 'User'}</h2>
                <p className="text-gray-600">AT Protocol User</p>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Account Information</h3>
              <div className="space-y-2">
                <div className="flex">
                  <span className="text-gray-600 w-24">Handle:</span>
                  <span className="font-medium">{user?.handle || 'N/A'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-24">DID:</span>
                  <span className="font-medium text-sm overflow-auto">
                    {user?.did || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Link 
                  href="/my-listings"
                  className="block text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
                >
                  My Listings
                </Link>
              </div>
              
              <div>
                <button
                  onClick={logout}
                  className="w-full py-2 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">My Listings</h2>
          
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 mb-4">
              You don&apos;t have any active listings yet.
            </p>
            <Link 
              href="/create-listing"
              className="inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
            >
              Create Your First Listing
            </Link>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
