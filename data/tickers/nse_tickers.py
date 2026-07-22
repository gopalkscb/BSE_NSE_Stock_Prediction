"""
NSE (National Stock Exchange of India) — yfinance-validated ticker list
Format  : <SYMBOL>.NS
Source  : yfinance validation (2026-07-22), NSE India top 100 by market cap
Count   : 100 tickers (all validated to return data from yfinance)
Usage   : from data.tickers.nse_tickers import NSE_TICKERS
"""

# ── Top 100 NSE Tickers (validated via yfinance, symbol.NS format) ───────────
NSE_TICKERS = [
    # ── Mega Cap (Top 30) ────────────────────────────────────────────────────
    "RELIANCE.NS",    # Reliance Industries
    "TCS.NS",         # Tata Consultancy Services
    "HDFCBANK.NS",    # HDFC Bank
    "INFY.NS",        # Infosys
    "ICICIBANK.NS",   # ICICI Bank
    "BHARTIARTL.NS",  # Bharti Airtel
    "SBIN.NS",        # State Bank of India
    "LT.NS",          # Larsen & Toubro
    "BAJFINANCE.NS",  # Bajaj Finance
    "HINDUNILVR.NS",  # Hindustan Unilever
    "WIPRO.NS",       # Wipro
    "SUNPHARMA.NS",   # Sun Pharmaceutical
    "MARUTI.NS",      # Maruti Suzuki
    "AXISBANK.NS",    # Axis Bank
    "TITAN.NS",       # Titan Company
    "KOTAKBANK.NS",   # Kotak Mahindra Bank
    "NTPC.NS",        # NTPC
    "ONGC.NS",        # Oil & Natural Gas Corporation
    "ADANIENT.NS",    # Adani Enterprises
    "ADANIPORTS.NS",  # Adani Ports
    "ULTRACEMCO.NS",  # UltraTech Cement
    "NESTLEIND.NS",   # Nestle India
    "COALINDIA.NS",   # Coal India
    "POWERGRID.NS",   # Power Grid Corporation
    "HCLTECH.NS",     # HCL Technologies
    "M&M.NS",         # Mahindra & Mahindra
    "ASIANPAINT.NS",  # Asian Paints
    "TATASTEEL.NS",   # Tata Steel
    "BAJAJFINSV.NS",  # Bajaj Finserv
    "JSWSTEEL.NS",    # JSW Steel

    # ── Large Cap (31-60) ────────────────────────────────────────────────────
    "BRITANNIA.NS",   # Britannia Industries
    "CIPLA.NS",       # Cipla
    "DRREDDY.NS",     # Dr Reddy's Laboratories
    "HINDALCO.NS",    # Hindalco Industries
    "APOLLOHOSP.NS",  # Apollo Hospitals
    "GRASIM.NS",      # Grasim Industries
    "BPCL.NS",        # Bharat Petroleum
    "TRENT.NS",       # Trent
    "TECHM.NS",       # Tech Mahindra
    "HEROMOTOCO.NS",  # Hero MotoCorp
    "EICHERMOT.NS",   # Eicher Motors
    "DIVISLAB.NS",    # Divi's Laboratories
    "SBILIFE.NS",     # SBI Life Insurance
    "BAJAJ-AUTO.NS",  # Bajaj Auto
    "INDUSINDBK.NS",  # IndusInd Bank
    "SHRIRAMFIN.NS",  # Shriram Finance
    "TATACONSUM.NS",  # Tata Consumer Products
    "HDFCLIFE.NS",    # HDFC Life Insurance
    "ITC.NS",         # ITC
    "BEL.NS",         # Bharat Electronics
    "HAL.NS",         # Hindustan Aeronautics
    "ADANIGREEN.NS",  # Adani Green Energy
    "AMBUJACEM.NS",   # Ambuja Cements
    "ABB.NS",         # ABB India
    "SIEMENS.NS",     # Siemens India
    "BANKBARODA.NS",  # Bank of Baroda
    "HAVELLS.NS",     # Havells India
    "TORNTPHARM.NS",  # Torrent Pharmaceuticals
    "CHOLAFIN.NS",    # Cholamandalam Finance
    "JINDALSTEL.NS",  # Jindal Steel & Power

    # ── Upper Mid Cap (61-100) ───────────────────────────────────────────────
    "DMART.NS",       # Avenue Supermarts (DMart)
    "MOTHERSON.NS",   # Motherson Sumi Systems
    "IOC.NS",         # Indian Oil Corporation
    "PIDILITIND.NS",  # Pidilite Industries
    "GODREJCP.NS",    # Godrej Consumer Products
    "BOSCHLTD.NS",    # Bosch
    "COLPAL.NS",      # Colgate-Palmolive India
    "GAIL.NS",        # GAIL India
    "BERGEPAINT.NS",  # Berger Paints
    "MARICO.NS",      # Marico
    "VEDL.NS",        # Vedanta
    "TATAPOWER.NS",   # Tata Power
    "LUPIN.NS",       # Lupin Pharmaceuticals
    "INDIGO.NS",      # InterGlobe Aviation (IndiGo)
    "IRCTC.NS",       # Indian Railway Catering
    "IRFC.NS",        # Indian Railway Finance
    "PFC.NS",         # Power Finance Corporation
    "RECLTD.NS",      # REC Limited
    "POLYCAB.NS",     # Polycab India
    "PERSISTENT.NS",  # Persistent Systems
    "MUTHOOTFIN.NS",  # Muthoot Finance
    "SAIL.NS",        # Steel Authority of India
    "NMDC.NS",        # NMDC
    "CANBK.NS",       # Canara Bank
    "PNB.NS",         # Punjab National Bank
    "DABUR.NS",       # Dabur India
    "BHEL.NS",        # Bharat Heavy Electricals
    "DIXON.NS",       # Dixon Technologies
    "CUMMINSIND.NS",  # Cummins India
    "MAXHEALTH.NS",   # Max Healthcare
    "LTTS.NS",        # L&T Technology Services
    "MPHASIS.NS",     # Mphasis
    "PAGEIND.NS",     # Page Industries
    "OBEROIRLTY.NS",  # Oberoi Realty
    "GODREJPROP.NS",  # Godrej Properties
    "FEDERALBNK.NS",  # Federal Bank
    "MRF.NS",         # MRF
    "COFORGE.NS",     # Coforge
    "NAUKRI.NS",      # Info Edge (Naukri)
    "AUROPHARMA.NS",  # Aurobindo Pharma
]


