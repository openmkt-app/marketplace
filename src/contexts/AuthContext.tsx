import React, { createContext, useContext, useState, useEffect } from 'react';
import MarketplaceClient from '@/lib/marketplace-client';

interface AuthContextType {
  client: MarketplaceClient | null;
  isLoggedIn: boolean;
  user: any | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<MarketplaceClient | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize client
  useEffect(() => {
    const newClient = new MarketplaceClient();
    setClient(newClient);
    
    // Check for saved session
    const checkSavedSession = async () => {
      try {
        // Check local storage for session data
        const sessionData = localStorage.getItem('atproto_session');
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          // Validate and resume session
          const resume = await newClient.resumeSession(parsed);
          if (resume.success) {
            setIsLoggedIn(true);
            setUser(resume.data.user);
          } else {
            localStorage.removeItem('atproto_session');
          }
        }
      } catch (error) {
        console.error('Failed to resume session:', error);
        localStorage.removeItem('atproto_session');
      } finally {
        setLoading(false);
      }
    };
    
    checkSavedSession();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    if (!client) return false;
    
    try {
      setLoading(true);
      const result = await client.login(username, password);
      
      if (result.success) {
        setIsLoggedIn(true);
        setUser(result.data.user);
        
        // Save session data
        localStorage.setItem('atproto_session', JSON.stringify({
          did: result.data.did,
          handle: result.data.handle,
          accessJwt: result.data.accessJwt,
          refreshJwt: result.data.refreshJwt,
        }));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('atproto_session');
    setIsLoggedIn(false);
    setUser(null);
    
    // Reinitialize client
    const newClient = new MarketplaceClient();
    setClient(newClient);
  };

  return (
    <AuthContext.Provider value={{ client, isLoggedIn, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
