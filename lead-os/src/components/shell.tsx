"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Microscope,
  MessagesSquare,
  Workflow,
  BookMarked,
  CheckSquare,
  BarChart3,
  Upload,
  Settings,
  Play,
  Search,
  Menu,
  X,
  LogOut,
  Briefcase,
} from "lucide-react";
import { Avatar, cn } from "@/components/ui";
import { CommandPalette } from "@/components/command-palette";

const NAV = [
  { href: "/", label: "Command Centre", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/research", label: "Research", icon: Microscope },
  { href: "/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/opportunities", label: "Opportunities", icon: Briefcase },
  { href: "/automations", label: "Automation Designs", icon: Workflow },
  { href: "/case-studies", label: "Case Studies", icon: BookMarked },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/imports", label: "Imports", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Shell({
  userName,
  logout,
  children,
}: {
  userName: string;
  logout: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
      {NAV.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-(--radius-control) px-2.5 py-2 text-[13px] font-medium transition-colors",
              active
                ? "bg-accent-soft text-accent-bright"
                : "text-muted hover:bg-raised hover:text-text",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const executeCta = (
    <div className="border-t border-line px-3 py-3">
      <Link
        href="/execute"
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center justify-center gap-2 rounded-(--radius-control) py-2.5 text-[13px] font-semibold transition-colors",
          pathname.startsWith("/execute")
            ? "bg-accent text-white"
            : "border border-accent/40 bg-accent-soft text-accent-bright hover:bg-accent hover:text-white",
        )}
      >
        <Play className="h-4 w-4" />
        Daily Execution Mode
      </Link>
    </div>
  );

  const brand = (
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent font-display text-[12px] font-bold text-white">
        C
      </span>
      <div className="min-w-0 leading-tight">
        <p className="font-display text-[13px] font-bold tracking-tight text-text">Lead Intelligence OS</p>
        <p className="text-[10px] tracking-[0.16em] text-dim uppercase">CPM Growth Systems</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-surface/80 backdrop-blur-sm lg:flex">
        {brand}
        {nav}
        {executeCta}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="animate-fade-in absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-surface">
            <div className="flex items-center justify-between pr-2">
              {brand}
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="rounded p-2 text-dim hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {executeCta}
          </aside>
        </div>
      ) : null}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="rounded p-1.5 text-muted hover:bg-raised hover:text-text lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-8.5 w-full max-w-sm cursor-pointer items-center gap-2 rounded-(--radius-control) border border-line-strong bg-raised px-3 text-[12.5px] text-dim transition-colors hover:border-accent/50 hover:text-muted"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Search leads, pages, actions…</span>
            <kbd className="rounded border border-line-strong bg-overlay px-1.5 py-px font-sans text-[10px] text-dim">
              Ctrl K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 sm:flex">
              <Avatar name={userName} className="h-7 w-7 text-[10px]" />
              <span className="text-[12.5px] font-medium text-muted">{userName}</span>
            </span>
            <form action={logout}>
              <button
                type="submit"
                title="Sign out"
                aria-label="Sign out"
                className="cursor-pointer rounded p-1.5 text-dim transition-colors hover:bg-raised hover:text-text"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
