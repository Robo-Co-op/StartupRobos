import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/client'
import { maskPII } from '@/lib/security/piiMasker'
import { runCouncil } from '@/lib/agent/council'

// Rate limiting: CXO meetings are resource-heavy so limit to 3 calls/min/user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

const requestSchema = z.object({
  startupId: z.string().uuid(),
  agenda: z.string().min(10).max(2000),
})

// TODO: Add API key auth for Mission Control
export async function POST(req: NextRequest) {
  // Rate limit check (3 calls/min) — using IP-based limiting for now
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'CXO meetings limited to 3 per minute' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input values', details: parsed.error.issues }, { status: 400 })
  }

  const { startupId, agenda } = parsed.data
  const supabaseService = createServiceClient()

  // Fetch startup + context
  const { data: startup } = await supabaseService
    .from('startups')
    .select('id, user_id, name, description, status, pivot_count')
    .eq('id', startupId)
    .single()

  if (!startup) {
    return NextResponse.json({ error: 'Startup not found' }, { status: 404 })
  }

  const startupContext = [
    `Company: ${startup.name}`,
    startup.description ? `Description: ${startup.description}` : '',
    `Status: ${startup.status}`,
    `Pivots: ${startup.pivot_count} / 30`,
  ].filter(Boolean).join('\n')

  const sanitizedAgenda = maskPII(agenda)

  try {
    const result = await runCouncil(
      startup.user_id ?? 'anonymous',
      startupId,
      startupContext,
      sanitizedAgenda,
      supabaseService
    )
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An error occurred during the CXO meeting'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
