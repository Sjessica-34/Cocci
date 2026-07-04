import { cn } from "@/lib/utils";

type RatingBarProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
  showLabel?: boolean;
};

const COLOR_BY_VALUE: Record<number, string> = {
  1: "bg-red-400",
  2: "bg-orange-400",
  3: "bg-amber-400",
  4: "bg-lime-400",
  5: "bg-emerald-500",
};

export function RatingBar({ value, onChange, size = "md", showLabel = true }: RatingBarProps) {
  const clampedValue = Math.min(5, Math.max(1, Math.round(value)));
  const barColor = COLOR_BY_VALUE[clampedValue] ?? "bg-muted";
  const interactive = !!onChange;

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            onClick={() => onChange?.(i)}
            className={cn(
              "rounded-sm transition-all duration-150",
              size === "sm" ? "h-1.5 w-5" : "h-2 w-7",
              i <= clampedValue ? barColor : "bg-muted",
              interactive && "cursor-pointer hover:opacity-70",
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs tabular-nums text-muted-foreground font-medium">
          {clampedValue}/5
        </span>
      )}
    </div>
  );
}

export function RatingBarInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{value}/5</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={cn(
              "flex-1 h-8 rounded-md text-sm font-semibold transition-all duration-150 border",
              i <= value
                ? "text-white border-transparent shadow-sm"
                : "bg-muted/50 border-border text-muted-foreground hover:bg-muted",
              i <= value && i === 1 && "bg-red-400",
              i <= value && i === 2 && "bg-orange-400",
              i <= value && i === 3 && "bg-amber-400",
              i <= value && i === 4 && "bg-lime-400",
              i <= value && i === 5 && "bg-emerald-500",
            )}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}
