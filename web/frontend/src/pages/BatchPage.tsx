import { Link, useSearchParams } from 'react-router-dom'
import { Sun, Moon, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { useJob } from '../hooks/useJob'
import { t } from '../i18n'
import { JobState } from '../types'

export default function BatchPage() {
  const [params] = useSearchParams()
  const { dark, toggle } = useTheme()
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 20px',
        height: 48,
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
        boxShadow: 'var(--shadow-sm)',
        flexShrink: 0,
      }}>
        <div style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--accent)' }} />
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{t.app.name}</span>
        <span style={{ color: 'var(--border)', fontSize: 16 }}>|</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.batch.heading(ids.length)}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/setup" style={{
            fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none',
            padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6,
            background: 'var(--bg-subtle)',
          }}>
            {t.batch.newAnalysis}
          </Link>
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

      {/* Grid */}
      <div style={{
        flex: 1,
        padding: '24px 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 16,
        alignContent: 'start',
      }}>
        {ids.map(id => <JobCard key={id} jobId={id} />)}
      </div>
    </div>
  )
}

function JobCard({ jobId }: { jobId: string }) {
  const job = useJob(jobId)

  if (!job) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
          <Loader2 size={14} className="animate-spin" />
          Connecting…
        </div>
      </div>
    )
  }

  return <JobCardInner job={job} />
}

const DECISION_STYLE: Record<string, { color: string; bg: string }> = {
  BUY:  { color: 'var(--success)', bg: 'var(--success-muted)' },
  SELL: { color: 'var(--danger)',  bg: 'var(--danger-muted)'  },
  HOLD: { color: 'var(--warning)', bg: 'var(--warning-muted)' },
}

function JobCardInner({ job }: { job: JobState }) {
  const ds = job.finalDecision ? DECISION_STYLE[job.finalDecision] ?? DECISION_STYLE.HOLD : null
  const progress = job.stats.agents_total > 0
    ? Math.round((job.stats.agents_done / job.stats.agents_total) * 100)
    : 0

  return (
    <div style={cardStyle}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '0.04em', flex: 1 }}>
          {job.ticker}
        </span>
        <StatusChip status={job.status} />
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 16 }}>{job.analysisDate}</div>

      {/* Decision */}
      {ds && job.finalDecision ? (
        <div style={{
          borderRadius: 10,
          padding: '16px',
          background: ds.bg,
          textAlign: 'center',
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: ds.color, letterSpacing: '0.04em', lineHeight: 1 }}>
            {job.finalDecision}
          </div>
          <div style={{ fontSize: 11, color: ds.color, opacity: 0.7, marginTop: 4, fontWeight: 500 }}>
            {t.dashboard.decisionLabel[job.finalDecision as keyof typeof t.dashboard.decisionLabel] ?? ''}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          {job.status === 'running' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {job.stats.agents_done > 0 ? t.dashboard.agentsOf(job.stats.agents_done, job.stats.agents_total) : t.dashboard.preparing}
                </span>
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{progress}%</span>
              </div>
              <ProgressBar value={progress} />
            </>
          )}
          {job.status === 'queued' && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} /> Queued…
            </div>
          )}
          {job.status === 'error' && (
            <div style={{ fontSize: 12, color: 'var(--danger)' }}>{job.errorMessage}</div>
          )}
        </div>
      )}

      {/* Reports progress */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
        {Object.keys(job.reportSections).length} / 7 reports
      </div>

      <Link
        to={`/job/${job.jobId}`}
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '8px 0',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-subtle)',
          color: 'var(--text-secondary)',
          fontSize: 12.5,
          fontWeight: 500,
          textDecoration: 'none',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
      >
        {t.batch.viewFull}
      </Link>
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    queued:    { icon: <Clock size={11} />,       color: 'var(--warning)', bg: 'var(--warning-muted)' },
    running:   { icon: <Loader2 size={11} className="animate-spin" />, color: 'var(--accent)', bg: 'var(--accent-muted)' },
    completed: { icon: <CheckCircle size={11} />, color: 'var(--success)', bg: 'var(--success-muted)' },
    error:     { icon: <AlertCircle size={11} />, color: 'var(--danger)',  bg: 'var(--danger-muted)' },
  }
  const st = map[status] ?? map.queued
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 5,
      background: st.bg, color: st.color,
      fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
    }}>
      {st.icon}{status}
    </span>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ height: 5, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${value}%`,
        background: 'var(--accent)',
        borderRadius: 3,
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '20px',
  boxShadow: 'var(--shadow-md)',
}
