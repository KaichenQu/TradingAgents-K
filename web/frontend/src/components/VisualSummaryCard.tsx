import { Download, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export interface VisualData {
  stance: string
  stance_color: 'success' | 'danger' | 'warning' | string
  headline: string
  summary: string
  key_concerns: string[]
  key_strengths: string[]
  highlights: { label: string; value: string; color: 'success' | 'danger' | 'warning' | 'neutral' | string }[]
  recommendation: string
}

const COLOR_MAP = {
  success: { fg: 'var(--success)', bg: 'var(--success-muted)', border: 'var(--success-border)' },
  danger:  { fg: 'var(--danger)',  bg: 'var(--danger-muted)',  border: 'var(--danger-border)'  },
  warning: { fg: 'var(--warning)', bg: 'var(--warning-muted)', border: 'var(--warning-border)' },
  neutral: { fg: 'var(--text-muted)', bg: 'var(--bg-subtle)', border: 'var(--border)' },
}

function resolveColor(key: string) {
  return COLOR_MAP[key as keyof typeof COLOR_MAP] ?? COLOR_MAP.neutral
}

interface Props {
  data: VisualData
  ticker: string
  sectionTitle: string
}

export default function VisualSummaryCard({ data, ticker, sectionTitle }: Props) {
  const [copied, setCopied] = useState(false)
  const sc = resolveColor(data.stance_color)

  function downloadJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${ticker}_${sectionTitle.replace(/\s+/g, '_')}_summary.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copyText() {
    const text = [
      `[${data.stance}] ${data.headline}`,
      '',
      data.summary,
      '',
      'Key Concerns:',
      ...data.key_concerns.map(c => `  • ${c}`),
      '',
      'Key Strengths:',
      ...data.key_strengths.map(s => `  • ${s}`),
      '',
      `Recommendation: ${data.recommendation}`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: '4px 0',
    }}>

      {/* Stance hero */}
      <div style={{
        borderRadius: 10,
        border: `1px solid ${sc.border}`,
        background: sc.bg,
        padding: '16px 18px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 8,
        }}>
          <span style={{
            fontSize: 22,
            fontWeight: 800,
            color: sc.fg,
            letterSpacing: '0.06em',
          }}>
            {data.stance}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={copyText}
              title="Copy as text"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: 'var(--text-muted)',
                background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {copied ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={downloadJson}
              title="Save JSON"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: 'var(--text-muted)',
                background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Download size={11} />
              Save
            </button>
          </div>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.45 }}>
          {data.headline}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {data.summary}
        </div>
      </div>

      {/* Highlights grid */}
      {data.highlights && data.highlights.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: 8,
        }}>
          {data.highlights.map((h, i) => {
            const hc = resolveColor(h.color)
            return (
              <div key={i} style={{
                background: hc.bg,
                border: `1px solid ${hc.border}`,
                borderRadius: 8,
                padding: '8px 10px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: hc.fg, marginBottom: 3 }}>
                  {h.value}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {h.label}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Concerns & Strengths */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {data.key_concerns && data.key_concerns.length > 0 && (
          <div style={{
            background: 'var(--danger-muted)',
            border: '1px solid var(--danger-border)',
            borderRadius: 8,
            padding: '12px 14px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Key Risks
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {data.key_concerns.map((c, i) => (
                <li key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2, fontSize: 12 }}>▾</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.key_strengths && data.key_strengths.length > 0 && (
          <div style={{
            background: 'var(--success-muted)',
            border: '1px solid var(--success-border)',
            borderRadius: 8,
            padding: '12px 14px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Strengths
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {data.key_strengths.map((s, i) => (
                <li key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2, fontSize: 12 }}>▴</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendation */}
      {data.recommendation && (
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0, paddingTop: 2 }}>
            Action
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {data.recommendation}
          </span>
        </div>
      )}
    </div>
  )
}
