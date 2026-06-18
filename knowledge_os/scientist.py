"""Layer 6 — the AI Scientist, grounded and honest (no LLM, no API).

The original plan asks this layer to find research gaps, contradictions, and novel combinations.
We build only what the data can *defensibly* support, and we say so:

  * BRIDGE OPPORTUNITIES — pairs of problems whose author communities overlap a lot but whose
    literatures barely cite each other. Researchers span both, yet the ideas haven't crossed.
    That mismatch (high shared-authors, low cross-citation) is a real, computable signal of an
    under-exploited connection — a candidate for cross-pollination.
  * EMERGING FRONTIERS — the fastest-growing problems, with their newest high-impact work.

What we deliberately DO NOT do: claim contradictions or assert "X refutes Y." Detecting that
honestly needs claim-level extraction (the claim-substrate lineage layer), not topic/paper data —
asserting it from citations would be the confident-hallucination failure we set out to avoid.
Everything below is labeled machine-suggested and unverified, and every item traces to the data.
"""
from __future__ import annotations


def _pair_key(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a < b else (b, a)


def bridges(store, limit: int = 12) -> list[dict]:
    names = {p["id"]: p["name"] for p in store.problems(ingested_only=True)}
    # citation flow per unordered pair
    flow: dict[tuple[str, str], int] = {}
    for e in store.cross_problem_edges(min_weight=1):
        k = _pair_key(e["src"], e["dst"])
        flow[k] = flow.get(k, 0) + e["weight"]
    # representative technique label per problem (biggest sub-problem cluster), if extracted
    def signature(pid: str) -> str | None:
        subs = store.subproblems(pid)
        return subs[0]["name"] if subs else None

    out = []
    for pr in store.shared_author_pairs(min_shared=4):
        p1, p2 = pr["p1"], pr["p2"]
        if p1 not in names or p2 not in names:
            continue
        f = flow.get(_pair_key(p1, p2), 0)
        # bridge score: lots of shared people, little citation traffic between the fields
        score = round(pr["shared"] / (1 + f), 2)
        n1, n2 = names[p1], names[p2]
        s1, s2 = signature(p1), signature(p2)
        hyp = (f"{pr['shared']} researchers publish in both **{n1}** and **{n2}**, "
               f"yet the two literatures exchange only {f} citation(s). The communities overlap "
               f"but the ideas haven't crossed.")
        if s1 and s2:
            hyp += f" Candidate transfer: bring {s1} into {n2}, or {s2} into {n1}."
        out.append({"p1": p1, "n1": n1, "p2": p2, "n2": n2,
                    "shared_authors": pr["shared"], "citation_flow": f,
                    "score": score, "hypothesis": hyp})
    out.sort(key=lambda x: (x["score"], x["shared_authors"]), reverse=True)
    return out[:limit]


def frontiers(store, limit: int = 8) -> list[dict]:
    act = sorted(store.activity(), key=lambda a: (a["growth"], a["recent"]), reverse=True)[:limit]
    out = []
    for a in act:
        fr = store.frontier(a["id"], 1)
        out.append({"id": a["id"], "name": a["name"], "growth": a["growth"],
                    "recent": a["recent"], "total": a["total"],
                    "newest": (fr[0] if fr else None)})
    return out


def report(store) -> dict:
    return {
        "disclaimer": ("Machine-suggested and unverified. Bridges come from author-overlap vs. "
                       "citation-flow mismatch; frontiers from recent-paper share. Contradiction "
                       "detection is intentionally omitted — it needs claim-level extraction, not "
                       "citation data."),
        "bridges": bridges(store),
        "frontiers": frontiers(store),
    }
