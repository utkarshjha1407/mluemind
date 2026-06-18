# Step 2 Artifact — Hand-Built Claim Set + Problem Overlay (Deepened)

**Lineage:** Linearizable distributed consensus (crash + Byzantine; permissioned + permissionless).
**Purpose:** Prove the claim-atom model + typed claim↔claim edges on real landmark papers BEFORE
building any pipeline.
**Status:** Draft for expert ratification (Step 3). Hand-built, AI-assisted — not auto-generated.

The most valuable output remains the *friction log* (Section D): where the model strains against
reality. Deepening from 10 → 18 claims and adding the full edge graph surfaced three new findings
(D6–D8) that the shallow version could not have.

---

## A. Schema (as exercised)

```
Claim {
  id, assertion,
  type         : theorem | design-artifact | empirical-result | survey | critique
  contribution : capability | model-change | proof | understandability | deployment-evidence
  source       : paper + span/locus   (PROVENANCE — pointed or distributional)
  confidence   : settled | contested | emerging
}
Relation (claim↔claim, first-class) {
  from, to,
  kind : depends-on | enables | circumvents-constraint | generalizes | specializes
       | refines/optimizes | equivalent-to[scope] | limits/constrains | deploys | forks-problem
}
```
`contribution` (D3) and the relation `kind` set (D1) are both Step-2 additions to the original model.

---

## B. Claims (substrate)

| id | assertion | type | contribution | source | conf |
|----|-----------|------|--------------|--------|------|
| C-CLOCKS | A logical-clock "happens-before" relation gives a partial/total order of events without synchronized time. | theorem | model-change | Lamport 1978, "Time, Clocks, and the Ordering of Events". | settled |
| C-SMR | Any deterministic service can be made fault-tolerant by replicating it as a state machine fed an agreed command log — reducing replication to consensus-on-a-log. | design-artifact | model-change | Lamport 1978; Schneider 1990 survey. | settled |
| C-BGP | With arbitrary (Byzantine) faults, agreement in a synchronous system requires ≥ 3f+1 nodes to tolerate f faulty. | theorem | proof | Lamport, Shostak, Pease 1982, "The Byzantine Generals Problem". | settled |
| C-FLP | No deterministic protocol solves consensus in an *asynchronous* system if even one process may crash. | theorem | proof | Fischer, Lynch, Paterson 1985. | settled |
| C-DLS | Consensus IS solvable under *partial synchrony* (delay bounds hold eventually). | theorem | model-change | Dwork, Lynch, Stockmeyer 1988. | settled |
| C-PAXOS-SAFE | A protocol guarantees agreement (safety) under full asynchrony with crash faults. | theorem | capability | Lamport 1998, "The Part-Time Parliament". | settled |
| C-PAXOS-LIVE | That protocol makes progress only once a single stable leader emerges (partial synchrony) — consistent with C-FLP. | design-artifact | capability | Lamport 2001, "Paxos Made Simple". | settled |
| C-VR | Viewstamped Replication, derived independently, gives consensus-equivalent guarantees via primary-backup + view change. | design-artifact | capability | Oki & Liskov 1988; Liskov & Cowling 2012. | settled |
| C-ZAB | Atomic broadcast with a primary-order guarantee (Zab) provides the agreement substrate for a coordination service. | design-artifact | capability | Junqueira et al. 2011 (ZooKeeper/Zab). | settled |
| C-PBFT | Byzantine consensus is achievable at *practical* performance with 3f+1 replicas under partial synchrony. | design-artifact | capability | Castro & Liskov 1999, "Practical BFT". | settled |
| C-CAP | Under network partition a system cannot be both linearizable and available. | theorem | proof | Gilbert & Lynch 2002 (proving Brewer 2000). | settled |
| C-CHUBBY | Paxos runs in production as a coarse-grained lock/coordination service at scale. | empirical-result | deployment-evidence | Burrows 2006, "The Chubby Lock Service". | settled |
| C-SPANNER | Paxos + bounded-clock uncertainty (TrueTime) yields external consistency at global scale in production. | empirical-result | deployment-evidence | Corbett et al. 2012, "Spanner". | settled |
| C-RAFT | A consensus protocol can match Paxos safety/liveness while being substantially more understandable/implementable. | design-artifact | understandability | Ongaro & Ousterhout 2014. | settled |
| C-EPAXOS | Removing the single stable leader (leaderless, dependency-tracked commits) lowers commit latency and removes the leader bottleneck. | design-artifact | refines/optimizes | Moraru et al. 2013, "EPaxos". | settled |
| C-FPAXOS | Quorum intersection is only required *across* Paxos phases, not within — enabling smaller/asymmetric quorums. | theorem | generalizes | Howard et al. 2016, "Flexible Paxos". | settled |
| C-NAKAMOTO | Probabilistic agreement is achievable among *open/permissionless* membership via proof-of-work + longest-chain, under a synchrony + honest-majority assumption. | design-artifact | model-change | Nakamoto 2008, "Bitcoin". | contested |
| C-HOTSTUFF | BFT consensus with *linear* communication per view and a single responsive leader rotation enables large-scale BFT. | design-artifact | refines/optimizes | Yin et al. 2019, "HotStuff". | settled |

