import { cn } from "./cn";

export interface StepItem<T extends string> {
  id: T;
  label: string;
}

export function Stepper<T extends string>({
  steps,
  current,
  isEnabled,
  onSelect,
}: {
  steps: StepItem<T>[];
  current: T;
  isEnabled: (id: T) => boolean;
  onSelect: (id: T) => void;
}) {
  const currentIndex = steps.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Schritte">
      <ol className="flex flex-wrap items-center gap-1">
        {steps.map((step, i) => {
          const active = step.id === current;
          const done = i < currentIndex;
          const enabled = isEnabled(step.id);
          return (
            <li key={step.id} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden className={cn("h-px w-5 sm:w-8", done || active ? "bg-accent/50" : "bg-line")} />}
              <button
                type="button"
                disabled={!enabled}
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(step.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full p-1 sm:pr-3 text-[13px] font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  active ? "bg-accent-soft pr-3 text-accent" : "text-muted hover:text-ink",
                  "disabled:pointer-events-none disabled:opacity-40",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-[12px] tabular-nums",
                    active ? "bg-accent text-accent-ink" : done ? "bg-accent/15 text-accent" : "bg-surface border border-line",
                  )}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className={cn(!active && "sr-only sm:not-sr-only")}>{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
