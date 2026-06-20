# Deployment plan — Knowledge OS web app

The app (`app/`) is a **static Vite build** with **hash routing** and the corpus baked in as JSON
(`app/public/data/`). That means:

- **No backend, no database, no API at runtime** — the research agent, graph, and all screens run
  in the browser over committed JSON.
- **No SPA rewrite rules** — hash routes (`#/explore`, `#/problem/…`) need no server config.
- **$0 hosting** on any static host; scales infinitely via CDN.

`npm run build` → `app/dist/` is the entire deployable artifact.

---

## Pre-flight (once)

```
cd app
npm install
npm run build        # must succeed → app/dist/
npm run preview      # optional: serve dist locally at http://localhost:4173 to sanity-check
```
If you changed the corpus, regenerate data first: `python export_static.py` (from repo root), then rebuild.

---

## Option A — Vercel  ★ recommended (fastest, clean URL, auto-deploy)

1. Push to GitHub (done — `mluemind`).
2. vercel.com → **Add New → Project → Import `mluemind`** (authorize GitHub if asked).
3. **Set Root Directory = `app`.** Vercel auto-detects Vite (build `npm run build`, output `dist`).
   Leave everything else default — no env vars, no config file needed.
4. **Deploy** → live at `https://<project>.vercel.app`. Every `git push` auto-redeploys; pull
   requests get preview URLs.
5. (Optional) add a custom domain in the dashboard.

Terminal alternative (no dashboard): `cd app && npx vercel` → log in once in the browser, accept the
detected Vite settings → then `npx vercel --prod` for the production URL.

## Option B — Netlify  (equivalent)

Import the repo; `netlify.toml` sets base `app`, command `npm run build`, publish `dist`. Deploy.
Cloudflare Pages works the same way: framework Vite, root dir `app`, output `dist`.

## Option C — GitHub Pages  (optional; not active)

Deployment runs through Vercel, so the Pages workflow was removed — an inactive Pages workflow just
spams failed Action runs. If you ever want Pages instead: add a workflow that runs
`npx vite build --base=/<repo>/` inside `app/` and publishes `app/dist` via `actions/deploy-pages`,
then enable **Settings → Pages → Source: GitHub Actions**. The data fetch is already base-aware
(`import.meta.env.BASE_URL`), so the repo-subpath URL works.

---

## Recommendation

**Vercel** for a clean root-domain URL and instant push-to-deploy, or **GitHub Pages** if you'd
rather not add a service (your code is already on GitHub). Both are free and need no code changes
beyond what's committed.

## Keeping it fresh (data updates)

```
python -m knowledge_os.ingest   # grow/refresh corpus.db (needs internet)
python export_static.py         # corpus.db → app/public/data/*.json
git add app/public/data && git commit -m "Refresh corpus" && git push
```
The host rebuilds automatically on push.

## Notes / limits
- `app/public/data/search.json` (~3 MB) ships with the build but is only fetched on demand; first
  load stays light (≈65 KB JS + the small JSON each screen needs).
- Everything is public/read-only — no secrets, no env vars, nothing to leak.
- The original stdlib app (`python run.py`, `/lineages`) is dev-only and not part of this deploy.
