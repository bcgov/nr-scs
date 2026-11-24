import { fetchAuthSession, signInWithRedirect, signOut } from 'aws-amplify/auth';
import { useEffect, useMemo, useState, useCallback } from 'react';

import { env } from '@/env';
import { clearStoredActiveClient } from '@/context/activeClient/activeClientStorage';
import { clearAllPersistentState } from '@/hooks/usePersistentState';

import { AuthContext, type AuthContextType, type AuthProviderProps } from './AuthContext';
import { parseToken, getUserTokenFromCookie } from './authUtils';
import { type FamLoginUser, type IdpProviderType, type JWT } from './types';

export const RealAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FamLoginUser | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const getEffectiveAppEnv = () => {
    // 1. Try runtime config from Amplify
    if (window.amplifyConfig?.appEnv) {
      return window.amplifyConfig.appEnv;
    }
    // 2. Fallback to build-time env
    if (env.VITE_ZONE) {
      return isNaN(Number(env.VITE_ZONE)) ? env.VITE_ZONE : 'TEST';
    }
    return 'TEST';
  };

  const appEnv = getEffectiveAppEnv();

  const refreshUserState = async () => {
    setIsLoading(true);
    try {
      const idToken = await loadUserToken();
      if (idToken) {
        setUser(parseToken(idToken));
      } else {
        setUser(undefined);
      }
    } catch {
      setUser(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUserState();
    const interval = setInterval(loadUserToken, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const login = useCallback(
    async (provider: IdpProviderType) => {
      setIsLoading(true);
      const envProvider =
        provider === 'IDIR'
          ? `${appEnv.toLocaleUpperCase()}-IDIR`
          : `${appEnv.toLocaleUpperCase()}-BCEIDBUSINESS`;

      signInWithRedirect({
        provider: { custom: envProvider.toUpperCase() },
      });
    },
    [appEnv],
  );

  const logout = async () => {
    setIsLoading(true);
    await signOut({ global: true });
    clearAllPersistentState();
    // Persisted separately (it must survive a refresh), so it needs clearing separately.
    clearStoredActiveClient();
    setUser(undefined);
  };

  // Memoized function to get the current user's idToken from AWS Amplify
  const userToken = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString();
    } catch (error) {
      console.error('Error fetching auth session:', error);
      return undefined;
    }
  }, []);

  const contextValue: AuthContextType = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      isLoading,
      login,
      logout,
      userToken,
    }),
    [user, isLoading, login, userToken],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

const loadUserToken = async (): Promise<JWT | undefined> => {
  if (env.NODE_ENV !== 'test') {
    const { idToken } = (await fetchAuthSession()).tokens ?? {};
    return idToken;
  } else {
    // This is for test only
    const token = getUserTokenFromCookie();
    if (token) {
      const splittedToken = token.split('.')[1];
      if (splittedToken) {
        const jwtBody = JSON.parse(atob(splittedToken));
        return { payload: jwtBody };
      }
      throw new Error('Error parsing token');
    }
    throw new Error('No token found');
  }
};
