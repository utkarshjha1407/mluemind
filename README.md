# Knowledge OS — CS Knowledge Operating System (v1)

**Navigate problems, not papers.** Knowledge OS ingests the real research corpus and organizes it
the way the original plan specified — around **problems**, their **evolution**, their
**breakthroughs**, the **people**, and how problems **connect** — starting with computer science.
Other domains plug into the same engine later.

This is the original-plan architecture (Layers 0–4) running on **real data**, not mock-ups.

---

## Run it (one command, no setup)

Python 3 is already installed. Then:

```
python run.py
```

Builds the knowledge base, starts a local server, opens your browser at **http://localhost:8765**.
No database server, no internet needed at run time (the corpus is pre-ingested into `corpus.db`).

If `corpus.db` is missing, ingest a fresh real corpus first (needs internet):

```
python -m knowledge_os.ingest --works-per-topic 200 --max-topics 24
```

That pulls real papers from **OpenAlex** (free, ~250M works) across the curated computing
problems. It is **resumable** — re-run with more topics/works to grow toward the 500k target;
already-ingested problems are skipped. (The shipped corpus is 36 problems × 400 papers.)

**Layer 2 — problem extraction (read each paper, don't just use its topic label).** Two backends,
both already run:

```
python -m knowledge_os.extract_local              # OUR OWN layer: TF-IDF + clustering, no API, $0
python -m knowledge_os.extract --problem T10270   # optional LLM polish (claude-opus-4-8) if a key is set
```

- **`extract_local.py` is the primary, free, owned layer** — it embeds titles+abstracts (TF-IDF),
  clusters each topic (K-means) to *discover* its sub-problems, labels each cluster by its most
  distinctive terms, and pulls a problem/method sentence per paper with simple rules. No network,
  no per-call cost. This is also the architecture that scales to millions of papers (per-paper LLM
  calls do not). Requires numpy + scikit-learn at build time only; the app runtime stays zero-dep.
- **`extract.py`** is an *optional* quality upgrade: real LLM extraction when `ANTHROPIC_API_KEY`
  is set, otherwise it replays the bundled sample in `data/extractions/`. The blockchain topic ships
  with LLM-grade samples; the other 35 use the local layer.

Both write to the same `extractions` table and show up on each problem page under **"Sub-problems
found by reading the papers,"** tagged `local` or `llm`.

---

## What you can do

The front page is the **CS corpus** (currently 14,400 real papers, 36 problems, ~379k citation
edges, 25k authors):

- **All problems** — every research problem as a card (papers, citations), grouped by subfield
  (AI, Networks, Theory, Hardware, Information Systems, Vision).
- **A problem page** (click any card) — all *computed* from real papers:
  - **Evolution** — papers-per-year bar chart (the field's growth curve)
  - **Breakthroughs** — most-cited works
  - **Active frontier** — recent high-impact work
  - **Key authors** — by citation weight
  - **Draws on** — the other problems this one cites most (real citation flow)
- **Universe map** — every problem as a node, citation flow between them as edges. This is the
  original plan's Layer 4 (cross-disciplinary graph) in miniature, scoped to CS; the *same* view
  will later connect other domains.
- **★ Papers that mattered** — a curated canon of the papers that changed computing (Turing →
  Shannon → TCP/IP → RSA → PageRank → Bitcoin → AlexNet → Attention Is All You Need → AlphaFold),
  grouped by decade with a one-line "why it mattered," **live OpenAlex citation counts**, and a
  jump into the corpus for the 17 that are also ingested. Build it with
  `python -m knowledge_os.landmarks` (curated in `data/landmarks.json`).
- **⌕ Ask the corpus** — a research agent (Layer 5). Ask in plain English — "how did distributed
  systems evolve?", "what are the most active problems in CS?", "who works on cryptography?",
  "recommend reading on neural networks" — and it resolves the problem, figures out what you're
  asking, and synthesizes a cited answer from the corpus. Retrieval + templated synthesis, **no
  LLM, no API bills**.
- **⚗ AI Scientist** (Layer 6) — machine-suggested research opportunities, grounded in the data:
  **bridge opportunities** (problem pairs whose author communities overlap heavily but whose
  literatures barely cite each other — under-exploited connections, with a candidate transfer
  hypothesis) and **emerging frontiers** (fastest-growing problems). Deliberately does *not* claim
  contradictions — that needs claim-level extraction, not citation data. No LLM, no API.
- **Search** — across all papers' titles and abstracts.

The **curated lineage demo** (the earlier proof-of-atom with the trust/retraction features) is
still available at **http://localhost:8765/lineages**.

---

## How it maps to the original plan

| Plan layer | Here |
|---|---|
| L0 Raw sources | `knowledge_os/openalex.py` — real OpenAlex ingestion (stdlib, polite pool) |
| L1 Paper graph | `corpus.db` — papers, authors, venues, 119k citation edges |
| L2 Problem layer | v1: OpenAlex **topics = problems** (`ingest.py`). **v2: our own extraction layer** (`extract_local.py`, TF-IDF + clustering, no API) → ~284 sub-problems across the corpus; optional LLM polish (`extract.py`). |
| L3 Problem evolution | `corpus_overlays.problem_detail` — timelines, breakthroughs, frontier |
| L4 Universal graph | `corpus_overlays.universe` — cross-problem citation graph |
| L5 Research agent | **"Ask the corpus"** (`agent.py`) — resolves the problem, classifies the question (evolution / current / open / authors / connections / reading / most-active), and synthesizes a cited answer from the overlays. Our own layer — no LLM, no API. |
| L6 AI Scientist | **"AI Scientist"** (`scientist.py`) — bridge opportunities (author-overlap vs citation-flow mismatch) + emerging frontiers, each traceable to the data and labeled unverified. Contradiction detection intentionally omitted (needs claim-level extraction). No LLM, no API. |

```
knowledge_os/
  openalex.py        OpenAlex API client (stdlib only)
  ingest.py          ingestion orchestrator + CLI (resumable, CS-scoped, curated topics)
  agent.py           Layer 5 — research agent (intent + retrieval + synthesis, no API)
  scientist.py       Layer 6 — AI scientist (bridge opportunities + frontiers, no API)
  landmarks.py       "Papers that mattered" — curated canon + live OpenAlex enrichment
  extract_local.py   Layer 2 — OUR OWN extraction layer (TF-IDF + K-means, no API, scales)
  extract.py         Layer 2 — optional LLM polish (Anthropic backend + offline seed backend)
  corpus_store.py    SQLite store for the real corpus
  corpus_overlays.py computed problem pages + universe graph
  store.py / overlays.py / model.py   the curated-lineage engine (proof-of-atom + trust features)
  server.py          zero-dependency HTTP API + static serving (corpus + lineages)
data/                consensus.json, amyloid.json  (curated lineages)
web/                 corpus.html/corpus.js (primary) + index.html/app.js (lineage demo)
tests/               python -m unittest discover -s tests   (12 tests, all green)
schema/ proofs/ plans/   the validated model, stress lineages, and strategy memo
```

---

## v1 scope & honest data-quality notes

- **CS & computing only**, by design. The engine is domain-agnostic; switching domains is changing
  the ingest filter (`field.id`) — the original plan's later phases.
- **Problems = OpenAlex topics** for now. This is real and automated but coarser than per-paper
  problem extraction; that LLM step is the clear v2 upgrade and the architecture already isolates it.
- Real-corpus artifacts you will occasionally see (and the fix path): some titles are container/
  series names (e.g. "Lecture Notes in Computer Science 1205"), and a few publication years are
  re-indexing oddities. v2 filters work `type` and uses cleaner title fields.

## Scale path (unchanged target)

SQLite + stdlib server are deliberate so v1 runs anywhere. The documented target for 500k+ works
and semantic search is **Postgres + pgvector**, with OpenAlex/Semantic Scholar as the corpus lens.
The ingestion is already batched and resumable for that scale.

## Tests

```
python -m unittest discover -s tests -v
```
