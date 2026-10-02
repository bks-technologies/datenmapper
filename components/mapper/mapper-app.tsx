"use client";

import { useEffect } from "react";
import { STEPS, useMapper, type Step } from "@/lib/state/mapper-store";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Stepper } from "../ui/stepper";
import { SiteFooter } from "../site-footer";
import { Dropzone } from "./dropzone";
import { MappingPanel } from "./mapping-panel";
import { PreviewTable } from "./preview-table";
import { PushPanel } from "./push-panel";

export function MapperApp() {
  const { state, schema, missingRequired, report, goTo, reset } = useMapper();
  const { step, file } = state;

  // Neuer Schritt beginnt oben; sonst bleibt die Seite dort, wo der Weiter-Knopf war.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const isEnabled = (id: Step) => {
    if (id === "upload") return true;
    if (!file) return false;
    if (id === "mapping") return true;
    if (missingRequired.length) return false;
    return id === "review" || report.validCount > 0;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            Datenmapper <Badge tone="accent">Demo</Badge>
          </h1>
          <p className="text-[13px] text-muted">CSV oder JSON einlesen, dem Schema der {schema.name} zuordnen, prüfen, einspeisen.</p>
        </div>
        <Stepper steps={STEPS} current={step} isEnabled={isEnabled} onSelect={goTo} />
      </header>

      {file && (
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px]">
          <span className="font-medium">{file.name}</span>
          <Badge>{file.format.toUpperCase()}</Badge>
          {file.delimiter && <Badge>Trennzeichen {file.delimiter === "\t" ? "Tab" : file.delimiter}</Badge>}
          <span className="text-muted">
            {state.rows.length} Zeilen · {state.columns.length} Spalten · {formatBytes(file.size)}
          </span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>
            Andere Datei
          </Button>
          {file.warnings.map((w) => (
            <p key={w} className="w-full text-[12px] text-warn">{w}</p>
          ))}
        </div>
      )}

      <main className="mt-6">
        {step === "upload" && (
          <Card title="Datei importieren" description="Die erste Zeile einer CSV gilt als Kopfzeile. JSON: Array von Objekten, verschachtelte Felder werden zu Punkt-Pfaden.">
            <Dropzone />
          </Card>
        )}
        {step === "mapping" && <MappingPanel />}
        {step === "review" && <PreviewTable />}
        {step === "push" && <PushPanel />}
      </main>

      <SiteFooter />
    </div>
  );
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 })} KB`;
  return `${(n / 1024 / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
}
