# Knowledge OS — Validated Knowledge Model v0.1

Derived empirically from two hand-built lineages of opposite epistemology:
- `proofs/consensus-claim-overlay.md` — engineering CS (constraint-routing, no failures).
- `proofs/amyloid-claim-overlay.md` — biomedical hypothesis science (contested, retraction, failed trials).

This spec records ONLY what survived contact with both. It supersedes the original brief's
linear `Problem→Attempt→Evidence→Outcome` model, which was disproven in both lineages.
Not yet validated against: purely descriptive/taxonomic fields and formal mathematics (see §6).

---

## 1. Storage primitive — the Claim (validated, both lineages)

```
Claim {
  id          : stable handle
  assertion   : one atomic statement
  type        : theorem | empirical-result | design-artifact | hypothesis | survey | critique
  contribution: capability | model-change | proof | understandability
              | deployment-evidence | undermining-evidence | mechanism
  source      : { paper, locus }              # PROVENANCE — mandatory
  provenance_granularity : pointed | distributional   # distributional ⇒ lower confidence
  status      : active | contested | retracted | superseded     # orthogonal to confidence
  confidence  : { value: settled|contested|emerging,
                  positions?: [ {camp, stance, source} ],        # for contested claims
                  as_of: <time> }            # confidence is time-indexed, non-monotonic
}
```
Every node in both lineages reduced to this. Problems/hypotheses/questions are NOT primitives.

## 2. Relations are first-class, typed, and an EXTENSIBLE registry (validated)

Relations connect claim↔claim, never paper↔paper (paper edges are too noisy to type).
The kind set is **domain-shaped** — a versioned registry, not a hardcoded enum:

- Structural (engineering/formal): `depends-on`, `circumvents-constraint`, `equivalent-to[scope]`,
  `generalizes`, `specializes`, `refines/optimizes`, `enables`, `limits/constrains`, `forks-problem`.
- Evidential (empirical science): `supports-hypothesis[scope]`, `undermines-hypothesis`,
  `competes-with`, `corroborates`, `complicates`, `partial-confirms[scope]`.

Two hard requirements proven necessary:
- `equivalent-to` and `supports/partial-confirms` MUST carry a **scope** argument (un-scoped
  equivalence/confirmation is a hallucination vector — Zab≈Paxos only for atomic broadcast).
- **`circumvents-constraint`** is a core kind the brief's cites/extends/refutes cannot express;
  it is the backbone of any field organized around an impossibility/limit result.

## 3. Overlays are computed, never stored as fact (validated)

Problems, Open Questions, Timelines, Reading Orders are **derived, versioned views** over claims +
relations. Rules proven necessary:
- **No "failure" category.** Negative/limit results are `undermining-evidence` or
  `constraint`, not discarded attempts. (Confirmed in both lineages, from opposite directions.)
- **Problem nodes carry an assumption-facet set** {membership, synchrony, fault, safety-type, …};
  changing assumptions `forks-problem` into a sibling, not a timeline point. (The "fuzzy lattice".)
- **"Current state" renders a time-indexed evidence ledger with camps — never a verdict.** The
  agent summarizes the ledger; it does not adjudicate.

## 4. Trust & integrity (the existential layer)

- **Retraction propagation (most trust-critical requirement found).** A `retracted`/`superseded`
  claim auto-flags every downstream claim/edge that leaned on it for re-examination. Prevents the
  system from laundering fraud into provenance-backed fact.
- **AI proposes, experts ratify, ratification is credit-bearing.** For *contested* claims,
  ratification captures **multiple positions** (proponent + skeptic), not one binary sign-off.
- **Every published claim traces to a source span** or it does not ship.

## 5. What this disproves from the original brief

- Linear `Observation→Hypothesis→Experiment→Theory` / `Problem→Attempt→Outcome` — disproven in
  CS, biomedicine, and (by construction) every field where results reshape rather than solve.
- Auto-asserted `refutes/replicates/extends` paper edges — relocated to scoped claim↔claim edges,
  human-ratified.
- "Forget citations" — citations are the substrate; claims are the overlay.
- Volume-first MVP — replaced by proof-of-atom on one lineage, expert-ratified.

## 6. Not yet validated — next stress tests (in priority order)

1. **Descriptive/taxonomic field** (systematics, linguistic typology, much of the humanities):
   may have NO central problem/hypothesis node — the case most likely to break "problem-as-overlay".
2. **Formal mathematics**: a pure `theorem` + `depends-on` lattice with no empirical evidence —
   tests whether `confidence`/`status` even apply.
3. **A field with no agreement on what counts as evidence** (philosophy, parts of economics).

## 7. Status

Atom + relations + overlay rules validated across 2 of ≥5 target epistemologies. The binding
constraint to advance to Step 4 (pipeline build) is now **human**: multi-position expert
ratification of the two existing artifacts. No further model change should be assumed correct
until §6.1 is tested — that is the one most likely to force a v0.2.
