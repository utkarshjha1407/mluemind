"""Our own Layer-2 extraction — no API, no per-call cost, runs offline.

This is the architecture that actually scales to a 250M-paper corpus: per-paper LLM calls
don't, but TF-IDF embeddings + clustering do. For each topic we:
  1. extract a problem/method sentence per paper with simple rules (abstracts are formulaic),
  2. embed titles+abstracts with TF-IDF,
  3. cluster (K-means) to discover the sub-problems that exist inside the topic,
  4. label each cluster by its most distinctive terms.

Output goes into the same `extractions` table (backend='local') and the same UI as the LLM
path — the two backends coexist; the LLM one is an optional quality upgrade, not a dependency.

Requires numpy + scikit-learn (offline build-time only; the app's runtime stays zero-dep).

  python -m knowledge_os.extract_local                 # every ingested topic without extractions
  python -m knowledge_os.extract_local --problem T10054
"""
from __future__ import annotations

import argparse
import re
import sys
from math import sqrt
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from knowledge_os.corpus_store import CorpusStore   # noqa: E402

_SENT = re.compile(r"(?<=[.!?])\s+")
PROBLEM_CUES = ("problem", "challenge", "difficult", "lack", "limitation", "however",
                "issue", "bottleneck", "hard", "fail", "costly", "expensive", "cannot",
                "remains", "need", "unsolved", "gap")
METHOD_CUES = ("we propose", "we present", "we introduce", "we develop", "we design",
               "this paper", "this work", "approach", "framework", "method", "algorithm",
               "model", "we show", "novel")
CONTRIB_CUES = ("results show", "outperform", "achieve", "improve", "demonstrate",
                "experiment", "evaluat", "state-of-the-art", "accuracy", "reduce")
# Boilerplate that pollutes TF-IDF labels (XML namespaces, venue/citation cruft).
EXTRA_STOP = {"w3", "xmlns", "xlink", "www", "http", "https", "doi", "org", "proceedings",
              "meeting", "pp", "vol", "ieee", "acm", "springer", "elsevier", "conference",
              "journal", "paper", "papers", "using", "based", "approach", "method", "results",
              "propose", "proposed", "present", "presented", "study", "research",
              "math", "mathml", "mml", "mtext", "mrow", "etx", "sub", "sup", "xml", "html"}


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENT.split(text or "") if len(s.strip()) > 25]


def _pick(sents: list[str], cues, fallback_idx: int) -> str:
    for s in sents:
        low = s.lower()
        if any(c in low for c in cues):
            return s[:300]
    return (sents[fallback_idx][:300] if len(sents) > fallback_idx else
            (sents[0][:300] if sents else ""))


def rule_extract(title: str, abstract: str) -> dict:
    sents = _sentences(abstract)
    return {
        "problem": _pick(sents, PROBLEM_CUES, 0),
        "method": _pick(sents, METHOD_CUES, 1),
        "contribution": _pick(sents, CONTRIB_CUES, len(sents) - 1 if sents else 0),
        "limitation": "",  # not reliably stated in abstracts; left to the LLM upgrade
    }


def _label(centroid, features, topic_name: str) -> str:
    """Name a cluster from its most distinctive TF-IDF terms, skipping topic-name words."""
    stop = {w for w in re.findall(r"[a-z]+", topic_name.lower())}
    order = centroid.argsort()[::-1]
    picked: list[str] = []
    for idx in order:
        term = features[idx]
        words = term.split()
        if all(w in stop for w in words):
            continue
        if any(term in p or p in term for p in picked):
            continue
        picked.append(term)
        if len(picked) >= 3:
            break
    return " · ".join(w.title() for w in picked) if picked else "General"


def extract_topic(store: CorpusStore, pid: str, topic_name: str) -> int:
    from sklearn.cluster import KMeans
    from sklearn.feature_extraction.text import TfidfVectorizer, ENGLISH_STOP_WORDS

    rows = store.conn.execute(
        "SELECT id,title,abstract FROM papers WHERE problem_id=? AND length(abstract)>200 "
        "AND title NOT LIKE 'Lecture Notes%'", (pid,)).fetchall()
    rows = [dict(r) for r in rows]
    if len(rows) < 12:
        return 0
    docs = [f"{r['title']}. {r['abstract']}" for r in rows]
    vec = TfidfVectorizer(stop_words=list(ENGLISH_STOP_WORDS | EXTRA_STOP),
                          ngram_range=(1, 2), min_df=3, max_df=0.6)
    try:
        X = vec.fit_transform(docs)
    except ValueError:
        return 0
    features = vec.get_feature_names_out()
    k = max(3, min(8, round(sqrt(len(rows) / 3))))
    km = KMeans(n_clusters=k, random_state=42, n_init=4).fit(X)
    labels = [_label(km.cluster_centers_[c], features, topic_name) for c in range(k)]

    n = 0
    for r, c in zip(rows, km.labels_):
        e = rule_extract(r["title"], r["abstract"])
        e["canonical_problem"] = labels[c]
        store.add_extraction(r["id"], e, "local")
        n += 1
    store.commit()
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(ROOT / "corpus.db"))
    ap.add_argument("--problem", default=None, help="one topic id; omit for all ingested topics")
    ap.add_argument("--force", action="store_true", help="re-extract topics that already have extractions")
    args = ap.parse_args()

    store = CorpusStore(args.db)
    topics = store.problems(ingested_only=True)
    if args.problem:
        short = args.problem.split("/")[-1]
        topics = [t for t in topics if t["id"].endswith(short)]

    # topics extracted by a NON-local backend (LLM/seed) are protected — never overwrite them
    protected = {r[0] for r in store.conn.execute(
        "SELECT DISTINCT p.problem_id FROM extractions e JOIN papers p ON p.id=e.paper_id "
        "WHERE e.backend <> 'local'").fetchall()}
    has_local = {r[0] for r in store.conn.execute(
        "SELECT DISTINCT p.problem_id FROM extractions e JOIN papers p ON p.id=e.paper_id "
        "WHERE e.backend = 'local'").fetchall()}

    print("Building local sub-problems (TF-IDF + K-means, no API)...")
    total = 0
    for t in topics:
        if t["id"] in protected:
            print(f"  - {t['name'][:46]:46}  (LLM/seed extraction, preserved)")
            continue
        if t["id"] in has_local and not args.force:
            print(f"  - {t['name'][:46]:46}  (already has local extractions, skip)")
            continue
        n = extract_topic(store, t["id"], t["name"])
        total += n
        nsub = len({r[0] for r in store.conn.execute(
            "SELECT canonical_problem FROM extractions e JOIN papers p ON p.id=e.paper_id "
            "WHERE p.problem_id=?", (t["id"],)).fetchall()})
        status = f"{n:4} papers -> {nsub} sub-problems" if n else "too few abstracts, skipped"
        print(f"  [ok] {t['name'][:46]:46}  {status}")

    s = store.extraction_stats()
    print(f"\nExtracted {total} papers this run | corpus total: {s['extracted']} papers, "
          f"{s['canonical_problems']} sub-problems")


if __name__ == "__main__":
    main()
