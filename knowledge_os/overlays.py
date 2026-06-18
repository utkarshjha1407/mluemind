"""Computed overlays over the claim substrate.

Nothing here is stored — every view is recomputed from claims + relations. That is the
whole architectural bet (memo 6a.1): Problems/Timelines/Ledgers are derived, versioned views.
"""
from __future__ import annotations

from collections import defaultdict, deque

from . import model


# --- Timeline ------------------------------------------------------------
def timeline(claims: list[dict]) -> list[dict]:
    """Claims ordered in time. Eras are descriptive only — no 'failure' bucket (finding D2)."""
    return sorted(claims, key=lambda c: (c["year"], c["id"]))


# --- Reading order (topological by prerequisite) -------------------------
# For each relation kind, which endpoint must be read FIRST (the prerequisite).
# Returns (predecessor, successor) or None if the kind imposes no order.
def _order_edge(rel: dict) -> tuple[str, str] | None:
    f, t, k = rel["src"], rel["dst"], rel["kind"]
    if k in ("depends-on",):                  # f needs t  -> t first
        return (t, f)
    if k in ("enables",):                     # f enables t -> f first
        return (f, t)
    if k in ("circumvents-constraint", "limits/constrains"):  # constraint first
        return (t, f) if k == "circumvents-constraint" else (f, t)
    if k in ("generalizes", "specializes", "refines/optimizes", "forks-problem"):
        return (t, f)                         # base/original before the derived work
    if k in ("supports-hypothesis", "undermines-hypothesis", "partial-confirms",
             "corroborates", "competes-with", "complicates"):
        return (t, f)                         # the claim being argued about, then its evidence
    if k in ("deploys",):
        return (t, f)                         # the protocol before its deployment
    return None                               # equivalent-to: siblings, no order


def reading_order(claims: list[dict], relations: list[dict]) -> list[dict]:
    """Kahn topological sort with year as the tie-breaker; robust to cycles (falls back to year)."""
    ids = [c["id"] for c in claims]
    by_id = {c["id"]: c for c in claims}
    succ = defaultdict(set)
    indeg = {i: 0 for i in ids}
    for r in relations:
        edge = _order_edge(r)
        if not edge:
            continue
        pred, s = edge
        if pred in by_id and s in by_id and s not in succ[pred]:
            succ[pred].add(s)
            indeg[s] += 1
    # ready = no prerequisites; emit earliest year first
    ready = sorted([i for i in ids if indeg[i] == 0], key=lambda i: (by_id[i]["year"], i))
    out: list[str] = []
    q = deque(ready)
    while q:
        # pick the ready node with the smallest year for a stable, intuitive order
        q = deque(sorted(q, key=lambda i: (by_id[i]["year"], i)))
        n = q.popleft()
        out.append(n)
        for m in sorted(succ[n], key=lambda i: (by_id[i]["year"], i)):
            indeg[m] -= 1
            if indeg[m] == 0:
                q.append(m)
    # any leftover (cycle) appended by year so the view never silently drops claims
    leftover = [i for i in ids if i not in out]
    out.extend(sorted(leftover, key=lambda i: (by_id[i]["year"], i)))
    return [dict(by_id[i], step=n + 1) for n, i in enumerate(out)]


# --- Evidence ledger (the contested "current state": findings D11/D12) ----
_LEDGER_BUCKETS = {
    "supports-hypothesis": "supporting",
    "partial-confirms": "supporting",
    "corroborates": "supporting",
    "undermines-hypothesis": "undermining",
    "competes-with": "competing",
    "complicates": "complicating",
}


def evidence_ledger(central_id: str, claims: list[dict], relations: list[dict]) -> dict:
    """For a hypothesis/central node, partition incident evidence. Renders disagreement;
    deliberately emits NO verdict (finding D11)."""
    by_id = {c["id"]: c for c in claims}
    buckets: dict[str, list[dict]] = defaultdict(list)
    for r in relations:
        if r["dst"] != central_id:
            continue
        bucket = _LEDGER_BUCKETS.get(r["kind"])
        if not bucket:
            continue
        src = by_id.get(r["src"])
        if not src:
            continue
        buckets[bucket].append({
            "claim": src,
            "kind": r["kind"],
            "scope": r.get("scope"),
            "note": r.get("note"),
            "retracted": src.get("status") == "retracted",
        })
    for b in buckets.values():
        b.sort(key=lambda e: e["claim"]["year"])
    central = by_id.get(central_id, {})
    return {
        "central": central,
        "positions": (central.get("confidence") or {}).get("positions", []),
        "supporting": buckets.get("supporting", []),
        "undermining": buckets.get("undermining", []),
        "competing": buckets.get("competing", []),
        "complicating": buckets.get("complicating", []),
        "verdict": None,  # by design — the agent summarizes the ledger, never adjudicates
    }


# --- Retraction propagation (the most trust-critical feature: finding D9) --
def retraction_impact(retracted_id: str, claims: list[dict], relations: list[dict]) -> dict:
    """Given a claim that is (or is hypothetically) retracted, BFS the claims that LEAN on it
    and must be re-examined. Distance = how directly affected."""
    by_id = {c["id"]: c for c in claims}
    if retracted_id not in by_id:
        return {"root": retracted_id, "affected": []}

    # Build adjacency of "X is weakened if Y is retracted" : weakened_if[Y] -> {X...}
    weakened_if: dict[str, set[str]] = defaultdict(set)
    reason: dict[tuple[str, str], dict] = {}
    for r in relations:
        f, t, k = r["src"], r["dst"], r["kind"]
        if k in model.LEANING_OUTWARD:
            # f --supports/enables--> t : if f retracted, t loses a pillar
            weakened_if[f].add(t)
            reason[(f, t)] = {"via": k, "scope": r.get("scope"), "note": r.get("note")}
        if k in model.LEANING_INWARD:
            # f --depends-on--> t : if t retracted, f breaks
            weakened_if[t].add(f)
            reason[(t, f)] = {"via": k, "scope": r.get("scope"), "note": r.get("note")}

    affected: list[dict] = []
    seen = {retracted_id}
    q = deque([(retracted_id, 0)])
    while q:
        node, dist = q.popleft()
        for nxt in sorted(weakened_if.get(node, ())):
            if nxt in seen:
                continue
            seen.add(nxt)
            rsn = reason.get((node, nxt), {})
            affected.append({
                "claim": by_id[nxt],
                "distance": dist + 1,
                "via": rsn.get("via"),
                "scope": rsn.get("scope"),
                "from": node,
                "severity": "direct" if dist == 0 else "indirect",
            })
            q.append((nxt, dist + 1))
    affected.sort(key=lambda a: (a["distance"], a["claim"]["id"]))
    return {"root": retracted_id, "root_claim": by_id[retracted_id], "affected": affected}
