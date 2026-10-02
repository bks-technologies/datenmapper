"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from "react";
import { applyMapping, emptyMapping, suggestMapping, type Edits, type Mapping } from "../mapping";
import type { ParsedData, SourceRow } from "../parse";
import { pushRecords, type LogEntry, type LogLevel, type PushSummary } from "../push-engine";
import { CUSTOMER_SCHEMA, type TargetSchema } from "../schema";
import { validateRecords, type ValidationReport } from "../validate";

export type Step = "upload" | "mapping" | "review" | "push";
export const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Import" },
  { id: "mapping", label: "Zuordnung" },
  { id: "review", label: "Prüfung" },
  { id: "push", label: "Einspeisen" },
];

export interface SourceFile {
  name: string;
  size: number;
  format: ParsedData["format"];
  delimiter?: string;
  warnings: string[];
}

export interface PushState {
  status: "idle" | "running" | "done";
  done: number;
  total: number;
  log: LogEntry[];
  summary: PushSummary | null;
}

export interface MapperState {
  step: Step;
  file: SourceFile | null;
  columns: string[];
  rows: SourceRow[];
  mapping: Mapping;
  edits: Edits;
  simulateOutage: boolean;
  push: PushState;
}

type Action =
  | { type: "load"; file: SourceFile; data: ParsedData; mapping: Mapping }
  | { type: "goTo"; step: Step }
  | { type: "setMapping"; field: string; column: string | null }
  | { type: "replaceMapping"; mapping: Mapping }
  | { type: "editCell"; row: number; field: string; value: string }
  | { type: "setSimulateOutage"; value: boolean }
  | { type: "pushStart" }
  | { type: "pushLog"; entry: LogEntry }
  | { type: "pushProgress"; done: number; total: number }
  | { type: "pushDone"; summary: PushSummary }
  | { type: "reset"; schema: TargetSchema };

const idlePush: PushState = { status: "idle", done: 0, total: 0, log: [], summary: null };

function initialState(schema: TargetSchema): MapperState {
  return {
    step: "upload",
    file: null,
    columns: [],
    rows: [],
    mapping: emptyMapping(schema.fields),
    edits: {},
    simulateOutage: false,
    push: idlePush,
  };
}

function reducer(state: MapperState, action: Action): MapperState {
  switch (action.type) {
    case "load":
      return {
        ...state,
        step: "mapping",
        file: action.file,
        columns: action.data.columns,
        rows: action.data.rows,
        mapping: action.mapping,
        edits: {},
        push: idlePush,
      };
    case "goTo":
      return { ...state, step: action.step };
    case "setMapping":
      return { ...state, mapping: { ...state.mapping, [action.field]: action.column }, push: idlePush };
    case "replaceMapping":
      return { ...state, mapping: action.mapping, push: idlePush };
    case "editCell":
      return {
        ...state,
        edits: { ...state.edits, [action.row]: { ...state.edits[action.row], [action.field]: action.value } },
        push: idlePush,
      };
    case "setSimulateOutage":
      return { ...state, simulateOutage: action.value };
    case "pushStart":
      return { ...state, push: { ...idlePush, status: "running" } };
    case "pushLog":
      return { ...state, push: { ...state.push, log: [...state.push.log, action.entry] } };
    case "pushProgress":
      return { ...state, push: { ...state.push, done: action.done, total: action.total } };
    case "pushDone":
      return { ...state, push: { ...state.push, status: "done", summary: action.summary } };
    case "reset":
      return initialState(action.schema);
  }
}

interface MapperContextValue {
  state: MapperState;
  schema: TargetSchema;
  report: ValidationReport;
  /** Pflichtfelder ohne Quellspalte. */
  missingRequired: string[];
  load: (file: SourceFile, data: ParsedData) => void;
  goTo: (step: Step) => void;
  setMapping: (field: string, column: string | null) => void;
  autoMap: () => void;
  clearMapping: () => void;
  editCell: (row: number, field: string, value: string) => void;
  setSimulateOutage: (value: boolean) => void;
  startPush: () => Promise<void>;
  abortPush: () => void;
  reset: () => void;
}

const MapperContext = createContext<MapperContextValue | null>(null);

export function MapperProvider({ children, schema = CUSTOMER_SCHEMA }: { children: ReactNode; schema?: TargetSchema }) {
  const [state, dispatch] = useReducer(reducer, schema, initialState);
  const abortRef = useRef<AbortController | null>(null);

  const records = useMemo(
    () => applyMapping(state.rows, state.mapping, schema.fields, state.edits),
    [state.rows, state.mapping, state.edits, schema.fields],
  );
  const report = useMemo(() => validateRecords(records, schema.fields), [records, schema.fields]);
  const missingRequired = useMemo(
    () => schema.fields.filter((f) => f.required && !state.mapping[f.key]).map((f) => f.key),
    [schema.fields, state.mapping],
  );

  const load = useCallback(
    (file: SourceFile, data: ParsedData) =>
      dispatch({ type: "load", file, data, mapping: suggestMapping(data.columns, schema.fields) }),
    [schema.fields],
  );

  const startPush = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "pushStart" });
    const log = (level: LogLevel, message: string) => dispatch({ type: "pushLog", entry: { at: Date.now(), level, message } });

    const summary = await pushRecords({
      schema,
      rows: report.rows,
      simulateOutage: state.simulateOutage,
      signal: controller.signal,
      onLog: log,
      onProgress: (done, total) => dispatch({ type: "pushProgress", done, total }),
    });
    log(
      summary.rejected ? "warn" : "success",
      `${summary.processed} Einträge verarbeitet, ${summary.accepted} übernommen, ${summary.rejected} Fehler.`,
    );
    dispatch({ type: "pushDone", summary });
  }, [report.rows, schema, state.simulateOutage]);

  const value: MapperContextValue = {
    state,
    schema,
    report,
    missingRequired,
    load,
    goTo: (step) => dispatch({ type: "goTo", step }),
    setMapping: (field, column) => dispatch({ type: "setMapping", field, column }),
    autoMap: () => dispatch({ type: "replaceMapping", mapping: suggestMapping(state.columns, schema.fields) }),
    clearMapping: () => dispatch({ type: "replaceMapping", mapping: emptyMapping(schema.fields) }),
    editCell: (row, field, v) => dispatch({ type: "editCell", row, field, value: v }),
    setSimulateOutage: (v) => dispatch({ type: "setSimulateOutage", value: v }),
    startPush,
    abortPush: () => abortRef.current?.abort(),
    reset: () => {
      abortRef.current?.abort();
      dispatch({ type: "reset", schema });
    },
  };

  return <MapperContext.Provider value={value}>{children}</MapperContext.Provider>;
}

export function useMapper() {
  const ctx = useContext(MapperContext);
  if (!ctx) throw new Error("useMapper außerhalb von <MapperProvider>");
  return ctx;
}
