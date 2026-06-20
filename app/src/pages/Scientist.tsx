import { Nav, Footer } from "../App";
import { useJSON } from "../lib/data";

type Bridge = { p1: string; n1: string; p2: string; n2: string; s1: string; s2: string; shared_authors: number; citation_flow: number; hypothesis: string };
type Frontier = { id: string; short: string; name: string; growth: number; total: number };
type Report = { disclaimer: string; bridges: Bridge[]; frontiers: Frontier[] };

export default function Scientist() {
  const { data } = useJSON<Report>("/data/opportunities.json");
  const max = Math.max(0.01, ...((data?.frontiers || []).map((f) => f.growth)));
  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <main>
        <section className="border-b border-line">
          <div className="container-1180 py-14">
            <div className="flex items-center gap-3">
              <span className="index-num">06</span>
              <span className="eyebrow">AI Scientist</span>
            </div>
            <h1 className="display mt-4 text-[clamp(32px,4.4vw,52px)] text-ink">
              Where the field could <span className="serif-it text-accent">move</span>.
            </h1>
            {data && (
              <p className="mt-4 max-w-[72ch] text-[15px] leading-relaxed text-muted">{data.disclaimer}</p>
            )}
          </div>
        </section>

        {data && (
          <>
            <section className="border-b border-line">
              <div className="container-1180 py-14">
                <div className="flex items-center gap-3">
                  <span className="index-num">01</span>
                  <h2 className="display text-[26px] text-ink">Bridge opportunities</h2>
                </div>
                <p className="mt-3 max-w-[70ch] text-[15.5px] leading-relaxed text-muted">
                  Pairs where many researchers publish in both problems, yet the two literatures barely
                  cite each other — an under-exploited connection.
                </p>
                <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {data.bridges.map((b, i) => (
                    <div key={i} className="rounded-xl border border-line bg-surface p-5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <a href={`#/problem/${b.s1}`} className="font-serif text-[16px] text-ink hover:text-accent">{b.n1}</a>
                        <span className="text-accent">⇄</span>
                        <a href={`#/problem/${b.s2}`} className="font-serif text-[16px] text-ink hover:text-accent">{b.n2}</a>
                      </div>
                      <div className="mt-2 font-mono text-[11px] text-faint">
                        {b.shared_authors} shared authors · {b.citation_flow} cross-citations
                      </div>
                      <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
                        {b.hypothesis.replace(/\*\*/g, "")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="border-b border-line">
              <div className="container-1180 py-14">
                <div className="flex items-center gap-3">
                  <span className="index-num">02</span>
                  <h2 className="display text-[26px] text-ink">Emerging frontiers</h2>
                </div>
                <div className="mt-8 overflow-hidden rounded-xl border border-line">
                  {data.frontiers.map((f, i) => (
                    <a key={f.id} href={`#/problem/${f.short}`} className={`flex items-center gap-5 px-5 py-4 transition hover:bg-surface ${i ? "border-t border-line" : ""}`}>
                      <span className="w-48 shrink-0 text-[14px] text-ink">{f.name}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${(f.growth / max) * 100}%` }} />
                      </span>
                      <span className="w-28 shrink-0 text-right font-mono text-[11px] text-muted">{Math.round(f.growth * 100)}% recent</span>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
