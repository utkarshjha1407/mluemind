"""Storage for the real ingested CS corpus (Layer 0/1 of the original plan).

Separate DB file from the curated-lineage demo. SQLite now; Postgres + pgvector is the
documented scale target for 500k+ works and semantic search.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS subfields (id TEXT PRIMARY KEY, name TEXT);
CREATE TABLE IF NOT EXISTS problems (
    id TEXT PRIMARY KEY, name TEXT, description TEXT, subfield_id TEXT,
    works_count INTEGER, cited_by_count INTEGER, keywords TEXT,
    ingested INTEGER DEFAULT 0, n_papers INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS papers (
    id TEXT PRIMARY KEY, title TEXT, year INTEGER, cited_by_count INTEGER,
    problem_id TEXT, venue TEXT, doi TEXT, type TEXT, abstract TEXT
);
CREATE TABLE IF NOT EXISTS authors (id TEXT PRIMARY KEY, name TEXT);
CREATE TABLE IF NOT EXISTS paper_authors (paper_id TEXT, author_id TEXT, position INTEGER);
CREATE TABLE IF NOT EXISTS citations (src TEXT, dst TEXT);
CREATE INDEX IF NOT EXISTS idx_papers_problem ON papers(problem_id);
CREATE INDEX IF NOT EXISTS idx_problems_subfield ON problems(subfield_id);
CREATE INDEX IF NOT EXISTS idx_cit_dst ON citations(dst);
CREATE INDEX IF NOT EXISTS idx_cit_src ON citations(src);
CREATE INDEX IF NOT EXISTS idx_pa_author ON paper_authors(author_id);
CREATE TABLE IF NOT EXISTS extractions (
    paper_id TEXT PRIMARY KEY, problem TEXT, method TEXT, contribution TEXT,
    limitation TEXT, canonical_problem TEXT, backend TEXT
);
CREATE INDEX IF NOT EXISTS idx_extr_canon ON extractions(canonical_problem);
CREATE TABLE IF NOT EXISTS landmarks (
    seq INTEGER PRIMARY KEY, title TEXT, authors TEXT, year INTEGER, field TEXT, why TEXT,
    openalex_id TEXT, cited_by_count INTEGER, doi TEXT, venue TEXT, in_corpus INTEGER DEFAULT 0,
    problem_id TEXT
);
"""


