"use client";

import { useMemo } from "react";
import { useMapper } from "@/lib/state/mapper-store";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Select } from "../ui/select";

export function MappingPanel() {
  const { state, schema, report, missingRequired, setMapping, autoMap, clearMapping, goTo } = useMapper();
  const { columns, rows, mapping } = state;

  const usedColumns = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of Object.values(mapping)) if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    return counts;
  }, [mapping]);

  const unmapped = columns.filter((c) => !usedColumns.has(c));
  const options = columns.map((c) => ({ value: c, label: c, hint: sample(rows, c) }));
  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <Card
        title="Felder zuordnen"
        description={`${mappedCount} von ${schema.fields.length} Zielfeldern belegt. Vorschlag nach Spaltennamen, jede Zuordnung lässt sich ändern.`}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={clearMapping}>Leeren</Button>
            <Button variant="secondary" size="sm" onClick={autoMap}>Automatisch zuordnen</Button>
          </>
        }
        flush
      >
        <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_88px] gap-4 border-b border-line px-5 py-2.5 text-[12px] font-medium text-muted md:grid">
          <span>Zielfeld (API)</span>
          <span>Erwartet</span>
          <span>Quellspalte</span>
          <span className="text-right">Prüfung</span>
        </div>
        <ul>
          {schema.fields.map((f) => {
            const column = mapping[f.key];
            const missing = f.required && !column;
            const errors = report.issuesByField[f.key] ?? 0;
            const shared = column && (usedColumns.get(column) ?? 0) > 1;
            return (
              <li
                key={f.key}
                className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-b border-line px-5 py-3 last:border-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_88px] md:items-start"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-[13px] font-medium">{f.key}</code>
                    {f.required && <Badge tone={missing ? "danger" : "neutral"}>Pflicht</Badge>}
                    {f.unique && <Badge>eindeutig</Badge>}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {f.label}
                    <span className="md:hidden"> · {f.hint}</span>
                  </div>
                </div>
                <div className="hidden pt-0.5 text-[12px] text-muted md:block">{f.hint}</div>
                <div className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
                  <Select
                    aria-label={`Quellspalte für ${f.key}`}
                    value={column ?? ""}
                    placeholder="Nicht zuordnen"
                    options={options}
                    invalid={missing}
                    onValueChange={(v) => setMapping(f.key, v || null)}
                  />
                  {shared && <p className="mt-1 text-[12px] text-warn">Diese Spalte ist mehreren Feldern zugeordnet.</p>}
                </div>
                <div className="col-start-2 row-start-1 text-right md:col-start-auto md:row-start-auto md:pt-0.5">
                  {missing ? (
                    <Badge tone="danger">fehlt</Badge>
                  ) : !column ? (
                    <Badge>leer</Badge>
                  ) : errors ? (
                    <Badge tone="danger">{errors} Fehler</Badge>
                  ) : (
                    <Badge tone="ok">ok</Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h3 className="text-[13px] font-medium text-muted">
            {unmapped.length ? `${unmapped.length} Quellspalte(n) werden nicht übertragen` : "Alle Quellspalten sind zugeordnet"}
          </h3>
          {unmapped.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {unmapped.map((c) => (
                <li key={c} className="rounded-md border border-line bg-surface px-2 py-1 font-mono text-[12px] text-muted">
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          {missingRequired.length > 0 && (
            <p className="text-[13px] text-danger">Pflichtfeld ohne Quelle: {missingRequired.join(", ")}</p>
          )}
          <Button size="lg" disabled={missingRequired.length > 0} onClick={() => goTo("review")}>
            Weiter zur Prüfung
          </Button>
        </div>
      </div>
    </div>
  );
}

function sample(rows: Record<string, string>[], column: string) {
  const values: string[] = [];
  for (const r of rows) {
    const v = r[column]?.trim();
    if (v && !values.includes(v)) values.push(v);
    if (values.length === 2) break;
  }
  const text = values.join(", ");
  return text.length > 36 ? text.slice(0, 35) + "…" : text || "leer";
}
