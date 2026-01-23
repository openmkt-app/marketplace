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
 * Get unread chat message count using the Bluesky Chat API
 * This uses chat.bsky.convo.listConvos proxied through the user's PDS
 * Note: Chat functionality is not available for OAuth sessions due to scope limitations
 */
export async function getUnreadChatCount(agent: BskyAgent): Promise<number> {
  const session = agent.session;
  if (!session || !session.accessJwt) return 0;

  // OAuth sessions don't have chat permissions - silently return 0
  if (isOAuthSessionWithoutChatScope()) {
    return 0;
  }

  const OPENMKT_HANDLE = 'openmkt.app';

  const getOpenMktDid = (convo: any) => {
    const members = Array.isArray(convo.members) ? convo.members : [];
    const openMktMember = members.find(
      (member: any) => member?.handle?.toLowerCase() === OPENMKT_HANDLE
    );
    return openMktMember?.did as string | undefined;
  };

  const countUnreadFromOpenMkt = async (
    convo: any,
    fetchMessages: (convoId: string, limit: number) => Promise<any[]>
  ) => {
    const unreadCount = convo.unreadCount || 0;
    if (!unreadCount) return 0;

    const openMktDid = getOpenMktDid(convo);
    if (!openMktDid || !convo.id) return 0;

    const limit = Math.min(unreadCount, 50);
    const messages = await fetchMessages(convo.id, limit);

    let total = 0;
    for (const message of messages) {
      const senderDid = message?.sender?.did;
      if (senderDid === openMktDid) {
        total += 1;
      }
    }

    return total;
  };

  // Helper to process a list of convos
  const processConvos = async (
    convos: any[],
    fetchMessages: (convoId: string, limit: number) => Promise<any[]>
  ): Promise<number | null> => {
    let total = 0;
    for (const convo of convos) {
      total += await countUnreadFromOpenMkt(convo, fetchMessages);
      if (total > 0) return total; // Optimization: return early if we found *any* (since we just show a dot usually?) 
      // check code: returning total. The loop accumulates? 
      // Original code returned on first > 0? "if (total > 0) return total;" inside loop?
      // Yes, seems to just return early. 
    }
    return total > 0 ? total : null;
  };

  // Attempt 0: Direct OAuth Access (for DPoP/OAuth sessions)
  // This expects the agent to handle the request signing and the PDS to proxy or handle it
  try {
    // @ts-ignore - access internal api definition if needed, or assume typed
    if (agent.api.chat && agent.api.chat.bsky && agent.api.chat.bsky.convo) {
      const response = await agent.api.chat.bsky.convo.listConvos({ limit: 50 });

      if (response.success) {
        const fetchMessages = async (convoId: string, limit: number) => {
          const msgRes = await agent.api.chat.bsky.convo.getMessages({ convoId, limit });
          return msgRes.success ? msgRes.data.messages : [];
        };

        const result = await processConvos(response.data.convos, fetchMessages);
        if (result !== null) return result;
        return 0; // If success but 0, return 0
      }
    }
  } catch (error) {
    // console.warn('getUnreadChatCount: Direct OAuth attempt failed, trying fallbacks...', error);
    // Fallthrough to legacy methods
  }

  // Attempt 1: Use service auth directly with api.bsky.chat (Legacy Password Flow)
  try {
    const chatAgent = new BskyAgent({ service: 'https://api.bsky.chat' });
    const boundAuth = await agent.api.com.atproto.server.getServiceAuth({
      aud: 'did:web:api.bsky.chat',
      lxm: 'chat.bsky.convo.listConvos',
    });

    if (boundAuth.success) {
      const response = await chatAgent.api.chat.bsky.convo.listConvos(
        { limit: 50 },
        { headers: { Authorization: `Bearer ${boundAuth.data.token}` } }
      );

      if (response.success) {
        const fetchMessages = async (convoId: string, limit: number) => {
          const messagesResponse = await chatAgent.api.chat.bsky.convo.getMessages(
            { convoId, limit },
            { headers: { Authorization: `Bearer ${boundAuth.data.token}` } }
          );
          return messagesResponse.success ? messagesResponse.data.messages : [];
        };

        const result = await processConvos(response.data.convos, fetchMessages);
        if (result !== null) return result;
      }
    }
  } catch (error) {
    console.warn('getUnreadChatCount: service auth failed, trying proxy...', error);
  }

  // Helper to run the server-side proxy fallback
  const runServerFallback = async () => {

    try {
      // Determine PDS endpoint from DID Doc if available (most reliable)
      let pdsEndpoint = '';
      const sessionAny = session as any;

      if (sessionAny.didDoc && sessionAny.didDoc.service) {
        const pdsService = sessionAny.didDoc.service.find(
          (s: any) => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer'
        );
        if (pdsService && pdsService.serviceEndpoint) {
          pdsEndpoint = pdsService.serviceEndpoint;
        }
      }

      // Fallback to agent properties if DID Doc lookup failed
      if (!pdsEndpoint) {
        if (agent.pdsUrl) {
          pdsEndpoint = agent.pdsUrl.toString();
        } else if (agent.service) {
          pdsEndpoint = agent.service.toString();
        } else {
          pdsEndpoint = 'https://bsky.social';
        }
      }

      // Ensure no trailing slash
      pdsEndpoint = pdsEndpoint.replace(/\/$/, '');

      const proxyUrl = `/api/proxy/chat/unread?pdsEndpoint=${encodeURIComponent(pdsEndpoint)}`;
      const messagesUrl = `/api/proxy/chat/messages?pdsEndpoint=${encodeURIComponent(pdsEndpoint)}`;

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.accessJwt}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        const convos = data.convos as any[];

        const fetchMessages = async (convoId: string, limit: number) => {
          const msgResponse = await fetch(
            `${messagesUrl}&convoId=${encodeURIComponent(convoId)}&limit=${limit}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${session.accessJwt}`,
              },
            }
          );
          if (!msgResponse.ok) return [];
          const msgData = await msgResponse.json();
          return msgData.messages || [];
        };

        const result = await processConvos(convos, fetchMessages);
        if (result !== null) return result;
      }
    } catch (err) {
      console.warn('getUnreadChatCount: Server fallback failed', err);
    }
    return 0;
  };

  // Attempt 2: Try `agent.withProxy` if available (User Request)
  try {
    if (typeof (agent as any).withProxy === 'function') {

      const proxyAgent = (agent as any).withProxy('bsky_chat', 'did:web:api.bsky.chat');
      const response = await proxyAgent.api.chat.bsky.convo.listConvos({ limit: 50 });

      if (response.success) {
        const convos = response.data.convos;
        const fetchMessages = async (convoId: string, limit: number) => {
          const messagesResponse = await proxyAgent.api.chat.bsky.convo.getMessages({
            convoId,
            limit,
          });
          return messagesResponse.success ? messagesResponse.data.messages : [];
        };

        const result = await processConvos(convos, fetchMessages);
        if (result !== null) return result;
      }
    } else {

    }
  } catch (error) {
    console.warn('getUnreadChatCount: agent.withProxy failed, switching to fallback...', error);
  }

  // Attempt 3: Fallback to Server Proxy (if withProxy didn't exist OR failed/threw error)
  return await runServerFallback();
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
