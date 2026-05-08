import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Activity, Newspaper, TrendingUp, PieChart, ShieldAlert, Cpu, BarChart3, FileText, DollarSign, Sparkles, Radar, ArrowUpRight, ArrowDownRight, X, CheckCircle2, Clock, CheckSquare, Square } from 'lucide-react'
import axios from 'axios'

function ScannerPanel({ onBatchAnalyze }) {
  const [scanning, setScanning] = useState(false)
  const [candidates, setCandidates] = useState(null)
  const [scanError, setScanError] = useState(null)
  const [selectedTickers, setSelectedTickers] = useState([])

  const handleScan = async () => {
    setScanning(true)
    setScanError(null)
    setSelectedTickers([])
    try {
      const res = await axios.get('http://localhost:8000/api/scan', { timeout: 120000 })
      setCandidates(res.data.candidates)
    } catch (err) {
      setScanError(err.response?.data?.detail || "扫描失败，请检查后端服务。")
    } finally {
      setScanning(false)
    }
  }

  const toggleSelect = (ticker) => {
    setSelectedTickers(prev => 
      prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]
    )
  }

  const handleBatch = () => {
    if (selectedTickers.length > 0) {
      onBatchAnalyze(selectedTickers)
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
        <div className="flex gap-3">
          {candidates && selectedTickers.length > 0 && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              onClick={handleBatch}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#b026ff]/80 to-[#00f0ff]/80 hover:from-[#b026ff] hover:to-[#00f0ff] text-white font-medium transition-all shadow-lg"
            >
              🚀 批量分析 ({selectedTickers.length})
            </motion.button>
          )}
          <button onClick={handleScan} disabled={scanning}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00ff88]/20 to-[#00f0ff]/20 hover:from-[#00ff88]/30 hover:to-[#00f0ff]/30 border border-[#00ff88]/20 text-white font-medium transition-all disabled:opacity-50">
            {scanning ? '⏳ 扫描中...' : '🔍 一键扫描'}
          </button>
        </div>
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
          <div className="flex justify-between items-center px-2">
            <p className="text-sm text-gray-500">找到 {candidates.length} 只候选股票，勾选以进行深度分析：</p>
            <button 
              onClick={() => setSelectedTickers(candidates.length === selectedTickers.length ? [] : candidates.map(c => c.ticker))}
              className="text-xs text-[#00f0ff] hover:text-white transition-colors"
            >
              {candidates.length === selectedTickers.length ? '取消全选' : '全选'}
            </button>
          </div>
          {candidates.map((c, i) => {
            const isSelected = selectedTickers.includes(c.ticker)
            return (
              <motion.div key={c.ticker} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={`glass-panel p-4 hover:bg-white/10 transition-colors cursor-pointer group ${isSelected ? 'border-[#00f0ff]/50 bg-[#00f0ff]/5' : ''}`}
                onClick={() => toggleSelect(c.ticker)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-gray-400">
                      {isSelected ? <CheckSquare className="w-6 h-6 text-[#00f0ff]" /> : <Square className="w-6 h-6" />}
                    </div>
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
                  </div>
                </div>
              </motion.div>
            )
          })}
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

function ReportModal({ result, ticker, date, onClose }) {
  if (!result) return null;

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
      <div className="space-y-2 text-sm text-gray-300 leading-relaxed">
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

  const s = getActionStyle(result.action)

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-[#0b0e14] border border-white/10 rounded-2xl shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-10">
          <X className="w-6 h-6" />
        </button>

        <div className="p-6 md:p-10 space-y-8">
          <div className={`p-1 rounded-2xl bg-gradient-to-r from-[rgba(0,240,255,0.15)] to-[rgba(176,38,255,0.15)]`}>
            <div className="bg-[#0b0e14] rounded-xl p-6 md:p-8 flex items-center gap-6">
              <div className={`px-8 py-4 rounded-xl border-2 ${s.border} ${s.bg} font-bold text-3xl ${s.color}`}>{result.action || "HOLD"}</div>
              <div><h2 className="text-4xl font-bold text-white">{ticker.toUpperCase()}</h2><p className="text-gray-400 text-sm mt-1">Analysis Date: {date}</p></div>
            </div>
          </div>

          {result.beginner_guide && (
            <div className="relative overflow-hidden rounded-2xl border border-[#00ff88]/20 bg-[#00ff88]/5 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ff88] to-[#00f0ff] flex items-center justify-center shadow-lg shadow-[#00ff88]/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div><h3 className="text-lg font-bold text-white">新手操作指南</h3><p className="text-xs text-[#00ff88]/70">基于 AI 分析团队报告的具体操作方案</p></div>
              </div>
              {renderReport(result.beginner_guide)}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: Newspaper, color: '#00f0ff', label: 'NEWS ANALYST', data: result.news_report },
              { icon: PieChart, color: '#b026ff', label: 'SENTIMENT ANALYST', data: result.sentiment_report },
              { icon: TrendingUp, color: '#00ff88', label: 'TECHNICAL ANALYST', data: result.market_report },
              { icon: BarChart3, color: '#eab308', label: 'FUNDAMENTALS ANALYST', data: result.fundamentals_report },
            ].map((panel, i) => (
              <div key={panel.label} className="border border-white/5 bg-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${panel.color}15` }}>
                    <panel.icon className="w-4 h-4" style={{ color: panel.color }} />
                  </div>
                  <h3 className="text-sm font-semibold tracking-wider text-gray-300">{panel.label}</h3>
                </div>
                {renderReport(panel.data)}
              </div>
            ))}
          </div>

          <div className="border border-white/5 bg-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><FileText className="w-4 h-4 text-white" /></div>
              <h3 className="text-sm font-semibold tracking-wider text-gray-300">PORTFOLIO MANAGER DECISION</h3>
            </div>
            {renderReport(result.final_trade_decision)}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function App() {
  const [tab, setTab] = useState('analyze') // 'analyze' | 'scanner'
  const [tickerInput, setTickerInput] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [capital, setCapital] = useState('')
  
  // Batch Tasks State
  const [tasks, setTasks] = useState([]) // Array of task objects
  const [polling, setPolling] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null) // For the Blowup Modal

  // Trigger batch analysis
  const handleBatchAnalyze = async (tickersList) => {
    setTab('analyze')
    // Clear previous task list for the same tickers or just start fresh
    setTasks(tickersList.map(t => ({ ticker: t, status: 'pending', id: null, result: null })))
    setPolling(true)
    
    try {
      const payload = { tickers: tickersList, date }
      if (capital && parseFloat(capital) > 0) payload.capital = parseFloat(capital)
      
      const res = await axios.post('http://localhost:8000/api/analyze/batch', payload)
      // Update tasks with their real IDs
      const taskIds = res.data.task_ids
      setTasks(tickersList.map((t, idx) => ({ 
        ticker: t, 
        id: taskIds[idx], 
        status: 'pending', 
        result: null 
      })))
    } catch (err) {
      console.error(err)
      alert("批量任务提交失败")
      setPolling(false)
    }
  }

  const onSubmitSearch = (e) => {
    e.preventDefault()
    if (!tickerInput) return
    // Allow comma separated tickers
    const tickersList = tickerInput.split(',').map(t => t.trim().toUpperCase()).filter(t => t)
    handleBatchAnalyze(tickersList)
  }

  // Polling logic
  useEffect(() => {
    let interval;
    if (polling) {
      interval = setInterval(async () => {
        let allDone = true;
        
        // Use functional state update to avoid stale closures
        setTasks(prevTasks => {
          const updatedTasks = [...prevTasks];
          
          // We must iterate over a copy of tasks to fetch statuses, but set state is tricky with async map inside.
          // Better approach: fetch all pending/running statuses, then update state.
          return updatedTasks;
        });

        // Fetch updates
        const promises = tasks.filter(t => t.id && (t.status === 'pending' || t.status === 'running')).map(async (t) => {
          try {
            const res = await axios.get(`http://localhost:8000/api/analyze/status/${t.id}`)
            return res.data
          } catch (e) { return null }
        })

        const updates = await Promise.all(promises)
        
        setTasks(prevTasks => {
          let updated = [...prevTasks]
          updates.forEach(u => {
            if (u) {
              const idx = updated.findIndex(x => x.id === u.id)
              if (idx !== -1) {
                updated[idx] = { ...updated[idx], status: u.status, result: u.result, error: u.error }
              }
            }
          })
          
          if (updated.some(t => t.status === 'pending' || t.status === 'running')) {
            allDone = false;
          }
          return updated;
        })

        if (allDone && tasks.length > 0 && tasks.every(t => t.id)) {
          setPolling(false)
        }

      }, 3000)
    }
    return () => clearInterval(interval)
  }, [polling, tasks])


  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
      case 'running': return <Activity className="w-5 h-5 text-[#00f0ff] animate-pulse" />
      case 'failed': return <ShieldAlert className="w-5 h-5 text-red-500" />
      default: return <Clock className="w-5 h-5 text-gray-500" />
    }
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
          <ScannerPanel onBatchAnalyze={handleBatchAnalyze} />
        ) : (
          <>
            {/* Search Bar */}
            <form onSubmit={onSubmitSearch} className="mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex items-center flex-1">
                  <Search className="absolute left-4 text-gray-400 w-5 h-5" />
                  <input type="text" value={tickerInput} onChange={e => setTickerInput(e.target.value)}
                    placeholder="Stock tickers (e.g. NVDA, TSLA, AAPL)..."
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
                <button type="submit" disabled={!tickerInput}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#00f0ff]/20 to-[#b026ff]/20 hover:from-[#00f0ff]/30 hover:to-[#b026ff]/30 border border-white/10 text-white font-medium text-sm transition-all disabled:opacity-50 whitespace-nowrap">
                  🔍 Analyze
                </button>
              </div>
            </form>

            {/* Batch Analysis Dashboard */}
            <AnimatePresence mode="wait">
              {tasks.length > 0 ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-[#00f0ff]" /> 
                      Batch Analysis Progress
                    </h2>
                    {polling && (
                      <span className="text-sm text-[#00f0ff] animate-pulse flex items-center gap-2">
                        <Activity className="w-4 h-4" /> 正在分析中，排队执行防超载...
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {tasks.map((task, idx) => (
                      <motion.div 
                        key={idx}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`glass-panel p-5 relative overflow-hidden transition-all ${
                          task.status === 'completed' ? 'hover:bg-white/10 cursor-pointer border-[#00ff88]/30' : 
                          task.status === 'running' ? 'border-[#00f0ff]/30' : ''
                        }`}
                        onClick={() => {
                          if (task.status === 'completed') setSelectedTask(task)
                        }}
                      >
                        {task.status === 'running' && (
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00f0ff]/0 via-[#00f0ff] to-[#00f0ff]/0 animate-[slideRight_2s_ease-in-out_infinite]" />
                        )}
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-bold text-white">{task.ticker}</span>
                          {getStatusIcon(task.status)}
                        </div>
                        
                        {task.status === 'completed' && task.result && (
                          <div className="space-y-3">
                            <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-white">
                              建议: <span className={
                                task.result.action.toLowerCase().includes('buy') ? 'text-[#00ff88]' : 
                                task.result.action.toLowerCase().includes('sell') ? 'text-[#ff3366]' : 'text-[#00f0ff]'
                              }>{task.result.action}</span>
                            </div>
                            <p className="text-sm text-[#00f0ff] mt-2 flex items-center gap-1 group-hover:underline">
                              <Sparkles className="w-3 h-3" /> 点击查看完整研报与操作指南
                            </p>
                          </div>
                        )}
                        
                        {task.status === 'running' && (
                          <p className="text-sm text-gray-400">AI 分析团队正在进行多维度研讨...</p>
                        )}
                        
                        {task.status === 'pending' && (
                          <p className="text-sm text-gray-500">正在排队等待分析资源...</p>
                        )}

                        {task.status === 'failed' && (
                          <p className="text-sm text-red-400 line-clamp-2">{task.error}</p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-32">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00f0ff]/10 to-[#b026ff]/10 border border-white/5 flex items-center justify-center mb-6">
                    <Cpu className="w-10 h-10 text-gray-600" />
                  </div>
                  <p className="text-gray-500 text-lg mb-2">输入股票代码或在 Scanner 中勾选后开始分析</p>
                  <p className="text-gray-600 text-xs mt-2">💡 支持用逗号分隔多个代码，如：NVDA, TSLA, AAPL</p>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Blow-up Modal for completed task */}
      <AnimatePresence>
        {selectedTask && selectedTask.status === 'completed' && (
          <ReportModal 
            result={selectedTask.result} 
            ticker={selectedTask.ticker} 
            date={date} 
            onClose={() => setSelectedTask(null)} 
          />
        )}
      </AnimatePresence>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  )
}

export default App
