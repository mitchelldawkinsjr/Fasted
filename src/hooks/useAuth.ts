import { createContext, useContext } from 'react';
import type { UserRecord } from '../lib/supabase';

export type AuthContextValue = {
  user: UserRecord | null;
  isConfigured: boolean;
  initialized: boolean;
  isLoggedIn: boolean;
  email?: string;
  name?: string;
  memberSince?: string;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
