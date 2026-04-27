import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Sun, Moon, GitBranch, FileText, BarChart2 } from 'lucide-react'
import { useJob } from '../hooks/useJob'
import { useTheme } from '../hooks/useTheme'
import AgentPipeline from '../components/AgentPipeline'
import FinalReportPanel from '../components/FinalReportPanel'
import ReportAccordion from '../components/ReportAccordion'
import { t } from '../i18n'

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  queued:    { color: 'var(--warning)', bg: 'var(--warning-muted)' },
  running:   { color: 'var(--accent)',  bg: 'var(--accent-muted)'  },
  completed: { color: 'var(--success)', bg: 'var(--success-muted)' },
  error:     { color: 'var(--danger)',  bg: 'var(--danger-muted)'  },
}

function useWidth() {
  const [w, setW] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setW(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return w
}

const TABS = [
  { id: 'pipeline', label: 'Pipeline', Icon: GitBranch },
  { id: 'summary',  label: 'Summary',  Icon: BarChart2 },
  { id: 'reports',  label: 'Reports',  Icon: FileText  },
] as const

type TabId = typeof TABS[number]['id']

export default function DashboardPage() {
  const { jobId }        = useParams<{ jobId: string }>()
  const job              = useJob(jobId!)
  const { dark, toggle } = useTheme()
  const width            = useWidth()
  const [activeTab, setActiveTab] = useState<TabId>('summary')

  const isMobile = width < 768
  const isTablet = width >= 768 && width < 1100

  if (!job) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Connecting…</span>
      </div>
    )
  }

  const ss = STATUS_STYLE[job.status] ?? { color: 'var(--text-muted)', bg: 'var(--bg-subtle)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      {/* ── Header ─────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 16px',
        height: 48,
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
        boxShadow: 'var(--shadow-sm)',
        flexShrink: 0,
        minWidth: 0,
      }}>
        <Link to="/setup" style={{
          color: 'var(--text-muted)', fontSize: 12.5, textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
          padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
          background: 'var(--bg-subtle)',
        }}>
          ← {t.dashboard.newBtn}
        </Link>

        <div style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--accent)', flexShrink: 0 }} />

        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', letterSpacing: '0.04em', flexShrink: 0 }}>
          {job.ticker}
        </span>
        {!isMobile && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{job.analysisDate}</span>
        )}

        <span style={{
          padding: '2px 8px', borderRadius: 5,
          background: ss.bg, color: ss.color,
          fontSize: 10.5, fontWeight: 700, textTransform: 'capitalize', flexShrink: 0,
        }}>
          {job.status}
        </span>

        {job.errorMessage && !isMobile && (
          <span style={{ color: 'var(--danger)', fontSize: 11.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.errorMessage}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {job.stats.agents_done > 0 && !isMobile && (
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {t.dashboard.agentsOf(job.stats.agents_done, job.stats.agents_total)}
            </span>
          )}
          <button
            onClick={toggle}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 7,
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      {/* ── Desktop: pipeline + two equal center columns ── */}
      {!isMobile && !isTablet && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '200px 1fr 1fr', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--sidebar)' }}>
            <AgentPipeline agentStatuses={job.agentStatuses} jobStatus={job.status} />
          </div>
          <FinalReportPanel
            jobId={jobId!}
            ticker={job.ticker}
            analysisDate={job.analysisDate}
            researchDepth={job.researchDepth}
            finalDecision={job.finalDecision}
            reportContent={job.reportSections['final_trade_decision'] || null}
            status={job.status}
            stats={job.stats}
          />
          <ReportAccordion
            jobId={jobId!}
            reportSections={job.reportSections}
            agentStatuses={job.agentStatuses}
          />
        </div>
      )}

      {/* ── Tablet: two equal columns ── */}
      {isTablet && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', minHeight: 0 }}>
          <FinalReportPanel
            jobId={jobId!}
            ticker={job.ticker}
            analysisDate={job.analysisDate}
            researchDepth={job.researchDepth}
            finalDecision={job.finalDecision}
            reportContent={job.reportSections['final_trade_decision'] || null}
            status={job.status}
            stats={job.stats}
          />
          <ReportAccordion
            jobId={jobId!}
            reportSections={job.reportSections}
            agentStatuses={job.agentStatuses}
          />
        </div>
      )}

      {/* ── Mobile: tabs ────────────────────────────── */}
      {isMobile && (
        <>
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {activeTab === 'pipeline' && (
              <div style={{ height: '100%', overflowY: 'auto', background: 'var(--sidebar)' }}>
                <AgentPipeline agentStatuses={job.agentStatuses} jobStatus={job.status} />
              </div>
            )}
            {activeTab === 'summary' && (
              <div style={{ height: '100%', overflowY: 'auto' }}>
                <FinalReportPanel
                  jobId={jobId!}
                  ticker={job.ticker}
                  analysisDate={job.analysisDate}
                  researchDepth={job.researchDepth}
                  finalDecision={job.finalDecision}
                  reportContent={job.reportSections['final_trade_decision'] || null}
                  status={job.status}
                  stats={job.stats}
                />
              </div>
            )}
            {activeTab === 'reports' && (
              <div style={{ height: '100%', overflowY: 'auto' }}>
                <ReportAccordion
                  jobId={jobId!}
                  reportSections={job.reportSections}
                  agentStatuses={job.agentStatuses}
                />
              </div>
            )}
          </div>

          {/* Bottom tab bar */}
          <div style={{
            display: 'flex',
            borderTop: '1px solid var(--border)',
            background: 'var(--card)',
            flexShrink: 0,
          }}>
            {TABS.map(({ id, label, Icon }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    padding: '10px 0',
                    border: 'none',
                    background: 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    borderTop: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'color 0.15s',
                  }}
                >
                  <Icon size={16} />
                  <span style={{ fontSize: 10.5, fontWeight: isActive ? 600 : 400 }}>{label}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
