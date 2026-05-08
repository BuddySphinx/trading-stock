"""
Market Scanner - 量化初筛模块
扫描 S&P 500 成分股，按短线交易信号综合评分，筛出最有潜力的候选股票。
支持两种模式：
  - 🔥 Momentum（顺势追涨）：寻找放量上涨、技术突破的股票
  - 🧲 Accumulation（逆势吸筹）：寻找价格下跌但成交量异常放大的股票
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict
import concurrent.futures
import traceback


# S&P 500 top ~150 most liquid stocks
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
    """Analyze a single stock for both momentum and accumulation signals."""
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

        # --- Common Data ---
        avg_volume_20 = float(hist["Volume"].tail(20).mean())
        current_volume = float(latest["Volume"])
        volume_ratio = current_volume / avg_volume_20 if avg_volume_20 > 0 else 1.0

        ma20 = float(hist["Close"].tail(20).mean())
        ma50 = float(hist["Close"].tail(50).mean()) if len(hist) >= 50 else ma20
        prev_close_2 = float(hist.iloc[-3]["Close"]) if len(hist) >= 3 else prev_close
        rsi = _compute_rsi(hist["Close"])

        # 5-day price change for trend context
        price_5d_ago = float(hist.iloc[-6]["Close"]) if len(hist) >= 6 else current_price
        change_5d_pct = ((current_price - price_5d_ago) / price_5d_ago) * 100

        # --- Safety Filters ---
        info = stock.info or {}
        market_cap = info.get("marketCap", 0) or 0
        avg_dollar_volume = avg_volume_20 * current_price

        if market_cap < 1_000_000_000:
            return None
        if avg_dollar_volume < 5_000_000:
            return None
        if abs(daily_change_pct) > 15:
            return None

        # ============================================================
        # Determine signal type: Momentum vs Accumulation
        # ============================================================
        is_accumulation = (daily_change_pct < -0.5 and volume_ratio >= 1.5)

        if is_accumulation:
            return _score_accumulation(
                ticker, info, current_price, daily_change_pct, change_5d_pct,
                volume_ratio, rsi, ma20, ma50, market_cap
            )
        else:
            return _score_momentum(
                ticker, info, current_price, daily_change_pct,
                volume_ratio, rsi, ma20, ma50, prev_close_2, market_cap
            )

    except Exception:
        return None


def _score_momentum(ticker, info, price, daily_pct, vol_ratio, rsi, ma20, ma50, prev2, mcap):
    """Score a stock using momentum (trend-following) signals."""
    # Volume Spike (35%)
    vol_score = 0
    if vol_ratio >= 3.0: vol_score = 100
    elif vol_ratio >= 2.0: vol_score = 80
    elif vol_ratio >= 1.5: vol_score = 50
    elif vol_ratio >= 1.2: vol_score = 20

    # Price Momentum (25%)
    mom_score = 0
    if 1.5 <= daily_pct <= 8.0: mom_score = min(100, daily_pct * 20)
    elif 0.5 <= daily_pct < 1.5: mom_score = 30
    elif daily_pct > 8.0: mom_score = 10

    # Breakout (25%)
    brk_score = 0
    if price > ma20 and prev2 < ma20: brk_score = 100
    elif price > ma20 and price > ma50: brk_score = 60
    elif price > ma20: brk_score = 30

    # RSI (15%)
    rsi_score = 0
    if 30 <= rsi <= 50: rsi_score = 80
    elif 25 <= rsi < 30: rsi_score = 100
    elif 50 < rsi <= 65: rsi_score = 40
    elif rsi > 70: rsi_score = 10

    total = vol_score * 0.35 + mom_score * 0.25 + brk_score * 0.25 + rsi_score * 0.15
    if total < 20:
        return None

    reasons = []
    if vol_ratio >= 1.5: reasons.append(f"📊 成交量放大 {vol_ratio:.1f}x")
    if daily_pct > 1.0: reasons.append(f"📈 今日涨 {daily_pct:.1f}%")
    if brk_score >= 60: reasons.append("🔺 突破20日均线")
    if 25 <= rsi <= 50: reasons.append(f"💡 RSI {rsi:.0f}")

    return {
        "ticker": ticker,
        "name": info.get("shortName", ticker),
        "price": round(price, 2),
        "change_pct": round(daily_pct, 2),
        "volume_ratio": round(vol_ratio, 1),
        "rsi": round(rsi, 1),
        "market_cap_b": round(mcap / 1e9, 1),
        "score": round(total, 1),
        "signal_type": "momentum",
        "signal_label": "🔥 顺势追涨",
        "reasons": reasons,
    }


def _score_accumulation(ticker, info, price, daily_pct, change_5d, vol_ratio, rsi, ma20, ma50, mcap):
    """Score a stock using accumulation (institutional buying during dip) signals."""
    # Volume during decline — the higher the volume on a red day, the stronger the signal (40%)
    vol_score = 0
    if vol_ratio >= 3.0: vol_score = 100
    elif vol_ratio >= 2.5: vol_score = 90
    elif vol_ratio >= 2.0: vol_score = 75
    elif vol_ratio >= 1.5: vol_score = 50

    # How oversold is RSI — deeper oversold = stronger bounce potential (25%)
    rsi_score = 0
    if rsi < 25: rsi_score = 100     # 极度超卖
    elif rsi < 30: rsi_score = 90    # 深度超卖
    elif rsi < 35: rsi_score = 70    # 超卖
    elif rsi < 40: rsi_score = 50    # 偏弱
    elif rsi < 50: rsi_score = 30

    # Price near support — close to or below MA50 is better (20%)
    support_score = 0
    dist_to_ma50_pct = ((price - ma50) / ma50) * 100
    if dist_to_ma50_pct < -5: support_score = 100    # 远低于MA50
    elif dist_to_ma50_pct < -2: support_score = 80   # 低于MA50
    elif dist_to_ma50_pct < 0: support_score = 60    # 略低于MA50
    elif dist_to_ma50_pct < 3: support_score = 30    # 接近MA50

    # Multi-day decline depth — bigger recent drop = more room to bounce (15%)
    dip_score = 0
    if change_5d < -10: dip_score = 100
    elif change_5d < -7: dip_score = 80
    elif change_5d < -5: dip_score = 60
    elif change_5d < -3: dip_score = 40
    elif change_5d < -1: dip_score = 20

    total = vol_score * 0.40 + rsi_score * 0.25 + support_score * 0.20 + dip_score * 0.15
    if total < 25:
        return None

    reasons = []
    reasons.append(f"🧲 跌 {daily_pct:.1f}% 但放量 {vol_ratio:.1f}x（疑似吸筹）")
    if rsi < 35: reasons.append(f"📉 RSI {rsi:.0f} 超卖区")
    if dist_to_ma50_pct < 0: reasons.append(f"🛡️ 价格低于50日均线 {dist_to_ma50_pct:.1f}%")
    if change_5d < -3: reasons.append(f"📆 近5日跌 {change_5d:.1f}%，反弹空间大")

    return {
        "ticker": ticker,
        "name": info.get("shortName", ticker),
        "price": round(price, 2),
        "change_pct": round(daily_pct, 2),
        "volume_ratio": round(vol_ratio, 1),
        "rsi": round(rsi, 1),
        "market_cap_b": round(mcap / 1e9, 1),
        "score": round(total, 1),
        "signal_type": "accumulation",
        "signal_label": "🧲 逆势吸筹",
        "reasons": reasons,
    }


def scan_market(top_n: int = 10) -> List[Dict]:
    """Scan the market and return top candidates ranked by score.
    Returns a mixed list of momentum and accumulation signals.
    """
    results = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(_analyze_single_stock, t): t for t in SP500_TICKERS}
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result:
                results.append(result)

    # Sort by score descending
    results.sort(key=lambda x: x["score"], reverse=True)

    return results[:top_n]
