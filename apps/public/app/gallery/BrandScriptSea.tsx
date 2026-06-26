"use client";

import { useRef } from "react";
import { useBrandHeroTimeline } from "./hero-motion/useBrandHeroTimeline";

const LEFT_PAGE_LINES = [
  { label: "SCENE", value: "INT. 錄音室 / 夜" },
  { label: "ROLE", value: "旁白、角色 A、角色 B" },
  { label: "NOTE", value: "距離感要近，尾音放輕" },
] as const;

const DIALOGUE_LINES = [
  { speaker: "角色 A", text: "你真的要現在說嗎？", accent: "bg-sky-300/60" },
  { speaker: "旁白", text: "門外的雨聲慢慢靠近。", accent: "bg-emerald-300/60" },
  { speaker: "角色 B", text: "如果錯過，就不會再有第二次。", accent: "bg-violet-300/60" },
  { speaker: "音效", text: "玻璃窗被風輕輕推動。", accent: "bg-amber-300/60" },
] as const;

function LeftPage() {
  return (
    <div className="brand-script-page brand-script-page-left">
      <div className="mb-5 flex items-center justify-between">
        <span className="font-serif text-lg font-semibold text-foreground/70">Script</span>
        <span className="rounded-full border border-border/45 px-2 py-0.5 text-[10px] text-muted-foreground/70">OPEN</span>
      </div>
      <div className="space-y-4">
        {LEFT_PAGE_LINES.map((line) => (
          <div key={line.label}>
            <div className="mb-1 text-[9px] font-semibold tracking-[0.18em] text-primary/65">{line.label}</div>
            <div className="rounded-md border border-border/35 bg-background/35 px-2.5 py-2 text-[11px] text-foreground/68">
              {line.value}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-1.5">
        <div className="h-1.5 w-2/3 rounded-full bg-muted-foreground/16" />
        <div className="h-1.5 w-5/6 rounded-full bg-muted-foreground/14" />
        <div className="h-1.5 w-1/2 rounded-full bg-muted-foreground/12" />
      </div>
    </div>
  );
}

function RightPage() {
  return (
    <div className="brand-script-page brand-script-page-right">
      <div className="mb-4 text-[10px] font-semibold tracking-[0.2em] text-primary/70">DIALOGUE</div>
      <div className="space-y-3">
        {DIALOGUE_LINES.map((line, index) => (
          <div
            key={line.speaker}
            className="brand-script-line rounded-md border border-border/30 bg-background/30 p-2.5"
            style={{ ["--script-line-delay" as string]: `${index * 900}ms` }}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className={`h-1.5 w-7 rounded-full ${line.accent}`} />
              <span className="text-[10px] font-semibold text-foreground/62">{line.speaker}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted-foreground/18" />
            <div className="mt-1.5 h-1.5 w-4/5 rounded-full bg-muted-foreground/14" />
            <span className="sr-only">{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BrandScriptSea() {
  const ref = useRef<HTMLDivElement>(null);
  useBrandHeroTimeline(ref);

  return (
    <div
      ref={ref}
      className="absolute inset-0 pointer-events-none overflow-hidden brand-script-desk"
      data-testid="brand-script-sea"
      aria-hidden="true"
    >
      <div className="brand-script-book">
        <LeftPage />
        <RightPage />
        <div className="brand-script-spine" />
        <div className="brand-script-page-turn" />
      </div>
    </div>
  );
}
