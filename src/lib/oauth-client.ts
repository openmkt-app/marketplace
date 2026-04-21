/**
 * OAuth client using the official @atproto/oauth-client-browser package.
 * Replaces the hand-rolled PKCE + DPoP implementation.
 *
 * Architecture:
 * - AuthContext calls restoreOAuthSession() on every mount to restore existing sessions
 * - LoginPage calls signInWithOAuth() which redirects to Bluesky
 * - The /oauth/callback page calls processOAuthCallback() to exchange the code and then redirects
 * - On the destination page, AuthContext calls restoreOAuthSession() and finds the session in IndexedDB
 */
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser';

export type { OAuthSession };

let _clientPromise: Promise<BrowserOAuthClient> | null = null;

/**
 * Get (or lazily create) the singleton BrowserOAuthClient.
 * Uses BrowserOAuthClient.load() to fetch client metadata from the server,
 * which ensures the metadata matches exactly what is served at the well-known URL.
 */
async function loadOAuthClient(): Promise<BrowserOAuthClient> {
  if (typeof window === 'undefined') {
    throw new Error('OAuth client can only be used in the browser');
  }
  if (!_clientPromise) {
    const origin = window.location.origin;
    const isLoopback =
      origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');

    let clientId: string;
    if (isLoopback) {
      // Loopback client IDs must start with 'http://localhost' (no port).
      // redirect_uri must use 127.0.0.1 (not localhost) per the AT Protocol spec.
      // We include the dynamic port so it works on 3000, 3001, etc.
      const port = window.location.port || '80';
      clientId = `http://localhost?redirect_uri=${encodeURIComponent(`http://127.0.0.1:${port}/oauth/callback`)}&scope=${encodeURIComponent('atproto transition:chat.bsky repo:app.openmkt.marketplace.listing repo:app.bsky.feed.post repo:app.bsky.graph.follow blob:*/*')}`;
    } else {
      clientId = `${origin}/oauth-client-metadata.json`;
    }

    _clientPromise = BrowserOAuthClient.load({
      clientId,
      handleResolver: 'https://bsky.social',
      allowHttp: isLoopback,
    }).catch((err) => {
      _clientPromise = null; // Allow retry on next call
      throw err;
    });
  }
  return _clientPromise;
}

/**
 * Restore an existing OAuth session from IndexedDB storage.
 * Returns undefined if no session exists — does NOT process OAuth callbacks.
 *
 * On localhost, the library's fixLocation() function redirects to 127.0.0.1 when
 * the current path matches a redirect URI. For paths that don't match (e.g. the
 * homepage '/'), fixLocation throws instead. We catch that and redirect manually.
 */
export async function restoreOAuthSession(): Promise<{ session: OAuthSession } | undefined> {
  const client = await loadOAuthClient();
  try {
    return await client.initRestore();
  } catch (err) {
    if (err instanceof Error) {
      // fixLocation already triggered a window.location redirect — just return.
      if (err.message.startsWith('Redirecting to loopback IP')) {
        return undefined;
      }
      // fixLocation found no matching redirect URI for the current path — redirect manually.
      if (err.message.includes('Please use the loopback IP address')) {
        const url = new URL(window.location.href);
        url.hostname = '127.0.0.1';
        window.location.replace(url.href);
        return undefined;
      }
    }
    throw err;
  }
}

/**
 * Process the OAuth callback URL parameters (exchange code for tokens).
 * Must be called on the /oauth/callback page after the auth server redirects back.
 * Returns the session and the `state` string passed to signInWithOAuth (i.e. the returnTo path).
 */
export async function processOAuthCallback(): Promise<{
  session: OAuthSession;
  state: string | null;
}> {
  const client = await loadOAuthClient();
  return client.initCallback();
}

/**
 * Start the OAuth sign-in flow. Redirects the browser to the user's Bluesky auth server.
 * @param handle The user's Bluesky handle (e.g. "alice.bsky.social")
 * @param returnTo Path to return to after successful login (stored in OAuth state param)
 */
export async function signInWithOAuth(handle: string, returnTo: string = '/'): Promise<void> {
  const client = await loadOAuthClient();
  await client.signInRedirect(handle, { state: returnTo });
}

/**
 * Revoke the OAuth session for the given DID.
 * Revokes the token at the server and removes it from IndexedDB so the session
 * is not restored on the next page load.
 */
export async function revokeOAuthSession(did: string): Promise<void> {
  const client = await loadOAuthClient();
  await client.revoke(did);
}
