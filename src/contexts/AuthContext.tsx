'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import MarketplaceClient, { SessionData } from '@/lib/marketplace-client';
import { addMarketplaceDID } from '@/lib/marketplace-dids';
import { trackLogin } from '@/lib/analytics';
import { getAuthorizationUrl } from '@/lib/oauth-client';

// Define the Auth user type
type User = {
  did: string;
  handle: string;
  displayName?: string;
  avatarCid?: string;
};

// OAuth token data type
type OAuthTokenData = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: number;
  scope: string;
  did: string;
  authServer?: string; // The auth server URL for token refresh and DPoP
};

// Define the context state
type AuthContextType = {
  isLoggedIn: boolean;
  user: User | null;
  client: MarketplaceClient | null;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithOAuth: (handle: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  client: null,
  login: async () => false,
  loginWithOAuth: async () => { },
  logout: () => { },
  isLoading: true,
});

// Storage keys
const SESSION_STORAGE_KEY = 'atproto_marketplace_session';
const OAUTH_TOKENS_KEY = 'oauth_tokens';

// Helper function to get handle from DID
async function getHandleFromDid(did: string): Promise<string> {
  try {
    const response = await fetch(`https://plc.directory/${did}`);
    const didDoc = await response.json();

    // Try to get handle from alsoKnownAs
    if (didDoc.alsoKnownAs && Array.isArray(didDoc.alsoKnownAs)) {
      for (const aka of didDoc.alsoKnownAs) {
        if (aka.startsWith('at://')) {
          return aka.replace('at://', '');
        }
      }
    }

    // Fallback: return DID
    return did;
  } catch (error) {
    console.error('Error resolving handle from DID:', error);
    return did;
  }
}

// Helper function to extract avatar CID from profile
async function fetchUserProfile(client: MarketplaceClient, did: string): Promise<{ displayName?: string; avatarCid?: string }> {
  try {
    if (!client.agent) return {};

    const profileRecord = await client.agent.api.com.atproto.repo.getRecord({
      repo: did,
      collection: 'app.bsky.actor.profile',
      rkey: 'self'
    });

    if (profileRecord.data && profileRecord.data.value) {
      const profileValue = profileRecord.data.value as Record<string, unknown>;

      const displayName = typeof profileValue.displayName === 'string'
        ? profileValue.displayName
        : undefined;

      let avatarCid: string | undefined;
      const avatar = profileValue.avatar;

      if (avatar && typeof avatar === 'object') {
        const avatarObj = avatar as Record<string, unknown>;
        // Try ref.$link format first
        if (avatarObj.ref && typeof avatarObj.ref === 'object') {
          const ref = avatarObj.ref as Record<string, unknown>;
          if (typeof ref.$link === 'string') {
            avatarCid = ref.$link;
          }
        }
        // Fallback: try direct $link
        if (!avatarCid && typeof avatarObj.$link === 'string') {
          avatarCid = avatarObj.$link;
        }
        // Try regex extraction as last resort
        if (!avatarCid) {
          const avatarStr = JSON.stringify(avatar);
          const cidMatch = avatarStr.match(/bafkrei[a-z0-9]{52,}/i);
          if (cidMatch) {
            avatarCid = cidMatch[0];
          }
        }
      }

      return { displayName, avatarCid };
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
  }
  return {};
  return {};
}

// Helper function to auto-register user with the bot
async function registerWithBot(did: string) {
  try {
    // Check if we already tried registering this session
    const key = `bot-registered-${did}`;
    if (localStorage.getItem(key)) return;


    const response = await fetch('/api/marketplace/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did })
    });

    if (response.ok) {

      localStorage.setItem(key, 'true');
    }
  } catch (err) {
    console.warn('Auto-registration failed', err);
  }
}

