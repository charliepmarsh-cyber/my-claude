"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  clearLoginAttempts,
  createSessionCookie,
  destroySession,
  hashPassword,
  hasAnyUser,
  loginRateLimited,
  recordLoginAttempt,
  verifyPassword,
} from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { newId } from "@/lib/ids";

export type AuthState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const key = await clientKey();
  if (loginRateLimited(key)) {
    return { error: "Too many attempts. Please wait 10 minutes and try again." };
  }
  recordLoginAttempt(key);

  const db = getDb();
  const user = db.select().from(users).where(eq(users.email, parsed.data.email)).get();
  // Constant response whether the account exists or the password is wrong.
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { error: "Email or password is incorrect." };
  }

  clearLoginAttempts(key);
  await createSessionCookie(user.id);
  logActivity({ entity: "auth", action: "login", actor: "user" });
  redirect("/");
}

const setupSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z.string().min(10, "Use at least 10 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

export async function setupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (hasAnyUser()) return { error: "An account already exists. Sign in instead." };

  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const db = getDb();
  const id = newId("usr");
  db.insert(users)
    .values({
      id,
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: hashPassword(parsed.data.password),
      role: "founder",
    })
    .run();

  await createSessionCookie(id);
  logActivity({ entity: "auth", action: "account_created", actor: "user" });
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  logActivity({ entity: "auth", action: "logout", actor: "user" });
  redirect("/login");
}
