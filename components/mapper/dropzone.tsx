"use client";

import { useRef, useState, type DragEvent } from "react";
import { MAX_FILE_BYTES, ParseError, parseText } from "@/lib/parse";
import { useMapper } from "@/lib/state/mapper-store";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";

const SAMPLES = [
  { file: "beispiel-kunden.csv", label: "Beispiel-CSV" },
  { file: "beispiel-kunden.json", label: "Beispiel-JSON" },
];

export function Dropzone() {
  const { load } = useMapper();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ingest(name: string, size: number, read: () => Promise<string>) {
    setError(null);
    if (!/\.(csv|txt|tsv|json)$/i.test(name)) return setError("Nur CSV- oder JSON-Dateien (.csv, .tsv, .txt, .json).");
    if (size > MAX_FILE_BYTES) return setError("Die Datei ist größer als 10 MB.");
    setBusy(true);
    try {
      const data = parseText(name, await read());
      load({ name, size, format: data.format, delimiter: data.delimiter, warnings: data.warnings }, data);
    } catch (e) {
      setError(e instanceof ParseError ? e.message : `Datei konnte nicht gelesen werden: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) void ingest(file.name, file.size, () => file.text());
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  async function loadSample(file: string) {
    const res = await fetch(`/${file}`);
    const text = await res.text();
    void ingest(file, text.length, async () => text);
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Datei auswählen oder hierher ziehen"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "grid cursor-pointer place-items-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          dragging ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/40 hover:bg-surface-2",
        )}
      >
        <div className="max-w-sm">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-accent-soft text-accent">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold">{busy ? "Wird gelesen …" : dragging ? "Loslassen zum Importieren" : "CSV- oder JSON-Datei hierher ziehen"}</p>
          <p className="mt-1 text-[13px] text-muted">
            oder klicken zum Auswählen. Trennzeichen (; , Tab |) wird erkannt, bis 10 MB. Die Datei bleibt im Browser.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.txt,.json,text/csv,application/json"
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <span>Keine Datei zur Hand?</span>
        {SAMPLES.map((s) => (
          <Button key={s.file} variant="secondary" size="sm" onClick={() => void loadSample(s.file)}>
            {s.label} laden
          </Button>
        ))}
      </div>
    </div>
  );
}
