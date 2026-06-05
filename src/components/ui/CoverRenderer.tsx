/**
 * CoverRenderer
 *
 * Pure rendering component for CoverDesign objects.
 * - Canvas: compact 160×240, full 300×450
 * - SVG: bg / frame / accent layers
 * - HTML overlay: all text layers (CJK vertical writing-mode)
 * - Dynamic vars: {{varKey}} tokens resolved from CoverVars at render time
 * - Drag to reposition, scale/rotation transform handles, double-click to edit
 */
import React, { useId, useMemo, useRef, useCallback, useState, useEffect } from "react";
import type { CoverDesign, CoverFont, CoverTextLayer, CoverVars } from "../../types/coverDesign";
import { resolveCoverText, migrateLegacySub } from "../../types/coverDesign";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const COVER_W = 300;
export const COVER_H = 450;
export const COVER_COMPACT_W = 160;
export const COVER_COMPACT_H = 240;

const FONT_FAMILY: Record<CoverFont, string> = {
  serif: "'Noto Serif CJK TC', 'Source Han Serif TC', 'STSong', Georgia, serif",
  sans:  "'Noto Sans CJK TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif",
  mono:  "'Noto Sans Mono CJK TC', 'Courier New', monospace",
  brush: "'KaiTi', 'STKaiti', 'AR PL UKai TW', cursive, serif",
};

const FONT_SIZE_MAP: Record<string, number> = {
  xs: 11, sm: 14, md: 18, lg: 24, xl: 32,
};

const EMPTY_VARS: CoverVars = {
  title: "", author: "", persona: "", date: "", series: "", status: "",
};

// ---------------------------------------------------------------------------
// Background layer (SVG)
// ---------------------------------------------------------------------------

function BgLayer({ design, w, h, uid }: { design: CoverDesign; w: number; h: number; uid: string }) {
  const { bg } = design;

  if (bg.type === "gradient") {
    const angle = bg.angle ?? 160;
    const rad = (angle * Math.PI) / 180;
    const x2 = (50 + Math.cos(rad) * 50).toFixed(1);
    const y2 = (50 + Math.sin(rad) * 50).toFixed(1);
    return (
      <>
        <defs>
          <linearGradient id={`grad-${uid}`} x1="50%" y1="50%" x2={`${x2}%`} y2={`${y2}%`}>
            <stop offset="0%" stopColor={bg.colorA} />
            <stop offset="100%" stopColor={bg.colorB ?? bg.colorA} />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={w} height={h} fill={`url(#grad-${uid})`} />
      </>
    );
  }

  if (bg.type === "split") {
    const ratio = bg.splitRatio ?? 0.5;
    return (
      <>
        <rect x={0} y={0} width={w} height={h * ratio} fill={bg.colorA} />
        <rect x={0} y={h * ratio} width={w} height={h * (1 - ratio)} fill={bg.colorB ?? "#ffffff"} />
      </>
    );
  }

  if (bg.type === "textrepeat") {
    return (
      <>
        <defs>
          <pattern id={`tr-${uid}`} x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
            <text x="3" y="17" fontSize="12" fill="rgba(255,255,255,0.08)" fontFamily="serif">文</text>
          </pattern>
        </defs>
        <rect x={0} y={0} width={w} height={h} fill={bg.colorA} />
        <rect x={0} y={0} width={w} height={h} fill={`url(#tr-${uid})`} />
      </>
    );
  }

  if (bg.type === "noise") {
    return (
      <>
        <defs>
          <filter id={`noise-${uid}`} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" result="noiseOut" />
            <feColorMatrix type="saturate" values="0" in="noiseOut" result="gray" />
            <feBlend in="SourceGraphic" in2="gray" mode="multiply" />
          </filter>
        </defs>
        <rect x={0} y={0} width={w} height={h} fill={bg.colorA} />
        <rect x={0} y={0} width={w} height={h} opacity={bg.noiseOpacity ?? 0.1} filter={`url(#noise-${uid})`} />
      </>
    );
  }

  return <rect x={0} y={0} width={w} height={h} fill={bg.colorA} />;
}

// ---------------------------------------------------------------------------
// Frame layer (SVG)
// ---------------------------------------------------------------------------

