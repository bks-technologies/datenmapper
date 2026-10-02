"use client";

import { useEffect, useRef } from "react";
import type { LogEntry, LogLevel } from "@/lib/push-engine";
import { cn } from "../ui/cn";

const levelStyle: Record<LogLevel, { tag: string; className: string }> = {
  info: { tag: "INFO", className: "text-slate-400" },
  success: { tag: " OK ", className: "text-emerald-400" },
  warn: { tag: "WARN", className: "text-amber-400" },
  error: { tag: "FEHL", className: "text-red-400" },
};

export function ProtocolLog({ entries, running }: { entries: LogEntry[]; running: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  // Block statt Ausdruck: scrollIntoView liefert in neueren Browsern ein Promise, React hielte es für ein Cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [entries.length]);

  return (
    <div
      role="log"
      aria-live="polite"
      className="max-h-72 overflow-y-auto rounded-xl bg-[#0f172a] p-4 font-mono text-[12px] leading-relaxed text-slate-200"
    >
      {entries.length === 0 && <p className="text-slate-500">Noch keine Übertragung.</p>}
      {entries.map((e, i) => (
        <div key={i} className="flex gap-3">
          <span className="shrink-0 tabular-nums text-slate-500">{new Date(e.at).toLocaleTimeString("de-DE")}</span>
          <span className={cn("shrink-0 whitespace-pre font-semibold", levelStyle[e.level].className)}>{levelStyle[e.level].tag}</span>
          <span className="min-w-0 break-words">{e.message}</span>
        </div>
      ))}
      {running && <div className="mt-1 animate-pulse text-slate-500">▍</div>}
      <div ref={endRef} />
    </div>
  );
}
