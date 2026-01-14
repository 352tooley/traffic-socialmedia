import { createContext, useContext, useState, type ReactNode } from 'react';
import type { UserSession } from '../types';
import { DM_PASSWORD, type District } from '../config';
import { verifyStorePassword } from '../services/sheetsService';

interface AuthContextType {
  session: UserSession | null;
  isAuthenticated: boolean;
  loginAsMobileExpert: (district: District, storeName: string, mobileExpertName: string) => void;
  loginAsStore: (district: District, storeName: string, password: string) => Promise<boolean>;
  loginAsDM: (password: string, district: District) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);

  const loginAsMobileExpert = (district: District, storeName: string, mobileExpertName: string) => {
    setSession({
      role: 'mobile_expert',
      district,
      storeName,
      mobileExpertName,
    });
  };

  const loginAsStore = async (district: District, storeName: string, password: string): Promise<boolean> => {
    const isValid = await verifyStorePassword(district, storeName, password);
    if (isValid) {
      setSession({
        role: 'store',
        district,
        storeName,
      });
      return true;
    }
    return false;
  };

  const loginAsDM = (password: string, district: District): boolean => {
    if (password === DM_PASSWORD) {
      setSession({
        role: 'dm',
        district,
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
