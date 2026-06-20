# Knowledge OS — Design System & IA (v1)

> "GitHub for Human Knowledge." A research operating system organized around **problems and
> their evolution**, not papers. Research-grade, dense, fast, trustworthy. Reference points:
> Linear, Notion, OpenAlex, Perplexity, Arc, Vercel, Stripe.
> Driving principle: **every screen leads with a problem, never a paper.**

## 1. Information architecture (sitemap)

| Route | Page | Purpose |
|---|---|---|
| `/` | **Landing** | Problem-first hero ("Explore a Problem") + live graph + showcase + search |
| `/explore` | **Problem Explorer** | Browse/filter problems by domain · subfield · momentum (the default "app" view) |
| `/problem/:id` | **Problem Detail** | Overview · Timeline · Breakthroughs · Papers · Researchers · Failed approaches/limitations · Current state · Open questions · Related · Cross-disciplinary |
| `/graph` | **Knowledge Graph** | 3-pane: left domains/topics · center interactive graph · right context panel |
| `/dashboard` | **Dashboard** | Recently explored · Trending areas · Emerging breakthroughs · Activity · Open-questions feed |
| `/ask` | **Ask** | Research agent — large intelligent search + synthesized cited answers |
| `/landmarks` | **Papers that mattered** | Curated canon, live citations |
| `/scientist` | **AI Scientist** | Bridge opportunities + emerging frontiers (machine-suggested, unverified) |
| `/docs`,`/about`,`/methodology`,`/transparency` | Footer pages | Trust + knowledge-model story (stubs first) |

Global: **Command palette (⌘K)** for search/ask/navigation from anywhere.

## 2. Color palette (light primary; dark retained)

Research-grade neutrals, one restrained accent. No gradients, no glass.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FFFFFF` | `#0B0C0E` | page |
| `--surface` | `#FAFAFA` | `#141619` | cards, panels |
| `--surface-2` | `#F4F5F7` | `#1B1E23` | inset, hover |
| `--border` | `#E7E8EC` | `#262A31` | hairlines |
| `--ink` | `#18181B` | `#ECEDEE` | primary text |
| `--muted` | `#5B616E` | `#9BA1AC` | secondary text |
| `--faint` | `#8A909C` | `#6B7280` | tertiary/labels |
| `--accent` | `#4F46E5` | `#7C7AF0` | primary accent (indigo/iris) |
| `--accent-weak` | `#EEF0FF` | `#1E1F3A` | accent surfaces |
| `--success` | `#1A7F45` | `#3FB36B` | settled / supporting |
| `--warning` | `#9A6A00` | `#D6A33A` | contested / evidential |
| `--danger` | `#C2362F` | `#F0746B` | retracted / undermining |
| graph: `--g-node/-stroke/-edge/-evid-edge/-tick/-axis` | — | — | reuse existing SVG tokens, remapped to palette |

Accent is used sparingly: primary CTA, active nav, focus rings, key links. Everything else neutral.

## 3. Typography

- **Sans:** Inter (or Geist Sans) — UI + reading. Self-hosted via Fontsource (offline, no CDN).
- **Mono:** JetBrains Mono (or Geist Mono) — IDs, years, counts, code.
- Scale (rem): 0.75 / 0.8125 / 0.875 / 1 / 1.125 / 1.25 / 1.5 / 1.875 / 2.25 / 3 / 3.75.
- Weights: 400 body, 500 UI, 600 headings, 700 display. Line-height: 1.5 body, 1.2 display.
- Tracking: −0.01em on display sizes. Max reading width ~68ch.

## 4. Spacing / radii / elevation / motion

- **Spacing:** 4px base → 4,8,12,16,20,24,32,40,48,64,80,96.
- **Radii:** sm 6 · md 8 · lg 12 · xl 16 · full. Cards lg, controls md, pills full.
- **Elevation:** flat by default; 1 hairline border. Shadow only on overlays (`0 8px 30px rgba(0,0,0,.08)` light).
- **Motion:** 150–200ms `cubic-bezier(.2,.7,.2,1)`; scroll-reveal on landing; gentle graph easing; honor `prefers-reduced-motion`.

## 5. Component inventory → shadcn/ui mapping

| Need | shadcn/ui | Notes |
|---|---|---|
| Global search / command | `command` (cmdk) + `dialog` | ⌘K palette: search, ask, navigate |
| Top nav | `navigation-menu` + `button` | minimal, sticky, blurred-solid on scroll |
| Mobile nav / context panel | `sheet` | right context drawer on graph/detail |
| Sectioned detail | `tabs`, `accordion` | problem-detail sections; open-questions accordion |
| Cards | `card` | ProblemCard, StatTile, BridgeCard |
| Tags/states | `badge` | domain, status (settled/contested/retracted) |
| Paper/researcher preview | `hover-card`, `avatar` | on hover over a paper/author |
| Tables | `table` + `scroll-area` | papers, researchers |
| Filters | `select`, `dropdown-menu`, `toggle-group` | explorer facets, sort |
| Disclosure/help | `tooltip`, `popover` | provenance, "why unverified" |
| Loading | `skeleton` | data fetch |
| Breadcrumbs | `breadcrumb` | problem → subfield → domain |
| Theme | `toggle` | reuse existing `data-theme` mechanism |

**Custom (not shadcn):** `KnowledgeGraph` (SVG/canvas, ported from existing universe/map renderers), `EvolutionTimeline`, `EvidenceLedger`, `MomentumBar`, `ProblemCard`, `PaperRow`, `ResearcherRow`, `BridgeCard`, `StatTile`, `FacetChip`, `AnswerBlocks` (agent output renderer).

## 6. Responsive

Breakpoints sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536.
- 3-pane graph → center + ⌘bar; left/right become `sheet` under lg.
- Explorer grid: 1 col < md, 2 md, 3 lg, 4 xl.
- Problem-detail: single column < lg with a sticky section nav; 2-col (content + sticky context) ≥ lg.
- Tap targets ≥ 44px; nav collapses to a `sheet` under md.

## 7. Page wireframes (intent)

- **Landing:** sticky nav · hero "Map the Evolution of Human Knowledge" + "Explore a Problem" search · live problem→evidence→breakthrough graph animation · 4 feature tiles (Problem Explorer, Evolution Timelines, Research Graph, Open Questions) · showcase tabs (Distributed Consensus / LLMs / Database Systems / Computer Vision) showing timeline+graph+breakthroughs+open-questions · trust strip (data sources, methodology, transparency) · OpenAlex/Stripe-grade footer.
- **Problem Explorer:** left facet rail (domain, subfield, momentum, status) · dense card grid · sort (momentum, papers, recency) · inline mini-timeline sparkline per card.
- **Problem Detail:** breadcrumb + title + facets · sticky in-page section nav · sections per IA · right sticky context (summary, key papers, key researchers, open questions).
- **Knowledge Graph:** left domains/topics tree · center graph · right context panel.
- **Dashboard:** widget grid.

## 8. Build plan

- **P1:** design system (Figma tokens+components → Tailwind theme + shadcn) · problem-first **Landing** · **Problem Explorer** · **Problem Detail** · **Ask/⌘K search**.
- **P2:** **Knowledge Graph** page · **Dashboard** · **Landmarks** · **AI Scientist** · docs/footer pages · a11y + motion polish.
- **Stack:** Vite + React + TS + Tailwind + shadcn/ui in `app/`. Backend Python/SQLite unchanged; `export_static.py` precomputes `app/public/data/*.json`; agent + search run client-side. Deploy: `npm run build` → static `dist/` → any free host.
