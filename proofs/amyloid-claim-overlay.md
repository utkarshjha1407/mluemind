# Step 2 Artifact #2 — Generalization Stress Test (Hostile Epistemology)

**Lineage:** The amyloid cascade hypothesis of Alzheimer's disease.
**Why this lineage:** It is the opposite of consensus — hypothesis-driven, replication-fragile,
with genuine *refutations* (failed drug trials), *competing hypotheses* (tau, neuroinflammation),
a *contested current state*, and a *retraction/fraud event* (the trust nightmare). If the
claim-atom model survives here, it generalizes. If it breaks, better to learn it now.
**Status:** Draft for expert ratification. Hand-built, AI-assisted. Confidence values are the
author's reading and are exactly what a domain expert must contest in Step 3.

---

## A. Claims (substrate)

| id | assertion | type | contribution | source | status / conf |
|----|-----------|------|--------------|--------|---------------|
| A-PEPTIDE | The β-amyloid (Aβ) peptide is isolated and sequenced from cerebral amyloid. | empirical-result | measurement | Glenner & Wong 1984. | active / settled |
| A-CASCADE | Aβ accumulation is the *causal initiator* of AD pathology (tangles, neurodegeneration). | hypothesis | model-change | Hardy & Higgins 1992, "Amyloid cascade hypothesis". | active / **contested** |
| A-GENETICS | Mutations in APP / PSEN1 / PSEN2 cause early-onset familial AD and raise Aβ42. | empirical-result | proof-of-mechanism | Goate 1991; Sherrington 1995. | active / settled |
| A-APOE4 | APOE ε4 is the major genetic risk factor for late-onset AD (affects Aβ clearance). | empirical-result | capability | Strittmatter & Roses 1993. | active / settled |
| A-OLIGOMER | A specific soluble Aβ oligomer (Aβ*56) correlates with memory deficit in mice. | empirical-result | mechanism | Lesné et al. 2006, Nature. | **RETRACTED 2024** / was-settled |
| A-TRIALFAIL | Multiple anti-amyloid antibodies (bapineuzumab, solanezumab) hit the target yet show no clinical benefit. | empirical-result (negative) | undermining-evidence | Salloway 2014; Honig 2018. | active / settled |
| A-TAU | Tau tangle pathology correlates with cognitive decline *better* than amyloid burden. | empirical-result | competing-mechanism | Braak & Braak 1991; Bejanin 2017. | active / settled |
| A-ALT | Non-amyloid causal hypotheses (neuroinflammation; vascular; infectious/HSV) have independent support. | survey | competing-hypothesis | Heneka 2015; Itzhaki 1997. | active / emerging |
| A-ADUCANUMAB | FDA grants accelerated approval on amyloid-reduction biomarker amid advisory-panel resignations and unclear clinical benefit. | empirical-result + critique | deployment-evidence (contested) | FDA 2021; aducanumab trials. | active / **contested** |
| A-LECANEMAB | Lecanemab removes amyloid and *statistically significantly* slows decline (~27%, modest absolute). | empirical-result | qualified-confirmation | van Dyck et al. 2023, CLARITY-AD. | active / settled-but-modest |
| A-DONANEMAB | Donanemab independently shows comparable modest slowing with amyloid removal. | empirical-result | corroboration | Sims et al. 2023, TRAILBLAZER-ALZ2. | active / settled |

---

## B. The typed claim↔claim edge graph

Note the relation vocabulary is *different* from the consensus lineage — evidential, not structural.

| from | kind | to | note |
|------|------|----|------|
| A-PEPTIDE | enables | A-CASCADE | the peptide is the precondition for the hypothesis |
| A-GENETICS | supports-hypothesis | A-CASCADE | strongest pillar — causal genetics |
| A-APOE4 | complicates | A-CASCADE | clearance, not production — points partly beyond pure Aβ |
| A-OLIGOMER | supports-hypothesis | A-CASCADE | **edge inherits RETRACTED status — see D9** |
| A-TRIALFAIL | undermines-hypothesis | A-CASCADE | negative evidence is first-class, not "failure" |
| A-TAU | competes-with | A-CASCADE | rival mechanism with better clinico-pathologic correlation |
| A-ALT | competes-with | A-CASCADE | family of rival hypotheses |
| A-ADUCANUMAB | partial-confirms[biomarker] | A-CASCADE | scoped + contested confirmation |
| A-LECANEMAB | supports-hypothesis[qualified] | A-CASCADE | the partial vindication |
| A-DONANEMAB | corroborates | A-LECANEMAB | independent replication |

