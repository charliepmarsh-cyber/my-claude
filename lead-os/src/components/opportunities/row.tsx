"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import type { Opportunity } from "@/db/schema";
import {
  DELIVERY_STAGES,
  DELIVERY_STAGE_LABELS,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_STAGE_LABELS,
  type DeliveryStage,
  type OpportunityStage,
} from "@/lib/constants";
import { fmtMoney, fmtRelative } from "@/lib/format";
import { moveOpportunityStageAction, setDeliveryStageAction } from "@/server/actions/opportunities";

export function OpportunityRow({ opp, leadName, showDelivery }: { opp: Opportunity; leadName: string; showDelivery?: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [blocked, setBlocked] = useState<string[] | null>(null);
  const [lostModal, setLostModal] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const move = (stage: OpportunityStage, extra?: { lostReason?: string }) =>
    startTransition(async () => {
      const res = await moveOpportunityStageAction({ id: opp.id, stage, ...extra });
      if (res.ok) {
        toast(`Moved to ${OPPORTUNITY_STAGE_LABELS[stage]}.`);
        router.refresh();
      } else if (res.missing) setBlocked(res.missing);
      else toast(res.error ?? "Couldn't move", "error");
    });

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-text">{opp.title}</p>
        <p className="mt-0.5 text-[12px] text-dim">
          <Link href={`/leads/${opp.leadId}?tab=opportunity`} className="text-accent-bright hover:underline">
            {leadName}
          </Link>
          {" · "}
          {fmtMoney(opp.value)} · {Math.round((opp.probability ?? 0.5) * 100)}% · updated {fmtRelative(opp.updatedAt)}
          {opp.stage === "lost" && opp.lostReason ? (
            <span className="text-danger"> · lost: {opp.lostReason}</span>
          ) : null}
        </p>
      </div>

      {showDelivery && opp.stage === "won" ? (
        <label className="flex items-center gap-1.5 text-[11.5px] text-dim">
          Delivery
          <Select
            aria-label="Delivery stage"
            className="h-7.5 w-auto px-2 pr-7 text-[12px]"
            value={opp.deliveryStage ?? "scoping"}
            disabled={pending}
            onChange={(e) =>
              startTransition(async () => {
                const res = await setDeliveryStageAction({ id: opp.id, deliveryStage: e.target.value as DeliveryStage });
                if (res.ok) {
                  toast("Delivery stage updated.");
                  router.refresh();
                } else toast(res.error ?? "Couldn't update", "error");
              })
            }
          >
            {DELIVERY_STAGES.map((d) => (
              <option key={d} value={d}>
                {DELIVERY_STAGE_LABELS[d]}
              </option>
            ))}
          </Select>
        </label>
      ) : null}

      <Select
        aria-label="Opportunity stage"
        className="h-7.5 w-auto px-2 pr-7 text-[12px]"
        value={opp.stage}
        disabled={pending}
        onChange={(e) => {
          const stage = e.target.value as OpportunityStage;
          if (stage === "lost") setLostModal(true);
          else move(stage);
        }}
      >
        {OPPORTUNITY_STAGES.map((s) => (
          <option key={s} value={s}>
            {OPPORTUNITY_STAGE_LABELS[s]}
          </option>
        ))}
      </Select>

      <Modal open={!!blocked} onClose={() => setBlocked(null)} title="Stage requirements not met">
        <ul className="list-inside list-disc space-y-1.5 text-[13px] text-warn">
          {(blocked ?? []).map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setBlocked(null)}>OK</Button>
        </div>
      </Modal>

      <Modal open={lostModal} onClose={() => setLostModal(false)} title="Mark as lost">
        <Field label="Lost reason" hint="Feeds lost-reason analysis in Analytics." required>
          <Textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} rows={2} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setLostModal(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={lostReason.trim().length < 3 || pending}
            onClick={() => {
              setLostModal(false);
              move("lost", { lostReason: lostReason.trim() });
            }}
          >
            Mark lost
          </Button>
        </div>
      </Modal>
      {opp.stage === "won" && !showDelivery ? <Badge tone="green">Won</Badge> : null}
    </li>
  );
}
