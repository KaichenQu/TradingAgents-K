import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2 } from 'lucide-react'
import { AgentStatus } from '../types'

const SECTIONS = [
  { key: 'market_report',          label: 'Market',      agents: ['Market Analyst'] },
  { key: 'sentiment_report',       label: 'Sentiment',   agents: ['Social Analyst'] },
  { key: 'news_report',            label: 'News',        agents: ['News Analyst'] },
  { key: 'fundamentals_report',    label: 'Fundamntls',  agents: ['Fundamentals Analyst'] },
  { key: 'investment_plan',        label: 'Research',    agents: ['Bull Researcher', 'Bear Researcher', 'Research Manager'] },
  { key: 'trader_investment_plan', label: 'Trader',      agents: ['Trader'] },
  { key: 'final_trade_decision',   label: 'Risk & Dec.', agents: ['Aggressive Analyst', 'Conservative Analyst', 'Neutral Analyst', 'Portfolio Manager'] },
] as const

type SectionKey = typeof SECTIONS[number]['key']

interface Props {
  jobId: string
  reportSections: Record<string, string>
  agentStatuses: Record<string, AgentStatus>
}

// ── Sentiment analysis ───────────────────────────────────────────
const BULL_RE = /\b(bull(?:ish)?|buy|long|upside|strong(?:er)?|growth|opportunit|positive|outperform|overweight|accumulat|upgrade|rally|surge|recover|favour(?:able)?|confident)\b/gi
const BEAR_RE = /\b(bear(?:ish)?|sell|short|downside|weak(?:er)?|declin|risk|negative|underperform|underweight|reduc|downgrade|caution|warn|concern|threat|deteriorat|vulnerable|headwind)\b/gi

type Sentiment = 'bull' | 'bear' | 'neutral'

function scoreSentiment(text: string): Sentiment {
  if (!text) return 'neutral'
  const bull = (text.match(BULL_RE) || []).length
  const bear = (text.match(BEAR_RE) || []).length
  const total = bull + bear
  if (total < 4) return 'neutral'
  const ratio = bull / total
  if (ratio >= 0.58) return 'bull'
  if (ratio <= 0.42) return 'bear'
  return 'neutral'
}

const SENTIMENT_COLOR: Record<Sentiment, { bar: string; glow: string; label: string }> = {
  bull:    { bar: 'var(--success)', glow: 'rgba(74,222,128,0.35)', label: 'Bullish'  },
  bear:    { bar: 'var(--danger)',  glow: 'rgba(248,113,113,0.35)', label: 'Bearish' },
  neutral: { bar: 'var(--warning)', glow: 'rgba(251,191,36,0.3)',  label: 'Neutral'  },
}

// ────────────────────────────────────────────────────────────────

export default function ReportAccordion({ reportSections, agentStatuses }: Props) {
  const available = SECTIONS.filter(
    s => !!reportSections[s.key] || s.agents.some(a => agentStatuses[a]?.status === 'in_progress')
  )
  const [activeKey, setActiveKey] = useState<SectionKey | null>(available[0]?.key ?? null)

  if (available.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderLeft: '1px solid var(--border)', background: 'var(--sidebar)',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No reports yet</span>
      </div>
    )
  }

  const activeSec = SECTIONS.find(s => s.key === activeKey)
  const content   = activeKey ? reportSections[activeKey] : null

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid var(--border)', background: 'var(--sidebar)', minHeight: 0,
    }}>
      {/* ── Horizontal tab navbar ── */}
      <div style={{
        display: 'flex', overflowX: 'auto',
        borderBottom: '1px solid var(--border)', background: 'var(--card)',
        flexShrink: 0, scrollbarWidth: 'none',
      }}>
        {SECTIONS.map(sec => {
          const hasContent = !!reportSections[sec.key]
          const isRunning  = sec.agents.some(a => agentStatuses[a]?.status === 'in_progress')
          if (!hasContent && !isRunning) return null

          const isSelected = activeKey === sec.key
          const sentiment  = hasContent ? scoreSentiment(reportSections[sec.key]) : 'neutral'
          const sc         = SENTIMENT_COLOR[sentiment]

          return (
            <button
              key={sec.key}
              onClick={() => setActiveKey(sec.key)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                padding: '9px 14px 0',
                border: 'none',
                background: isSelected ? 'var(--accent-muted)' : 'transparent',
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                transition: 'background 0.15s', position: 'relative',
              }}
            >
              {isRunning && (
                <Loader2 size={5} color="var(--accent)" className="animate-spin"
                  style={{ position: 'absolute', top: 5, right: 5 }} />
              )}

              <span style={{
                fontSize: 10, fontWeight: isSelected ? 700 : 500,
                color: isSelected ? 'var(--accent)' : hasContent ? 'var(--text-secondary)' : 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                marginBottom: 6,
              }}>
                {sec.label}
              </span>

              {/* Sentiment bar + active underline */}
              <div style={{ width: '100%', height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 0 }}>
                {hasContent ? (
                  <div style={{
                    height: '100%',
                    background: sc.bar,
                    boxShadow: isSelected ? `0 0 6px ${sc.glow}` : 'none',
                    opacity: isSelected ? 1 : 0.45,
                    transition: 'opacity 0.2s, box-shadow 0.2s',
                  }} />
                ) : (
                  /* Active-only accent underline while running */
                  isSelected
                    ? <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                    : null
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Content pane ── */}
      {activeSec && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* Sticky header with sentiment badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px 8px',
            borderBottom: '1px solid var(--border-subtle)',
            position: 'sticky', top: 0, background: 'var(--sidebar)', zIndex: 1,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1,
            }}>
              {activeSec.label}
            </span>

            {content && (() => {
              const s  = scoreSentiment(content)
              const sc = SENTIMENT_COLOR[s]
              return (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: sc.bar,
                  background: `${sc.glow}`,
                  border: `1px solid ${sc.bar}`,
                  borderRadius: 4, padding: '2px 8px',
                  letterSpacing: '0.06em',
                }}>
                  {sc.label}
                </span>
              )
            })()}

            {activeSec.agents.some(a => agentStatuses[a]?.status === 'in_progress') && (
              <Loader2 size={10} color="var(--accent)" className="animate-spin" />
            )}
          </div>

          {/* Body */}
          <div style={{ padding: '12px 16px' }}>
            {content ? (
              <div className="prose" style={{ fontSize: 12.5 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
                <Loader2 size={13} color="var(--accent)" className="animate-spin" />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Processing…</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
