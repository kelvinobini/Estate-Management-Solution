import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch, setSessionExpiredHandler, validateStoredSession, ApiError } from "../api/client";
import { getStoredTokens, storeTokens, clearTokens } from "./token-storage";

type AuthStatus = "loading" | "unauthenticated" | "authenticated" | "mfa_challenge";

type LoginResult =
  | { status: "mfa_setup_required"; setupToken: string }
  | { status: "mfa_challenge"; mfaChallengeToken: string }
  | { status: "authenticated"; accessToken: string; refreshToken: string };

interface TenantProfile {
  id: string;
  fullName: string;
}

interface AuthContextValue {
  status: AuthStatus;
  /** Non-null only while status === "mfa_challenge" or briefly after an mfa_setup_required response. */
  pendingMessage: string | null;
  /** null while status !== "authenticated", or if this login isn't linked to a tenant record yet. */
  tenant: TenantProfile | null;
  login: (organisationSlug: string, email: string, password: string) => Promise<void>;
  verifyMfa: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantProfile | null>(null);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setStatus("unauthenticated");
      setMfaChallengeToken(null);
      setTenant(null);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      const valid = await validateStoredSession();
      if (valid) {
        await loadTenantProfile();
      }
      setStatus(valid ? "authenticated" : "unauthenticated");
    })();
  }, []);

  /** Best-effort — a caller not yet granted portal-linked status just sees tenant: null rather than a hard error. */
  async function loadTenantProfile(): Promise<void> {
    try {
      const record = await apiFetch<{ id: string; full_name: string }>("/tenants/me");
      setTenant({ id: record.id, fullName: record.full_name });
    } catch {
      setTenant(null);
    }
  }

  async function login(organisationSlug: string, email: string, password: string): Promise<void> {
    const result = await apiFetch<LoginResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ organisationSlug, email, password }),
    });

    if (result.status === "authenticated") {
      await storeTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      await loadTenantProfile();
      setStatus("authenticated");
      return;
    }

    if (result.status === "mfa_challenge") {
      setMfaChallengeToken(result.mfaChallengeToken);
      setStatus("mfa_challenge");
      return;
    }

    // mfa_setup_required: this role isn't expected to need MFA (only
    // SuperAdmin/OrgAdmin/FinanceOfficer are mandated to enroll — see
    // MFA_REQUIRED_ROLES in the backend's AuthService), so there's no
    // enrollment screen here yet.
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
    setPendingMessage(null);
    await loadTenantProfile();
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
    setTenant(null);
    setStatus("unauthenticated");
  }

  const value = useMemo<AuthContextValue>(
    () => ({ status, pendingMessage, tenant, login, verifyMfa, logout }),
    [status, pendingMessage, tenant],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