// Provider component for the auth context
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<MarketplaceClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize the client on load
  useEffect(() => {
    const newClient = new MarketplaceClient();
    setClient(newClient);

    // Check for existing session in localStorage
    const checkExistingSession = async () => {
      try {
        // Only access localStorage on the client-side
        if (typeof window !== 'undefined') {
          // Check for OAuth tokens first (new flow)
          const storedOAuthTokens = localStorage.getItem(OAUTH_TOKENS_KEY);
          const storedSessionData = localStorage.getItem(SESSION_STORAGE_KEY);

          if (storedOAuthTokens) {
            const tokens = JSON.parse(storedOAuthTokens) as OAuthTokenData;

            // Resume session with stored authServer (PDS URL) if available
            const result = await newClient.resumeOAuthSession({
              access_token: tokens.accessToken,
              refresh_token: tokens.refreshToken,
              token_type: tokens.tokenType,
              expires_in: 3600, // Approximate, we use expiresAt usually
              scope: tokens.scope,
              sub: tokens.did
            }, tokens.authServer);

            if (result.success) {
              setIsLoggedIn(true);
              // User data is in result.data.user
              if (result.data?.user) {
                setUser({
                  did: tokens.did,
                  handle: (result.data.user as any).handle,
                  displayName: (result.data.user as any).displayName,
                  avatarCid: (result.data.user as any).avatar
                });
              }

              registerWithBot(tokens.did);
              addMarketplaceDID(tokens.did);

              // If successful, we don't need to check legacy session
              setIsLoading(false);
              return;
            } else {
              // If failed (e.g. expired), clear tokens
              console.warn('OAuth session resume failed, clearing tokens');
              localStorage.removeItem(OAUTH_TOKENS_KEY);
              // Fallthrough to check legacy session
            }
          }

          // Check legacy session
          if (storedSessionData) {
            const sessionData = JSON.parse(storedSessionData) as SessionData;
            // ... (keep existing legacy logic)
            const result = await newClient.resumeSession(sessionData);

            if (result.success) {
              // Check if handle has changed (e.g. user renamed) and update it
              if (result.data && result.data.user) {
                const profileView = result.data.user as any;
                if (profileView.handle && profileView.handle !== sessionData.handle) {
                  console.log(`Handle changed from ${sessionData.handle} to ${profileView.handle}, updating session...`);
                  sessionData.handle = profileView.handle;
                  // Update localStorage with new handle
                  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
                }
              }

              // Fetch user profile for avatar
              const profile = await fetchUserProfile(newClient, sessionData.did);

              setIsLoggedIn(true);
              setUser({
                did: sessionData.did,
                handle: sessionData.handle,
                displayName: profile.displayName,
                avatarCid: profile.avatarCid,
              });

              // Auto-register with bot
              registerWithBot(sessionData.did);

              // Ensure we are in the local known DIDs list so our listings show up immediately
              addMarketplaceDID(sessionData.did);
            } else {
              console.error('Failed to resume session, clearing stored data');
              localStorage.removeItem(SESSION_STORAGE_KEY);
            }
          }
        }
      } catch (error) {
        console.error('Error while checking for existing session:', error);
        // Clear potentially corrupt session data
        if (typeof window !== 'undefined') {
          // logic to clear? maybe just leave it
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();

    // Listen for OAuth login success event from callback page
    const handleOAuthSuccess = async (event: CustomEvent) => {
      const tokenData = event.detail as OAuthTokenData;

      try {
        // Initialize client with OAuth tokens
        await newClient.resumeOAuthSession({
          access_token: tokenData.accessToken,
          refresh_token: tokenData.refreshToken,
          token_type: tokenData.tokenType,
          expires_in: 3600,
          scope: tokenData.scope,
          sub: tokenData.did
        });

        // Fetch user profile (now authenticated via OAuth)
        const profile = await fetchUserProfile(newClient, tokenData.did);

        // Get handle from DID
        const handle = await getHandleFromDid(tokenData.did);

        setIsLoggedIn(true);
        setUser({
          did: tokenData.did,
          handle,
          displayName: profile.displayName,
          avatarCid: profile.avatarCid,
        });

        // Auto-register with bot
        registerWithBot(tokenData.did);

        // Add to known DIDs
        addMarketplaceDID(tokenData.did);

        // Track login
        trackLogin(handle);
      } catch (error) {
        console.error('Error processing OAuth login:', error);
      }
    };

    window.addEventListener('oauth-login-success', handleOAuthSuccess as any);

    return () => {
      window.removeEventListener('oauth-login-success', handleOAuthSuccess as any);
    };
  }, []);

  // OAuth login function
  const loginWithOAuth = async (handle: string): Promise<void> => {
    try {
      // Get authorization URL with PKCE
      // Now returns the correctly resolved authServer
      const { authUrl, codeVerifier, state, authServer } = await getAuthorizationUrl(handle);

      // Store OAuth state in sessionStorage
      sessionStorage.setItem('oauth_verifier', codeVerifier);
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_auth_server', authServer);
      const currentPath = window.location.pathname;
      sessionStorage.setItem('oauth_return_to', currentPath === '/login' ? '/' : currentPath);

      // Redirect to authorization URL
      window.location.href = authUrl;
    } catch (error) {
      console.error('OAuth login failed:', error);
      throw error;
    }
  };

  // Password login function (legacy)
  const login = async (username: string, password: string): Promise<boolean> => {
    if (!client) return false;

    try {
      setIsLoading(true);
      const sessionData = await client.login(username, password);

      // MarketplaceClient.login() directly returns SessionData, not a {success, data} object
      if (sessionData) {
        // Fetch user profile for avatar
        const profile = await fetchUserProfile(client, sessionData.did);

        setIsLoggedIn(true);
        setUser({
          did: sessionData.did,
          handle: sessionData.handle,
          displayName: profile.displayName,
          avatarCid: profile.avatarCid,
        });

        // Auto-register with bot
        registerWithBot(sessionData.did);

        // Ensure we are in the local known DIDs list so our listings show up immediately
        addMarketplaceDID(sessionData.did);

        // Save the session to localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        }

        // Start a server-side chat session for unread counts using JWT tokens (never send password to our server)
        try {
          await fetch('/api/chat/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              did: sessionData.did,
              handle: sessionData.handle,
              accessJwt: sessionData.accessJwt,
              refreshJwt: sessionData.refreshJwt,
            }),
          });
        } catch (error) {
          console.warn('Failed to initialize chat session', error);
        }

        // Track successful login
        trackLogin('bluesky');

        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    if (client) {
      client.logout();
    }

    setIsLoggedIn(false);
    setUser(null);

    // Clear session from localStorage (both legacy and OAuth)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(OAUTH_TOKENS_KEY);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, client, login, loginWithOAuth, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}
