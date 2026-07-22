"""
BSE (Bombay Stock Exchange) — yfinance-validated ticker list
Format  : <SYMBOL>.BO
Source  : yfinance validation (2026-07-22), BSE India top 100 by market cap
Count   : 100 tickers (all validated to return data from yfinance)
Usage   : from data.tickers.bse_tickers import BSE_TICKERS
"""

# ── Top 100 BSE Tickers (validated via yfinance, symbol.BO format) ───────────
BSE_TICKERS = [
    # ── Mega Cap (Top 30) ────────────────────────────────────────────────────
    "RELIANCE.BO",    # Reliance Industries
    "TCS.BO",         # Tata Consultancy Services
    "HDFCBANK.BO",    # HDFC Bank
    "INFY.BO",        # Infosys
    "ICICIBANK.BO",   # ICICI Bank
    "BHARTIARTL.BO",  # Bharti Airtel
    "SBIN.BO",        # State Bank of India
    "LT.BO",          # Larsen & Toubro
    "BAJFINANCE.BO",  # Bajaj Finance
    "HINDUNILVR.BO",  # Hindustan Unilever
    "WIPRO.BO",       # Wipro
    "SUNPHARMA.BO",   # Sun Pharmaceutical
    "MARUTI.BO",      # Maruti Suzuki
    "AXISBANK.BO",    # Axis Bank
    "TITAN.BO",       # Titan Company
    "KOTAKBANK.BO",   # Kotak Mahindra Bank
    "NTPC.BO",        # NTPC
    "ONGC.BO",        # Oil & Natural Gas Corporation
    "ADANIENT.BO",    # Adani Enterprises
    "ADANIPORTS.BO",  # Adani Ports
    "ULTRACEMCO.BO",  # UltraTech Cement
    "NESTLEIND.BO",   # Nestle India
    "COALINDIA.BO",   # Coal India
    "POWERGRID.BO",   # Power Grid Corporation
    "HCLTECH.BO",     # HCL Technologies
    "M&M.BO",         # Mahindra & Mahindra
    "ASIANPAINT.BO",  # Asian Paints
    "TATASTEEL.BO",   # Tata Steel
    "BAJAJFINSV.BO",  # Bajaj Finserv
    "JSWSTEEL.BO",    # JSW Steel

    # ── Large Cap (31-60) ────────────────────────────────────────────────────
    "BRITANNIA.BO",   # Britannia Industries
    "CIPLA.BO",       # Cipla
    "DRREDDY.BO",     # Dr Reddy's Laboratories
    "HINDALCO.BO",    # Hindalco Industries
    "APOLLOHOSP.BO",  # Apollo Hospitals
    "GRASIM.BO",      # Grasim Industries
    "BPCL.BO",        # Bharat Petroleum
    "TRENT.BO",       # Trent
    "TECHM.BO",       # Tech Mahindra
    "HEROMOTOCO.BO",  # Hero MotoCorp
    "EICHERMOT.BO",   # Eicher Motors
    "DIVISLAB.BO",    # Divi's Laboratories
    "SBILIFE.BO",     # SBI Life Insurance
    "BAJAJ-AUTO.BO",  # Bajaj Auto
    "INDUSINDBK.BO",  # IndusInd Bank
    "SHRIRAMFIN.BO",  # Shriram Finance
    "TATACONSUM.BO",  # Tata Consumer Products
    "HDFCLIFE.BO",    # HDFC Life Insurance
    "ITC.BO",         # ITC
    "BEL.BO",         # Bharat Electronics
    "HAL.BO",         # Hindustan Aeronautics
    "ADANIGREEN.BO",  # Adani Green Energy
    "AMBUJACEM.BO",   # Ambuja Cements
    "ABB.BO",         # ABB India
    "SIEMENS.BO",     # Siemens India
    "BANKBARODA.BO",  # Bank of Baroda
    "HAVELLS.BO",     # Havells India
    "TORNTPHARM.BO",  # Torrent Pharmaceuticals
    "CHOLAFIN.BO",    # Cholamandalam Finance
    "JINDALSTEL.BO",  # Jindal Steel & Power

    # ── Upper Mid Cap (61-100) ───────────────────────────────────────────────
    "DMART.BO",       # Avenue Supermarts (DMart)
    "MOTHERSON.BO",   # Motherson Sumi Systems
    "IOC.BO",         # Indian Oil Corporation
    "PIDILITIND.BO",  # Pidilite Industries
    "GODREJCP.BO",    # Godrej Consumer Products
    "BOSCHLTD.BO",    # Bosch
    "COLPAL.BO",      # Colgate-Palmolive India
    "GAIL.BO",        # GAIL India
    "BERGEPAINT.BO",  # Berger Paints
    "MARICO.BO",      # Marico
    "VEDL.BO",        # Vedanta
    "TATAPOWER.BO",   # Tata Power
    "LUPIN.BO",       # Lupin Pharmaceuticals
    "INDIGO.BO",      # InterGlobe Aviation (IndiGo)
    "IRCTC.BO",       # Indian Railway Catering
    "IRFC.BO",        # Indian Railway Finance
    "PFC.BO",         # Power Finance Corporation
    "RECLTD.BO",      # REC Limited
    "POLYCAB.BO",     # Polycab India
    "PERSISTENT.BO",  # Persistent Systems
    "MUTHOOTFIN.BO",  # Muthoot Finance
    "SAIL.BO",        # Steel Authority of India
    "NMDC.BO",        # NMDC
    "CANBK.BO",       # Canara Bank
    "PNB.BO",         # Punjab National Bank
    "DABUR.BO",       # Dabur India
    "BHEL.BO",        # Bharat Heavy Electricals
    "DIXON.BO",       # Dixon Technologies
    "CUMMINSIND.BO",  # Cummins India
    "MAXHEALTH.BO",   # Max Healthcare
    "LTTS.BO",        # L&T Technology Services
    "MPHASIS.BO",     # Mphasis
    "PAGEIND.BO",     # Page Industries
    "OBEROIRLTY.BO",  # Oberoi Realty
    "GODREJPROP.BO",  # Godrej Properties
    "FEDERALBNK.BO",  # Federal Bank
    "MRF.BO",         # MRF
    "COFORGE.BO",     # Coforge
    "NAUKRI.BO",      # Info Edge (Naukri)
    "AUROPHARMA.BO",  # Aurobindo Pharma
]


