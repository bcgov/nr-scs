import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AuthContext,
  type AuthContextType,
  type AuthProviderProps,
} from "./AuthContext";
import { parseToken } from "./authUtils";
import { type FamLoginUser, type IdpProviderType } from "./types";

import { clearStoredActiveClient } from "@/context/activeClient/activeClientStorage";
import { clearAllPersistentState } from "@/hooks/usePersistentState";
import {
  decodeTokenClaims,
  ensureFreshUser,
  getUserManager,
  signIn,
  signOutRedirect,
} from "@/services/keycloak";

/**
 * Real authentication: BC Gov SSO (Keycloak standard realm) via `oidc-client-ts` — see
 * `services/keycloak.ts`. The user is built from the ACCESS token, which is also what the API
 * receives, so the roles the UI shows are exactly the roles the backend authorises against.
 */
export const RealAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FamLoginUser | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const current = await getUserManager().getUser();
        if (cancelled) {
          return;
        }
        setUser(
          current?.access_token
            ? parseToken(decodeTokenClaims(current.access_token))
            : undefined,
        );
      } catch {
        if (!cancelled) {
          setUser(undefined);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((provider: IdpProviderType) => {
    setIsLoading(true);
    void signIn(provider);
  }, []);

  /** Completes the authorization-code exchange on `/authCallback` (see `pages/AuthCallback`). */
  const completeSignIn = useCallback(async (): Promise<void> => {
    const signedIn = await getUserManager().signinCallback();
    setUser(
      signedIn?.access_token
        ? parseToken(decodeTokenClaims(signedIn.access_token))
        : undefined,
    );
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setIsLoading(true);
    clearAllPersistentState();
    // Persisted separately (it must survive a refresh), so it needs clearing separately.
    clearStoredActiveClient();
    // Ends the realm session too; the stored user is removed by oidc-client-ts during the redirect.
    void signOutRedirect();
  }, []);

  /** A fresh ACCESS token for API calls, renewing first if it is near expiry. */
  const userToken = useCallback(async (): Promise<string | undefined> => {
    const fresh = await ensureFreshUser();
    return fresh?.access_token;
  }, []);

  const contextValue: AuthContextType = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      isLoading,
      login,
      logout,
      completeSignIn,
      userToken,
    }),
    [user, isLoading, login, logout, completeSignIn, userToken],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
