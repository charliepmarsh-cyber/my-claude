import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, isPast } from "date-fns";

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return format(d, "d MMM yyyy");
}

export function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return format(d, "d MMM yyyy, HH:mm");
}

export function fmtRelative(d: Date | null | undefined): string {
  if (!d) return "—";
  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "tomorrow";
  if (isYesterday(d)) return "yesterday";
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

export function fmtDue(d: Date | null | undefined): { text: string; overdue: boolean } {
  if (!d) return { text: "—", overdue: false };
  const overdue = isPast(d) && !isToday(d);
  return { text: fmtRelative(d), overdue };
}

export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

export function fmtPercent(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(digits)}%`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
