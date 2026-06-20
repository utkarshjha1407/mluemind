import { useEffect, useState, type ReactNode } from "react";
import { cn } from "./lib/utils";
import Explore from "./pages/Explore";
import Problem from "./pages/Problem";
import Ask from "./pages/Ask";
import Scientist from "./pages/Scientist";
import Landmarks from "./pages/Landmarks";
import Graph from "./pages/Graph";
import Dashboard from "./pages/Dashboard";
import CommandPalette from "./components/CommandPalette";

/* ------------------------------------------------------------------ */
/*  Knowledge OS — editorial-research landing                          */
/*  Fraunces serif · Inter UI · JetBrains mono · clay accent          */
/* ------------------------------------------------------------------ */

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const t = localStorage.getItem("kos-theme") || "light";
    document.documentElement.setAttribute("data-theme", t);
    setDark(t === "dark");
  }, []);
  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("kos-theme", next);
    setDark(!dark);
  };
  return { dark, toggle };
}

function Mark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative inline-block h-[18px] w-[18px]">
        <span className="absolute inset-0 rounded-[5px] border border-ink" />
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
      </span>
      <span className="font-serif text-[17px] font-medium tracking-tight">Knowledge OS</span>
    </span>
  );
}

export function Nav() {
  const { dark, toggle } = useTheme();
  const links: [string, string][] = [
    ["Explore", "#/explore"], ["Graph", "#/graph"], ["AI Scientist", "#/scientist"],
    ["Landmarks", "#/landmarks"], ["Dashboard", "#/dashboard"],
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="container-1180 flex h-[60px] items-center justify-between">
        <a href="#/" aria-label="Home"><Mark /></a>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map(([l, h]) => (
            <a key={l} className="link-muted text-[13.5px]" href={h}>{l}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <button onClick={toggle} className="grid h-9 w-9 place-items-center rounded-md border border-line text-[13px] text-muted hover:text-ink">
            {dark ? "☼" : "☾"}
          </button>
          <button onClick={() => window.dispatchEvent(new Event("kos:cmdk"))} className="hidden items-center gap-2 rounded-md border border-line px-3 py-2 text-[12.5px] text-faint hover:text-ink sm:flex">
            Search <kbd className="font-mono text-[11px]">⌘K</kbd>
          </button>
          <a href="#/explore" className="rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-paper">Open the Graph</a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const [q, setQ] = useState("");
  const ask = (v?: string) => { const t = (v ?? q).trim(); if (t) window.location.hash = "#/ask/" + encodeURIComponent(t); };
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* faint ruled paper grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.5]"
           style={{ backgroundImage: "linear-gradient(var(--border) 1px,transparent 1px)", backgroundSize: "100% 96px", maskImage: "linear-gradient(180deg,transparent,black 20%,black 70%,transparent)" }} />
      <div className="container-1180 relative grid grid-cols-1 gap-14 py-24 lg:grid-cols-12 lg:py-28">
        <div className="lg:col-span-7">
          <div className="flex items-center gap-3">
            <span className="eyebrow">Research Operating System</span>
            <span className="h-px w-8 bg-line" />
            <span className="eyebrow !tracking-[0.1em] text-faint">Est. 2026</span>
          </div>
          <h1 className="display mt-7 text-[clamp(42px,6vw,76px)] text-ink">
            Map the <span className="serif-it text-accent">evolution</span> of human knowledge
          </h1>
          <p className="mt-7 max-w-[40ch] text-[18px] leading-relaxed text-muted">
            Explore problems, breakthroughs, failures, and open questions across research and
            technology — organized around the problem being solved, not the paper.
          </p>

          <div className="mt-9 flex max-w-[560px] items-center gap-2 rounded-xl border border-line bg-surface p-2 pl-4 shadow-soft">
            <Magnifier />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
              placeholder="How did distributed consensus evolve?"
              className="min-w-0 flex-1 bg-transparent text-[15.5px] text-ink placeholder:text-faint focus:outline-none"
            />
            <kbd className="hidden rounded-md bg-surface-2 px-2 py-1 font-mono text-[11px] text-faint sm:block">⌘K</kbd>
            <button onClick={() => ask()} className="rounded-lg bg-accent px-4 py-2.5 text-[14px] font-medium text-white">Ask</button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {["Breakthroughs in transformers", "Open problems in database replication", "Evolution of operating systems"].map((c) => (
              <button key={c} onClick={() => ask(c)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] text-muted transition hover:border-ink/30 hover:text-ink">
                {c}
              </button>
            ))}
          </div>

          <p className="mt-8 font-mono text-[11.5px] text-faint">
            Indexed from OpenAlex · 14,400 papers · 379k citations · updated continuously
          </p>
        </div>

        <div className="lg:col-span-5">
          <figure className="rounded-2xl border border-line bg-surface p-5 shadow-lift">
            <figcaption className="mb-3 flex items-center justify-between">
              <span className="eyebrow">Fig. 01 — Distributed Consensus</span>
              <span className="font-mono text-[11px] text-faint">1985 → 2024</span>
            </figcaption>
            <KnowledgeGraph />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3">
              {[["Constraint", "var(--faint)"], ["Breakthrough", "var(--success)"], ["Open question", "var(--accent)"]].map(([l, c]) => (
                <span key={l} className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: c as string }} /> {l}
                </span>
              ))}
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}

