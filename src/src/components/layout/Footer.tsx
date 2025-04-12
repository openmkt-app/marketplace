'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">AT Marketplace</h3>
            <p className="text-gray-300 text-sm">
              A decentralized local marketplace built on the AT Protocol,
              connecting buyers and sellers in your community.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/browse" className="text-gray-300 hover:text-white">
                  Browse Listings
                </Link>
              </li>
              <li>
                <Link href="/create-listing" className="text-gray-300 hover:text-white">
                  Create Listing
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">About AT Protocol</h3>
            <p className="text-gray-300 text-sm mb-4">
              The Authenticated Transfer Protocol is a decentralized social networking
              technology developed by Bluesky.
            </p>
            <a 
              href="https://atproto.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Learn more about AT Protocol →
            </a>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} AT Marketplace. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
