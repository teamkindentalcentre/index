"""IBKR Flex Web Service client.

Fetches end-of-day account data (open positions and cash) via the
token-based Flex Web Service — no gateway or interactive login needed.

Protocol (version 3):
  1. GET SendRequest?t=<token>&q=<query_id>&v=3  -> reference code
  2. GET GetStatement?t=<token>&q=<ref_code>&v=3 -> Flex XML (poll until ready)

The Flex query must include the "Open Positions" and "Cash Report" sections
(XML format). See README.md for the one-time setup in IBKR Client Portal.
"""

from __future__ import annotations

import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field

import requests

FLEX_BASE = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService"
POLL_ATTEMPTS = 10
POLL_DELAY_SECONDS = 6


@dataclass
class ShortPut:
    ticker: str
    strike: float
    expiry: str
    contracts: int

    @property
    def collateral(self) -> float:
        return self.strike * 100 * self.contracts


@dataclass
class AccountData:
    stock_tickers: list[str] = field(default_factory=list)
    short_puts: list[ShortPut] = field(default_factory=list)
    usd_cash: float | None = None

    @property
    def reserved_collateral(self) -> float:
        return sum(p.collateral for p in self.short_puts)

    @property
    def csp_available_cash(self) -> float | None:
        if self.usd_cash is None:
            return None
        return self.usd_cash - self.reserved_collateral


class FlexError(Exception):
    pass


def _fetch_statement_xml(token: str, query_id: str) -> ET.Element:
    resp = requests.get(
        f"{FLEX_BASE}/SendRequest", params={"t": token, "q": query_id, "v": "3"}, timeout=30
    )
    resp.raise_for_status()
    root = ET.fromstring(resp.text)
    if root.findtext("Status") != "Success":
        raise FlexError(f"SendRequest failed: {root.findtext('ErrorMessage') or resp.text[:200]}")
    ref_code = root.findtext("ReferenceCode")
    base_url = root.findtext("Url") or f"{FLEX_BASE}/GetStatement"

    for attempt in range(POLL_ATTEMPTS):
        resp = requests.get(base_url, params={"t": token, "q": ref_code, "v": "3"}, timeout=60)
        resp.raise_for_status()
        text = resp.text
        if "<FlexQueryResponse" in text:
            return ET.fromstring(text)
        # Statement not ready yet returns a FlexStatementResponse with an error code.
        if attempt < POLL_ATTEMPTS - 1:
            time.sleep(POLL_DELAY_SECONDS)
    raise FlexError("Flex statement was not ready after polling")


def _parse_statement(root: ET.Element) -> AccountData:
    data = AccountData()

    for pos in root.iter("OpenPosition"):
        category = pos.get("assetCategory", "")
        symbol = (pos.get("symbol") or "").strip()
        qty = float(pos.get("position") or 0)
        if category == "STK" and qty > 0:
            data.stock_tickers.append(symbol.upper())
        elif category == "OPT" and qty < 0 and pos.get("putCall") == "P":
            underlying = (pos.get("underlyingSymbol") or symbol.split()[0]).strip().upper()
            data.short_puts.append(
                ShortPut(
                    ticker=underlying,
                    strike=float(pos.get("strike") or 0),
                    expiry=pos.get("expiry") or "",
                    contracts=int(abs(qty)),
                )
            )

    # Prefer base-currency summary row if present, else the USD row.
    usd, base = None, None
    for cash in root.iter("CashReportCurrency"):
        ending = cash.get("endingCash") or cash.get("endingSettledCash")
        if ending is None:
            continue
        currency = cash.get("currency", "")
        if currency == "BASE_SUMMARY":
            base = float(ending)
        elif currency == "USD":
            usd = float(ending)
    data.usd_cash = usd if usd is not None else base

    data.stock_tickers = sorted(set(data.stock_tickers))
    return data


def fetch_account_data(token: str, query_id: str) -> AccountData:
    """Fetch and parse the Flex statement. Raises FlexError/requests errors on failure."""
    return _parse_statement(_fetch_statement_xml(token, query_id))
