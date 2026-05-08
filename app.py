from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import time
import traceback
from datetime import datetime
from dotenv import load_dotenv

from openai import OpenAI

from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.default_config import DEFAULT_CONFIG
from scanner import scan_market

# Load environment variables
load_dotenv()

app = FastAPI(title="TradingAgents API")

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    ticker: str
    date: str
    capital: Optional[float] = None  # User's available capital in USD

class AnalyzeResponse(BaseModel):
    action: str
    news_report: str
    sentiment_report: str
    market_report: str
    fundamentals_report: str
    final_trade_decision: str
    trader_plan: Optional[str] = None
    beginner_guide: Optional[str] = None  # NEW: beginner-friendly action plan

def build_config():
    """Build TradingAgents config."""
    config = DEFAULT_CONFIG.copy()
    provider = os.getenv("LLM_PROVIDER", "deepseek")
    config["llm_provider"] = provider

    if provider == "anthropic":
        config["deep_think_llm"] = "claude-opus-4-6"
        config["quick_think_llm"] = "claude-haiku-4-5"
    elif provider == "deepseek":
        config["deep_think_llm"] = "deepseek-v4-pro"
        config["quick_think_llm"] = "deepseek-v4-flash"
    elif provider == "openai":
        config["deep_think_llm"] = "gpt-4o"
        config["quick_think_llm"] = "gpt-4o-mini"

    config["max_debate_rounds"] = 1
    config["max_risk_discuss_rounds"] = 1

    vendor = "alpha_vantage" if os.getenv("ALPHA_VANTAGE_API_KEY") else "yfinance"
    config["data_vendors"] = {
        "core_stock_apis": vendor,
        "technical_indicators": vendor,
        "fundamental_data": vendor,
        "news_data": "yfinance",
    }

    return config


def generate_beginner_guide(ticker: str, capital: float, action: str,
                            final_decision: str, market_report: str) -> str:
    """Use DeepSeek to generate a beginner-friendly, actionable trading guide."""
    client = OpenAI(
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        base_url="https://api.deepseek.com"
    )

    prompt = f"""你是一位对新手极其友好的投资顾问。一位完全没有投资经验的小白用户想要做短线交易。

以下是我们的 AI 分析团队对 {ticker} 股票的综合分析结果：

【AI 团队最终决策】: {action}
【详细分析报告】:
{final_decision}

【技术面分析】:
{market_report[:2000]}

现在，用户告诉你他有 ${capital:.2f} 美元可以投资。

请用最简单易懂的中文，给出一份具体到数字的操作指南。格式如下：

## 📋 操作指南（小白版）

### 💰 你的资金: ${capital:.2f}

### 🎯 操作建议
（明确告诉用户该不该买，如果不该买就直接说"建议暂时不要买"并解释原因）

### 📊 具体操作步骤
1. **买入价格**: ¥XX.XX（在这个价格附近挂限价单买入）
2. **买入数量**: XX 股（花费约 $XXX）
3. **剩余现金**: $XXX（永远不要全部投入，留一部分应急）

### 🛡️ 风险控制（非常重要！）
1. **止损价**: ¥XX.XX（如果跌到这个价格，必须卖出，防止亏更多）
2. **止盈价**: ¥XX.XX（涨到这个价格就卖出，落袋为安）
3. **最大可能亏损**: 约 $XXX（你能承受这个亏损吗？）
4. **预期收益**: 约 $XXX

### ⏰ 持有周期
（建议持有多少天，什么情况下提前卖出）

### ⚠️ 特别提醒
（用最直白的话告诉用户需要注意什么，比如不要追高、不要借钱炒股等）

注意事项：
- 所有价格用美元
- 建议用户最多只投入总资金的 30-50%，不要全仓
- 如果 AI 团队建议是 Hold 或 Sell，就明确告诉用户现在不适合买入
- 语气要像一个耐心的朋友在教你，不要用太专业的术语
"""

    response = client.chat.completions.create(
        model="deepseek-v4-flash",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=2000,
    )

    return response.choices[0].message.content


def run_analysis_with_retry(ticker: str, date: str, max_retries: int = 3):
    """Run TradingAgents analysis with automatic retry on rate-limit errors."""
    config = build_config()
    ta = TradingAgentsGraph(debug=True, config=config)

    for attempt in range(max_retries):
        try:
            state, decision = ta.propagate(ticker, date)
            return state, decision
        except Exception as e:
            error_str = str(e)
            if "rate_limit" in error_str or "429" in error_str:
                wait_time = 60 * (attempt + 1)
                print(f"[Rate Limit] Attempt {attempt+1}/{max_retries}. "
                      f"Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                raise
    raise Exception("Rate limit exceeded after multiple retries. Please wait and try again.")


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_stock(req: AnalyzeRequest):
    try:
        state, decision = run_analysis_with_retry(req.ticker, req.date)

        action = decision if isinstance(decision, str) else str(decision)

        # Generate beginner guide if capital is provided
        beginner_guide = None
        if req.capital and req.capital > 0:
            try:
                beginner_guide = generate_beginner_guide(
                    ticker=req.ticker,
                    capital=req.capital,
                    action=action,
                    final_decision=state.get("final_trade_decision", ""),
                    market_report=state.get("market_report", ""),
                )
            except Exception as e:
                print(f"[Warning] Failed to generate beginner guide: {e}")
                beginner_guide = "⚠️ 新手指南生成失败，请参考上方分析师报告做出判断。"

        return AnalyzeResponse(
            action=action,
            news_report=state.get("news_report", "No news report available."),
            sentiment_report=state.get("sentiment_report", "No sentiment report available."),
            market_report=state.get("market_report", "No market report available."),
            fundamentals_report=state.get("fundamentals_report", "No fundamentals report available."),
            final_trade_decision=state.get("final_trade_decision", "No final decision available."),
            trader_plan=state.get("trader_investment_plan", None),
            beginner_guide=beginner_guide,
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/scan")
async def scan_stocks():
    """Scan the market for short-term trading opportunities."""
    try:
        candidates = scan_market(top_n=10)
        return {"candidates": candidates, "scanned_at": datetime.now().isoformat()}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
