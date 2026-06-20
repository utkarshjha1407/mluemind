import { useMemo } from "react";
import { Nav, Footer } from "../App";
import { useJSON, num } from "../lib/data";
import { classify, resolveProblem, INTENT_LABEL, type ProblemLite } from "../lib/agent";

type Paper = { id: string; title: string; year: number; cited_by_count: number; venue?: string; doi?: string };
type Detail = {
  problem: { name: string; description?: string };
  summary: { papers: number; citations: number; first_year: number; last_year: number };
  milestones: Paper[]; frontier: Paper[];
  key_authors: { name: string; papers: number; citations: number }[];
  related: { id: string; name: string; weight: number; short: string }[];
  subproblems: { name: string; n_papers: number }[];
};
type Frontier = { id: string; short: string; name: string; growth: number; recent: number; total: number };

export default function Ask({ q }: { q: string }) {
  const { data: problems } = useJSON<ProblemLite[]>("/data/problems.json");
  const { data: opps } = useJSON<{ frontiers: Frontier[] }>("/data/opportunities.json");

  const intent = classify(q);
  const resolved = useMemo(() => (problems ? resolveProblem(q, problems) : { problem: null, score: 0 }), [problems, q]);
  const corpusWide = intent === "active" || (resolved.score === 0 && (intent === "open" || intent === "overview"));
  const prob = resolved.problem;
  const { data: detail } = useJSON<Detail>(!corpusWide && prob ? `/data/problem/${prob.short}.json` : null);

  const interpreted = corpusWide
    ? "Most active problems across the corpus"
    : prob ? `${INTENT_LABEL[intent]} · ${prob.name}` : "No problem matched";

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <main>
        <section className="border-b border-line">
          <div className="container-1180 py-12">
            <div className="flex items-center gap-3">
              <span className="index-num">↳</span>
              <span className="eyebrow">Answer</span>
            </div>
            <h1 className="display mt-4 max-w-[24ch] text-[clamp(28px,3.6vw,44px)] text-ink">{q}</h1>
            <p className="mt-3 font-mono text-[11.5px] text-faint">interpreted as — {interpreted}</p>
          </div>
        </section>

        <div className="container-1180 py-12">
          {corpusWide && opps && <Ranking frontiers={opps.frontiers} />}
          {!corpusWide && !prob && (
            <Empty />
          )}
          {!corpusWide && prob && detail && <Answer intent={intent} d={detail} short={prob.short} />}
          {!corpusWide && prob && !detail && <p className="font-mono text-[13px] text-faint">Reading {prob.name}…</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Empty() {
  return (
    <div className="max-w-[60ch]">
      <p className="text-[16px] leading-relaxed text-muted">
        I couldn’t match that to a problem in the corpus. Try naming a CS area — e.g.{" "}
        <em className="serif-it text-ink">how did databases evolve?</em>,{" "}
        <em className="serif-it text-ink">who works on cryptography?</em>, or{" "}
        <em className="serif-it text-ink">most active problems in CS</em>.
      </p>
    </div>
  );
}

function Ranking({ frontiers }: { frontiers: Frontier[] }) {
  const max = Math.max(0.01, ...frontiers.map((f) => f.growth));
  return (
    <div>
      <p className="mb-7 max-w-[68ch] text-[16px] leading-relaxed text-muted">
        Momentum is concentrated in a few areas — ranked by the share of each problem’s papers from
        the last ~6 years (a proxy for where the field is moving).
      </p>
      <div className="overflow-hidden rounded-xl border border-line">
        {frontiers.map((f, i) => (
          <a key={f.id} href={`#/problem/${f.short}`}
             className={`flex items-center gap-5 px-5 py-4 transition hover:bg-surface ${i ? "border-t border-line" : ""}`}>
            <span className="w-44 shrink-0 text-[14px] text-ink">{f.name}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${(f.growth / max) * 100}%` }} />
            </span>
            <span className="w-28 shrink-0 text-right font-mono text-[11px] text-muted">
              {Math.round(f.growth * 100)}% recent · {num(f.total)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function Answer({ intent, d, short }: { intent: string; d: Detail; short: string }) {
  const span = `${d.summary.first_year}–${d.summary.last_year}`;
  const blocks: React.ReactNode[] = [];

  const narrative = () => {
    const top = d.milestones[0];
    let t = `${d.problem.name} is a problem the corpus tracks across ${span}, with ${num(d.summary.papers)} papers. `;
    if (top) t += `Its single most-cited landmark is “${top.title}” (${top.year}, ${num(top.cited_by_count)} citations). `;
    if (d.subproblems.length >= 2) t += `Reading the papers, it splits into ${d.subproblems.length} sub-problems — led by ${d.subproblems[0].name} and ${d.subproblems[1].name}.`;
    return t;
  };

  if (intent === "evolution" || intent === "overview") {
    blocks.push(<Prose key="n">{narrative()}</Prose>);
    blocks.push(<PaperList key="b" label="Breakthroughs (most-cited)" papers={d.milestones.slice(0, 5)} />);
    if (d.subproblems.length) blocks.push(<Chips key="s" label="Sub-problems" items={d.subproblems.map((s) => ({ name: s.name, n: s.n_papers, short }))} />);
    blocks.push(<PaperList key="f" label="Where it is now" papers={d.frontier.slice(0, 4)} />);
  } else if (intent === "current") {
    const f0 = d.frontier[0];
    blocks.push(<Prose key="n">{`As of ${d.summary.last_year}, ${d.problem.name} is still active.${f0 ? ` The most-cited recent paper is “${f0.title}” (${f0.year}, ${num(f0.cited_by_count)} citations).` : ""}`}</Prose>);
    blocks.push(<PaperList key="f" label="Active frontier" papers={d.frontier.slice(0, 6)} />);
  } else if (intent === "open") {
    blocks.push(<Prose key="n">{`Open directions in ${d.problem.name} — the system reads the recent frontier and the sub-problem structure; it surfaces where the work clusters, it does not invent unsolved problems.`}</Prose>);
    if (d.subproblems.length) blocks.push(<Chips key="s" label="Where the open work clusters" items={d.subproblems.map((s) => ({ name: s.name, n: s.n_papers, short }))} />);
    blocks.push(<PaperList key="f" label="Recent frontier" papers={d.frontier.slice(0, 6)} />);
  } else if (intent === "authors") {
    const a = d.key_authors;
    blocks.push(<Prose key="n">{a.length >= 3 ? `${a[0].name} leads ${d.problem.name} with ${num(a[0].citations)} citations across ${a[0].papers} papers, followed by ${a[1].name} and ${a[2].name}.` : `Key researchers in ${d.problem.name}.`}</Prose>);
    blocks.push(<Authors key="a" authors={a.slice(0, 8)} />);
  } else if (intent === "related") {
    const r = d.related;
    blocks.push(<Prose key="n">{r.length >= 2 ? `${d.problem.name} is most entangled with ${r[0].name} (${r[0].weight} cross-citations) and ${r[1].name} (${r[1].weight}) — its nearest neighbours for transferable ideas.` : `Connections from ${d.problem.name}.`}</Prose>);
    blocks.push(<Chips key="r" label="Draws on" items={r.map((x) => ({ name: x.name, n: x.weight, short: x.short, link: true }))} />);
  } else if (intent === "reading") {
    const m0 = d.milestones[0];
    blocks.push(<Prose key="n">{`To get into ${d.problem.name}, start with${m0 ? ` “${m0.title}” (${m0.year}) — the most-cited reference — then` : ""} the foundational set below, and finish on the recent frontier.`}</Prose>);
    blocks.push(<PaperList key="b" label="Start here" papers={d.milestones.slice(0, 6)} />);
    blocks.push(<PaperList key="f" label="Then the frontier" papers={d.frontier.slice(0, 3)} />);
  }

  return <div className="flex flex-col gap-10">{blocks}</div>;
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[70ch] text-[17px] leading-relaxed text-ink">{children}</p>;
}
function Label({ children }: { children: React.ReactNode }) { return <div className="eyebrow mb-3">{children}</div>; }

function PaperList({ label, papers }: { label: string; papers: Paper[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="divide-y divide-line border-y border-line">
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

function Chips({ label, items }: { label: string; items: { name: string; n: number; short: string; link?: boolean }[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2.5">
        {items.map((it) =>
          it.link ? (
            <a key={it.name} href={`#/problem/${it.short}`} className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] text-muted hover:border-accent/40 hover:text-ink">
              {it.name}<span className="font-mono text-[11px] text-accent">{it.n}</span>
            </a>
          ) : (
            <span key={it.name} className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] text-ink">
              {it.name}<span className="font-mono text-[11px] text-accent">{it.n}</span>
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function Authors({ authors }: { authors: { name: string; papers: number; citations: number }[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      {authors.map((a, i) => (
        <div key={a.name} className={`flex items-center justify-between px-4 py-2.5 ${i ? "border-t border-line" : ""}`}>
          <span className="text-[13.5px] text-ink">{a.name}</span>
          <span className="font-mono text-[11px] text-faint">{num(a.citations)} cites · {a.papers}p</span>
        </div>
      ))}
    </div>
  );
}
