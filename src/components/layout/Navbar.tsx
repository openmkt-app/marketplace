'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { isLoggedIn, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

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
      className={`sticky top-0 z-50 bg-white shadow-sm transition-all duration-300 ${
        scrolled ? 'shadow-md' : ''
      }`}
    >
      <div className="container-custom">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="font-bold text-xl text-primary-color tracking-tight">
                AT Marketplace
              </Link>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden md:ml-8 md:flex md:items-center md:space-x-2">
              <Link 
                href="/" 
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
              >
                Home
              </Link>
              <Link 
                href="/browse" 
                className={`nav-link ${isActive('/browse') ? 'active' : ''}`}
              >
                Browse
              </Link>
              <Link 
                href="/create-listing" 
                className={`nav-link ${isActive('/create-listing') ? 'active' : ''}`}
              >
                Sell
              </Link>
            </div>
          </div>
          
          {/* User account section */}
          <div className="hidden md:flex md:items-center md:space-x-3">
            {isLoggedIn ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-text-primary">
                  {getDisplayName()}
                </span>
                <button
                  onClick={logout}
                  className="btn-tertiary"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="space-x-2">
                <Link
                  href="/login"
                  className="btn-tertiary"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="btn-primary"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-text-primary hover:bg-neutral-light transition-colors"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-neutral-light">
          <div className="container-custom py-2 space-y-1">
            <Link 
              href="/" 
              className={`list-item ${isActive('/') ? 'bg-neutral-light text-primary-color font-medium' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/browse" 
              className={`list-item ${isActive('/browse') ? 'bg-neutral-light text-primary-color font-medium' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Browse Listings
            </Link>
            <Link 
              href="/create-listing" 
              className={`list-item ${isActive('/create-listing') ? 'bg-neutral-light text-primary-color font-medium' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Create Listing
            </Link>
            
            <div className="pt-2 mt-2 border-t border-neutral-light">
              {isLoggedIn ? (
                <>
                  <div className="px-3 py-2 text-sm font-medium text-text-primary">
                    {getDisplayName()}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="list-item w-full text-left"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 p-3">
                  <Link
                    href="/login"
                    className="btn-tertiary w-full text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    className="btn-primary w-full text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}