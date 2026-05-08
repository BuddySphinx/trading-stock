import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Activity, Newspaper, TrendingUp, PieChart, ShieldAlert, Cpu, BarChart3, FileText, DollarSign, Sparkles, Radar, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import axios from 'axios'

function ScannerPanel({ onSelectStock }) {
  const [scanning, setScanning] = useState(false)
  const [candidates, setCandidates] = useState(null)
  const [scanError, setScanError] = useState(null)

  const handleScan = async () => {
    setScanning(true)
    setScanError(null)
    try {
      const res = await axios.get('http://localhost:8000/api/scan', { timeout: 120000 })
      setCandidates(res.data.candidates)
    } catch (err) {
      setScanError(err.response?.data?.detail || "扫描失败，请检查后端服务。")
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ff88] to-[#00f0ff] flex items-center justify-center shadow-lg shadow-[#00ff88]/20">
            <Radar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Market Scanner</h2>
            <p className="text-xs text-gray-400">扫描 S&P 500 成分股，发现短线交易机会</p>
          </div>
        </div>
        <button onClick={handleScan} disabled={scanning}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00ff88]/20 to-[#00f0ff]/20 hover:from-[#00ff88]/30 hover:to-[#00f0ff]/30 border border-[#00ff88]/20 text-white font-medium transition-all disabled:opacity-50">
          {scanning ? '⏳ 扫描中...' : '🔍 一键扫描'}
        </button>
      </div>

      {scanning && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-20">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-t-2 border-[#00ff88] rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-r-2 border-[#00f0ff] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center"><Radar className="text-white w-6 h-6 animate-pulse" /></div>
          </div>
          <p className="text-gray-400">正在扫描 ~150 只股票，大约需要 30-60 秒...</p>
        </motion.div>
      )}

      {scanError && (
        <div className="glass-panel p-6 text-center">
          <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-gray-400">{scanError}</p>
        </div>
      )}

      {candidates && !scanning && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <p className="text-sm text-gray-500">找到 {candidates.length} 只候选股票，按综合评分排序：</p>
          {candidates.map((c, i) => (
            <motion.div key={c.ticker} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-panel p-4 hover:bg-white/5 transition-colors cursor-pointer group"
              onClick={() => onSelectStock(c.ticker)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00f0ff]/20 to-[#b026ff]/20 flex items-center justify-center text-sm font-bold text-white">
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">{c.ticker}</span>
                      <span className="text-sm text-gray-500">{c.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.signal_type === 'accumulation'
                          ? 'bg-[#b026ff]/15 text-[#d580ff] border border-[#b026ff]/30'
                          : 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30'
                      }`}>
                        {c.signal_label || '🔥 顺势追涨'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {c.reasons.map((r, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{r}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-white font-medium">${c.price}</p>
                    <p className={`text-sm flex items-center gap-1 ${c.change_pct >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                      {c.change_pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {c.change_pct > 0 ? '+' : ''}{c.change_pct}%
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00ff88]/10 to-[#00f0ff]/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-[#00ff88]">{c.score}</span>
                  </div>
                  <span className="text-gray-600 group-hover:text-[#00f0ff] transition-colors text-sm">→ 深度分析</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!candidates && !scanning && !scanError && (
        <div className="flex flex-col items-center py-20 opacity-30">
          <Radar className="w-14 h-14 text-gray-600 mb-4" />
          <p className="text-gray-500">点击"一键扫描"发现今日短线机会</p>
        </div>
      )}
    </div>
  )
}

function App() {
  const [tab, setTab] = useState('analyze') // 'analyze' | 'scanner'
  const [ticker, setTicker] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [capital, setCapital] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleAnalyze = async (e) => {
    e && e.preventDefault()
    if (!ticker) return
    setTab('analyze')
    setLoading(true); setError(null); setResult(null)
    try {
      const payload = { ticker: ticker.toUpperCase(), date }
      if (capital && parseFloat(capital) > 0) payload.capital = parseFloat(capital)
      const res = await axios.post('http://localhost:8000/api/analyze', payload, { timeout: 600000 })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.code === 'ECONNABORTED' ? "分析超时" : "分析失败")
    } finally { setLoading(false) }
  }

  const handleScanSelect = (selectedTicker) => {
    setTicker(selectedTicker)
    setTab('analyze')
    // Auto-trigger analysis
    setTimeout(() => {
      setLoading(true); setError(null); setResult(null)
      const payload = { ticker: selectedTicker, date }
      if (capital && parseFloat(capital) > 0) payload.capital = parseFloat(capital)
      axios.post('http://localhost:8000/api/analyze', payload, { timeout: 600000 })
        .then(res => setResult(res.data))
        .catch(err => setError(err.response?.data?.detail || "分析失败"))
        .finally(() => setLoading(false))
    }, 100)
  }

  const getActionStyle = (action) => {
    if (!action) return { color: 'text-gray-400', border: 'border-gray-600', bg: 'bg-gray-900/50' }
    const a = action.toLowerCase()
    if (a.includes('buy') || a.includes('overweight')) return { color: 'text-[#00ff88]', border: 'border-[#00ff88]/40', bg: 'bg-[#00ff88]/10' }
    if (a.includes('sell') || a.includes('underweight')) return { color: 'text-[#ff3366]', border: 'border-[#ff3366]/40', bg: 'bg-[#ff3366]/10' }
    return { color: 'text-[#00f0ff]', border: 'border-[#00f0ff]/40', bg: 'bg-[#00f0ff]/10' }
  }

  const renderReport = (text) => {
    if (!text) return <p className="text-gray-500 italic">No data</p>
    return (
      <div className="space-y-2 text-sm text-gray-300 leading-relaxed max-h-80 overflow-y-auto pr-2">
        {text.split('\n').filter(l => l.trim()).map((line, i) => {
          if (line.startsWith('## ')) return <h3 key={i} className="text-lg text-white font-bold mt-4 mb-2">{line.replace(/^##\s*/, '').replace(/\*\*/g, '')}</h3>
          if (line.startsWith('### ')) return <h4 key={i} className="text-base text-white font-semibold mt-3 mb-1">{line.replace(/^###\s*/, '').replace(/\*\*/g, '')}</h4>
          if (line.match(/^\*\*[^*]+\*\*$/)) return <h4 key={i} className="text-white font-semibold mt-3">{line.replace(/\*\*/g, '')}</h4>
          const parts = line.split(/(\*\*[^*]+\*\*)/g)
          const isListItem = line.match(/^[-•]\s/) || line.match(/^\d+\.\s/)
          return (
            <p key={i} className={isListItem ? 'pl-4 border-l-2 border-white/10 py-0.5' : ''}>
              {parts.map((part, j) => part.startsWith('**') && part.endsWith('**')
                ? <strong key={j} className="text-white">{part.replace(/\*\*/g, '')}</strong>
                : <span key={j}>{part}</span>
              )}
            </p>
          )
        })}
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#b026ff] flex items-center justify-center shadow-lg shadow-[#00f0ff]/20">
            <Cpu className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">SYNAPSE AI</h1>
            <p className="text-sm text-gray-400">Trading Dashboard</p>
          </div>
        </div>
        {/* Tab Switcher */}
        <div className="flex gap-1 glass-panel p-1">
          <button onClick={() => setTab('analyze')}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'analyze' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            🎯 Stock Analysis
          </button>
          <button onClick={() => setTab('scanner')}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'scanner' ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'text-gray-500 hover:text-gray-300'}`}>
            🔍 Market Scanner
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {tab === 'scanner' ? (
          <ScannerPanel onSelectStock={handleScanSelect} />
        ) : (
          <>
            {/* Search Bar */}
            <form onSubmit={handleAnalyze} className="mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex items-center flex-1">
                  <Search className="absolute left-4 text-gray-400 w-5 h-5" />
                  <input type="text" value={ticker} onChange={e => setTicker(e.target.value)}
                    placeholder="Stock ticker (NVDA, TSLA)..."
                    className="w-full glass-panel py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]/50 transition-all" />
                </div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="glass-panel py-3 px-4 text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]/50" style={{ colorScheme: 'dark' }} />
                <div className="relative flex items-center">
                  <DollarSign className="absolute left-3 text-[#00ff88] w-4 h-4" />
                  <input type="number" value={capital} onChange={e => setCapital(e.target.value)}
                    placeholder="可投资金额"
                    className="w-full sm:w-40 glass-panel py-3 pl-9 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00ff88]/50" />
                </div>
                <button type="submit" disabled={loading || !ticker}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#00f0ff]/20 to-[#b026ff]/20 hover:from-[#00f0ff]/30 hover:to-[#b026ff]/30 border border-white/10 text-white font-medium text-sm transition-all disabled:opacity-50 whitespace-nowrap">
                  🔍 Analyze
                </button>
              </div>
            </form>

            {/* Results */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-32">
                  <div className="relative w-28 h-28 mb-8">
                    <div className="absolute inset-0 border-t-2 border-[#00f0ff] rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-r-2 border-[#b026ff] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                    <div className="absolute inset-4 border-b-2 border-[#00ff88] rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center"><Activity className="text-white w-8 h-8 animate-pulse" /></div>
                  </div>
                  <h2 className="text-xl font-medium text-white mb-2">Multi-Agent Analysis in Progress</h2>
                  <p className="text-gray-400 max-w-lg text-center mb-6">AI team is analyzing. ~3-5 minutes.</p>
                  <div className="flex flex-wrap justify-center gap-3 text-xs">
                    {['📰 News', '💬 Sentiment', '📈 Technical', '📊 Fundamentals', '🐂vs🐻 Debate', '🛡️ Risk', '✅ Decision'].map((s, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full glass-panel text-gray-400 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>{s}</span>
                    ))}
                  </div>
                </motion.div>
              ) : error ? (
                <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 text-center">
                  <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl text-white mb-2">Analysis Failed</h3>
                  <p className="text-gray-400">{error}</p>
                </motion.div>
              ) : result ? (
                <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {/* Decision Banner */}
                  {(() => { const s = getActionStyle(result.action); return (
                    <div className="glass-panel p-1 rounded-2xl bg-gradient-to-r from-[rgba(0,240,255,0.15)] to-[rgba(176,38,255,0.15)]">
                      <div className="bg-[#0b0e14]/90 backdrop-blur-xl rounded-xl p-6 md:p-8 flex items-center gap-6">
                        <div className={`px-8 py-4 rounded-xl border-2 ${s.border} ${s.bg} font-bold text-3xl ${s.color}`}>{result.action || "HOLD"}</div>
                        <div><h2 className="text-3xl font-bold text-white">{ticker.toUpperCase()}</h2><p className="text-gray-400 text-sm mt-1">Analysis Date: {date}</p></div>
                      </div>
                    </div>
                  )})()}

                  {/* Beginner Guide */}
                  {result.beginner_guide && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative overflow-hidden rounded-2xl">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#00ff88]/10 via-transparent to-[#b026ff]/10"></div>
                      <div className="relative glass-panel p-6 md:p-8 border-[#00ff88]/20">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ff88] to-[#00f0ff] flex items-center justify-center shadow-lg shadow-[#00ff88]/20">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div><h3 className="text-lg font-bold text-white">新手操作指南</h3><p className="text-xs text-gray-400">基于 AI 分析团队报告，为您定制的具体操作方案</p></div>
                        </div>
                        {renderReport(result.beginner_guide)}
                      </div>
                    </motion.div>
                  )}

                  {/* Analyst Reports */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { icon: Newspaper, color: '#00f0ff', label: 'NEWS ANALYST', data: result.news_report },
                      { icon: PieChart, color: '#b026ff', label: 'SENTIMENT ANALYST', data: result.sentiment_report },
                      { icon: TrendingUp, color: '#00ff88', label: 'TECHNICAL ANALYST', data: result.market_report },
                      { icon: BarChart3, color: '#eab308', label: 'FUNDAMENTALS ANALYST', data: result.fundamentals_report },
                    ].map((panel, i) => (
                      <motion.div key={panel.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }} className="glass-panel p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${panel.color}15` }}>
                            <panel.icon className="w-4 h-4" style={{ color: panel.color }} />
                          </div>
                          <h3 className="text-sm font-semibold tracking-wider text-gray-300">{panel.label}</h3>
                        </div>
                        {renderReport(panel.data)}
                      </motion.div>
                    ))}
                  </div>

                  {/* PM Decision */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-panel p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><FileText className="w-4 h-4 text-white" /></div>
                      <h3 className="text-sm font-semibold tracking-wider text-gray-300">PORTFOLIO MANAGER DECISION</h3>
                    </div>
                    {renderReport(result.final_trade_decision)}
                  </motion.div>

                  <p className="text-center text-xs text-gray-600 mt-8 pb-8">⚠️ Not financial advice. Execute trades manually in Robinhood.</p>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-32">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00f0ff]/10 to-[#b026ff]/10 border border-white/5 flex items-center justify-center mb-6">
                    <Cpu className="w-10 h-10 text-gray-600" />
                  </div>
                  <p className="text-gray-500 text-lg mb-2">Enter a stock ticker to start analysis</p>
                  <p className="text-gray-600 text-xs mt-2">💡 填写"可投资金额"后，AI 会生成新手操作指南</p>
                  <p className="text-gray-600 text-xs mt-1">🔍 试试 Market Scanner 自动发现交易机会</p>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>
    </div>
  )
}

export default App
