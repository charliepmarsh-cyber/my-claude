"use client";

import { useActionState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import type { AuthState } from "./actions";

export function AuthForm({
  action,
  mode,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  mode: "login" | "setup";
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "setup" ? (
        <Field label="Your name" required>
          <Input name="name" autoComplete="name" required maxLength={120} placeholder="Charlie Marshall" />
        </Field>
      ) : null}
      <Field label="Email" required>
        <Input name="email" type="email" autoComplete="email" required placeholder="you@cpmgrowthsystems.com" />
      </Field>
      <Field label="Password" required hint={mode === "setup" ? "At least 10 characters. Stored as a scrypt hash." : undefined}>
        <Input
          name="password"
          type="password"
          autoComplete={mode === "setup" ? "new-password" : "current-password"}
          required
          minLength={mode === "setup" ? 10 : 1}
        />
      </Field>
      {mode === "setup" ? (
        <Field label="Confirm password" required>
          <Input name="confirm" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
      ) : null}

      {state?.error ? (
        <p role="alert" className="flex items-start gap-2 rounded-(--radius-control) border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12.5px] text-danger">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="md" className="w-full" disabled={pending}>
        {pending ? "Working…" : mode === "setup" ? "Create founder account" : "Sign in"}
      </Button>
    </form>
  );
}
