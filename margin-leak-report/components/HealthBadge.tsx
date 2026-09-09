import type { Health, ChangeOrderStatus } from "@/lib/types";
import { HEALTH_META, CO_STATUS_META } from "@/lib/constants";

export function HealthBadge({ health, pulse }: { health: Health; pulse?: boolean }) {
  const m = HEALTH_META[health];
  return (
    <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 " + m.chip}>
      <span className={"h-1.5 w-1.5 rounded-full " + m.dot + (pulse ? " animate-pulse" : "")} />
      {m.label}
    </span>
  );
}

export function CoStatusPill({ status }: { status: ChangeOrderStatus }) {
  const m = CO_STATUS_META[status];
  return (
    <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 " + m.chip}>
      {m.label}
    </span>
  );
}
