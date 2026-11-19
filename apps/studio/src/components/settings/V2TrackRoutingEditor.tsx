import React, { useMemo, useState } from "react";
import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";
import { normalizeLayoutConfig, type LayoutConfig, type TrackConfig, type TrackRole } from "../../lib/v2";

interface V2TrackRoutingEditorProps {
  layoutConfig: LayoutConfig;
  onChange: (config: LayoutConfig) => void;
  t: (key: string) => string;
}

const slugifyTrackId = (value: string): string => (
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
);


export function V2TrackRoutingEditor({
  layoutConfig,
  onChange,
  t,
}: V2TrackRoutingEditorProps): React.JSX.Element {
  const [newTrackId, setNewTrackId] = useState("");
  const [newTrackName, setNewTrackName] = useState("");
  const config = useMemo(() => normalizeLayoutConfig(layoutConfig), [layoutConfig]);
  const tracks = useMemo(
    () => [...config.tracks].sort((a, b) => a.order - b.order),
    [config.tracks]
  );

  const emit = (next: LayoutConfig) => onChange(normalizeLayoutConfig(next));

  const updateTrack = (trackId: string, patch: Partial<TrackConfig>) => {
    emit({
      ...config,
      tracks: config.tracks.map((track) => (
        track.id === trackId ? { ...track, ...patch } : track
      )),
    });
  };

  const addTrack = () => {
    const id = slugifyTrackId(newTrackId || newTrackName);
    if (!id || config.tracks.some((track) => track.id === id)) return;
    const maxOrder = config.tracks.reduce((max, track) => Math.max(max, Number(track.order) || 0), 0);
    emit({
      ...config,
      tracks: [
        ...config.tracks,
        {
          id,
          name: newTrackName.trim() || id,
          role: "custom" as TrackRole,
          order: maxOrder + 10,
          enabled: true,
          desktopWidth: 0.25,
          mobileBehavior: "inline",
        },
      ],
    });
    setNewTrackId("");
    setNewTrackName("");
  };

  const removeTrack = (trackId: string) => {
    if (config.tracks.length <= 1) return;
    const nextTracks = config.tracks.filter((track) => track.id !== trackId);
    const nextFallbackTrackId = config.fallbackTrackId === trackId
      ? nextTracks[0]?.id || config.fallbackTrackId
      : config.fallbackTrackId;
    emit({
      ...config,
      fallbackTrackId: nextFallbackTrackId,
      tracks: nextTracks,
      routingRules: [],
    });
  };

  return (
    <div className="space-y-3">
      {/* Track list */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {tracks.map((track) => (
          <div key={track.id} className="rounded-md border border-border/60 bg-background/70 p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-xs font-semibold">{track.id}</span>
              </div>
              <div className="flex items-center gap-1">
                {tracks.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeTrack(track.id)}
                    className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`${track.name} remove`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => updateTrack(track.id, { enabled: !track.enabled })}
                  className={cn(
                    "h-4 w-8 rounded-full border transition-colors",
                    track.enabled ? "border-primary/40 bg-primary" : "border-border bg-muted"
                  )}
                  aria-label={`${track.name} enabled`}
                >
                  <span
                    className={cn(
                      "block h-3 w-3 rounded-full bg-white shadow transition-transform",
                      track.enabled ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Input
                value={track.name}
                onChange={(event) => updateTrack(track.id, { name: event.target.value })}
                className="h-8 text-xs"
                aria-label={`${track.id} name`}
              />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">{t("appearance.trackWidthLabel")}</span>
                <Input
                  type="number"
                  min={0.1}
                  step={0.05}
                  value={track.desktopWidth ?? 1}
                  onChange={(event) => updateTrack(track.id, { desktopWidth: Number(event.target.value) || 1 })}
                  className="h-8 text-xs"
                  aria-label={`${track.id} width`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add track */}
      <div className="grid grid-cols-1 items-center gap-2 rounded-md border border-dashed border-border/70 bg-background/50 p-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_32px]">
        <Input
          value={newTrackId}
          onChange={(event) => setNewTrackId(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTrack(); } }}
          placeholder={t("appearance.trackIdPlaceholder")}
          className="h-8 text-xs"
        />
        <Input
          value={newTrackName}
          onChange={(event) => setNewTrackName(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTrack(); } }}
          placeholder={t("appearance.trackNamePlaceholder")}
          className="h-8 text-xs"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={addTrack}
          disabled={!slugifyTrackId(newTrackId || newTrackName) || tracks.some((track) => track.id === slugifyTrackId(newTrackId || newTrackName))}
          aria-label={t("appearance.addTrack")}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

    </div>
  );
}
