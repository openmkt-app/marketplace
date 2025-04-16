'use client';

import React, { useState, useEffect } from 'react';

interface SellerFilterProps {
  verified?: boolean;
  network?: boolean;
  onChange: (verified?: boolean, network?: boolean) => void;
}

export default function SellerFilter({ 
  verified = false, 
  network = false, 
  onChange 
}: SellerFilterProps) {
  const [isVerified, setIsVerified] = useState<boolean>(verified);
  const [inNetwork, setInNetwork] = useState<boolean>(network);

  // Handle verified seller toggle
  const handleVerifiedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsVerified(e.target.checked);
  };

  // Handle in-network toggle
  const handleNetworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInNetwork(e.target.checked);
  };

  // Update parent component when selections change
  useEffect(() => {
    onChange(isVerified || undefined, inNetwork || undefined);
  }, [isVerified, inNetwork, onChange]);

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-700">Seller Filters</h3>
      
      <div className="space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isVerified}
            onChange={handleVerifiedChange}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <div className="ml-2">
            <span className="text-gray-700">Verified Sellers</span>
            <p className="text-sm text-gray-500">Only show listings from sellers with verified accounts</p>
          </div>
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={inNetwork}
            onChange={handleNetworkChange}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <div className="ml-2">
            <span className="text-gray-700">In My Network</span>
            <p className="text-sm text-gray-500">Only show listings from sellers in your social graph</p>
          </div>
        </label>
      </div>
      
      <div className="py-2 px-3 bg-blue-50 rounded-md text-sm text-blue-800 flex items-start">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0 mt-0.5" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
            clipRule="evenodd" 
          />
        </svg>
        <p>Verified sellers have confirmed their identity and are more likely to be trustworthy.</p>
      </div>
    </div>
  );
} 