---

## C. The typed claim↔claim edge graph (the real structure)

| from | kind | to | note |
|------|------|----|------|
| C-CLOCKS | enables | C-SMR | ordering is the precondition for an agreed log |
| C-SMR | depends-on | C-PAXOS-SAFE | SMR *reduces to* consensus on the log |
| C-BGP | limits/constrains | C-PBFT | 3f+1 lower bound the protocol must meet |
| C-FLP | limits/constrains | C-PAXOS-SAFE | the impossibility every crash protocol routes around |
| C-DLS | circumvents-constraint | C-FLP | escape via model change (partial synchrony) |
| C-PAXOS-LIVE | depends-on | C-DLS | liveness assumes partial synchrony |
| C-PAXOS-SAFE | circumvents-constraint | C-FLP | safety always; liveness deferred to C-PAXOS-LIVE |
| C-VR | equivalent-to[crash consensus] | C-PAXOS-SAFE | independently derived; equivalence recognized later |
| C-RAFT | equivalent-to[safety/liveness] | C-PAXOS-SAFE | differs only in understandability |
| C-ZAB | equivalent-to[atomic broadcast] | C-PAXOS-SAFE | *scoped* equivalence — see D7 |
| C-PBFT | generalizes | C-PAXOS-SAFE | crash → Byzantine fault model |
| C-PBFT | circumvents-constraint | C-FLP | partial synchrony again |
| C-EPAXOS | refines/optimizes | C-PAXOS-LIVE | removes the stable-leader bottleneck |
| C-FPAXOS | generalizes | C-PAXOS-SAFE | weakens the quorum-intersection requirement |
| C-HOTSTUFF | refines/optimizes | C-PBFT | linear communication, responsive rotation |
| C-CAP | limits/constrains | C-SMR | bounds availability of any consensus-backed service |
| C-CHUBBY | deploys | C-PAXOS-LIVE | production evidence |
| C-SPANNER | deploys | C-PAXOS-LIVE | + adds bounded-clock model |
| C-NAKAMOTO | forks-problem | C-PAXOS-SAFE | different membership+safety regime — a SIBLING problem, see D6 |

**Structural reading:** the graph is dominated by `circumvents-constraint` edges all pointing at
C-FLP, and `equivalent-to`/`refines` clusters around C-PAXOS. The field is literally organized as
"ways to route around one impossibility, then optimize the canonical route." None of
cites/extends/refutes (the brief's taxonomy) captures this.

---

## D. Friction log (the real output)

**D1–D5:** carried from the shallow version, now folded into the locked model (memo §3a):
claim↔claim edges; drop "failure"; add contribution dimension; `equivalent-to`; dual provenance
granularity.

**D6 — Assumption changes FORK the problem; the lattice is real, not rhetorical.** C-NAKAMOTO does
not solve "the same problem" as Paxos — it changes membership (open vs. closed) and safety
(probabilistic vs. deterministic). Forcing it onto one timeline is misleading; it is a *sibling*
problem under relaxed assumptions. The overlay needs an explicit `forks-problem` relation and the
problem node must carry its *assumption set* (membership, synchrony, fault, safety-type) as
first-class facets. This is the concrete proof of the memo's "fuzzy lattice, not a list" claim — and
the single most important structural requirement for the schema.

**D7 — Equivalence is scoped, not binary.** C-ZAB is equivalent to Paxos *for atomic broadcast* but
not identical in general; C-RAFT is equivalent *for safety/liveness*. `equivalent-to` must carry a
scope argument or the graph will assert false identities. Un-scoped equivalence is a hallucination
vector.

**D8 — `circumvents-constraint` is a missing, dominant relation type.** It is neither cites, extends,
nor refutes. It is the backbone of this entire lineage and almost certainly of any field organized
around an impossibility/limit result (Gödel, NP-hardness, no-cloning, Arrow's theorem…). If the
edge taxonomy lacks it, the model misses how whole fields are actually shaped. Promote it to a
core relation kind.

---

## E. What this proves for the build

- **Claim atom + typed claim↔claim edges: holds at depth.** 18 claims, 19 edges, all verifiable.
- **Problem node must carry an assumption-facet set** (D6) and support sibling forks — this is now a
  hard schema requirement, not a nicety.
- **Relation kinds confirmed needed:** `circumvents-constraint` (D8) and scoped `equivalent-to` (D7)
  beyond the brief's cites/extends/refutes.
- **The brief's linear Attempt→Outcome chain: disproven again** — the structure is a constraint-routing
  DAG, not a chain.

## F. Open items to test with the expert (Steps 1 & 3 — human-gated)

1. Is C-NAKAMOTO a sibling problem or a different problem entirely? (Tests the fork boundary — the
   hardest ontology call.)
2. Ratify the `equivalent-to` scopes in Section C (Zab, Raft, VR) — these are the claims most likely
   to be contested.
3. Confirm C-NAKAMOTO confidence = `contested` (probabilistic safety is genuinely debated as
   "consensus").
4. Gate: if the expert will not say "correct, I'd share this," iterate B/C/D — do **not** start Step 4.
