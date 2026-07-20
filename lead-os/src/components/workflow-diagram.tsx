import type { WorkflowEdge, WorkflowNode } from "@/db/schema";
import type { NodeKind } from "@/lib/constants";

/**
 * Deterministic SVG workflow diagram.
 *
 * Main path laid out left-to-right; failure/retry/fallback lane below.
 * Server-rendered — predictable, printable, zero client JS.
 */

const KIND_STYLE: Record<NodeKind, { fill: string; stroke: string; text: string; label: string }> = {
  trigger: { fill: "rgba(34,211,238,0.10)", stroke: "#22d3ee", text: "#22d3ee", label: "Trigger" },
  deterministic: { fill: "rgba(37,99,235,0.12)", stroke: "#3b82f6", text: "#93b8fb", label: "Deterministic" },
  ai: { fill: "rgba(167,139,250,0.12)", stroke: "#a78bfa", text: "#c4b5fd", label: "AI-assisted" },
  human_review: { fill: "rgba(251,191,36,0.12)", stroke: "#fbbf24", text: "#fbbf24", label: "Human review" },
  output: { fill: "rgba(52,211,153,0.12)", stroke: "#34d399", text: "#34d399", label: "Output" },
  failure: { fill: "rgba(248,113,113,0.10)", stroke: "#f87171", text: "#f87171", label: "Failure path" },
  retry: { fill: "rgba(248,113,113,0.06)", stroke: "#fda4af", text: "#fda4af", label: "Retry" },
  fallback: { fill: "rgba(255,107,94,0.10)", stroke: "#ff6b5e", text: "#ff9d94", label: "Manual fallback" },
  audit: { fill: "rgba(154,167,189,0.10)", stroke: "#9aa7bd", text: "#9aa7bd", label: "Audit" },
};

const MAIN_KINDS: NodeKind[] = ["trigger", "deterministic", "ai", "human_review", "output", "audit"];
const NODE_W = 148;
const NODE_H = 54;
const GAP_X = 42;
const LANE_Y = 30;
const FAIL_Y = 150;

export function WorkflowDiagram({ nodes, edges }: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) {
  const main = nodes.filter((n) => MAIN_KINDS.includes(n.kind)).sort((a, b) => a.sortOrder - b.sortOrder);
  const fail = nodes.filter((n) => !MAIN_KINDS.includes(n.kind)).sort((a, b) => a.sortOrder - b.sortOrder);

  const pos = new Map<string, { x: number; y: number }>();
  main.forEach((n, i) => pos.set(n.nodeKey, { x: 20 + i * (NODE_W + GAP_X), y: LANE_Y }));
  const failStartX = 20 + Math.max(1, Math.floor(main.length / 4)) * (NODE_W + GAP_X);
  fail.forEach((n, i) => pos.set(n.nodeKey, { x: failStartX + i * (NODE_W + GAP_X), y: FAIL_Y }));

  const width = Math.max(20 + main.length * (NODE_W + GAP_X), failStartX + fail.length * (NODE_W + GAP_X)) + 20;
  const height = FAIL_Y + NODE_H + 40;

  const centre = (key: string) => {
    const p = pos.get(key);
    return p ? { cx: p.x + NODE_W / 2, cy: p.y + NODE_H / 2, ...p } : null;
  };

  const usedKinds = [...new Set(nodes.map((n) => n.kind))];

  return (
    <div className="overflow-x-auto rounded-(--radius-control) border border-line bg-bg/60 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Workflow diagram with human review, failure, retry and fallback paths" className="max-w-none">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#66738c" />
          </marker>
          <marker id="arrow-fail" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#f87171" />
          </marker>
        </defs>

        {edges.map((e) => {
          const from = centre(e.fromKey);
          const to = centre(e.toKey);
          if (!from || !to) return null;
          const isFailKind = e.kind !== "normal";
          const sameLane = Math.abs(from.cy - to.cy) < 4;
          let d: string;
          let labelX: number;
          let labelY: number;
          if (sameLane && to.cx > from.cx) {
            d = `M ${from.x + NODE_W} ${from.cy} L ${to.x} ${to.cy}`;
            labelX = (from.x + NODE_W + to.x) / 2;
            labelY = from.cy - 6;
          } else if (sameLane) {
            // Backwards edge (retry loop) — arc above the lane.
            const arcY = from.cy - 44;
            d = `M ${from.cx} ${from.y} C ${from.cx} ${arcY}, ${to.cx} ${arcY}, ${to.cx} ${to.y}`;
            labelX = (from.cx + to.cx) / 2;
            labelY = arcY + 40;
          } else if (to.cy > from.cy) {
            d = `M ${from.cx} ${from.y + NODE_H} C ${from.cx} ${from.y + NODE_H + 30}, ${to.cx} ${to.y - 30}, ${to.cx} ${to.y}`;
            labelX = (from.cx + to.cx) / 2;
            labelY = (from.y + NODE_H + to.y) / 2 + 4;
          } else {
            d = `M ${from.cx} ${from.y} C ${from.cx} ${from.y - 30}, ${to.cx} ${to.y + NODE_H + 30}, ${to.cx} ${to.y + NODE_H}`;
            labelX = (from.cx + to.cx) / 2;
            labelY = (from.y + to.y + NODE_H) / 2;
          }
          return (
            <g key={e.id}>
              <path
                d={d}
                fill="none"
                stroke={isFailKind ? "#f87171" : "#66738c"}
                strokeWidth={1.3}
                strokeDasharray={isFailKind ? "4 3" : undefined}
                markerEnd={isFailKind ? "url(#arrow-fail)" : "url(#arrow)"}
                opacity={isFailKind ? 0.75 : 0.9}
              />
              {e.label ? (
                <text x={labelX} y={labelY} textAnchor="middle" fontSize="8.5" fill={isFailKind ? "#fda4af" : "#9aa7bd"}>
                  {e.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {nodes.map((n) => {
          const p = pos.get(n.nodeKey);
          if (!p) return null;
          const s = KIND_STYLE[n.kind];
          return (
            <g key={n.id}>
              <title>{`${n.label} — ${s.label}${n.description ? `. ${n.description}` : ""}`}</title>
              <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={9} fill={s.fill} stroke={s.stroke} strokeWidth={1.4} />
              <text x={p.x + NODE_W / 2} y={p.y + 22} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#e8eef8">
                {n.label.length > 24 ? `${n.label.slice(0, 23)}…` : n.label}
              </text>
              <text x={p.x + NODE_W / 2} y={p.y + 38} textAnchor="middle" fontSize="8.5" fill={s.text}>
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 pt-1 pb-1">
        {usedKinds.map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-[10.5px] text-muted">
            <span className="h-2.5 w-2.5 rounded-sm border" style={{ background: KIND_STYLE[k].fill, borderColor: KIND_STYLE[k].stroke }} />
            {KIND_STYLE[k].label}
          </span>
        ))}
      </div>
    </div>
  );
}
