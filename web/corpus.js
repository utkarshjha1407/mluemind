"use strict";
const $ = (s, r = document) => r.querySelector(s);
const SVGNS = "http://www.w3.org/2000/svg";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const api = (p) => fetch(p).then(r => r.json());
const num = (n) => (n || 0).toLocaleString();
const enc = encodeURIComponent;
const state = { subfields: [], subfilter: null };

async function boot() {
  const [stats, subs] = await Promise.all([api("/api/corpus/stats"), api("/api/corpus/subfields")]);
  state.subfields = subs;
  $("#stat-mini").textContent = `${num(stats.papers)} papers · ${stats.problems_ingested} problems`;
  const box = $("#subfields");
  box.innerHTML = "";
  subs.forEach(s => {
    const d = document.createElement("div");
    d.className = "prob"; d.dataset.sf = s.id;
    d.innerHTML = `<div class="t" style="font-size:12.5px">${esc(s.name)}</div>
      <div class="m">${s.n_problems} problems · ${num(s.n_papers)} papers</div>`;
    d.onclick = () => { state.subfilter = (state.subfilter === s.id) ? null : s.id; showProblems(); };
    box.appendChild(d);
  });
  showProblems();
}

function setHead(title, sub) {
  $("#phead").innerHTML = `<h2>${esc(title)}</h2><div class="q">${esc(sub || "")}</div>`;
}
function markNav(id) {
  ["nav-problems", "nav-universe"].forEach(n => $("#" + n).classList.toggle("active", n === id));
  document.querySelectorAll("#subfields .prob").forEach(e =>
    e.classList.toggle("active", e.dataset.sf === state.subfilter));
}

// ---------- problem grid ----------
async function showProblems() {
  markNav(state.subfilter ? null : "nav-problems");
  const sf = state.subfilter;
  const probs = await api("/api/corpus/problems" + (sf ? `?subfield=${enc(sf)}` : ""));
  const sfName = sf ? (state.subfields.find(s => s.id === sf) || {}).name : null;
  setHead(sfName || "All CS problems",
    `${probs.length} problems · ranked by paper count` + (sf ? " · click subfield again to clear" : ""));
  const v = $("#view");
  v.innerHTML = `<p class="hint">Each card is a <b>research problem</b>. Click to see its timeline,
    breakthroughs, active frontier and the problems it draws on — all computed from real papers.</p>`;
  const grid = document.createElement("div"); grid.className = "grid";
  probs.forEach(p => {
    const sfn = (state.subfields.find(s => s.id === p.subfield_id) || {}).name || "";
    const d = document.createElement("div"); d.className = "pcard";
    d.innerHTML = `<div class="nm">${esc(p.name)}</div>
      <div class="sf">${esc(sfn)}</div>
      <div class="st"><span><b>${num(p.n_papers)}</b> papers</span>
        <span><b>${num(p.cited_by_count)}</b> citations</span></div>`;
    d.onclick = () => showProblem(p.id);
    grid.appendChild(d);
  });
  v.appendChild(grid);
}

