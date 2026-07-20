import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LEAD_STAGE_LABELS, PRIORITY_LABEL_TEXT, type LeadStage, type PriorityLabel } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Layout primitives                                                   */
/* ------------------------------------------------------------------ */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-(--radius-card) border border-line bg-surface shadow-(--shadow-card)", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-text">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-text">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-[11px] font-semibold tracking-[0.14em] text-dim uppercase", className)}>{children}</h3>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "xs" | "sm" | "md";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-bright border border-transparent shadow-[0_2px_10px_rgba(37,99,235,0.35)]",
  secondary: "bg-raised text-text hover:bg-overlay border border-line-strong",
  ghost: "bg-transparent text-muted hover:text-text hover:bg-raised border border-transparent",
  danger: "bg-danger-soft text-danger hover:bg-danger/20 border border-danger/30",
  success: "bg-success-soft text-success hover:bg-success/20 border border-success/30",
};

const buttonSizes: Record<ButtonSize, string> = {
  xs: "h-6.5 px-2 text-[11.5px] gap-1 rounded-[7px]",
  sm: "h-8 px-3 text-[12.5px] gap-1.5 rounded-(--radius-control)",
  md: "h-9.5 px-4 text-[13.5px] gap-2 rounded-(--radius-control)",
};

export function buttonCls(variant: ButtonVariant = "secondary", size: ButtonSize = "sm", className?: string): string {
  return cn(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors select-none",
    "disabled:opacity-45 disabled:pointer-events-none cursor-pointer",
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );
}

export function Button({
  variant = "secondary",
  size = "sm",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={props.type ?? "button"} className={buttonCls(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "secondary",
  size = "sm",
  className,
  href,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; className?: string }) {
  return (
    <Link href={href} className={buttonCls(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Badges & pills                                                      */
/* ------------------------------------------------------------------ */

type Tone = "blue" | "cyan" | "green" | "amber" | "red" | "grey" | "coral" | "violet";

const toneCls: Record<Tone, string> = {
  blue: "bg-accent-soft text-accent-bright border-accent/30",
  cyan: "bg-cyan/10 text-cyan border-cyan/30",
  green: "bg-success-soft text-success border-success/30",
  amber: "bg-warn-soft text-warn border-warn/30",
  red: "bg-danger-soft text-danger border-danger/30",
  grey: "bg-raised text-muted border-line-strong",
  coral: "bg-coral/10 text-coral border-coral/30",
  violet: "bg-violet-500/10 text-violet-300 border-violet-400/30",
};

export function Badge({ tone = "grey", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        toneCls[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const stageTones: Record<LeadStage, Tone> = {
  imported: "grey",
  needs_research: "amber",
  researched: "cyan",
  ready_to_contact: "blue",
  contacted: "blue",
  follow_up_due: "amber",
  replied: "green",
  nurture: "violet",
  closed_unsuitable: "grey",
};

export function StagePill({ stage }: { stage: LeadStage }) {
  return <Badge tone={stageTones[stage]}>{LEAD_STAGE_LABELS[stage]}</Badge>;
}

const priorityTones: Record<PriorityLabel, Tone> = {
  p1_contact_now: "coral",
  p2_research_first: "amber",
  p3_nurture: "violet",
  p4_low: "grey",
  peer_collaborator: "cyan",
  strategic_relationship: "blue",
  not_suitable: "grey",
  do_not_contact: "red",
};

export function PriorityPill({ priority }: { priority: PriorityLabel | null }) {
  if (!priority) return <span className="text-[11px] text-dim">—</span>;
  return <Badge tone={priorityTones[priority]}>{PRIORITY_LABEL_TEXT[priority]}</Badge>;
}

export function DemoBadge() {
  return (
    <span
      className="inline-flex items-center rounded border border-warn/40 bg-warn-soft px-1.5 py-px text-[9.5px] font-bold tracking-wider text-warn uppercase"
      title="Demonstration record — delete all demo data from Settings"
    >
      Demo
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Forms                                                               */
/* ------------------------------------------------------------------ */

export const inputCls =
  "w-full rounded-(--radius-control) border border-line-strong bg-raised px-3 py-2 text-[13.5px] text-text placeholder:text-dim focus:border-accent-bright focus:outline-none disabled:opacity-50 transition-colors";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cn(inputCls, "h-9.5", props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(inputCls, "min-h-20 leading-relaxed", props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return (
    <select {...props} className={cn(inputCls, "h-9.5 appearance-none pr-8 [&>option]:bg-raised", props.className)} />
  );
}

export function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline gap-1.5 text-[12px] font-medium text-muted">
        {label}
        {required ? <span className="text-coral">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11.5px] leading-snug text-dim">{hint}</span> : null}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Data display                                                        */
/* ------------------------------------------------------------------ */

export function KV({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-[12.5px] text-dim">{label}</span>
      <span className="min-w-0 text-right text-[12.5px] break-words text-text">{children}</span>
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  tone = "blue",
  className,
}: {
  value: number;
  max: number;
  tone?: "blue" | "green" | "amber" | "cyan";
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const barTone = { blue: "bg-accent-bright", green: "bg-success", amber: "bg-warn", cyan: "bg-cyan" }[tone];
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-raised", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className={cn("h-full rounded-full transition-all", barTone)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function scoreTone(v: number): "green" | "cyan" | "amber" | "red" {
  if (v >= 70) return "green";
  if (v >= 50) return "cyan";
  if (v >= 30) return "amber";
  return "red";
}

export function ScoreChip({ value, label }: { value: number | null | undefined; label?: string }) {
  if (value === null || value === undefined)
    return <span className="text-[11px] text-dim">{label ? `${label}: ` : ""}—</span>;
  const tone = scoreTone(value);
  const cls = {
    green: "text-success border-success/35 bg-success-soft",
    cyan: "text-cyan border-cyan/35 bg-cyan/10",
    amber: "text-warn border-warn/35 bg-warn-soft",
    red: "text-danger border-danger/35 bg-danger-soft",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums", cls)}>
      {label ? <span className="font-normal opacity-80">{label}</span> : null}
      {value}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon ? <div className="mb-3 text-dim [&>svg]:h-8 [&>svg]:w-8">{icon}</div> : null}
      <p className="font-display text-[14.5px] font-semibold text-text">{title}</p>
      {body ? <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent-bright",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const init = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong bg-overlay font-display text-[11px] font-semibold text-muted",
        className,
      )}
    >
      {init || "?"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Explainability                                                      */
/* ------------------------------------------------------------------ */

export function SourceTag({ source }: { source: "rules" | "ai" | "human" | "hybrid" | "manual" }) {
  const map: Record<string, { label: string; tone: Tone; title: string }> = {
    rules: { label: "Rules", tone: "cyan", title: "Produced by the deterministic rules engine — fully explainable" },
    ai: { label: "AI", tone: "violet", title: "Produced by the AI provider — review before relying on it" },
    human: { label: "Manual", tone: "grey", title: "Entered by you" },
    hybrid: { label: "Rules + AI", tone: "violet", title: "Rules engine output refined by AI" },
    manual: { label: "Manual override", tone: "amber", title: "Manually overridden — see the recorded reason" },
  };
  const m = map[source];
  return (
    <Badge tone={m.tone} className="cursor-help" >
      <span title={m.title}>{m.label}</span>
    </Badge>
  );
}

export function ConfidenceTag({ level }: { level: "low" | "medium" | "high" }) {
  const tone: Tone = level === "high" ? "green" : level === "medium" ? "amber" : "grey";
  return <Badge tone={tone}>{level} confidence</Badge>;
}