# ── Sensex 30 (subset of above, validated) ──────────────────────────────────
SENSEX_30 = [
    "RELIANCE.BO", "TCS.BO", "HDFCBANK.BO", "INFY.BO", "ICICIBANK.BO",
    "BHARTIARTL.BO", "SBIN.BO", "LT.BO", "BAJFINANCE.BO", "HINDUNILVR.BO",
    "SUNPHARMA.BO", "MARUTI.BO", "AXISBANK.BO", "TITAN.BO", "KOTAKBANK.BO",
    "NTPC.BO", "ONGC.BO", "WIPRO.BO", "BAJAJ-AUTO.BO", "NESTLEIND.BO",
    "BAJAJFINSV.BO", "M&M.BO", "ASIANPAINT.BO", "TATASTEEL.BO",
    "JSWSTEEL.BO", "CIPLA.BO", "DRREDDY.BO", "HINDALCO.BO",
    "ULTRACEMCO.BO", "ITC.BO",
]


# ── Name map: symbol → company name ─────────────────────────────────────────
NAME_MAP = {
    "RELIANCE": "Reliance Industries",
    "TCS": "Tata Consultancy Services",
    "HDFCBANK": "HDFC Bank",
    "INFY": "Infosys",
    "ICICIBANK": "ICICI Bank",
    "BHARTIARTL": "Bharti Airtel",
    "SBIN": "State Bank of India",
    "LT": "Larsen & Toubro",
    "BAJFINANCE": "Bajaj Finance",
    "HINDUNILVR": "Hindustan Unilever",
    "WIPRO": "Wipro",
    "SUNPHARMA": "Sun Pharmaceutical",
    "MARUTI": "Maruti Suzuki",
    "AXISBANK": "Axis Bank",
    "TITAN": "Titan Company",
    "KOTAKBANK": "Kotak Mahindra Bank",
    "NTPC": "NTPC",
    "ONGC": "Oil & Natural Gas Corp",
    "ADANIENT": "Adani Enterprises",
    "ADANIPORTS": "Adani Ports",
    "ULTRACEMCO": "UltraTech Cement",
    "NESTLEIND": "Nestle India",
    "COALINDIA": "Coal India",
    "POWERGRID": "Power Grid Corporation",
    "HCLTECH": "HCL Technologies",
    "M&M": "Mahindra & Mahindra",
    "ASIANPAINT": "Asian Paints",
    "TATASTEEL": "Tata Steel",
    "BAJAJFINSV": "Bajaj Finserv",
    "JSWSTEEL": "JSW Steel",
    "BRITANNIA": "Britannia Industries",
    "CIPLA": "Cipla",
    "DRREDDY": "Dr Reddy's Labs",
    "HINDALCO": "Hindalco Industries",
    "APOLLOHOSP": "Apollo Hospitals",
    "GRASIM": "Grasim Industries",
    "BPCL": "Bharat Petroleum",
    "TRENT": "Trent",
    "TECHM": "Tech Mahindra",
    "HEROMOTOCO": "Hero MotoCorp",
    "EICHERMOT": "Eicher Motors",
    "DIVISLAB": "Divi's Laboratories",
    "SBILIFE": "SBI Life Insurance",
    "BAJAJ-AUTO": "Bajaj Auto",
    "INDUSINDBK": "IndusInd Bank",
    "SHRIRAMFIN": "Shriram Finance",
    "TATACONSUM": "Tata Consumer Products",
    "HDFCLIFE": "HDFC Life Insurance",
    "ITC": "ITC",
    "BEL": "Bharat Electronics",
    "HAL": "Hindustan Aeronautics",
    "ADANIGREEN": "Adani Green Energy",
    "AMBUJACEM": "Ambuja Cements",
    "ABB": "ABB India",
    "SIEMENS": "Siemens India",
    "BANKBARODA": "Bank of Baroda",
    "HAVELLS": "Havells India",
    "TORNTPHARM": "Torrent Pharmaceuticals",
    "CHOLAFIN": "Cholamandalam Finance",
    "JINDALSTEL": "Jindal Steel & Power",
    "DMART": "Avenue Supermarts (DMart)",
    "MOTHERSON": "Motherson Sumi Systems",
    "IOC": "Indian Oil Corporation",
    "PIDILITIND": "Pidilite Industries",
    "GODREJCP": "Godrej Consumer Products",
    "BOSCHLTD": "Bosch",
    "COLPAL": "Colgate-Palmolive India",
    "GAIL": "GAIL India",
    "BERGEPAINT": "Berger Paints",
    "MARICO": "Marico",
    "VEDL": "Vedanta",
    "TATAPOWER": "Tata Power",
    "LUPIN": "Lupin Pharmaceuticals",
    "INDIGO": "InterGlobe Aviation (IndiGo)",
    "IRCTC": "Indian Railway Catering",
    "IRFC": "Indian Railway Finance",
    "PFC": "Power Finance Corporation",
    "RECLTD": "REC Limited",
    "POLYCAB": "Polycab India",
    "PERSISTENT": "Persistent Systems",
    "MUTHOOTFIN": "Muthoot Finance",
    "SAIL": "Steel Authority of India",
    "NMDC": "NMDC",
    "CANBK": "Canara Bank",
    "PNB": "Punjab National Bank",
    "DABUR": "Dabur India",
    "BHEL": "Bharat Heavy Electricals",
    "DIXON": "Dixon Technologies",
    "CUMMINSIND": "Cummins India",
    "MAXHEALTH": "Max Healthcare",
    "LTTS": "L&T Technology Services",
    "MPHASIS": "Mphasis",
    "PAGEIND": "Page Industries",
    "OBEROIRLTY": "Oberoi Realty",
    "GODREJPROP": "Godrej Properties",
    "FEDERALBNK": "Federal Bank",
    "MRF": "MRF",
    "COFORGE": "Coforge",
    "NAUKRI": "Info Edge (Naukri)",
    "AUROPHARMA": "Aurobindo Pharma",
}


