"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Database, Search } from "lucide-react";
import { Badge, Button, Card, CardHeader, ConfidenceTag, SectionTitle, cn } from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import type { EnrichmentProposal } from "@/lib/enrichment/apollo-mapping";
import { applyApolloEnrichmentAction, previewApolloEnrichmentAction } from "@/server/actions/enrichment";

export function ApolloPanel({ leadId, configured, doNotContact }: { leadId: string; configured: boolean; doNotContact: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [proposal, setProposal] = useState<EnrichmentProposal | null>(null);
  const [pickedResearch, setPickedResearch] = useState<Set<number>>(new Set());
  const [pickedFields, setPickedFields] = useState<Set<number>>(new Set());

  const fetchPreview = () =>
    startTransition(async () => {
      const res = await previewApolloEnrichmentAction({ leadId });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      if (!res.proposal.personFound) {
        toast("Apollo found no match for this person — the credit was still consumed. Try adding their LinkedIn URL or company website first.", "warn");
        return;
      }
      setProposal(res.proposal);
      setPickedResearch(new Set(res.proposal.research.map((_, i) => i)));
      setPickedFields(new Set(res.proposal.suggestions.map((s, i) => (s.conflict ? -1 : i)).filter((i) => i >= 0)));
    });

  const apply = () => {
    const p = proposal!;
    setProposal(null);
    startTransition(async () => {
      const res = await applyApolloEnrichmentAction({
        leadId,
        research: p.research.filter((_, i) => pickedResearch.has(i)).map((r) => ({ ...r })),
        fields: p.suggestions.filter((_, i) => pickedFields.has(i)).map((s) => ({ target: s.target, field: s.field, proposed: s.proposed })),
      });
      if (res.ok) {
        toast(`Apollo data applied (${res.applied} item${res.applied === 1 ? "" : "s"}) — scores recomputed.`);
        router.refresh();
      } else toast(res.error ?? "Couldn't apply", "error");
    });
  };

  return (
    <Card>
      <CardHeader
        title="Apollo enrichment"
        subtitle="Looks the person up in Apollo.io and proposes source-attributed research and field fills. You review everything before it's saved."
      />
      <div className="p-5">
        {!configured ? (
          <div className="rounded-(--radius-control) border border-line bg-raised/50 px-4 py-3.5">
            <p className="text-[13px] font-medium text-text">Not configured yet</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              Add <code className="rounded bg-raised px-1 py-0.5 text-[11.5px]">APOLLO_API_KEY=…</code> to{" "}
              <code className="rounded bg-raised px-1 py-0.5 text-[11.5px]">lead-os/.env.local</code> and restart the app.
              Keys stay server-side. Each lookup consumes one Apollo credit, so lookups only ever run when you click the
              button — never automatically.
            </p>
          </div>
        ) : doNotContact ? (
          <p className="flex items-start gap-2 text-[12.5px] text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Enrichment is blocked for do-not-contact leads.
          </p>
        ) : (
          <>
            <Button variant="primary" disabled={pending} onClick={fetchPreview}>
              <Search className="h-3.5 w-3.5" /> {pending ? "Looking up…" : "Fetch from Apollo (uses 1 credit)"}
            </Button>
            <p className="mt-2 text-[11.5px] leading-relaxed text-dim">
              Uses name + company + LinkedIn already on the record to match. Personal emails and phone numbers are never
              requested. Apollo data is third-party sourced — treat it as medium confidence until verified.
            </p>
          </>
        )}
      </div>

      <Modal open={!!proposal} onClose={() => setProposal(null)} title="Review Apollo data before saving" wide>
        {proposal ? (
          <div className="space-y-5">
            <div>
              <SectionTitle className="mb-2">Research items to save ({pickedResearch.size} selected)</SectionTitle>
              <ul className="space-y-2">
                {proposal.research.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-(--radius-control) border border-line bg-raised/40 px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="mt-1 h-3.5 w-3.5 accent-[#2563eb]"
                      checked={pickedResearch.has(i)}
                      aria-label={`Include ${r.title}`}
                      onChange={(e) => {
                        const next = new Set(pickedResearch);
                        if (e.target.checked) next.add(i);
                        else next.delete(i);
                        setPickedResearch(next);
                      }}
                    />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium text-text">
                        <Database className="h-3 w-3 text-cyan" /> {r.title} <ConfidenceTag level={r.confidence} />
                      </p>
                      <p className="mt-1 text-[11.5px] leading-relaxed whitespace-pre-wrap text-muted">{r.content}</p>
                    </div>
                  </li>
                ))}
                {proposal.research.length === 0 ? <li className="text-[12px] text-dim">Nothing usable returned.</li> : null}
              </ul>
            </div>

            <div>
              <SectionTitle className="mb-2">Field fills ({pickedFields.size} selected)</SectionTitle>
              <p className="mb-2 text-[11.5px] text-dim">
                Empty fields are pre-ticked. Anything that would overwrite existing data is flagged and left un-ticked —
                your data wins unless you say otherwise.
              </p>
              <ul className="space-y-1.5">
                {proposal.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-2.5 rounded-(--radius-control) border px-3 py-2",
                      s.conflict ? "border-warn/35 bg-warn-soft" : "border-line bg-raised/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 accent-[#2563eb]"
                      checked={pickedFields.has(i)}
                      aria-label={`Apply ${s.label}`}
                      onChange={(e) => {
                        const next = new Set(pickedFields);
                        if (e.target.checked) next.add(i);
                        else next.delete(i);
                        setPickedFields(next);
                      }}
                    />
                    <div className="min-w-0 text-[12.5px]">
                      <span className="font-medium text-text">
                        {s.label} <Badge tone="grey">{s.target}</Badge>
                        {s.conflict ? <Badge tone="amber" className="ml-1">would overwrite</Badge> : null}
                      </span>
                      <p className="mt-0.5 text-muted">
                        {s.conflict ? (
                          <>
                            <span className="text-dim line-through">{s.current}</span> → {s.proposed}
                          </>
                        ) : (
                          s.proposed
                        )}
                      </p>
                    </div>
                  </li>
                ))}
                {proposal.suggestions.length === 0 ? <li className="text-[12px] text-dim">No field suggestions.</li> : null}
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setProposal(null)}>Discard (keeps nothing)</Button>
              <Button variant="primary" disabled={pending || (pickedResearch.size === 0 && pickedFields.size === 0)} onClick={apply}>
                Apply selected
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </Card>
  );
}
