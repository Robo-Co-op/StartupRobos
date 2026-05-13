import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/client'
import { sendReport } from '@/lib/notify'
import { requireCronAuth } from '@/lib/auth'
import { calcCost } from '@/lib/agent/costs'
import { extractText } from '@/lib/agent/responseSchemas'

// CEO heartbeat calls Opus which can be slow
export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function GET(req: NextRequest) {
  const authError = requireCronAuth(req)
  if (authError) return authError

  const supabase = createServiceClient()

  // Fetch active startups and recent experiments
  const { data: startups } = await supabase
    .from('startups')
    .select('id, name, business_type, status')
    .eq('status', 'active')

  if (!startups?.length) {
    return NextResponse.json({ message: 'No startups found' })
  }

  const { data: experiments } = await supabase
    .from('experiments')
    .select('startup_id, hypothesis, status, result')
    .in('startup_id', startups.map(s => s.id))
    .order('created_at', { ascending: false })

  // Build CEO context for analysis
  const context = startups.map(s => {
    const exps = (experiments ?? []).filter(e => e.startup_id === s.id)
    const recent = exps.slice(0, 3).map(e => `- ${e.hypothesis} [${e.status}]`).join('\n')
    return `## ${s.name} (${s.business_type})\nRecent experiments:\n${recent || 'none'}`
  }).join('\n\n')

  const prompt = `You are the CEO of Launchpad. Evaluate the status of the following startups and propose the next action for each business:

${context}

For each business:
1. Current challenges (1 line)
2. Next experiment to try (specific details)
3. Priority (High/Medium/Low)`

  const start = Date.now()
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
    system: 'You are an experienced startup CEO. Make concise and specific decisions based on data.',
  })

  const content = extractText(response)
  const costUsd = calcCost('claude-opus-4-6', response.usage.input_tokens, response.usage.output_tokens)

  // Save execution log to Supabase
  await supabase.from('agent_runs').insert({
    startup_id: startups[0].id, // CEO handles overall, using representative entry
    model: 'claude-opus-4-6',
    tokens_input: response.usage.input_tokens,
    tokens_output: response.usage.output_tokens,
    cost_usd: costUsd,
    task_type: 'pivot_analysis',
    result: content,
  })

  // Send email notification
  const hour = new Date().getUTCHours()
  const period = hour < 6 ? 'Morning' : 'Evening'
  await sendReport(
    `📊 Launchpad ${period} Report — ${new Date().toLocaleDateString('en-US')}`,
    content
  )

  return NextResponse.json({
    ok: true,
    elapsed_ms: Date.now() - start,
    cost_usd: costUsd,
    assessment: content,
  })
}
