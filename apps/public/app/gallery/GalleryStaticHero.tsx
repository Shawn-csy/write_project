"use client";

import React from "react";

export function GalleryStaticHero() {
  return (
    <section
      className="relative w-full overflow-hidden border-b border-border/40"
      aria-label="網站介紹"
    >
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 opacity-60 dark:opacity-40"
        style={{
          background:
            "linear-gradient(135deg, #e0f0ff 0%, #f5e6ff 35%, #fff0e0 65%, #e6f5ee 100%)",
          backgroundSize: "300% 300%",
          animation: "heroGradientShift 12s ease infinite",
        }}
        aria-hidden
      />
      {/* Noise grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12 sm:py-16 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/60">
          公開台本平台
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
          探索、閱讀、分享
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)",
              backgroundSize: "200% auto",
              animation: "heroTextShift 6s linear infinite",
            }}
          >
            創作台本
          </span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          支援 Fountain 格式劇本，探索公開作品、配音台本與作者頁面。
        </p>
      </div>

      <style>{`
        @keyframes heroGradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes heroTextShift {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </section>
  );
}