function Magnifier() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 text-muted">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function KnowledgeGraph() {
  // editorial node-link: ink hairlines, clay focal, status dots
  const nodes = {
    focal: { x: 70, y: 150, label: "Distributed Consensus", kind: "focal" },
    flp: { x: 60, y: 56, label: "FLP · 1985", kind: "constraint" },
    paxos: { x: 220, y: 78, label: "Paxos · 1998", kind: "node" },
    raft: { x: 222, y: 158, label: "Raft · 2014", kind: "node" },
    pbft: { x: 210, y: 236, label: "Byzantine · 1999", kind: "node" },
    spanner: { x: 372, y: 96, label: "Spanner · 2012", kind: "breakthrough" },
    geo: { x: 372, y: 196, label: "Geo-scale?", kind: "open" },
  } as const;
  const C = (k: keyof typeof nodes) => nodes[k];
  const edges: [keyof typeof nodes, keyof typeof nodes, string, boolean][] = [
    ["flp", "focal", "var(--border)", false],
    ["focal", "paxos", "var(--accent)", false],
    ["focal", "raft", "var(--border)", false],
    ["focal", "pbft", "var(--border)", false],
    ["paxos", "spanner", "var(--success)", false],
    ["focal", "geo", "var(--accent)", true],
  ];
  const dot = (k: string) =>
    k === "focal" || k === "open" ? "var(--accent)" : k === "breakthrough" ? "var(--success)" : k === "constraint" ? "var(--faint)" : "var(--muted)";
  return (
    <svg viewBox="0 0 440 300" className="w-full" style={{ height: "auto" }}>
      {edges.map(([a, b, c, dash], i) => {
        const p1 = C(a), p2 = C(b);
        const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2 - 14;
        return (
          <path key={i} d={`M${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`} fill="none"
                stroke={c} strokeWidth={1.4} strokeDasharray={dash ? "5 4" : undefined}
                className="kos-edge" style={{ animationDelay: `${i * 90}ms` }} />
        );
      })}
      {Object.entries(nodes).map(([k, n]) => (
        <g key={k}>
          {n.kind === "focal" && <circle cx={n.x} cy={n.y} r={11} fill="none" stroke="var(--accent)" strokeWidth="1.5" className="kos-pulse" />}
          <circle cx={n.x} cy={n.y} r={n.kind === "focal" ? 5 : 4} fill={dot(n.kind)} stroke="var(--surface)" strokeWidth="2" />
          <text x={n.x + (n.x > 300 ? -10 : 12)} y={n.y + 4} textAnchor={n.x > 300 ? "end" : "start"}
                className="font-sans" fontSize="11.5" fill="var(--ink)" fontWeight={n.kind === "focal" ? 600 : 400}>
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function StatsLedger() {
  const stats = [["14,400", "Papers indexed"], ["36", "Problems mapped"], ["379k", "Citation links"], ["285", "Sub-problems found"]];
  return (
    <section className="border-b border-line">
      <div className="container-1180 grid grid-cols-2 md:grid-cols-4">
        {stats.map(([n, l], i) => (
          <div key={l} className={cn("py-9 pl-6", i % 2 === 1 && "border-l border-line", i > 0 && "md:border-l md:border-line")}>
            <div className="font-serif text-[34px] leading-none tracking-tight text-ink">{n}</div>
            <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-faint">{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHead({ idx, kicker, title, sub }: { idx: string; kicker: string; title: ReactNode; sub: string }) {
  return (
    <div className="max-w-[640px]">
      <div className="flex items-center gap-3">
        <span className="index-num">{idx}</span>
        <span className="eyebrow">{kicker}</span>
      </div>
      <h2 className="display mt-4 text-[clamp(28px,3.6vw,42px)] text-ink">{title}</h2>
      <p className="mt-4 text-[16.5px] leading-relaxed text-muted">{sub}</p>
    </div>
  );
}

function Bento() {
  return (
    <section className="border-b border-line">
      <div className="container-1180 py-20">
        <SectionHead idx="01" kicker="The Platform"
          title={<>A research operating system,<br />not a search box.</>}
          sub="Four ways into humanity’s collective intelligence — each organized around the problem being solved." />
        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-7" n="01" title="Problem Explorer" desc="Navigate knowledge through problems instead of papers — ranked by research momentum.">
            <VizExplorer />
          </Card>
          <Card className="lg:col-span-5" n="02" title="Evolution Timelines" desc="See how a field grew, decade by decade — and when it broke through.">
            <VizTimeline />
          </Card>
          <Card className="lg:col-span-5" n="03" title="Research Graph" desc="Visualize how problems, methods and discoveries connect across the corpus.">
            <VizGraph />
          </Card>
          <Card className="lg:col-span-7" n="04" title="Open Questions" desc="Discover what humanity still doesn’t know — surfaced from the data, never fabricated.">
            <VizQuestions />
          </Card>
        </div>
      </div>
    </section>
  );
}

function Card({ n, title, desc, children, className = "" }: { n: string; title: string; desc: string; children: ReactNode; className?: string }) {
  return (
    <div className={`group relative flex flex-col rounded-xl border border-line bg-surface p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft ${className}`}>
      <span className="absolute right-5 top-6 text-[15px] text-faint opacity-0 transition group-hover:translate-x-0.5 group-hover:text-accent group-hover:opacity-100">→</span>
      <span className="index-num">{n}</span>
      <h3 className="display mt-3 text-[22px] text-ink">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{desc}</p>
      <div className="mt-5 flex-1">{children}</div>
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-lg border border-line bg-paper ${className}`}>{children}</div>;
}

function VizExplorer() {
  const rows: [string, number[]][] = [["Distributed Systems", [3, 5, 6, 8, 7, 9]], ["Cryptography", [2, 3, 4, 4, 6, 7]], ["Neural Networks", [1, 2, 4, 7, 9, 10]]];
  return (
    <Panel>
      {rows.map(([nm, vals], i) => (
        <div key={nm} className={`flex items-center justify-between px-4 py-3 ${i ? "border-t border-line" : ""}`}>
          <span className="text-[13px] text-ink">{nm}</span>
          <span className="flex items-end gap-[3px]">
            {vals.map((v, j) => <span key={j} className="w-[4px] rounded-sm bg-accent" style={{ height: v * 2.4 }} />)}
          </span>
        </div>
      ))}
    </Panel>
  );
}

function VizTimeline() {
  const bars = [8, 14, 20, 30, 46, 64, 72, 60];
  return (
    <Panel className="flex h-[120px] items-end justify-center gap-1.5 p-4">
      {bars.map((v, i) => (
        <span key={i} className="w-[24px] rounded-sm" style={{ height: v, background: v >= 64 ? "var(--success)" : "var(--accent)" }} />
      ))}
    </Panel>
  );
}

function VizGraph() {
  const pts: [number, number, string][] = [[60, 34, "var(--accent)"], [150, 24, "var(--muted)"], [206, 64, "var(--success)"], [104, 70, "var(--accent)"], [256, 36, "var(--muted)"]];
  const e = [[0, 1], [0, 3], [1, 2], [3, 2], [1, 4]];
  return (
    <Panel className="p-2">
      <svg viewBox="0 0 300 100" className="h-[104px] w-full">
        {e.map(([a, b], i) => <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke="var(--border)" strokeWidth="1.3" />)}
        {pts.map(([x, y, c], i) => <circle key={i} cx={x} cy={y} r="6" fill={c} stroke="var(--paper)" strokeWidth="2" />)}
      </svg>
    </Panel>
  );
}

function VizQuestions() {
  const qs = ["Geo-scale consensus under churn?", "Energy-efficient agreement?", "Is amyloid the cause or a marker?"];
  return (
    <Panel>
      {qs.map((q, i) => (
        <div key={q} className={`flex items-center gap-3 px-4 py-3 ${i ? "border-t border-line" : ""}`}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span className="flex-1 text-[13px] text-ink">{q}</span>
          <span className="rounded-full bg-accent-weak px-2 py-0.5 font-mono text-[10px] text-accent">open</span>
        </div>
      ))}
    </Panel>
  );
}

function CTA() {
  return (
    <section className="border-b border-line bg-ink">
      <div className="container-1180 flex flex-col items-start justify-between gap-8 py-20 md:flex-row md:items-center">
        <h2 className="display max-w-[18ch] text-[clamp(30px,4vw,48px)] text-paper">
          Start with a <span className="serif-it" style={{ color: "var(--accent)" }}>problem.</span>
        </h2>
        <div className="flex items-center gap-3">
          <a href="#/explore" className="rounded-lg bg-accent px-5 py-3 text-[15px] font-medium text-white">Explore the graph</a>
          <a href="#/explore" className="rounded-lg border border-white/20 px-5 py-3 text-[15px] text-paper hover:bg-white/5">Read the method</a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const cols: [string, string[]][] = [
    ["Platform", ["Explore", "Problems", "Timelines", "Knowledge Graph", "Research Explorer"]],
    ["Resources", ["Documentation", "API", "Guides", "Changelog"]],
    ["Community", ["GitHub", "Discord", "Discussions", "Contribute"]],
    ["Company", ["About", "Contact", "Privacy", "Terms"]],
    ["Research", ["Data Sources", "Methodology", "Knowledge Model", "Transparency"]],
  ];
  return (
    <footer className="bg-paper">
      <div className="container-1180 grid grid-cols-2 gap-10 py-16 md:grid-cols-6">
        <div className="col-span-2 md:col-span-1">
          <Mark />
          <p className="mt-4 max-w-[24ch] text-[13px] leading-relaxed text-muted">
            Built for researchers, engineers, and curious minds.
          </p>
        </div>
        {cols.map(([h, items]) => (
          <div key={h}>
            <div className="font-mono text-[11px] uppercase tracking-wider text-faint">{h}</div>
            <ul className="mt-4 space-y-2.5">
              {items.map((it) => <li key={it}><a className="link-muted text-[13.5px]" href="#">{it}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="hairline">
        <div className="container-1180 flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <span className="font-mono text-[11.5px] text-faint">© 2026 Knowledge OS</span>
          <div className="flex gap-5">
            {["GitHub", "API Status", "Privacy", "Terms"].map((l) => <a key={l} className="link-muted font-mono text-[11.5px]" href="#">{l}</a>)}
          </div>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <main>
        <Hero />
        <StatsLedger />
        <Bento />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const on = () => { setHash(window.location.hash || "#/"); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

function Page({ route }: { route: string }) {
  if (route.startsWith("#/problem/")) return <Problem short={decodeURIComponent(route.slice("#/problem/".length))} />;
  if (route.startsWith("#/ask/")) return <Ask q={decodeURIComponent(route.slice("#/ask/".length))} />;
  if (route.startsWith("#/explore")) return <Explore />;
  if (route.startsWith("#/graph")) return <Graph />;
  if (route.startsWith("#/scientist")) return <Scientist />;
  if (route.startsWith("#/landmarks")) return <Landmarks />;
  if (route.startsWith("#/dashboard")) return <Dashboard />;
  return <Landing />;
}

export default function App() {
  const route = useHashRoute();
  return (
    <>
      <Page route={route} />
      <CommandPalette />
    </>
  );
}
