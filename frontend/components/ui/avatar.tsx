import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  email,
  size = "md",
  className,
}: {
  name?: string | null;
  email?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const display = name || email || "?";
  const [first, last] = (name || email || "?").split(" ");

  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
  };

  const gradient = pickGradient(display);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        sizes[size],
        gradient,
        className,
      )}
      title={display}
    >
      {initials(first, last)}
    </span>
  );
}

function pickGradient(seed: string) {
  const palettes = [
    "bg-gradient-to-br from-indigo-500 to-violet-600",
    "bg-gradient-to-br from-emerald-500 to-teal-600",
    "bg-gradient-to-br from-rose-500 to-pink-600",
    "bg-gradient-to-br from-amber-500 to-orange-600",
    "bg-gradient-to-br from-sky-500 to-blue-600",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return palettes[hash % palettes.length];
}