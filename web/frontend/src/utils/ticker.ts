export type Market = 'US' | 'A' | 'HK'

export interface TickerInfo {
  symbol: string
  market: Market
}

// A-share: exactly 6 digits (e.g. 600519, 000001)
// HK: 4-5 digits, optionally .HK suffix (e.g. 0700, 09988, 9988.HK)
// US: 1-5 uppercase letters, optional .A/.B suffix (e.g. AAPL, BRK.A)
const A_RE  = /^\d{6}$/
const HK_RE = /^\d{4,5}(\.HK)?$/i
const US_RE = /^[A-Z]{1,5}(\.[AB])?$/

export function detectMarket(raw: string): Market | null {
  const s = raw.toUpperCase().trim()
  if (A_RE.test(s)) return 'A'
  if (HK_RE.test(s)) return 'HK'
  if (US_RE.test(s)) return 'US'
  return null
}

export function parseTickers(input: string): TickerInfo[] {
  const seen = new Set<string>()
  const result: TickerInfo[] = []
  for (const part of input.split(';')) {
    const s = part.trim().toUpperCase()
    if (!s || seen.has(s)) continue
    seen.add(s)
    const market = detectMarket(s)
    if (market) result.push({ symbol: s, market })
  }
  return result
}

export function hasInvalidTickers(input: string): string | null {
  for (const part of input.split(';')) {
    const s = part.trim().toUpperCase()
    if (!s) continue
    if (!detectMarket(s)) return s
  }
  return null
}
