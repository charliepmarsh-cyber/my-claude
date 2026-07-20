"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[lead-os]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="max-w-md p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-warn" />
        <h1 className="mt-3 font-display text-[17px] font-bold text-text">Something went wrong</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          The page hit an unexpected error. Your data is safe — nothing was lost. Try again, and if it keeps
          happening check the terminal running the app for details.
        </p>
        {error.digest ? <p className="mt-2 text-[11px] text-dim">Reference: {error.digest}</p> : null}
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Button onClick={() => (window.location.href = "/")}>Go to Command Centre</Button>
        </div>
      </Card>
    </div>
  );
}
