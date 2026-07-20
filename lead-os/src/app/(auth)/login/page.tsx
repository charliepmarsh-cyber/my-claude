import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, hasAnyUser } from "@/lib/auth";
import { AuthShell } from "../shell";
import { AuthForm } from "../auth-form";
import { loginAction } from "../actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");
  if (!hasAnyUser()) redirect("/setup");

  return (
    <AuthShell title="Sign in" subtitle="Access the CPM Growth Systems command centre.">
      <AuthForm action={loginAction} mode="login" />
    </AuthShell>
  );
}
