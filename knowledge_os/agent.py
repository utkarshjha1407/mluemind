"""Layer 5 — Research Agent, our own layer (no LLM API, no cost).

Answers natural-language questions by retrieving from the corpus and synthesizing a structured,
cited answer with templates. It resolves which problem you mean, classifies what you're asking
(evolution / current state / open directions / authors / connections / reading list), and
composes the answer from the same overlays the UI uses.

Not an LLM — but it answers the original plan's Phase-1/2 questions from real data:
  "how did distributed consensus evolve?"   "what are the most active problems in CS?"
"""
from __future__ import annotations

import json
import re

# words that shouldn't count when matching a question to a problem
_STOP = set("""the a an of for to in on and or is are what how why which who when where
that this these those with without into from as by about over under between across most
biggest top best main key major important recent current latest now today field area
problem problems research papers paper work works topic give show tell me i we our us
explain summarize describe list rank evolve evolved evolution history develop developed
state open unsolved challenge challenges frontier hot active trend trends growing promising
future direction directions read reading learn start introduction recommend connection
connections related adjacent cross link draws author authors researcher researchers people
pioneer pioneers progress advances overview""".split())


def _tok(s: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", (s or "").lower()) if len(w) > 1}


def classify(q: str) -> str:
    ql = q.lower()
    def has(*ws): return any(w in ql for w in ws)
    if has("most active", "fastest", "growing", "hottest", "biggest", "promising", "trend"):
        return "active"
    if has("open", "unsolved", "challenge", "frontier", "future", "direction", "gap"):
        return "open"
    if has("evolve", "evolution", "history", "develop", "over time", "timeline", "progress", "advance"):
        return "evolution"
    if has("current", "state of", "today", "latest", "now", "where is"):
        return "current"
    if has("who", "author", "researcher", "people", "pioneer"):
        return "authors"
    if has("related", "connect", "adjacent", "cross", "draws", "link", "depend"):
        return "related"
    if has("read", "reading", "learn", "start", "introduction", "recommend", "papers on", "study"):
        return "reading"
    return "overview"


def resolve_problem(store, q: str):
    qt = _tok(q) - _STOP
    best, score = None, 0
    for p in store.problems(ingested_only=True):
        name_t = _tok(p["name"])
        kw: set[str] = set()
        try:
            for k in json.loads(p["keywords"] or "[]"):
                kw |= _tok(k)
        except Exception:  # noqa: BLE001
            pass
        s = len(qt & name_t) * 2 + len(qt & kw)
        if s > score:
            best, score = p, s
    return best, score


def _papers_block(heading, papers):
    return {"type": "papers", "heading": heading,
            "items": [{"title": p["title"], "year": p["year"],
                       "cited_by_count": p["cited_by_count"], "doi": p.get("doi"),
                       "problem_id": p.get("problem_id")} for p in papers]}


def answer(store, q: str) -> dict:
    intent = classify(q)
    prob, score = resolve_problem(store, q)

    # ---- corpus-wide questions (no specific problem, or explicitly "across CS") ----
    if intent == "active" or (score == 0 and intent in ("open", "overview")):
        act = sorted(store.activity(), key=lambda a: (a["growth"], a["recent"]), reverse=True)[:10]
        blocks = [{"type": "text",
                   "text": "Ranked by research momentum — the share of each problem's papers "
                           "published in the last ~6 years (higher = faster-growing)."},
                  {"type": "ranking", "heading": "Fastest-growing problems in the corpus",
                   "items": [{"id": a["id"], "name": a["name"], "growth": a["growth"],
                              "recent": a["recent"], "total": a["total"]} for a in act]}]
        return {"question": q, "intent": "active",
                "interpreted": "Most active / fastest-growing problems across the corpus",
                "problem": None, "blocks": blocks}

    if not prob:
        return {"question": q, "intent": intent, "problem": None,
                "interpreted": "No specific problem matched",
                "blocks": [{"type": "text",
                            "text": "I couldn't match that to a problem in the corpus. Try naming a "
                                    "CS area (e.g. \"how did databases evolve?\", \"who works on "
                                    "cryptography?\", or \"most active problems in CS\")."}]}

    pid, name = prob["id"], prob["name"]
    s = store.problem_summary(pid)
    span = f"{s.get('first_year') or '—'}–{s.get('last_year') or '—'}"
    blocks: list[dict] = []

    if intent in ("evolution", "overview"):
        tl = store.timeline(pid)
        peak = max(tl, key=lambda t: t["papers"]) if tl else None
        narr = f"**{name}** spans {span} with {s['papers']:,} papers in the corpus"
        if peak:
            narr += f"; activity peaks around {peak['year']}"
        blocks.append({"type": "text", "text": narr + "."})
        blocks.append(_papers_block("Breakthroughs (most-cited)", store.papers_for_problem(pid, 5)))
        subs = store.subproblems(pid)
        if subs:
            blocks.append({"type": "problems", "heading": "Sub-problems it splits into",
                           "items": [{"id": pid, "name": sp["name"], "weight": sp["n_papers"]}
                                     for sp in subs]})
        blocks.append(_papers_block("Where it is now (recent high-impact)", store.frontier(pid, 4)))

    elif intent == "current":
        blocks.append({"type": "text",
                       "text": f"Current state of **{name}** — the most-cited recent work and the "
                               f"sub-problems active today ({span})."})
        blocks.append(_papers_block("Active frontier", store.frontier(pid, 6)))
        subs = store.subproblems(pid)
        if subs:
            blocks.append({"type": "problems", "heading": "Active sub-problems",
                           "items": [{"id": pid, "name": sp["name"], "weight": sp["n_papers"]}
                                     for sp in subs]})

    elif intent == "open":
        subs = store.subproblems(pid)
        blocks.append({"type": "text",
                       "text": f"Open directions in **{name}** — the system reads the recent frontier "
                               f"and the sub-problem structure; it surfaces where activity is, it does "
                               f"not invent unsolved problems."})
        if subs:
            blocks.append({"type": "problems", "heading": "Sub-problems (where the open work clusters)",
                           "items": [{"id": pid, "name": sp["name"], "weight": sp["n_papers"]}
                                     for sp in subs]})
        blocks.append(_papers_block("Recent frontier", store.frontier(pid, 6)))

    elif intent == "authors":
        auth = store.key_authors(pid, 10)
        blocks.append({"type": "text", "text": f"Most-cited authors in **{name}**:"})
        blocks.append({"type": "authors", "heading": "Key authors",
                       "items": [{"name": a["name"], "papers": a["papers"],
                                  "citations": a["citations"]} for a in auth]})

    elif intent == "related":
        rel = store.related_problems(pid, 8)
        blocks.append({"type": "text",
                       "text": f"**{name}** draws most on these problems (by citation flow):"})
        blocks.append({"type": "problems", "heading": "Draws on",
                       "items": [{"id": r["id"], "name": r["name"], "weight": r["weight"]} for r in rel]})

    elif intent == "reading":
        blocks.append({"type": "text",
                       "text": f"A reading path for **{name}** — start with the foundational, "
                               f"most-cited work, then the recent frontier."})
        blocks.append(_papers_block("Start here (most-cited)", store.papers_for_problem(pid, 6)))
        blocks.append(_papers_block("Then the frontier", store.frontier(pid, 3)))

    return {"question": q, "intent": intent, "interpreted": f"{intent} · {name}",
            "problem": {"id": pid, "name": name}, "blocks": blocks}
