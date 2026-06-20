import { Nav, Footer } from "../App";
import { useJSON, num } from "../lib/data";
import type { ProblemLite } from "../lib/agent";

type Stats = { papers: number; problems_ingested: number; citations: number; authors: number };
type Frontier = { id: string; short: string; name: string; growth: number };
type Report = { frontiers: Frontier[]; bridges: { n1: string; n2: string; s1: string; s2: string }[] };
type Landmark = { seq: number; title: string; year: number; cited_by_count: number | null; problem_id: string | null; in_corpus: number };

export default function Dashboard() {
  const { data: stats } = useJSON<Stats>("/data/stats.json");
  const { data: opps } = useJSON<Report>("/data/opportunities.json");
  const { data: problems } = useJSON<ProblemLite[]>("/data/problems.json");
  const { data: landmarks } = useJSON<Landmark[]>("/data/landmarks.json");

  const tiles = stats ? [
    [num(stats.papers), "Papers"], [String(stats.problems_ingested), "Problems"],
    [num(stats.citations), "Citations"], [num(stats.authors), "Authors"],
  ] : [];
  const biggest = [...(problems || [])].sort((a, b) => b.n_papers - a.n_papers).slice(0, 6);
  const recent = [...(landmarks || [])].filter((l) => l.year >= 2012).sort((a, b) => (b.cited_by_count || 0) - (a.cited_by_count || 0)).slice(0, 5);

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <main>
        <section className="border-b border-line">
          <div className="container-1180 py-14">
            <div className="flex items-center gap-3">
              <span className="index-num">07</span>
              <span className="eyebrow">Dashboard</span>
            </div>
            <h1 className="display mt-4 text-[clamp(32px,4.4vw,52px)] text-ink">
              The corpus at a <span className="serif-it text-accent">glance</span>.
            </h1>
          </div>
        </section>

        {/* tiles */}
        <section className="border-b border-line">
          <div className="container-1180 grid grid-cols-2 md:grid-cols-4">
            {tiles.map(([n, l], i) => (
              <div key={l} className={`py-9 pl-6 ${i % 2 === 1 ? "border-l border-line" : ""} ${i > 0 ? "md:border-l md:border-line" : ""}`}>
                <div className="font-serif text-[32px] leading-none tracking-tight text-ink">{n}</div>
                <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-faint">{l}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="container-1180 grid grid-cols-1 gap-5 py-12 lg:grid-cols-12">
          <Widget className="lg:col-span-6" title="Fastest-growing problems" to="#/scientist">
            {(opps?.frontiers || []).slice(0, 6).map((f, i) => (
              <Row key={f.id} href={`#/problem/${f.short}`} i={i}>
                <span className="truncate text-[13.5px] text-ink">{f.name}</span>
                <span className="ml-auto font-mono text-[11px] text-accent">{Math.round(f.growth * 100)}%</span>
              </Row>
            ))}
          </Widget>

          <Widget className="lg:col-span-6" title="Largest problems" to="#/explore">
            {biggest.map((p, i) => (
              <Row key={p.id} href={`#/problem/${p.short}`} i={i}>
                <span className="truncate text-[13.5px] text-ink">{p.name}</span>
                <span className="ml-auto font-mono text-[11px] text-faint">{num(p.n_papers)}p</span>
              </Row>
            ))}
          </Widget>

          <Widget className="lg:col-span-7" title="Recent landmark papers" to="#/landmarks">
            {recent.map((l, i) => {
              const short = l.problem_id ? l.problem_id.split("/").pop() : null;
              const inner = (
                <>
                  <span className="font-mono text-[11px] text-accent">{l.year}</span>
                  <span className="truncate text-[13px] text-ink">{l.title}</span>
                  <span className="ml-auto font-mono text-[11px] text-faint">{num(l.cited_by_count || 0)}</span>
                </>
              );
              return short ? <Row key={l.seq} href={`#/problem/${short}`} i={i}>{inner}</Row> : <Row key={l.seq} i={i}>{inner}</Row>;
            })}
          </Widget>

          <Widget className="lg:col-span-5" title="Cross-field opportunities" to="#/scientist">
            {(opps?.bridges || []).slice(0, 4).map((b, i) => (
              <div key={i} className={`flex flex-wrap items-center gap-1.5 px-4 py-3 text-[12.5px] ${i ? "border-t border-line" : ""}`}>
                <a href={`#/problem/${b.s1}`} className="text-ink hover:text-accent">{b.n1}</a>
                <span className="text-accent">⇄</span>
                <a href={`#/problem/${b.s2}`} className="text-ink hover:text-accent">{b.n2}</a>
              </div>
            ))}
          </Widget>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Widget({ title, to, className = "", children }: { title: string; to: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-line bg-surface ${className}`}>
      <a href={to} className="flex items-center justify-between border-b border-line px-4 py-3 hover:bg-surface-2">
        <span className="eyebrow">{title}</span>
        <span className="text-faint">→</span>
      </a>
      <div>{children}</div>
    </div>
  );
}

function Row({ href, i, children }: { href?: string; i: number; children: React.ReactNode }) {
  const cls = `flex items-center gap-3 px-4 py-2.5 ${i ? "border-t border-line" : ""}`;
  return href ? <a href={href} className={`${cls} hover:bg-surface-2`}>{children}</a> : <div className={cls}>{children}</div>;
}
