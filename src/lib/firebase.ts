import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
const getEnv = (key: string) => {
  if (typeof window !== "undefined" && window.__ENV__ && window.__ENV__[key]) {
      return window.__ENV__[key];
  }
  return import.meta.env[key];
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID")
};

// Firebase Auth (~97KB chunk) loads on demand so it stays out of the first-paint bundle.
type FirebaseAuthApi = typeof import("firebase/auth");

let firebaseAppPromise: Promise<FirebaseApp> | null = null;
let firebaseAuthPromise: Promise<{ app: FirebaseApp; auth: Auth; authApi: FirebaseAuthApi }> | null = null;
let loadedAuth: Auth | null = null;

export const loadFirebaseApp = () => {
  if (!firebaseAppPromise) {
    firebaseAppPromise = import("firebase/app").then(({ initializeApp }) =>
      initializeApp(firebaseConfig)
    );
  }
  return firebaseAppPromise;
};

export const loadFirebaseAuth = () => {
  if (!firebaseAuthPromise) {
    firebaseAuthPromise = Promise.all([loadFirebaseApp(), import("firebase/auth")]).then(
      ([app, authApi]) => {
        const auth = authApi.getAuth(app);
        loadedAuth = auth;
        return { app, auth, authApi };
      }
    );
  }
  return firebaseAuthPromise;
};

// Synchronous peek at the auth instance; null until loadFirebaseAuth resolves.
export const getLoadedAuth = () => loadedAuth;

let analyticsInitPromise: null | Promise<Analytics | null> = null;

export const initAnalytics = async () => {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.measurementId) return null;
  if (!analyticsInitPromise) {
    analyticsInitPromise = Promise.all([loadFirebaseApp(), import("firebase/analytics")])
      .then(([app, { isSupported, getAnalytics }]) =>
        isSupported().then((supported) => (supported ? getAnalytics(app) : null))
      )
      .catch(() => null);
  }
  return analyticsInitPromise;
};

export const trackPageView = async ({ path, title, location }: { path?: string; title?: string; location?: string } = {}) => {
  const analytics = await initAnalytics();
  if (!analytics) return false;

  try {
    const { logEvent } = await import("firebase/analytics");
    logEvent(analytics, "page_view", {
      page_path:
        path ||
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
      page_title: title || document.title || "",
      page_location: location || window.location.href,
    });
    return true;
  } catch {
    return false;
  }
};

export const getGoogleDocsAccessToken = async (): Promise<string> => {
  const { auth, authApi } = await loadFirebaseAuth();
  const { GoogleAuthProvider, reauthenticateWithPopup, signInWithPopup } = authApi;

  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/documents");
  provider.addScope("https://www.googleapis.com/auth/drive.file");
  provider.setCustomParameters({ prompt: "consent" });

  const currentUser = auth.currentUser;
  const result = currentUser
    ? await reauthenticateWithPopup(currentUser, provider)
    : await signInWithPopup(auth, provider);
  const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
  if (!token) throw new Error("Unable to obtain Google access token");
  return token;
};
// db removed as we use custom backend now
