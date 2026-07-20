"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { undoImportAction } from "@/server/actions/imports";

export function UndoImportButton({ importId }: { importId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="danger" onClick={() => setOpen(true)} disabled={pending}>
        <Undo2 className="h-3.5 w-3.5" /> Undo import
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Undo this import?">
        <p className="text-[13px] leading-relaxed text-muted">
          Leads created by this import will be removed (soft-deleted), and any fields it filled on existing leads
          restored to their prior values. Research or messages you added since stay attached to restored leads.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              setOpen(false);
              startTransition(async () => {
                const res = await undoImportAction({ importId });
                if (res.ok) {
                  toast(`Import undone — ${res.removed} removed, ${res.restored} restored.`);
                  router.refresh();
                } else toast(res.error ?? "Couldn't undo", "error");
              });
            }}
          >
            Undo import
          </Button>
        </div>
      </Modal>
    </>
  );
}
