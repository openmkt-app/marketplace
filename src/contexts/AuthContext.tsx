'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import MarketplaceClient, { SessionData } from '@/lib/marketplace-client';

// Define the Auth user type
type User = {
  did: string;
  handle: string;
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
              setIsLoggedIn(true);
              setUser({
                did: sessionData.did,
                handle: sessionData.handle,
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
        setIsLoggedIn(true);
        setUser({
          did: sessionData.did,
          handle: sessionData.handle,
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