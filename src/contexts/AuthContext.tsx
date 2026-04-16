'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Agent } from '@atproto/api';
import MarketplaceClient from '@/lib/marketplace-client';
import { addMarketplaceDID } from '@/lib/marketplace-dids';
import { trackLogin } from '@/lib/analytics';
import { restoreOAuthSession, revokeOAuthSession, OAuthSession } from '@/lib/oauth-client';

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
    const publicAgent = new Agent({ service: 'https://api.bsky.app' });
    let profile;
    try {
      const result = await publicAgent.getProfile({ actor: did });
      profile = result.data;
    } catch {
      // If the public API is unreachable, fall back to just the DID
      profile = { handle: did, displayName: undefined, avatar: undefined };
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
    const marketplaceClient = new MarketplaceClient();
    setClient(marketplaceClient);

    const checkExistingSession = async () => {
      try {
        const result = await restoreOAuthSession();
        if (!result) return;

        const user = await setupFromOAuthSession(result.session, marketplaceClient);
        if (!user) return;

        setIsLoggedIn(true);
        setUser(user);

        registerWithBot(user.did);
        addMarketplaceDID(user.did);
      } catch (error) {
        console.error('[Auth] Error restoring session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();

    // Listen for the event fired by the callback page after a fresh OAuth login
    const handleOAuthLogin = async (event: CustomEvent<{ session: OAuthSession }>) => {
      try {
        const user = await setupFromOAuthSession(event.detail.session, marketplaceClient);
        if (!user) return;

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
