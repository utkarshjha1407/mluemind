"""Layer 2 — per-paper problem extraction (the original plan's core).

Reads a paper's title + abstract and extracts {problem, method, contribution, limitation,
canonical_problem}. canonical_problem is the finer-grained problem the paper actually addresses
— more specific than the OpenAlex topic, and the basis for v2 sub-problems.

Two backends:
  * AnthropicBackend — real LLM extraction (claude-opus-4-8, structured output). The scale path;
    used automatically when ANTHROPIC_API_KEY is set.
  * SeedBackend — replays pre-extracted JSON from data/extractions/*.json. Runs with no key,
    so the feature is demonstrable now. Same records the LLM path produces.

  python -m knowledge_os.extract --problem T10270 --limit 20      # extract a topic
  python -m knowledge_os.extract --limit 200                      # extract across the corpus
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from knowledge_os.corpus_store import CorpusStore   # noqa: E402

EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "problem": {"type": "string", "description": "The specific problem the paper addresses."},
        "method": {"type": "string", "description": "The approach/technique used."},
        "contribution": {"type": "string", "description": "What it adds over prior work."},
        "limitation": {"type": "string", "description": "Stated or evident limitation."},
        "canonical_problem": {"type": "string",
                              "description": "A short canonical name for the sub-problem (<=6 words), "
                                             "reusable across papers so similar papers group together."},
    },
    "required": ["problem", "method", "contribution", "limitation", "canonical_problem"],
    "additionalProperties": False,
}
SYSTEM = ("You extract the problem structure of a computer-science paper from its title and "
          "abstract. Be concise and faithful to the text — do not invent results. The "
          "canonical_problem must be a short, reusable label so papers on the same sub-problem "
          "collapse together.")


class AnthropicBackend:
    """Real LLM extraction. Scale path — used when ANTHROPIC_API_KEY is set."""
    MODEL = "claude-opus-4-8"

    def __init__(self):
        import anthropic  # imported lazily so the module loads without the SDK
        self.client = anthropic.Anthropic()
        self.name = "anthropic:" + self.MODEL

    def extract(self, paper: dict) -> dict | None:
        resp = self.client.messages.create(
            model=self.MODEL,
            max_tokens=1024,
            system=SYSTEM,
            output_config={"format": {"type": "json_schema", "schema": EXTRACTION_SCHEMA}},
            messages=[{"role": "user",
                       "content": f"Title: {paper['title']}\n\nAbstract: {paper['abstract']}"}],
        )
        text = next((b.text for b in resp.content if b.type == "text"), None)
        return json.loads(text) if text else None


class SeedBackend:
    """Replays agent-produced extractions from data/extractions/*.json. Runs with no API key."""
    name = "seed"

    def __init__(self, seed_dir: Path):
        self.by_id: dict[str, dict] = {}
        for f in glob.glob(str(seed_dir / "*.json")):
            data = json.loads(Path(f).read_text(encoding="utf-8"))
            for k, v in data.items():
                if not k.startswith("_"):
                    self.by_id[k] = v

    def extract(self, paper: dict) -> dict | None:
        return self.by_id.get(paper["id"])


def pick_backend(seed_dir: Path):
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            return AnthropicBackend()
        except Exception as e:  # noqa: BLE001
            print(f"  (Anthropic backend unavailable: {e}; falling back to seed)")
    return SeedBackend(seed_dir)


def extract_corpus(store: CorpusStore, backend, problem_id: str | None, limit: int) -> int:
    papers = store.papers_with_abstracts(problem_id, limit)
    n = 0
    for p in papers:
        result = backend.extract(p)
        if result:
            store.add_extraction(p["id"], result, backend.name)
            n += 1
    store.commit()
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(ROOT / "corpus.db"))
    ap.add_argument("--problem", default=None, help="OpenAlex topic id (e.g. T10270); omit for all")
    ap.add_argument("--limit", type=int, default=200)
    args = ap.parse_args()

    store = CorpusStore(args.db)
    backend = pick_backend(ROOT / "data" / "extractions")
    pid = None
    if args.problem:
        pid = args.problem if args.problem.startswith("http") else f"https://openalex.org/{args.problem}"
    print(f"Extracting problems via backend '{backend.name}'"
          + (f" for {args.problem}" if args.problem else " across the corpus") + " ...")
    n = extract_corpus(store, backend, pid, args.limit)
    s = store.extraction_stats()
    print(f"  extracted {n} this run | corpus total: {s['extracted']} papers, "
          f"{s['canonical_problems']} canonical sub-problems")


if __name__ == "__main__":
    main()
