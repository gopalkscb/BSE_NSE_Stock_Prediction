"""
build_csv.py — Generate CSV files from the NSE and BSE ticker lists.

Outputs (written to data/tickers/):
  nse_tickers.csv        — all NSE tickers with sector sub-list membership flags
  bse_tickers.csv        — all BSE tickers with scrip name and sub-list flags
  nse_nifty50.csv        — Nifty 50 only
  nse_nifty_bank.csv     — Nifty Bank only
  nse_nifty_it.csv       — Nifty IT only
  nse_nifty_pharma.csv   — Nifty Pharma only
  nse_nifty_auto.csv     — Nifty Auto only
  bse_sensex30.csv       — Sensex 30 only

Run from project root:
  python -m data.tickers.build_csv
"""

import csv
import os
from pathlib import Path

# ── locate output directory (same folder as this script) ──────────────────────
OUTPUT_DIR = Path(__file__).parent

# ── import ticker data ─────────────────────────────────────────────────────────
from data.tickers.nse_tickers import (
    NSE_TICKERS,
    NIFTY_50,
    NIFTY_BANK,
    NIFTY_IT,
    NIFTY_PHARMA,
    NIFTY_AUTO,
)
from data.tickers.bse_tickers import (
    BSE_TICKERS,
    SENSEX_30,
    NAME_MAP,
    get_ticker_name,
)


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> int:
    """Write rows to a CSV file; return row count written."""
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


def build_nse_full() -> None:
    """nse_tickers.csv — one row per unique ticker with sub-list membership flags."""
    nifty50_set   = set(NIFTY_50)
    bank_set      = set(NIFTY_BANK)
    it_set        = set(NIFTY_IT)
    pharma_set    = set(NIFTY_PHARMA)
    auto_set      = set(NIFTY_AUTO)

    # Determine index/segment label for each ticker
    def segment(t: str) -> str:
        if t in nifty50_set:
            return "Nifty 50"
        # Nifty Next 50 — tickers that appear between index 50 and 99 in NSE_TICKERS
        # (approximate; based on source file ordering)
        idx = NSE_TICKERS.index(t) if t in NSE_TICKERS else -1
        if 50 <= idx < 100:
            return "Nifty Next 50"
        if 100 <= idx < 200:
            return "Nifty Midcap 150"
        if idx >= 200:
            return "Nifty Smallcap 250"
        return "Other"

    # Deduplicate while preserving first-occurrence order
    seen: set[str] = set()
    rows: list[dict] = []
    for ticker in NSE_TICKERS:
        if ticker in seen:
            continue
        seen.add(ticker)
        symbol = ticker.replace(".NS", "")
        rows.append({
            "ticker":      ticker,
            "symbol":      symbol,
            "exchange":    "NSE",
            "suffix":      ".NS",
            "segment":     segment(ticker),
            "nifty_50":    "Y" if ticker in nifty50_set else "",
            "nifty_bank":  "Y" if ticker in bank_set    else "",
            "nifty_it":    "Y" if ticker in it_set      else "",
            "nifty_pharma":"Y" if ticker in pharma_set  else "",
            "nifty_auto":  "Y" if ticker in auto_set    else "",
        })

    path = OUTPUT_DIR / "nse_tickers.csv"
    count = write_csv(path, rows, fieldnames=[
        "ticker", "symbol", "exchange", "suffix", "segment",
        "nifty_50", "nifty_bank", "nifty_it", "nifty_pharma", "nifty_auto",
    ])
    print(f"  nse_tickers.csv        → {count:>4} rows  ({path})")


def build_nse_sublists() -> None:
    """One CSV per NSE sector sub-list."""
    sub_lists = {
        "nse_nifty50.csv":       ("Nifty 50",     NIFTY_50),
        "nse_nifty_bank.csv":    ("Nifty Bank",   NIFTY_BANK),
        "nse_nifty_it.csv":      ("Nifty IT",     NIFTY_IT),
        "nse_nifty_pharma.csv":  ("Nifty Pharma", NIFTY_PHARMA),
        "nse_nifty_auto.csv":    ("Nifty Auto",   NIFTY_AUTO),
    }
    for filename, (label, tickers) in sub_lists.items():
        rows = [
            {"ticker": t, "symbol": t.replace(".NS", ""), "exchange": "NSE",
             "suffix": ".NS", "index": label}
            for t in tickers
        ]
        path = OUTPUT_DIR / filename
        count = write_csv(path, rows, fieldnames=["ticker", "symbol", "exchange", "suffix", "index"])
        print(f"  {filename:<25} → {count:>4} rows  ({path})")


def build_bse_full() -> None:
    """bse_tickers.csv — one row per unique ticker with company name and Sensex flag."""
    sensex_set = set(SENSEX_30)

    seen: set[str] = set()
    rows: list[dict] = []
    for ticker in BSE_TICKERS:
        if ticker in seen:
            continue
        seen.add(ticker)
        scrip_code = ticker.replace(".BO", "")
        rows.append({
            "ticker":      ticker,
            "scrip_code":  scrip_code,
            "company_name": NAME_MAP.get(scrip_code, ""),
            "exchange":    "BSE",
            "suffix":      ".BO",
            "sensex_30":   "Y" if ticker in sensex_set else "",
        })

    path = OUTPUT_DIR / "bse_tickers.csv"
    count = write_csv(path, rows, fieldnames=[
        "ticker", "scrip_code", "company_name", "exchange", "suffix", "sensex_30",
    ])
    print(f"  bse_tickers.csv        → {count:>4} rows  ({path})")


def build_bse_sensex() -> None:
    """bse_sensex30.csv — Sensex 30 only."""
    rows = [
        {
            "ticker":      t,
            "scrip_code":  t.replace(".BO", ""),
            "company_name": NAME_MAP.get(t.replace(".BO", ""), ""),
            "exchange":    "BSE",
            "suffix":      ".BO",
            "index":       "Sensex 30",
        }
        for t in SENSEX_30
    ]
    path = OUTPUT_DIR / "bse_sensex30.csv"
    count = write_csv(path, rows, fieldnames=[
        "ticker", "scrip_code", "company_name", "exchange", "suffix", "index",
    ])
    print(f"  bse_sensex30.csv       → {count:>4} rows  ({path})")


if __name__ == "__main__":
    print(f"Writing CSVs to: {OUTPUT_DIR}\n")
    build_nse_full()
    build_nse_sublists()
    build_bse_full()
    build_bse_sensex()
    print("\nDone.")
