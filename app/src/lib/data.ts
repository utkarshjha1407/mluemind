import { useEffect, useState } from "react";

export function useJSON<T = unknown>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!url) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [url]);
  return { data, loading };
}

export const num = (n: number) => (n || 0).toLocaleString();
export const go = (hash: string) => { window.location.hash = hash; };
