"use client";

import { useMemo, useState } from "react";
import { useMapper } from "@/lib/state/mapper-store";
import type { CellIssue } from "@/lib/validate";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { cn } from "../ui/cn";
import { Stat } from "../ui/stat";

const PAGE_SIZE = 25;

export function PreviewTable() {
  const { state, schema, report, editCell, goTo } = useMapper();
  const [onlyErrors, setOnlyErrors] = useState(report.invalidCount > 0);
  const [fieldFilter, setFieldFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const fields = schema.fields.filter((f) => state.mapping[f.key] || report.issuesByField[f.key]);

  const visible = useMemo(
    () =>
      report.rows.filter((r) => {
        if (fieldFilter) return r.issues.some((i) => i.field === fieldFilter);
        return !onlyErrors || r.issues.length > 0;
      }),
    [report.rows, onlyErrors, fieldFilter],
  );
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const slice = visible.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  const fieldsWithIssues = schema.fields.filter((f) => report.issuesByField[f.key]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Einträge" value={report.rows.length} />
        <Stat label="Gültig" value={report.validCount} tone="ok" />
        <Stat label="Fehlerhaft" value={report.invalidCount} tone={report.invalidCount ? "danger" : "neutral"} />
        <Stat label="Probleme gesamt" value={report.issueCount} tone={report.issueCount ? "danger" : "neutral"} sub="eine Zeile kann mehrere haben" />
      </div>

      <Card
        title="Vorschau der Zieldaten"
        description="Rot markierte Zellen verletzen das Schema. Klick auf eine rote Zelle, um den Wert zu korrigieren."
        actions={
          <div className="flex rounded-lg border border-line p-0.5 text-[13px]">
            {[
              { v: false, label: `Alle (${report.rows.length})` },
              { v: true, label: `Nur Fehler (${report.invalidCount})` },
            ].map((o) => (
              <button
                key={String(o.v)}
                type="button"
                onClick={() => {
                  setOnlyErrors(o.v);
                  setFieldFilter(null);
                  setPage(0);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium",
                  onlyErrors === o.v && !fieldFilter ? "bg-accent-soft text-accent" : "text-muted hover:text-ink",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        }
        flush
      >
        {fieldsWithIssues.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-5 py-3 text-[12px]">
            <span className="mr-1 text-muted">Fehler je Feld:</span>
            {fieldsWithIssues.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFieldFilter(fieldFilter === f.key ? null : f.key);
                  setPage(0);
                }}
                className={cn(
                  "rounded-md border px-2 py-0.5 font-mono",
                  fieldFilter === f.key ? "border-danger bg-danger text-white" : "border-danger/25 bg-danger-soft text-danger hover:border-danger/50",
                )}
              >
                {f.key} · {report.issuesByField[f.key]}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-surface-2">
              <tr className="border-b border-line text-left">
                <th className="sticky left-0 z-10 bg-surface-2 px-4 py-2 font-medium text-muted">Zeile</th>
                {fields.map((f) => (
                  <th key={f.key} className="whitespace-nowrap px-3 py-2 font-mono text-[12px] font-medium">
                    {f.key}
                    {f.required && <span className="text-danger">*</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((r) => {
                const invalid = r.issues.length > 0;
                return (
                  <tr key={r.index} className={cn("border-b border-line last:border-0", invalid && "bg-danger-soft/30")}>
                    <td className={cn("sticky left-0 z-10 whitespace-nowrap px-4 py-2 tabular-nums text-muted", invalid ? "bg-danger-soft" : "bg-surface")}>
                      <span className="flex items-center gap-2">
                        <span aria-hidden className={cn("size-1.5 rounded-full", invalid ? "bg-danger" : "bg-ok")} />
                        {r.index + 1}
                      </span>
                      {invalid && (
                        <span className="mt-0.5 block font-mono text-[10px] leading-tight text-danger">
                          {[...new Set(r.issues.map((i) => i.field))].join(", ")}
                        </span>
                      )}
                    </td>
                    {fields.map((f) => (
                      <Cell
                        key={f.key}
                        value={r.record[f.key]}
                        issues={r.issues.filter((i) => i.field === f.key)}
                        edited={state.edits[r.index]?.[f.key] !== undefined}
                        onCommit={(v) => editCell(r.index, f.key, v)}
                      />
                    ))}
                  </tr>
                );
              })}
              {slice.length === 0 && (
                <tr>
                  <td colSpan={fields.length + 1} className="px-5 py-10 text-center text-muted">
                    Keine fehlerhaften Zeilen. Alles bereit zum Einspeisen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-[13px] text-muted">
          <span className="tabular-nums">
            {visible.length ? `${current * PAGE_SIZE + 1}–${Math.min((current + 1) * PAGE_SIZE, visible.length)} von ${visible.length}` : "0 Zeilen"}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
              Zurück
            </Button>
            <span className="px-2 tabular-nums">
              {current + 1} / {pages}
            </span>
            <Button variant="ghost" size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
              Weiter
            </Button>
          </div>
        </footer>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => goTo("mapping")}>
          Zuordnung ändern
        </Button>
        <div className="flex items-center gap-3">
          {report.invalidCount > 0 && (
            <span className="text-[13px] text-muted">{report.invalidCount} fehlerhafte Zeile(n) werden nicht gesendet.</span>
          )}
          <Button size="lg" disabled={report.validCount === 0} onClick={() => goTo("push")}>
            Weiter zum Einspeisen
          </Button>
        </div>
      </div>
    </div>
  );
}

function Cell({
  value,
  issues,
  edited,
  onCommit,
}: {
  value: string;
  issues: CellIssue[];
  edited: boolean;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const invalid = issues.length > 0;
  const message = issues.map((i) => i.message).join(" · ");

  if (editing) {
    return (
      <td className="px-1.5 py-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== value) onCommit(draft);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          className="h-8 w-full min-w-32 rounded-md border border-accent bg-surface px-2 font-mono text-[12px] outline-none"
        />
      </td>
    );
  }

  return (
    <td className={cn("max-w-64 px-3 py-2 align-top", invalid && "min-w-48 bg-danger-soft")}>
      {invalid ? (
        <button
          type="button"
          title={`${message} · klicken zum Korrigieren`}
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          className="block w-full text-left"
        >
          <span className={cn("block truncate font-medium text-danger", !value && "italic")}>{value || "leer"}</span>
          <span className="block text-[11px] leading-snug text-danger/80">{message}</span>
        </button>
      ) : (
        <span className="flex items-center gap-1.5">
          <span className="truncate">{value || <span className="text-muted/60">–</span>}</span>
          {edited && <Badge tone="accent">korrigiert</Badge>}
        </span>
      )}
    </td>
  );
}
