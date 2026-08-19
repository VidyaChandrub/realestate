import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  tone = "indigo",
}: {
  value: number;
  className?: string;
  tone?: "indigo" | "emerald" | "amber" | "red";
}) {
  const tones = {
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ProgressLabel({ value }: { value: number }) {
  return (
    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
      {value}%
    </span>
  );
}