// ---------- problem detail ----------
async function showProblem(pid) {
  const d = await api(`/api/corpus/problem/${enc(pid)}`);
  if (d.error) { $("#view").innerHTML = `<p class="empty">${esc(d.error)}</p>`; return; }
  const p = d.problem, s = d.summary;
  const sfn = (state.subfields.find(x => x.id === p.subfield_id) || {}).name || "";
  setHead(p.name, sfn);
  const v = $("#view");
  v.innerHTML = `<div class="crumb"><span class="backlink" onclick="showProblems()">← all problems</span></div>`;
  if (p.description) v.insertAdjacentHTML("beforeend", `<p class="hint">${esc(p.description)}</p>`);

  v.insertAdjacentHTML("beforeend", `<div class="detail-stats">
    <div class="s"><b>${num(s.papers)}</b><span>papers (sampled)</span></div>
    <div class="s"><b>${num(s.citations)}</b><span>total citations</span></div>
    <div class="s"><b>${s.first_year || "—"}–${s.last_year || "—"}</b><span>active span</span></div>
  </div>`);

  // v2: sub-problems extracted by reading papers
  if (d.subproblems && d.subproblems.length) {
    const isLLM = d.subproblems.some(sp => sp.backend && sp.backend !== "local");
    const how = isLLM
      ? `An LLM read each paper and named the <b>specific problem</b> it solves.`
      : `Our own extraction layer (TF-IDF + clustering, no API) grouped these papers by the
         <b>specific problem</b> they solve — finer-grained than the topic label.`;
    v.insertAdjacentHTML("beforeend",
      `<div class="section-h">Sub-problems found by reading the papers
        <span style="color:var(--circumvent);font-weight:600"> · v2</span></div>`);
    v.insertAdjacentHTML("beforeend",
      `<p class="hint" style="margin-top:-4px">${how} ${d.subproblems.length} distinct sub-problems
       emerged. Click to expand.</p>`);
    d.subproblems.forEach(sp => v.appendChild(subproblemEl(sp)));
  }

  // timeline bar chart
  v.insertAdjacentHTML("beforeend", `<div class="section-h">Evolution — papers per year</div>`);
  v.appendChild(timelineBars(d.timeline));

  v.insertAdjacentHTML("beforeend", `<div class="two-col">
    <div><div class="section-h">Breakthroughs — most-cited work</div><div id="ms"></div></div>
    <div><div class="section-h">Active frontier — recent high-impact</div><div id="fr"></div></div>
  </div>`);
  $("#ms").append(...d.milestones.map(paperEl));
  $("#fr").append(...(d.frontier.length ? d.frontier.map(paperEl)
    : [emptyEl("no recent papers in sample")]));

  v.insertAdjacentHTML("beforeend", `<div class="two-col">
    <div><div class="section-h">Key authors</div><div id="au"></div></div>
    <div><div class="section-h">Draws on — problems this one cites</div><div id="rel" class="chips"></div></div>
  </div>`);
  $("#au").append(...d.key_authors.map(a => {
    const el = document.createElement("div"); el.className = "authrow";
    el.innerHTML = `<span>${esc(a.name)}</span><span class="ac">${a.papers} papers · ${num(a.citations)} cites</span>`;
    return el;
  }));
  const rel = $("#rel");
  if (!d.related.length) rel.appendChild(emptyEl("no strong intra-corpus links yet"));
  d.related.forEach(r => {
    const c = document.createElement("div"); c.className = "chip";
    c.innerHTML = `${esc(r.name)} <b>${r.weight}</b>`;
    c.onclick = () => showProblem(r.id);
    rel.appendChild(c);
  });
}

function paperEl(p) {
  const el = document.createElement("div"); el.className = "paper";
  const link = p.doi ? `<a href="${esc(p.doi)}" target="_blank" rel="noopener">link ↗</a>` : "";
  el.innerHTML = `<div class="cites">${num(p.cited_by_count)}</div>
    <div><div class="pt">${esc(p.title)}</div>
    <div class="pm">${p.year || "—"} · ${esc(p.venue || "—")} ${link}</div></div>`;
  return el;
}
function emptyEl(t){ const e=document.createElement("div"); e.className="empty"; e.textContent=t; return e; }

function subproblemEl(sp) {
  const wrap = document.createElement("details"); wrap.className = "subproblem";
  const sum = document.createElement("summary");
  const tag = (sp.backend && sp.backend !== "local")
    ? `<span class="sptag llm">llm</span>` : `<span class="sptag local">local</span>`;
  sum.innerHTML = `<span class="spname">${esc(sp.name)} ${tag}</span>
    <span class="spcount">${sp.n_papers} paper${sp.n_papers > 1 ? "s" : ""}</span>`;
  wrap.appendChild(sum);
  sp.papers.forEach(p => {
    const el = document.createElement("div"); el.className = "sppaper";
    el.innerHTML = `<div class="sptitle">${esc(p.title)} <span class="spyr">${p.year}</span></div>
      <div class="spprob"><b>Problem:</b> ${esc(p.problem)}</div>
      <div class="spmeth"><b>Method:</b> ${esc(p.method)}</div>`;
    wrap.appendChild(el);
  });
  return wrap;
}

