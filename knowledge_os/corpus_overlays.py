"""Computed problem-centric views over the real corpus (Layers 3 & 4 of the original plan).

Everything here is derived from the ingested claims/papers + citation graph — nothing curated.
"""
from __future__ import annotations

from .corpus_store import CorpusStore


def problem_detail(store: CorpusStore, pid: str) -> dict | None:
    prob = store.problem(pid)
    if not prob:
        return None
    summary = store.problem_summary(pid)
    return {
        "problem": prob,
        "summary": summary,
        "timeline": store.timeline(pid),
        "milestones": store.papers_for_problem(pid, limit=10),   # top-cited = breakthroughs
        "frontier": store.frontier(pid, limit=8),                # recent high-impact = active edge
        "key_authors": store.key_authors(pid, limit=10),
        "related": store.related_problems(pid, limit=8),
    }


def universe(store: CorpusStore) -> dict:
    """Cross-problem citation graph: the 'how disciplines connect' view, scoped to CS for v1."""
    problems = store.problems(ingested_only=True)
    nodes = [{
        "id": p["id"], "name": p["name"], "subfield_id": p["subfield_id"],
        "n_papers": p["n_papers"],
    } for p in problems]
    ids = {n["id"] for n in nodes}
    edges = [e for e in store.cross_problem_edges(min_weight=3)
             if e["src"] in ids and e["dst"] in ids]
    return {"nodes": nodes, "edges": edges}
