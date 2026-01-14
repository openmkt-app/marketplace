'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import MarketplaceClient, { SessionData } from '@/lib/marketplace-client';

// Define the Auth user type
type User = {
  did: string;
  handle: string;
  displayName?: string;
  avatarCid?: string;
};

// Define the context state
type AuthContextType = {
  isLoggedIn: boolean;
  user: User | null;
  client: MarketplaceClient | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
};

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  client: null,
  login: async () => false,
  logout: () => {},
  isLoading: true,
});

// Storage key for the session
const SESSION_STORAGE_KEY = 'atproto_marketplace_session';

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
          const storedSessionData = localStorage.getItem(SESSION_STORAGE_KEY);

          if (storedSessionData) {
            const sessionData = JSON.parse(storedSessionData) as SessionData;
            console.log('Found stored session data:', sessionData);

            // Resume the session using the client
            const result = await newClient.resumeSession(sessionData);

            if (result.success) {
              console.log('Successfully resumed session');

              // Fetch user profile for avatar
              const profile = await fetchUserProfile(newClient, sessionData.did);

              setIsLoggedIn(true);
              setUser({
                did: sessionData.did,
                handle: sessionData.handle,
                displayName: profile.displayName,
                avatarCid: profile.avatarCid,
              });
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
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  // Login function
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

        // Save the session to localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        }

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
    
    // Clear session from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, client, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}