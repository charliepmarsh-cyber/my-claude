"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, ShieldOff, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Input, SectionTitle, Select } from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import type { AiRun, SuppressionRecord } from "@/db/schema";
import { SCORE_DIMENSIONS, SCORE_DIMENSION_LABELS, type SettingsShape } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { addSuppressionAction, loadDemoDataAction, purgeDemoDataAction, removeSuppressionAction, saveSettingsAction } from "@/server/actions/settings";

export function SettingsView({
  settings,
  suppressions,
  ai,
}: {
  settings: SettingsShape;
  suppressions: SuppressionRecord[];
  ai: { mode: "anthropic" | "mock"; model: string; totalCostUsd: number; recentRuns: AiRun[] };
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ ...settings, scoreWeights: { ...settings.scoreWeights } });
  const [supForm, setSupForm] = useState({ kind: "email" as const, value: "", reason: "" });
  const [purgeModal, setPurgeModal] = useState(false);

  const numField = (key: keyof Omit<SettingsShape, "scoreWeights">, label: string, hint?: string) => (
    <Field key={key} label={label} hint={hint}>
      <Input
        type="number"
        min={0}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
      />
    </Field>
  );

  const save = () =>
    startTransition(async () => {
      const res = await saveSettingsAction(form);
      if (res.ok) {
        toast("Settings saved. Scores use the new weights on their next recompute.");
        router.refresh();
      } else toast(res.error ?? "Couldn't save", "error");
    });

  const weightSum = SCORE_DIMENSIONS.reduce((acc, d) => acc + (form.scoreWeights[d] ?? 0), 0);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Targets" subtitle="Drive the Command Centre progress bars and the mission plan." />
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
          {numField("warmListTarget", "Warm-list target")}
          {numField("dailyOutreachTarget", "Daily outreach target")}
          {numField("weeklyReplyGoal", "Weekly reply goal")}
          {numField("discoveryConversationTarget", "Discovery conversations")}
          {numField("caseStudyTarget", "Case-study target")}
          {numField("paidClientTarget", "Paid-client target")}
          {numField("dailyResearchTarget", "Daily research target")}
        </div>
      </Card>

      <Card>
        <CardHeader title="Follow-up cadence" subtitle="Business days. The engine skips weekends and stops at the follow-up limit." />
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
          {numField("followUp1Days", "Follow-up 1 after (days)", "Guidance: 3–5")}
          {numField("followUp2Days", "Follow-up 2 after (days)", "Guidance: 5–7")}
          {numField("finalCloseDays", "Final close after (days)", "Guidance: 7–10")}
          {numField("maxFollowUps", "Max follow-ups")}
          {numField("minDaysBetweenOutbound", "Min days between messages", "Duplicate-send guard")}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Score weights"
          subtitle={`Relative weights for the overall priority score (currently sum to ${weightSum}). Changing these changes what "P1" means — do it deliberately.`}
        />
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-5">
          {SCORE_DIMENSIONS.map((d) => (
            <Field key={d} label={SCORE_DIMENSION_LABELS[d]}>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.scoreWeights[d] ?? 0}
                onChange={(e) => setForm({ ...form, scoreWeights: { ...form.scoreWeights, [d]: Number(e.target.value) } })}
              />
            </Field>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" size="md" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Suppression list"
          subtitle="Contacts here are blocked from import, creation and outreach across the whole system. Do-not-contact actions add entries automatically."
        />
        <div className="p-5">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Type">
              <Select value={supForm.kind} onChange={(e) => setSupForm({ ...supForm, kind: e.target.value as never })} className="w-32">
                <option value="email">Email</option>
                <option value="linkedin">LinkedIn URL</option>
                <option value="name">Exact name</option>
                <option value="domain">Domain</option>
              </Select>
            </Field>
            <Field label="Value" className="min-w-52 flex-1">
              <Input value={supForm.value} onChange={(e) => setSupForm({ ...supForm, value: e.target.value })} />
            </Field>
            <Field label="Reason" className="min-w-52 flex-1">
              <Input value={supForm.reason} onChange={(e) => setSupForm({ ...supForm, reason: e.target.value })} />
            </Field>
            <Button
              disabled={supForm.value.trim().length < 2 || supForm.reason.trim().length < 3 || pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await addSuppressionAction(supForm);
                  if (res.ok) {
                    toast("Suppression added.");
                    setSupForm({ ...supForm, value: "", reason: "" });
                    router.refresh();
                  } else toast(res.error ?? "Couldn't add", "error");
                })
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>

          {suppressions.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-dim">No suppression entries yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line/60">
              {suppressions.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <Badge tone="red">
                    <ShieldOff className="h-3 w-3" /> {s.kind}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-text">{s.value}</span>
                  <span className="hidden text-[11.5px] text-dim sm:block">{s.reason}</span>
                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label={`Remove suppression for ${s.value}`}
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await removeSuppressionAction({ id: s.id });
                        toast("Suppression removed.");
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11.5px] leading-relaxed text-dim">
            Responsible-outreach note: this system supports consent-aware, low-volume, personalised outreach. It is not
            legal advice — for bulk email or tracking, check UK GDPR/PECR obligations first.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="AI provider"
          subtitle="Configured via environment variables — keys never reach the browser. Every AI call is logged with cost."
        />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={ai.mode === "anthropic" ? "green" : "grey"}>
              {ai.mode === "anthropic" ? `Anthropic connected (${ai.model})` : "Mock mode — rules engine only"}
            </Badge>
            <span className="text-[12.5px] text-muted">Total estimated spend: ${ai.totalCostUsd.toFixed(4)}</span>
          </div>
          {ai.mode === "mock" ? (
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              To enable AI polish and richer reply analysis, add <code className="rounded bg-raised px-1 py-0.5 text-[11.5px]">ANTHROPIC_API_KEY</code> to{" "}
              <code className="rounded bg-raised px-1 py-0.5 text-[11.5px]">.env.local</code> and restart. Everything works without it — the deterministic rules engine
              is the foundation, AI is a labelled enhancement.
            </p>
          ) : null}
          {ai.recentRuns.length > 0 ? (
            <>
              <SectionTitle className="mt-4 mb-2">Recent AI runs</SectionTitle>
              <ul className="divide-y divide-line/50">
                {ai.recentRuns.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-1.5 text-[12px]">
                    <Badge tone={r.status === "ok" ? "green" : r.status === "mock" ? "grey" : "red"}>{r.status}</Badge>
                    <span className="min-w-0 flex-1 truncate text-muted">{r.purpose}</span>
                    <span className="text-dim">{r.costEstimateUsd ? `$${r.costEstimateUsd.toFixed(4)}` : "—"}</span>
                    <span className="text-dim">{fmtDateTime(r.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader title="Data" subtitle="Your data lives in a local SQLite file. Export any time; back up by copying the data folder." />
        <div className="flex flex-wrap items-center gap-3 p-5">
          <a
            href="/api/export/leads"
            className="inline-flex h-9 items-center gap-1.5 rounded-(--radius-control) border border-line-strong bg-raised px-4 text-[13px] font-medium text-text hover:bg-overlay"
          >
            <Download className="h-4 w-4" /> Export all leads (CSV)
          </a>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await loadDemoDataAction();
                if (res.ok) {
                  toast(`Demo data loaded — ${res.created} representative leads with conversations and a case-study pipeline.`);
                  router.refresh();
                } else toast(res.error ?? "Couldn't load demo data", "warn");
              })
            }
          >
            Load demo data
          </Button>
          <Button variant="danger" onClick={() => setPurgeModal(true)}>
            <Trash2 className="h-4 w-4" /> Delete all demo data
          </Button>
          <p className="w-full text-[11.5px] leading-relaxed text-dim">
            Demo records are marked with a DEMO badge throughout. Deleting them removes the demo leads, their companies
            and every related record in one action. Real data is untouched.
          </p>
        </div>
      </Card>

      <Modal open={purgeModal} onClose={() => setPurgeModal(false)} title="Delete all demo data?">
        <p className="text-[13px] leading-relaxed text-muted">
          Every record marked DEMO — leads, companies, research, conversations, opportunities, case studies and tasks —
          will be permanently removed. Your own records are not affected.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setPurgeModal(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              setPurgeModal(false);
              startTransition(async () => {
                const res = await purgeDemoDataAction();
                toast(`Demo data removed (${res.removed} leads and related records).`);
                router.refresh();
              });
            }}
          >
            Delete demo data
          </Button>
        </div>
      </Modal>
    </div>
  );
}
