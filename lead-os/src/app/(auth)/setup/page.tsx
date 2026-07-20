import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasAnyUser } from "@/lib/auth";
import { AuthShell } from "../shell";
import { AuthForm } from "../auth-form";
import { setupAction } from "../actions";

export const metadata: Metadata = { title: "First-run setup" };
// Must check the users table on every request — never prerender.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (hasAnyUser()) redirect("/login");

  return (
    <AuthShell
      title="Welcome to your Lead Intelligence OS"
      subtitle="Create the founder account. This machine keeps all data locally in SQLite — nothing leaves it unless you configure an AI key."
    >
      <AuthForm action={setupAction} mode="setup" />
    </AuthShell>
  );
}
