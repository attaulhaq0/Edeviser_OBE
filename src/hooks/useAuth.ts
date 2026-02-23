import { useContext } from 'react';
import { AuthContext } from '@/providers/AuthProvider';
import type { AuthContextValue } from '@/providers/AuthProvider';

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
