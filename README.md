# index

Standalone, single-file HTML tools for options trading. No build step, no install — open the file in a browser.

## PMCC Calculator (`pmcc_calculator.html`)

A mobile-first calculator for planning **Poor Man's Covered Calls** (a long deep-ITM LEAPS call + a short near-dated OTM call). Open the file directly in any browser — phone or desktop, no install required.

### Inputs

- **Position**: ticker, current stock price (spot)
- **Long leg (LEAPS)**: strike, DTE, IV %, delta (optional), premium (optional)
- **Short leg**: strike, DTE, IV %, delta (optional), premium (optional)
- **Settings**: risk-free rate (default 4%), target stock price move (default +10%) used for the upside scenario

Premium and delta are optional. If you leave a premium blank, the calculator estimates it with the Black-Scholes model from spot, strike, DTE and IV. Every price-derived field carries a badge so you always know where it came from:

| Badge | Meaning |
|---|---|
| `live` | Pulled from IBKR (green) |
| `manual` | You typed it in (grey) |
| `est.` | Estimated via Black-Scholes because the field was left blank (yellow) |

### Outputs

- **Net debit** — long premium minus short credit, per share and per contract (×100)
- **Max loss** — the net debit, if both legs expire worthless
- **Breakeven at short expiry** — found numerically (the long LEAPS is revalued with Black-Scholes at the short call's expiry, since it still has time value left), with the naive `long strike + debit` figure shown alongside for reference
- **Max profit if assigned** — same accurate-vs-naive treatment, valued at the short strike
- **Credit vs debit** — the short call's credit as a % of what the LEAPS cost
- **Annualized income** — what the credit % annualizes to if you sold a similar short call every cycle (not a guarantee, just a projection)
- **Upside breakdown** — split into (1) income from selling the call this cycle, and (2) how much the LEAPS would appreciate if the stock hits your target price, plus the combined P/L
- **Payoff diagram** — a Chart.js line chart of P/L at short-call expiry across a price range, with spot, short strike, and breakeven marked

### Warnings

The tool flags setups that need a second look instead of silently computing garbage:

- Short DTE ≥ long DTE (hard error — the LEAPS must outlive the short call)
- Short strike at or below the long strike (not a standard PMCC)
- Net debit exceeding the strike width (assignment locks in a loss)
- Long delta under 0.70 (not a deep-ITM LEAPS)
- Short strike already in the money (high assignment risk)

### IBKR connection (optional)

The calculator can link to Interactive Brokers' **Client Portal Gateway** to auto-fill live spot price, option chains, premiums, delta and IV instead of typing them in by hand. The calculator works fully without it — this is purely additive.

Setup:
1. Run IBKR's Client Portal Gateway on a computer.
2. Open `https://localhost:5000` in a browser, accept the self-signed certificate, and log in.
3. In the calculator's IBKR panel, set the gateway URL and tap **Connect**. On a phone, use the computer's LAN IP (e.g. `https://192.168.1.20:5000`) and accept the certificate on the phone too.
4. Type a ticker, tap **Fetch from IBKR**, then pick an expiry month and strike for each leg — fields fill in automatically.

**Caveat:** browsers can block cross-origin requests from a page opened as a local file or from a different host (CORS). The most reliable setup is opening the calculator on the same machine as the gateway. If the connection is blocked, everything still works with manual entry.

### Data & privacy

Everything runs client-side in your browser. Inputs are saved to `localStorage` so they're there next time you open the page — nothing is sent anywhere except the optional direct calls to your own IBKR gateway.

### Disclaimer

Estimates use the Black-Scholes model (European exercise, no dividends). Estimated premiums are theoretical and can differ from real market prices. This tool is for planning only — not financial advice.

## Options Tracker (`options_tracker_v6.html`)

A self-contained options trade log and SGD goal tracker: log trades, track P/L against a savings goal, view risk and assignment summaries, and optionally sync to a Google Sheet via a Google Apps Script URL. Open the file directly in a browser; all data is stored in `localStorage`.
