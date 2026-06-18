"use strict";
const $ = (s, r = document) => r.querySelector(s);
const SVGNS = "http://www.w3.org/2000/svg";
const state = { problems: [], pid: null, data: null, tab: "Map" };

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const api = (p) => fetch(p).then(r => r.json());

const STRUCT = new Set(["depends-on","enables","circumvents-constraint","generalizes",
  "specializes","refines/optimizes","limits/constrains","forks-problem","equivalent-to","deploys"]);
function edgeClass(kind){
  if (kind === "circumvents-constraint") return "edge circumvent";
  return "edge";
}
function confClass(c){ return (c && c.value) || "settled"; }

function badges(c){
  const out = [];
  out.push(`<span class="badge type">${esc(c.type)}</span>`);
  out.push(`<span class="badge contrib">${esc(c.contribution)}</span>`);
  if (c.status === "retracted") out.push(`<span class="badge retracted">RETRACTED</span>`);
  const cv = confClass(c.confidence);
  if (c.status !== "retracted")
    out.push(`<span class="badge ${cv}">${esc(cv)}</span>`);
  return out.join(" ");
}

// ---------- bootstrap ----------
async function boot(){
  state.problems = await api("/api/problems");
  const box = $("#problems");
  box.innerHTML = "";
  state.problems.forEach(p => {
    const d = document.createElement("div");
    d.className = "prob";
    d.dataset.pid = p.id;
    d.innerHTML = `<div class="t">${esc(p.title)}</div>
      <div class="m">${esc(p.domain)} · ${p.n_claims} claims</div>`;
    d.onclick = () => selectProblem(p.id);
    box.appendChild(d);
  });
  if (state.problems[0]) selectProblem(state.problems[0].id);
}

async function selectProblem(pid){
  state.pid = pid; state.tab = "Map";
  document.querySelectorAll(".prob").forEach(e =>
    e.classList.toggle("active", e.dataset.pid === pid));
  state.data = await api(`/api/problem/${pid}`);
  renderHead();
  renderTabs();
  renderView();
}

function renderHead(){
  const p = state.data.problem;
  const facets = Object.entries(p.facets || {}).map(([k,v]) =>
    `<span class="facet"><b>${esc(k)}:</b> ${esc(v)}</span>`).join("");
  $("#phead").innerHTML = `<h2>${esc(p.title)}</h2>
    <div class="q">${esc(p.question)}</div>
    <div class="facets">${facets}</div>`;
}

function renderTabs(){
  const hasLedger = !!state.data.problem.central_node &&
    state.data.problem.central_role === "hypothesis";
  const tabs = ["Map","Timeline","Reading order"]
    .concat(hasLedger ? ["Current state"] : [])
    .concat(["Trust & integrity"]);
  const t = $("#tabs"); t.innerHTML = "";
  tabs.forEach(name => {
    const el = document.createElement("div");
    el.className = "tab" + (name === state.tab ? " active" : "");
    el.textContent = name;
    el.onclick = () => { state.tab = name;
      document.querySelectorAll(".tab").forEach(x =>
        x.classList.toggle("active", x.textContent === name));
      renderView(); };
    t.appendChild(el);
  });
}

function renderView(){
  const v = $("#view"); v.innerHTML = "";
  if (state.tab === "Map") return renderMap(v);
  if (state.tab === "Timeline") return renderTimeline(v);
  if (state.tab === "Reading order") return renderReading(v);
  if (state.tab === "Current state") return renderLedger(v);
  if (state.tab === "Trust & integrity") return renderTrust(v);
}

