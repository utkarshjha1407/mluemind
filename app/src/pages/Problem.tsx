import { Nav, Footer } from "../App";
import { useJSON, num } from "../lib/data";

type Paper = { id: string; title: string; year: number; cited_by_count: number; venue?: string; doi?: string };
type Detail = {
  problem: { name: string; description?: string; subfield_id?: string };
  summary: { papers: number; citations: number; first_year: number; last_year: number };
  timeline: { year: number; papers: number; citations: number }[];
  milestones: Paper[];
  frontier: Paper[];
  key_authors: { name: string; papers: number; citations: number }[];
  related: { id: string; name: string; weight: number; short: string }[];
  subproblems: { name: string; n_papers: number; backend: string }[];
};

export default function Problem({ short }: { short: string }) {
  const { data, loading } = useJSON<Detail>(`/data/problem/${short}.json`);

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <main>
        {loading && <div className="container-1180 py-32 text-center font-mono text-[13px] text-faint">Loading…</div>}
        {data && (
          <>
            {/* overview */}
            <section className="border-b border-line">
              <div className="container-1180 py-14">
                <nav className="flex items-center gap-2 font-mono text-[11px] text-faint">
                  <a href="#/explore" className="hover:text-ink">Explore</a>
                  <span>/</span>
                  <span className="text-muted">Problem</span>
                </nav>
                <h1 className="display mt-5 max-w-[20ch] text-[clamp(34px,5vw,60px)] text-ink">{data.problem.name}</h1>
                {data.problem.description && (
                  <p className="mt-5 max-w-[68ch] text-[17px] leading-relaxed text-muted">{data.problem.description}</p>
                )}
                <div className="mt-9 flex flex-wrap gap-x-12 gap-y-4">
                  <Stat n={num(data.summary.papers)} l="Papers" />
                  <Stat n={num(data.summary.citations)} l="Citations" />
                  <Stat n={`${data.summary.first_year}–${data.summary.last_year}`} l="Active span" />
                  <Stat n={String(data.subproblems.length)} l="Sub-problems" />
                </div>
              </div>
            </section>

            {/* evolution */}
            <Section idx="01" title="Evolution">
              <Timeline tl={data.timeline} />
            </Section>

            {/* breakthroughs + frontier */}
            <Section idx="02" title="Breakthroughs & frontier">
              <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-2">
                <PaperList label="Most-cited" papers={data.milestones.slice(0, 6)} />
                <PaperList label="Recent frontier" papers={data.frontier.slice(0, 6)} />
              </div>
            </Section>

            {/* sub-problems */}
            {data.subproblems.length > 0 && (
              <Section idx="03" title="Sub-problems found by reading the papers">
                <div className="flex flex-wrap gap-2.5">
                  {data.subproblems.map((s) => (
                    <span key={s.name} className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] text-ink">
                      {s.name}
                      <span className="font-mono text-[11px] text-accent">{s.n_papers}</span>
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* researchers + related */}
            <Section idx="04" title="People & connections">
              <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-2">
                <div>
                  <Label>Key researchers</Label>
                  <div className="mt-3 overflow-hidden rounded-lg border border-line">
                    {data.key_authors.slice(0, 7).map((a, i) => (
                      <div key={a.name} className={`flex items-center justify-between px-4 py-2.5 ${i ? "border-t border-line" : ""}`}>
                        <span className="text-[13.5px] text-ink">{a.name}</span>
                        <span className="font-mono text-[11px] text-faint">{num(a.citations)} cites · {a.papers}p</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Draws on</Label>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {data.related.map((r) => (
                      <a key={r.id} href={`#/problem/${r.short}`} className="group flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] text-muted hover:border-accent/40 hover:text-ink">
                        {r.name}
                        <span className="font-mono text-[11px] text-accent">{r.weight}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-serif text-[28px] leading-none tracking-tight text-ink">{n}</div>
      <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-faint">{l}</div>
    </div>
  );
}

function Section({ idx, title, children }: { idx: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line">
      <div className="container-1180 py-14">
        <div className="flex items-center gap-3">
          <span className="index-num">{idx}</span>
          <h2 className="display text-[26px] text-ink">{title}</h2>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

function Timeline({ tl }: { tl: Detail["timeline"] }) {
  if (!tl.length) return <p className="font-mono text-[12px] text-faint">No dated papers.</p>;
  const max = Math.max(...tl.map((t) => t.papers));
  return (
    <div>
      <div className="flex h-[140px] items-end gap-[3px]">
        {tl.map((t) => (
          <div key={t.year} className="group relative flex-1" title={`${t.year}: ${t.papers} papers`}>
            <div className="w-full rounded-sm bg-accent/85 transition group-hover:bg-accent" style={{ height: `${Math.max(2, (t.papers / max) * 140)}px` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-faint">
        <span>{tl[0].year}</span>
        <span>{tl[tl.length - 1].year}</span>
      </div>
    </div>
  );
}

function PaperList({ label, papers }: { label: string; papers: Paper[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-3 divide-y divide-line border-y border-line">
        {papers.map((p) => (
          <div key={p.id} className="flex gap-4 py-3.5">
            <span className="w-14 shrink-0 text-right font-mono text-[12px] text-accent">{num(p.cited_by_count)}</span>
            <div className="min-w-0">
              <div className="text-[14px] leading-snug text-ink">{p.title}</div>
              <div className="mt-1 font-mono text-[11px] text-faint">
                {p.year}{p.venue ? ` · ${p.venue}` : ""}
                {p.doi && <> · <a href={p.doi} target="_blank" rel="noreferrer" className="text-muted hover:text-accent">link ↗</a></>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