# ── Nifty 50 (top 50 from above list) ───────────────────────────────────────
NIFTY_50 = NSE_TICKERS[:50]


# ── Sector Sub-lists (validated) ─────────────────────────────────────────────
NIFTY_BANK = [
    "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "AXISBANK.NS", "KOTAKBANK.NS",
    "INDUSINDBK.NS", "FEDERALBNK.NS", "BANKBARODA.NS", "CANBK.NS", "PNB.NS",
]

NIFTY_IT = [
    "TCS.NS", "INFY.NS", "HCLTECH.NS", "WIPRO.NS", "TECHM.NS",
    "LTTS.NS", "MPHASIS.NS", "PERSISTENT.NS", "COFORGE.NS", "NAUKRI.NS",
]

NIFTY_PHARMA = [
    "SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS", "LUPIN.NS",
    "AUROPHARMA.NS", "TORNTPHARM.NS", "APOLLOHOSP.NS", "MAXHEALTH.NS",
]

NIFTY_AUTO = [
    "MARUTI.NS", "M&M.NS", "BAJAJ-AUTO.NS", "HEROMOTOCO.NS",
    "EICHERMOT.NS", "BOSCHLTD.NS", "MOTHERSON.NS",
]


if __name__ == "__main__":
    print(f"Total NSE tickers: {len(NSE_TICKERS)}")
    print(f"Nifty 50 count   : {len(NIFTY_50)}")
    print(f"Nifty Bank count : {len(NIFTY_BANK)}")
    print(f"Nifty IT count   : {len(NIFTY_IT)}")
    print(f"Nifty Pharma     : {len(NIFTY_PHARMA)}")
    print(f"Nifty Auto       : {len(NIFTY_AUTO)}")
    print(f"\nSample (first 10): {NSE_TICKERS[:10]}")
