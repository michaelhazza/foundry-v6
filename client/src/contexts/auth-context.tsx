import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@shared/types';
import { api } from '../lib/api';
import {
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  clearAuth,
  isAuthenticated as checkAuth,
} from '../lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!checkAuth()) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
      setStoredUser(userData);
    } catch {
      clearAuth();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const response = await api.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    });

    setStoredToken(response.token);
    setStoredUser(response.user);
    setUser(response.user);
  };

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    setStoredUser(updatedUser);
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
