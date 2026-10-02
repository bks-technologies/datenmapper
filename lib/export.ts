export function toCsv(columns: string[], rows: Record<string, unknown>[], delimiter = ";"): string {
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /["\n\r;,]/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map(esc).join(delimiter), ...rows.map((r) => columns.map((c) => esc(r[c])).join(delimiter))];
  // BOM, damit Excel Umlaute richtig liest.
  return "﻿" + lines.join("\r\n");
}

export function download(fileName: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function baseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}
