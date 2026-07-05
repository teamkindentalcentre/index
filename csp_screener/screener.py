"""Nightly cash-secured put screener.

Run: python -m csp_screener.screener [--dry-run] [--tickers AAPL,MSFT]

Environment variables (all optional; missing ones degrade gracefully):
  IBKR_FLEX_TOKEN / IBKR_FLEX_QUERY_ID  -> account positions + cash via Flex
  TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID -> report delivery (else printed to stdout)

This tool is read-only: it screens and reports, it never places orders.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import sys
from datetime import date
from pathlib import Path

from . import ibkr_flex, options, telegram_notify

CONFIG_PATH = Path(__file__).parent / "config.json"


def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text())


def get_account_data(notes: list[str]) -> ibkr_flex.AccountData | None:
    token = os.environ.get("IBKR_FLEX_TOKEN")
    query_id = os.environ.get("IBKR_FLEX_QUERY_ID")
    if not token or not query_id:
        notes.append("IBKR data unavailable: Flex secrets not configured.")
        return None
    try:
        return ibkr_flex.fetch_account_data(token, query_id)
    except Exception as exc:
        notes.append(f"IBKR Flex fetch failed: {html.escape(str(exc)[:150])}")
        return None


def build_watchlist(cfg: dict, account: ibkr_flex.AccountData | None, notes: list[str]) -> tuple[list[str], set[str]]:
    tickers = [t.upper() for t in cfg["watchlist"]]
    if account and cfg.get("include_ibkr_holdings"):
        extra = [t for t in account.stock_tickers if t not in tickers and "." not in t]
        if extra:
            notes.append("Added from IBKR holdings: " + ", ".join(extra))
        tickers += extra
    skip = {p.ticker for p in account.short_puts} if account else set()
    return tickers, skip


def rank_candidates(results: list[options.TickerResult], cfg: dict,
                    available_cash: float | None) -> list[options.PutCandidate]:
    picks: list[options.PutCandidate] = []
    for r in results:
        picks.extend(r.candidates or [])
    for c in picks:
        if available_cash is not None:
            c.affordable = c.collateral <= available_cash
    picks.sort(key=lambda c: (not c.in_band, -c.annualized_yield, abs(c.delta)))
    # At most 2 picks per ticker so one hot name doesn't fill the report.
    counts: dict[str, int] = {}
    top: list[options.PutCandidate] = []
    for c in picks:
        if counts.get(c.ticker, 0) < 2:
            top.append(c)
            counts[c.ticker] = counts.get(c.ticker, 0) + 1
        if len(top) >= cfg["max_candidates"]:
            break
    return top


def format_report(cfg: dict, account: ibkr_flex.AccountData | None,
                  results: list[options.TickerResult], top: list[options.PutCandidate],
                  skipped: set[str], notes: list[str]) -> str:
    lines: list[str] = [f"<b>CSP Screen — {date.today():%a %d %b %Y}</b>"]

    if account and account.usd_cash is not None:
        lines.append(f"💰 Cash available for CSPs: <b>${account.csp_available_cash:,.0f}</b>"
                     f" (USD cash ${account.usd_cash:,.0f}"
                     f" − ${account.reserved_collateral:,.0f} reserved for"
                     f" {len(account.short_puts)} open short put(s))")
    lines.append("")

    if top:
        lines.append(f"<b>Top picks</b> (IV≥{cfg['iv_min']:.0%}, {cfg['dte_min']}–{cfg['dte_max']} DTE,"
                     f" yield≥{cfg['premium_yield_min']:.1%}, |Δ|≤{cfg['delta_max']}):")
        for c in top:
            risk_flag = " ⚠️higher-risk" if c.yield_pct > cfg["premium_yield_max"] else ""
            afford = ""
            if c.affordable is True:
                afford = " ✅"
            elif c.affordable is False:
                afford = " ❌insufficient cash"
            lines.append(
                f"• <b>{c.ticker} ${c.strike:g} PUT</b> · exp {c.expiry} ({c.dte}d)"
                f" · bid ${c.bid:.2f} · yield {c.yield_pct:.2%} ({c.annualized_yield:.1%}/yr)"
                f" · IV {c.iv:.0%} · Δ {c.delta:.2f} · needs ${c.collateral:,.0f}"
                f"{risk_flag}{afford}"
            )
    else:
        lines.append("No qualifying setups tonight.")
    lines.append("")

    lines.append("<b>Watchlist IV</b> (~ATM):")
    iv_bits = []
    for r in sorted(results, key=lambda r: -(r.atm_iv or 0)):
        if r.atm_iv is not None:
            mark = "" if r.atm_iv >= cfg["iv_min"] else " (low)"
            iv_bits.append(f"{r.ticker} {r.atm_iv:.0%}{mark}")
    lines.append(", ".join(iv_bits) if iv_bits else "no IV data")

    errors = [f"{r.ticker}: {html.escape(r.error)}" for r in results if r.error]
    if skipped:
        lines.append("")
        lines.append("Skipped (open CSP already): " + ", ".join(sorted(skipped)))
    if errors:
        lines.append("")
        lines.append("Data issues: " + "; ".join(errors))
    if notes:
        lines.append("")
        lines.extend(f"ℹ️ {n}" for n in notes)
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Nightly CSP screener")
    parser.add_argument("--dry-run", action="store_true",
                        help="print the report instead of sending to Telegram")
    parser.add_argument("--tickers", help="comma-separated override of the watchlist (testing)")
    args = parser.parse_args()

    cfg = load_config()
    notes: list[str] = []

    account = get_account_data(notes)
    watchlist, skipped = build_watchlist(cfg, account, notes)
    if args.tickers:
        watchlist, skipped = [t.strip().upper() for t in args.tickers.split(",")], set()

    results = [options.screen_ticker(t, cfg) for t in watchlist if t not in skipped]
    available = account.csp_available_cash if account else None
    top = rank_candidates(results, cfg, available)
    report = format_report(cfg, account, results, top, skipped, notes)

    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if args.dry_run or not token or not chat_id:
        print(report)
        if not args.dry_run:
            print("\n[not sent: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set]", file=sys.stderr)
            return 1
        return 0

    try:
        telegram_notify.send_message(token, chat_id, report)
    except Exception as exc:
        # Last resort: a short plain error so the night is never silent.
        telegram_notify.send_message(token, chat_id, f"CSP screener failed: {html.escape(str(exc)[:300])}")
        raise
    print("Report sent to Telegram.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
