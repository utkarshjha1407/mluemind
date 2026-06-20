import { useMemo, useState } from "react";
import { Nav, Footer } from "../App";
import { useJSON, num } from "../lib/data";

type Problem = {
  id: string; short: string; name: string; subfield_id: string;
  n_papers: number; cited_by_count: number;
};
type Subfield = { id: string; name: string; n_problems: number; n_papers: number };

export default function Explore() {
  const { data: problems } = useJSON<Problem[]>("/data/problems.json");
  const { data: subfields } = useJSON<Subfield[]>("/data/subfields.json");
  const [sf, setSf] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const sfName = useMemo(() => {
    const m = new Map((subfields || []).map((s) => [s.id, s.name]));
    return (id: string) => m.get(id) || "";
  }, [subfields]);

  const maxPapers = useMemo(() => Math.max(1, ...(problems || []).map((p) => p.n_papers)), [problems]);

  const shown = (problems || [])
    .filter((p) => (!sf || p.subfield_id === sf))
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.n_papers - a.n_papers);

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <main>
        {/* header band */}
        <section className="border-b border-line">
          <div className="container-1180 py-14">
            <div className="flex items-center gap-3">
              <span className="index-num">02</span>
              <span className="eyebrow">Problem Explorer</span>
            </div>
            <h1 className="display mt-4 text-[clamp(32px,4.4vw,52px)] text-ink">
              Browse by <span className="serif-it text-accent">problem</span>.
            </h1>
            <p className="mt-4 max-w-[58ch] text-[16.5px] leading-relaxed text-muted">
              {problems ? `${problems.length} research problems` : "Loading"}, ranked by the volume of
              work indexed — each a doorway into how a question evolved.
            </p>
          </div>
        </section>

        {/* controls */}
        <section className="sticky top-[60px] z-30 border-b border-line bg-paper/90 backdrop-blur">
          <div className="container-1180 flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Chip active={!sf} onClick={() => setSf(null)}>All</Chip>
              {(subfields || []).map((s) => (
                <Chip key={s.id} active={sf === s.id} onClick={() => setSf(s.id)}>
                  {s.name} <span className="text-faint">{s.n_problems}</span>
                </Chip>
              ))}
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter problems…"
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[13.5px] text-ink placeholder:text-faint focus:border-accent focus:outline-none lg:w-64"
            />
          </div>
        </section>

        {/* grid */}
        <section className="container-1180 py-12">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p, i) => (
              <a key={p.id} href={`#/problem/${p.short}`} className="group flex flex-col bg-paper p-6 transition hover:bg-surface">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">{sfName(p.subfield_id)}</span>
                  <span className="index-num text-faint">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="display mt-3 text-[19px] leading-snug text-ink group-hover:text-accent">{p.name}</h3>
                <div className="mt-auto pt-5">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(p.n_papers / maxPapers) * 100}%` }} />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between font-mono text-[11px] text-muted">
                    <span>{num(p.n_papers)} papers</span>
                    <span className="text-faint">{num(p.cited_by_count)} cites</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
          {problems && shown.length === 0 && (
            <p className="py-16 text-center font-mono text-[13px] text-faint">No problems match “{q}”.</p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[12.5px] transition ${
        active ? "border-ink bg-ink text-paper" : "border-line bg-surface text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
