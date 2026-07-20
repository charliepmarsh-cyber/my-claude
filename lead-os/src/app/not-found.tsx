import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-(--radius-card) border border-line bg-surface p-8 text-center shadow-(--shadow-card)">
        <Compass className="mx-auto h-8 w-8 text-dim" />
        <h1 className="mt-3 font-display text-[17px] font-bold text-text">Page not found</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          That page doesn&apos;t exist — the record may have been deleted, or the link is out of date.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-9 items-center rounded-(--radius-control) bg-accent px-4 text-[13px] font-medium text-white hover:bg-accent-bright"
        >
          Back to Command Centre
        </Link>
      </div>
    </main>
  );
}
