"""Zero-dependency HTTP server: JSON API + static web UI.

Routes
  GET /                              -> web/index.html
  GET /static/<file>                -> web assets
  GET /api/problems
  GET /api/problem/<pid>            -> problem + claims + relations + overlays summary
  GET /api/problem/<pid>/timeline
  GET /api/problem/<pid>/reading-order
  GET /api/problem/<pid>/ledger
  GET /api/claim/<cid>
  GET /api/retraction-impact/<cid>  -> simulated retraction propagation
  GET /api/search?q=
"""
from __future__ import annotations

import json
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from . import overlays, corpus_overlays
from .store import Store

WEB_DIR = Path(__file__).resolve().parent.parent / "web"
_CT = {".html": "text/html", ".js": "text/javascript", ".css": "text/css"}


def make_handler(store: Store, corpus=None):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):  # quiet console for a non-technical user
            pass

        def _send(self, code: int, body: bytes, ctype: str):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _json(self, obj, code: int = 200):
            self._send(code, json.dumps(obj).encode("utf-8"), "application/json")

        def _static(self, name: str):
            safe = (WEB_DIR / name).resolve()
            if not str(safe).startswith(str(WEB_DIR.resolve())) or not safe.is_file():
                return self._send(404, b"not found", "text/plain")
            ctype = _CT.get(safe.suffix, "application/octet-stream")
            self._send(200, safe.read_bytes(), ctype)

        def do_GET(self):
            u = urlparse(self.path)
            parts = [p for p in u.path.split("/") if p]
            try:
                if not parts:
                    return self._static("corpus.html" if corpus else "index.html")
                if parts == ["lineages"]:
                    return self._static("index.html")
                if parts[0] == "static" and len(parts) == 2:
                    return self._static(parts[1])
                if parts[0] == "api":
                    return self._api(parts[1:], parse_qs(u.query))
                return self._send(404, b"not found", "text/plain")
            except Exception as e:  # never crash the demo; surface the error as JSON
                return self._json({"error": str(e)}, 500)

        def _api(self, parts, query):
            if parts and parts[0] == "corpus":
                return self._corpus_api(parts[1:], query)
            if parts == ["problems"]:
                return self._json(store.problems())

            if parts[:1] == ["problem"] and len(parts) >= 2:
                pid = parts[1]
                prob = store.problem(pid)
                if not prob:
                    return self._json({"error": "unknown problem"}, 404)
                claims = store.claims(pid)
                rels = store.relations(pid)
                sub = parts[2] if len(parts) > 2 else None
                if sub == "timeline":
                    return self._json(overlays.timeline(claims))
                if sub == "reading-order":
                    return self._json(overlays.reading_order(claims, rels))
                if sub == "ledger":
                    cn = prob.get("central_node")
                    return self._json(overlays.evidence_ledger(cn, claims, rels) if cn else {})
                return self._json({"problem": prob, "claims": claims, "relations": rels})

            if parts[:1] == ["claim"] and len(parts) == 2:
                c = store.claim(parts[1])
                return self._json(c or {"error": "unknown claim"}, 200 if c else 404)

            if parts[:1] == ["retraction-impact"] and len(parts) == 2:
                cid = parts[1]
                c = store.claim(cid)
                if not c:
                    return self._json({"error": "unknown claim"}, 404)
                claims = store.claims(c["problem_id"])
                rels = store.relations(c["problem_id"])
                return self._json(overlays.retraction_impact(cid, claims, rels))

            if parts == ["search"]:
                q = (query.get("q") or [""])[0]
                return self._json(store.search(q) if q else [])

            return self._json({"error": "unknown endpoint"}, 404)

        def _corpus_api(self, parts, query):
            if corpus is None:
                return self._json({"error": "corpus not loaded — run: python -m knowledge_os.ingest"}, 503)
            if parts == ["stats"]:
                return self._json(corpus.stats())
            if parts == ["subfields"]:
                return self._json(corpus.subfields())
            if parts == ["problems"]:
                sf = (query.get("subfield") or [None])[0]
                return self._json(corpus.problems(subfield_id=sf))
            if parts == ["universe"]:
                return self._json(corpus_overlays.universe(corpus))
            if parts == ["landmarks"]:
                return self._json(corpus.landmarks())
            if parts[:1] == ["problem"] and len(parts) == 2:
                d = corpus_overlays.problem_detail(corpus, _decode(parts[1]))
                return self._json(d or {"error": "unknown problem"}, 200 if d else 404)
            if parts == ["search"]:
                q = (query.get("q") or [""])[0]
                return self._json(corpus.search_papers(q) if q else [])
            return self._json({"error": "unknown corpus endpoint"}, 404)

    return Handler


def _decode(s: str) -> str:
    from urllib.parse import unquote
    return unquote(s)


class _DualStackServer(ThreadingHTTPServer):
    """Accept both IPv4 (127.0.0.1) and IPv6 (::1) so 'localhost' always resolves,
    regardless of how the client resolves the name."""
    address_family = socket.AF_INET6

    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except (AttributeError, OSError):
            pass
        super().server_bind()


def serve(store: Store, corpus=None, host: str = "::", port: int = 8765):
    try:
        return _DualStackServer((host, port), make_handler(store, corpus))
    except OSError:
        return ThreadingHTTPServer(("0.0.0.0", port), make_handler(store, corpus))
