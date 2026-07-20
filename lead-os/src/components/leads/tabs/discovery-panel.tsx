"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleCheck, CircleDashed, HelpCircle, Save } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, ProgressBar, SectionTitle, Textarea, cn } from "@/components/ui";
import { useToast } from "@/components/toast";
import type { Discovery, Lead } from "@/db/schema";
import { DISCOVERY_FIELDS, canRecommendBuild, computeDiscoveryCompleteness, nextDiscoveryQuestion, type DiscoveryFieldKey } from "@/lib/discovery";
import { upsertDiscoveryAction } from "@/server/actions/discovery";

const SECTIONS: Array<{ title: string; keys: DiscoveryFieldKey[] }> = [
  { title: "The problem", keys: ["problemStatement", "currentWorkflow", "trigger"] },
  { title: "The process", keys: ["inputs", "steps", "tools", "peopleInvolved", "processOwner", "decisionPoints", "exceptions", "outputs"] },
  { title: "The size of it", keys: ["volume", "frequency", "timeConsumed", "errorRate", "costEstimate", "revenueImpact", "customerImpact"] },
  { title: "Constraints & judgement", keys: ["complianceRisk", "humanJudgement", "constraints", "accessRequired", "dataSensitivity"] },
  { title: "Success", keys: ["desiredOutcome", "successMetrics"] },
];

export function DiscoveryPanel({ lead, discovery }: { lead: Lead; discovery: Discovery | null }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initial = useMemo(() => {
    const out: Record<DiscoveryFieldKey, string> = {} as Record<DiscoveryFieldKey, string>;
    for (const f of DISCOVERY_FIELDS) out[f.key] = ((discovery?.[f.key as keyof Discovery] as string | null) ?? "") as string;
    return out;
  }, [discovery]);

  const [values, setValues] = useState(initial);
  const dirty = useMemo(() => DISCOVERY_FIELDS.some((f) => values[f.key] !== initial[f.key]), [values, initial]);

  const liveCompleteness = useMemo(() => computeDiscoveryCompleteness(values as Partial<Discovery>), [values]);
  const next = useMemo(() => nextDiscoveryQuestion(values as Partial<Discovery>), [values]);
  const gate = useMemo(() => canRecommendBuild(values as Partial<Discovery>), [values]);

  const save = () =>
    startTransition(async () => {
      const res = await upsertDiscoveryAction({ leadId: lead.id, ...values });
      if (res.ok) {
        toast(`Discovery saved — ${res.completeness}% complete.`);
        router.refresh();
      } else toast(res.error ?? "Couldn't save", "error");
    });

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader title={section.title} />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              {section.keys.map((key) => {
                const f = DISCOVERY_FIELDS.find((x) => x.key === key)!;
                return (
                  <Field
                    key={key}
                    label={
                      <span className="flex items-center gap-1.5">
                        {f.label}
                        {f.essential ? (
                          <span title="Required before a build can be recommended" className="text-coral">
                            *
                          </span>
                        ) : null}
                      </span>
                    }
                    hint={f.question}
                    className={key === "problemStatement" || key === "currentWorkflow" || key === "steps" ? "sm:col-span-2" : undefined}
                  >
                    <Textarea
                      value={values[key]}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      rows={key === "problemStatement" || key === "steps" ? 3 : 2}
                      className="min-h-0"
                    />
                  </Field>
                );
              })}
            </div>
          </Card>
        ))}
        <div className="sticky bottom-4 flex justify-end">
          <Button variant="primary" size="md" disabled={!dirty || pending} onClick={save} className="shadow-(--shadow-pop)">
            <Save className="h-4 w-4" /> {pending ? "Saving…" : dirty ? "Save discovery" : "Saved"}
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        <Card className="xl:sticky xl:top-20">
          <CardHeader title="Discovery completeness" />
          <div className="p-5">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[12.5px] text-muted">Weighted coverage</span>
              <span className="font-display text-[16px] font-bold text-text">{liveCompleteness}%</span>
            </div>
            <ProgressBar value={liveCompleteness} max={100} tone={liveCompleteness >= 70 ? "green" : liveCompleteness >= 40 ? "cyan" : "amber"} />

            {next ? (
              <div className="mt-4 rounded-(--radius-control) border border-cyan/25 bg-cyan/5 px-3.5 py-3">
                <p className="flex items-start gap-1.5 text-[13px] font-medium text-cyan">
                  <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Ask next: “{next.field.question}”
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                  <span className="text-dim">Why this question:</span> {next.reason}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-[12.5px] text-success">Every field is covered — exceptional discovery.</p>
            )}

            <SectionTitle className="mt-5 mb-2">Build recommendation gate</SectionTitle>
            {gate.ok ? (
              <div className="rounded-(--radius-control) border border-success/30 bg-success-soft px-3.5 py-3">
                <p className="text-[13px] font-medium text-success">Minimum discovery met.</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">
                  You can responsibly design an automation now.
                </p>
                <Link
                  href={`/leads/${lead.id}?tab=opportunity`}
                  className="mt-2 inline-block text-[12.5px] font-medium text-accent-bright hover:underline"
                >
                  Design the automation opportunity →
                </Link>
              </div>
            ) : (
              <>
                <p className="mb-2 text-[12px] leading-relaxed text-muted">
                  The system won&apos;t recommend a build yet. Still missing:
                </p>
                <ul className="space-y-1.5">
                  {gate.missing.map((m) => (
                    <li key={m.label} className="flex items-start gap-2 text-[12px] text-muted">
                      <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
                      <span>
                        <span className="font-medium text-text">{m.label}</span> — {m.why}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <SectionTitle className="mt-5 mb-2">Field checklist</SectionTitle>
            <ul className="grid grid-cols-1 gap-1">
              {DISCOVERY_FIELDS.map((f) => {
                const filled = (values[f.key] ?? "").trim().length >= 3;
                return (
                  <li key={f.key} className={cn("flex items-center gap-1.5 text-[11.5px]", filled ? "text-success" : "text-dim")}>
                    {filled ? <CircleCheck className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                    {f.label}
                    {f.essential ? <Badge tone="grey" className="ml-auto">essential</Badge> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
