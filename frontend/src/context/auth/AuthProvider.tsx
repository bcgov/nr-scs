import React from 'react';
import { env } from '@/env';
import { RealAuthProvider } from './RealAuthProvider';
import { MockAuthProvider } from './MockAuthProvider';
import { type AuthProviderProps } from './AuthContext';

/**
 * High-level AuthProvider that toggles between real BC Gov SSO (Keycloak)
 * and a local mock clerical user based on environment configuration.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // `import.meta.env.DEV` is replaced with a literal at build time, so in any non-development
  // build this short-circuits to false: the MockAuthProvider branch becomes dead code (tree-shaken
  // out), and a VITE_MOCK_USER flag injected at runtime via globalThis.config can never enable mock
  // auth. Production builds are additionally blocked from baking in the flag by vite.config.ts.
  const isMockMode = import.meta.env.DEV && env.VITE_MOCK_USER === 'true';

  if (isMockMode) {
    console.warn('Authentication running in MOCK mode (Clerical user)');
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }

  return <RealAuthProvider>{children}</RealAuthProvider>;
};
