import { useMemo, useState } from "react";
import { Nav, Footer } from "../App";
import { useJSON, num } from "../lib/data";

type Node = { id: string; name: string; subfield_id: string; n_papers: number; short: string };
type Edge = { src: string; dst: string; weight: number };
type Universe = { nodes: Node[]; edges: Edge[] };

const W = 760, H = 640, CX = W / 2, CY = H / 2, R = 250;

export default function Graph() {
  const { data } = useJSON<Universe>("/data/universe.json");
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number; ang: number; r: number }>();
    if (!data) return m;
    const nodes = [...data.nodes].sort((a, b) => (a.subfield_id || "").localeCompare(b.subfield_id || "") || b.n_papers - a.n_papers);
    const maxP = Math.max(1, ...nodes.map((n) => n.n_papers));
    nodes.forEach((n, i) => {
      const ang = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      m.set(n.id, { x: CX + R * Math.cos(ang), y: CY + R * Math.sin(ang), ang, r: 5 + Math.sqrt(n.n_papers / maxP) * 13 });
    });
    return m;
  }, [data]);

  const focus = sel || hover;
  const connected = useMemo(() => {
    const s = new Set<string>();
    if (focus && data) for (const e of data.edges) { if (e.src === focus) s.add(e.dst); if (e.dst === focus) s.add(e.src); }
    return s;
  }, [focus, data]);

  const nodeById = useMemo(() => new Map((data?.nodes || []).map((n) => [n.id, n])), [data]);
  const selNode = sel ? nodeById.get(sel) : null;
  const selEdges = useMemo(() => {
    if (!sel || !data) return [];
    return data.edges
      .filter((e) => e.src === sel || e.dst === sel)
      .map((e) => ({ other: e.src === sel ? e.dst : e.src, weight: e.weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8);
  }, [sel, data]);

  const maxW = Math.max(1, ...((data?.edges || []).map((e) => e.weight)));

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <main>
        <section className="border-b border-line">
          <div className="container-1180 py-12">
            <div className="flex items-center gap-3">
              <span className="index-num">04</span>
              <span className="eyebrow">Knowledge Graph</span>
            </div>
            <h1 className="display mt-4 text-[clamp(30px,4vw,48px)] text-ink">
              How problems <span className="serif-it text-accent">connect</span>.
            </h1>
            <p className="mt-4 max-w-[64ch] text-[16px] leading-relaxed text-muted">
              Every problem is a node, sized by volume of work. Each line is citation flow between
              problems — the cross-disciplinary graph, scoped to computer science.
            </p>
          </div>
        </section>

        <section className="container-1180 grid grid-cols-1 gap-8 py-10 lg:grid-cols-[1fr_300px]">
          <div className="rounded-2xl border border-line bg-surface p-2">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
              {data?.edges.map((e, i) => {
                const a = pos.get(e.src), b = pos.get(e.dst);
                if (!a || !b) return null;
                const dim = focus && !(e.src === focus || e.dst === focus);
                return (
                  <path key={i} d={`M${a.x},${a.y} Q${CX},${CY} ${b.x},${b.y}`} fill="none"
                        stroke="var(--accent)" strokeWidth={0.4 + (e.weight / maxW) * 3}
                        opacity={dim ? 0.04 : 0.1 + (e.weight / maxW) * 0.35} />
                );
              })}
              {data?.nodes.map((n) => {
                const p = pos.get(n.id)!;
                const isFocus = focus === n.id;
                const near = !focus || isFocus || connected.has(n.id);
                const right = Math.cos(p.ang) >= 0;
                return (
                  <g key={n.id} style={{ cursor: "pointer", opacity: near ? 1 : 0.25 }}
                     onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
                     onClick={() => setSel(sel === n.id ? null : n.id)}>
                    <circle cx={p.x} cy={p.y} r={p.r} fill={isFocus ? "var(--accent)" : "var(--surface)"}
                            stroke="var(--accent)" strokeWidth={isFocus ? 2 : 1.2} />
                    <text x={p.x + (right ? p.r + 5 : -(p.r + 5))} y={p.y + 3}
                          textAnchor={right ? "start" : "end"} fontSize="9.5"
                          fill={isFocus ? "var(--ink)" : "var(--muted)"} fontWeight={isFocus ? 600 : 400}>
                      {n.name.length > 26 ? n.name.slice(0, 25) + "…" : n.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <aside className="lg:pt-2">
            {selNode ? (
              <div className="sticky top-[80px] rounded-xl border border-line bg-surface p-5">
                <span className="eyebrow">Selected</span>
                <h3 className="display mt-2 text-[20px] leading-snug text-ink">{selNode.name}</h3>
                <div className="mt-1 font-mono text-[11px] text-faint">{num(selNode.n_papers)} papers</div>
                <a href={`#/problem/${selNode.short}`} className="mt-4 inline-block rounded-md bg-ink px-3 py-2 text-[13px] font-medium text-paper">Open problem →</a>
                {selEdges.length > 0 && (
                  <>
                    <div className="eyebrow mt-6">Strongest links</div>
                    <div className="mt-2 space-y-1.5">
                      {selEdges.map((e) => {
                        const o = nodeById.get(e.other);
                        return o ? (
                          <button key={e.other} onClick={() => setSel(e.other)} className="flex w-full items-center justify-between text-left text-[12.5px] text-muted hover:text-ink">
                            <span className="truncate">{o.name}</span>
                            <span className="ml-2 font-mono text-[11px] text-accent">{e.weight}</span>
                          </button>
                        ) : null;
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line p-5 text-[13.5px] leading-relaxed text-muted">
                Hover to trace a problem’s connections. Click a node to pin it and open its page.
              </div>
            )}
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}
