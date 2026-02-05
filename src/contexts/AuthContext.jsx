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
      displayName: user.displayName || undefined,
      avatar: user.photoURL || undefined,
      handle: user.email ? user.email.split("@")[0] : undefined,
    };

    try {
      const profile = await getUserProfile();
      const needsUpdate =
        !profile ||
        (desired.email && profile.email !== desired.email) ||
        (desired.displayName && profile.displayName !== desired.displayName) ||
        (desired.avatar && profile.avatar !== desired.avatar) ||
        (desired.handle && profile.handle !== desired.handle);

      if (needsUpdate) {
        await updateUserProfile(desired);
      }
    } catch (e) {
      console.error("Failed to sync user profile", e);
    }
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
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
