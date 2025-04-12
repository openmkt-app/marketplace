'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { isLoggedIn } = useAuth();
  
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="hero-gradient text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
              Your Local Marketplace on AT Protocol
            </h1>
            <p className="text-xl mb-8">
              Buy and sell items within your community, powered by decentralized technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/browse"
                className="px-6 py-3 rounded-md bg-white text-indigo-600 font-medium text-lg hover:bg-gray-100 transition-colors"
              >
                Browse Listings
              </Link>
              {isLoggedIn ? (
                <Link
                  href="/create-listing"
                  className="px-6 py-3 rounded-md bg-indigo-800 font-medium text-lg hover:bg-indigo-900 transition-colors"
                >
                  Create Listing
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-md bg-indigo-800 font-medium text-lg hover:bg-indigo-900 transition-colors"
                >
                  Log In to Create Listings
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg shadow-md bg-gray-50 text-center">
              <div className="text-5xl feature-icon mb-4">✓</div>
              <h3 className="text-xl font-semibold mb-3">Create Listings</h3>
              <p className="text-gray-600">
                List your items with detailed descriptions, photos, and location information.
              </p>
            </div>
            
            <div className="p-6 rounded-lg shadow-md bg-gray-50 text-center">
              <div className="text-5xl feature-icon mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-3">Find Local Items</h3>
              <p className="text-gray-600">
                Search for items in your county or city with location-based browsing.
              </p>
            </div>
            
            <div className="p-6 rounded-lg shadow-md bg-gray-50 text-center">
              <div className="text-5xl feature-icon mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-3">Connect with Sellers</h3>
              <p className="text-gray-600">
                Contact sellers directly through the AT Protocol's secure messaging.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AT Protocol Info Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold mb-6">Powered by AT Protocol</h2>
              <p className="text-lg text-gray-700 mb-4">
                This marketplace is built on the Authenticated Transfer Protocol, 
                the technology behind Bluesky, offering a decentralized alternative 
                to traditional marketplaces.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Portable identity across different services</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Own your data and content</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-2">•</span>
                  <span>Enhanced privacy and security</span>
                </li>
              </ul>
              <a
                href="https://atproto.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 font-medium hover:text-indigo-700"
              >
                Learn more about AT Protocol →
              </a>
            </div>
            
            <div className="md:w-1/2 bg-white p-8 rounded-lg shadow-md">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-4">Connect with Your Account</h3>
                <p className="text-gray-600 mb-6">
                  Use your existing Bluesky account to sign in and start using the marketplace.
                </p>
                {isLoggedIn ? (
                  <Link
                    href="/create-listing"
                    className="inline-block px-6 py-3 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Create Your First Listing
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="inline-block px-6 py-3 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Sign In with AT Protocol
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
