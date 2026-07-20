import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { ToastProvider } from "@/components/toast";
import { Shell } from "@/components/shell";
import { logoutAction } from "@/app/(auth)/actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <ToastProvider>
      <Shell userName={user.name} logout={logoutAction}>
        {children}
      </Shell>
    </ToastProvider>
  );
}
