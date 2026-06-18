"""OpenAlex API client (stdlib only).

Layer 0 of the original plan: real corpus ingestion. OpenAlex is free, no key, ~250M works.
We use the 'polite pool' (mailto) for higher rate limits. Topics are OpenAlex's curated research
areas — our v1 'problem' scaffold (LLM problem-extraction is the documented upgrade for v2).
"""
from __future__ import annotations

import gzip
import json
import time
import urllib.parse
import urllib.request

BASE = "https://api.openalex.org"
CS_FIELD_ID = 17  # Computer Science (OpenAlex topic hierarchy: domain > field > subfield > topic)


class OpenAlex:
    def __init__(self, mailto: str, pause: float = 0.12):
        self.mailto = mailto
        self.pause = pause

    # --- low level --------------------------------------------------------
    def _get(self, path: str, params: dict) -> dict:
        params = {**params, "mailto": self.mailto}
        url = f"{BASE}/{path}?{urllib.parse.urlencode(params)}"
        for attempt in range(5):
            try:
                req = urllib.request.Request(url, headers={
                    "User-Agent": f"KnowledgeOS/0.2 (mailto:{self.mailto})",
                    "Accept-Encoding": "gzip",
                })
                with urllib.request.urlopen(req, timeout=30) as resp:
                    raw = resp.read()
                    if resp.headers.get("Content-Encoding") == "gzip":
                        raw = gzip.decompress(raw)
                    time.sleep(self.pause)
                    return json.loads(raw)
            except Exception as e:  # noqa: BLE001
                if attempt == 4:
                    raise
                time.sleep(1.5 * (attempt + 1))  # backoff on 429 / transient
        return {}

    # --- topics (our 'problems') -----------------------------------------
    def cs_topics(self, per_page: int = 200) -> list[dict]:
        """All Computer-Science topics, with subfield + works_count."""
        out: list[dict] = []
        cursor = "*"
        while cursor:
            data = self._get("topics", {
                "filter": f"field.id:{CS_FIELD_ID}",
                "per_page": per_page, "cursor": cursor,
                "select": "id,display_name,description,subfield,field,works_count,cited_by_count,keywords",
            })
            out.extend(data.get("results", []))
            cursor = data.get("meta", {}).get("next_cursor")
        return out

    # --- works (papers) ---------------------------------------------------
    WORK_SELECT = ("id,title,publication_year,cited_by_count,primary_topic,authorships,"
                   "primary_location,referenced_works,abstract_inverted_index,doi,type")

    def works_for_topic(self, topic_id: str, limit: int, sort: str = "cited_by_count:desc",
                        from_year: int | None = None):
        """Yield works for a topic, newest-cited first by default. Cursor-paged, capped at `limit`."""
        topic_short = topic_id.split("/")[-1]
        filt = f"primary_topic.id:{topic_short}"
        if from_year:
            filt += f",from_publication_date:{from_year}-01-01"
        cursor, got = "*", 0
        while cursor and got < limit:
            page = min(200, limit - got)
            data = self._get("works", {
                "filter": filt, "sort": sort, "per_page": page, "cursor": cursor,
                "select": self.WORK_SELECT,
            })
            results = data.get("results", [])
            for w in results:
                yield w
                got += 1
                if got >= limit:
                    break
            cursor = data.get("meta", {}).get("next_cursor")
            if not results:
                break


def reconstruct_abstract(inv: dict | None) -> str:
    """OpenAlex stores abstracts as an inverted index {word: [positions]}; rebuild the text."""
    if not inv:
        return ""
    positions: list[tuple[int, str]] = []
    for word, idxs in inv.items():
        for i in idxs:
            positions.append((i, word))
    positions.sort()
    return " ".join(w for _, w in positions)[:4000]
