import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'
import { requireCronAuth } from '@/lib/auth'
import { runHeartbeatTask } from '@/lib/agent/heartbeatRunner'

// CXO heartbeat runs 5 sequential AI calls
export const maxDuration = 300

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
  const authError = requireCronAuth(req)
  if (authError) return authError

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

    const { content, costUsd } = await runHeartbeatTask(supabase, {
      model: 'claude-sonnet-4-6',
      maxTokens: 800,
      prompt: task.prompt,
      systemPrompt: `You are the ${task.role} of Launchpad. Provide actionable and specific recommendations.`,
      startupId: startup.id,
      taskType: task.task_type,
    })
    totalCost += costUsd
    results.push({ startup: startup.name, role: task.role, suggestions: content })
  }

  // Cross-functional tasks (COO / CFO)
  for (const task of CROSS_CXO_TASKS) {
    const { content, costUsd } = await runHeartbeatTask(supabase, {
      model: 'claude-sonnet-4-6',
      maxTokens: 800,
      prompt: task.prompt,
      systemPrompt: `You are the ${task.role} of Launchpad. Provide actionable and specific recommendations.`,
      startupId: startups[0].id,
      taskType: task.task_type,
    })
    totalCost += costUsd
    results.push({ role: task.role, report: content })
  }

  return NextResponse.json({ ok: true, total_cost_usd: totalCost, results })
}
