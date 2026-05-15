import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * Validate API_SECRET header authentication.
 * Returns null if auth passes, or a NextResponse error if it fails.
 */
export function requireApiAuth(req: { headers: { get(name: string): string | null } }): NextResponse | null {
  const secret = process.env.API_SECRET
  if (!secret) {
    console.error('[auth] API_SECRET is not configured (misconfigured)')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const provided = req.headers.get('x-api-secret')
  if (!provided || !safeEqual(provided, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

/**
 * Validate CRON_SECRET bearer token authentication.
 * Returns null if auth passes, or a NextResponse error if it fails.
 */
export function requireCronAuth(req: { headers: { get(name: string): string | null } }): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[auth] CRON_SECRET is not configured (misconfigured)')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token || !safeEqual(token, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
