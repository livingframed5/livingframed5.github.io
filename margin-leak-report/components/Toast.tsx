import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function Toast({
  toast,
}: {
  toast: { msg: string; tone: "success" | "danger" } | null;
}) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <div
        className={
          "flex items-center gap-2 rounded-xl border bg-white/95 px-4 py-2.5 text-[12px] font-medium shadow-2xl backdrop-blur " +
          (toast.tone === "danger"
            ? "border-rose-300 text-rose-700"
            : "border-emerald-300 text-emerald-700")
        }
      >
        {toast.tone === "danger" ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
        {toast.msg}
      </div>
    </div>
  );
}
