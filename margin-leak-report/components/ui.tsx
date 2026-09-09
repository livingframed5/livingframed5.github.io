import type { ReactNode, ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export function Icon({ icon: I, size = 14, className }: { icon: LucideIcon; size?: number; className?: string }) {
  const Comp = I as ComponentType<{ size?: number; className?: string }>;
  return <Comp size={size} className={className} />;
}

export function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 " + className
      }
    >
      {children}
    </span>
  );
}