class CorpusStore:
    def __init__(self, db_path: str | Path):
        self.conn = sqlite3.connect(str(db_path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self.conn.execute("PRAGMA journal_mode=WAL")

    # --- write ------------------------------------------------------------
    def upsert_subfield(self, sid: str, name: str):
        self.conn.execute("INSERT OR REPLACE INTO subfields VALUES (?,?)", (sid, name))

    def upsert_problem(self, p: dict):
        sf = (p.get("subfield") or {})
        self.conn.execute(
            "INSERT OR REPLACE INTO problems (id,name,description,subfield_id,works_count,"
            "cited_by_count,keywords,ingested,n_papers) VALUES (?,?,?,?,?,?,?,"
            "COALESCE((SELECT ingested FROM problems WHERE id=?),0),"
            "COALESCE((SELECT n_papers FROM problems WHERE id=?),0))",
            (p["id"], p["display_name"], p.get("description", ""),
             sf.get("id"), p.get("works_count", 0), p.get("cited_by_count", 0),
             json.dumps([(k.get("display_name") if isinstance(k, dict) else k)
                        for k in (p.get("keywords") or [])]),
             p["id"], p["id"]),
        )

    def insert_paper(self, paper: dict, authors: list[tuple], refs: list[str]):
        self.conn.execute(
            "INSERT OR REPLACE INTO papers VALUES (?,?,?,?,?,?,?,?,?)",
            (paper["id"], paper["title"], paper["year"], paper["cited_by_count"],
             paper["problem_id"], paper["venue"], paper["doi"], paper["type"], paper["abstract"]),
        )
        for aid, name, pos in authors:
            self.conn.execute("INSERT OR IGNORE INTO authors VALUES (?,?)", (aid, name))
            self.conn.execute("INSERT INTO paper_authors VALUES (?,?,?)", (paper["id"], aid, pos))
        for dst in refs:
            self.conn.execute("INSERT INTO citations VALUES (?,?)", (paper["id"], dst))

    def mark_problem_ingested(self, pid: str, n: int):
        self.conn.execute("UPDATE problems SET ingested=1, n_papers=? WHERE id=?", (n, pid))

    def commit(self):
        self.conn.commit()

    # --- read -------------------------------------------------------------
    def stats(self) -> dict:
        c = self.conn.execute
        return {
            "problems_total": c("SELECT COUNT(*) FROM problems").fetchone()[0],
            "problems_ingested": c("SELECT COUNT(*) FROM problems WHERE ingested=1").fetchone()[0],
            "papers": c("SELECT COUNT(*) FROM papers").fetchone()[0],
            "authors": c("SELECT COUNT(*) FROM authors").fetchone()[0],
            "citations": c("SELECT COUNT(*) FROM citations").fetchone()[0],
            "subfields": c("SELECT COUNT(*) FROM subfields").fetchone()[0],
        }

    def subfields(self) -> list[dict]:
        rows = self.conn.execute(
            "SELECT s.id, s.name, COUNT(p.id) AS n_problems, COALESCE(SUM(p.n_papers),0) AS n_papers "
            "FROM subfields s JOIN problems p ON p.subfield_id=s.id AND p.ingested=1 "
            "GROUP BY s.id HAVING n_problems>0 ORDER BY n_papers DESC"
        ).fetchall()
        return [dict(r) for r in rows]

    def problems(self, subfield_id: str | None = None, ingested_only=True) -> list[dict]:
        q = "SELECT * FROM problems WHERE 1=1"
        args: list = []
        if ingested_only:
            q += " AND ingested=1"
        if subfield_id:
            q += " AND subfield_id=?"
            args.append(subfield_id)
        q += " ORDER BY n_papers DESC"
        return [dict(r) for r in self.conn.execute(q, args).fetchall()]

    def problem(self, pid: str) -> dict | None:
        r = self.conn.execute("SELECT * FROM problems WHERE id=?", (pid,)).fetchone()
        return dict(r) if r else None

    def papers_for_problem(self, pid: str, limit: int = 200) -> list[dict]:
        rows = self.conn.execute(
            "SELECT * FROM papers WHERE problem_id=? ORDER BY cited_by_count DESC LIMIT ?",
            (pid, limit)).fetchall()
        return [dict(r) for r in rows]

    def timeline(self, pid: str) -> list[dict]:
        rows = self.conn.execute(
            "SELECT year, COUNT(*) AS papers, SUM(cited_by_count) AS citations "
            "FROM papers WHERE problem_id=? AND year>0 GROUP BY year ORDER BY year", (pid,)
        ).fetchall()
        return [dict(r) for r in rows]

    def key_authors(self, pid: str, limit: int = 10) -> list[dict]:
        rows = self.conn.execute(
            "SELECT a.id, a.name, COUNT(*) AS papers, SUM(p.cited_by_count) AS citations "
            "FROM paper_authors pa JOIN authors a ON a.id=pa.author_id "
            "JOIN papers p ON p.id=pa.paper_id WHERE p.problem_id=? "
            "GROUP BY a.id ORDER BY citations DESC LIMIT ?", (pid, limit)
        ).fetchall()
        return [dict(r) for r in rows]

    def frontier(self, pid: str, limit: int = 8) -> list[dict]:
        maxyear = self.conn.execute(
            "SELECT MAX(year) FROM papers WHERE problem_id=?", (pid,)).fetchone()[0] or 0
        rows = self.conn.execute(
            "SELECT * FROM papers WHERE problem_id=? AND year>=? ORDER BY cited_by_count DESC LIMIT ?",
            (pid, maxyear - 5, limit)).fetchall()
        return [dict(r) for r in rows]

    def related_problems(self, pid: str, limit: int = 8) -> list[dict]:
        """Other problems this one cites most (intra-corpus citation flow)."""
        rows = self.conn.execute(
            "SELECT p2.problem_id AS id, pr.name AS name, COUNT(*) AS weight "
            "FROM citations c JOIN papers p1 ON p1.id=c.src JOIN papers p2 ON p2.id=c.dst "
            "JOIN problems pr ON pr.id=p2.problem_id "
            "WHERE p1.problem_id=? AND p2.problem_id<>? "
            "GROUP BY p2.problem_id ORDER BY weight DESC LIMIT ?", (pid, pid, limit)
        ).fetchall()
        return [dict(r) for r in rows]

    def shared_author_pairs(self, min_shared: int = 4) -> list[dict]:
        """Problem pairs that share authors — communities that overlap in people."""
        rows = self.conn.execute(
            "WITH ap AS (SELECT DISTINCT pa.author_id AS aid, p.problem_id AS pid "
            "            FROM paper_authors pa JOIN papers p ON p.id=pa.paper_id) "
            "SELECT a.pid AS p1, b.pid AS p2, COUNT(*) AS shared "
            "FROM ap a JOIN ap b ON a.aid=b.aid AND a.pid < b.pid "
            "GROUP BY a.pid, b.pid HAVING shared >= ?", (min_shared,)).fetchall()
        return [dict(r) for r in rows]

    def cross_problem_edges(self, min_weight: int = 3) -> list[dict]:
        """Citation flow between problems — the seed of the universal knowledge graph (Layer 4)."""
        rows = self.conn.execute(
            "SELECT p1.problem_id AS src, p2.problem_id AS dst, COUNT(*) AS weight "
            "FROM citations c JOIN papers p1 ON p1.id=c.src JOIN papers p2 ON p2.id=c.dst "
            "WHERE p1.problem_id<>p2.problem_id "
            "GROUP BY p1.problem_id, p2.problem_id HAVING weight>=?", (min_weight,)
        ).fetchall()
        return [dict(r) for r in rows]

    # --- v2 problem extraction -------------------------------------------
    def papers_with_abstracts(self, pid: str | None, limit: int, only_unextracted=True) -> list[dict]:
        q = ("SELECT p.* FROM papers p WHERE length(p.abstract)>200 "
             "AND p.title NOT LIKE 'Lecture Notes%'")
        args: list = []
        if pid:
            q += " AND p.problem_id=?"
            args.append(pid)
        if only_unextracted:
            q += " AND p.id NOT IN (SELECT paper_id FROM extractions)"
        q += " ORDER BY p.cited_by_count DESC LIMIT ?"
        args.append(limit)
        return [dict(r) for r in self.conn.execute(q, args).fetchall()]

    def add_extraction(self, paper_id: str, e: dict, backend: str):
        self.conn.execute(
            "INSERT OR REPLACE INTO extractions VALUES (?,?,?,?,?,?,?)",
            (paper_id, e.get("problem"), e.get("method"), e.get("contribution"),
             e.get("limitation"), e.get("canonical_problem"), backend))

    def extraction(self, paper_id: str) -> dict | None:
        r = self.conn.execute("SELECT * FROM extractions WHERE paper_id=?", (paper_id,)).fetchone()
        return dict(r) if r else None

    def subproblems(self, pid: str) -> list[dict]:
        """v2 sub-problems: canonical problems discovered by reading the papers in this topic."""
        rows = self.conn.execute(
            "SELECT e.canonical_problem AS name, COUNT(*) AS n_papers, MIN(e.backend) AS backend "
            "FROM extractions e JOIN papers p ON p.id=e.paper_id "
            "WHERE p.problem_id=? GROUP BY e.canonical_problem ORDER BY n_papers DESC", (pid,)
        ).fetchall()
        out = []
        for r in rows:
            papers = self.conn.execute(
                "SELECT p.id, p.title, p.year, p.cited_by_count, e.problem, e.method, e.contribution "
                "FROM extractions e JOIN papers p ON p.id=e.paper_id "
                "WHERE p.problem_id=? AND e.canonical_problem=? ORDER BY p.cited_by_count DESC",
                (pid, r["name"])).fetchall()
            out.append({"name": r["name"], "n_papers": r["n_papers"], "backend": r["backend"],
                        "papers": [dict(x) for x in papers]})
        return out

    # --- landmarks ("papers that mattered") ------------------------------
    def replace_landmarks(self, rows: list[dict]):
        self.conn.execute("DELETE FROM landmarks")
        for i, r in enumerate(rows):
            self.conn.execute(
                "INSERT INTO landmarks VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (i, r["title"], r["authors"], r["year"], r["field"], r["why"],
                 r.get("openalex_id"), r.get("cited_by_count"), r.get("doi"),
                 r.get("venue"), 1 if r.get("in_corpus") else 0, r.get("problem_id")))
        self.conn.commit()

    def landmarks(self) -> list[dict]:
        rows = self.conn.execute("SELECT * FROM landmarks ORDER BY year, seq").fetchall()
        return [dict(r) for r in rows]

    def paper_problem(self, openalex_id: str) -> str | None:
        r = self.conn.execute("SELECT problem_id FROM papers WHERE id=?", (openalex_id,)).fetchone()
        return r[0] if r else None

    def extraction_stats(self) -> dict:
        c = self.conn.execute
        return {"extracted": c("SELECT COUNT(*) FROM extractions").fetchone()[0],
                "canonical_problems": c("SELECT COUNT(DISTINCT canonical_problem) FROM extractions").fetchone()[0]}

    def activity(self, recent_years: int = 6) -> list[dict]:
        """Per-problem research-activity signal: recent share of papers = momentum."""
        maxyear = self.conn.execute("SELECT MAX(year) FROM papers WHERE year>0").fetchone()[0] or 0
        cutoff = maxyear - recent_years
        rows = self.conn.execute(
            "SELECT p.problem_id AS id, pr.name AS name, COUNT(*) AS total, "
            "SUM(CASE WHEN p.year>=? THEN 1 ELSE 0 END) AS recent "
            "FROM papers p JOIN problems pr ON pr.id=p.problem_id WHERE p.year>0 "
            "GROUP BY p.problem_id", (cutoff,)).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["growth"] = round(d["recent"] / d["total"], 3) if d["total"] else 0
            out.append(d)
        return out

    def problem_summary(self, pid: str) -> dict:
        r = self.conn.execute(
            "SELECT COUNT(*) AS papers, SUM(cited_by_count) AS citations, "
            "MIN(year) AS first_year, MAX(year) AS last_year "
            "FROM papers WHERE problem_id=? AND year>0", (pid,)).fetchone()
        return dict(r)

    def search_papers(self, q: str, limit: int = 60) -> list[dict]:
        like = f"%{q.lower()}%"
        rows = self.conn.execute(
            "SELECT p.*, pr.name AS problem_name FROM papers p JOIN problems pr ON pr.id=p.problem_id "
            "WHERE lower(p.title) LIKE ? OR lower(p.abstract) LIKE ? "
            "ORDER BY p.cited_by_count DESC LIMIT ?", (like, like, limit)).fetchall()
        return [dict(r) for r in rows]
