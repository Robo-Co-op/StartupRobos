import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CXO_SYSTEM_PROMPTS, CXO_MODELS, type CXORole } from './cxo'
import { deductBudget } from '@/lib/agent/budgetDeduction'
import { calcCost } from '@/lib/agent/costs'

// 最低予算: CXO 4名 (sonnet) + CEO (opus) の概算上限
const MIN_BUDGET_USD = 0.10

export interface CouncilResult {
  sessionId: string
  ctoReport: string
  cmoReport: string
  cooReport: string
  cfoReport: string
  ceoDecision: string
  totalCostUsd: number
  budgetRemaining: number
}

interface CXOReport {
  role: CXORole
  content: string
  costUsd: number
  tokensIn: number
  tokensOut: number
}


export async function runCouncil(
  userId: string,
  startupId: string,
  startupContext: string,
  agenda: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>
): Promise<CouncilResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // 予算チェック
  const { data: budget, error: budgetError } = await supabase
    .from('token_budgets')
    .select('spent_usd, total_usd')
    .eq('user_id', userId)
    .single()

  if (budgetError || !budget) throw new Error('予算情報が見つかりません')
  const remainingUsd = Number(budget.total_usd) - Number(budget.spent_usd)
  if (remainingUsd < MIN_BUDGET_USD) {
    throw new Error(`トークン予算が不足しています (残: $${remainingUsd.toFixed(4)})`)
  }

  const userMessage = `## スタートアップコンテキスト\n${startupContext}\n\n## アジェンダ\n${agenda}`

  // Step 1: CTO / CMO / COO / CFO を並列実行
  const subordinateRoles: Exclude<CXORole, 'ceo'>[] = ['cto', 'cmo', 'coo', 'cfo']

  const reports: CXOReport[] = await Promise.all(
    subordinateRoles.map(async (role): Promise<CXOReport> => {
      const model = CXO_MODELS[role]
      const response = await anthropic.messages.create({
        model,
        max_tokens: 600,
        system: CXO_SYSTEM_PROMPTS[role],
        messages: [{ role: 'user', content: userMessage }],
      })
      const content = response.content[0].type === 'text' ? response.content[0].text : ''
      const costUsd = calcCost(model, response.usage.input_tokens, response.usage.output_tokens)
      return { role, content, costUsd, tokensIn: response.usage.input_tokens, tokensOut: response.usage.output_tokens }
    })
  )

  const byRole = Object.fromEntries(reports.map(r => [r.role, r])) as Record<Exclude<CXORole, 'ceo'>, CXOReport>

  // Step 2: CEO が全レポートを統合して意思決定
  const ceoPrompt = [
    `## スタートアップコンテキスト\n${startupContext}`,
    `## アジェンダ\n${agenda}`,
    `## CTO レポート\n${byRole.cto.content}`,
    `## CMO レポート\n${byRole.cmo.content}`,
    `## COO レポート\n${byRole.coo.content}`,
    `## CFO レポート\n${byRole.cfo.content}`,
  ].join('\n\n')

  const ceoModel = CXO_MODELS['ceo']
  const ceoResponse = await anthropic.messages.create({
    model: ceoModel,
    max_tokens: 1000,
    system: CXO_SYSTEM_PROMPTS['ceo'],
    messages: [{ role: 'user', content: ceoPrompt }],
  })
  const ceoDecision = ceoResponse.content[0].type === 'text' ? ceoResponse.content[0].text : ''
  const ceoCostUsd = calcCost(ceoModel, ceoResponse.usage.input_tokens, ceoResponse.usage.output_tokens)

  const totalCostUsd = reports.reduce((sum, r) => sum + r.costUsd, 0) + ceoCostUsd

  // 実行ログを一括挿入
  await supabase.from('agent_runs').insert([
    ...reports.map(r => ({
      user_id: userId,
      startup_id: startupId,
      model: CXO_MODELS[r.role],
      tokens_input: r.tokensIn,
      tokens_output: r.tokensOut,
      cost_usd: r.costUsd,
      task_type: `cxo_${r.role}`,
    })),
    {
      user_id: userId,
      startup_id: startupId,
      model: ceoModel,
      tokens_input: ceoResponse.usage.input_tokens,
      tokens_output: ceoResponse.usage.output_tokens,
      cost_usd: ceoCostUsd,
      task_type: 'cxo_ceo',
    },
  ])

  // アトミックに予算控除（TOCTOU 競合を排除）
  const deduction = await deductBudget(supabase, userId, totalCostUsd)
  if (!deduction.ok) throw new Error('トークン予算が不足しています（並列控除で上限超過）')

  // CXOセッション保存
  const { data: session } = await supabase
    .from('cxo_sessions')
    .insert({
      startup_id: startupId,
      user_id: userId,
      agenda,
      cto_report: byRole.cto.content,
      cmo_report: byRole.cmo.content,
      coo_report: byRole.coo.content,
      cfo_report: byRole.cfo.content,
      ceo_decision: ceoDecision,
      total_cost_usd: totalCostUsd,
    })
    .select('id')
    .single()

  return {
    sessionId: session?.id ?? '',
    ctoReport: byRole.cto.content,
    cmoReport: byRole.cmo.content,
    cooReport: byRole.coo.content,
    cfoReport: byRole.cfo.content,
    ceoDecision,
    totalCostUsd,
    budgetRemaining: deduction.remaining ?? 0,
  }
}
