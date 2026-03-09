import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import { Slider } from "./slider";
import { Loader2 } from "lucide-react";
import { useI18n } from "../../contexts/I18nContext";

const PURPOSE_PRESETS = {
  avatar: { aspect: 1, outputWidth: 512, outputHeight: 512 },
  logo: { aspect: 1, outputWidth: 512, outputHeight: 512 },
  cover: { aspect: 1200 / 630, outputWidth: 1200, outputHeight: 630 },
  banner: { aspect: 1500 / 500, outputWidth: 1500, outputHeight: 500 },
  generic: { aspect: 16 / 9, outputWidth: 1280, outputHeight: 720 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function loadImageFromSource(source) {
  return new Promise((resolve, reject) => {
    if (!source) {
      reject(new Error("No image source"));
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = source;
  });
}

function blobToFile(blob, name = "cropped-image.webp") {
  return new File([blob], name, { type: "image/webp" });
}

export function ImageCropDialog({
  open,
  onOpenChange,
  source,
  purpose = "generic",
  onConfirm,
}) {
  const { t } = useI18n();
  const preset = PURPOSE_PRESETS[purpose] || PURPOSE_PRESETS.generic;
  const [sourceUrl, setSourceUrl] = React.useState("");
  const [imgEl, setImgEl] = React.useState(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [errorText, setErrorText] = React.useState("");
  const [backgroundMode, setBackgroundMode] = React.useState("transparent");
  const dragStartRef = React.useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const frameRef = React.useRef(null);

  React.useEffect(() => {
    if (!open || !source) return undefined;
    let revoked = "";
    let cancelled = false;
    setErrorText("");
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setBackgroundMode("transparent");
    setIsLoading(true);
    setImgEl(null);
    const resolveSource = async () => {
      try {
        const url = source.file ? URL.createObjectURL(source.file) : String(source.url || "");
        revoked = source.file ? url : "";
        if (!url) throw new Error("Missing source url");
        const loaded = await loadImageFromSource(url);
        if (cancelled) return;
        setSourceUrl(url);
        setImgEl(loaded);
      } catch (error) {
        if (!cancelled) {
          setErrorText(error?.message || "Image load failed");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    resolveSource();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [open, source]);

  const frameSize = React.useMemo(() => {
    const maxWidth = 520;
    const width = maxWidth;
    const height = Math.round(width / preset.aspect);
    return { width, height };
  }, [preset.aspect]);

  const computed = React.useMemo(() => {
    if (!imgEl) return null;
    const iw = imgEl.naturalWidth || 1;
    const ih = imgEl.naturalHeight || 1;
    const baseScale = Math.max(frameSize.width / iw, frameSize.height / ih);
    const scale = baseScale * zoom;
    const drawW = iw * scale;
    const drawH = ih * scale;
    const maxX = Math.max(0, (drawW - frameSize.width) / 2);
    const maxY = Math.max(0, (drawH - frameSize.height) / 2);
    const clampedX = clamp(offset.x, -maxX, maxX);
    const clampedY = clamp(offset.y, -maxY, maxY);
    return {
      iw,
      ih,
      scale,
      drawW,
      drawH,
      x: (frameSize.width - drawW) / 2 + clampedX,
      y: (frameSize.height - drawH) / 2 + clampedY,
      maxX,
      maxY,
      clampedX,
      clampedY,
    };
  }, [imgEl, frameSize.height, frameSize.width, offset.x, offset.y, zoom]);

  React.useEffect(() => {
    if (!computed) return;
    if (computed.clampedX !== offset.x || computed.clampedY !== offset.y) {
      setOffset({ x: computed.clampedX, y: computed.clampedY });
    }
  }, [computed, offset.x, offset.y]);

  const startDrag = (clientX, clientY) => {
    if (!computed) return;
    setDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };

  const moveDrag = (clientX, clientY) => {
    if (!dragging || !computed) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    const nextX = clamp(dragStartRef.current.ox + dx, -computed.maxX, computed.maxX);
    const nextY = clamp(dragStartRef.current.oy + dy, -computed.maxY, computed.maxY);
    setOffset({ x: nextX, y: nextY });
  };

  const endDrag = () => setDragging(false);

  React.useEffect(() => {
    if (!dragging) return undefined;
    const onMouseMove = (e) => moveDrag(e.clientX, e.clientY);
    const onMouseUp = () => endDrag();
    const onTouchMove = (e) => {
      const touch = e.touches?.[0];
      if (!touch) return;
      moveDrag(touch.clientX, touch.clientY);
    };
    const onTouchEnd = () => endDrag();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragging, computed]);

  const handleConfirm = async () => {
    if (!imgEl || !computed || !onConfirm) return;
    setIsSubmitting(true);
    setErrorText("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = preset.outputWidth;
      canvas.height = preset.outputHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      if (backgroundMode === "solid") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, preset.outputWidth, preset.outputHeight);
      } else {
        ctx.clearRect(0, 0, preset.outputWidth, preset.outputHeight);
      }
      const srcX = (0 - computed.x) / computed.scale;
      const srcY = (0 - computed.y) / computed.scale;
      const srcW = frameSize.width / computed.scale;
      const srcH = frameSize.height / computed.scale;
      ctx.drawImage(imgEl, srcX, srcY, srcW, srcH, 0, 0, preset.outputWidth, preset.outputHeight);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b) {
            reject(new Error("Failed to create image"));
            return;
          }
          resolve(b);
        }, "image/webp", 0.88);
      });
      const fileNameBase = source?.name ? String(source.name).replace(/\.[^/.]+$/, "") : "cropped-image";
      const file = blobToFile(blob, `${fileNameBase}-${purpose}.webp`);
      await onConfirm(file);
      onOpenChange(false);
    } catch (error) {
      setErrorText(error?.message || t("mediaLibrary.uploadFailed", "上傳失敗"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("mediaLibrary.cropTitle", "裁切圖片")}</DialogTitle>
          <DialogDescription>
            {t("mediaLibrary.cropDesc", "拖曳圖片調整位置，並使用縮放控制裁切範圍。")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            ref={frameRef}
            className="relative mx-auto overflow-hidden rounded-lg border touch-none"
            style={{ width: frameSize.width, maxWidth: "100%", height: `auto`, aspectRatio: `${frameSize.width} / ${frameSize.height}` }}
            onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
            onTouchStart={(e) => {
              const touch = e.touches?.[0];
              if (!touch) return;
              startDrag(touch.clientX, touch.clientY);
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  backgroundMode === "solid"
                    ? "hsl(var(--background))"
                    : "conic-gradient(#00000010 25%, transparent 0 50%, #00000010 0 75%, transparent 0) 0 0 / 16px 16px",
              }}
            />
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : null}
            {!isLoading && computed ? (
              <img
                src={sourceUrl}
                alt="crop source"
                draggable={false}
                className="absolute select-none pointer-events-none max-w-none"
                style={{
                  width: `${computed.drawW}px`,
                  height: `${computed.drawH}px`,
                  left: `${computed.x}px`,
                  top: `${computed.y}px`,
                }}
              />
            ) : null}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("mediaLibrary.zoom", "縮放")}</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <Slider min={0.35} max={3} step={0.01} value={[zoom]} onValueChange={(val) => setZoom(val?.[0] || 1)} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("mediaLibrary.cropBackground", "背景")}</span>
            <Button
              type="button"
              size="sm"
              variant={backgroundMode === "transparent" ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              onClick={() => setBackgroundMode("transparent")}
            >
              {t("mediaLibrary.transparent", "透明")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={backgroundMode === "solid" ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              onClick={() => setBackgroundMode("solid")}
            >
              {t("mediaLibrary.solidBg", "實色")}
            </Button>
          </div>

          {errorText ? (
            <p className="text-xs text-destructive">{errorText}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "取消")}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || isSubmitting || !computed}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("common.confirm", "確認")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
