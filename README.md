# Room Stock Check

A mobile-friendly web app for doing the Blue Room / Green Room stock &
equipment check that used to be done on paper/Excel
(`20.12__Blue_Room__Green_Room_Instrument_List_.xlsx`).

Nurses pick a room, enter their name, and tick every drawer/cabinet item as
Present or Missing (with an optional note). Completed checks are saved
centrally so anyone can review the history of checks and see what was
flagged as missing, from any device. Each item can also have a reference
photo — anyone can add or replace one right from the checklist, so the photo
library builds up gradually through normal use.

The checklist structure itself (drawer/cabinet names, items, order) can be
edited from a PIN-protected "Edit checklist" screen — rename a drawer, add a
newly-purchased item, remove a retired one, or drag things into a new order.
Removing an item just hides it going forward; past checks that included it
still show correctly in history.

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

## Free preview deploy (Render)

To try the app on a phone/laptop without installing anything locally, there's
a `render.yaml` Blueprint in the repo root that deploys this branch to
Render's free tier in a few clicks:

1. Sign up at [render.com](https://render.com) with GitHub (free, no card
   required for the free tier).
2. **New** → **Blueprint** → select the `teamkindentalcentre/index`
   repository. Render reads `render.yaml` and pre-fills everything.
3. Click **Apply**. The build takes a couple of minutes; Render then gives
   you a `https://room-stock-check-xxxx.onrender.com` URL.
4. Open that URL — that's the whole app, ready to use on any device.

**This is a preview, not the permanent setup:** Render's free tier has no
persistent disk, so the SQLite data can reset on redeploys and the service
spins down after ~15 minutes of inactivity (the next open takes a few extra
seconds to wake up). That's fine for trying out the checklist flow, but
before nurses rely on it day-to-day, move to a host with a persistent disk
(see below) and point your own domain at it.

## Deploying

This needs a host that runs a persistent Node.js process with a writable,
persistent disk (for the SQLite file) — **not** a serverless platform like
Vercel, since serverless functions don't keep local files between requests.

Uploaded item reference photos are stored as plain files under
`data/item-photos/`, alongside the SQLite file — make sure the persistent
volume covers the whole `data/` directory, not just the `.db` file.

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
- `MANAGE_PIN` (recommended) — a shared passcode that gates the "Edit
  checklist" screens (`/manage/**`). **If unset, editing is open to anyone**
  who finds those URLs — fine for local development, but set this before a
  real deployment. Once set, unlocking it is a one-time thing per
  device/browser (a long-lived cookie remembers it).
- `PORT` (optional) — passed through to `next start` by most hosts
  automatically.

Because there's no login, treat the URL as internal — don't publish it
somewhere search engines or the public can find it. Adding a simple shared
access code is a natural next step if the app ends up reachable from the
open internet.
