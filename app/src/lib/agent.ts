// Client-side research agent — ports knowledge_os/agent.py to run in the browser
// over the exported JSON. No server, no API.

export type ProblemLite = {
  id: string; short: string; name: string; subfield_id: string;
  n_papers: number; cited_by_count: number; keywords?: string;
};

export type Intent =
  | "active" | "open" | "evolution" | "current" | "authors" | "related" | "reading" | "overview";

const STOP = new Set(
  ("the a an of for to in on and or is are what how why which who when where that this these those " +
   "with without into from as by about over under between across most biggest top best main key major " +
   "important recent current latest now today field area problem problems research papers paper work " +
   "works topic give show tell me i we our us explain summarize describe list rank evolve evolved " +
   "evolution history develop developed state open unsolved challenge challenges frontier hot active " +
   "trend trends growing promising future direction directions read reading learn start introduction " +
   "recommend connection connections related adjacent cross link draws author authors researcher " +
   "researchers people pioneer pioneers progress advances overview").split(/\s+/),
);

export function classify(q: string): Intent {
  const s = q.toLowerCase();
  const has = (...w: string[]) => w.some((x) => s.includes(x));
  if (has("most active", "fastest", "growing", "hottest", "biggest", "promising", "trend")) return "active";
  if (has("open", "unsolved", "challenge", "frontier", "future", "direction", "gap")) return "open";
  if (has("evolve", "evolution", "history", "develop", "over time", "timeline", "progress", "advance")) return "evolution";
  if (has("current", "state of", "today", "latest", "now", "where is")) return "current";
  if (has("who", "author", "researcher", "people", "pioneer")) return "authors";
  if (has("related", "connect", "adjacent", "cross", "draws", "link", "depend")) return "related";
  if (has("read", "reading", "learn", "start", "introduction", "recommend", "papers on", "study")) return "reading";
  return "overview";
}

function tok(s: string): Set<string> {
  const m = (s || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  return new Set(m.filter((w) => w.length > 1 && !STOP.has(w)));
}

export function resolveProblem(q: string, problems: ProblemLite[]) {
  const qt = tok(q);
  let best: ProblemLite | null = null;
  let score = 0;
  for (const p of problems) {
    const nt = tok(p.name);
    const kw = new Set<string>();
    if (p.keywords) {
      try { for (const k of JSON.parse(p.keywords)) for (const w of tok(String(k))) kw.add(w); } catch { /* ignore */ }
    }
    let s = 0;
    for (const w of qt) { if (nt.has(w)) s += 2; if (kw.has(w)) s += 1; }
    if (s > score) { score = s; best = p; }
  }
  return { problem: best, score };
}

export const INTENT_LABEL: Record<Intent, string> = {
  active: "Most active problems",
  open: "Open directions",
  evolution: "How it evolved",
  current: "Current state",
  authors: "Key researchers",
  related: "Connections",
  reading: "Reading path",
  overview: "Overview",
};
