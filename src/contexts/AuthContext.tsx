import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth, googleProvider, initAnalytics } from "../lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { getUserProfile, updateUserProfile } from "../lib/api/user";

interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

interface UserProfile {
  displayName?: string;
  email?: string;
  avatar?: string;
  handle?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
}

interface AuthContextValue {
  currentUser: User | LocalUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<unknown>;
  logout: () => Promise<void>;
  saveProfile: (updates: Partial<UserProfile>) => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

declare global {
  interface Window { __ENV__?: Record<string, string> }
}

const getEnv = (key: string): string => {
  if (typeof window !== "undefined" && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  return import.meta.env[key] as string;
};

const localAuthEnabled = ["1", "true", "yes"].includes(
  String(getEnv("VITE_LOCAL_AUTH")).toLowerCase()
);

const getLocalUser = () => ({
  uid: getEnv("VITE_LOCAL_AUTH_UID") || "local-test-user",
  email: getEnv("VITE_LOCAL_AUTH_EMAIL") || "test.user@example.com",
  displayName: getEnv("VITE_LOCAL_AUTH_NAME") || "Local Test User",
  photoURL: getEnv("VITE_LOCAL_AUTH_AVATAR") || "",
});

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | LocalUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Safe with [] today: this callback only uses stable module-level references.
  // Revisit deps if login starts reading mutable local state or runtime env values.
  const login = useCallback(() => {
    if (localAuthEnabled) {
      setCurrentUser(getLocalUser());
      return Promise.resolve();
    }
    return signInWithPopup(auth, googleProvider);
  }, []);

  // Safe with [] today: this callback only uses stable module-level references.
  // Revisit deps if logout starts reading mutable local state or runtime env values.
  const logout = useCallback(() => {
    if (localAuthEnabled) {
      setCurrentUser(null);
      return Promise.resolve();
    }
    return signOut(auth);
  }, []);

  const syncUserProfile = async (user: User | LocalUser) => {
    if (!user) return;
    const desired = {
      email: user.email || undefined,
      avatar: user.photoURL || undefined,
      handle: user.email ? user.email.split("@")[0] : undefined,
    };
    const providerDisplayName = user.displayName || undefined;

    try {
      const profile = await getUserProfile();
      setProfile(profile || null);
      const desiredWithName = {
        ...desired,
        // Keep custom displayName if user already edited it in app.
        displayName: profile?.displayName ? undefined : providerDisplayName,
      };
      const needsUpdate =
        !profile ||
        (desiredWithName.email && profile.email !== desiredWithName.email) ||
        (desiredWithName.displayName && profile.displayName !== desiredWithName.displayName) ||
        (desiredWithName.avatar && profile.avatar !== desiredWithName.avatar) ||
        (desiredWithName.handle && profile.handle !== desiredWithName.handle);

      if (needsUpdate) {
        const updated = await updateUserProfile(desiredWithName);
        // Use the returned value directly; avoid a second round-trip to GET /me.
        setProfile(updated || profile || desiredWithName || null);
      }
    } catch (e) {
      console.error("Failed to sync user profile", e);
    }
  };

  // Safe with [] today: state updates are functional and do not depend on profile snapshot.
  // Revisit deps if saveProfile starts reading mutable local state.
  const saveProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const updated = await updateUserProfile(updates || {});
    setProfile((prev) => ({ ...(prev || {}), ...(updated || updates || {}) }));
    return updated;
  }, []);

  useEffect(() => {
    initAnalytics();
    if (localAuthEnabled) {
      const user = getLocalUser();
      setCurrentUser(user);
      setLoading(false);
      syncUserProfile(user);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        syncUserProfile(user);
      }
    });

    return unsubscribe;
  }, []);

  const value = useMemo(() => ({
    currentUser,
    profile,
    loading,
    login,
    logout,
    saveProfile,
  }), [currentUser, profile, loading, login, logout, saveProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
