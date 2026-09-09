"use client";

import {
  Backpack,
  Check,
  DoorOpen,
  Medal,
  Shirt,
  Sunrise,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cls } from "@/lib/format";
import type { StepGlyph } from "@/lib/routines";

const ICONS: Record<StepGlyph, LucideIcon> = {
  wake: Sunrise,
  dress: Shirt,
  door: DoorOpen,
  badge: Medal,
  shirt: Shirt,
  backpack: Backpack,
};

export default function IconGlyph({
  glyph,
  completed = false,
}: {
  glyph: StepGlyph;
  completed?: boolean;
}) {
  // On completion the tile snaps to a check mark in the settled blue tone.
  const Icon = completed ? Check : ICONS[glyph];
  return (
    <div
      className={cls(
        "grid h-16 w-16 place-items-center rounded-2xl border transition-colors duration-500",
        completed
          ? "border-complete/50 bg-complete/15 text-complete"
          : "border-accent/40 bg-accent/10 text-accent",
      )}
    >
      <Icon className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}