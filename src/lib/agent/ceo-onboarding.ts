import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { calcCost } from '@/lib/agent/costs'
import { extractText } from '@/lib/agent/responseSchemas'

export interface OnboardingInput {
  languages: string[]
  region: string
  monthlyBudgetUsd: number
}

export interface BusinessProposal {
  name: string
  type: 'affiliate_seo' | 'digital_product' | 'game_ads'
  description: string
  whyThisFits: string
  experiments: {
    hypothesis: string
    metric: string
    targetValue: string
  }[]
}

export interface OnboardingResult {
  proposals: BusinessProposal[]
  ceoReasoning: string
  costUsd: number
}

const BUSINESS_TEMPLATES = {
  affiliate_seo: {
    label: 'アフィリエイト/SEOサイト',
    description: '比較・レビューサイトで長尾キーワードSEO記事を多言語量産。オーガニック集客のみ。',
  },
  digital_product: {
    label: 'デジタルプロダクト',
    description: 'テンプレート、ebook、プロンプト集などをGumroadで販売。生成→LP→販売まで全自動。',
  },
  game_ads: {
    label: 'ゲーム+広告',
    description: 'HTML5 Webゲームを生成→デプロイ→AdSense広告で収益化。SNSバイラルで集客。',
  },
}

const CEO_ONBOARDING_PROMPT = `あなたはLaunchpadのCEO — 難民起業家のためのAI経営者です。

## あなたの役割
難民起業家のプロフィール（言語、地域）に基づいて、最適な3つのデジタルビジネスを選定し、
各事業の実験仮説を設計します。

## ビジネステンプレート
${Object.entries(BUSINESS_TEMPLATES).map(([key, v]) => `- **${key}**: ${v.label} — ${v.description}`).join('\n')}

## 重要なルール
- 集客は100%オーガニック（SEO、SNS、口コミ）。有料広告は使わない
- 初期投資$0のビジネスのみ
- 人間の介在を最小化。AIエージェントが自律実行できるものを優先
- 難民の言語×地域を活かした差別化を重視
- 各事業に異なるテンプレートを割り当てること（3つとも同じにしない）

## 出力フォーマット (JSON)
以下のJSON形式で正確に出力してください。余計なテキストは不要です。
\`\`\`json
{
  "reasoning": "なぜこの3事業の組み合わせが最適か（2-3文）",
  "proposals": [
    {
      "name": "事業名（キャッチーで具体的に）",
      "type": "affiliate_seo | digital_product | game_ads",
      "description": "何をどう展開するか（1-2文）",
      "whyThisFits": "この難民のプロフィールになぜ合うか（1文）",
      "experiments": [
        {
          "hypothesis": "具体的な仮説",
          "metric": "計測指標",
          "targetValue": "目標値"
        }
      ]
    }
  ]
}
\`\`\`
各事業に5個の実験を設計してください。`

export async function runCEOOnboarding(
  input: OnboardingInput,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>
): Promise<OnboardingResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // 予算チェック
  const { data: budget, error: budgetError } = await supabase
    .from('token_budgets')
    .select('spent_usd, total_usd')
    .eq('user_id', userId)
    .single()

  if (budgetError || !budget) throw new Error('予算情報が見つかりません')
  const remainingUsd = Number(budget.total_usd) - Number(budget.spent_usd)
  if (remainingUsd < 0.50) throw new Error('予算不足です（CEO Opusの実行に最低$0.50必要）')

  const userMessage = `## 難民起業家プロフィール
- 言語: ${input.languages.join(', ')}
- 地域: ${input.region}
- 月額予算: $${input.monthlyBudgetUsd}

この起業家に最適な3つのデジタルビジネスを選定し、各事業の実験仮説を設計してください。`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4000,
    system: CEO_ONBOARDING_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = extractText(response)
  const costUsd = calcCost('claude-opus-4-6', response.usage.input_tokens, response.usage.output_tokens)

  // 実行ログ保存
  await supabase.from('agent_runs').insert({
    user_id: userId,
    startup_id: null,
    model: 'claude-opus-4-6',
    tokens_input: response.usage.input_tokens,
    tokens_output: response.usage.output_tokens,
    cost_usd: costUsd,
    task_type: 'ceo_onboarding',
  })

  // 予算更新
  await supabase
    .from('token_budgets')
    .update({
      spent_usd: Number(budget.spent_usd) + costUsd,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  // JSONパース
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ?? content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('CEO応答のパースに失敗しました')

  const jsonStr = jsonMatch[1] ?? jsonMatch[0]
  const parsed = JSON.parse(jsonStr) as {
    reasoning: string
    proposals: BusinessProposal[]
  }

  return {
    proposals: parsed.proposals,
    ceoReasoning: parsed.reasoning,
    costUsd,
  }
}
