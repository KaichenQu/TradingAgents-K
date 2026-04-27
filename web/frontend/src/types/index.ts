export interface Provider {
  key: string
  display: string
  base_url: string | null
  api_key_env: string | null
}

export interface ModelOption {
  display: string
  value: string
}

export interface AgentStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  team: string
}

export interface FeedMessage {
  type: 'message' | 'tool_call'
  timestamp: string
  msg_type?: string
  content?: string
  tool_name?: string
  args?: Record<string, unknown>
}

export interface Stats {
  llm_calls: number
  tool_calls: number
  tokens_in: number
  tokens_out: number
  agents_done: number
  agents_total: number
  reports_done: number
  reports_total: number
  elapsed_seconds: number
}

export interface JobState {
  jobId: string
  status: 'queued' | 'running' | 'completed' | 'error'
  ticker: string
  analysisDate: string
  researchDepth: number
  agentStatuses: Record<string, AgentStatus>
  messages: FeedMessage[]
  reportSections: Record<string, string>
  stats: Stats
  finalDecision: string | null
  errorMessage: string | null
}

export interface JobFormData {
  ticker: string
  analysis_date: string
  research_depth: number
  analysts: string[]
  output_language: string
  api_key: string
  llm_provider?: string | null
  backend_url?: string | null
  quick_think_llm?: string | null
  deep_think_llm?: string | null
}