def get_ticker_name(ticker: str) -> str:
    """Return company name for a BSE ticker symbol, or the ticker itself if unknown."""
    symbol = ticker.replace(".BO", "").upper()
    return NAME_MAP.get(symbol, ticker)


# ── Reverse Lookup: Symbol Name → common symbol (for auto-resolve) ───────────
# Since BSE now uses symbol.BO format, this maps legacy scrip codes back to symbols
SYMBOL_TO_SCRIP = {
    "500325": "RELIANCE",
    "532540": "TCS",
    "500180": "HDFCBANK",
    "500209": "INFY",
    "532174": "ICICIBANK",
    "532454": "BHARTIARTL",
    "500112": "SBIN",
    "500510": "LT",
    "500034": "BAJFINANCE",
    "500696": "HINDUNILVR",
    "532187": "WIPRO",
    "524715": "SUNPHARMA",
    "532500": "MARUTI",
    "532215": "AXISBANK",
    "500570": "TITAN",
    "500247": "KOTAKBANK",
    "532555": "NTPC",
    "500312": "ONGC",
    "500400": "M&M",
    "500820": "ASIANPAINT",
    "500470": "TATASTEEL",
    "532977": "BAJAJ-AUTO",
    "500875": "ITC",
    "500049": "BEL",
}


def resolve_bse_ticker(ticker: str) -> tuple[str, bool]:
    """Resolve a BSE ticker input to a valid yfinance format.

    Handles:
      - Symbol format: "TCS.BO" → ("TCS.BO", False) — already correct
      - Numeric scrip code: "532540.BO" → ("TCS.BO", True) — resolved to symbol
      - No .BO suffix: "TCS" → ("TCS", False) — unchanged

    Returns:
        (resolved_ticker, was_resolved) tuple
    """
    if not ticker.upper().endswith(".BO"):
        return (ticker, False)

    symbol = ticker[:-3].upper()  # Strip .BO

    # If it's a numeric scrip code, resolve to symbol name
    if symbol.isdigit():
        resolved_symbol = SYMBOL_TO_SCRIP.get(symbol)
        if resolved_symbol:
            return (f"{resolved_symbol}.BO", True)
        # Unknown scrip code — return as-is
        return (ticker.upper(), False)

    # Already a symbol format — return as-is
    return (ticker.upper(), False)


if __name__ == "__main__":
    print(f"Total BSE tickers: {len(BSE_TICKERS)}")
    print(f"Sensex 30 count  : {len(SENSEX_30)}")
    print(f"Name map entries : {len(NAME_MAP)}")
    print(f"\nSample (first 10): {BSE_TICKERS[:10]}")
