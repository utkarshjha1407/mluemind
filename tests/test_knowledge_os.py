"""Zero-dependency tests:  python -m unittest discover -s tests

Cover the rules the two stress lineages proved necessary: provenance required, scoped edges,
status lifecycle, topological reading order, and retraction propagation.
"""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from knowledge_os import model, overlays  # noqa: E402
from knowledge_os.store import Store      # noqa: E402


def load(name):
    return json.loads((ROOT / "data" / f"{name}.json").read_text(encoding="utf-8"))


class TestModel(unittest.TestCase):
    def test_seed_lineages_validate(self):
        for n in ("consensus", "amyloid"):
            model.validate_lineage(load(n))  # raises on failure

    def test_provenance_required(self):
        with self.assertRaises(model.ModelError):
            model.validate_claim({"id": "X", "type": "theorem", "contribution": "proof",
                                  "year": 2000, "status": "active",
                                  "confidence": {"value": "settled"}, "source": {}})

    def test_scoped_edge_requires_scope(self):
        ids = {"A", "B"}
        with self.assertRaises(model.ModelError):
            model.validate_relation({"from": "A", "to": "B", "kind": "equivalent-to"}, ids)
        # with scope it passes
        model.validate_relation({"from": "A", "to": "B", "kind": "equivalent-to",
                                 "scope": "crash consensus"}, ids)

    def test_unknown_relation_kind_rejected(self):
        with self.assertRaises(model.ModelError):
            model.validate_relation({"from": "A", "to": "B", "kind": "inspired-by"}, {"A", "B"})


class TestOverlays(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.consensus = load("consensus")
        cls.amyloid = load("amyloid")

    def test_reading_order_respects_prereqs(self):
        c = self.consensus
        order = overlays.reading_order(c["claims"], _rels(c))
        pos = {x["id"]: x["step"] for x in order}
        # FLP (the constraint) must precede the protocol that circumvents it
        self.assertLess(pos["C-FLP"], pos["C-PAXOS-SAFE"])
        # PBFT generalizes Paxos -> Paxos first
        self.assertLess(pos["C-PAXOS-SAFE"], pos["C-PBFT"])
        # every claim appears exactly once
        self.assertEqual(len(order), len(c["claims"]))

    def test_retraction_propagates_to_dependents(self):
        a = self.amyloid
        impact = overlays.retraction_impact("A-OLIGOMER", a["claims"], _rels(a))
        affected = {x["claim"]["id"] for x in impact["affected"]}
        # the retracted oligomer paper supported the cascade hypothesis -> it must be flagged
        self.assertIn("A-CASCADE", affected)

    def test_retraction_of_isolated_claim_has_no_impact(self):
        a = self.amyloid
        impact = overlays.retraction_impact("A-TAU", a["claims"], _rels(a))
        # A-TAU only *competes-with* the cascade; competing is not a leaning edge
        self.assertEqual(impact["affected"], [])

    def test_ledger_partitions_evidence_without_verdict(self):
        a = self.amyloid
        L = overlays.evidence_ledger("A-CASCADE", a["claims"], _rels(a))
        sup = {e["claim"]["id"] for e in L["supporting"]}
        und = {e["claim"]["id"] for e in L["undermining"]}
        self.assertIn("A-GENETICS", sup)
        self.assertIn("A-TRIALFAIL", und)
        self.assertIsNone(L["verdict"])  # never adjudicates
        self.assertTrue(L["positions"])  # contested -> carries camps


class TestStore(unittest.TestCase):
    def test_load_and_query_roundtrip(self):
        store = Store(":memory:")
        store.init_schema()
        store.load_lineage(load("consensus"))
        self.assertEqual(len(store.problems()), 1)
        self.assertEqual(len(store.claims("P-CONSENSUS")), len(load("consensus")["claims"]))
        hits = store.search("Byzantine")
        self.assertTrue(any("Byzantine" in h["assertion"] for h in hits))


CORPUS_DB = ROOT / "corpus.db"


@unittest.skipUnless(CORPUS_DB.exists(), "corpus.db not present (run knowledge_os.ingest)")
class TestCorpus(unittest.TestCase):
    """Run only when a real ingested corpus exists; no network access here."""
    @classmethod
    def setUpClass(cls):
        from knowledge_os.corpus_store import CorpusStore
        cls.store = CorpusStore(CORPUS_DB)

    def test_corpus_has_papers_and_problems(self):
        s = self.store.stats()
        self.assertGreater(s["papers"], 0)
        self.assertGreater(s["problems_ingested"], 0)

    def test_problem_detail_is_computed(self):
        from knowledge_os import corpus_overlays
        probs = self.store.problems(ingested_only=True)
        d = corpus_overlays.problem_detail(self.store, probs[0]["id"])
        self.assertIn("timeline", d)
        self.assertTrue(d["milestones"])
        # milestones are sorted by citations descending
        cites = [m["cited_by_count"] for m in d["milestones"]]
        self.assertEqual(cites, sorted(cites, reverse=True))

    def test_universe_edges_within_nodes(self):
        from knowledge_os import corpus_overlays
        g = corpus_overlays.universe(self.store)
        ids = {n["id"] for n in g["nodes"]}
        for e in g["edges"]:
            self.assertIn(e["src"], ids)
            self.assertIn(e["dst"], ids)
            self.assertNotEqual(e["src"], e["dst"])


def _rels(data):
    # adapt seed 'from/to' to the store's 'src/dst' shape used by overlays
    return [dict(src=r["from"], dst=r["to"], kind=r["kind"],
                 scope=r.get("scope"), note=r.get("note")) for r in data["relations"]]


if __name__ == "__main__":
    unittest.main()
