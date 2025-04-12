'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import MarketplaceClient from '@/lib/marketplace-client';

interface AuthContextType {
  client: MarketplaceClient | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  user: any | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const initialContext: AuthContextType = {
  client: null,
  isLoggedIn: false,
  isLoading: true,
  user: null,
  login: async () => false,
  logout: () => {},
};

const AuthContext = createContext<AuthContextType>(initialContext);

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [client, setClient] = useState<MarketplaceClient | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    // Initialize the client
    const newClient = new MarketplaceClient();
    setClient(newClient);
    
    // Check for stored credentials
    const checkAuth = async () => {
      try {
        const sessionData = localStorage.getItem('atproto_session');
        
        if (sessionData) {
          console.log('Found session data in localStorage');
          const parsedData = JSON.parse(sessionData);
          const result = await newClient.resumeSession(parsedData);
          
          if (result.success) {
            console.log('Session successfully resumed');
            setIsLoggedIn(true);
            setUser(parsedData.handle || parsedData.did);
          } else {
            console.error('Failed to resume session:', result.error);
            // Clear invalid session data
            localStorage.removeItem('atproto_session');
          }
        } else {
          console.log('No session data found in localStorage');
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        localStorage.removeItem('atproto_session');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    if (!client) return false;
    
    try {
      setIsLoading(true);
      const result = await client.login(username, password);
      
      if (result.success && result.data) {
        setIsLoggedIn(true);
        setUser(result.data.handle || result.data.did || username);
        
        // Save session data to localStorage
        const sessionData = {
          did: result.data.did,
          handle: result.data.handle,
          accessJwt: result.data.accessJwt,
          refreshJwt: result.data.refreshJwt
        };
        
        console.log('Saving session data:', sessionData);
        localStorage.setItem('atproto_session', JSON.stringify(sessionData));
        
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

  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    
    // Clear session data
    localStorage.removeItem('atproto_session');
    
    // Clear client session
    if (client) {
      client.logout();
    }
  };

  const value = {
    client,
    isLoggedIn,
    isLoading,
    user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
