# SYNAPSE AI — 智能选股交易助手

> 基于 [TradingAgents](https://github.com/TauricResearch/TradingAgents) 多智能体框架，打造的 AI 驱动选股推荐网站。输入一只股票代码，多位 AI 分析师自动"开会讨论"，给你一份完整的投资建议；或者一键扫描全市场，自动发现短线交易机会。

![Dashboard Preview](https://img.shields.io/badge/UI-Dark_Mode_Glassmorphism-0b0e14?style=for-the-badge)
![Python](https://img.shields.io/badge/Backend-FastAPI_+_Python-009688?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/Frontend-React_+_Vite-61DAFB?style=for-the-badge&logo=react)
![LLM](https://img.shields.io/badge/AI-DeepSeek_V4-blue?style=for-the-badge)

---

## ✨ 核心功能

### 🎯 多智能体深度分析
输入任意美股代码（如 `NVDA`），后台自动调度 **4 位 AI 分析师 + 交易员 + 风控经理**，模拟真实投研团队的工作流程：

| 角色 | 职责 |
|---|---|
| 📰 新闻分析师 | 抓取并解读近期新闻、宏观事件 |
| 💬 情绪分析师 | 分析社交媒体和市场情绪 |
| 📈 技术分析师 | 计算 MACD、RSI 等技术指标 |
| 📊 基本面分析师 | 评估财报、现金流、估值 |
| 🐂🐻 多空辩论 | Bull vs Bear 研究员激烈辩论 |
| 🛡️ 风控经理 | 评估风险并调整建议 |
| ✅ 投资组合经理 | 给出最终决策：Buy / Hold / Sell |

### 📋 新手操作指南
填入你的可投资金额，AI 会额外生成一份**对小白极其友好**的操作方案：
- 具体买入价格和数量
- 止损价和止盈价
- 最大可能亏损
- 建议持有周期

### 🔍 Market Scanner（市场扫描）
一键扫描 ~150 只 S&P 500 成分股，按以下信号综合评分：
- 📊 成交量异动（权重 40%）
- 📈 价格动量（权重 25%）
- 🔺 均线突破（权重 20%）
- 💡 RSI 超卖反弹（权重 15%）

筛出 Top 10 候选股票，点击即可一键进入深度 AI 分析。

---

## 🛠️ 技术架构

```
┌─────────────────────────────────────────┐
│           Frontend (React + Vite)       │
│     暗黑科技风 Glassmorphism UI          │
│  Stock Analysis Tab │ Market Scanner Tab │
└──────────────┬──────────────────────────┘
               │ HTTP API
┌──────────────▼──────────────────────────┐
│           Backend (FastAPI)              │
│  /api/analyze  │  /api/scan             │
│                │                        │
│  ┌─────────────▼───────────────┐        │
│  │   TradingAgents Framework   │        │
│  │  (Multi-Agent LangGraph)    │        │
│  └─────────────┬───────────────┘        │
│                │                        │
│  ┌─────────────▼───────────────┐        │
│  │  LLM Provider (DeepSeek V4) │        │
│  │  Data (yfinance / Alpha V.) │        │
│  └─────────────────────────────┘        │
└─────────────────────────────────────────┘
```

---

## 🚀 快速开始

### 前置要求
- Python 3.12+
- Node.js 18+
- [DeepSeek API Key](https://platform.deepseek.com)（推荐，便宜好用）
- [Alpha Vantage API Key](https://www.alphavantage.co/support/#api-key)（可选，免费注册）

### 安装

```bash
# 1. 克隆项目
git clone https://github.com/BuddySphinx/trading-stock.git
cd trading-stock

# 2. 克隆 TradingAgents 框架
git clone https://github.com/TauricResearch/TradingAgents.git

# 3. 设置 Python 环境
python3 -m venv venv
source venv/bin/activate
cd TradingAgents && pip install . && cd ..
pip install fastapi uvicorn python-dotenv

# 4. 配置 API Keys
cp .env.example TradingAgents/.env
# 编辑 TradingAgents/.env，填入你的 API Keys

# 5. 将自定义后端文件复制到 TradingAgents 目录
cp app.py TradingAgents/
cp scanner.py TradingAgents/

# 6. 安装前端依赖
cd frontend && npm install && cd ..
```

### 运行

```bash
# 启动后端
cd TradingAgents
source ../venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8000 &

# 启动前端
cd ../frontend
npm run dev
```

打开浏览器访问 `http://localhost:5173/` 🎉

---

## 📁 项目结构

```
trading-stock/
├── app.py                # FastAPI 后端（分析接口 + 新手指南生成）
├── scanner.py            # Market Scanner 量化初筛模块
├── .env.example          # API Key 配置模板
├── requirements.txt      # Python 依赖
├── pyproject.toml        # 项目元数据
├── frontend/             # React 前端
│   ├── src/
│   │   ├── App.jsx       # 主界面（分析 + 扫描双标签）
│   │   ├── index.css     # Glassmorphism 暗黑主题样式
│   │   └── main.jsx      # 入口
│   ├── vite.config.js    # Vite + TailwindCSS 配置
│   └── package.json
└── TradingAgents/        # (需手动克隆) TauricResearch 的开源框架
```

---

## 🔧 支持的 LLM 模型

| 供应商 | 深度分析模型 | 快速任务模型 |
|---|---|---|
| **DeepSeek** ✅ 推荐 | deepseek-v4-pro | deepseek-v4-flash |
| Anthropic (Claude) | claude-opus-4-6 | claude-haiku-4-5 |
| OpenAI | gpt-4o | gpt-4o-mini |
| Google Gemini | gemini-3.1-pro | gemini-3-flash |

在 `.env` 文件中设置 `LLM_PROVIDER` 即可切换。

---

## ⚠️ 免责声明

本项目仅供学习和研究目的。**不构成任何投资建议**。股票市场有风险，投资需谨慎。所有交易决策应由用户自行判断并手动执行。

---

## 🙏 致谢

- [TradingAgents](https://github.com/TauricResearch/TradingAgents) — 多智能体 LLM 金融交易框架
- [DeepSeek](https://deepseek.com) — 高性价比大语言模型
- [yfinance](https://github.com/ranaroussi/yfinance) — 免费股票数据接口
