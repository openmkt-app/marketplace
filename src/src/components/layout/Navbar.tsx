'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { isLoggedIn, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="font-bold text-xl">
                AT Marketplace
              </Link>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              <Link 
                href="/" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/') ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-600'
                }`}
              >
                Home
              </Link>
              <Link 
                href="/browse" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/browse') ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-600'
                }`}
              >
                Browse Listings
              </Link>
              <Link 
                href="/create-listing" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/create-listing') ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-600'
                }`}
              >
                Create Listing
              </Link>
            </div>
          </div>
          
          {/* User account section */}
          <div className="hidden md:flex md:items-center">
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">
                  {user ? `@${typeof user === 'string' ? user : user.username || 'user'}` : ''}
                </span>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-indigo-800 hover:bg-indigo-900 rounded-md text-sm font-medium"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-indigo-800 hover:bg-indigo-900 rounded-md text-sm font-medium"
              >
                Log In
              </Link>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-indigo-100 hover:text-white hover:bg-indigo-600 focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                /* Icon when menu is open */
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu, show/hide based on menu state */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              href="/" 
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/') ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-600'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/browse" 
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/browse') ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-600'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Browse Listings
            </Link>
            <Link 
              href="/create-listing" 
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/create-listing') ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-600'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Create Listing
            </Link>
            
            {isLoggedIn ? (
              <>
                <div className="px-3 py-2 text-sm font-medium text-indigo-100">
                  {user ? `@${typeof user === 'string' ? user : user.username || 'user'}` : ''}
                </div>
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-indigo-100 hover:bg-indigo-600"
                >
                  Log Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block px-3 py-2 rounded-md text-sm font-medium text-indigo-100 hover:bg-indigo-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