function FrameLayer({ design, w, h }: { design: CoverDesign; w: number; h: number }) {
  const frame = design.frame;
  if (!frame || frame.type === "none") return null;
  const { color, width: fw, inset: i } = frame;

  if (frame.type === "single") {
    return <rect x={i} y={i} width={w - i * 2} height={h - i * 2} fill="none" stroke={color} strokeWidth={fw} />;
  }
  if (frame.type === "double") {
    return (
      <>
        <rect x={i} y={i} width={w - i * 2} height={h - i * 2} fill="none" stroke={color} strokeWidth={fw} />
        <rect x={i + fw + 3} y={i + fw + 3} width={w - (i + fw + 3) * 2} height={h - (i + fw + 3) * 2} fill="none" stroke={color} strokeWidth={fw} />
      </>
    );
  }
  if (frame.type === "corner-l") {
    const cl = 24;
    return (
      <>
        <polyline points={`${i+cl},${i} ${i},${i} ${i},${i+cl}`} fill="none" stroke={color} strokeWidth={fw} strokeLinecap="square" />
        <polyline points={`${w-i-cl},${i} ${w-i},${i} ${w-i},${i+cl}`} fill="none" stroke={color} strokeWidth={fw} strokeLinecap="square" />
        <polyline points={`${i},${h-i-cl} ${i},${h-i} ${i+cl},${h-i}`} fill="none" stroke={color} strokeWidth={fw} strokeLinecap="square" />
        <polyline points={`${w-i},${h-i-cl} ${w-i},${h-i} ${w-i-cl},${h-i}`} fill="none" stroke={color} strokeWidth={fw} strokeLinecap="square" />
      </>
    );
  }
  if (frame.type === "bottom-band") {
    return <rect x={0} y={h - 36} width={w} height={36} fill={color} opacity={0.9} />;
  }
  if (frame.type === "h-split") {
    return <line x1={i} y1={h / 2} x2={w - i} y2={h / 2} stroke={color} strokeWidth={fw} />;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Accent layer (SVG)
// ---------------------------------------------------------------------------

function AccentLayer({ design, w, h }: { design: CoverDesign; w: number; h: number }) {
  const accent = design.accent;
  if (!accent) return null;
  const { shape, anchor, size, color, opacity } = accent;
  const cx = anchor === "tl" || anchor === "bl" ? size * 0.6 : anchor === "tr" || anchor === "br" ? w - size * 0.6 : w / 2;
  const cy = anchor === "tl" || anchor === "tr" ? size * 0.6 : anchor === "bl" || anchor === "br" ? h - size * 0.6 : anchor === "tc" ? size * 0.6 : h - size * 0.6;

  if (shape === "circle")  return <circle cx={cx} cy={cy} r={size / 2} fill={color} opacity={opacity} />;
  if (shape === "rect")    return <rect x={cx - size/2} y={cy - size/2} width={size} height={size} fill={color} opacity={opacity} />;
  if (shape === "diamond") {
    const hf = size / 2;
    return <polygon points={`${cx},${cy-hf} ${cx+hf},${cy} ${cx},${cy+hf} ${cx-hf},${cy}`} fill={color} opacity={opacity} />;
  }
  if (shape === "line") {
    const isV = anchor === "tc" || anchor === "bc";
    return isV
      ? <line x1={cx} y1={cy} x2={cx} y2={cy + size} stroke={color} strokeWidth={1.5} opacity={opacity} />
      : <line x1={cx} y1={cy} x2={cx + size} y2={cy} stroke={color} strokeWidth={1.5} opacity={opacity} />;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Split handle (draggable, editor only)
// ---------------------------------------------------------------------------

function SplitHandle({ ratio, w, h, onDrag }: { ratio: number; w: number; h: number; onDrag: (r: number) => void }) {
  const dragRef = useRef(false);
  const onMouseDown = useCallback((e: React.MouseEvent<SVGGElement>) => {
    e.stopPropagation();
    dragRef.current = true;
    const svgEl = (e.currentTarget as SVGGElement).closest("svg") as SVGSVGElement;
    const rect = svgEl.getBoundingClientRect();
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      onDrag(Math.min(0.9, Math.max(0.1, (me.clientY - rect.top) / rect.height)));
    };
    const onUp = () => { dragRef.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [onDrag]);

  const y = ratio * h;
  const handleColor = "rgba(255,255,255,0.7)";
  return (
    <g onMouseDown={onMouseDown} style={{ cursor: "ns-resize" }}>
      <line x1={0} y1={y} x2={w} y2={y} stroke={handleColor} strokeWidth={1} strokeDasharray="4 3" />
      <rect x={w/2 - 18} y={y - 6} width={36} height={12} rx={6} fill="rgba(0,0,0,0.45)" />
      <line x1={w/2 - 8} y1={y - 2} x2={w/2 + 8} y2={y - 2} stroke={handleColor} strokeWidth={1} />
      <line x1={w/2 - 8} y1={y + 2} x2={w/2 + 8} y2={y + 2} stroke={handleColor} strokeWidth={1} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// TransformLayer — draggable, scalable, rotatable text element with handles
// ---------------------------------------------------------------------------

interface TransformLayerProps {
  id: string;
  text: string;
  font: CoverFont;
  fontSize: number;
  letterSpacing: number;
  effect: CoverDesign["title"]["effect"];
  color: string;
  effectColor?: string;
  direction: "horizontal" | "vertical";
  px: number; // absolute px from left
  py: number; // absolute px from top
  /** Absolute box width in px. undefined = auto (shrink-wrap) */
  boxW?: number;
  scale: number;
  rotation: number;
  /** Cover canvas width in px (for normalised resize callbacks) */
  canvasW: number;
  canvasH: number;
  interactive: boolean;
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
  onDblClick: () => void;
  onDrag: (x: number, y: number) => void;
  onResize: (normW: number, fontSize: number) => void;
  onRotate: (rotation: number) => void;
  onEditChange?: (text: string) => void;
  onEditCommit?: () => void;
}

function TransformLayer({
  id, text, font, fontSize, letterSpacing, effect, color, effectColor,
  direction, px, py, boxW, scale, rotation, canvasW, canvasH,
  interactive, selected, editing,
  onSelect, onDblClick, onDrag, onResize, onRotate, onEditChange, onEditCommit,
}: TransformLayerProps) {
  const dragRef = useRef(false);
  const elRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input on edit start
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const textStyle: React.CSSProperties = {
    fontFamily: FONT_FAMILY[font],
    fontSize,
    letterSpacing: `${letterSpacing}em`,
    color,
    lineHeight: 1.3,
    writingMode: direction === "vertical" ? "vertical-rl" : undefined,
    textOrientation: direction === "vertical" ? "mixed" : undefined,
    wordBreak: "break-word",
    whiteSpace: boxW != null ? "pre-wrap" : "nowrap",
    textAlign: "center",
    userSelect: "none",
    pointerEvents: "none",
    width: boxW != null ? "100%" : undefined,
  };

  if (effect === "shadow") {
    textStyle.textShadow = `1px 2px 5px ${effectColor ?? "rgba(0,0,0,0.55)"}`;
  } else if (effect === "stroke") {
    textStyle.WebkitTextStroke = `1px ${effectColor ?? "#ffffff"}`;
    textStyle.WebkitTextFillColor = color;
  } else if (effect === "gradient") {
    textStyle.background = `linear-gradient(135deg, ${color}, ${effectColor ?? color})`;
    textStyle.WebkitBackgroundClip = "text";
    textStyle.WebkitTextFillColor = "transparent";
  }

  const wrapStyle: React.CSSProperties = {
    position: "absolute",
    left: px,
    top: py,
    width: boxW != null ? boxW : undefined,
    transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
    transformOrigin: "center center",
    cursor: interactive ? (selected ? "move" : "pointer") : "default",
    pointerEvents: interactive ? "auto" : "none",
    zIndex: selected ? 20 : 10,
    outline: selected ? "1.5px dashed rgba(255,255,255,0.55)" : undefined,
    outlineOffset: selected ? "4px" : undefined,
    boxSizing: "border-box",
  };

  // Drag to move
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (e.detail === 2) return;
    e.stopPropagation();
    onSelect();
    dragRef.current = true;
    const container = (e.currentTarget as HTMLDivElement).parentElement as HTMLElement;
    const rect = container.getBoundingClientRect();
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      onDrag(
        Math.min(0.97, Math.max(0.03, (me.clientX - rect.left) / rect.width)),
        Math.min(0.97, Math.max(0.03, (me.clientY - rect.top) / rect.height)),
      );
    };
    const onUp = () => { dragRef.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [interactive, onSelect, onDrag]);

  // Resize handle drag — left/right edge adjusts width, top/bottom adjusts fontSize
  const handleResizeDrag = useCallback((e: React.MouseEvent<HTMLDivElement>, handle: "left" | "right" | "top" | "bottom") => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = boxW ?? canvasW * 0.5;
    const startFs = fontSize;
    const onMove = (me: MouseEvent) => {
      if (handle === "left") {
        const dx = startX - me.clientX;
        const nextW = Math.max(20, Math.min(canvasW, startW + dx * 2));
        onResize(nextW / canvasW, startFs);
      } else if (handle === "right") {
        const dx = me.clientX - startX;
        const nextW = Math.max(20, Math.min(canvasW, startW + dx * 2));
        onResize(nextW / canvasW, startFs);
      } else if (handle === "top") {
        const dy = startY - me.clientY;
        const nextFs = Math.max(6, Math.min(120, Math.round(startFs + dy * 0.5)));
        onResize(startW / canvasW, nextFs);
      } else {
        const dy = me.clientY - startY;
        const nextFs = Math.max(6, Math.min(120, Math.round(startFs + dy * 0.5)));
        onResize(startW / canvasW, nextFs);
      }
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [boxW, canvasW, fontSize, onResize]);

  // Rotation handle drag
  const handleRotateDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const startAngle = Math.atan2(e.clientY - py, e.clientX - px) * (180 / Math.PI);
    const startRot = rotation;
    const onMove = (me: MouseEvent) => {
      const angle = Math.atan2(me.clientY - py, me.clientX - px) * (180 / Math.PI);
      onRotate(Math.round(startRot + (angle - startAngle)));
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [px, py, rotation, onRotate]);

  const HANDLE_SIZE = 8;
  // Edge mid-point handles for resize
  const edgeHandles: Array<{ id: "left" | "right" | "top" | "bottom"; style: React.CSSProperties; cursor: string }> = [
    { id: "left",   cursor: "ew-resize",  style: { left: -HANDLE_SIZE / 2, top: "50%", transform: "translateY(-50%)" } },
    { id: "right",  cursor: "ew-resize",  style: { right: -HANDLE_SIZE / 2, top: "50%", transform: "translateY(-50%)" } },
    { id: "top",    cursor: "ns-resize",  style: { top: -HANDLE_SIZE / 2, left: "50%", transform: "translateX(-50%)" } },
    { id: "bottom", cursor: "ns-resize",  style: { bottom: -HANDLE_SIZE / 2, left: "50%", transform: "translateX(-50%)" } },
  ];

  return (
    <div ref={elRef} style={wrapStyle} onMouseDown={handleMouseDown} onDoubleClick={(e) => { e.stopPropagation(); onDblClick(); }}>
      {editing ? (
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => onEditChange?.(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) { e.preventDefault(); onEditCommit?.(); } }}
          onBlur={onEditCommit}
          style={{
            ...textStyle,
            pointerEvents: "auto",
            userSelect: "text",
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: 2,
            padding: "2px 4px",
            outline: "none",
            resize: "none",
            width: boxW != null ? "100%" : undefined,
            minWidth: 60,
            minHeight: 24,
            backdropFilter: "blur(2px)",
          }}
          rows={direction === "vertical" ? 8 : 2}
        />
      ) : (
        <div style={textStyle}>{text}</div>
      )}

      {/* Resize + rotate handles — only when selected and not editing */}
      {selected && !editing && (
        <>
          {edgeHandles.map((h) => (
            <div key={h.id}
              style={{
                position: "absolute",
                width: HANDLE_SIZE, height: HANDLE_SIZE,
                borderRadius: 2,
                background: "white",
                border: "1.5px solid rgba(0,0,0,0.5)",
                cursor: h.cursor,
                zIndex: 30,
                pointerEvents: "auto",
                ...h.style,
              }}
              onMouseDown={(e) => handleResizeDrag(e, h.id)}
            />
          ))}
          {/* Rotation handle above */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "-22px",
              transform: "translateX(-50%)",
              width: 14, height: 14,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.85)",
              border: "1.5px solid rgba(0,0,0,0.4)",
              cursor: "crosshair",
              zIndex: 30,
              pointerEvents: "auto",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, color: "#333",
            }}
            onMouseDown={handleRotateDrag}
          >↻</div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text overlay — renders title + all extra layers
// ---------------------------------------------------------------------------

interface TextOverlayProps {
  design: CoverDesign;
  vars: CoverVars;
  w: number;
  h: number;
  interactive: boolean;
  selectedLayerId: string | null;
  editingLayerId: string | null;
  onSelect: (id: string) => void;
  onDblClick: (id: string) => void;
  onTitleDrag?: (x: number, y: number) => void;
  onLayerDrag?: (id: string, x: number, y: number) => void;
  onTitleResize?: (normW: number, fontSize: number) => void;
  onLayerResize?: (id: string, normW: number, fontSize: number) => void;
  onTitleRotate?: (rotation: number) => void;
  onLayerRotate?: (id: string, rotation: number) => void;
  onEditChange?: (id: string, text: string) => void;
  onEditCommit?: () => void;
}

function TextOverlay({
  design, vars, w, h, interactive,
  selectedLayerId, editingLayerId,
  onSelect, onDblClick,
  onTitleDrag, onLayerDrag,
  onTitleResize, onLayerResize,
  onTitleRotate, onLayerRotate,
  onEditChange, onEditCommit,
}: TextOverlayProps) {
  const canvasScale = w / COVER_W;
  const { title } = design;

  const titleText = title.text?.trim()
    ? resolveCoverText(title.text, vars)
    : vars.title || "劇本標題";

  const layers: CoverTextLayer[] = [
    ...migrateLegacySub(design),
    ...(design.layers ?? []),
  ].filter((l, idx, arr) => arr.findIndex((x) => x.id === l.id) === idx);

  // Resolve effective font size: fontSize field takes precedence over size enum
  const titleFontSize = title.fontSize != null
    ? title.fontSize * canvasScale
    : FONT_SIZE_MAP[title.size] * canvasScale;

  return (
    <>
      <TransformLayer
        id="__title__"
        text={titleText}
        font={title.font}
        fontSize={titleFontSize}
        letterSpacing={title.letterSpacing}
        effect={title.effect}
        color={title.color}
        effectColor={title.effectColor}
        direction={title.direction}
        px={title.x * w}
        py={title.y * h}
        boxW={title.w != null ? title.w * w : undefined}
        scale={title.scale ?? 1}
        rotation={title.rotation ?? 0}
        canvasW={w} canvasH={h}
        interactive={interactive}
        selected={selectedLayerId === "__title__"}
        editing={editingLayerId === "__title__"}
        onSelect={() => onSelect("__title__")}
        onDblClick={() => onDblClick("__title__")}
        onDrag={(x, y) => onTitleDrag?.(x, y)}
        onResize={(nw, fs) => onTitleResize?.(nw, fs / canvasScale)}
        onRotate={(r) => onTitleRotate?.(r)}
        onEditChange={(t) => onEditChange?.("__title__", t)}
        onEditCommit={onEditCommit}
      />
      {layers.map((layer) => {
        if (!layer.visible) return null;
        const resolved = resolveCoverText(layer.text, vars);
        if (!resolved.trim() && editingLayerId !== layer.id) return null;
        const layerFontSize = layer.fontSize != null
          ? layer.fontSize * canvasScale
          : FONT_SIZE_MAP[layer.size] * canvasScale;
        return (
          <TransformLayer
            key={layer.id}
            id={layer.id}
            text={editingLayerId === layer.id ? layer.text : resolved}
            font={layer.font}
            fontSize={layerFontSize}
            letterSpacing={layer.letterSpacing}
            effect={layer.effect}
            color={layer.color}
            effectColor={layer.effectColor}
            direction={layer.direction}
            px={layer.x * w}
            py={layer.y * h}
            boxW={layer.w != null ? layer.w * w : undefined}
            scale={layer.scale ?? 1}
            rotation={layer.rotation ?? 0}
            canvasW={w} canvasH={h}
            interactive={interactive}
            selected={selectedLayerId === layer.id}
            editing={editingLayerId === layer.id}
            onSelect={() => onSelect(layer.id)}
            onDblClick={() => onDblClick(layer.id)}
            onDrag={(x, y) => onLayerDrag?.(layer.id, x, y)}
            onResize={(nw, fs) => onLayerResize?.(layer.id, nw, fs / canvasScale)}
            onRotate={(r) => onLayerRotate?.(layer.id, r)}
            onEditChange={(t) => onEditChange?.(layer.id, t)}
            onEditCommit={onEditCommit}
          />
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface CoverRendererProps {
  design: CoverDesign;
  title: string;
  vars?: Partial<CoverVars>;
  compact?: boolean;
  responsive?: boolean;
  responsiveFit?: "cover" | "contain";
  className?: string;
  // Interactive mode (editor only)
  interactive?: boolean;
  selectedLayerId?: string | null;
  editingLayerId?: string | null;
  onSelectLayer?: (id: string) => void;
  onDblClickLayer?: (id: string) => void;
  onTitleDrag?: (x: number, y: number) => void;
  onLayerDrag?: (id: string, x: number, y: number) => void;
  onTitleResize?: (normW: number, fontSize: number) => void;
  onLayerResize?: (id: string, normW: number, fontSize: number) => void;
  onTitleRotate?: (rotation: number) => void;
  onLayerRotate?: (id: string, rotation: number) => void;
  onSplitDrag?: (ratio: number) => void;
  onEditChange?: (id: string, text: string) => void;
  onEditCommit?: () => void;
  onDeselect?: () => void;
}

function CoverRendererInner({
  design, title, vars, compact = false, responsive = false, responsiveFit = "cover", className = "",
  interactive = false,
  selectedLayerId, editingLayerId,
  onSelectLayer, onDblClickLayer,
  onTitleDrag, onLayerDrag,
  onTitleResize, onLayerResize,
  onTitleRotate, onLayerRotate,
  onSplitDrag,
  onEditChange, onEditCommit,
  onDeselect,
}: CoverRendererProps) {
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const baseW = compact ? COVER_COMPACT_W : COVER_W;
  const baseH = compact ? COVER_COMPACT_H : COVER_H;
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!responsive || !rootRef.current || typeof ResizeObserver === "undefined") return;
    const node = rootRef.current;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setContainerSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [responsive]);

  const { w, h } = useMemo(() => {
    if (!responsive || !containerSize) return { w: baseW, h: baseH };
    const scaleByWidth = containerSize.width / baseW;
    const scaleByHeight = containerSize.height / baseH;
    const scale = responsiveFit === "contain"
      ? Math.min(scaleByWidth, scaleByHeight)
      : Math.max(scaleByWidth, scaleByHeight);
    return {
      w: Math.max(1, baseW * scale),
      h: Math.max(1, baseH * scale),
    };
  }, [baseH, baseW, containerSize, responsive, responsiveFit]);

  const resolvedVars: CoverVars = useMemo(() => ({
    ...EMPTY_VARS,
    title,
    ...vars,
  }), [title, vars]);

  return (
    <div
      ref={rootRef}
      className={className}
      style={{ position: "relative", width: responsive ? "100%" : w, height: responsive ? "100%" : h, overflow: "hidden", flexShrink: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onDeselect?.(); }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: w,
          height: h,
          transform: "translate(-50%, -50%)",
        }}
      >
        <svg
          width={w} height={h}
          viewBox={`0 0 ${w} ${h}`}
          style={{ position: "absolute", inset: 0, display: "block" }}
          aria-hidden
          onClick={() => onDeselect?.()}
        >
          <BgLayer design={design} w={w} h={h} uid={uid} />
          <AccentLayer design={design} w={w} h={h} />
          <FrameLayer design={design} w={w} h={h} />
          {design.bg.type === "split" && onSplitDrag && (
            <SplitHandle ratio={design.bg.splitRatio ?? 0.5} w={w} h={h} onDrag={onSplitDrag} />
          )}
        </svg>
        <div style={{ position: "absolute", inset: 0, width: w, height: h }}>
          <TextOverlay
            design={design}
            vars={resolvedVars}
            w={w} h={h}
            interactive={interactive}
            selectedLayerId={selectedLayerId ?? null}
            editingLayerId={editingLayerId ?? null}
            onSelect={onSelectLayer ?? (() => {})}
            onDblClick={onDblClickLayer ?? (() => {})}
            onTitleDrag={onTitleDrag}
            onLayerDrag={onLayerDrag}
            onTitleResize={onTitleResize}
            onLayerResize={onLayerResize}
            onTitleRotate={onTitleRotate}
            onLayerRotate={onLayerRotate}
            onEditChange={onEditChange}
            onEditCommit={onEditCommit}
          />
        </div>
      </div>
    </div>
  );
}

export const CoverRenderer = React.memo(CoverRendererInner);
