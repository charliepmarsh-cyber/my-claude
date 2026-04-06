import { nanoid } from "nanoid";

export interface Job {
  id: string;
  type: "discover" | "pipeline" | "redraft";
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
}

const jobs = new Map<string, Job>();
const MAX_JOBS = 100;
const MAX_CONCURRENT = 3;

export function createJob(type: Job["type"]): Job {
  // Evict oldest completed jobs if at capacity
  if (jobs.size >= MAX_JOBS) {
    for (const [id, job] of jobs) {
      if (job.status === "completed" || job.status === "failed") {
        jobs.delete(id);
        if (jobs.size < MAX_JOBS) break;
      }
    }
  }

  const job: Job = {
    id: `job_${nanoid(10)}`,
    type,
    status: "queued",
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  return job;
}

export function startJob(id: string): void {
  const job = jobs.get(id);
  if (job) {
    job.status = "running";
    job.startedAt = new Date().toISOString();
  }
}

export function completeJob(id: string, result: unknown): void {
  const job = jobs.get(id);
  if (job) {
    job.status = "completed";
    job.completedAt = new Date().toISOString();
    job.result = result;
  }
}

export function failJob(id: string, error: string): void {
  const job = jobs.get(id);
  if (job) {
    job.status = "failed";
    job.completedAt = new Date().toISOString();
    job.error = error;
  }
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function listJobs(limit = 10): Job[] {
  return [...jobs.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function hasRunningJob(type: Job["type"]): boolean {
  for (const job of jobs.values()) {
    if (job.type === type && (job.status === "running" || job.status === "queued")) {
      return true;
    }
  }
  return false;
}

export function runningJobCount(): number {
  let count = 0;
  for (const job of jobs.values()) {
    if (job.status === "running") count++;
  }
  return count;
}

/**
 * Run a function as an async job. Returns the job immediately.
 */
export function runAsync(
  type: Job["type"],
  fn: () => Promise<unknown>,
): Job {
  const job = createJob(type);
  startJob(job.id);

  fn()
    .then((result) => completeJob(job.id, result))
    .catch((err) => failJob(job.id, (err as Error).message));

  return job;
}
