'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { isLoggedIn, user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md py-4">
      <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600">
          AT Marketplace
        </Link>
        
        <div className="flex items-center space-x-4">
          <Link href="/browse" className="text-gray-700 hover:text-blue-600">
            Browse
          </Link>
          
          {isLoggedIn ? (
            <>
              <Link href="/create-listing" className="text-gray-700 hover:text-blue-600">
                Create Listing
              </Link>
              
              <div className="relative group">
                <button className="flex items-center text-gray-700 hover:text-blue-600">
                  <span className="mr-1">{user?.handle || 'Account'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <Link 
                    href="/profile" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile
                  </Link>
                  <Link 
                    href="/my-listings" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    My Listings
                  </Link>
                  <button 
                    onClick={logout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Link 
              href="/login"
              className="inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
