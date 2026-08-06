'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { addMarketplaceDID } from '@/lib/marketplace-dids';
import { trackLogin } from '@/lib/analytics';
import { fetchPublicProfile } from '@/lib/public-listings';
// Type-only. The implementations are imported dynamically below: this provider
// sits in the root layout, so a static import puts the AT Protocol SDK and the
// OAuth client — together the two largest chunks on the site — in front of
// hydration on every page, including for visitors who are not signed in.
import type MarketplaceClient from '@/lib/marketplace-client';
import type { OAuthSession } from '@/lib/oauth-client';

type User = {
  did: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
};

type AuthContextType = {
  isLoggedIn: boolean;
  user: User | null;
  client: MarketplaceClient | null;
  loginWithOAuth: (handle: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  client: null,
  loginWithOAuth: async () => {},
  logout: async () => {},
  isLoading: true,
});


/**
 * Set up the MarketplaceClient and user state from an OAuth session.
 * Returns user profile data or null on failure.
 */
async function setupFromOAuthSession(
  oauthSession: OAuthSession,
  client: MarketplaceClient,
): Promise<User | null> {
  try {
    const did = oauthSession.did;

    // Fetch the public profile using an unauthenticated agent.
    // We intentionally do NOT use the OAuth session here — handle/displayName/avatar
    // are public data and using the fresh OAuth token causes intermittent 401/403 errors
    // while the PDS is still accepting the token.
    const HANDLE_CACHE_KEY = `handle-cache-${did}`;

    let profile: { handle: string; displayName?: string; avatar?: string };
    const publicProfile = await fetchPublicProfile(did);
    if (publicProfile) {
      profile = {
        handle: publicProfile.handle,
        displayName: publicProfile.displayName,
        avatar: publicProfile.avatarCid,
      };
      // Cache the successfully-resolved handle so we can use it when AT Protocol is down
      try { localStorage.setItem(HANDLE_CACHE_KEY, profile.handle); } catch {}
    } else {
      // api.bsky.app unreachable — try plc.directory, then cached handle, then raw DID
      let handle: string | null = null;
      try {
        const didDocUrl = did.startsWith('did:web:')
          ? `https://${did.slice('did:web:'.length)}/.well-known/did.json`
          : `https://plc.directory/${did}`;
        const doc = await fetch(didDocUrl).then(r => r.json());
        const aka = doc.alsoKnownAs?.[0];
        if (aka?.startsWith('at://')) handle = aka.slice(5);
      } catch { /* fall through */ }

      // Last resort: use the previously cached handle (survives full AT Protocol outages)
      if (!handle) {
        try { handle = localStorage.getItem(HANDLE_CACHE_KEY); } catch {}
      }

      profile = { handle: handle ?? did, displayName: undefined, avatar: undefined };
    }

    const user: User = {
      did,
      handle: profile.handle,
      displayName: profile.displayName,
      avatarUrl: profile.avatar,
    };

    // Hand the authenticated OAuth session to the marketplace client
    client.setOAuthSession(oauthSession, did, profile.handle);

    return user;
  } catch (error) {
    console.error('[Auth] Failed to set up from OAuth session:', error);
    return null;
  }
}

async function registerWithBot(did: string) {
  try {
    const key = `bot-registered-${did}`;
    if (localStorage.getItem(key)) return;
    const response = await fetch('/api/marketplace/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did }),
    });
    if (response.ok) {
      localStorage.setItem(key, 'true');
    }
  } catch (err) {
    console.warn('[Auth] Auto-registration failed', err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<MarketplaceClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Started synchronously so the listener registered below can always await
    // it, however early the OAuth callback fires its event.
    const clientPromise = import('@/lib/marketplace-client').then(({ default: MarketplaceClient }) => {
      const instance = new MarketplaceClient();
      if (!cancelled) setClient(instance);
      return instance;
    });

    const checkExistingSession = async () => {
      try {
        const [{ restoreOAuthSession }, marketplaceClient] = await Promise.all([
          import('@/lib/oauth-client'),
          clientPromise,
        ]);

        const result = await restoreOAuthSession();
        if (!result || cancelled) return;

        const user = await setupFromOAuthSession(result.session, marketplaceClient);
        if (!user || cancelled) return;

        setIsLoggedIn(true);
        setUser(user);

        registerWithBot(user.did);
        addMarketplaceDID(user.did);
      } catch (error) {
        console.error('[Auth] Error restoring session:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    checkExistingSession();

    // Listen for the event fired by the callback page after a fresh OAuth login
    const handleOAuthLogin = async (event: CustomEvent<{ session: OAuthSession }>) => {
      try {
        const marketplaceClient = await clientPromise;
        const user = await setupFromOAuthSession(event.detail.session, marketplaceClient);
        if (!user || cancelled) return;

        setIsLoggedIn(true);
        setUser(user);

        registerWithBot(user.did);
        addMarketplaceDID(user.did);
        trackLogin(user.handle);
      } catch (error) {
        console.error('[Auth] Error processing OAuth login event:', error);
      }
    };

    window.addEventListener('oauth-login-success', handleOAuthLogin as unknown as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener('oauth-login-success', handleOAuthLogin as unknown as EventListener);
    };
  }, []);

  const loginWithOAuth = async (handle: string): Promise<void> => {
    // Import dynamically to avoid running on the server
    const { signInWithOAuth } = await import('@/lib/oauth-client');
    const returnTo = typeof window !== 'undefined'
      ? (window.location.pathname === '/login' ? '/' : window.location.pathname)
      : '/';
    await signInWithOAuth(handle, returnTo);
  };

  const logout = async () => {
    const did = user?.did;
    if (client) client.logout();
    setIsLoggedIn(false);
    setUser(null);
    if (did) {
      try {
        const { revokeOAuthSession } = await import('@/lib/oauth-client');
        await revokeOAuthSession(did);
      } catch (err) {
        // Revocation failure is non-fatal — local state is already cleared
        console.warn('[Auth] Token revocation failed', err);
      }
    }
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, client, loginWithOAuth, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
