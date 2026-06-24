import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { currentUser, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = (location.state as {
    from?: { pathname?: string; search?: string; hash?: string };
  } | null)?.from;
  const from = fromLocation?.pathname
    ? `${fromLocation.pathname}${fromLocation.search ?? ""}${fromLocation.hash ?? ""}`
    : "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Already logged in → go to destination
  useEffect(() => {
    if (!loading && currentUser) {
      navigate(from, { replace: true });
    }
  }, [currentUser, loading, navigate, from]);

  const handleLogin = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await login();
      navigate(from, { replace: true });
    } catch {
      setError("登入失敗，請再試一次。");
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-8 flex flex-col gap-6"
        style={{ border: "1px solid hsl(var(--border) / 0.6)", background: "hsl(var(--card))" }}
      >
        {/* Logo / brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="relative w-10 h-10 shrink-0">
            <div className="absolute inset-0 rounded-[8px] bg-foreground/90" />
            <svg viewBox="0 0 28 28" fill="none" className="absolute inset-0 w-full h-full p-[6px] text-background" aria-hidden="true">
              <path d="M16 4.5 C17.5 4.5 19 6 18.5 8.5 L17 21.5 C16.5 23 15.5 24 14 23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="10" y1="14" x2="18" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="10" y1="18" x2="15" y2="18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-foreground">登入工作室</h1>
          <p className="text-sm text-muted-foreground">使用 Google 帳號登入以繼續</p>
        </div>

        {/* Login button */}
        <button
          type="button"
          onClick={handleLogin}
          disabled={signingIn}
          className="flex items-center justify-center gap-2.5 w-full h-11 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            boxShadow: "0 1px 3px hsl(var(--primary)/0.3), inset 0 0.5px 0 hsl(0 0% 100% / 0.15)",
          }}
        >
          {signingIn ? (
            <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity=".9"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".9"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity=".9"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".9"/>
            </svg>
          )}
          {signingIn ? "登入中…" : "使用 Google 帳號登入"}
        </button>

        {error && (
          <p className="text-xs text-destructive text-center">{error}</p>
        )}

        <p className="text-xs text-muted-foreground/60 text-center">
          登入即表示同意{" "}
          <a href="/terms" className="underline hover:text-muted-foreground">使用條款</a>
          {" "}與{" "}
          <a href="/privacy" className="underline hover:text-muted-foreground">隱私政策</a>
        </p>
      </div>
    </div>
  );
}
