"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, MessageSquarePlus, Phone, StickyNote, Users2 } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Select, SourceTag, Textarea, cn } from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import type { Conversation, ConversationEntry, Lead, ReplyAnalysis } from "@/db/schema";
import {
  CONVERSATION_STAGES,
  CONVERSATION_STAGE_LABELS,
  REPLY_CLASSIFICATIONS,
  REPLY_CLASSIFICATION_LABELS,
  type ConversationStage,
  type ReplyClassification,
} from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { addEntryAction, recordReplyAction, reclassifyReplyAction, setConversationStageAction } from "@/server/actions/conversation";

const classTone: Record<ReplyClassification, "green" | "cyan" | "grey" | "amber" | "red" | "violet" | "blue" | "coral"> = {
  positive: "green",
  curious: "cyan",
  neutral: "grey",
  vague: "amber",
  not_now: "amber",
  objection: "red",
  referral: "blue",
  peer_discussion: "violet",
  qualified_problem: "coral",
  meeting_ready: "green",
  not_suitable: "grey",
};

export function ConversationPanels({
  lead,
  entries,
  analyses,
  conversation,
}: {
  lead: Lead;
  entries: ConversationEntry[];
  analyses: ReplyAnalysis[];
  conversation: Conversation | null;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [replyText, setReplyText] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteType, setNoteType] = useState<"note" | "call" | "meeting">("note");
  const [noteText, setNoteText] = useState("");
  const [reclass, setReclass] = useState<ReplyAnalysis | null>(null);
  const [reclassTo, setReclassTo] = useState<ReplyClassification>("neutral");
  const [reclassReason, setReclassReason] = useState("");

  const analysisByEntry = useMemo(() => {
    const map = new Map<string, ReplyAnalysis>();
    for (const a of analyses) if (!map.has(a.entryId)) map.set(a.entryId, a);
    return map;
  }, [analyses]);

  const submitReply = () =>
    startTransition(async () => {
      const res = await recordReplyAction({ leadId: lead.id, text: replyText.trim() });
      if (res.ok) {
        toast(`Reply recorded and analysed: ${REPLY_CLASSIFICATION_LABELS[(res.classification as ReplyClassification) ?? "neutral"]}.`);
        setReplyText("");
        router.refresh();
      } else toast(res.error ?? "Couldn't record reply", "error");
    });

  const submitNote = () =>
    startTransition(async () => {
      const res = await addEntryAction({ leadId: lead.id, entryType: noteType, content: noteText.trim() });
      if (res.ok) {
        toast(noteType === "note" ? "Note added." : noteType === "call" ? "Call logged." : "Meeting logged.");
        setNoteText("");
        setNoteOpen(false);
        router.refresh();
      } else toast(res.error ?? "Couldn't save", "error");
    });

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        {/* Timeline */}
        <Card>
          <CardHeader
            title="Conversation"
            subtitle="Chronological record — outbound on the right, their replies on the left."
            actions={
              conversation ? (
                <label className="flex items-center gap-1.5 text-[12px] text-dim">
                  Stage
                  <Select
                    aria-label="Conversation stage"
                    className="h-8 w-auto px-2 pr-7 text-[12px]"
                    value={lead.conversationStage ?? ""}
                    disabled={pending}
                    onChange={(e) =>
                      e.target.value &&
                      startTransition(async () => {
                        await setConversationStageAction({ leadId: lead.id, stage: e.target.value as ConversationStage });
                        toast("Conversation stage updated.");
                        router.refresh();
                      })
                    }
                  >
                    <option value="">Not set</option>
                    {CONVERSATION_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {CONVERSATION_STAGE_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </label>
              ) : null
            }
          />
          {entries.length === 0 ? (
            <EmptyState
              icon={<MessageSquarePlus />}
              title="No conversation yet"
              body="Mark a message as sent from the Outreach tab, or paste a reply below — everything lands here in order."
            />
          ) : (
            <ol className="space-y-3 p-4">
              {entries.map((e) => {
                const analysis = e.direction === "inbound" ? analysisByEntry.get(e.id) : undefined;
                return (
                  <li key={e.id} className={cn("flex", e.direction === "outbound" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] min-w-0", e.direction === "internal" && "w-full max-w-full")}>
                      <div
                        className={cn(
                          "rounded-(--radius-card) border px-4 py-3",
                          e.direction === "outbound" && "border-accent/30 bg-accent-soft",
                          e.direction === "inbound" && "border-line-strong bg-raised",
                          e.direction === "internal" && "border-dashed border-line-strong bg-surface",
                        )}
                      >
                        <div className="mb-1.5 flex items-center gap-2 text-[11px] text-dim">
                          {e.direction === "outbound" ? (
                            <>
                              <ArrowUpRight className="h-3 w-3 text-accent-bright" /> You · {e.entryType === "message_sent" ? "sent message" : e.entryType}
                            </>
                          ) : e.direction === "inbound" ? (
                            <>
                              <ArrowDownLeft className="h-3 w-3 text-success" /> {lead.fullName.split(" ")[0]} · reply
                            </>
                          ) : (
                            <>
                              {e.entryType === "call" ? <Phone className="h-3 w-3" /> : e.entryType === "meeting" ? <Users2 className="h-3 w-3" /> : <StickyNote className="h-3 w-3" />}
                              Internal {e.entryType}
                            </>
                          )}
                          <span className="ml-auto">{fmtDateTime(e.occurredAt)}</span>
                        </div>
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-text">{e.content}</p>
                      </div>

                      {analysis ? (
                        <div className="mt-1.5 rounded-(--radius-control) border border-line bg-surface px-3.5 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone={classTone[analysis.classification]}>
                              {REPLY_CLASSIFICATION_LABELS[analysis.classification]}
                            </Badge>
                            <Badge tone={analysis.confidence === "high" ? "green" : analysis.confidence === "medium" ? "amber" : "grey"}>
                              {analysis.confidence} confidence
                            </Badge>
                            <SourceTag source={analysis.analysisSource} />
                            <Button
                              size="xs"
                              variant="ghost"
                              className="ml-auto"
                              onClick={() => {
                                setReclass(analysis);
                                setReclassTo(analysis.classification);
                                setReclassReason("");
                              }}
                            >
                              Reclassify
                            </Button>
                          </div>
                          {analysis.rationale ? <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{analysis.rationale}</p> : null}
                          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                            {[
                              ["Explicit problem", analysis.explicitProblem],
                              ["Implied pain", analysis.impliedPain],
                              ["Current process", analysis.currentProcess],
                              ["Frequency", analysis.frequency],
                              ["Consequence", analysis.consequence],
                              ["Authority signal", analysis.authoritySignal],
                              ["Tech sophistication", analysis.techSophistication],
                              ["Human judgement", analysis.humanJudgementAreas],
                              ["Tools", (analysis.toolsMentioned ?? []).join(", ") || null],
                              ["Possible objections", (analysis.possibleObjections ?? []).join("; ") || null],
                            ]
                              .filter(([, v]) => v)
                              .map(([k, v]) => (
                                <div key={k as string} className="text-[12px]">
                                  <dt className="inline text-dim">{k}: </dt>
                                  <dd className="inline text-muted">{v}</dd>
                                </div>
                              ))}
                          </dl>
                          {analysis.recommendedNextQuestion ? (
                            <div className="mt-2 rounded-(--radius-control) border border-cyan/25 bg-cyan/5 px-3 py-2">
                              <p className="text-[12.5px] text-cyan">Ask next: “{analysis.recommendedNextQuestion}”</p>
                              {analysis.nextQuestionReason ? (
                                <p className="mt-0.5 text-[11.5px] text-muted">Why: {analysis.nextQuestionReason}</p>
                              ) : null}
                            </div>
                          ) : null}
                          <p className="mt-2 text-[12px] text-muted">
                            <span className="text-dim">Recommendation:</span>{" "}
                            {
                              {
                                continue_discovery: "Continue discovery — understand before proposing anything.",
                                propose_action: "Enough is known — propose the next concrete step.",
                                nurture: "Move to nurture with a future check-in.",
                                close_politely: "Close politely and leave the door open.",
                                treat_as_peer: "Treat as a peer — knowledge exchange, no pitching.",
                                await_reply: "Nothing to act on — await a fuller reply.",
                              }[analysis.recommendation]
                            }
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>

      {/* Right column: record things */}
      <div className="space-y-4">
        <Card>
          <CardHeader title="Paste their reply" subtitle="Recorded verbatim, then analysed conservatively — politeness is never read as buying intent." />
          <div className="space-y-3 p-4">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={6}
              placeholder="Paste the reply exactly as they wrote it…"
              aria-label="Their reply"
            />
            <Button variant="primary" className="w-full" disabled={replyText.trim().length < 1 || pending} onClick={submitReply}>
              {pending ? "Analysing…" : "Record & analyse reply"}
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Log an interaction" />
          <div className="flex gap-2 p-4">
            {(["note", "call", "meeting"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                className="flex-1 capitalize"
                onClick={() => {
                  setNoteType(t);
                  setNoteOpen(true);
                }}
              >
                {t === "note" ? <StickyNote className="h-3.5 w-3.5" /> : t === "call" ? <Phone className="h-3.5 w-3.5" /> : <Users2 className="h-3.5 w-3.5" />}
                {t}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      {/* Note modal */}
      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title={`Log a ${noteType}`}>
        <Field label={noteType === "note" ? "Note" : `What happened on the ${noteType}?`} required>
          <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setNoteOpen(false)}>Cancel</Button>
          <Button variant="primary" disabled={noteText.trim().length < 2 || pending} onClick={submitNote}>
            Save
          </Button>
        </div>
      </Modal>

      {/* Reclassify modal */}
      <Modal open={!!reclass} onClose={() => setReclass(null)} title="Reclassify this reply">
        <Field label="Classification">
          <Select value={reclassTo} onChange={(e) => setReclassTo(e.target.value as ReplyClassification)}>
            {REPLY_CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {REPLY_CLASSIFICATION_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reason" hint="Recorded with the analysis — human judgement wins, but leaves a trail." className="mt-3" required>
          <Textarea value={reclassReason} onChange={(e) => setReclassReason(e.target.value)} rows={2} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setReclass(null)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={reclassReason.trim().length < 3 || pending}
            onClick={() => {
              const a = reclass!;
              setReclass(null);
              startTransition(async () => {
                const res = await reclassifyReplyAction({ analysisId: a.id, leadId: lead.id, classification: reclassTo, reason: reclassReason.trim() });
                if (res.ok) {
                  toast("Reclassified — your judgement is now on record.");
                  router.refresh();
                } else toast(res.error ?? "Couldn't reclassify", "error");
              });
            }}
          >
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
