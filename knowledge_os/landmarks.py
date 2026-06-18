"""Build the "Papers that mattered" canon — curated list enriched with live OpenAlex data.

For each curated landmark we search OpenAlex by title, attach the real citation count, canonical
id, DOI and venue, and flag whether the paper is also in our ingested corpus. Free, no key.

  python -m knowledge_os.landmarks
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from knowledge_os.openalex import OpenAlex          # noqa: E402
from knowledge_os.corpus_store import CorpusStore   # noqa: E402

DEFAULT_DB = ROOT / "corpus.db"
DEFAULT_MAILTO = "utkarshjha1407@gmail.com"


def enrich(api: OpenAlex, item: dict) -> dict:
    """Search OpenAlex for the landmark and attach live citation data (best-effort)."""
    try:
        data = api._get("works", {
            "search": item["title"],
            "per_page": 5,
            "select": "id,title,publication_year,cited_by_count,doi,primary_location",
        })
    except Exception:  # noqa: BLE001
        return item
    best, best_score = None, -1
    for w in data.get("results", []):
        yr = w.get("publication_year") or 0
        score = (w.get("cited_by_count") or 0)
        if abs(yr - item["year"]) <= 2:        # prefer a year-consistent match
            score += 10_000_000
        if score > best_score:
            best, best_score = w, score
    if best:
        loc = (best.get("primary_location") or {}).get("source") or {}
        item = {**item,
                "openalex_id": best.get("id"),
                "cited_by_count": best.get("cited_by_count"),
                "doi": best.get("doi"),
                "venue": loc.get("display_name")}
    return item


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass
    store = CorpusStore(str(DEFAULT_DB))
    api = OpenAlex(DEFAULT_MAILTO)
    curated = json.loads((ROOT / "data" / "landmarks.json").read_text(encoding="utf-8"))["landmarks"]
    print(f"Enriching {len(curated)} landmark papers from OpenAlex...")
    out = []
    for it in curated:
        e = enrich(api, it)
        if e.get("openalex_id"):
            pid = store.paper_problem(e["openalex_id"])
            e["in_corpus"] = pid is not None
            e["problem_id"] = pid
        cites = e.get("cited_by_count")
        flag = " [in corpus]" if e.get("in_corpus") else ""
        print(f"  {it['year']}  {it['title'][:54]:54} {('' if cites is None else format(cites, ',')+' cites'):>14}{flag}")
        out.append(e)
    store.replace_landmarks(out)
    n_corpus = sum(1 for x in out if x.get("in_corpus"))
    print(f"\nStored {len(out)} landmarks ({n_corpus} also present in the ingested corpus).")


if __name__ == "__main__":
    main()
