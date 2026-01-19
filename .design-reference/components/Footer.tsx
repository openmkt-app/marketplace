import React from 'react';
import { Github, Twitter } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Brand */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-900">AT Marketplace</h3>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              Reclaiming commerce for the community. Buy, sell, and trade freely on the open web—without the walled gardens.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors"><Github size={20} /></a>
              <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors"><Twitter size={20} /></a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-brand-600 transition-colors">Home</a></li>
              <li><a href="#" className="hover:text-brand-600 transition-colors">Browse Listings</a></li>
              <li><a href="#" className="hover:text-brand-600 transition-colors">Sell an Item</a></li>
              <li><a href="#" className="hover:text-brand-600 transition-colors">Help Center</a></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">About AT Protocol</h4>
            <p className="text-sm text-gray-500 mb-4">
              The Authenticated Transfer Protocol is a decentralized social networking technology developed by Bluesky.
            </p>
            <a href="#" className="text-brand-600 text-sm font-medium hover:underline">Learn more &rarr;</a>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-12 pt-8 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} AT Marketplace. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;