function timelineBars(tl) {
  const wrap = document.createElement("div");
  if (!tl.length) { return emptyEl("no dated papers"); }
  const max = Math.max(...tl.map(t => t.papers));
  const bars = document.createElement("div"); bars.className = "bars";
  tl.forEach(t => {
    const b = document.createElement("div"); b.className = "bar";
    b.style.height = `${Math.max(2, (t.papers / max) * 100)}%`;
    b.dataset.label = `${t.year}: ${t.papers} papers`;
    bars.appendChild(b);
  });
  const axis = document.createElement("div"); axis.className = "axis";
  axis.innerHTML = `<span>${tl[0].year}</span><span>${tl[tl.length - 1].year}</span>`;
  wrap.appendChild(bars); wrap.appendChild(axis);
  return wrap;
}

// ---------- universe map ----------
async function showUniverse() {
  state.subfilter = null; markNav("nav-universe");
  setHead("Universe map", "how CS problems cite each other — the seed of the cross-disciplinary graph");
  const g = await api("/api/corpus/universe");
  const v = $("#view");
  v.innerHTML = `<p class="hint">Each node is a <b>problem</b> (size = papers). Each line is
    <b>citation flow</b> between problems (thicker = more). This is Layer 4 in miniature, scoped to CS;
    later this same view connects <i>other domains</i>.</p>`;
  v.appendChild(universeSvg(g));
}

function universeSvg(g) {
  const W = Math.max($("#view").clientWidth - 10, 720), H = 560, cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) / 2 - 90;
  const nodes = g.nodes.slice().sort((a, b) => (a.subfield_id || "").localeCompare(b.subfield_id || ""));
  const pos = {};
  nodes.forEach((n, i) => {
    const ang = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    pos[n.id] = { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang), n, ang };
  });
  const maxP = Math.max(...nodes.map(n => n.n_papers), 1);
  const maxW = Math.max(...g.edges.map(e => e.weight), 1);
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);

  g.edges.forEach(e => {
    const a = pos[e.src], b = pos[e.dst]; if (!a || !b) return;
    const path = document.createElementNS(SVGNS, "path");
    path.setAttribute("d", `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#58a6ff");
    path.setAttribute("stroke-width", 0.4 + (e.weight / maxW) * 3.5);
    path.setAttribute("opacity", 0.18 + (e.weight / maxW) * 0.4);
    svg.appendChild(path);
  });
  nodes.forEach(n => {
    const p = pos[n.id];
    const r = 5 + (n.n_papers / maxP) * 13;
    const c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", r);
    c.setAttribute("fill", "#1f6feb"); c.setAttribute("stroke", "#79c0ff"); c.setAttribute("stroke-width", 1.2);
    c.style.cursor = "pointer";
    c.onclick = () => showProblem(n.id);
    const ttl = document.createElementNS(SVGNS, "title"); ttl.textContent = `${n.name} (${num(n.n_papers)} papers)`;
    c.appendChild(ttl);
    svg.appendChild(c);
    const right = Math.cos(p.ang) >= 0;
    const t = document.createElementNS(SVGNS, "text");
    t.setAttribute("x", p.x + (right ? r + 4 : -(r + 4))); t.setAttribute("y", p.y + 3);
    t.setAttribute("text-anchor", right ? "start" : "end");
    t.setAttribute("fill", "#8b98a9"); t.setAttribute("font-size", 9.5);
    t.style.cursor = "pointer"; t.onclick = () => showProblem(n.id);
    t.textContent = n.name.length > 30 ? n.name.slice(0, 29) + "…" : n.name;
    svg.appendChild(t);
  });
  const wrap = document.createElement("div"); wrap.appendChild(svg); return wrap;
}

// ---------- search ----------
let stimer;
$("#search").addEventListener("input", e => {
  clearTimeout(stimer);
  const q = e.target.value.trim();
  stimer = setTimeout(async () => {
    if (!q) { showProblems(); return; }
    const res = await api(`/api/corpus/search?q=${enc(q)}`);
    setHead(`Search: “${q}”`, `${res.length} papers (top by citations)`);
    const v = $("#view"); v.innerHTML = "";
    res.forEach(p => {
      const el = paperEl(p);
      el.style.cursor = "pointer";
      el.onclick = () => showProblem(p.problem_id);
      v.appendChild(el);
    });
    if (!res.length) v.appendChild(emptyEl("no matches"));
  }, 200);
});

boot();
