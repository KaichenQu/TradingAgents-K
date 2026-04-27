import { create } from 'zustand'
import { AgentStatus, FeedMessage, JobState, Stats } from '../types'

const DEFAULT_STATS: Stats = {
  llm_calls: 0, tool_calls: 0, tokens_in: 0, tokens_out: 0,
  agents_done: 0, agents_total: 0, reports_done: 0, reports_total: 7,
  elapsed_seconds: 0,
}

interface JobStore {
  jobs: Record<string, JobState>
  initJob(jobId: string, ticker: string, analysisDate: string, researchDepth: number): void
  applyMessage(jobId: string, msg: Record<string, unknown>): void
  applySnapshot(jobId: string, snap: Record<string, unknown>): void
}

export const useJobStore = create<JobStore>((set) => ({
  jobs: {},

  initJob(jobId, ticker, analysisDate, researchDepth) {
    set((s) => ({
      jobs: {
        ...s.jobs,
        [jobId]: {
          jobId, status: 'queued', ticker, analysisDate, researchDepth,
          agentStatuses: {}, messages: [], reportSections: {},
          stats: { ...DEFAULT_STATS }, finalDecision: null, errorMessage: null,
        },
      },
    }))
  },

  applyMessage(jobId, msg) {
    set((s) => {
      const job = s.jobs[jobId]
      if (!job) return s
      const updated = { ...job }

      switch (msg.type) {
        case 'job_status':
          updated.status = msg.status as JobState['status']
          break
        case 'agent_status':
          updated.agentStatuses = {
            ...updated.agentStatuses,
            [msg.agent as string]: {
              status: msg.status as AgentStatus['status'],
              team: msg.team as string,
            },
          }
          break
        case 'message':
        case 'tool_call':
          updated.messages = [...updated.messages.slice(-99), msg as unknown as FeedMessage]
          break
        case 'report_update':
          updated.reportSections = {
            ...updated.reportSections,
            [msg.section as string]: msg.content as string,
          }
          break
        case 'stats':
          updated.stats = { ...(msg as unknown as Stats) }
          break
        case 'complete':
          updated.status = 'completed'
          updated.finalDecision = (msg.final_decision as string) || null
          break
        case 'error':
          updated.status = 'error'
          updated.errorMessage = msg.message as string
          break
      }
      return { jobs: { ...s.jobs, [jobId]: updated } }
    })
  },

  // Creates the job in the store if it doesn't exist yet (handles page refresh)
  applySnapshot(jobId, snap) {
    set((s) => {
      const existing = s.jobs[jobId]

      const agentStatuses: Record<string, AgentStatus> = {}
      const rawStatuses = (snap.agent_statuses as Record<string, { status: string; team: string }>) || {}
      for (const [agent, val] of Object.entries(rawStatuses)) {
        agentStatuses[agent] = { status: val.status as AgentStatus['status'], team: val.team }
      }

      const merged: JobState = {
        jobId,
        status: (snap.status as JobState['status']) || existing?.status || 'queued',
        ticker: (snap.ticker as string) || existing?.ticker || '',
        analysisDate: (snap.analysis_date as string) || existing?.analysisDate || '',
        researchDepth: existing?.researchDepth ?? 5,
        agentStatuses,
        messages: existing?.messages || [],
        reportSections: (snap.report_sections as Record<string, string>) || {},
        stats: { ...DEFAULT_STATS, ...((snap.stats as Stats) || {}) },
        finalDecision: (snap.final_decision as string) || null,
        errorMessage: (snap.error_message as string) || null,
      }
      return { jobs: { ...s.jobs, [jobId]: merged } }
    })
  },
}))