**Structural reading:** this graph is a *balance-of-evidence around one hypothesis node*
(supports / undermines / competes), with no `circumvents-constraint` edges at all. The dominant
relation kinds are the exact opposite of the consensus lineage. → Relation taxonomy is
domain-shaped (D10).

---

## C. The problem/hypothesis overlay (derived)

**Hypothesis node:** *Is Aβ the causal driver of Alzheimer's?*
The overlay does NOT emit a verdict. It emits a **time-indexed evidence ledger**:

- **1984–1995 — ascendant:** peptide isolated, familial genetics nail a causal mechanism.
- **2006–2012 — peak + a soft pillar:** oligomer story (A-OLIGOMER) widely cited *(later retracted)*.
- **2012–2019 — crisis:** repeated trial failures (A-TRIALFAIL); tau (A-TAU) and alternatives (A-ALT)
  gain ground; the simple cascade looks wrong.
- **2021 — institutional fracture:** aducanumab approval splits the field.
- **2022–2024 — partial vindication + integrity shock simultaneously:** lecanemab/donanemab give the
  first real clinical signal *while* the 2006 oligomer pillar is investigated and retracted.

**Current state (the honest output): genuinely contested, with named positions** — not a single answer.
A credible system must render the disagreement, not resolve it (D11).

**"Failures":** none, again. A-TRIALFAIL is *undermining evidence*, not a discarded attempt — same
reframe as the consensus lineage, reached from the opposite direction. The "drop failure" decision
(D2) is now confirmed across two unrelated epistemologies.

---

## D. Friction log (continuing — the real output)

**D9 — Claims need a STATUS lifecycle separate from confidence, and retraction must PROPAGATE.**
A-OLIGOMER was high-confidence and is now retracted. Confidence (how strong) ≠ status (does it still
stand). The schema needs `status ∈ {active, contested, retracted, superseded}` orthogonal to
`confidence`, and a retracted claim must **flag every downstream edge/claim that leaned on it** for
re-examination. This is the single most trust-critical requirement found in either lineage, and it is
absent from the brief AND the consensus artifact. Without it the system launders fraud into apparent
fact — the exact Galactica failure, but worse because it has provenance that *looks* solid.

**D10 — Relation taxonomy is domain-shaped; a fixed enum will not span knowledge.** Consensus runs on
`circumvents-constraint / equivalent-to / refines`. Amyloid runs on
`supports / undermines / competes-with / corroborates`. Neither set covers the other. → The relation
vocabulary must be an *extensible, typed, versioned* registry, not a hardcoded enum. This is a real
architecture decision: the "universal graph" cannot have a universal fixed edge schema.

**D11 — "Current state" is often a contested distribution, not a fact; the product must represent
disagreement.** Amyloid is simultaneously "vindicated" (lecanemab) and "insufficient" (modest effect,
trial failures, retraction). A system that collapses this to one answer is wrong *and* will be caught
being wrong by experts on both sides. → Overlay nodes carry **camp-aware, time-indexed confidence**
and an evidence ledger; the agent's job is to summarize the ledger, never to adjudicate it. This
directly amends the trust model: expert ratification of a contested claim must capture *multiple
positions*, not a single binary sign-off.

**D12 — Negative results are first-class evidence (confirms D2 from the other side).** Failed trials
are not failures of the field; they are high-value undermining evidence. The model handled this
cleanly with `undermines-hypothesis`. Confirmed consistent across both lineages.

---

## E. What the generalization test proves

- **Claim atom: holds in a hostile epistemology.** All 11 nodes verifiable; the hypothesis-driven,
  contested, partially-fraudulent field did NOT break the atom.
- **But three schema requirements are now non-negotiable, and they are trust-critical, not cosmetic:**
  status-lifecycle + retraction propagation (D9); extensible relation registry (D10); camp-aware
  time-indexed confidence + ledger-not-verdict overlay (D11).
- **The brief's single linear model is disproven a third time** — and now in the field it was
  *designed* for (experimental science). The truth is an evidence balance around a hypothesis node,
  not a chain.
- **Trust model amended:** ratification is multi-position for contested claims, not one expert's
  binary yes. This changes decision 6a.3.

## F. For the expert (Steps 1 & 3 — human-gated, and now MULTI-expert)

1. This lineage requires *more than one* expert by construction (it is contested) — recruit at least
   one amyloid proponent and one skeptic.
2. Ratify the status of A-OLIGOMER and confirm the propagation list (what leaned on it).
3. Confirm A-CASCADE confidence = contested-with-positions, and that the overlay must not emit a verdict.
4. Gate unchanged: no Step-4 build until the model — now including D9–D11 — is ratified.
