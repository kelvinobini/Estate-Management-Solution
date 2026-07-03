import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch, setSessionExpiredHandler, validateStoredSession, ApiError } from "../api/client";
import { getStoredTokens, storeTokens, clearTokens } from "./token-storage";

type AuthStatus = "loading" | "unauthenticated" | "authenticated" | "mfa_challenge";

type LoginResult =
  | { status: "mfa_setup_required"; setupToken: string }
  | { status: "mfa_challenge"; mfaChallengeToken: string }
  | { status: "authenticated"; accessToken: string; refreshToken: string };

interface AuthContextValue {
  status: AuthStatus;
  login: (organisationSlug: string, email: string, password: string) => Promise<void>;
  verifyMfa: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setStatus("unauthenticated");
      setMfaChallengeToken(null);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      const valid = await validateStoredSession();
      setStatus(valid ? "authenticated" : "unauthenticated");
    })();
  }, []);

  async function login(organisationSlug: string, email: string, password: string): Promise<void> {
    const result = await apiFetch<LoginResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ organisationSlug, email, password }),
    });

    if (result.status === "authenticated") {
      await storeTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      setStatus("authenticated");
      return;
    }

    if (result.status === "mfa_challenge") {
      setMfaChallengeToken(result.mfaChallengeToken);
      setStatus("mfa_challenge");
      return;
    }

    // mfa_setup_required: only SuperAdmin/OrgAdmin/FinanceOfficer are ever
    // mandated to enroll (see MFA_REQUIRED_ROLES in the backend's
    // AuthService) — MaintenanceStaff isn't, so there's no enrollment screen here.
    throw new ApiError(409, "This account requires MFA setup, which isn't supported in this app yet. Please use the web dashboard to sign in.");
  }

  async function verifyMfa(code: string): Promise<void> {
    if (!mfaChallengeToken) {
      throw new ApiError(400, "Your session expired — please sign in again.");
    }
    const result = await apiFetch<{ accessToken: string; refreshToken: string }>("/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ mfaChallengeToken, code }),
    });
    await storeTokens(result);
    setMfaChallengeToken(null);
    setStatus("authenticated");
  }

  async function logout(): Promise<void> {
    const tokens = await getStoredTokens();
    if (tokens) {
      await apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: tokens.refreshToken }) }).catch(
        () => undefined,
      );
    }
    await clearTokens();
    setMfaChallengeToken(null);
    setStatus("unauthenticated");
  }

  const value = useMemo<AuthContextValue>(() => ({ status, login, verifyMfa, logout }), [status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
