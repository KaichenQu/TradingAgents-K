import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  TrendingUp, MessageSquare, Newspaper, BarChart2,
  Users, DollarSign, Shield, Loader2,
} from 'lucide-react'
import { AgentStatus } from '../types'

type IconComponent = typeof TrendingUp

interface SectionDef {
  key: string
  title: string
  subtitle: string
  agents: string[]
  Icon: IconComponent
}

const SECTIONS: SectionDef[] = [
  { key: 'market_report',          title: 'Market Analysis',  subtitle: 'Market Analyst',       agents: ['Market Analyst'],                                                                           Icon: TrendingUp   },
  { key: 'sentiment_report',       title: 'Social Sentiment', subtitle: 'Social Analyst',        agents: ['Social Analyst'],                                                                           Icon: MessageSquare },
  { key: 'news_report',            title: 'News Analysis',    subtitle: 'News Analyst',          agents: ['News Analyst'],                                                                             Icon: Newspaper    },
  { key: 'fundamentals_report',    title: 'Fundamentals',     subtitle: 'Fundamentals Analyst',  agents: ['Fundamentals Analyst'],                                                                     Icon: BarChart2    },
  { key: 'investment_plan',        title: 'Research Debate',  subtitle: 'Research Team',         agents: ['Bull Researcher', 'Bear Researcher', 'Research Manager'],                                  Icon: Users        },
  { key: 'trader_investment_plan', title: 'Trader Proposal',  subtitle: 'Trader',                agents: ['Trader'],                                                                                   Icon: DollarSign   },
  { key: 'final_trade_decision',   title: 'Risk & Decision',  subtitle: 'Portfolio Management',  agents: ['Aggressive Analyst', 'Conservative Analyst', 'Neutral Analyst', 'Portfolio Manager'],     Icon: Shield       },
]

interface Props {
  reportSections: Record<string, string>
  agentStatuses: Record<string, AgentStatus>
  jobStatus: string
  /** Ref to the outer scrollable container — used for smart auto-scroll */
  scrollContainerRef: React.RefObject<HTMLDivElement>
}

export default function StreamCards({ reportSections, agentStatuses, jobStatus, scrollContainerRef }: Props) {
  const bottomRef    = useRef<HTMLDivElement>(null)
  const sectionCount = Object.keys(reportSections).length

  // Only auto-scroll when a new section card appears AND user is already near the bottom
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !bottomRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const distFromBottom = scrollHeight - scrollTop - clientHeight
    if (distFromBottom < 280) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [sectionCount])

  const visible = SECTIONS.filter(sec => {
    const hasContent = !!reportSections[sec.key]
    const isActive   = sec.agents.some(a => agentStatuses[a]?.status === 'in_progress')
    return hasContent || isActive
  })

  if (visible.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
        {jobStatus === 'queued' ? 'Queued…' : jobStatus === 'running' ? 'Starting analysis…' : 'No analysis yet.'}
      </div>
    )
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {visible.map((sec, i) => {
        const content  = reportSections[sec.key] || ''
        const isActive = sec.agents.some(a => agentStatuses[a]?.status === 'in_progress')
        const { Icon } = sec

        return (
          <div
            key={sec.key}
            className={`card-enter ${isActive ? 'card-active' : ''}`}
            style={{
              background: 'var(--card)',
              borderRadius: 12,
              border: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--border)'}`,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
              transition: 'border-color 0.3s',
              animationDelay: `${i * 0.04}s`,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 16px',
              borderBottom: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
              background: isActive ? 'var(--accent-muted)' : 'var(--bg-subtle)',
            }}>
              <Icon size={14} color={isActive ? 'var(--accent)' : content ? 'var(--success)' : 'var(--text-muted)'} strokeWidth={2} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{sec.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{sec.subtitle}</div>
              </div>
              {isActive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Loader2 size={12} color="var(--accent)" className="animate-spin" />
                  <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>Analyzing</span>
                </div>
              )}
              {!isActive && content && (
                <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 500 }}>✓ Done</span>
              )}
            </div>

            <div style={{ padding: '14px 18px', maxHeight: 480, overflowY: 'auto' }}>
              {content ? (
                <div className="prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={13} color="var(--accent)" className="animate-spin" />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Processing…</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
