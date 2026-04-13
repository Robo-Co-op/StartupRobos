import { NextRequest, NextResponse } from 'next/server'
import { runAgent, AgentConfig } from '@/lib/agent/harness'
import { createServiceClient } from '@/lib/supabase/client'
import { maskPII } from '@/lib/security/piiMasker'
import { z } from 'zod'

// Rate limiting memory cache (Redis recommended for production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

const requestSchema = z.object({
  startupId: z.string().uuid(),
  taskType: z.enum(['pivot_analysis', 'market_research', 'mvp_spec', 'pivot_decision']),
  prompt: z.string().min(1).max(5000),
})

// TODO: Add API key auth for Mission Control
export async function POST(req: NextRequest) {
  // Rate limit check (10 requests/min) — using IP-based limiting for now
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please retry after 1 minute.' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input values', details: parsed.error.issues }, { status: 400 })
  }

  const { startupId, taskType, prompt } = parsed.data

  const supabaseService = createServiceClient()

  // Verify startup exists
  const { data: startup } = await supabaseService
    .from('startups')
    .select('id, user_id')
    .eq('id', startupId)
    .single()

  if (!startup) {
    return NextResponse.json({ error: 'Startup not found' }, { status: 404 })
  }

  // PII masking
  const sanitizedPrompt = maskPII(prompt)
  // TODO: Add user context via API key auth
  const config: AgentConfig = { userId: startup.user_id ?? 'anonymous', startupId, taskType }

  try {
    // Use startup context without user_id since we're doing public read
    const result = await runAgent(config, sanitizedPrompt, supabaseService)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
