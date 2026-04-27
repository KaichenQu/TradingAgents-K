import { JobFormData, ModelOption, Provider } from '../types'

const BASE = '/api'

export async function fetchProviders(): Promise<Provider[]> {
  const res = await fetch(`${BASE}/config/providers`)
  const data = await res.json()
  return data.providers
}

export async function fetchModels(provider: string, mode: 'quick' | 'deep'): Promise<ModelOption[]> {
  const res = await fetch(`${BASE}/config/models?provider=${provider}&mode=${mode}`)
  const data = await res.json()
  return data.models
}

export async function createJob(form: JobFormData): Promise<{ job_id: string; status: string }> {
  const res = await fetch(`${BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Failed to create job')
  }
  return res.json()
}

export interface RecentJob {
  job_id: string
  ticker: string
  analysis_date: string
  status: string
  final_decision: string | null
  created_at: string
  completed_at: string | null
}

export async function fetchRecentJobs(): Promise<RecentJob[]> {
  const res = await fetch(`${BASE}/jobs/recent`)
  const data = await res.json()
  return data.jobs || []
}

export async function fetchReport(jobId: string): Promise<string> {
  const res = await fetch(`${BASE}/jobs/${jobId}/report`)
  const data = await res.json()
  return data.report
}

export async function generateVisual(jobId: string, section: string): Promise<unknown> {
  const res = await fetch(`${BASE}/jobs/${jobId}/visualize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || 'Failed to generate visual')
  }
  const body = await res.json()
  return body.data
}
