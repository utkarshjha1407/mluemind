import { Nav, Footer } from "../App";
import { useJSON, num } from "../lib/data";

type Landmark = {
  seq: number; title: string; authors: string; year: number; field: string; why: string;
  cited_by_count: number | null; doi: string | null; in_corpus: number; problem_id: string | null;
};

export default function Landmarks() {
  const { data } = useJSON<Landmark[]>("/data/landmarks.json");
  const groups: Record<string, Landmark[]> = {};
  (data || []).forEach((l) => {
    const dec = `${Math.floor(l.year / 10) * 10}s`;
    (groups[dec] ||= []).push(l);
  });
  const decades = Object.keys(groups).sort();

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <main>
        <section className="border-b border-line">
          <div className="container-1180 py-14">
            <div className="flex items-center gap-3">
              <span className="index-num">05</span>
              <span className="eyebrow">The Canon</span>
            </div>
            <h1 className="display mt-4 text-[clamp(32px,4.4vw,52px)] text-ink">
              Papers that <span className="serif-it text-accent">mattered</span>.
            </h1>
            <p className="mt-4 max-w-[64ch] text-[16.5px] leading-relaxed text-muted">
              The handful of papers that bent the trajectory of computing — from Turing’s machine to
              the Transformer. Citation counts are live from OpenAlex.
            </p>
          </div>
        </section>

        <section className="container-1180 py-12">
          {decades.map((dec) => (
            <div key={dec} className="mb-10">
              <div className="mb-4 border-b border-line pb-2 font-mono text-[12px] tracking-widest text-accent">{dec}</div>
              <div className="divide-y divide-line">
                {groups[dec].map((l) => {
                  const short = l.problem_id ? l.problem_id.split("/").pop() : null;
                  return (
                    <div key={l.seq} className="flex flex-col gap-4 py-5 sm:flex-row">
                      <div className="w-16 shrink-0 font-mono text-[15px] text-accent">{l.year}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-serif text-[19px] leading-snug text-ink">{l.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span className="text-[13px] text-muted">{l.authors}</span>
                          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-faint">{l.field}</span>
                          {l.cited_by_count != null && <span className="font-mono text-[11px] text-faint">{num(l.cited_by_count)} citations</span>}
                          {l.doi && <a href={l.doi} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-accent hover:underline">paper ↗</a>}
                          {l.in_corpus && short && <a href={`#/problem/${short}`} className="rounded-full border border-success/40 px-2 py-0.5 font-mono text-[10px] text-success">in corpus →</a>}
                        </div>
                        <p className="mt-2.5 max-w-[80ch] text-[14px] leading-relaxed text-muted">{l.why}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
