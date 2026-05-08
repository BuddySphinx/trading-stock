"""
Market Scanner - 量化初筛模块
扫描 S&P 500 成分股，按短线交易信号综合评分，筛出最有潜力的候选股票。
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict
import concurrent.futures
import traceback


# S&P 500 top ~150 most liquid stocks (covers most opportunities)
SP500_TICKERS = [
    "AAPL", "MSFT", "AMZN", "NVDA", "GOOGL", "META", "TSLA", "BRK-B", "UNH", "LLY",
    "JPM", "XOM", "V", "JNJ", "PG", "MA", "AVGO", "HD", "MRK", "COST",
    "ABBV", "PEP", "KO", "ADBE", "WMT", "CRM", "MCD", "CSCO", "ACN", "NFLX",
    "AMD", "LIN", "ABT", "TMO", "DHR", "ORCL", "TXN", "NKE", "CMCSA", "PM",
    "PFE", "UNP", "INTC", "RTX", "LOW", "INTU", "QCOM", "IBM", "AMGN", "HON",
    "NEE", "SPGI", "AMAT", "GE", "BA", "CAT", "DE", "UPS", "BLK", "GS",
    "ISRG", "MDT", "BKNG", "GILD", "ADP", "SYK", "VRTX", "MMC", "ADI", "LRCX",
    "SCHW", "TJX", "PANW", "REGN", "SBUX", "CB", "PGR", "SO", "MO", "CI",
    "ZTS", "BSX", "DUK", "CME", "SNPS", "FI", "BDX", "CL", "CDNS", "CMG",
    "SHW", "MCO", "ICE", "EQIX", "NOC", "ITW", "KLAC", "APD", "MPC", "EOG",
    "SLB", "PSX", "VLO", "MRVL", "ABNB", "PYPL", "LULU", "COIN", "CRWD", "SNOW",
    "DDOG", "ZS", "NET", "PLTR", "RIVN", "SOFI", "HOOD", "MARA", "SQ", "SHOP",
    "SE", "BABA", "JD", "PDD", "NIO", "XPEV", "LI", "TSM", "ASML", "ARM",
    "SMCI", "MU", "ON", "MCHP", "MPWR", "ENPH", "FSLR", "PLUG", "LCID", "F",
    "GM", "DAL", "UAL", "LUV", "CCL", "NCLH", "RCL", "DIS", "WBD", "PARA",
]


def _compute_rsi(prices: pd.Series, period: int = 14) -> float:
    """Compute RSI for the latest data point."""
    delta = prices.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return float(rsi.iloc[-1]) if not rsi.empty else 50.0


def _analyze_single_stock(ticker: str) -> Dict | None:
    """Analyze a single stock and return its screening score."""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="3mo")

        if hist.empty or len(hist) < 25:
            return None

        latest = hist.iloc[-1]
        prev = hist.iloc[-2]

        current_price = float(latest["Close"])
        prev_close = float(prev["Close"])
        daily_change_pct = ((current_price - prev_close) / prev_close) * 100

        # --- Signal 1: Volume Spike (40% weight) ---
        avg_volume_20 = float(hist["Volume"].tail(20).mean())
        current_volume = float(latest["Volume"])
        volume_ratio = current_volume / avg_volume_20 if avg_volume_20 > 0 else 1.0

        volume_score = 0
        if volume_ratio >= 3.0:
            volume_score = 100
        elif volume_ratio >= 2.0:
            volume_score = 80
        elif volume_ratio >= 1.5:
            volume_score = 50
        elif volume_ratio >= 1.2:
            volume_score = 20

        # --- Signal 2: Price Momentum (25% weight) ---
        momentum_score = 0
        if 1.5 <= daily_change_pct <= 8.0:
            momentum_score = min(100, daily_change_pct * 20)
        elif 0.5 <= daily_change_pct < 1.5:
            momentum_score = 30
        elif daily_change_pct > 8.0:
            momentum_score = 10  # Too hot, risky

        # --- Signal 3: Technical Breakout - MA20 (20% weight) ---
        ma20 = float(hist["Close"].tail(20).mean())
        ma50 = float(hist["Close"].tail(50).mean()) if len(hist) >= 50 else ma20
        prev_close_2 = float(hist.iloc[-3]["Close"]) if len(hist) >= 3 else prev_close

        breakout_score = 0
        # Just crossed above MA20
        if current_price > ma20 and prev_close_2 < ma20:
            breakout_score = 100
        elif current_price > ma20 and current_price > ma50:
            breakout_score = 60
        elif current_price > ma20:
            breakout_score = 30

        # --- Signal 4: RSI Signal (15% weight) ---
        rsi = _compute_rsi(hist["Close"])
        rsi_score = 0
        if 30 <= rsi <= 50:
            rsi_score = 80  # Recovering from oversold
        elif 25 <= rsi < 30:
            rsi_score = 100  # Deep oversold, bouncing
        elif 50 < rsi <= 65:
            rsi_score = 40  # Neutral-bullish
        elif rsi > 70:
            rsi_score = 10  # Overbought, risky

        # --- Safety Filters ---
        info = stock.info or {}
        market_cap = info.get("marketCap", 0) or 0
        avg_dollar_volume = avg_volume_20 * current_price

        # Filter out: market cap < $1B, low liquidity, extreme movers
        if market_cap < 1_000_000_000:
            return None
        if avg_dollar_volume < 5_000_000:
            return None
        if daily_change_pct > 15 or daily_change_pct < -10:
            return None

        # --- Composite Score ---
        total_score = (
            volume_score * 0.40 +
            momentum_score * 0.25 +
            breakout_score * 0.20 +
            rsi_score * 0.15
        )

        if total_score < 20:
            return None

        # Build reason text
        reasons = []
        if volume_ratio >= 1.5:
            reasons.append(f"📊 成交量放大 {volume_ratio:.1f}x")
        if daily_change_pct > 1.0:
            reasons.append(f"📈 今日涨 {daily_change_pct:.1f}%")
        if breakout_score >= 60:
            reasons.append("🔺 突破20日均线")
        if 25 <= rsi <= 50:
            reasons.append(f"💡 RSI {rsi:.0f} 超卖反弹")

        return {
            "ticker": ticker,
            "name": info.get("shortName", ticker),
            "price": round(current_price, 2),
            "change_pct": round(daily_change_pct, 2),
            "volume_ratio": round(volume_ratio, 1),
            "rsi": round(rsi, 1),
            "market_cap_b": round(market_cap / 1_000_000_000, 1),
            "score": round(total_score, 1),
            "reasons": reasons,
        }

    except Exception as e:
        # Silently skip problematic stocks
        return None


def scan_market(top_n: int = 10) -> List[Dict]:
    """Scan the market and return top candidates ranked by score."""
    results = []

    # Use thread pool for parallel fetching (much faster)
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(_analyze_single_stock, t): t for t in SP500_TICKERS}
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result:
                results.append(result)

    # Sort by composite score, descending
    results.sort(key=lambda x: x["score"], reverse=True)

    return results[:top_n]
