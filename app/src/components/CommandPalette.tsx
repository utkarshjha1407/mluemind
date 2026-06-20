import { useEffect, useRef, useState } from "react";
import { useJSON, go } from "../lib/data";
import type { ProblemLite } from "../lib/agent";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: problems } = useJSON<ProblemLite[]>("/data/problems.json");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("kos:cmdk", onOpen as EventListener);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("kos:cmdk", onOpen as EventListener); };
  }, []);

  useEffect(() => { if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 20); } }, [open]);

  if (!open) return null;

  const matches = (problems || [])
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 6);
  const canAsk = q.trim().length > 0;
  // rows: [ask?, ...problems]
  const total = (canAsk ? 1 : 0) + matches.length;
  const close = () => setOpen(false);
  const ask = () => { if (canAsk) { go(`#/ask/${encodeURIComponent(q.trim())}`); close(); } };
  const pick = (i: number) => {
    if (canAsk && i === 0) return ask();
    const p = matches[i - (canAsk ? 1 : 0)];
    if (p) { go(`#/problem/${p.short}`); close(); }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, total - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(active); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]" onMouseDown={close}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-[600px] overflow-hidden rounded-2xl border border-line bg-surface shadow-soft"
           onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 text-faint">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKey}
            placeholder="Ask a question, or jump to a problem…"
            className="w-full bg-transparent py-4 text-[15px] text-ink placeholder:text-faint focus:outline-none"
          />
          <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint sm:block">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {canAsk && (
            <Row active={active === 0} onHover={() => setActive(0)} onClick={ask}>
              <span className="font-mono text-[11px] text-accent">ASK</span>
              <span className="truncate text-[14px] text-ink">{q}</span>
            </Row>
          )}
          {matches.length > 0 && (
            <div className="px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-faint">Problems</div>
          )}
          {matches.map((p, i) => {
            const idx = i + (canAsk ? 1 : 0);
            return (
              <Row key={p.id} active={active === idx} onHover={() => setActive(idx)} onClick={() => pick(idx)}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span className="truncate text-[14px] text-ink">{p.name}</span>
                <span className="ml-auto font-mono text-[11px] text-faint">{(p.n_papers || 0).toLocaleString()}p</span>
              </Row>
            );
          })}
          {!canAsk && matches.length === 0 && (
            <div className="px-4 py-8 text-center font-mono text-[12px] text-faint">Type to search…</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ active, onHover, onClick, children }: { active: boolean; onHover: () => void; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onMouseEnter={onHover}
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${active ? "bg-accent-weak" : ""}`}
    >
      {children}
    </button>
  );
}
