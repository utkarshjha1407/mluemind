"""The validated knowledge model (schema v0.1) as code.

This is deliberately small and explicit. Every rule here was forced by one of the two
hand-built stress lineages (consensus, amyloid). Comments cite the finding (Dn) that
justifies the rule so the model stays honest as it grows.
"""
from __future__ import annotations

# --- Controlled vocabularies (extensible registries, NOT a frozen enum: finding D10) ---

CLAIM_TYPES = {
    "theorem", "empirical-result", "design-artifact", "hypothesis", "survey", "critique",
}

CONTRIBUTIONS = {
    "capability", "model-change", "proof", "understandability", "deployment-evidence",
    "undermining-evidence", "mechanism", "measurement", "corroboration",
    "refines/optimizes", "generalizes",
}

# Status is ORTHOGONAL to confidence (finding D9 — retraction lifecycle).
STATUSES = {"active", "contested", "retracted", "superseded"}
CONFIDENCE_VALUES = {"settled", "contested", "emerging"}

# Relation kinds are domain-shaped (D10). Two families, one registry.
STRUCTURAL_KINDS = {
    "depends-on", "enables", "circumvents-constraint", "generalizes", "specializes",
    "refines/optimizes", "limits/constrains", "forks-problem", "equivalent-to", "deploys",
}
EVIDENTIAL_KINDS = {
    "supports-hypothesis", "undermines-hypothesis", "competes-with", "corroborates",
    "complicates", "partial-confirms",
}
RELATION_KINDS = STRUCTURAL_KINDS | EVIDENTIAL_KINDS

# Scoped kinds MUST carry a scope or they become hallucination vectors (finding D7).
SCOPED_KINDS = {"equivalent-to", "supports-hypothesis", "partial-confirms"}

# Edges along which a retraction of `to`/`from` propagates doubt (finding D9).
# Reading: if the *source claim* is retracted, the *target* of these kinds is weakened.
LEANING_OUTWARD = {
    "supports-hypothesis", "partial-confirms", "corroborates", "enables",
    "generalizes", "refines/optimizes",
}
# Reading: if the *target claim* is retracted, the *source* of these kinds is weakened.
LEANING_INWARD = {"depends-on", "deploys"}


class ModelError(ValueError):
    """Raised when seed data violates the knowledge model."""


def validate_claim(c: dict) -> None:
    cid = c.get("id", "<no id>")
    if not c.get("id"):
        raise ModelError("claim missing id")
    if c.get("type") not in CLAIM_TYPES:
        raise ModelError(f"{cid}: unknown claim type {c.get('type')!r}")
    if c.get("contribution") not in CONTRIBUTIONS:
        raise ModelError(f"{cid}: unknown contribution {c.get('contribution')!r}")
    if c.get("status", "active") not in STATUSES:
        raise ModelError(f"{cid}: unknown status {c.get('status')!r}")
    conf = c.get("confidence") or {}
    if conf.get("value") not in CONFIDENCE_VALUES:
        raise ModelError(f"{cid}: unknown confidence value {conf.get('value')!r}")
    src = c.get("source") or {}
    if not src.get("paper"):
        raise ModelError(f"{cid}: missing provenance (source.paper) — claims must trace to a source")
    if not c.get("year"):
        raise ModelError(f"{cid}: missing year")


def validate_relation(r: dict, claim_ids: set[str]) -> None:
    f, t, kind = r.get("from"), r.get("to"), r.get("kind")
    if kind not in RELATION_KINDS:
        raise ModelError(f"relation {f}->{t}: unknown kind {kind!r}")
    if f not in claim_ids:
        raise ModelError(f"relation kind {kind}: unknown source claim {f!r}")
    if t not in claim_ids:
        raise ModelError(f"relation kind {kind}: unknown target claim {t!r}")
    if kind in SCOPED_KINDS and not r.get("scope"):
        raise ModelError(f"relation {f}-{kind}->{t}: scoped kind requires a 'scope' (finding D7)")


def validate_lineage(data: dict) -> None:
    """Validate one seed lineage; raises ModelError on the first problem found."""
    if not data.get("problem", {}).get("id"):
        raise ModelError("lineage missing problem.id")
    claims = data.get("claims", [])
    ids = {c.get("id") for c in claims}
    if len(ids) != len(claims):
        raise ModelError("duplicate claim ids in lineage")
    for c in claims:
        validate_claim(c)
    for r in data.get("relations", []):
        validate_relation(r, ids)
