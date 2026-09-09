"use client";

import { Volume2, VolumeX } from "lucide-react";
import { cls } from "@/lib/format";

/**
 * Prominent, always-visible sound control. Audio is optional and
 * entirely user-controlled; nothing ever autoplays before a gesture.
 */
export default function MuteButton({
  muted,
  onToggle,
}: {
  muted: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!muted}
      aria-label={muted ? "Turn sound on" : "Mute sound"}
      title={muted ? "Turn sound on" : "Mute sound"}
      className={cls(
        "inline-flex items-center gap-2 rounded-lg border border-line bg-panel-2/80 px-3 py-2 text-xs font-medium",
        "transition-colors hover:border-accent/50",
        muted ? "text-muted" : "text-accent",
      )}
    >
      {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
      {muted ? "Sound off" : "Sound on"}
    </button>
  );
}