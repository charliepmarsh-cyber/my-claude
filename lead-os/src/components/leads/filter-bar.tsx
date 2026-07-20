"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bookmark, LayoutGrid, Rows3, Search, X } from "lucide-react";
import { Button, Select, cn, inputCls } from "@/components/ui";
import { useToast } from "@/components/toast";
import { saveFilterAction, deleteFilterAction } from "@/server/actions/filters";
import {
  ICP_CATEGORIES,
  ICP_CATEGORY_LABELS,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_LABEL_TEXT,
} from "@/lib/constants";

type SavedFilter = { id: string; name: string; params: Record<string, string> };

const FILTER_KEYS = ["q", "status", "priority", "icp", "warmth", "touched", "source", "minScore", "dnc"] as const;

export function FilterBar({ saved }: { saved: SavedFilter[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const urlQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync the input when the URL changes externally (saved filter applied, clear).
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setQ(urlQ);
  }

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      next.delete("page");
      startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  const onSearch = (value: string) => {
    setQ(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setParam("q", value || null), 250);
  };

  const activeCount = FILTER_KEYS.filter((k) => searchParams.get(k)).length;
  const view = searchParams.get("view") === "cards" ? "cards" : "table";

  const applySaved = (f: SavedFilter) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(f.params)) next.set(k, v);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const saveCurrent = async () => {
    const params: Record<string, string> = {};
    for (const k of FILTER_KEYS) {
      const v = searchParams.get(k);
      if (v) params[k] = v;
    }
    if (Object.keys(params).length === 0) {
      toast("Set some filters first, then save them.", "info");
      return;
    }
    const name = window.prompt("Name this saved filter:");
    if (!name) return;
    const res = await saveFilterAction({ name, params });
    if (res.ok) toast(`Saved filter “${name}”.`);
    else toast(res.error, "error");
  };

  const selectCls = "h-8 w-auto min-w-0 px-2 pr-7 text-[12px]";

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
          <input
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search name, role, company, notes…"
            aria-label="Search leads"
            className={cn(inputCls, "h-8 pl-8 text-[12.5px]")}
          />
        </div>

        <Select aria-label="Filter by stage" className={selectCls} value={searchParams.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value || null)}>
          <option value="">Stage: all</option>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STAGE_LABELS[s]}
            </option>
          ))}
        </Select>

        <Select aria-label="Filter by priority" className={selectCls} value={searchParams.get("priority") ?? ""} onChange={(e) => setParam("priority", e.target.value || null)}>
          <option value="">Priority: all</option>
          {PRIORITY_LABELS.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL_TEXT[p]}
            </option>
          ))}
        </Select>

        <Select aria-label="Filter by ICP category" className={selectCls} value={searchParams.get("icp") ?? ""} onChange={(e) => setParam("icp", e.target.value || null)}>
          <option value="">ICP: all</option>
          {ICP_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {ICP_CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>

        <Select aria-label="Filter by warmth" className={selectCls} value={searchParams.get("warmth") ?? ""} onChange={(e) => setParam("warmth", e.target.value || null)}>
          <option value="">Warmth: all</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </Select>

        <Select aria-label="Filter by contact history" className={selectCls} value={searchParams.get("touched") ?? ""} onChange={(e) => setParam("touched", e.target.value || null)}>
          <option value="">Contacted: any</option>
          <option value="never">Never contacted</option>
          <option value="contacted">Contacted before</option>
        </Select>

        <Select aria-label="Filter by data source" className={selectCls} value={searchParams.get("source") ?? ""} onChange={(e) => setParam("source", e.target.value || null)}>
          <option value="">Source: all</option>
          <option value="demo">Demo data</option>
          <option value="import">Imported</option>
          <option value="manual">Manual</option>
        </Select>

        <Select aria-label="Minimum score" className={selectCls} value={searchParams.get("minScore") ?? ""} onChange={(e) => setParam("minScore", e.target.value || null)}>
          <option value="">Score: any</option>
          <option value="70">70+</option>
          <option value="50">50+</option>
          <option value="30">30+</option>
        </Select>

        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-muted select-none">
          <input
            type="checkbox"
            checked={searchParams.get("dnc") === "1"}
            onChange={(e) => setParam("dnc", e.target.checked ? "1" : null)}
            className="h-3.5 w-3.5 accent-[#2563eb]"
          />
          Include do-not-contact
        </label>

        {activeCount > 0 ? (
          <Button variant="ghost" size="xs" onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}>
            <X className="h-3 w-3" /> Clear ({activeCount})
          </Button>
        ) : null}

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="xs" onClick={saveCurrent} title="Save current filters">
            <Bookmark className="h-3.5 w-3.5" /> Save filter
          </Button>
          <div className="flex overflow-hidden rounded-(--radius-control) border border-line-strong" role="group" aria-label="View">
            <button
              type="button"
              onClick={() => setParam("view", null)}
              aria-pressed={view === "table"}
              title="Table view"
              className={cn("cursor-pointer px-2 py-1.5", view === "table" ? "bg-accent-soft text-accent-bright" : "text-dim hover:text-text")}
            >
              <Rows3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setParam("view", "cards")}
              aria-pressed={view === "cards"}
              title="Card view"
              className={cn("cursor-pointer px-2 py-1.5", view === "cards" ? "bg-accent-soft text-accent-bright" : "text-dim hover:text-text")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {saved.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-dim">Saved:</span>
          {saved.map((f) => (
            <span key={f.id} className="inline-flex items-center overflow-hidden rounded-full border border-line-strong bg-raised">
              <button
                type="button"
                onClick={() => applySaved(f)}
                className="cursor-pointer px-2.5 py-1 text-[11.5px] text-muted hover:bg-overlay hover:text-text"
              >
                {f.name}
              </button>
              <button
                type="button"
                aria-label={`Delete saved filter ${f.name}`}
                onClick={async () => {
                  await deleteFilterAction({ id: f.id });
                  toast(`Deleted “${f.name}”.`);
                }}
                className="cursor-pointer border-l border-line px-1.5 py-1 text-dim hover:text-danger"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
