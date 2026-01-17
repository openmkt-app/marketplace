import { BskyAgent } from '@atproto/api';
import type { MarketplaceListing } from './marketplace-client';

/**
 * Generate a pre-filled message for contacting a seller about a listing
 */
export function generateSellerMessage(listing: MarketplaceListing): string {
  const listingUrl = typeof window !== 'undefined' ? window.location.href : '';

  return `Hi! I'm interested in your listing: "${listing.title}" - ${listing.price}. Is this still available?

Listing: ${listingUrl}`;
}

/**
 * Open Bluesky to contact the seller
 * Opens the seller's profile where the user can click "Message" to start a chat
 * Note: Bluesky doesn't support direct DM links, so we link to the profile instead
 */
export function contactSellerViaBluesky(
  sellerHandle: string,
  listing: MarketplaceListing
): void {
  // Clean up the handle (remove @ if present)
  const cleanHandle = sellerHandle.startsWith('@') ? sellerHandle.slice(1) : sellerHandle;

  // Bluesky profile URL - users can click "Message" button from the profile
  const blueskyProfileUrl = `https://bsky.app/profile/${cleanHandle}`;

  // Detect if we're on mobile
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (isMobile) {
    // Try to open Bluesky app with profile URL scheme
    const blueskyAppUrl = `bluesky://profile/${cleanHandle}`;

    // Create a hidden iframe to try the app URL
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = blueskyAppUrl;
    document.body.appendChild(iframe);

    // Fallback to web after a short delay if app doesn't open
    setTimeout(() => {
      document.body.removeChild(iframe);
      window.open(blueskyProfileUrl, '_blank');
    }, 1500);
  } else {
    // Desktop: open web profile
    window.open(blueskyProfileUrl, '_blank');
  }
}

/**
 * Send a message to a seller using the Bluesky Chat API
 */
export async function sendMessageToSeller(
  agent: BskyAgent,
  sellerDid: string,
  message: string
): Promise<{ success: boolean; error?: string; errorCode?: 'REQUIRES_FOLLOW' | 'UNKNOWN' }> {
  try {
    if (!agent.session) {
      return { success: false, error: 'User is not logged in' };
    }

    // 1. Get a service auth token for getConvoForMembers
    console.log('Requesting service auth token for getConvoForMembers...');
    const convoAuth = await agent.api.com.atproto.server.getServiceAuth({
      aud: 'did:web:api.bsky.chat',
      lxm: 'chat.bsky.convo.getConvoForMembers',
    });

    if (!convoAuth.success) {
      console.error('Failed to get service auth token for convo', convoAuth);
      return { success: false, error: 'Could not authenticate with chat service' };
    }

    const convoToken = convoAuth.data.token;

    // 2. Create a specialized agent for the chat service
    const chatAgent = new BskyAgent({
      service: 'https://api.bsky.chat'
    });

    console.log(`Getting conversation with ${sellerDid} via Chat Service directly...`);

    let convoId: string;

    // 3. Get or create conversation
    try {
      const convoResponse = await chatAgent.api.chat.bsky.convo.getConvoForMembers(
        { members: [sellerDid] },
        { headers: { Authorization: `Bearer ${convoToken}` } }
      );

      if (!convoResponse.success) {
        console.error('Failed to get conversation', convoResponse);
        return { success: false, error: 'Could not connect to chat service' };
      }

      convoId = convoResponse.data.convo.id;
      console.log(`Found conversation ID: ${convoId}`);
    } catch (apiError: any) {
      // Check for specific error message regarding followers
      const errorMessage = apiError.message || apiError.error || '';
      if (
        errorMessage.includes('recipient requires incoming messages to come from someone they follow') ||
        (apiError.error === 'AuthRequired' && errorMessage.includes('follow'))
      ) {
        return {
          success: false,
          error: 'This seller only accepts messages from users they follow.',
          errorCode: 'REQUIRES_FOLLOW'
        };
      }
      throw apiError;
    }

    // 4. Get a NEW service auth token specifically for sendMessage
    console.log('Requesting service auth token for sendMessage...');
    const messageAuth = await agent.api.com.atproto.server.getServiceAuth({
      aud: 'did:web:api.bsky.chat',
      lxm: 'chat.bsky.convo.sendMessage',
    });

    if (!messageAuth.success) {
      console.error('Failed to get service auth token for message', messageAuth);
      return { success: false, error: 'Could not authenticate with chat service for sending' };
    }

    const messageToken = messageAuth.data.token;

    // 5. Send the message with the new token
    try {
      const sendResponse = await chatAgent.api.chat.bsky.convo.sendMessage(
        {
          convoId: convoId,
          message: {
            text: message
          }
        },
        { headers: { Authorization: `Bearer ${messageToken}` }, encoding: 'application/json' }
      );

      if (!sendResponse.success) {
        console.error('Failed to send message', sendResponse);
        return { success: false, error: 'Failed to send message' };
      }

      console.log('Message sent successfully!');
      return { success: true };

    } catch (apiError: any) {
      console.error('API Error details:', apiError);

      // Check for specific error message regarding followers (just in case it happens at send time too)
      const errorMessage = apiError.message || apiError.error || '';

      if (
        errorMessage.includes('recipient requires incoming messages to come from someone they follow') ||
        (apiError.error === 'AuthRequired' && errorMessage.includes('follow'))
      ) {
        return {
          success: false,
          error: 'This seller only accepts messages from users they follow.',
          errorCode: 'REQUIRES_FOLLOW'
        };
      }

      throw apiError;
    }

  } catch (error) {
    console.error('Error sending message to seller:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'UNKNOWN'
    };
  }
}

