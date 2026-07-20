import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { ArrowRight, MessagesSquare } from "lucide-react";
import { getDb } from "@/db";
import { conversationEntries, conversations, leads, replyAnalyses } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Badge, Card, DemoBadge, EmptyState, PageHeader, cn } from "@/components/ui";
import {
  CONVERSATION_STAGE_LABELS,
  REPLY_CLASSIFICATION_LABELS,
  type ReplyClassification,
} from "@/lib/constants";
import { fmtRelative, truncate } from "@/lib/format";

export const metadata = { title: "Conversations" };

const engagedClasses: ReplyClassification[] = ["positive", "curious", "qualified_problem", "meeting_ready", "referral"];

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireUser();
  const { filter } = await searchParams;
  const db = getDb();

  const convs = db
    .select({
      id: conversations.id,
      leadId: conversations.leadId,
      isPeer: conversations.isPeerConversation,
      lastEntryAt: conversations.lastEntryAt,
      leadName: leads.fullName,
      leadTitle: leads.jobTitle,
      stage: leads.conversationStage,
      sentiment: leads.replySentiment,
      status: leads.status,
      dataSource: leads.dataSource,
      dnc: leads.doNotContact,
    })
    .from(conversations)
    .innerJoin(leads, eq(conversations.leadId, leads.id))
    .orderBy(desc(conversations.lastEntryAt))
    .all()
    .filter((c) => !c.dnc);

  // Last entry per conversation to work out who spoke last.
  const lastEntries = new Map<string, { direction: string; content: string; occurredAt: Date }>();
  if (convs.length) {
    const entries = db
      .select({
        conversationId: conversationEntries.conversationId,
        direction: conversationEntries.direction,
        content: conversationEntries.content,
        occurredAt: conversationEntries.occurredAt,
      })
      .from(conversationEntries)
      .where(inArray(conversationEntries.conversationId, convs.map((c) => c.id)))
      .orderBy(desc(conversationEntries.occurredAt))
      .all();
    for (const e of entries) {
      if (!lastEntries.has(e.conversationId)) lastEntries.set(e.conversationId, e);
    }
  }

  const qualifiedLeads = new Set(
    db
      .select({ leadId: replyAnalyses.leadId })
      .from(replyAnalyses)
      .where(eq(replyAnalyses.classification, "qualified_problem"))
      .all()
      .map((r) => r.leadId),
  );

  let list = convs.filter((c) => lastEntries.has(c.id));
  if (filter === "awaiting") list = list.filter((c) => lastEntries.get(c.id)!.direction === "inbound");
  if (filter === "qualified") list = list.filter((c) => qualifiedLeads.has(c.leadId));
  if (filter === "peers") list = list.filter((c) => c.isPeer);

  const awaitingCount = convs.filter((c) => lastEntries.get(c.id)?.direction === "inbound").length;

  const filters = [
    { key: undefined, label: `All (${convs.length})` },
    { key: "awaiting", label: `Awaiting your response (${awaitingCount})` },
    { key: "qualified", label: "Qualified problems" },
    { key: "peers", label: "Peer conversations" },
  ];

  return (
    <div>
      <PageHeader
        title="Conversations"
        subtitle="Every live thread in one place. Replies awaiting a response are where momentum lives — clear those first."
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.key ? `/conversations?filter=${f.key}` : "/conversations"}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              filter === f.key ? "border-accent/40 bg-accent-soft text-accent-bright" : "border-line-strong text-muted hover:text-text",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MessagesSquare />}
            title={filter ? "Nothing matches this filter" : "No conversations yet"}
            body={
              filter
                ? "Try another filter."
                : "Conversations start when you mark a message as sent or record a reply on a lead."
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line/60">
            {list.map((c) => {
              const last = lastEntries.get(c.id)!;
              const awaiting = last.direction === "inbound";
              return (
                <li key={c.id}>
                  <Link href={`/leads/${c.leadId}?tab=conversation`} className="group flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-raised/70">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-medium text-text group-hover:text-accent-bright">
                        {c.leadName}
                        {c.dataSource === "demo" ? <DemoBadge /> : null}
                        {awaiting ? <Badge tone="coral">Awaiting your response</Badge> : <Badge tone="grey">You spoke last</Badge>}
                        {c.isPeer ? <Badge tone="violet">Peer</Badge> : null}
                        {c.sentiment ? (
                          <Badge tone={engagedClasses.includes(c.sentiment) ? "green" : "grey"}>
                            {REPLY_CLASSIFICATION_LABELS[c.sentiment]}
                          </Badge>
                        ) : null}
                      </p>
                      <p className="mt-1 truncate text-[12.5px] text-muted">
                        <span className="text-dim">{last.direction === "inbound" ? "Them: " : last.direction === "outbound" ? "You: " : "Note: "}</span>
                        {truncate(last.content.replaceAll("\n", " "), 120)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {c.stage ? <span className="text-[11.5px] text-cyan">{CONVERSATION_STAGE_LABELS[c.stage]}</span> : null}
                      <span className="text-[11px] text-dim">{c.lastEntryAt ? fmtRelative(c.lastEntryAt) : ""}</span>
                      <ArrowRight className="h-4 w-4 text-dim group-hover:text-accent-bright" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
