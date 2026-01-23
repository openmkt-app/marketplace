import { BskyAgent } from '@atproto/api';
import type { MarketplaceListing } from './marketplace-client';
import { createRequestDPoPProof } from './oauth-client';

/**
 * Check if current session is OAuth-based (any OAuth session)
 */
function isOAuthSession(): boolean {
  if (typeof window === 'undefined') return false;
  const hasTokens = !!localStorage.getItem('oauth_tokens');
  console.log('[isOAuthSession] oauth_tokens exists:', hasTokens);
  return hasTokens;
}

/**
 * Get OAuth tokens from localStorage
 */
function getOAuthTokens(): { accessToken: string; tokenType: string } | null {
  if (typeof window === 'undefined') return null;
  const tokensStr = localStorage.getItem('oauth_tokens');
  if (!tokensStr) return null;
  try {
    const tokens = JSON.parse(tokensStr);
    return {
      accessToken: tokens.accessToken,
      tokenType: tokens.tokenType || 'DPoP'
    };
  } catch {
    return null;
  }
}

/**
 * Make a chat API request for OAuth sessions with proper DPoP support.
 * This is needed because withProxy() creates a new agent without our DPoP fetch handler.
 */
async function fetchChatWithDPoP(
  agent: BskyAgent,
  endpoint: string,
  params?: Record<string, string | number>
): Promise<any> {
  const session = agent.session;
  if (!session) throw new Error('No session');

  const oauthTokens = getOAuthTokens();
  if (!oauthTokens) throw new Error('No OAuth tokens');

  // Build the URL to the user's PDS
  const pdsUrl = (agent as any).serviceUrl?.toString() ||
                 (agent as any).service?.toString() ||
                 'https://bsky.social';

  const url = new URL(`/xrpc/${endpoint}`, pdsUrl.replace(/\/$/, ''));
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }

  const method = 'GET';
  const urlString = url.toString();

  // Helper to make request with optional nonce
  const makeRequest = async (nonce?: string): Promise<Response> => {
    // Generate DPoP proof with access token hash
    const dpopProof = await createRequestDPoPProof(method, urlString, nonce, oauthTokens.accessToken);

    return fetch(urlString, {
      method,
      headers: {
        'Authorization': `DPoP ${oauthTokens.accessToken}`,
        'DPoP': dpopProof,
        'Atproto-Proxy': 'did:web:api.bsky.chat#bsky_chat',
      },
    });
  };

  // Initial request
  let response = await makeRequest();

  // Handle DPoP nonce requirement
  if (response.status === 401) {
    const wwwAuth = response.headers.get('WWW-Authenticate');
    const dpopNonce = response.headers.get('DPoP-Nonce');

    if (dpopNonce && (wwwAuth?.includes('use_dpop_nonce') || true)) {
      // Retry with nonce
      response = await makeRequest(dpopNonce);
    }
  }

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`Chat API error ${response.status}: ${error}`);
  }

  return response.json();
}

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
  agent: BskyAgent,
  sellerDid: string,
  message: string
): Promise<{ success: boolean; error?: string; errorCode?: 'REQUIRES_FOLLOW' | 'OAUTH_NOT_SUPPORTED' | 'UNKNOWN' }> {
  try {
    if (!agent.session) {
      return { success: false, error: 'User is not logged in' };
    }

    // OAuth sessions can't use chat API due to scope limitations
    if (isOAuthSessionWithoutChatScope()) {
      return {
        success: false,
        error: 'Direct messaging is not available with OAuth login. Please use Bluesky to message the seller.',
        errorCode: 'OAUTH_NOT_SUPPORTED'
      };
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
    const chatAgent = new BskyAgent({
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
 * OAuth sessions with transition:chat.bsky scope CAN use chat
 */
function isOAuthSessionWithoutChatScope(): boolean {
  if (typeof window === 'undefined') return false;
  const oauthTokensStr = localStorage.getItem('oauth_tokens');
  if (!oauthTokensStr) return false; // Not OAuth, so chat is allowed (legacy auth)

  try {
    const tokens = JSON.parse(oauthTokensStr);
    const scope = tokens.scope || '';
    // If the OAuth token has chat scope, allow chat
    if (scope.includes('transition:chat.bsky')) {
      return false; // Has chat scope, so chat IS allowed
    }
  } catch {
    // Parse error, assume no chat scope
  }

  return true; // OAuth without chat scope, chat NOT allowed
}

/**
 * Get unread chat message count from @openmkt.app bot
 * Checks if there are any unread messages from the marketplace bot to notify sellers of potential leads
 */
export async function getUnreadChatCount(agent: BskyAgent): Promise<number> {
  const session = agent.session;
  if (!session || !session.accessJwt) return 0;

  // OAuth sessions without chat scope can't access chat API
  if (isOAuthSessionWithoutChatScope()) {
    return 0;
  }

  const OPENMKT_HANDLE = 'openmkt.app';

  // Find the openmkt.app member in a conversation
  const getOpenMktDid = (convo: any): string | undefined => {
    const members = Array.isArray(convo.members) ? convo.members : [];
    const openMktMember = members.find(
      (member: any) => member?.handle?.toLowerCase() === OPENMKT_HANDLE
    );
    return openMktMember?.did;
  };

  // Check if a conversation has unread messages from openmkt.app
  const hasUnreadFromOpenMkt = (convo: any): boolean => {
    const unreadCount = convo.unreadCount || 0;
    if (!unreadCount) return false;

    const openMktDid = getOpenMktDid(convo);
    if (!openMktDid) return false;

    // If there are unread messages and openmkt.app is in the convo, assume it's from the bot
    // (We don't need to fetch individual messages - if there's unread in a bot convo, notify)
    return true;
  };

  // Check conversations for unread bot messages
  const checkConvos = (convos: any[]): number => {
    for (const convo of convos) {
      if (hasUnreadFromOpenMkt(convo)) {
        return convo.unreadCount || 1;
      }
    }
    return 0;
  };

  const usingOAuth = isOAuthSession();

  // OAuth path: Use fetchChatWithDPoP for proper DPoP authentication
  if (usingOAuth) {
    try {
      const listData = await fetchChatWithDPoP(agent, 'chat.bsky.convo.listConvos', { limit: 50 });
      if (listData?.convos) {
        return checkConvos(listData.convos);
      }
    } catch (error) {
      console.warn('getUnreadChatCount: OAuth chat request failed', error);
    }
    return 0;
  }

  // Legacy password auth path: Use service auth with separate tokens per operation
  try {
    const chatAgent = new BskyAgent({ service: 'https://api.bsky.chat' });

    // Get service auth token for listConvos
    const listAuth = await agent.api.com.atproto.server.getServiceAuth({
      aud: 'did:web:api.bsky.chat',
      lxm: 'chat.bsky.convo.listConvos',
    });

    if (!listAuth.success) return 0;

    const response = await chatAgent.api.chat.bsky.convo.listConvos(
      { limit: 50 },
      { headers: { Authorization: `Bearer ${listAuth.data.token}` } }
    );

    if (response.success) {
      return checkConvos(response.data.convos);
    }
  } catch (error) {
    console.warn('getUnreadChatCount: Legacy auth failed', error);
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
