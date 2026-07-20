import { requireUser } from "@/lib/auth";
import { buildExecutionQueue } from "@/server/execution";
import { ExecutionMode } from "@/components/execute/execution-mode";

export const metadata = { title: "Daily Execution Mode" };

export default async function ExecutePage() {
  await requireUser();
  const queue = buildExecutionQueue();
  return <ExecutionMode initialQueue={queue} />;
}
