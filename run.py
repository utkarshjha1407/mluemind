#!/usr/bin/env python3
"""Knowledge OS — one-command launcher.

    python run.py

Rebuilds the local database from data/*.json, starts the server, opens your browser.
No installation, no internet, no database server required.
"""
from __future__ import annotations

import json
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from knowledge_os.store import Store              # noqa: E402
from knowledge_os.corpus_store import CorpusStore  # noqa: E402
from knowledge_os.server import serve             # noqa: E402

DB_PATH = ROOT / "knowledge_os.db"
CORPUS_PATH = ROOT / "corpus.db"
DATA = ROOT / "data"
HOST, PORT = "::", 8765   # dual-stack; browser sees http://localhost:PORT


def build_db() -> Store:
    if DB_PATH.exists():
        DB_PATH.unlink()
    store = Store(DB_PATH)
    store.init_schema()
    loaded = []
    for f in sorted(DATA.glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        if "problem" not in data:        # skip non-lineage data files (e.g. landmarks.json)
            continue
        store.load_lineage(data)
        loaded.append(f.stem)
    print(f"  loaded lineages: {', '.join(loaded)}")
    return store


def main() -> None:
    print("Knowledge OS — building knowledge base...")
    store = build_db()
    corpus = None
    if CORPUS_PATH.exists():
        corpus = CorpusStore(CORPUS_PATH)
        s = corpus.stats()
        print(f"  corpus: {s['papers']} papers across {s['problems_ingested']} CS problems "
              f"({s['citations']} citation edges)")
    else:
        print("  corpus: none yet — run `python -m knowledge_os.ingest` to ingest real papers")
    httpd = serve(store, corpus, HOST, PORT)
    url = f"http://localhost:{PORT}/"
    print(f"\n  Knowledge OS is running at  {url}")
    if corpus:
        print(f"  (curated lineage demo at {url}lineages)")
    print("  (press Ctrl+C to stop)\n")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  stopped.")
        httpd.shutdown()


if __name__ == "__main__":
    main()
