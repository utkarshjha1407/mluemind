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
        lead = "Across the corpus, momentum is concentrated in a few areas. "
        if len(act) >= 2:
            lead += (f"**{act[0]['name']}** is the hottest — {round(act[0]['growth']*100)}% of its "
                     f"papers are from the last ~6 years — followed by **{act[1]['name']}** "
                     f"({round(act[1]['growth']*100)}%). Full ranking by recent share below "
                     f"(a proxy for where the field is moving):")
        blocks = [{"type": "text", "text": lead},
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
        ms = store.papers_for_problem(pid, 5)
        subs = store.subproblems(pid)
        narr = (f"**{name}** is a problem the corpus tracks across {span}, with "
                f"{s['papers']:,} papers. ")
        if ms:
            narr += (f"Its single most-cited landmark is “{ms[0]['title']}” "
                     f"({ms[0]['year']}, {ms[0]['cited_by_count']:,} citations). ")
        if peak:
            narr += f"Output peaked around {peak['year']}. "
        if len(subs) >= 2:
            narr += (f"Reading the papers, the field splits into {len(subs)} sub-problems — "
                     f"led by {subs[0]['name']} and {subs[1]['name']}. ")
        if tl:
            narr += "Below: the breakthroughs that anchored it, and where the work sits now."
        blocks.append({"type": "text", "text": narr})
        blocks.append(_papers_block("Breakthroughs (most-cited)", ms))
        if subs:
            blocks.append({"type": "problems", "heading": "Sub-problems it splits into",
                           "items": [{"id": pid, "name": sp["name"], "weight": sp["n_papers"]}
                                     for sp in subs]})
        blocks.append(_papers_block("Where it is now (recent high-impact)", store.frontier(pid, 4)))

    elif intent == "current":
        fr = store.frontier(pid, 6)
        subs = store.subproblems(pid)
        txt = f"As of {s.get('last_year') or 'recently'}, **{name}** is still active. "
        if fr:
            txt += (f"The most-cited recent paper is “{fr[0]['title']}” "
                    f"({fr[0]['year']}, {fr[0]['cited_by_count']:,} citations). ")
        if len(subs) >= 2:
            txt += f"Today's work concentrates in {subs[0]['name']} and {subs[1]['name']}."
        blocks.append({"type": "text", "text": txt})
        blocks.append(_papers_block("Active frontier", fr))
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
        txt = f"The researchers shaping **{name}** (ranked by citations to their work here): "
        if len(auth) >= 3:
            txt += (f"{auth[0]['name']} leads with {auth[0]['citations']:,} citations across "
                    f"{auth[0]['papers']} papers, followed by {auth[1]['name']} and {auth[2]['name']}.")
        blocks.append({"type": "text", "text": txt})
        blocks.append({"type": "authors", "heading": "Key authors",
                       "items": [{"name": a["name"], "papers": a["papers"],
                                  "citations": a["citations"]} for a in auth]})

    elif intent == "related":
        rel = store.related_problems(pid, 8)
        txt = f"By citation flow, **{name}** is most entangled with "
        if len(rel) >= 2:
            txt += (f"{rel[0]['name']} ({rel[0]['weight']} cross-citations) and "
                    f"{rel[1]['name']} ({rel[1]['weight']}). These are its nearest neighbors — "
                    f"good places to look for transferable ideas.")
        blocks.append({"type": "text", "text": txt})
        blocks.append({"type": "problems", "heading": "Draws on",
                       "items": [{"id": r["id"], "name": r["name"], "weight": r["weight"]} for r in rel]})

    elif intent == "reading":
        ms = store.papers_for_problem(pid, 6)
        txt = f"To get into **{name}**, "
        if ms:
            txt += (f"start with “{ms[0]['title']}” ({ms[0]['year']}) — the most-cited reference "
                    f"and the usual entry point — then work down the foundational set, and finish "
                    f"on the recent frontier to see where it's heading.")
        blocks.append({"type": "text", "text": txt})
        blocks.append(_papers_block("Start here (most-cited)", ms))
        blocks.append(_papers_block("Then the frontier", store.frontier(pid, 3)))

    return {"question": q, "intent": intent, "interpreted": f"{intent} · {name}",
            "problem": {"id": pid, "name": name}, "blocks": blocks}
