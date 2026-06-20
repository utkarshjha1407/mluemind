"""Static export — dump the corpus + computed overlays to JSON the React app reads directly.

This decouples the premium frontend from the Python server: `python export_static.py` writes
app/public/data/*.json, then the Vite app fetches them. The site becomes fully static — deploy
anywhere free, agent/search run client-side. On-ideology: owned, offline-capable, $0.

  python export_static.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from knowledge_os.corpus_store import CorpusStore     # noqa: E402
from knowledge_os import corpus_overlays, scientist   # noqa: E402

OUT = ROOT / "app" / "public" / "data"
CORPUS = ROOT / "corpus.db"


def short(pid: str) -> str:
    return pid.split("/")[-1]


def write(rel: str, obj) -> int:
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    p.write_text(data, encoding="utf-8")
    return len(data)


def main():
    if not CORPUS.exists():
        sys.exit("corpus.db not found — run `python -m knowledge_os.ingest` first")
    store = CorpusStore(CORPUS)

    write("stats.json", store.stats())
    write("subfields.json", store.subfields())

    problems = store.problems(ingested_only=True)
    for p in problems:
        p["short"] = short(p["id"])
    write("problems.json", problems)

    for p in problems:
        detail = corpus_overlays.problem_detail(store, p["id"])
        # add short ids for client-side routing on related problems
        for r in detail.get("related", []):
            r["short"] = short(r["id"])
        write(f"problem/{p['short']}.json", detail)

    write("landmarks.json", store.landmarks())

    uni = corpus_overlays.universe(store)
    for n in uni["nodes"]:
        n["short"] = short(n["id"])
    write("universe.json", uni)

    rep = scientist.report(store)
    for b in rep.get("bridges", []):
        b["s1"], b["s2"] = short(b["p1"]), short(b["p2"])
    for f in rep.get("frontiers", []):
        f["short"] = short(f["id"])
    write("opportunities.json", rep)

    # client search index — minimal rows for in-browser search over all papers
    rows = store.conn.execute(
        "SELECT p.id, p.title, p.year, p.cited_by_count, p.problem_id, pr.name AS problem_name "
        "FROM papers p JOIN problems pr ON pr.id=p.problem_id ORDER BY p.cited_by_count DESC"
    ).fetchall()
    papers = [{"id": r["id"], "title": r["title"], "year": r["year"],
               "cited_by_count": r["cited_by_count"], "short": short(r["problem_id"]),
               "problem_name": r["problem_name"]} for r in rows]
    sz = write("search.json", papers)

    n_files = len(problems) + 7
    print(f"Exported {n_files} JSON files to {OUT}")
    print(f"  {len(problems)} problems · {len(papers)} papers in search index · "
          f"search.json {sz/1024:.0f} KB")


if __name__ == "__main__":
    main()
