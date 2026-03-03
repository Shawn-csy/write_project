import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getUserProfile, updateUserProfile } from "../lib/db";

const AuthContext = createContext();

const getEnv = (key) => {
  if (typeof window !== "undefined" && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  return import.meta.env[key];
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

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  function login() {
    if (localAuthEnabled) {
      setCurrentUser(getLocalUser());
      return Promise.resolve();
    }
    return signInWithPopup(auth, googleProvider);
  }

  function logout() {
    if (localAuthEnabled) {
      setCurrentUser(null);
      return Promise.resolve();
    }
    return signOut(auth);
  }

  const syncUserProfile = async (user) => {
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
        setProfile(updated || desiredWithName || profile || null);
      }
    } catch (e) {
      console.error("Failed to sync user profile", e);
    }
  };

  const saveProfile = async (updates) => {
    const updated = await updateUserProfile(updates || {});
    setProfile((prev) => ({ ...(prev || {}), ...(updated || updates || {}) }));
    return updated;
  };

  useEffect(() => {
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

  const value = {
    currentUser,
    profile,
    login,
    logout,
    saveProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
