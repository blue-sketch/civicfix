import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => Promise<void>;
}

const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  CITIZEN: { email: 'citizen@civicfix.org', pass: 'CivicFix2026!' },
  MUNICIPAL_OFFICER: { email: 'officer@civicfix.org', pass: 'CivicFix2026!' },
  ADMIN: { email: 'admin@civicfix.org', pass: 'CivicFix2026!' },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('civicfix_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        // Auto-login as Municipal Officer by default for rich initial experience
        try {
          const res = await api.login(DEMO_CREDENTIALS.MUNICIPAL_OFFICER.email, DEMO_CREDENTIALS.MUNICIPAL_OFFICER.pass);
          localStorage.setItem('civicfix_token', res.access_token);
          setToken(res.access_token);
          setUser(res.user);
        } catch {
          setUser(null);
        } finally {
          setIsLoading(false);
        }
        return;
      }
      try {
        const u = await api.getMe();
        setUser(u);
      } catch {
        localStorage.removeItem('civicfix_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      localStorage.setItem('civicfix_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('civicfix_token');
    setToken(null);
    setUser(null);
  };

  const switchDemoRole = async (role: UserRole) => {
    const creds = DEMO_CREDENTIALS[role];
    if (creds) {
      await login(creds.email, creds.pass);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, switchDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
