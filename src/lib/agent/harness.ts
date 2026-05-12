import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deductBudget, BudgetExhaustedError } from '@/lib/agent/budgetDeduction'
import { calcCost, type ModelName } from '@/lib/agent/costs'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export type { ModelName }

export interface AgentConfig {
  userId: string
  startupId: string
  taskType: 'pivot_analysis' | 'market_research' | 'mvp_spec' | 'pivot_decision'
  model?: ModelName
  maxTokens?: number
}

export interface AgentResult {
  content: string
  tokensUsed: { input: number; output: number }
  costUsd: number
  budgetRemaining: number
}

export async function runAgent(
  config: AgentConfig,
  prompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseServiceClient: SupabaseClient<any, any, any>
): Promise<AgentResult> {
  // Use sonnet for pivot_decision, haiku for others
  const model: ModelName = config.model ?? (
    config.taskType === 'pivot_decision' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'
  )
  const maxTokens = config.maxTokens ?? 1000

  // Check budget before execution
  const { data: budget, error: budgetError } = await supabaseServiceClient
    .from('token_budgets')
    .select('spent_usd, total_usd')
    .eq('user_id', config.userId)
    .single()

  if (budgetError || !budget) throw new Error('Budget information not found')
  const remainingUsd = Number(budget.total_usd) - Number(budget.spent_usd)
  if (remainingUsd <= 0) throw new BudgetExhaustedError('Token budget exhausted')

  // Execute agent
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
    system: getSystemPrompt(config.taskType),
  })

  const tokensIn = response.usage.input_tokens
  const tokensOut = response.usage.output_tokens
  const costUsd = calcCost(model, tokensIn, tokensOut)

  // Save execution record
  await supabaseServiceClient.from('agent_runs').insert({
    user_id: config.userId,
    startup_id: config.startupId,
    model,
    tokens_input: tokensIn,
    tokens_output: tokensOut,
    cost_usd: costUsd,
    task_type: config.taskType,
  })

  // アトミックに予算控除（TOCTOU 競合を排除）
  const deduction = await deductBudget(supabaseServiceClient, config.userId, costUsd)
  if (!deduction.ok) throw new BudgetExhaustedError('Token budget exhausted (concurrent deduction failed)')

  const content = response.content[0].type === 'text' ? response.content[0].text : ''

  return {
    content,
    tokensUsed: { input: tokensIn, output: tokensOut },
    costUsd,
    budgetRemaining: deduction.remaining ?? 0,
  }
}

function getSystemPrompt(taskType: AgentConfig['taskType']): string {
  const prompts: Record<AgentConfig['taskType'], string> = {
    pivot_analysis: `You are a startup pivot advisor. Analyze the current business model and suggest concrete pivot options with reasoning. Be specific and actionable. Output JSON with fields: pivot_options (array), reasoning, risk_level.`,
    market_research: `You are a rapid market researcher. Given a startup idea, identify the target market, key competitors, and differentiation opportunity in under 500 words. Focus on actionable insights.`,
    mvp_spec: `You are a lean MVP architect. Define the smallest possible MVP that can validate the core hypothesis. Output a spec with: core_feature (1 only), validation_metric, build_time_estimate, tech_stack_suggestion.`,
    pivot_decision: `You are a decisive pivot evaluator. Given metrics and context, make a binary go/pivot decision with confidence score (0-100) and one-sentence rationale.`,
  }
  return prompts[taskType]
}
