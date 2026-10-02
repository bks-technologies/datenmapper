import type { SelectHTMLAttributes } from "react";
import { cn } from "./cn";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  onValueChange: (value: string) => void;
}

export function Select({ options, placeholder, invalid, onValueChange, className, value, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border bg-surface pl-3 pr-8 text-sm",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
          invalid ? "border-danger/50 bg-danger-soft/50" : "border-line",
          !value && "text-muted",
          className,
        )}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.hint ? `${o.label}  ·  ${o.hint}` : o.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
      >
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
