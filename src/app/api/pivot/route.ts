import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'
import { maskPII } from '@/lib/security/piiMasker'
import { z } from 'zod'

const MAX_PIVOTS = 30

const requestSchema = z.object({
  startupId: z.string().uuid(),
  agentSuggestion: z.string().max(10000),
  taskType: z.string(),
  pivotFrom: z.string().max(500).optional(),
  pivotTo: z.string().max(500).optional(),
  reason: z.string().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input values' }, { status: 400 })

  const { startupId, agentSuggestion, pivotFrom, pivotTo, reason } = parsed.data
  const supabaseService = createServiceClient()

  const { data: startup } = await supabaseService
    .from('startups')
    .select('user_id, pivot_count')
    .eq('id', startupId)
    .single()

  if (!startup) return NextResponse.json({ error: 'Startup not found' }, { status: 404 })
  if (startup.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (startup.pivot_count >= MAX_PIVOTS) {
    return NextResponse.json({ error: 'Pivot limit reached' }, { status: 403 })
  }

  await supabaseService.from('pivot_log').insert({
    startup_id: startupId,
    pivot_from: pivotFrom ?? 'Current Model',
    pivot_to: pivotTo ?? 'AI-Suggested Model',
    reason,
    agent_suggestion: maskPII(agentSuggestion),
  })

  await supabaseService
    .from('startups')
    .update({ pivot_count: startup.pivot_count + 1, status: 'pivoted' })
    .eq('id', startupId)

  return NextResponse.json({ success: true })
}
