"""Ingestion orchestrator (Layer 0 -> 1).

  python -m knowledge_os.ingest --works-per-topic 200 --max-topics 24

Pulls real CS papers from OpenAlex, organized under OpenAlex topics (= our v1 'problems'),
scoped to core computing subfields. Resumable: re-runs skip already-ingested topics, so you
can grow the corpus toward the 500k target across many runs.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from knowledge_os.openalex import OpenAlex, reconstruct_abstract   # noqa: E402
from knowledge_os.corpus_store import CorpusStore                  # noqa: E402

DEFAULT_DB = ROOT / "corpus.db"
DEFAULT_MAILTO = "utkarshjha1407@gmail.com"

# Core computing subfields for v1 (CS & computing only; other domains come later).
CORE_SUBFIELDS = {
    "Computational Theory and Mathematics",
    "Computer Networks and Communications",
    "Hardware and Architecture",
    "Artificial Intelligence",
    "Information Systems",
    "Computer Vision and Pattern Recognition",
}
# Skip topics whose names betray non-CS OpenAlex mislabeling.
NOISE = ("geochem", "geologic", "soil", "clinical", "medical", "ecology", "agricultur",
         "seismic", "petroleum", "biomedical imaging", "remote sensing of")

# Curated canonical computing problems (verified OpenAlex topic IDs). v1 default — recognizable
# and spread across systems, theory, security, networks and AI/ML. `--auto` ignores this and
# picks top-by-works topics instead.
CURATED_TOPIC_IDS = [
    "T10715",  # Distributed and Parallel Computing Systems
    "T10317",  # Advanced Database Systems and Queries
    "T10933",  # Real-Time Systems Scheduling
    "T10054",  # Parallel Computing and Optimization Techniques
    "T10101",  # Cloud Computing and Resource Management
    "T10273",  # IoT and Edge/Fog Computing
    "T10400",  # Network Security and Intrusion Detection
    "T10237",  # Cryptography and Data Security
    "T10270",  # Blockchain Technology Applications and Security
    "T12127",  # Software System Performance and Reliability
    "T10142",  # Formal Methods in Verification
    "T12002",  # Computability, Logic, AI Algorithms
    "T10374",  # Advanced Graph Theory Research
    "T10792",  # Matrix Theory and Algorithms
    "T10320",  # Neural Networks and Applications (deep learning)
    "T10181",  # Natural Language Processing Techniques
    "T10036",  # Advanced Neural Network Applications (computer vision)
    "T10462",  # Reinforcement Learning in Robotics
    "T12072",  # Machine Learning and Algorithms
    "T10286",  # Information Retrieval and Search Behavior
    "T10215",  # Semantic Web and Ontologies
    "T10679",  # Service-Oriented Architecture and Web Services
    "T10904",  # Embedded Systems Design Techniques
    "T10531",  # Advanced Vision and Imaging
]


def pick_topics(topics: list[dict], max_topics: int) -> list[dict]:
    by_sub: dict[str, list[dict]] = {}
    for t in topics:
        sf = (t.get("subfield") or {}).get("display_name")
        if sf not in CORE_SUBFIELDS:
            continue
        if any(n in t["display_name"].lower() for n in NOISE):
            continue
        by_sub.setdefault(sf, []).append(t)
    for lst in by_sub.values():
        lst.sort(key=lambda t: t.get("works_count", 0), reverse=True)
    # round-robin across subfields for breadth
    picked: list[dict] = []
    i = 0
    subs = sorted(by_sub)
    while len(picked) < max_topics and any(by_sub.values()):
        sf = subs[i % len(subs)]
        if by_sub.get(sf):
            picked.append(by_sub[sf].pop(0))
        i += 1
        if i > max_topics * 4:
            break
    return picked


def to_paper(w: dict, problem_id: str) -> tuple[dict, list, list]:
    loc = (w.get("primary_location") or {}).get("source") or {}
    authors = []
    for a in (w.get("authorships") or [])[:6]:
        au = a.get("author") or {}
        if au.get("id"):
            authors.append((au["id"], au.get("display_name", ""), a.get("author_position", "")))
    refs = (w.get("referenced_works") or [])[:60]
    paper = {
        "id": w["id"], "title": w.get("title") or "(untitled)",
        "year": w.get("publication_year") or 0,
        "cited_by_count": w.get("cited_by_count") or 0,
        "problem_id": problem_id, "venue": loc.get("display_name") or "",
        "doi": w.get("doi") or "", "type": w.get("type") or "",
        "abstract": reconstruct_abstract(w.get("abstract_inverted_index")),
    }
    return paper, authors, refs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(DEFAULT_DB))
    ap.add_argument("--mailto", default=DEFAULT_MAILTO)
    ap.add_argument("--works-per-topic", type=int, default=200)
    ap.add_argument("--max-topics", type=int, default=24)
    ap.add_argument("--auto", action="store_true",
                    help="pick top-by-works topics instead of the curated canonical set")
    ap.add_argument("--from-year", type=int, default=None)
    args = ap.parse_args()

    try:  # Windows consoles default to cp1252; force UTF-8 so titles never crash output
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass

    store = CorpusStore(args.db)
    api = OpenAlex(args.mailto)

    print("Fetching CS topic catalogue from OpenAlex...")
    topics = api.cs_topics()
    print(f"  {len(topics)} CS topics available.")
    for t in topics:                       # register the full problem catalogue
        sf = t.get("subfield") or {}
        if sf.get("id"):
            store.upsert_subfield(sf["id"], sf.get("display_name", ""))
        store.upsert_problem(t)
    store.commit()

    if args.auto:
        targets = pick_topics(topics, args.max_topics)
    else:
        by_id = {t["id"].split("/")[-1]: t for t in topics}
        targets = [by_id[tid] for tid in CURATED_TOPIC_IDS if tid in by_id][:args.max_topics]
    print(f"Ingesting works for {len(targets)} core-computing problems "
          f"(up to {args.works_per_topic} papers each):")

    total = 0
    for t in targets:
        existing = store.problem(t["id"])
        if existing and existing["ingested"]:
            print(f"  - {t['display_name'][:48]:48}  (already ingested, skip)")
            continue
        n = 0
        for w in api.works_for_topic(t["id"], args.works_per_topic, from_year=args.from_year):
            paper, authors, refs = to_paper(w, t["id"])
            store.insert_paper(paper, authors, refs)
            n += 1
        store.mark_problem_ingested(t["id"], n)
        store.commit()
        total += n
        sf = (t.get("subfield") or {}).get("display_name", "")[:22]
        print(f"  [ok] {t['display_name'][:46]:46}  {n:4} papers   [{sf}]")

    s = store.stats()
    print(f"\nCorpus now: {s['papers']} papers | {s['problems_ingested']} problems | "
          f"{s['authors']} authors | {s['citations']} citation edges")


if __name__ == "__main__":
    main()
