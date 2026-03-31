// Task 88.5: Impersonation hook wrapping ImpersonationProvider context

import { useContext } from 'react';
import { ImpersonationContext } from '@/providers/ImpersonationProvider';
import type { ImpersonationContextValue, ImpersonatedUser } from '@/providers/ImpersonationProvider';

export const useImpersonation = (): ImpersonationContextValue => {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
};

// Re-export type for convenience
export type { ImpersonatedUser };
