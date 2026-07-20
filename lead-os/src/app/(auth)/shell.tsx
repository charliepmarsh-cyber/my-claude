import type { ReactNode } from "react";
import { Card } from "@/components/ui";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="font-display text-[13px] font-bold tracking-[0.28em] text-accent-bright uppercase">
            CPM Growth Systems
          </p>
          <h1 className="mt-2 font-display text-[22px] font-bold tracking-tight text-text">{title}</h1>
          {subtitle ? <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-muted">{subtitle}</p> : null}
        </div>
        <Card className="p-6">{children}</Card>
        <p className="mt-4 text-center text-[11px] text-dim">Lead Intelligence OS · local-first · human-approved outreach</p>
      </div>
    </main>
  );
}
