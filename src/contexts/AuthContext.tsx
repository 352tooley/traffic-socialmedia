import { createContext, useContext, useState } from 'react';
import type { UserSession } from '../types';
import { DM_PASSWORD } from '../config';
import { verifyStorePassword } from '../services/sheetsService';

interface AuthContextType {
  session: UserSession | null;
  isAuthenticated: boolean;
  loginAsMobileExpert: (storeName: string, mobileExpertName: string) => void;
  loginAsStore: (storeName: string, password: string) => Promise<boolean>;
  loginAsDM: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);

  const loginAsMobileExpert = (storeName: string, mobileExpertName: string) => {
    setSession({
      role: 'mobile_expert',
      storeName,
      mobileExpertName,
    });
  };

  const loginAsStore = async (storeName: string, password: string): Promise<boolean> => {
    const isValid = await verifyStorePassword(storeName, password);
    if (isValid) {
      setSession({
        role: 'store',
        storeName,
      });
      return true;
    }
    return false;
  };

  const loginAsDM = (password: string): boolean => {
    if (password === DM_PASSWORD) {
      setSession({
        role: 'dm',
        storeName: '',
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: session !== null,
        loginAsMobileExpert,
        loginAsStore,
        loginAsDM,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
