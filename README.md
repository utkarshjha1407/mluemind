# Knowledge OS — MVP (proof-of-atom)

**The first problem-centric knowledge operating system.** Instead of searching papers, you
navigate **Problems → Claims → Evidence → Open Questions**. This is the working MVP that proves
the core idea on two real research lineages.

> Mission unchanged from day one: organize knowledge around problems, attempts, evidence,
> breakthroughs, and open questions. What changed is *how* — see `schema/knowledge-model-v0.1.md`
> for the model we validated before building, and `plans/…` for the founding-team strategy memo.

---

## Run it (one command, no setup)

You need Python 3 (already installed on this machine). Then:

```
python run.py
```

It builds the knowledge base, starts a local server, and opens your browser at
**http://localhost:8765**. Press `Ctrl+C` to stop. No database to install, no internet needed.

---

## What to click

Two problems are loaded in the left sidebar:

1. **Distributed Consensus** (engineering computer science)
2. **Amyloid Cascade Hypothesis** (contested biomedical science)

For each, five views — all **computed** from the underlying claims, never hand-written:

- **Map** — every claim as a node, placed by year; typed relationships as edges. Purple edges are
  "circumvents-constraint" — watch how the whole consensus field routes around one impossibility
  result (FLP). Click any node for its source/provenance.
- **Timeline** — the claims in time. Notice there is **no "failure" bucket** — limits and negative
  results are first-class evidence, not discarded attempts.
- **Reading order** — a dependency-sorted path through the field (read this, then this).
- **Current state** (amyloid only) — the honest answer to a contested question: a **balance of
  evidence with named camps**, and *no verdict*. The system shows the disagreement.
- **Trust & integrity** — the **retraction simulator**. Pick any claim, "retract" it, and watch the
  system flag everything that leaned on it. Try the real case: the 2006 Aβ*56 paper (since
  retracted for image manipulation) — the system flags the cascade hypothesis it propped up.

---

## Why this is the whole bet in miniature

The hard part of this company was never the infrastructure — it was three things, and each is
demonstrated here:

| Hard problem | Where you see it |
|---|---|
| What is the storage atom? | **Claim**, not "problem" — verifiable, traces to a source span. Problems are computed overlays. |
| How do you earn expert trust? | Every claim shows provenance; **retractions propagate**; contested state renders camps, not verdicts. |
| Does the model generalize? | Two opposite epistemologies (tidy CS, messy biomedicine) run on the *same* engine. |

---

## How it's built (for whoever you hand this to)

Zero-dependency Python standard library — deliberately, so it runs anywhere with no setup.

```
data/            consensus.json, amyloid.json   ← the two validated lineages, as structured claims
knowledge_os/
  model.py       the validated knowledge model + validation rules (schema v0.1)
  store.py       SQLite store (Postgres/pgvector is the documented scale target)
  overlays.py    computed views: timeline, reading order, evidence ledger, retraction propagation
  server.py      zero-dependency HTTP API + static serving
web/             the UI (vanilla HTML/CSS/JS — no build step)
tests/           python -m unittest discover -s tests     (9 tests, all green)
run.py           one-command launcher
schema/          knowledge-model-v0.1.md — the model, derived empirically from the two lineages
proofs/          the hand-built lineage artifacts the model was stress-tested on
plans/           the founding-team strategy memo
```

The MVP's pragmatic choices (SQLite, stdlib server, keyword search) are intentional for a
runnable proof-of-atom. The documented scale path (FastAPI, Postgres + pgvector for semantic
search, OpenAlex/Semantic Scholar as the corpus *lens*) is in the strategy memo and is the next
step **after** a domain expert ratifies the two lineages — that human ratification gate, not more
code, is what unlocks scaling.

---

## Run the tests

```
python -m unittest discover -s tests -v
```

Covers: provenance-required, scoped edges, status lifecycle, topological reading order, and the
trust-critical **retraction propagation**.
