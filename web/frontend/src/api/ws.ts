type MessageHandler = (msg: Record<string, unknown>) => void

export class JobWebSocket {
  private ws: WebSocket | null = null
  private jobId: string
  private onMessage: MessageHandler
  private retries = 0
  private maxRetries = 3
  private closed = false

  constructor(jobId: string, onMessage: MessageHandler) {
    this.jobId = jobId
    this.onMessage = onMessage
    this.connect()
  }

  private connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    this.ws = new WebSocket(`${protocol}://${host}/ws/${this.jobId}`)

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type !== 'ping') {
          this.onMessage(msg)
        }
      } catch {}
    }

    this.ws.onclose = () => {
      if (!this.closed && this.retries < this.maxRetries) {
        const delay = Math.pow(2, this.retries) * 1000
        this.retries++
        setTimeout(() => this.connect(), delay)
      }
    }
  }

  close() {
    this.closed = true
    this.ws?.close()
  }
}
