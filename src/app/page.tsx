'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { isLoggedIn } = useAuth();
  
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative bg-indigo-600 py-20 overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-600 to-blue-500"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-0 w-1/3 h-full bg-white transform -skew-x-12"></div>
          <div className="absolute right-0 w-1/4 h-full bg-white transform skew-x-12"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-white">
              Your Local Marketplace on AT Protocol
            </h1>
            <p className="text-xl mb-8 text-indigo-100">
              Buy and sell items within your community, powered by decentralized technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/browse"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-white text-indigo-600 font-medium text-lg hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-indigo-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse Listings
              </Link>
              {isLoggedIn ? (
                <Link
                  href="/create-listing"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-indigo-800 text-white font-medium text-lg hover:bg-indigo-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-800 focus:ring-offset-indigo-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Listing
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-indigo-800 text-white font-medium text-lg hover:bg-indigo-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-800 focus:ring-offset-indigo-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
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
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg shadow-lg bg-white text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-indigo-100 text-indigo-600 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Create Listings</h3>
              <p className="text-gray-600">
                List your items with detailed descriptions, up to 4 high-quality photos, and precise location information.
              </p>
            </div>
            
            <div className="p-6 rounded-lg shadow-lg bg-white text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-indigo-100 text-indigo-600 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Find Local Items</h3>
              <p className="text-gray-600">
                Search for items in your county or city with location-based browsing and view items with our interactive image gallery.
              </p>
            </div>
            
            <div className="p-6 rounded-lg shadow-lg bg-white text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-indigo-100 text-indigo-600 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Connect with Sellers</h3>
              <p className="text-gray-600">
                Contact sellers directly through the AT Protocol's secure messaging after viewing their listings in detail.
              </p>
            </div>
          </div>
          
          {/* New Features Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">New Features</h2>
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-xl shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-gray-900">Enhanced Image Gallery</h3>
                    <p className="text-gray-600">Browse through multiple listing images with our intuitive thumbnail gallery interface.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-gray-900">High-Quality Images</h3>
                    <p className="text-gray-600">Upload up to 4 high-resolution images per listing to showcase your items in detail.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-gray-900">Detailed Listing View</h3>
                    <p className="text-gray-600">See all the important details about each item with our comprehensive listing page.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-gray-900">Responsive Design</h3>
                    <p className="text-gray-600">Enjoy a seamless marketplace experience on any device, from desktop to mobile.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AT Protocol Info Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">Powered by AT Protocol</h2>
              <p className="text-lg text-gray-700 mb-4">
                This marketplace is built on the Authenticated Transfer Protocol, 
                the technology behind Bluesky, offering a decentralized alternative 
                to traditional marketplaces.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Portable identity across different services</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Own your data and content</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Enhanced privacy and security</span>
                </li>
              </ul>
              <a
                href="https://atproto.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-indigo-600 font-medium hover:text-indigo-700"
              >
                Learn more about AT Protocol
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
            
            <div className="md:w-1/2 bg-white p-8 rounded-lg shadow-lg">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-indigo-100 text-indigo-600 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Connect with Your Account</h3>
                <p className="text-gray-600 mb-6">
                  Use your existing Bluesky account to sign in and start using the marketplace.
                </p>
                {isLoggedIn ? (
                  <Link
                    href="/create-listing"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Create Your First Listing
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Sign In with AT Protocol
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to get started?</h2>
            <p className="text-indigo-100 mb-6 max-w-2xl mx-auto">
              Join our growing community of local buyers and sellers today.
            </p>
            <Link
              href="/browse"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-white text-indigo-600 font-medium text-lg hover:bg-indigo-50 transition-colors"
            >
              Explore Marketplace
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
