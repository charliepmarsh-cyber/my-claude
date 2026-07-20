"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  MessagesSquare,
  CheckSquare,
  BarChart3,
  Upload,
  Settings,
  Play,
  UserPlus,
  CornerDownLeft,
  Microscope,
  Briefcase,
  BookMarked,
  Workflow,
} from "lucide-react";
import { cn } from "@/components/ui";

type LeadHit = { id: string; fullName: string; jobTitle: string | null; companyName: string | null; status: string };

const PAGES = [
  { label: "Command Centre", href: "/", icon: LayoutDashboard, keywords: "dashboard home mission" },
  { label: "Leads", href: "/leads", icon: Users, keywords: "database contacts people" },
  { label: "Add lead", href: "/leads/new", icon: UserPlus, keywords: "create new person" },
  { label: "Pipeline", href: "/pipeline", icon: KanbanSquare, keywords: "kanban stages board" },
  { label: "Research queue", href: "/research", icon: Microscope, keywords: "enrich investigate" },
  { label: "Conversations", href: "/conversations", icon: MessagesSquare, keywords: "replies inbox messages" },
  { label: "Opportunities", href: "/opportunities", icon: Briefcase, keywords: "deals commercial pipeline" },
  { label: "Automation Designs", href: "/automations", icon: Workflow, keywords: "workflow opportunity designer" },
  { label: "Case Studies", href: "/case-studies", icon: BookMarked, keywords: "portfolio proof" },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, keywords: "follow-ups todo due" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, keywords: "metrics reporting learning" },
  { label: "Imports", href: "/imports", icon: Upload, keywords: "csv warm list upload" },
  { label: "Daily Execution Mode", href: "/execute", icon: Play, keywords: "focus outreach session" },
  { label: "Settings", href: "/settings", icon: Settings, keywords: "weights cadence targets suppression" },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  // Global shortcut lives here so it works while the palette is closed.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Remount on open so all state starts fresh — no reset effects needed.
  if (!open) return null;
  return <PaletteContent onClose={() => onOpenChange(false)} />;
}

function PaletteContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [leadHits, setLeadHits] = useState<LeadHit[]>([]);
  const [selected, setSelected] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
  }, []);

  const onSearch = (value: string) => {
    setQuery(value);
    setSelected(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 2) {
      setLeadHits([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) {
          const data = (await res.json()) as { leads: LeadHit[] };
          setLeadHits(data.leads);
          setSelected(0);
        }
      } catch {
        /* aborted or offline — ignore */
      }
    }, 160);
  };

  const pageHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAGES;
    return PAGES.filter((p) => p.label.toLowerCase().includes(q) || p.keywords.includes(q));
  }, [query]);

  const items = useMemo(
    () => [
      ...leadHits.map((l) => ({ kind: "lead" as const, id: l.id, lead: l })),
      ...pageHits.map((p) => ({ kind: "page" as const, id: p.href, page: p })),
    ],
    [leadHits, pageHits],
  );

  const go = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;
      onClose();
      router.push(item.kind === "lead" ? `/leads/${item.id}` : item.page.href);
    },
    [items, onClose, router],
  );

  return (
    <div className="fixed inset-0 z-90 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-fade-in relative w-full max-w-lg overflow-hidden rounded-(--radius-card) border border-line-strong bg-surface shadow-(--shadow-pop)">
        <input
          autoFocus
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelected((s) => Math.min(s + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((s) => Math.max(s - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(selected);
            }
          }}
          placeholder="Search leads or jump to a page…"
          aria-label="Search"
          className="w-full border-b border-line bg-transparent px-4 py-3.5 text-[14px] text-text placeholder:text-dim focus:outline-none"
        />
        <div className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-dim">No matches. Try a name, company or page.</p>
          ) : (
            <ul>
              {leadHits.length > 0 ? (
                <li className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.14em] text-dim uppercase">Leads</li>
              ) : null}
              {items.map((item, i) => (
                <li key={item.kind + item.id}>
                  {item.kind === "page" && i === leadHits.length && leadHits.length > 0 ? (
                    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-[0.14em] text-dim uppercase">Pages</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => go(i)}
                    onMouseEnter={() => setSelected(i)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-(--radius-control) px-3 py-2 text-left text-[13px]",
                      i === selected ? "bg-accent-soft text-text" : "text-muted",
                    )}
                  >
                    {item.kind === "lead" ? (
                      <>
                        <Users className="h-3.5 w-3.5 shrink-0 text-accent-bright" />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium text-text">{item.lead.fullName}</span>
                          {item.lead.jobTitle || item.lead.companyName ? (
                            <span className="text-dim">
                              {" — "}
                              {[item.lead.jobTitle, item.lead.companyName].filter(Boolean).join(", ")}
                            </span>
                          ) : null}
                        </span>
                      </>
                    ) : (
                      <>
                        <item.page.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1">{item.page.label}</span>
                      </>
                    )}
                    {i === selected ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-dim" /> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
