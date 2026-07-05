"""Option-chain screening via yfinance.

yfinance returns strike, bid, impliedVolatility and openInterest but no
greeks, so put delta is computed with Black-Scholes from the quoted IV.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, datetime

import yfinance as yf


@dataclass
class PutCandidate:
    ticker: str
    spot: float
    strike: float
    expiry: str
    dte: int
    bid: float
    iv: float
    delta: float
    open_interest: int
    in_band: bool = True  # yield within [premium_yield_min, premium_yield_max]
    affordable: bool | None = None

    @property
    def collateral(self) -> float:
        return self.strike * 100

    @property
    def premium(self) -> float:
        return self.bid * 100

    @property
    def yield_pct(self) -> float:
        return self.bid / self.strike

    @property
    def annualized_yield(self) -> float:
        return self.yield_pct * 365 / max(self.dte, 1)


@dataclass
class TickerResult:
    ticker: str
    spot: float | None = None
    atm_iv: float | None = None  # representative IV for the watchlist IV table
    candidates: list[PutCandidate] | None = None
    error: str | None = None


def _norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def put_delta(spot: float, strike: float, dte_days: int, iv: float, risk_free_rate: float) -> float:
    t = max(dte_days, 1) / 365.0
    d1 = (math.log(spot / strike) + (risk_free_rate + 0.5 * iv * iv) * t) / (iv * math.sqrt(t))
    return _norm_cdf(d1) - 1.0


def screen_ticker(ticker: str, cfg: dict, today: date | None = None) -> TickerResult:
    today = today or date.today()
    result = TickerResult(ticker=ticker)
    try:
        tk = yf.Ticker(ticker)
        spot = tk.fast_info.last_price
        if not spot or spot <= 0:
            result.error = "no price data"
            return result
        result.spot = float(spot)

        expiries = []
        for exp in tk.options:
            dte = (datetime.strptime(exp, "%Y-%m-%d").date() - today).days
            if cfg["dte_min"] <= dte <= cfg["dte_max"]:
                expiries.append((exp, dte))
        if not expiries:
            result.error = f"no expiries in {cfg['dte_min']}-{cfg['dte_max']} DTE window"
            return result

        candidates: list[PutCandidate] = []
        atm_ivs: list[float] = []
        for exp, dte in expiries:
            puts = tk.option_chain(exp).puts
            for row in puts.itertuples():
                strike = float(row.strike)
                bid = float(row.bid) if row.bid == row.bid else 0.0  # NaN guard
                iv = float(row.impliedVolatility) if row.impliedVolatility == row.impliedVolatility else 0.0
                oi = int(row.openInterest) if row.openInterest == row.openInterest else 0

                # Representative IV: strikes within 5% of spot
                if iv > 0 and abs(strike - result.spot) / result.spot <= 0.05:
                    atm_ivs.append(iv)

                if strike >= result.spot:  # OTM puts only
                    continue
                if bid < cfg["min_bid"] or iv <= 0 or oi < cfg["min_open_interest"]:
                    continue
                if iv < cfg["iv_min"]:
                    continue
                if bid / strike < cfg["premium_yield_min"]:
                    continue
                delta = put_delta(result.spot, strike, dte, iv, cfg["risk_free_rate"])
                if abs(delta) > cfg["delta_max"]:
                    continue
                candidates.append(
                    PutCandidate(
                        ticker=ticker, spot=result.spot, strike=strike, expiry=exp,
                        dte=dte, bid=bid, iv=iv, delta=delta, open_interest=oi,
                        in_band=bid / strike <= cfg["premium_yield_max"],
                    )
                )

        if atm_ivs:
            result.atm_iv = sum(atm_ivs) / len(atm_ivs)
        # Keep only the best strike per expiry to avoid near-duplicate picks.
        # In-band yields (the 0.7-1% target) beat higher, riskier premiums.
        rank_key = lambda c: (not c.in_band, -c.annualized_yield, abs(c.delta))
        best_per_expiry: dict[str, PutCandidate] = {}
        for c in candidates:
            cur = best_per_expiry.get(c.expiry)
            if cur is None or rank_key(c) < rank_key(cur):
                best_per_expiry[c.expiry] = c
        result.candidates = sorted(best_per_expiry.values(), key=rank_key)
    except Exception as exc:  # yfinance failures shouldn't kill the whole run
        result.error = f"{type(exc).__name__}: {exc}"
    return result
