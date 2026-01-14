'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, Suspense, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SearchBar from '../marketplace/filters/SearchBar';
import { generateAvatarUrl } from '@/lib/image-utils';

// Wrapper for search param usage
const NavbarContent = () => {
  const { isLoggedIn, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('q') || '';

  // Handle search - only navigate when user actively searches, not on passive state changes
  const handleSearch = useCallback((query?: string) => {
    // Only handle search navigation when we're on the browse page
    // This prevents redirecting back to browse when navigating away
    if (pathname !== '/browse') {
      return;
    }

    // Normalize queries to handle undefined vs empty string
    const currentQ = searchParams.get('q') || '';
    const newQ = query || '';

    // Avoid redundant updates
    if (currentQ === newQ) {
      return;
    }

    const newParams = new URLSearchParams(searchParams.toString());

    if (query) {
      newParams.set('q', query);
    } else {
      newParams.delete('q');
    }

    const url = `/browse?${newParams.toString()}`;
    router.replace(url); // Replace history to avoid back-button hell for every keystroke
  }, [pathname, router, searchParams]);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const isActive = (path: string) => {
    return pathname === path;
  };

  // Get display name from user object
  const getDisplayName = () => {
    if (!user) return '';

    // Check if user has handle property (which is what we're using in AuthContext)
    if (user.handle) {
      return `@${user.handle}`;
    }

    // Fallbacks for other possible user formats
    if (typeof user === 'string') {
      return `@${user}`;
    }

    if ('username' in user) {
      return `@${user.username}`;
    }

    if ('did' in user) {
      // If we only have DID, show a shortened version
      return `@${user.did.substring(0, 8)}...`;
    }

    return '@user';
  };

  return (
    <nav
      className={`sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-300 ${scrolled ? 'shadow-md' : ''
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 cursor-pointer group">
            <div className="bg-primary-color text-white p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              AT <span className="text-primary-color">Market</span>
            </span>
          </Link>

          {/* Search Bar - Centered */}
          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <SearchBar
              initialValue={currentQuery}
              onSearchChange={handleSearch}
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              href="/create-listing"
              className="hidden sm:flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800 transition-colors shadow-md"
            >
              <span className="text-sm font-medium">Sell Item</span>
            </Link>

            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-700">
                  {getDisplayName()}
                </div>
                <button
                  onClick={logout}
                  className="text-sm text-slate-600 hover:text-slate-900 hidden md:block"
                >
                  Log Out
                </button>
                {user?.did && user?.avatarCid ? (
                  <div className="h-8 w-8 rounded-full border-2 border-white shadow-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-color transition-all relative">
                    <Image
                      src={generateAvatarUrl(user.did, user.avatarCid) || ''}
                      alt={user.displayName || user.handle || 'User'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary-color/10 border-2 border-white shadow-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-color transition-all flex items-center justify-center text-primary-color font-bold">
                    {user?.handle ? user.handle.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-primary-color text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-primary-light transition-colors shadow-sm"
              >
                Log In
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search (visible only on small screens) */}
        <div className="md:hidden pb-4">
          <SearchBar
            initialValue={currentQuery}
            onSearchChange={handleSearch}
          />
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-4 space-y-2">
            <Link
              href="/"
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/') ? 'bg-primary-color/10 text-primary-color' : 'text-slate-600 hover:bg-gray-50'
                }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/browse"
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/browse') ? 'bg-primary-color/10 text-primary-color' : 'text-slate-600 hover:bg-gray-50'
                }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Browse Listings
            </Link>
            <Link
              href="/create-listing"
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/create-listing') ? 'bg-primary-color/10 text-primary-color' : 'text-slate-600 hover:bg-gray-50'
                }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Sell Item
            </Link>

            {isLoggedIn ? (
              <>
                <div className="px-4 py-3 mt-2 border-t border-gray-100">
                  <div className="text-sm font-medium text-slate-700 mb-2">
                    {getDisplayName()}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-2 mt-2 border-t border-gray-100">
                <Link
                  href="/login"
                  className="block w-full text-center bg-primary-color text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-primary-light transition-colors shadow-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log In
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default function Navbar() {
  return (
    <Suspense fallback={<nav className="h-16 bg-white shadow-sm"></nav>}>
      <NavbarContent />
    </Suspense>
  );
}