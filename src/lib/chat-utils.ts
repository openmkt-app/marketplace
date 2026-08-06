import { Agent, AtpAgent } from '@atproto/api';
import { formatSellerHandle, getSellerDisplayName } from './seller-display';

// Re-exported for callers that already import them from here. Anything on a
// render path should import from ./seller-display directly — reaching them
// through this module drags in the SDK above.
export { formatSellerHandle, getSellerDisplayName };
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
 * Note: This only works with legacy password auth, not OAuth
 */
export async function sendMessageToSeller(
  agent: Agent,
  sellerDid: string,
  message: string
): Promise<{ success: boolean; error?: string; errorCode?: 'REQUIRES_FOLLOW' | 'OAUTH_NOT_SUPPORTED' | 'UNKNOWN' }> {
  try {
    if (!agent.did) {
      return { success: false, error: 'User is not logged in' };
    }

    // 1. Get a service auth token for getConvoForMembers

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
    const chatAgent = new AtpAgent({
      service: 'https://api.bsky.chat'
    });



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
 * Check if current session is OAuth-based and lacks chat permissions
 * Detect whether the agent is an OAuth session (vs legacy password auth).
 * OAuth agents don't have a traditional AtpSessionData with accessJwt.
 */
function isOAuthSession(agent: Agent): boolean {
  return !(agent as AtpAgent).session?.accessJwt;
}

/**
 * Get unread chat message count for messages from openmkt.app.
 * Uses service auth tokens to call the Bluesky Chat API directly — works for
 * both OAuth and legacy sessions as long as the token has transition:chat.bsky scope.
 */
export async function getUnreadChatCount(agent: Agent): Promise<number> {
  if (!agent.did) return 0;

  const OPENMKT_HANDLE = 'openmkt.app';

  try {
    // Get a service auth token scoped to listing convos.
    // 401 here means the account doesn't have chat access (gated by Bluesky) — not an error.
    let convoAuth;
    try {
      convoAuth = await agent.api.com.atproto.server.getServiceAuth({
        aud: 'did:web:api.bsky.chat',
        lxm: 'chat.bsky.convo.listConvos',
      });
    } catch {
      return 0;
    }
    if (!convoAuth.success) return 0;

    const chatAgent = new AtpAgent({ service: 'https://api.bsky.chat' });

    const convosRes = await chatAgent.api.chat.bsky.convo.listConvos(
      {},
      { headers: { Authorization: `Bearer ${convoAuth.data.token}` } }
    );
    if (!convosRes.success) return 0;

    for (const convo of convosRes.data.convos) {
      const unreadCount = convo.unreadCount || 0;
      if (!unreadCount) continue;

      const members = Array.isArray(convo.members) ? convo.members : [];
      const openMktMember = members.find(
        (m: any) => m?.handle?.toLowerCase() === OPENMKT_HANDLE
      );
      if (!openMktMember || !convo.id) continue;

      // Get a separate service auth token scoped to fetching messages
      const msgAuth = await agent.api.com.atproto.server.getServiceAuth({
        aud: 'did:web:api.bsky.chat',
        lxm: 'chat.bsky.convo.getMessages',
      });
      if (!msgAuth.success) continue;

      const limit = Math.min(unreadCount, 50);
      const msgsRes = await chatAgent.api.chat.bsky.convo.getMessages(
        { convoId: convo.id, limit },
        { headers: { Authorization: `Bearer ${msgAuth.data.token}` } }
      );
      if (!msgsRes.success) continue;

      const count = msgsRes.data.messages.filter(
        (m: any) => m?.sender?.did === openMktMember.did
      ).length;
      if (count > 0) return count;
    }
  } catch (err) {
    console.warn('getUnreadChatCount failed', err);
  }

  return 0;
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


/**
 * Get the best display name for a seller (prefers display name over handle)
 */


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
