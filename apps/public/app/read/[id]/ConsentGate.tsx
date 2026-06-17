"use client";

import React, { useEffect, useState } from "react";

interface TermsCheck {
  id: string;
  label: string;
}

interface TermsSection {
  id: string;
  title: string;
  body: string;
}

interface TermsConfig {
  termsKey: string;
  version: string;
  title: string;
  intro: string;
  sections: TermsSection[];
  requiredChecks: TermsCheck[];
}

const STORAGE_KEY_PREFIX = "public-reader:terms-accepted:";

function getStoredVersion(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_PREFIX + "version");
  } catch {
    return null;
  }
}

function storeAccepted(version: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + "version", version);
  } catch {
    /* storage blocked — gate won't persist, user re-consents on reload */
  }
}

async function fetchTermsConfig(): Promise<TermsConfig | null> {
  try {
    const res = await fetch("/api/public-terms-config");
    if (!res.ok) return null;
    return await res.json() as TermsConfig;
  } catch {
    return null;
  }
}

async function postAcceptance(
  config: TermsConfig,
  scriptId: string,
  visitorId: string,
  checkedIds: string[],
): Promise<void> {
  try {
    await fetch("/api/public-terms-acceptances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        termsVersion: config.version,
        scriptId,
        visitorId,
        locale: navigator.language || "zh-TW",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        acceptedChecks: checkedIds,
        screen: { width: window.screen.width, height: window.screen.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        pagePath: window.location.pathname,
      }),
    });
  } catch {
    /* non-critical — proceed regardless */
  }
}

function getOrCreateVisitorId(): string {
  try {
    const key = "visitor_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = `v-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export interface ConsentGateProps {
  scriptId: string;
  children: React.ReactNode;
  /** Rendered above the loading spinner and consent form; hidden once accepted. */
  summary?: React.ReactNode;
}

export function ConsentGate({ scriptId, children, summary }: ConsentGateProps) {
  // "loading" | "required" | "accepted"
  const [state, setState] = useState<"loading" | "required" | "accepted">("loading");
  const [config, setConfig] = useState<TermsConfig | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTermsConfig().then((cfg) => {
      if (!cfg) {
        // Config unavailable — fail open, don't block reader
        setState("accepted");
        return;
      }
      setConfig(cfg);
      const stored = getStoredVersion();
      if (stored === cfg.version) {
        setState("accepted");
      } else {
        setState("required");
      }
    });
  }, []);

  if (state === "loading") {
    return (
      <>
        {summary}
        <div className="min-h-screen flex items-center justify-center">
          <span className="text-sm text-muted-foreground">載入中…</span>
        </div>
      </>
    );
  }

  if (state === "accepted" || !config) {
    return <>{children}</>;
  }

  const requiredIds = config.requiredChecks.map((c) => c.id);
  const allChecked = requiredIds.every((id) => checked.has(id));

  const handleToggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleAccept = async () => {
    if (!allChecked || submitting) return;
    setSubmitting(true);
    const visitorId = getOrCreateVisitorId();
    await postAcceptance(config, scriptId, visitorId, Array.from(checked));
    storeAccepted(config.version);
    setState("accepted");
    setSubmitting(false);
  };

  return (
    <>
      {summary}
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card shadow-sm">
        <div className="p-6 sm:p-8">
          <h1 className="text-lg font-semibold leading-snug mb-2">{config.title}</h1>
          {config.intro && (
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{config.intro}</p>
          )}

          {config.sections.length > 0 && (
            <div className="space-y-4 mb-6">
              {config.sections.map((section) => (
                <div key={section.id} className="rounded-lg border border-border/60 bg-muted/40 p-4">
                  <div className="text-sm font-medium mb-1">{section.title}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{section.body}</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 mb-6">
            {config.requiredChecks.map((check) => (
              <label key={check.id} className="flex items-start gap-3 cursor-pointer select-none">
                <span
                  className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                    checked.has(check.id)
                      ? "bg-foreground border-foreground text-background"
                      : "border-input bg-background"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked.has(check.id)}
                    onChange={() => handleToggle(check.id)}
                  />
                  {checked.has(check.id) && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden>
                      <path d="M1 3l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-sm leading-snug">{check.label}</span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAccept}
            disabled={!allChecked || submitting}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-foreground text-background hover:opacity-90"
          >
            {submitting ? "處理中…" : "同意並進入閱讀"}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
