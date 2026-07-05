# Nightly Cash-Secured Put Screener

Every US trading night at **10:30 pm Singapore time**, a GitHub Actions job screens
the watchlist for cash-secured put (CSP) candidates and sends the report to you on
**Telegram**. It is aware of your Interactive Brokers account: it merges your stock
holdings into the watchlist, skips tickers where you already have an open short put,
and reports how much cash you actually have free for new CSPs.

**This tool is read-only. It never places, modifies, or cancels orders.**

## What the screen looks for

All thresholds live in [`config.json`](config.json) — edit and commit to change them.

| Filter | Default | Meaning |
|---|---|---|
| `iv_min` | 30% | Implied volatility floor — low-IV puts aren't worth selling |
| `dte_min`–`dte_max` | 25–40 days | Expiry window |
| `premium_yield_min` | 0.7% | Premium ÷ collateral (strike × 100) — your target band |
| `premium_yield_max` | 1.0% | Above this the pick is still shown but flagged ⚠️ higher-risk |
| `delta_max` | 0.35 | Skip strikes with more than ~35% assignment odds |
| `min_open_interest` / `min_bid` | 100 / $0.05 | Liquidity floor |

The report always includes the **~ATM IV of every watchlist ticker**, even on nights
with no qualifying picks.

"Strong business model" is enforced by curating `watchlist` in `config.json` —
keep it to companies you'd be happy to own at the strike.

## One-time setup

### 1. Telegram bot (~3 min)

1. In Telegram, message **@BotFather** → `/newbot` → pick a name and username.
   BotFather replies with a **bot token** like `123456789:AAF...`.
2. Open a chat with your new bot and send it any message (e.g. `/start`).
3. Find your **chat ID**: open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and read
   `"chat":{"id":123456789,...}` from the response.

### 2. IBKR Flex query (~5 min)

1. Log in to IBKR **Client Portal** → **Performance & Reports → Flex Queries**.
2. Create a new **Activity Flex Query**:
   - Sections: **Open Positions** (select at least: Symbol, Underlying Symbol,
     Asset Class, Put/Call, Strike, Expiry, Position) and **Cash Report**
     (at least: Currency, Ending Cash).
   - Format **XML**, Period **Last Business Day**.
3. Save it and note the **Query ID** shown in the list.
4. Enable the Flex Web Service: **Settings → Account Settings → Flex Web Service**
   → activate and copy the **token** (tokens expire — max lifetime is 1 year;
   renew it there when it does).

### 3. GitHub secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**, add:

| Secret | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | from BotFather |
| `TELEGRAM_CHAT_ID` | from getUpdates |
| `IBKR_FLEX_TOKEN` | from Flex Web Service settings |
| `IBKR_FLEX_QUERY_ID` | the Flex query's ID |

If the IBKR secrets are missing the screen still runs — the report just notes that
account data is unavailable. If the Telegram secrets are missing the job prints the
report to the Actions log and fails, so you notice.

### 4. Test it

Repo → **Actions → Nightly CSP Screener → Run workflow**. The Telegram message
should arrive within ~2 minutes.

## Running locally

```bash
pip install -r requirements.txt
python -m csp_screener.screener --dry-run                 # full watchlist, print only
python -m csp_screener.screener --dry-run --tickers NVDA  # quick single-ticker test
```

## Notes & limitations

- **Quotes** come from Yahoo Finance via `yfinance` (~15-min delayed; unofficial API —
  individual ticker failures are listed in the report footer instead of killing the run).
- **Account data** is end-of-day: a put you sold *today* won't reduce "available cash"
  until tomorrow night's report.
- On **US market holidays** the job still runs and simply reflects the last close.
- Schedule lives in [`.github/workflows/csp-screener.yml`](../.github/workflows/csp-screener.yml)
  (`30 14 * * 1-5` UTC = 10:30 pm SGT Mon–Fri).
