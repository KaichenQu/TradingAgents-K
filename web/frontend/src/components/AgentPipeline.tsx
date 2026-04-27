import { CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react'
import { AgentStatus } from '../types'

const FLOW = [
  {
    team: 'Analysts',
    color: '#0284c7',
    agents: ['Market Analyst', 'Social Analyst', 'News Analyst', 'Fundamentals Analyst'],
  },
  {
    team: 'Research',
    color: '#7c3aed',
    agents: ['Bull Researcher', 'Bear Researcher', 'Research Manager'],
  },
  {
    team: 'Trading',
    color: '#0891b2',
    agents: ['Trader'],
  },
  {
    team: 'Risk',
    color: '#b45309',
    agents: ['Aggressive Analyst', 'Conservative Analyst', 'Neutral Analyst'],
  },
  {
    team: 'Portfolio',
    color: '#16a34a',
    agents: ['Portfolio Manager'],
  },
]

function resolveStatus(
  agent: string,
  agentStatuses: Record<string, AgentStatus>,
  jobCompleted: boolean,
): 'completed' | 'in_progress' | 'error' | 'pending' {
  const st = agentStatuses[agent]?.status
  if (st) return st
  if (jobCompleted) return 'completed'
  return 'pending'
}

interface Props {
  agentStatuses: Record<string, AgentStatus>
  jobStatus?: string
}

export default function AgentPipeline({ agentStatuses, jobStatus }: Props) {
  const jobCompleted = jobStatus === 'completed'

  return (
    <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{
        fontSize: 9,
        fontWeight: 800,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        marginBottom: 14,
        paddingLeft: 2,
      }}>
        Agent Pipeline
      </div>

      {FLOW.map((team, teamIdx) => {
        const statuses = team.agents.map(a => resolveStatus(a, agentStatuses, jobCompleted))
        const teamDone    = statuses.every(s => s === 'completed')
        const teamActive  = statuses.some(s => s === 'in_progress')
        const teamColor   = teamActive ? 'var(--accent)' : teamDone ? team.color : 'var(--border)'

        return (
          <div key={team.team}>
            {/* Team block */}
            <div style={{
              borderRadius: 8,
              border: `1px solid ${teamActive ? 'var(--accent-border)' : teamDone ? `${team.color}33` : 'var(--border)'}`,
              background: teamActive ? 'var(--accent-muted)' : 'var(--card)',
              padding: '8px 10px',
              transition: 'all 0.2s',
            }}>
              {/* Team header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: team.agents.length > 1 ? 6 : 0,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: teamColor,
                  flexShrink: 0,
                  boxShadow: teamActive ? `0 0 0 3px ${teamColor}33` : 'none',
                  transition: 'all 0.3s',
                }} />
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: teamActive ? 'var(--accent)' : teamDone ? 'var(--text-secondary)' : 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  flex: 1,
                }}>
                  {team.team}
                </span>
                {teamActive && <Loader2 size={10} color="var(--accent)" className="animate-spin" />}
                {teamDone && !teamActive && <CheckCircle2 size={11} color={team.color} />}
              </div>

              {/* Agents */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {team.agents.map(agent => {
                  const st      = resolveStatus(agent, agentStatuses, jobCompleted)
                  const active  = st === 'in_progress'
                  const done    = st === 'completed'
                  const errored = st === 'error'

                  return (
                    <div
                      key={agent}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '3px 4px',
                        borderRadius: 5,
                        background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
                      }}
                    >
                      {errored  ? <AlertCircle size={11} color="var(--danger)" />  :
                       active   ? <Loader2 size={11} color="var(--accent)" className="animate-spin" /> :
                       done     ? <CheckCircle2 size={11} color={team.color} />    :
                                  <Circle size={11} color="var(--border)" />}
                      <span style={{
                        fontSize: 11,
                        color: active ? 'var(--text-primary)' : done ? 'var(--text-secondary)' : 'var(--text-muted)',
                        fontWeight: active ? 500 : 400,
                        lineHeight: 1.3,
                      }}>
                        {agent}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Connector arrow between teams */}
            {teamIdx < FLOW.length - 1 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '3px 0',
              }}>
                <div style={{ width: 1, height: 10, background: teamDone ? team.color : 'var(--border)', opacity: teamDone ? 0.5 : 0.3 }} />
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: `5px solid ${teamDone ? team.color : 'var(--border)'}`,
                  opacity: teamDone ? 0.5 : 0.3,
                }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
