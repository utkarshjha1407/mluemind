"""SQLite-backed store. File-based, zero-install. Postgres/pgvector is the documented
scale target (memo 6b); the repository interface below is what would be reimplemented there.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from . import model

SCHEMA = """
CREATE TABLE problems (
    id TEXT PRIMARY KEY,
    title TEXT, question TEXT, domain TEXT, epistemology TEXT,
    central_node TEXT, central_role TEXT, facets TEXT
);
CREATE TABLE claims (
    id TEXT PRIMARY KEY,
    problem_id TEXT,
    assertion TEXT, type TEXT, contribution TEXT, year INTEGER,
    status TEXT, provenance_granularity TEXT,
    source TEXT,        -- json
    confidence TEXT     -- json
);
CREATE TABLE relations (
    problem_id TEXT,
    src TEXT, kind TEXT, dst TEXT, scope TEXT, note TEXT
);
CREATE INDEX idx_claims_problem ON claims(problem_id);
CREATE INDEX idx_rel_problem ON relations(problem_id);
"""


class Store:
    def __init__(self, db_path: str | Path):
        self.path = str(db_path)
        self.conn = sqlite3.connect(self.path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row

    # --- build / load -----------------------------------------------------
    def init_schema(self) -> None:
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    def load_lineage(self, data: dict) -> None:
        model.validate_lineage(data)  # fail loud on bad seed data
        p = data["problem"]
        self.conn.execute(
            "INSERT INTO problems VALUES (?,?,?,?,?,?,?,?)",
            (p["id"], p.get("title"), p.get("question"), p.get("domain"),
             p.get("epistemology"), p.get("central_node"), p.get("central_role"),
             json.dumps(p.get("facets", {}))),
        )
        for c in data["claims"]:
            self.conn.execute(
                "INSERT INTO claims VALUES (?,?,?,?,?,?,?,?,?,?)",
                (c["id"], p["id"], c["assertion"], c["type"], c["contribution"],
                 c["year"], c.get("status", "active"),
                 c.get("provenance_granularity", "pointed"),
                 json.dumps(c["source"]), json.dumps(c.get("confidence", {}))),
            )
        for r in data["relations"]:
            self.conn.execute(
                "INSERT INTO relations VALUES (?,?,?,?,?,?)",
                (p["id"], r["from"], r["kind"], r["to"], r.get("scope"), r.get("note")),
            )
        self.conn.commit()

    # --- read -------------------------------------------------------------
    def problems(self) -> list[dict]:
        rows = self.conn.execute(
            "SELECT p.*, (SELECT COUNT(*) FROM claims c WHERE c.problem_id=p.id) AS n_claims "
            "FROM problems p ORDER BY title"
        ).fetchall()
        return [self._problem_row(r) for r in rows]

    def problem(self, pid: str) -> dict | None:
        r = self.conn.execute("SELECT * FROM problems WHERE id=?", (pid,)).fetchone()
        return self._problem_row(r) if r else None

    def claims(self, pid: str) -> list[dict]:
        rows = self.conn.execute(
            "SELECT * FROM claims WHERE problem_id=? ORDER BY year", (pid,)
        ).fetchall()
        return [self._claim_row(r) for r in rows]

    def claim(self, cid: str) -> dict | None:
        r = self.conn.execute("SELECT * FROM claims WHERE id=?", (cid,)).fetchone()
        return self._claim_row(r) if r else None

    def relations(self, pid: str) -> list[dict]:
        rows = self.conn.execute(
            "SELECT * FROM relations WHERE problem_id=?", (pid,)
        ).fetchall()
        return [dict(src=r["src"], kind=r["kind"], dst=r["dst"], scope=r["scope"],
                     note=r["note"]) for r in rows]

    def search(self, q: str) -> list[dict]:
        like = f"%{q.lower()}%"
        rows = self.conn.execute(
            "SELECT * FROM claims WHERE lower(assertion) LIKE ? OR lower(source) LIKE ? "
            "ORDER BY year", (like, like)
        ).fetchall()
        return [self._claim_row(r) for r in rows]

    # --- row mappers ------------------------------------------------------
    @staticmethod
    def _problem_row(r: sqlite3.Row) -> dict:
        d = dict(r)
        d["facets"] = json.loads(d.get("facets") or "{}")
        return d

    @staticmethod
    def _claim_row(r: sqlite3.Row) -> dict:
        d = dict(r)
        d["source"] = json.loads(d.get("source") or "{}")
        d["confidence"] = json.loads(d.get("confidence") or "{}")
        return d