// ---------- Map (claim graph over time) ----------
function svgEl(tag, attrs){
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function renderMap(v){
  const { claims, relations } = state.data;
  v.insertAdjacentHTML("beforebegin", "");
  const hint = document.createElement("p");
  hint.className = "hint";
  hint.innerHTML = `Each node is a <b>claim</b>, placed by year. Edges are typed claim↔claim relations — ` +
    `<span style="color:var(--circumvent)">purple = circumvents-constraint</span>, ` +
    `<span style="color:var(--struct)">blue = structural</span>, ` +
    `<span style="color:var(--evid)">amber = evidential</span>. Click a node for provenance.`;
  v.appendChild(hint);

  const W = Math.max(v.clientWidth - 10, 720);
  const years = claims.map(c => c.year);
  const minY = Math.min(...years), maxY = Math.max(...years);
  const padL = 70, padR = 40, NW = 116, NH = 38, vGap = 20, gap = 14;
  const xOf = y => padL + (maxY === minY ? 0 : (y - minY) / (maxY - minY)) * (W - padL - padR - NW);

  // greedy lane packing by year
  const sorted = [...claims].sort((a,b) => a.year - b.year);
  const laneLastRight = [];
  const pos = {};
  sorted.forEach(c => {
    const x = xOf(c.year);
    let lane = laneLastRight.findIndex(r => x >= r + gap);
    if (lane === -1) { lane = laneLastRight.length; laneLastRight.push(0); }
    laneLastRight[lane] = x + NW;
    pos[c.id] = { x, y: 50 + lane * (NH + vGap), lane };
  });
  const H = 50 + laneLastRight.length * (NH + vGap) + 30;

  const svg = svgEl("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  svg.id = "graphSvg";
  // arrow marker
  const defs = svgEl("defs", {});
  ["var(--g-arrow)","var(--circumvent)"].forEach((col,i) => {
    const m = svgEl("marker", { id:`arr${i}`, markerWidth:8, markerHeight:8, refX:7, refY:3,
      orient:"auto", markerUnits:"strokeWidth" });
    const ap = svgEl("path", { d:"M0,0 L6,3 L0,6 Z" }); ap.style.fill = col;
    m.appendChild(ap);
    defs.appendChild(m);
  });
  svg.appendChild(defs);

  // year axis ticks
  for (let yr = minY; yr <= maxY; yr += Math.max(1, Math.round((maxY-minY)/8))){
    const x = xOf(yr);
    const ln = svgEl("line", { x1:x, y1:30, x2:x, y2:H-14, "stroke-width":1 }); ln.style.stroke = "var(--g-tick)";
    svg.appendChild(ln);
    const tx = svgEl("text", { x:x, y:22, "font-size":10 }); tx.style.fill = "var(--g-axis)"; tx.textContent = yr;
    svg.appendChild(tx);
  }

  // edges
  relations.forEach(r => {
    const a = pos[r.src], b = pos[r.dst];
    if (!a || !b) return;
    const x1 = a.x + NW/2, y1 = a.y + NH/2, x2 = b.x + NW/2, y2 = b.y + NH/2;
    const mx = (x1 + x2) / 2;
    const path = svgEl("path", {
      d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`,
      class: edgeClass(r.kind),
      "marker-end": `url(#arr${r.kind === "circumvents-constraint" ? 1 : 0})`,
    });
    path.style.stroke = r.kind === "circumvents-constraint" ? "var(--circumvent)"
      : (STRUCT.has(r.kind) ? "var(--g-edge)" : "var(--g-evid-edge)");
    path.dataset.src = r.src; path.dataset.dst = r.dst;
    svg.appendChild(path);
  });

  // nodes
  claims.forEach(c => {
    const p = pos[c.id];
    const g = svgEl("g", { class:"node" }); g.dataset.cid = c.id;
    const retr = c.status === "retracted";
    const cont = (c.confidence && c.confidence.value) === "contested";
    const rect = svgEl("rect", { x:p.x, y:p.y, width:NW, height:NH,
      "stroke-dasharray": retr ? "4 3" : "0" });
    rect.style.fill = retr ? "var(--g-node-retr)" : (cont ? "var(--g-node-cont)" : "var(--g-node)");
    rect.style.stroke = retr ? "var(--retracted)" : (cont ? "var(--contested)" : "var(--g-node-stroke)");
    g.appendChild(rect);
    const t1 = svgEl("text", { class:"nlabel", x:p.x+9, y:p.y+16 });
    t1.textContent = c.id.length > 15 ? c.id.slice(0,14)+"…" : c.id;
    const t2 = svgEl("text", { class:"nyear", x:p.x+9, y:p.y+29 });
    t2.textContent = `${c.year} · ${c.contribution}`.slice(0,20);
    g.appendChild(t1); g.appendChild(t2);
    const ttl = svgEl("title", {}); ttl.textContent = c.assertion; g.appendChild(ttl);
    g.style.cursor = "pointer";
    g.onclick = () => openDrawer(c.id);
    svg.appendChild(g);
  });

  const wrap = document.createElement("div");
  wrap.id = "graphWrap"; wrap.appendChild(svg);
  v.appendChild(wrap);
}

// ---------- Timeline ----------
async function renderTimeline(v){
  const items = await api(`/api/problem/${state.pid}/timeline`);
  v.insertAdjacentHTML("beforeend",
    `<p class="hint">Claims in time. Note there is <b>no "failure" bucket</b> — limits and negative ` +
    `results are first-class evidence, not discarded attempts.</p>`);
  items.forEach(c => v.appendChild(rowEl(c, { year:true })));
}
async function renderReading(v){
  const items = await api(`/api/problem/${state.pid}/reading-order`);
  v.insertAdjacentHTML("beforeend",
    `<p class="hint">A dependency-sorted path: each claim appears after what it builds on ` +
    `(computed by topological sort over prerequisite edges).</p>`);
  items.forEach(c => v.appendChild(rowEl(c, { step:true })));
}
function rowEl(c, opt){
  const d = document.createElement("div");
  d.className = "row";
  const lead = opt.step ? `<div class="step">${c.step}.</div>`
                        : `<div class="yr">${c.year}</div>`;
  d.innerHTML = `${lead}<div class="body">
    <div class="as">${esc(c.assertion)}</div>
    <div class="meta">${badges(c)} <span class="src">${esc(c.source.paper)}</span></div>
  </div>`;
  d.onclick = () => openDrawer(c.id);
  return d;
}

// ---------- Ledger (contested current state) ----------
async function renderLedger(v){
  const L = await api(`/api/problem/${state.pid}/ledger`);
  v.insertAdjacentHTML("beforeend",
    `<p class="hint">The honest "current state" of a contested question is a <b>balance of evidence with ` +
    `named camps</b> — the system renders the disagreement and emits <b>no verdict</b>.</p>`);
  if (L.positions && L.positions.length){
    const pb = document.createElement("div"); pb.className = "positions";
    pb.innerHTML = L.positions.map(p =>
      `<div class="posbox"><div class="camp">${esc(p.camp)}</div>
       <div class="stance">${esc(p.stance)}</div>
       <div class="src">${esc(p.source||"")}</div></div>`).join("") +
      `<div class="no-verdict">No verdict is computed by design — the agent summarizes this ledger, it does not adjudicate it.</div>`;
    v.appendChild(pb);
  }
  const grid = document.createElement("div"); grid.className = "ledger";
  grid.appendChild(ledgerCol("Supporting", "support", L.supporting));
  grid.appendChild(ledgerCol("Undermining", "undermine", L.undermining));
  grid.appendChild(ledgerCol("Competing / complicating", "compete",
    (L.competing||[]).concat(L.complicating||[])));
  v.appendChild(grid);
}
function ledgerCol(title, cls, items){
  const col = document.createElement("div"); col.className = "col " + cls;
  col.innerHTML = `<h3>${title} (${(items||[]).length})</h3>`;
  (items||[]).forEach(e => {
    const c = e.claim;
    const card = document.createElement("div");
    card.className = "lcard" + (e.retracted ? " retracted" : "");
    card.innerHTML = `${esc(c.assertion)}
      <div class="meta" style="margin-top:6px">
        ${e.scope ? `<span class="badge scope">scope: ${esc(e.scope)}</span>`:""}
        ${e.retracted ? `<span class="badge retracted">RETRACTED source</span>`:""}
        <span class="src">${esc(c.year)} · ${esc(c.source.paper)}</span>
      </div>`;
    card.onclick = () => openDrawer(c.id);
    col.appendChild(card);
  });
  return col;
}

// ---------- Trust & integrity (retraction simulator) ----------
function renderTrust(v){
  const claims = state.data.claims;
  const retracted = claims.filter(c => c.status === "retracted");
  v.insertAdjacentHTML("beforeend",
    `<p class="hint">The most trust-critical feature: a retracted claim must <b>propagate doubt</b> to ` +
    `everything that leaned on it. Pick any claim, simulate retracting it, and see what must be re-examined ` +
    `— this is how the system refuses to launder fraud into provenance-backed fact.</p>`);

  const ctrl = document.createElement("div"); ctrl.className = "trust-controls";
  const sel = document.createElement("select");
  claims.forEach(c => {
    const o = document.createElement("option"); o.value = c.id;
    o.textContent = `${c.id} — ${c.assertion.slice(0,52)}…`;
    if (c.status === "retracted") o.textContent = "⚠ " + o.textContent;
    sel.appendChild(o);
  });
  if (retracted[0]) sel.value = retracted[0].id;
  const btn = document.createElement("button"); btn.className = "primary";
  btn.textContent = "Simulate retraction →";
  const out = document.createElement("div");
  btn.onclick = () => showImpact(sel.value, out);
  ctrl.appendChild(sel); ctrl.appendChild(btn); v.appendChild(ctrl);

  if (retracted.length){
    const note = document.createElement("p"); note.className = "hint";
    note.innerHTML = `Already retracted in this lineage: ` +
      retracted.map(c => `<b>${esc(c.id)}</b>`).join(", ") +
      ` — the impact below is computed live from the graph.`;
    v.appendChild(note);
  }
  v.appendChild(out);
  if (sel.value) showImpact(sel.value, out);
}
async function showImpact(cid, out){
  const r = await api(`/api/retraction-impact/${cid}`);
  const root = r.root_claim;
  let html = `<div class="impact-card direct">
     <div class="d">RETRACTING</div>
     <div style="margin-top:4px"><b>${esc(root.id)}</b> — ${esc(root.assertion)}</div>
     <div class="src" style="margin-top:6px">${esc(root.source.paper)}</div></div>`;
  if (!r.affected.length){
    html += `<p class="empty">Nothing in this lineage leans on it — no downstream re-examination needed.</p>`;
  } else {
    html += `<p class="hint" style="margin-top:12px">${r.affected.length} claim(s) must be re-examined:</p>`;
    r.affected.forEach(a => {
      const c = a.claim;
      html += `<div class="impact-card ${a.severity}">
        <div class="d">${a.severity.toUpperCase()} · distance ${a.distance} · via <b>${esc(a.via)}</b>${a.scope?` (scope: ${esc(a.scope)})`:""}</div>
        <div style="margin-top:5px"><b>${esc(c.id)}</b> — ${esc(c.assertion)}</div>
        <div class="src" style="margin-top:5px">${esc(c.source.paper)}</div></div>`;
    });
  }
  out.innerHTML = html;
}

// ---------- detail drawer ----------
async function openDrawer(cid){
  const c = await api(`/api/claim/${cid}`);
  const rels = state.data.relations;
  const outgoing = rels.filter(r => r.src === cid);
  const incoming = rels.filter(r => r.dst === cid);
  const relLine = (r, dir) => `<div class="rel">
     <span class="arrow">${dir==="out"?"→":"←"}</span>
     <span class="k">${esc(r.kind)}${r.scope?` [${esc(r.scope)}]`:""}</span>
     <span class="arrow">${dir==="out"? esc(r.dst): esc(r.src)}</span>
     ${r.note?`<div class="src" style="margin:3px 0 0 18px">${esc(r.note)}</div>`:""}</div>`;
  const conf = c.confidence || {};
  const positions = (conf.positions||[]).map(p =>
    `<div class="posbox" style="margin-top:8px"><div class="camp">${esc(p.camp)}</div>
     <div class="stance">${esc(p.stance)}</div></div>`).join("");
  $("#drawerBody").innerHTML = `
    <div class="cid">${esc(c.id)}</div>
    <div class="as">${esc(c.assertion)}</div>
    <div>${badges(c)}</div>
    <div class="kv"><span class="k">Source</span><span>${esc(c.source.paper)}</span></div>
    <div class="kv"><span class="k">Locus</span><span>${esc(c.source.locus||"—")}</span></div>
    <div class="kv"><span class="k">Provenance</span><span>${esc(c.provenance_granularity)}</span></div>
    <div class="kv"><span class="k">Status</span><span>${esc(c.status)}</span></div>
    ${conf.note?`<div class="kv"><span class="k">Note</span><span>${esc(conf.note)}</span></div>`:""}
    ${positions?`<h4>Positions (contested)</h4>${positions}`:""}
    <h4>Relations out (${outgoing.length})</h4>
    ${outgoing.map(r=>relLine(r,"out")).join("") || '<div class="empty">none</div>'}
    <h4>Relations in (${incoming.length})</h4>
    ${incoming.map(r=>relLine(r,"in")).join("") || '<div class="empty">none</div>'}`;
  $("#drawer").classList.add("open");
}
function closeDrawer(){ $("#drawer").classList.remove("open"); }

// ---------- search ----------
let stimer;
$("#search").addEventListener("input", e => {
  clearTimeout(stimer);
  const q = e.target.value.trim();
  stimer = setTimeout(async () => {
    if (!q) { renderView(); return; }
    const res = await api(`/api/search?q=${encodeURIComponent(q)}`);
    const v = $("#view"); v.innerHTML =
      `<p class="hint">${res.length} claim(s) matching “${esc(q)}” across all problems:</p>`;
    res.forEach(c => v.appendChild(rowEl(c, { year:true })));
  }, 180);
});

boot();
