"use client";

/**
 * The wake-up transition mark: a slow-breathing geometric shape.
 * Deliberately silent and slow — the calm alternative to an alarm.
 */
export default function PulseMark({ size = 216 }: { size?: number }) {
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div className="pulse-glow absolute inset-0 overflow-hidden rounded-full" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="pulse-shape h-[54%] w-[54%] rounded-full border border-accent/30 bg-accent/15" />
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <div className="h-[13%] w-[13%] rounded-full bg-accent/80" />
      </div>
    </div>
  );
}