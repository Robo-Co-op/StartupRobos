import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/client'
import { calcCost } from '@/lib/agent/costs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

// Business-specific CXO tasks (CMO + CTO)
const BUSINESS_TASKS: Record<string, { role: string; prompt: string; task_type: string }> = {
  affiliate_seo: {
    role: 'CMO',
    task_type: 'market_research',
    prompt: `You are an SEO-specialist CMO. Propose 3 ideas to improve customer acquisition for AI Tool Lab (AI tools directory site).
Be specific with keyword strategies, article title suggestions, and internal linking improvements. Keep each proposal to 2-3 lines.`,
  },
  digital_product: {
    role: 'CMO',
    task_type: 'market_research',
    prompt: `You are a digital product CMO. Propose 3 sales promotion ideas for Prompt Pack (Claude/ChatGPT prompt collection sold on Gumroad).
Consider social strategies, landing page improvements, and pricing. Keep each proposal to 2-3 lines.`,
  },
  game_ads: {
    role: 'CTO',
    task_type: 'mvp_spec',
    prompt: `You are a game development CTO. Propose 3 engagement improvement ideas for Puzzle Games (Sudoku and hiragana matching games with AdSense revenue).
Consider feature additions, UX improvements, and SEO optimization. Keep each proposal to 2-3 lines.`,
  },
}

// Cross-functional CXO tasks (COO + CFO) — common across all businesses
const CROSS_CXO_TASKS = [
  {
    role: 'COO',
    task_type: 'ops_review',
    prompt: `You are the COO (Chief Operating Officer) of Launchpad. Review the operations of these 3 businesses:
- AI Tool Lab (GitHub Pages, affiliate_seo)
- Prompt Pack (GitHub Pages + Gumroad, digital_product)
- Puzzle Games (GitHub Pages + AdSense, game_ads)

Report on:
1. Any deployment or hosting challenges
2. Monitoring and alerting improvement suggestions
3. One critical operations task to do next`,
  },
  {
    role: 'CFO',
    task_type: 'budget_review',
    prompt: `You are the CFO (Chief Financial Officer) of Launchpad. Review the monetization status of these 3 businesses:
- AI Tool Lab: Amazon Associates (tag=robocoop-ai-22)
- Prompt Pack: Gumroad sales (3 products at $9/$7/$12)
- Puzzle Games: Google AdSense (pending approval)

Report on:
1. Expected monthly revenue per channel
2. Cost structure (API costs, hosting)
3. One proposal to improve revenue`,
  },
]

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: startups } = await supabase
    .from('startups')
    .select('id, name, business_type')
    .eq('status', 'active')

  if (!startups?.length) {
    return NextResponse.json({ message: 'No startups found' })
  }

  const results = []
  let totalCost = 0

  // Business-specific tasks (CMO / CTO)
  for (const startup of startups) {
    const task = BUSINESS_TASKS[startup.business_type]
    if (!task) continue

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: task.prompt }],
      system: `You are the ${task.role} of Launchpad. Provide actionable and specific recommendations.`,
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    const costUsd = calcCost('claude-sonnet-4-6', response.usage.input_tokens, response.usage.output_tokens)
    totalCost += costUsd

    await supabase.from('agent_runs').insert({
      startup_id: startup.id,
      model: 'claude-sonnet-4-6',
      tokens_input: response.usage.input_tokens,
      tokens_output: response.usage.output_tokens,
      cost_usd: costUsd,
      task_type: task.task_type,
      result: content,
    })

    results.push({ startup: startup.name, role: task.role, suggestions: content })
  }

  // Cross-functional tasks (COO / CFO)
  for (const task of CROSS_CXO_TASKS) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: task.prompt }],
      system: `You are the ${task.role} of Launchpad. Provide actionable and specific recommendations.`,
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    const costUsd = calcCost('claude-sonnet-4-6', response.usage.input_tokens, response.usage.output_tokens)
    totalCost += costUsd

    // COO/CFO handle overall responsibilities using representative startup_id
    await supabase.from('agent_runs').insert({
      startup_id: startups[0].id,
      model: 'claude-sonnet-4-6',
      tokens_input: response.usage.input_tokens,
      tokens_output: response.usage.output_tokens,
      cost_usd: costUsd,
      task_type: task.task_type,
      result: content,
    })

    results.push({ role: task.role, report: content })
  }

  return NextResponse.json({ ok: true, total_cost_usd: totalCost, results })
}
