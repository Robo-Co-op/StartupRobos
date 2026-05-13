import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/getAuthUser', () => ({
  getAuthUser: vi.fn(),
}))

import { getAuthUser } from '@/lib/auth/getAuthUser'
import { middleware, config } from './middleware'

const mockGetAuthUser = vi.mocked(getAuthUser)

function makeRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`)
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('認証済みユーザーの場合 NextResponse.next() を返す', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-abc' })
    const res = await middleware(makeRequest('/api/agent/run'))
    // NextResponse.next() returns a response that is not a JSON error
    expect(res.status).toBe(200)
    // x-user-id is set on the request headers (forwarded downstream)
    // Verify by checking the middleware-request-headers header that Next.js uses
    const overrideHeader = res.headers.get('x-middleware-request-x-user-id')
    expect(overrideHeader).toBe('user-abc')
  })

  it('未認証の場合 401 を返す', async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const res = await middleware(makeRequest('/api/agent/run'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })
})

describe('config.matcher', () => {
  it('/api/agent パスを含む', () => {
    expect(config.matcher).toContain('/api/agent/:path*')
  })

  it('/api/cxo パスを含む', () => {
    expect(config.matcher).toContain('/api/cxo/:path*')
  })

  it('/api/pivot を含む', () => {
    expect(config.matcher).toContain('/api/pivot')
  })

  it('/api/dashboard パスを含む', () => {
    expect(config.matcher).toContain('/api/dashboard/:path*')
  })

  it('/api/heartbeat を含まない（CRON_SECRET で個別保護）', () => {
    const matchers = config.matcher as string[]
    const matchesHeartbeat = matchers.some(m => m.includes('heartbeat'))
    expect(matchesHeartbeat).toBe(false)
  })
})
