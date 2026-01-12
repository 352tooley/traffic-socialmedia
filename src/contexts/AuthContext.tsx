import { createContext, useContext, useState, useEffect } from 'react';
import type { UserSession } from '../types';
import { DEFAULT_STORE_PASSWORD, DM_PASSWORD } from '../config';

const STORAGE_KEY = 'traffic_sm_session';
const PASSWORDS_KEY = 'traffic_sm_passwords';

interface AuthContextType {
  session: UserSession | null;
  isAuthenticated: boolean;
  loginAsRep: (storeName: string, repName: string) => void;
  loginAsStore: (storeName: string, password: string) => boolean;
  loginAsDM: (password: string) => boolean;
  logout: () => void;
  getStorePassword: (storeName: string) => string;
  setStorePassword: (storeName: string, newPassword: string) => void;
  resetStorePassword: (storeName: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get stored passwords or initialize with defaults
function getStoredPasswords(): Record<string, string> {
  const stored = localStorage.getItem(PASSWORDS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {};
}

function savePasswords(passwords: Record<string, string>) {
  localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save session to localStorage when it changes
  const saveSession = (newSession: UserSession | null) => {
    if (newSession) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setSession(newSession);
  };

  const loginAsRep = (storeName: string, repName: string) => {
    saveSession({
      role: 'rep',
      storeName,
      repName,
    });
  };

  const loginAsStore = (storeName: string, password: string): boolean => {
    const storedPassword = getStorePassword(storeName);
    if (password === storedPassword) {
      saveSession({
        role: 'store',
        storeName,
      });
      return true;
    }
    return false;
  };

  const loginAsDM = (password: string): boolean => {
    if (password === DM_PASSWORD) {
      saveSession({
        role: 'dm',
        storeName: '',
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    saveSession(null);
  };

  const getStorePassword = (storeName: string): string => {
    const passwords = getStoredPasswords();
    return passwords[storeName] || DEFAULT_STORE_PASSWORD;
  };

  const setStorePassword = (storeName: string, newPassword: string) => {
    const passwords = getStoredPasswords();
    passwords[storeName] = newPassword;
    savePasswords(passwords);
  };

  const resetStorePassword = (storeName: string) => {
    const passwords = getStoredPasswords();
    passwords[storeName] = DEFAULT_STORE_PASSWORD;
    savePasswords(passwords);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: session !== null,
        loginAsRep,
        loginAsStore,
        loginAsDM,
        logout,
        getStorePassword,
        setStorePassword,
        resetStorePassword,
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
