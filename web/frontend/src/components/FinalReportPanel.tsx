import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download, Loader2, Sparkles } from 'lucide-react'
import { fetchReport, generateVisual } from '../api/client'
import { Stats } from '../types'
import VisualSummaryCard, { VisualData } from './VisualSummaryCard'


interface Props {
  jobId: string
  ticker: string
  analysisDate: string
  researchDepth: number
  finalDecision: string | null
  reportContent: string | null
  status: string
  stats: Stats
}

function fmt(secs: number) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const DECISION_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  BUY:         { color: 'var(--success)', bg: 'var(--success-muted)', border: 'var(--success-border)', label: 'Buy Signal'        },
  SELL:        { color: 'var(--danger)',  bg: 'var(--danger-muted)',  border: 'var(--danger-border)',  label: 'Sell Signal'       },
  HOLD:        { color: 'var(--warning)', bg: 'var(--warning-muted)', border: 'var(--warning-border)', label: 'Hold Position'     },
  UNDERWEIGHT: { color: 'var(--warning)', bg: 'var(--warning-muted)', border: 'var(--warning-border)', label: 'Underweight / Hold'},
  OVERWEIGHT:  { color: 'var(--success)', bg: 'var(--success-muted)', border: 'var(--success-border)', label: 'Overweight / Buy'  },
}

type VisualStatus = 'idle' | 'loading' | 'done' | 'error'

export default function FinalReportPanel({
  jobId, ticker, analysisDate, researchDepth,
  finalDecision, reportContent, status, stats,
}: Props) {
  const [downloading, setDownloading]   = useState(false)
  const [visualStatus, setVisualStatus] = useState<VisualStatus>('idle')
  const [visualData, setVisualData]     = useState<VisualData | null>(null)
  const [visualError, setVisualError]   = useState('')
  const [showVisual, setShowVisual]     = useState(false)

  const mode = researchDepth >= 5 ? 'Deep' : 'Quick'
  const key  = finalDecision?.toUpperCase() ?? ''
  const ds   = DECISION_STYLE[key] ?? null

  async function downloadReport() {
    setDownloading(true)
    try {
      const report = await fetchReport(jobId)
      const blob   = new Blob([report], { type: 'text/markdown' })
      const url    = URL.createObjectURL(blob)
      const a      = document.createElement('a')
      a.href = url; a.download = `${ticker}_${analysisDate}_report.md`; a.click()
      URL.revokeObjectURL(url)
    } finally { setDownloading(false) }
  }

  async function handleGenerateVisual() {
    setVisualStatus('loading')
    setShowVisual(true)
    try {
      const data = await generateVisual(jobId, 'final_trade_decision') as VisualData
      setVisualData(data)
      setVisualStatus('done')
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : 'Unknown error')
      setVisualStatus('error')
      setShowVisual(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg)', overflowY: 'auto',
      borderRight: '1px solid var(--border)',
    }}>
      {/* Meta row */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>{ticker}</span>
        <span style={{ color: 'var(--border)', fontSize: 14 }}>·</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{analysisDate}</span>
        <span style={{ color: 'var(--border)', fontSize: 14 }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--border)' }}>{mode}</span>
        {stats.elapsed_seconds > 0 && (
          <>
            <span style={{ color: 'var(--border)', fontSize: 14 }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(stats.elapsed_seconds)}</span>
          </>
        )}
      </div>

      {/* Decision hero */}
      {ds ? (
        <div style={{ padding: '20px 16px 16px', flexShrink: 0 }}>
          <div style={{
            borderRadius: 14, border: `1px solid ${ds.border}`, background: ds.bg,
            padding: '28px 16px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: ds.color, letterSpacing: '0.06em', lineHeight: 1, marginBottom: 8 }}>
              {finalDecision}
            </div>
            <div style={{ fontSize: 12, color: ds.color, opacity: 0.7, fontWeight: 500 }}>{ds.label}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <StatBox label="Agents"    value={`${stats.agents_done}/${stats.agents_total}`} />
            <StatBox label="LLM calls" value={String(stats.llm_calls || 0)} />
          </div>

          <button
            className="btn-ghost"
            onClick={downloadReport}
            disabled={downloading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 12, padding: '9px 0' }}
          >
            <Download size={13} />
            {downloading ? 'Saving…' : 'Download Full Report (.md)'}
          </button>
        </div>
      ) : (
        <div style={{ padding: '24px 16px', flexShrink: 0 }}>
          <div style={{ borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-subtle)', padding: '32px 16px', textAlign: 'center' }}>
            {status === 'running' ? (
              <>
                <Loader2 size={28} color="var(--accent)" className="animate-spin" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Analyzing…</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {stats.agents_done > 0 ? `${stats.agents_done} of ${stats.agents_total} agents done` : 'Preparing agents'}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Awaiting analysis</div>
            )}
          </div>
        </div>
      )}

      {/* Decision Rationale */}
      {reportContent && (
        <div style={{ padding: '0 16px 20px', flex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{
              flex: 1, fontSize: 10, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
            }}>
              Decision Rationale
            </span>

            {/* Segmented toggle once visual is ready */}
            {visualStatus === 'done' && (
              <div style={{
                display: 'flex',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 7,
                padding: 2,
                gap: 2,
              }}>
                {(['Visual', 'Raw'] as const).map(opt => {
                  const active = opt === 'Visual' ? showVisual : !showVisual
                  return (
                    <button
                      key={opt}
                      onClick={() => setShowVisual(opt === 'Visual')}
                      style={{
                        fontSize: 11, fontWeight: active ? 600 : 400,
                        color: active ? 'var(--accent)' : 'var(--text-muted)',
                        background: active ? 'var(--card)' : 'transparent',
                        border: active ? '1px solid var(--accent-border)' : '1px solid transparent',
                        borderRadius: 5,
                        padding: '3px 10px',
                        cursor: 'pointer', fontFamily: 'inherit',
                        boxShadow: active ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Generate button */}
            {visualStatus === 'idle' && (
              <button
                onClick={handleGenerateVisual}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--accent)', background: 'var(--accent-muted)',
                  border: '1px solid var(--accent-border)', borderRadius: 7,
                  padding: '4px 11px', cursor: 'pointer', fontFamily: 'inherit',
                  letterSpacing: '0.02em',
                }}
              >
                <Sparkles size={11} />
                AI Visual
              </button>
            )}
            {visualStatus === 'loading' && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, color: 'var(--accent)',
                background: 'var(--accent-muted)',
                border: '1px solid var(--accent-border)', borderRadius: 7,
                padding: '4px 11px',
              }}>
                <Loader2 size={11} className="animate-spin" />
                Generating…
              </span>
            )}
            {visualStatus === 'error' && (
              <button
                onClick={handleGenerateVisual}
                title={visualError}
                style={{
                  fontSize: 11, color: 'var(--danger)',
                  background: 'var(--danger-muted)',
                  border: '1px solid var(--danger-border)', borderRadius: 7,
                  padding: '4px 11px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ↺ Retry
              </button>
            )}
          </div>

          {/* Content */}
          {showVisual && visualStatus === 'done' && visualData ? (
            <VisualSummaryCard data={visualData} ticker={ticker} sectionTitle="Risk & Decision" />
          ) : showVisual && visualStatus === 'loading' ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 180, borderRadius: 10,
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <Loader2 size={22} color="var(--accent)" className="animate-spin" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Generating visual summary…</div>
              </div>
            </div>
          ) : (
            <div className="prose" style={{ fontSize: 12.5 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportContent}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--bg-subtle)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 10px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{label}</div>
    </div>
  )
}
