"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Copy, Send, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Select, SourceTag, Textarea, cn } from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import type { Lead, Message } from "@/db/schema";
import { MESSAGE_TYPE_LABELS, type MessageType } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { DEFAULT_CONTROLS, type GenerationControls } from "@/lib/messages/generator";
import { discardMessageAction, editMessageAction, generateMessageAction, markSentAction } from "@/server/actions/messages";

const TYPE_GROUPS: Array<{ label: string; types: MessageType[] }> = [
  { label: "First contact", types: ["initial_warm", "initial_cold", "insight_seeking", "peer_collaboration", "local_business"] },
  { label: "Follow-ups", types: ["follow_up_1", "follow_up_2", "final_close"] },
  { label: "Replies", types: ["reply_positive", "reply_vague", "reply_objection"] },
  { label: "Commercial", types: ["discovery_call_invite", "case_study_proposal", "paid_transition", "referral_request", "testimonial_request"] },
];

export function OutreachPanels({ lead, messages, aiAvailable }: { lead: Lead; messages: Message[]; aiAvailable: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [msgType, setMsgType] = useState<MessageType>(lead.warmth === "warm" ? "initial_warm" : "initial_cold");
  const [controls, setControls] = useState<GenerationControls>({ ...DEFAULT_CONTROLS });
  const [useAi, setUseAi] = useState(false);
  const [genBlock, setGenBlock] = useState<{ missing: string[]; suggestion?: string } | null>(null);
  const [sendGuard, setSendGuard] = useState<{ messageId: string; reasons: string[] } | null>(null);

  const visible = useMemo(() => messages.filter((m) => m.status !== "discarded"), [messages]);

  const generate = () =>
    startTransition(async () => {
      const res = await generateMessageAction({ leadId: lead.id, msgType, controls, useAi });
      if (res.ok) {
        toast(`Draft created (${res.source === "ai" ? "rules + AI polish" : "rules engine"}). Review before sending.`);
        router.refresh();
      } else if (res.missing) {
        setGenBlock({ missing: res.missing, suggestion: res.suggestion });
      } else {
        toast(res.error, "error");
      }
    });

  const markSent = (messageId: string, override = false) =>
    startTransition(async () => {
      const res = await markSentAction({ messageId, overrideGuard: override });
      if (res.ok) {
        toast("Marked as sent — follow-up scheduled where appropriate.");
        setSendGuard(null);
        router.refresh();
      } else if (res.blocked && !lead.doNotContact) {
        setSendGuard({ messageId, reasons: res.blocked });
      } else {
        toast(res.error, "error");
        if (res.blocked) setSendGuard(null);
      }
    });

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* Generator */}
      <Card className="h-fit xl:sticky xl:top-20">
        <CardHeader title="Draft a message" subtitle="Assembled only from facts on this record — the evidence used is shown with every draft." />
        <div className="space-y-3.5 p-5">
          <Field label="Message type">
            <Select value={msgType} onChange={(e) => setMsgType(e.target.value as MessageType)}>
              {TYPE_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.types.map((t) => (
                    <option key={t} value={t}>
                      {MESSAGE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tone">
              <Select value={controls.tone} onChange={(e) => setControls({ ...controls, tone: e.target.value as never })}>
                <option value="warm">Warm</option>
                <option value="neutral">Neutral</option>
                <option value="professional">Professional</option>
              </Select>
            </Field>
            <Field label="Length">
              <Select value={controls.length} onChange={(e) => setControls({ ...controls, length: e.target.value as never })}>
                <option value="short">Short</option>
                <option value="medium">Medium</option>
              </Select>
            </Field>
            <Field label="Directness">
              <Select value={controls.directness} onChange={(e) => setControls({ ...controls, directness: e.target.value as never })}>
                <option value="gentle">Gentle</option>
                <option value="direct">Direct</option>
              </Select>
            </Field>
            <Field label="Technical depth">
              <Select value={controls.techDepth} onChange={(e) => setControls({ ...controls, techDepth: e.target.value as never })}>
                <option value="plain">Plain English</option>
                <option value="technical">Technical</option>
              </Select>
            </Field>
            <Field label="CTA strength" className="col-span-2">
              <Select value={controls.ctaStrength} onChange={(e) => setControls({ ...controls, ctaStrength: e.target.value as never })}>
                <option value="soft">Soft — easy to ignore</option>
                <option value="clear">Clear — asks directly</option>
              </Select>
            </Field>
          </div>

          {aiAvailable ? (
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-muted select-none">
              <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} className="h-3.5 w-3.5 accent-[#2563eb]" />
              <Sparkles className="h-3.5 w-3.5 text-violet-300" />
              Polish with AI (rephrases only — cannot add claims)
            </label>
          ) : (
            <p className="rounded-(--radius-control) border border-line bg-raised px-3 py-2 text-[11.5px] leading-relaxed text-dim">
              AI polish is off — no ANTHROPIC_API_KEY configured. The rules engine works fully without it.
            </p>
          )}

          <Button variant="primary" size="md" className="w-full" disabled={pending || lead.doNotContact} onClick={generate}>
            <Wand2 className="h-4 w-4" /> {pending ? "Drafting…" : "Generate draft"}
          </Button>
          {lead.doNotContact ? <p className="text-[12px] text-danger">Blocked: this lead is do-not-contact.</p> : null}
          <p className="text-[11px] leading-relaxed text-dim">
            Nothing is ever sent automatically. You copy the message into LinkedIn/email yourself, then mark it as sent
            here to keep the record straight.
          </p>
        </div>
      </Card>

      {/* Drafts & sent */}
      <div className="space-y-4 xl:col-span-2">
        {visible.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Send />}
              title="No drafts yet"
              body="Pick a message type and generate. Drafts stay here for editing, comparing versions, and marking as sent."
            />
          </Card>
        ) : (
          visible.map((m) => (
            <MessageCard key={m.id} message={m} onMarkSent={markSent} pending={pending} />
          ))
        )}
      </div>

      {/* Generation blocked */}
      <Modal open={!!genBlock} onClose={() => setGenBlock(null)} title="Not enough real data for this message">
        <p className="text-[13px] text-muted">The generator refuses to invent personalisation. To draft this message:</p>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-[13px] text-warn">
          {genBlock?.missing.map((m) => <li key={m}>{m}</li>)}
        </ul>
        {genBlock?.suggestion ? <p className="mt-3 text-[12.5px] text-cyan">{genBlock.suggestion}</p> : null}
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setGenBlock(null)}>OK</Button>
        </div>
      </Modal>

      {/* Send guard */}
      <Modal open={!!sendGuard} onClose={() => setSendGuard(null)} title="Hold on — outreach guard">
        <ul className="list-inside list-disc space-y-1.5 text-[13px] text-warn">
          {sendGuard?.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <p className="mt-3 text-[12.5px] text-muted">
          If you&apos;ve thought it through (e.g. they replied on another channel), you can record it as sent anyway.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setSendGuard(null)}>Cancel</Button>
          <Button variant="danger" disabled={pending} onClick={() => sendGuard && markSent(sendGuard.messageId, true)}>
            Mark sent anyway
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function MessageCard({
  message: m,
  onMarkSent,
  pending,
}: {
  message: Message;
  onMarkSent: (id: string) => void;
  pending: boolean;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [body, setBody] = useState(m.body);
  const [editing, setEditing] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const dirty = body !== m.body;

  const copy = async () => {
    await navigator.clipboard.writeText(body);
    toast("Copied to clipboard — paste it into LinkedIn/email.");
  };

  const save = () =>
    startTransition(async () => {
      const res = await editMessageAction({ messageId: m.id, body });
      if (res.ok) {
        toast("Edit saved.");
        setEditing(false);
        router.refresh();
      } else toast(res.error ?? "Couldn't save", "error");
    });

  const discard = () =>
    startTransition(async () => {
      const res = await discardMessageAction({ messageId: m.id });
      if (res.ok) {
        toast("Draft discarded.");
        router.refresh();
      } else toast(res.error ?? "Couldn't discard", "error");
    });

  return (
    <Card className={cn(m.status === "sent" && "border-success/25")}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="text-[13px] font-semibold text-text">{MESSAGE_TYPE_LABELS[m.msgType]}</span>
        <Badge tone="grey">v{m.versionNum}</Badge>
        <SourceTag source={m.generationSource} />
        {m.status === "sent" ? (
          <Badge tone="green">
            <Check className="h-3 w-3" /> Sent {m.sentAt ? fmtDateTime(m.sentAt) : ""}
          </Badge>
        ) : (
          <Badge tone="amber">Draft — awaiting your approval</Badge>
        )}
        <span className="ml-auto text-[11px] text-dim">{fmtDateTime(m.createdAt)}</span>
      </div>

      <div className="p-4">
        {m.subject ? (
          <p className="mb-2 text-[12.5px] text-muted">
            <span className="text-dim">Subject:</span> {m.subject}
          </p>
        ) : null}
        {m.status === "sent" || !editing ? (
          <p className="rounded-(--radius-control) bg-raised/60 px-3.5 py-3 text-[13px] leading-relaxed whitespace-pre-wrap text-text">
            {body}
          </p>
        ) : (
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={Math.min(14, body.split("\n").length + 3)} aria-label="Edit message body" />
        )}

        <button
          type="button"
          onClick={() => setShowEvidence(!showEvidence)}
          aria-expanded={showEvidence}
          className="mt-3 flex cursor-pointer items-center gap-1 text-[12px] font-medium text-cyan hover:underline"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !showEvidence && "-rotate-90")} />
          Evidence used ({(m.evidenceUsed ?? []).length}) — not included in the sent message
        </button>
        {showEvidence ? (
          <ul className="mt-2 space-y-1 rounded-(--radius-control) border border-cyan/20 bg-cyan/5 px-3.5 py-2.5">
            {(m.evidenceUsed ?? []).map((e, i) => (
              <li key={i} className="text-[12px] leading-relaxed text-muted">
                • {e}
              </li>
            ))}
            {(m.evidenceUsed ?? []).length === 0 ? <li className="text-[12px] text-dim">No specific evidence recorded.</li> : null}
          </ul>
        ) : null}

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={copy}>
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
          {m.status !== "sent" ? (
            <>
              {editing ? (
                <>
                  <Button size="sm" variant="primary" disabled={!dirty || pending} onClick={save}>
                    Save edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setBody(m.body);
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
              <Button size="sm" variant="success" disabled={pending || dirty} title={dirty ? "Save your edit first" : "Record that you sent this"} onClick={() => onMarkSent(m.id)}>
                <Send className="h-3.5 w-3.5" /> Mark as sent
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={discard} aria-label="Discard draft">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
