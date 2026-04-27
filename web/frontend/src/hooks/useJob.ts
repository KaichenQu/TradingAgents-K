import { useEffect } from 'react'
import { JobWebSocket } from '../api/ws'
import { useJobStore } from '../store/jobStore'

export function useJob(jobId: string) {
  const applyMessage = useJobStore((s) => s.applyMessage)
  const applySnapshot = useJobStore((s) => s.applySnapshot)
  const job = useJobStore((s) => s.jobs[jobId])

  useEffect(() => {
    if (!jobId) return
    const client = new JobWebSocket(jobId, (msg) => {
      if (msg.type === 'snapshot') {
        applySnapshot(jobId, msg)
      } else {
        applyMessage(jobId, msg)
      }
    })
    return () => client.close()
  }, [jobId])

  return job
}
