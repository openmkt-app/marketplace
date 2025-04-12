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
        // In a real app, you might check for stored credentials
        // For now, just initialize the state
        setIsLoading(false);
      } catch (error) {
        console.error('Authentication check failed:', error);
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
      
      if (result.success) {
        setIsLoggedIn(true);
        setUser(result.data?.did || username);
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
    // In a real app, you might clear tokens or call client.logout()
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
