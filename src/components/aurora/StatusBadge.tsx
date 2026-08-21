import { statusTone } from "@/lib/cases";
import { cn } from "@/lib/utils";

const toneClasses: Record<string, string> = {
  gold: "border-gold/40 bg-gold/10 text-gold",
  teal: "border-teal/40 bg-teal/10 text-teal",
  urgent: "border-urgent/50 bg-urgent/15 text-urgent",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em]",
        toneClasses[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
