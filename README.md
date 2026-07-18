# Room Stock Check

A mobile-friendly web app for doing the Blue Room / Green Room stock &
equipment check that used to be done on paper/Excel
(`20.12__Blue_Room__Green_Room_Instrument_List_.xlsx`).

Nurses pick a room, enter their name, and tick every drawer/cabinet item as
Present or Missing (with an optional note). Completed checks are saved
centrally so anyone can review the history of checks and see what was
flagged as missing, from any device.

## How it works

- **Next.js** (App Router, TypeScript, Tailwind CSS) — one app serving both
  the UI and the backend.
- **SQLite** (`better-sqlite3`) — a single embedded database file at
  `data/stock-check.db`. It's created and seeded automatically the first
  time the app runs, from `data/seed-items.json`.
- No login/accounts — nurses just type their name when starting a check,
  matching how the original spreadsheet worked.

The checklist data (rooms, drawers/cabinets, items, expected quantities) was
generated once from the source spreadsheet by `scripts/extract-seed.py` into
`data/seed-items.json`, which is committed to the repo. You don't need to
re-run that script unless the checklist itself changes (see below).

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. The SQLite file is created at
`data/stock-check.db` on first run (it's gitignored — each environment gets
its own).

## Updating the checklist data

If the drawers/cabinets/items ever change, edit `data/seed-items.json`
directly (it's a plain JSON file: `rooms[].sections[].items[].{name,
expectedQty}`), or re-run the extraction script against an updated
spreadsheet:

```bash
pip install openpyxl
python3 scripts/extract-seed.py /path/to/updated-checklist.xlsx
```

Either way, the new data only takes effect for **new** databases — the app
only seeds `items`/`sections` when those tables are empty. To pick up
changes on an existing deployment, delete `data/stock-check.db` (you'll
lose check history) or extend `lib/db.ts` with a migration.

## Deploying

This needs a host that runs a persistent Node.js process with a writable,
persistent disk (for the SQLite file) — **not** a serverless platform like
Vercel, since serverless functions don't keep local files between requests.

Good options for a small clinic app:

- **Railway** or **Render** — connect the repo, add a persistent volume
  mounted wherever `DB_PATH` points (or just use the default
  `data/stock-check.db` path and mount the volume at `data/`), set the
  build command to `npm run build` and the start command to `npm run start`.
- **Fly.io** — similar, with a Fly Volume for `data/`.
- **A small VPS or a machine on the clinic's own network** — clone the
  repo, `npm install && npm run build && npm run start` (or run it under
  `pm2`/`systemd`), and make sure `data/` persists across restarts. Running
  it on a machine on the clinic Wi-Fi also means nurses' phones/tablets can
  reach it without exposing anything to the public internet.

Environment variables:

- `DB_PATH` (optional) — absolute path for the SQLite file. Defaults to
  `<project>/data/stock-check.db`.
- `PORT` (optional) — passed through to `next start` by most hosts
  automatically.

Because there's no login, treat the URL as internal — don't publish it
somewhere search engines or the public can find it. Adding a simple shared
access code is a natural next step if the app ends up reachable from the
open internet.
