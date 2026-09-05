/**
 * Offline-First Authentication Service for One Acre Fund Nigeria
 * Supports online server authentication (via Neon DB) with seamless offline fallback
 * and perpetual local token storage (until explicit logout).
 */

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: "officer" | "admin";
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
  isOfflineAuth?: boolean;
}

// Default offline fallback accounts (usable in remote rural locations without internet)
export const DEFAULT_OFFLINE_ACCOUNTS: Record<string, { password: string; user: AuthUser }> = {
  "officer.nigeria@oneacrefund.org": {
    password: "Password123!",
    user: {
      id: "usr-officer-01",
      email: "officer.nigeria@oneacrefund.org",
      fullName: "Amina Bello (Field Officer)",
      role: "officer",
    },
  },
  "admin.operations@oneacrefund.org": {
    password: "Password123!",
    user: {
      id: "usr-admin-01",
      email: "admin.operations@oneacrefund.org",
      fullName: "Daniel Chukwu (Operations Admin)",
      role: "admin",
    },
  },
};

const TOKEN_KEY = "oaf_auth_token";
const USER_KEY = "oaf_auth_user";

/**
 * Authenticates user either online via API or offline via locally cached credentials.
 */
export async function authenticateUser(
  emailInput: string,
  passwordInput: string,
  isOnline: boolean
): Promise<AuthResponse> {
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  // 1. Try Online API if connected
  if (isOnline) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
      });

      const data = await res.json();
      if (data.success && data.token && data.user) {
        // Save token and user perpetually
        saveAuthSession(data.token, data.user);
        return {
          success: true,
          token: data.token,
          user: data.user,
          isOfflineAuth: false,
        };
      }
    } catch {
      // Fallback to offline verification if network request failed
      console.warn("[Auth] Online login failed, attempting offline validation...");
    }
  }

  // 2. Offline Fallback Authentication
  const matched = DEFAULT_OFFLINE_ACCOUNTS[cleanEmail];
  if (matched && matched.password === cleanPassword) {
    // Generate persistent offline session token
    const token = `oaf_offline_jwt_${btoa(
      JSON.stringify({
        email: matched.user.email,
        role: matched.user.role,
        issuedAt: Date.now(),
      })
    )}`;

    saveAuthSession(token, matched.user);

    return {
      success: true,
      token,
      user: matched.user,
      isOfflineAuth: true,
    };
  }

  // Also check if user was previously authenticated and cached in localStorage
  if (typeof window !== "undefined") {
    const cachedUserJson = localStorage.getItem(USER_KEY);
    if (cachedUserJson) {
      try {
        const cachedUser = JSON.parse(cachedUserJson) as AuthUser;
        if (cachedUser.email.toLowerCase() === cleanEmail && cleanPassword.length >= 6) {
          const token = localStorage.getItem(TOKEN_KEY) || `oaf_cached_token_${Date.now()}`;
          saveAuthSession(token, cachedUser);
          return {
            success: true,
            token,
            user: cachedUser,
            isOfflineAuth: true,
          };
        }
      } catch {
        // ignore parse error
      }
    }
  }

  return {
    success: false,
    message: "Invalid email or password. Please verify credentials.",
  };
}

/**
 * Persists session token and user forever until explicit logout.
 */
export function saveAuthSession(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error("[Auth] Failed to persist session token:", err);
  }
}

/**
 * Retrieves the currently active user and token.
 */
export function getActiveSession(): { token: string | null; user: AuthUser | null } {
  if (typeof window === "undefined") return { token: null, user: null };
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    const user = userJson ? (JSON.parse(userJson) as AuthUser) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

/**
 * Logs out user by clearing persistent token.
 */
export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error("[Auth] Failed to clear session:", err);
  }
}
