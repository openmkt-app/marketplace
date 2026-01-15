// src/components/marketplace/ListingDetail/index.tsx
'use client';

import React from 'react';
import type { MarketplaceListing } from '@/lib/marketplace-client';
import ListingImageGallery from '../ListingImageGallery';
import './styles.css';
import { formatConditionForDisplay } from '@/lib/condition-utils';
import { formatPrice } from '@/lib/price-utils';
import { formatCategoryDisplay } from '@/lib/category-utils';
import { extractSubcategoryFromDescription } from '@/lib/category-utils';
import {
  contactSellerViaBluesky,
  canContactSeller,
  formatSellerHandle,
  showContactInfo,
  getSellerDisplayName,
  generateSellerMessage,
  sendMessageToSeller
} from '@/lib/chat-utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';

interface ListingDetailProps {
  listing: MarketplaceListing & {
    authorDid?: string;
    authorHandle?: string;
    uri?: string;
    cid?: string;
  };
}

export default function ListingDetail({ listing }: ListingDetailProps) {
  // Format creation date
  const createdDate = new Date(listing.createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Get clean description without subcategory text
  const { cleanDescription } = extractSubcategoryFromDescription(listing.description);

  // Determine if we have formatted images to display
  const hasFormattedImages = listing.formattedImages && listing.formattedImages.length > 0;

  // Contact/Bot state
  const { isLoggedIn, client, user } = useAuth();
  const [isFollowingBotState, setIsFollowingBotState] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [isSendingInterest, setIsSendingInterest] = useState(false);
  const [interestSent, setInterestSent] = useState(false);

  // Check if user follows bot on mount
  React.useEffect(() => {
    async function checkFollow() {
      if (isLoggedIn && client?.agent && user?.did) {
        // We use our helper (need to import it)
        try {
          // Dynamic import to avoid circular dependencies if any, 
          // or just standard import. Let's assume standard import at top.
          const { isFollowingBot } = await import('@/lib/bot-utils');
          const isFollowing = await isFollowingBot(client.agent, user.did);
          setIsFollowingBotState(isFollowing);
        } catch (e) {
          console.error('Error checking bot follow:', e);
        }
      }
    }
    checkFollow();
  }, [isLoggedIn, client, user]);

  const handleFollowBot = async () => {
    if (!client?.agent) return;
    setIsLoadingFollow(true);
    try {
      const { followBot } = await import('@/lib/bot-utils');
      const success = await followBot(client.agent);
      if (success) {
        setIsFollowingBotState(true);
      } else {
        alert('Failed to follow the bot. Please try again.');
      }
    } catch (e) {
      console.error('Follow bot error:', e);
      alert('Error following bot');
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const handleInterestedClick = async () => {
    if (!listing.authorDid || !user?.handle) return;

    setIsSendingInterest(true);
    try {
      const response = await fetch('/api/bot/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerDid: listing.authorDid,
          listingTitle: listing.title,
          listingPath: window.location.href,
          buyerHandle: user.handle
        })
      });

      const data = await response.json();

      if (response.ok) {
        setInterestSent(true);
        alert('Seller notified! They will follow you back to start a chat.');
      } else {
        alert(`Failed to notify seller: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error notifying seller:', error);
      alert('Failed to send interest notification.');
    } finally {
      setIsSendingInterest(false);
    }
  };

  return (
    <div className="listing-detail">
      <div className="listing-detail-grid">
        <div className="listing-images">
          {hasFormattedImages ? (
            <ListingImageGallery
              images={listing.formattedImages!}
              title={listing.title}
            />
          ) : (
            <div className="listing-no-images">
              <div className="placeholder-text">No images available</div>
            </div>
          )}
        </div>

        <div className="listing-info">
          <h1 className="listing-title">{listing.title}</h1>
          <div className="listing-price">{formatPrice(listing.price)}</div>

          <div className="listing-meta">
            <div className="meta-item">
              <span className="meta-label">Category:</span>
              <span className="meta-value">{formatCategoryDisplay(listing.category, listing)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Condition:</span>
              <span className="meta-value">{formatConditionForDisplay(listing.condition)}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Location:</span>
              <span className="meta-value">
                {listing.location.locality}, {listing.location.county}, {listing.location.state}
                {listing.location.zipPrefix && ` (${listing.location.zipPrefix}xx)`}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Listed on:</span>
              <span className="meta-value">{formattedDate}</span>
            </div>
            {listing.authorHandle && (
              <div className="meta-item">
                <span className="meta-label">Listed by:</span>
                <span className="meta-value">
                  {getSellerDisplayName(listing)}
                </span>
              </div>
            )}
          </div>

          <div className="listing-description">
            <h2>Description</h2>
            <p>{cleanDescription}</p>
          </div>

          <div className="listing-action">
            {isLoggedIn ? (
              // Logged in User View
              <div className="space-y-3">
                {!isFollowingBotState ? (
                  <button
                    className="contact-button bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleFollowBot}
                    disabled={isLoadingFollow}
                  >
                    {isLoadingFollow ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Following...
                      </>
                    ) : (
                      <>
                        <MessageCircle size={18} />
                        Enable Messaging (Follow Bot)
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    className={`contact-button ${interestSent ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                    onClick={handleInterestedClick}
                    disabled={isSendingInterest || interestSent}
                  >
                    {isSendingInterest ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Notifying Seller...
                      </>
                    ) : interestSent ? (
                      <>
                        <Send size={18} />
                        Interest Sent!
                      </>
                    ) : (
                      <>
                        <MessageCircle size={18} />
                        I'm Interested
                      </>
                    )}
                  </button>
                )}

                <p className="text-xs text-gray-500 text-center">
                  To protect privacy, our bot introduces you to the seller.
                  {interestSent && ' Please wait for them to accept your request.'}
                </p>
              </div>
            ) : (
              // Guest View
              <button
                className="contact-button"
                onClick={() => alert('Please log in to contact the seller')}
              >
                <MessageCircle size={18} />
                Log in to Message Seller
              </button>
            )}

            {listing.authorHandle && (
              <p className="seller-info">
                Seller: {getSellerDisplayName(listing)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}