/**
 * Check for unread messages using the Bluesky Chat API
 */
export async function getUnreadChatCount(agent: BskyAgent): Promise<number> {
  try {
    if (!agent.session) {
      return 0;
    }

    // 1. Get a service auth token for listConvos
    const convoAuth = await agent.api.com.atproto.server.getServiceAuth({
      aud: 'did:web:api.bsky.chat',
      lxm: 'chat.bsky.convo.listConvos',
    });

    if (!convoAuth.success) {
      console.error('Failed to get service auth token for listing convos', convoAuth);
      return 0;
    }

    const convoToken = convoAuth.data.token;

    // 2. Create a specialized agent for the chat service
    const chatAgent = new BskyAgent({
      service: 'https://api.bsky.chat'
    });

    // 3. List conversations to check unread count
    const response = await chatAgent.api.chat.bsky.convo.listConvos(
      { limit: 50 }, // Check last 50 convos
      { headers: { Authorization: `Bearer ${convoToken}` } }
    );

    if (!response.success) {
      console.error('Failed to list conversations', response);
      return 0;
    }

    // 4. Sum up unread counts
    const convos = response.data.convos;
    const unreadCount = convos.reduce((total, convo) => {
      // unreadCount is available on the conversation object
      return total + (convo.unreadCount || 0);
    }, 0);

    return unreadCount;

  } catch (error) {
    // Fail silently for UI polish, but log for debugging
    console.error('Error checking unread messages:', error);
    return 0;
  }
}

/**
 * Check if we can contact this seller (has valid handle)
 */
export function canContactSeller(listing: MarketplaceListing & { authorHandle?: string }): boolean {
  return !!(listing.authorHandle && listing.authorHandle.trim());
}

/**
 * Format seller handle for display (ensure it starts with @)
 */
export function formatSellerHandle(handle?: string): string {
  if (!handle) return '';
  return handle.startsWith('@') ? handle : `@${handle}`;
}

/**
 * Get the best display name for a seller (prefers display name over handle)
 */
export function getSellerDisplayName(listing: MarketplaceListing & { authorHandle?: string; authorDisplayName?: string }): string {
  if (listing.authorDisplayName && listing.authorDisplayName.trim()) {
    return listing.authorDisplayName;
  }
  if (listing.authorHandle) {
    return formatSellerHandle(listing.authorHandle);
  }
  return 'Unknown Seller';
}

/**
 * Alternative: Open a simple contact modal with seller info
 * Use this if direct Bluesky integration doesn't work as expected
 */
export function showContactInfo(
  sellerHandle: string,
  listing: MarketplaceListing
): void {
  const message = generateSellerMessage(listing);
  const formattedHandle = formatSellerHandle(sellerHandle);

  alert(`To contact the seller:

1. Open Bluesky app or visit bsky.app
2. Send a message to: ${formattedHandle}
3. Suggested message:

${message}`);
}
