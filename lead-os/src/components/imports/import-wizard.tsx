"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { Badge, Button, Card, CardHeader, Select, cn } from "@/components/ui";
import { useToast } from "@/components/toast";
import { IMPORT_TARGETS, detectMapping, type ImportTargetKey } from "@/lib/import-mapping";
import { analyzeImportAction, executeImportAction, type AnalyzedRow, type ImportReport } from "@/server/actions/imports";

type Step = "upload" | "map" | "review" | "report";

export function ImportWizard() {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<Record<string, ImportTargetKey>>({});
  const [analysis, setAnalysis] = useState<AnalyzedRow[] | null>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<"skip" | "fill_empty" | "create_anyway">("fill_empty");
  const [defaultWarmth, setDefaultWarmth] = useState<"warm" | "cold">("warm");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const onFile = (file: File) => {
    setParseError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const data = result.data.filter((r) => Object.values(r).some((v) => String(v ?? "").trim() !== ""));
        if (data.length === 0) {
          setParseError("The file parsed but contained no data rows.");
          return;
        }
        if (data.length > 500) {
          setParseError(`This file has ${data.length} rows — the importer handles up to 500 at a time. Split the file and run twice.`);
          return;
        }
        const hdrs = result.meta.fields ?? Object.keys(data[0] ?? {});
        setFilename(file.name);
        setHeaders(hdrs);
        setRows(data as Array<Record<string, string>>);
        setMapping(detectMapping(hdrs));
        setStep("map");
      },
      error: (err) => setParseError(`Couldn't parse the file: ${err.message}`),
    });
  };

  const mappedNameCol = useMemo(() => Object.entries(mapping).find(([, t]) => t === "fullName")?.[0], [mapping]);

  const runAnalysis = () =>
    startTransition(async () => {
      const res = await analyzeImportAction({ rows, mapping });
      if (res.ok) {
        setAnalysis(res.rows);
        setStep("review");
      } else {
        toast(res.error, "error");
      }
    });

  const runImport = () =>
    startTransition(async () => {
      const res = await executeImportAction({ rows, mapping, filename, duplicatePolicy, defaultWarmth });
      if (res.ok) {
        setReport(res.report);
        setStep("report");
        toast(`Import complete — ${res.report.created} lead${res.report.created === 1 ? "" : "s"} created.`);
      } else {
        toast(res.error, "error");
      }
    });

  const stepIndex = { upload: 0, map: 1, review: 2, report: 3 }[step];

  return (
    <div>
      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-2" aria-label="Import steps">
        {["Upload", "Map columns", "Review duplicates", "Report"].map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold",
                i < stepIndex && "border-success/50 bg-success-soft text-success",
                i === stepIndex && "border-accent bg-accent text-white",
                i > stepIndex && "border-line-strong text-dim",
              )}
            >
              {i < stepIndex ? "✓" : i + 1}
            </span>
            <span className={cn("text-[12.5px]", i === stepIndex ? "font-semibold text-text" : "text-dim")}>{label}</span>
            {i < 3 ? <span className="mx-1 h-px w-6 bg-line-strong" /> : null}
          </li>
        ))}
      </ol>

      {step === "upload" ? (
        <Card>
          <div className="flex flex-col items-center px-6 py-14">
            <FileSpreadsheet className="h-10 w-10 text-dim" />
            <h2 className="mt-4 font-display text-[16px] font-semibold text-text">Choose your warm-list CSV</h2>
            <p className="mt-1.5 max-w-md text-center text-[12.5px] leading-relaxed text-muted">
              Expected columns like: Name, Business / Role, Source, Reach Via, Contact, How I Know Them, Last
              Interaction, Priority, Status, Next Action, Follow-up Date, Notes. Other layouts work too — you map
              columns next. Exporting from Excel/Sheets: File → Download → CSV.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
            <Button variant="primary" size="md" className="mt-5" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Select CSV file
            </Button>
            <a href="/warm-list-template.csv" download className="mt-3 text-[12px] text-accent-bright hover:underline">
              Download a template CSV
            </a>
            {parseError ? (
              <p role="alert" className="mt-4 flex items-center gap-2 rounded-(--radius-control) border border-danger/30 bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
                <AlertTriangle className="h-4 w-4" /> {parseError}
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {step === "map" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={`Map columns — ${filename}`}
              subtitle={`${rows.length} rows detected. Auto-mapping has taken a first pass; correct anything it got wrong.`}
            />
            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {headers.map((h) => (
                <div key={h} className="rounded-(--radius-control) border border-line bg-raised/50 p-3">
                  <p className="truncate text-[12px] font-semibold text-text" title={h}>
                    {h}
                  </p>
                  <p className="mt-0.5 mb-2 truncate text-[11px] text-dim" title={rows[0]?.[h] ?? ""}>
                    e.g. “{rows[0]?.[h] || "—"}”
                  </p>
                  <Select
                    aria-label={`Map column ${h}`}
                    className="h-8 text-[12px]"
                    value={mapping[h] ?? "ignore"}
                    onChange={(e) => setMapping({ ...mapping, [h]: e.target.value as ImportTargetKey })}
                  >
                    {IMPORT_TARGETS.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
            {!mappedNameCol ? (
              <p className="border-t border-warn/30 bg-warn-soft px-5 py-2.5 text-[12.5px] text-warn">
                Map one column to <strong>Full name</strong> — it&apos;s the only required field.
              </p>
            ) : null}
          </Card>

          <Card>
            <CardHeader title="Preview (first 5 rows, as they'll be interpreted)" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left">
                <thead>
                  <tr className="border-b border-line text-[10.5px] tracking-wider text-dim uppercase">
                    <th className="px-4 py-2">#</th>
                    {headers.map((h) => (
                      <th key={h} className={cn("px-4 py-2 font-semibold", mapping[h] === "ignore" && "opacity-40")}>
                        {mapping[h] === "ignore" ? `${h} (ignored)` : IMPORT_TARGETS.find((t) => t.key === mapping[h])?.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b border-line/50 last:border-0">
                      <td className="px-4 py-2 text-[11px] text-dim">{i + 1}</td>
                      {headers.map((h) => (
                        <td key={h} className={cn("max-w-48 truncate px-4 py-2 text-[12px] text-muted", mapping[h] === "ignore" && "opacity-40")}>
                          {r[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button onClick={() => setStep("upload")}>← Back</Button>
            <Button variant="primary" size="md" disabled={!mappedNameCol || pending} onClick={runAnalysis}>
              {pending ? "Checking for duplicates…" : "Check duplicates →"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "review" && analysis ? (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Duplicate & problem check"
              subtitle={`${analysis.filter((a) => a.duplicates.length > 0).length} possible duplicates, ${analysis.filter((a) => a.problems.length > 0).length} rows with problems, ${analysis.filter((a) => a.suppressed).length} suppressed.`}
            />
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-line text-[10.5px] tracking-wider text-dim uppercase">
                    <th className="px-4 py-2 font-semibold">#</th>
                    <th className="px-4 py-2 font-semibold">Name</th>
                    <th className="px-4 py-2 font-semibold">Role / company</th>
                    <th className="px-4 py-2 font-semibold">Check result</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.map((a) => (
                    <tr key={a.rowNum} className="border-b border-line/50 last:border-0">
                      <td className="px-4 py-2 text-[11px] text-dim">{a.rowNum}</td>
                      <td className="px-4 py-2 text-[12.5px] text-text">{a.fullName ?? <span className="text-danger">missing</span>}</td>
                      <td className="max-w-52 truncate px-4 py-2 text-[12px] text-muted">
                        {[a.jobTitle, a.companyName].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {a.suppressed ? (
                          <Badge tone="red">Suppressed — will be skipped</Badge>
                        ) : a.duplicates.length > 0 ? (
                          <span className="flex flex-wrap items-center gap-1">
                            <Badge tone="amber">Possible duplicate</Badge>
                            <span className="text-[11.5px] text-muted">
                              matches{" "}
                              <Link href={`/leads/${a.duplicates[0]!.leadId}`} target="_blank" className="text-accent-bright hover:underline">
                                {a.duplicates[0]!.fullName}
                              </Link>{" "}
                              on {a.duplicates[0]!.matchedOn}
                            </span>
                          </span>
                        ) : a.problems.length > 0 ? (
                          <span className="text-[11.5px] text-warn">{a.problems.join("; ")}</span>
                        ) : (
                          <Badge tone="green">Ready</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Import options" />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-muted">When a row matches an existing lead</span>
                <Select value={duplicatePolicy} onChange={(e) => setDuplicatePolicy(e.target.value as never)}>
                  <option value="fill_empty">Fill empty fields only — never overwrite existing data (recommended)</option>
                  <option value="skip">Skip the row entirely</option>
                  <option value="create_anyway">Create a new record anyway (flagged as possible duplicate)</option>
                </Select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-muted">Default warmth for imported leads</span>
                <Select value={defaultWarmth} onChange={(e) => setDefaultWarmth(e.target.value as never)}>
                  <option value="warm">Warm — this is my warm list</option>
                  <option value="cold">Cold</option>
                </Select>
              </label>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button onClick={() => setStep("map")}>← Back to mapping</Button>
            <Button variant="primary" size="md" disabled={pending} onClick={runImport}>
              {pending ? "Importing…" : `Import ${analysis.length} rows`}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "report" && report ? (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Import report" subtitle={`${filename} — stored permanently; the whole import can be undone from the Imports page.`} />
            <div className="grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-5">
              {[
                ["Created", report.created, "text-success"],
                ["Updated", report.updated, "text-cyan"],
                ["Duplicates", report.duplicates, "text-warn"],
                ["Suppressed", report.skipped, "text-danger"],
                ["Errors", report.errors, "text-danger"],
              ].map(([label, n, cls]) => (
                <div key={label as string} className="bg-surface p-4 text-center">
                  <p className={cn("font-display text-[22px] font-bold tabular-nums", cls as string)}>{n as number}</p>
                  <p className="mt-1 text-[11px] text-muted">{label as string}</p>
                </div>
              ))}
            </div>
            <div className="max-h-72 overflow-y-auto border-t border-line">
              <ul className="divide-y divide-line/50">
                {report.details.map((d) => (
                  <li key={d.rowNum} className="flex items-start gap-3 px-5 py-2">
                    <span className="w-8 shrink-0 text-[11px] text-dim">#{d.rowNum}</span>
                    <Badge
                      tone={d.outcome === "created" ? "green" : d.outcome === "updated" ? "cyan" : d.outcome === "error" ? "red" : "amber"}
                    >
                      {d.outcome}
                    </Badge>
                    <span className="min-w-0 flex-1 text-[12px] text-muted">{d.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-[12.5px] text-success">
              <CheckCircle2 className="h-4 w-4" /> Leads are live in the database — scores computed, follow-up tasks created.
            </p>
            <div className="flex gap-2">
              <Link href="/imports" className="inline-flex h-9 items-center rounded-(--radius-control) border border-line-strong bg-raised px-4 text-[13px] font-medium text-text hover:bg-overlay">
                Import history
              </Link>
              <Link href="/leads?source=import" className="inline-flex h-9 items-center rounded-(--radius-control) bg-accent px-4 text-[13px] font-medium text-white hover:bg-accent-bright">
                View imported leads →
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
