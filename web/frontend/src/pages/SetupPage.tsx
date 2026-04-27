import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sun, Moon, ChevronDown, ChevronUp, X } from 'lucide-react'
import { createJob, fetchProviders, fetchModels, fetchRecentJobs, RecentJob } from '../api/client'
import { useJobStore } from '../store/jobStore'
import { useTheme } from '../hooks/useTheme'
import { Provider, ModelOption } from '../types'
import { t } from '../i18n'
import { parseTickers, hasInvalidTickers, TickerInfo } from '../utils/ticker'

const today = new Date().toISOString().split('T')[0]

const ANALYSTS = [
  { key: 'market',       label: 'Market' },
  { key: 'social',       label: 'Social' },
  { key: 'news',         label: 'News' },
  { key: 'fundamentals', label: 'Fundamentals' },
]

const LANGUAGES = [
  { value: 'English',            label: 'English'  },
  { value: 'Chinese',            label: '中文'      },
  { value: 'Japanese',           label: '日本語'    },
  { value: 'Korean',             label: '한국어'    },
]

const MARKET_COLORS: Record<string, { bg: string; color: string }> = {
  US: { bg: 'rgba(2,132,199,0.10)',  color: '#0284c7' },
  A:  { bg: 'rgba(220,38,38,0.09)',  color: '#dc2626' },
  HK: { bg: 'rgba(124,58,237,0.10)', color: '#7c3aed' },
}

