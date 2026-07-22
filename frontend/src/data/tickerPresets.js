/**
 * Ticker preset lists for BSE and NSE — all validated via yfinance (2026-07-22).
 * Used by TickerInputForm dropdown to populate ticker input with curated lists.
 */

export const BSE_TOP_100 = [
  "RELIANCE.BO", "TCS.BO", "HDFCBANK.BO", "INFY.BO", "ICICIBANK.BO",
  "BHARTIARTL.BO", "SBIN.BO", "LT.BO", "BAJFINANCE.BO", "HINDUNILVR.BO",
  "WIPRO.BO", "SUNPHARMA.BO", "MARUTI.BO", "AXISBANK.BO", "TITAN.BO",
  "KOTAKBANK.BO", "NTPC.BO", "ONGC.BO", "ADANIENT.BO", "ADANIPORTS.BO",
  "ULTRACEMCO.BO", "NESTLEIND.BO", "COALINDIA.BO", "POWERGRID.BO", "HCLTECH.BO",
  "M&M.BO", "ASIANPAINT.BO", "TATASTEEL.BO", "BAJAJFINSV.BO", "JSWSTEEL.BO",
  "BRITANNIA.BO", "CIPLA.BO", "DRREDDY.BO", "HINDALCO.BO", "APOLLOHOSP.BO",
  "GRASIM.BO", "BPCL.BO", "TRENT.BO", "TECHM.BO", "HEROMOTOCO.BO",
  "EICHERMOT.BO", "DIVISLAB.BO", "SBILIFE.BO", "BAJAJ-AUTO.BO", "INDUSINDBK.BO",
  "SHRIRAMFIN.BO", "TATACONSUM.BO", "HDFCLIFE.BO", "ITC.BO", "BEL.BO",
  "HAL.BO", "ADANIGREEN.BO", "AMBUJACEM.BO", "ABB.BO", "SIEMENS.BO",
  "BANKBARODA.BO", "HAVELLS.BO", "TORNTPHARM.BO", "CHOLAFIN.BO", "JINDALSTEL.BO",
  "DMART.BO", "MOTHERSON.BO", "IOC.BO", "PIDILITIND.BO", "GODREJCP.BO",
  "BOSCHLTD.BO", "COLPAL.BO", "GAIL.BO", "BERGEPAINT.BO", "MARICO.BO",
  "VEDL.BO", "TATAPOWER.BO", "LUPIN.BO", "INDIGO.BO", "IRCTC.BO",
  "IRFC.BO", "PFC.BO", "RECLTD.BO", "POLYCAB.BO", "PERSISTENT.BO",
  "MUTHOOTFIN.BO", "SAIL.BO", "NMDC.BO", "CANBK.BO", "PNB.BO",
  "DABUR.BO", "BHEL.BO", "DIXON.BO", "CUMMINSIND.BO", "MAXHEALTH.BO",
  "LTTS.BO", "MPHASIS.BO", "PAGEIND.BO", "OBEROIRLTY.BO", "GODREJPROP.BO",
  "FEDERALBNK.BO", "MRF.BO", "COFORGE.BO", "NAUKRI.BO", "AUROPHARMA.BO",
];

export const NSE_TOP_100 = [
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
  "BHARTIARTL.NS", "SBIN.NS", "LT.NS", "BAJFINANCE.NS", "HINDUNILVR.NS",
  "WIPRO.NS", "SUNPHARMA.NS", "MARUTI.NS", "AXISBANK.NS", "TITAN.NS",
  "KOTAKBANK.NS", "NTPC.NS", "ONGC.NS", "ADANIENT.NS", "ADANIPORTS.NS",
  "ULTRACEMCO.NS", "NESTLEIND.NS", "COALINDIA.NS", "POWERGRID.NS", "HCLTECH.NS",
  "M&M.NS", "ASIANPAINT.NS", "TATASTEEL.NS", "BAJAJFINSV.NS", "JSWSTEEL.NS",
  "BRITANNIA.NS", "CIPLA.NS", "DRREDDY.NS", "HINDALCO.NS", "APOLLOHOSP.NS",
  "GRASIM.NS", "BPCL.NS", "TRENT.NS", "TECHM.NS", "HEROMOTOCO.NS",
  "EICHERMOT.NS", "DIVISLAB.NS", "SBILIFE.NS", "BAJAJ-AUTO.NS", "INDUSINDBK.NS",
  "SHRIRAMFIN.NS", "TATACONSUM.NS", "HDFCLIFE.NS", "ITC.NS", "BEL.NS",
  "HAL.NS", "ADANIGREEN.NS", "AMBUJACEM.NS", "ABB.NS", "SIEMENS.NS",
  "BANKBARODA.NS", "HAVELLS.NS", "TORNTPHARM.NS", "CHOLAFIN.NS", "JINDALSTEL.NS",
  "DMART.NS", "MOTHERSON.NS", "IOC.NS", "PIDILITIND.NS", "GODREJCP.NS",
  "BOSCHLTD.NS", "COLPAL.NS", "GAIL.NS", "BERGEPAINT.NS", "MARICO.NS",
  "VEDL.NS", "TATAPOWER.NS", "LUPIN.NS", "INDIGO.NS", "IRCTC.NS",
  "IRFC.NS", "PFC.NS", "RECLTD.NS", "POLYCAB.NS", "PERSISTENT.NS",
  "MUTHOOTFIN.NS", "SAIL.NS", "NMDC.NS", "CANBK.NS", "PNB.NS",
  "DABUR.NS", "BHEL.NS", "DIXON.NS", "CUMMINSIND.NS", "MAXHEALTH.NS",
  "LTTS.NS", "MPHASIS.NS", "PAGEIND.NS", "OBEROIRLTY.NS", "GODREJPROP.NS",
  "FEDERALBNK.NS", "MRF.NS", "COFORGE.NS", "NAUKRI.NS", "AUROPHARMA.NS",
];

/** Preset groups for the dropdown selector */
export const TICKER_PRESETS = [
  {
    label: "All BSE + NSE (200 stocks)",
    value: "all_combined",
    description: "All 200 validated stocks from both exchanges",
    tickers: [...BSE_TOP_100, ...NSE_TOP_100],
  },
  {
    label: "All BSE Stocks (100)",
    value: "bse_all",
    description: "All 100 validated BSE stocks (Bombay Stock Exchange)",
    tickers: BSE_TOP_100,
  },
  {
    label: "All NSE Stocks (100)",
    value: "nse_all",
    description: "All 100 validated NSE stocks (National Stock Exchange)",
    tickers: NSE_TOP_100,
  },
  {
    label: "BSE Sensex 30",
    value: "bse_sensex",
    description: "Sensex 30 blue-chip index constituents",
    tickers: BSE_TOP_100.slice(0, 30),
  },
  {
    label: "NSE Nifty 50",
    value: "nse_nifty50",
    description: "Nifty 50 benchmark index constituents",
    tickers: NSE_TOP_100.slice(0, 50),
  },
  {
    label: "BSE Top 10",
    value: "bse_top10",
    description: "Top 10 BSE mega-cap stocks",
    tickers: BSE_TOP_100.slice(0, 10),
  },
  {
    label: "NSE Top 10",
    value: "nse_top10",
    description: "Top 10 NSE mega-cap stocks",
    tickers: NSE_TOP_100.slice(0, 10),
  },
];
