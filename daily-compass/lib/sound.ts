/**
 * Sensory-safe audio: purely synthesized, clean, neutral chimes.
 * No samples, no ASMR, no buzzers. Two soft sine/triangle tones.
 * Audio only ever plays after a user gesture and respects the mute flag.
 */
"use client";

export type ChimeKind = "advance" | "complete" | "done";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

export function setMuted(value: boolean) {
  muted = value;
  if (ctx && master) {
    master.gain.setTargetAtTime(value ? 0 : 1, ctx.currentTime, 0.02);
  }
}

export function isMuted() {
  return muted;
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, volume: number) {
  if (!ctx || !master) return;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);

  const warm = ctx.createOscillator();
  warm.type = "triangle";
  warm.frequency.setValueAtTime(freq, start);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  const warmGain = ctx.createGain();
  warmGain.gain.setValueAtTime(0.0001, start);
  warmGain.gain.exponentialRampToValueAtTime(volume * 0.22, start + 0.03);
  warmGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain).connect(master);
  warm.connect(warmGain).connect(master);

  osc.start(start);
  osc.stop(start + duration + 0.08);
  warm.start(start);
  warm.stop(start + duration + 0.08);
}

export function playChime(kind: ChimeKind = "complete") {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t = c.currentTime + 0.02;

  if (kind === "advance") {
    // Single soft note for stepping into the first task.
    tone(523.25, t, 0.4, 0.06); // C5
  } else if (kind === "complete") {
    // Gentle rising interval for a completed step.
    tone(659.25, t, 0.45, 0.09); // E5
    tone(880, t + 0.24, 0.7, 0.085); // A5
  } else {
    // Slow three-note settle for the final step of a routine.
    tone(523.25, t, 0.45, 0.085); // C5
    tone(659.25, t + 0.2, 0.55, 0.085); // E5
    tone(783.99, t + 0.4, 0.9, 0.075); // G5
  }
}

function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === "suspended") void c.resume();
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlockAudio, { passive: true, once: true });
  window.addEventListener("keydown", unlockAudio, { passive: true, once: true });
}