export default function SetupPage() {
  const navigate  = useNavigate()
  const initJob   = useJobStore((s) => s.initJob)
  const { dark, toggle } = useTheme()

  const [rawInput,   setRawInput]   = useState('')
  const [date,       setDate]       = useState(today)
  const [depth,      setDepth]      = useState<1 | 5>(1)
  const [analysts,   setAnalysts]   = useState(['market', 'social', 'news', 'fundamentals'])
  const [language,   setLanguage]   = useState('English')
  const [showAdv,    setShowAdv]    = useState(false)
  const [apiKey,     setApiKey]     = useState('')
  const [provider,   setProvider]   = useState<string>('')
  const [model,      setModel]      = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  const { data: recentJobs = [] } = useQuery<RecentJob[]>({
    queryKey: ['recent-jobs'],
    queryFn: fetchRecentJobs,
  })

  const { data: providers = [] } = useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: fetchProviders,
    enabled: showAdv,
  })

  const { data: models = [] } = useQuery<ModelOption[]>({
    queryKey: ['models', provider],
    queryFn: () => fetchModels(provider, 'deep'),
    enabled: !!provider,
  })

  const parsedTickers: TickerInfo[] = rawInput.trim() ? parseTickers(rawInput) : []
  const invalidSym = rawInput.trim() ? hasInvalidTickers(rawInput) : null

  function handleApiKey(v: string) {
    setApiKey(v)
    if (!v) { setProvider(''); setModel('') }
  }

  function toggleAnalyst(key: string) {
    setAnalysts(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(a => a !== key) : prev
        : [...prev, key]
    )
  }

  const canSubmit = parsedTickers.length > 0 && !invalidSym && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const providerObj = providers.find(p => p.key === provider)
      const jobPayload = {
        analysis_date:  date,
        research_depth: depth,
        analysts,
        output_language: language,
        api_key:        apiKey,
        llm_provider:   provider || null,
        backend_url:    providerObj?.base_url ?? null,
        quick_think_llm: model || null,
        deep_think_llm:  model || null,
      }

      if (parsedTickers.length === 1) {
        const sym = parsedTickers[0].symbol
        const { job_id } = await createJob({ ...jobPayload, ticker: sym })
        initJob(job_id, sym, date, depth)
        navigate(`/job/${job_id}`)
      } else {
        const results = await Promise.all(
          parsedTickers.map(({ symbol }) =>
            createJob({ ...jobPayload, ticker: symbol })
              .then(res => ({ ...res, ticker: symbol }))
          )
        )
        for (const r of results) {
          initJob(r.job_id, r.ticker, date, depth)
        }
        navigate(`/batch?ids=${results.map(r => r.job_id).join(',')}`)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setSubmitting(false)
    }
  }

  const s = styles(dark)

  return (
    <div style={s.page}>
      <button onClick={toggle} style={s.themeBtn} title="Toggle theme">
        {dark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <div style={s.layout} className="setup-layout">
        {/* ── Setup card ─────────────────────────────── */}
        <div style={s.card} className="setup-card">
          {/* Hero */}
          <div style={s.heroRow}>
            <div style={s.logoMark} />
            <div>
              <h1 style={s.title}>{t.app.name}</h1>
              <p style={s.subtitle}>{t.app.tagline}</p>
            </div>
          </div>

          {/* Ticker input */}
          <div style={{ marginBottom: 22 }}>
            <Label>{t.setup.tickerLabel}</Label>
            <div style={s.tickerWrap}>
              <input
                type="text"
                value={rawInput}
                onChange={e => { setRawInput(e.target.value.toUpperCase()); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder={t.setup.tickerPlaceholder}
                autoFocus
                style={s.tickerInput}
              />
              {rawInput && (
                <button onClick={() => setRawInput('')} style={s.clearBtn}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Ticker chips */}
            {parsedTickers.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {parsedTickers.map(({ symbol, market }) => {
                  const mc = MARKET_COLORS[market]
                  return (
                    <span key={symbol} style={{ ...s.chip, background: mc.bg, color: mc.color, borderColor: mc.color + '33' }}>
                      {symbol}
                      <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.7, marginLeft: 4 }}>{market}</span>
                    </span>
                  )
                })}
              </div>
            )}
            {invalidSym && (
              <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>
                {t.setup.invalidTicker(invalidSym)}
              </p>
            )}
          </div>

          {/* Date */}
          <div style={{ marginBottom: 22 }}>
            <Label>{t.setup.dateLabel}</Label>
            <input
              type="date"
              value={date}
              max={today}
              onChange={e => setDate(e.target.value)}
              style={{ ...s.input, width: '100%', cursor: 'pointer', colorScheme: dark ? 'dark' : 'light' }}
            />
          </div>

          {/* Depth */}
          <div style={{ marginBottom: 22 }}>
            <Label>{t.setup.modeLabel}</Label>
            <div style={s.segmented}>
              {([1, 5] as const).map(val => (
                <button
                  key={val}
                  onClick={() => setDepth(val)}
                  style={{ ...s.segBtn, ...(depth === val ? s.segBtnActive(dark) : {}) }}
                >
                  <span style={{ fontWeight: 600 }}>{val === 1 ? t.setup.modeQuick : t.setup.modeDeep}</span>
                  <span style={{ fontSize: 10.5, opacity: 0.6, marginLeft: 3 }}>
                    {val === 1 ? t.setup.modeQuickHint : t.setup.modeDeepHint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Analysts */}
          <div style={{ marginBottom: 22 }}>
            <Label>{t.setup.analystsLabel}</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {ANALYSTS.map(a => {
                const active = analysts.includes(a.key)
                return (
                  <button
                    key={a.key}
                    onClick={() => toggleAnalyst(a.key)}
                    style={active ? s.pillActive : s.pill}
                  >
                    {a.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Report Language */}
          <div style={{ marginBottom: 22 }}>
            <Label>Report Language</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {LANGUAGES.map(lang => (
                <button
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
                  style={language === lang.value ? s.pillActive : s.pill}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced */}
          <div style={s.advBox}>
            <button onClick={() => setShowAdv(v => !v)} style={s.advToggle}>
              {showAdv ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <span>{t.setup.advancedToggle}</span>
              <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 4 }}>— {t.setup.advancedHint}</span>
            </button>

            {showAdv && (
              <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <Label>{t.setup.apiKeyLabel}</Label>
                  <input
                    type="password"
                    placeholder={t.setup.apiKeyPlaceholder}
                    value={apiKey}
                    onChange={e => handleApiKey(e.target.value)}
                    style={{ ...s.input, width: '100%' }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{t.setup.apiKeyHint}</p>
                </div>

                {apiKey && (
                  <>
                    <div>
                      <Label>{t.setup.providerLabel}</Label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {providers.map(p => (
                          <button key={p.key} onClick={() => { setProvider(p.key); setModel('') }}
                            style={provider === p.key ? s.pillActive : s.pill}>
                            {p.display}
                          </button>
                        ))}
                      </div>
                    </div>
                    {provider && (
                      <div>
                        <Label>{t.setup.modelLabel}</Label>
                        <select
                          value={model}
                          onChange={e => setModel(e.target.value)}
                          style={{ ...s.input, width: '100%', cursor: 'pointer' }}
                        >
                          <option value="">Select model…</option>
                          {models.map(m => <option key={m.value} value={m.value}>{m.display}</option>)}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: 12.5, marginBottom: 4 }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={canSubmit ? s.ctaActive(dark) : s.cta}
          >
            {submitting
              ? t.setup.analyzingBtn
              : parsedTickers.length > 1
                ? `Analyze ${parsedTickers.length} stocks`
                : t.setup.analyzeBtn}
          </button>
        </div>

        {/* ── Recent sidebar ──────────────────────────── */}
        {recentJobs.length > 0 && (
          <div style={s.recentPanel} className="setup-recent">
            <p style={s.recentLabel}>{t.setup.recentLabel}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {recentJobs.slice(0, 10).map(j => (
                <RecentJobRow key={j.job_id} j={j} onClick={() => navigate(`/job/${j.job_id}`)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RecentJobRow({ j, onClick }: { j: RecentJob; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="recent-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 9,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
        width: '100%',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-muted)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card)' }}
    >
      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', letterSpacing: '0.04em', minWidth: 54 }}>{j.ticker}</span>
      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', flex: 1 }}>{j.analysis_date}</span>
      {j.final_decision && (
        <DecisionBadge decision={j.final_decision} />
      )}
      {!j.final_decision && j.status !== 'completed' && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize', background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4 }}>{j.status}</span>
      )}
    </button>
  )
}

function DecisionBadge({ decision }: { decision: string }) {
  const map: Record<string, string> = { BUY: 'var(--success)', SELL: 'var(--danger)', HOLD: 'var(--warning)' }
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: map[decision] ?? 'var(--text-muted)' }}>
      {decision}
    </span>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 7 }}>
      {children}
    </div>
  )
}

function styles(dark: boolean) {
  const inputBase: React.CSSProperties = {
    padding: '10px 13px',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 9,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: 13,
    transition: 'border-color 0.15s',
    appearance: 'none',
  }

  return {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '40px 20px',
      position: 'relative',
    } as React.CSSProperties,

    themeBtn: {
      position: 'fixed',
      top: 18,
      right: 18,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 34,
      height: 34,
      borderRadius: 8,
      border: '1px solid var(--border)',
      background: 'var(--card)',
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      boxShadow: 'var(--shadow-sm)',
      zIndex: 50,
    } as React.CSSProperties,

    layout: {
      display: 'flex',
      gap: 20,
      alignItems: 'flex-start',
      width: '100%',
      maxWidth: 900,
    } as React.CSSProperties,

    card: {
      background: 'var(--card)',
      borderRadius: 18,
      padding: '40px 44px',
      flex: '0 0 480px',
      width: '100%',
      maxWidth: '100%',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-lg)',
    } as React.CSSProperties,

    heroRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      marginBottom: 36,
    } as React.CSSProperties,

    logoMark: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: 'var(--accent)',
      flexShrink: 0,
      boxShadow: '0 0 0 4px var(--accent-muted)',
    } as React.CSSProperties,

    title: {
      color: 'var(--text-primary)',
      fontSize: 22,
      fontWeight: 800,
      margin: '0 0 2px',
      letterSpacing: '-0.02em',
    } as React.CSSProperties,

    subtitle: {
      color: 'var(--text-muted)',
      fontSize: 13,
      margin: 0,
    } as React.CSSProperties,

    tickerWrap: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    } as React.CSSProperties,

    tickerInput: {
      ...inputBase,
      flex: 1,
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: '0.03em',
      padding: '13px 38px 13px 14px',
      borderRadius: 10,
    } as React.CSSProperties,

    clearBtn: {
      position: 'absolute',
      right: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 24,
      height: 24,
      borderRadius: 5,
      border: 'none',
      background: 'var(--bg-subtle)',
      color: 'var(--text-muted)',
      cursor: 'pointer',
    } as React.CSSProperties,

    chip: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 7,
      border: '1px solid transparent',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.04em',
    } as React.CSSProperties,

    input: inputBase,

    segmented: {
      display: 'flex',
      background: 'var(--bg)',
      borderRadius: 10,
      padding: 3,
      border: '1px solid var(--border)',
      gap: 3,
    } as React.CSSProperties,

    segBtn: {
      flex: 1,
      padding: '9px 6px',
      borderRadius: 7,
      border: 'none',
      background: 'transparent',
      color: 'var(--text-muted)',
      fontSize: 12.5,
      cursor: 'pointer',
      transition: 'all 0.15s',
      fontFamily: 'inherit',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    } as React.CSSProperties,

    segBtnActive: (d: boolean): React.CSSProperties => ({
      background: 'var(--accent)',
      color: d ? '#111927' : '#ffffff',
      fontWeight: 600,
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    }),

    pill: {
      padding: '6px 13px',
      borderRadius: 8,
      border: '1px solid var(--border)',
      background: 'transparent',
      color: 'var(--text-secondary)',
      fontSize: 12.5,
      cursor: 'pointer',
      transition: 'all 0.15s',
      fontFamily: 'inherit',
    } as React.CSSProperties,

    pillActive: {
      padding: '6px 13px',
      borderRadius: 8,
      border: '1px solid var(--accent-border)',
      background: 'var(--accent-muted)',
      color: 'var(--accent)',
      fontSize: 12.5,
      cursor: 'pointer',
      transition: 'all 0.15s',
      fontFamily: 'inherit',
      fontWeight: 600,
    } as React.CSSProperties,

    advBox: {
      marginBottom: 20,
      borderRadius: 10,
      border: '1px solid var(--border)',
      overflow: 'hidden',
    } as React.CSSProperties,

    advToggle: {
      width: '100%',
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      background: 'var(--bg-subtle)',
      border: 'none',
      color: 'var(--text-secondary)',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'inherit',
      textAlign: 'left' as const,
    } as React.CSSProperties,

    cta: {
      width: '100%',
      padding: '14px 0',
      borderRadius: 10,
      border: 'none',
      background: 'var(--bg-subtle)',
      color: 'var(--text-muted)',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'not-allowed',
      transition: 'all 0.2s',
      fontFamily: 'inherit',
    } as React.CSSProperties,

    ctaActive: (d: boolean): React.CSSProperties => ({
      width: '100%',
      padding: '14px 0',
      borderRadius: 10,
      border: 'none',
      background: 'var(--accent)',
      color: d ? '#111927' : '#ffffff',
      fontSize: 14,
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontFamily: 'inherit',
      letterSpacing: '0.01em',
      boxShadow: '0 2px 12px var(--accent-border)',
    }),

    recentPanel: {
      flex: 1,
      minWidth: 0,
    } as React.CSSProperties,

    recentLabel: {
      fontSize: 10.5,
      color: 'var(--text-muted)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      fontWeight: 700,
      marginBottom: 10,
      marginTop: 0,
    } as React.CSSProperties,
  }
}
