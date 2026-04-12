import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/client'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

// 事業タイプ別のCXOタスク（CMO + CTO）
const BUSINESS_TASKS: Record<string, { role: string; prompt: string; task_type: string }> = {
  affiliate_seo: {
    role: 'CMO',
    task_type: 'market_research',
    prompt: `あなたはSEO専門のCMOです。AI Tool Lab（日本語AIツール紹介サイト）の集客改善案を3つ提案してください。
キーワード戦略・記事タイトル案・内部リンク改善など具体的に。各提案は2-3行で。`,
  },
  digital_product: {
    role: 'CMO',
    task_type: 'market_research',
    prompt: `あなたはデジタル商品専門のCMOです。Prompt Pack（Claude/ChatGPT用プロンプト集、Gumroad販売）の
販売促進案を3つ提案してください。SNS戦略・LP改善・価格設定など。各提案は2-3行で。`,
  },
  game_ads: {
    role: 'CTO',
    task_type: 'mvp_spec',
    prompt: `あなたはゲーム開発CTOです。Puzzle Games（数独・ひらがなマッチ、AdSense収益）の
エンゲージメント改善案を3つ提案してください。ゲーム機能追加・UX改善・SEO対策など。各提案は2-3行で。`,
  },
}

// 横断CXOタスク（COO + CFO）— 全事業共通
const CROSS_CXO_TASKS = [
  {
    role: 'COO',
    task_type: 'ops_review',
    prompt: `あなたはLaunchpadのCOO（最高執行責任者）です。以下の3事業の運用状況をレビューしてください:
- AI Tool Lab (GitHub Pages, affiliate_seo)
- Prompt Pack (GitHub Pages + Gumroad, digital_product)
- Puzzle Games (GitHub Pages + AdSense, game_ads)

以下を日本語で報告:
1. デプロイ・ホスティングの課題（あれば）
2. 監視・アラートの改善提案
3. 次にやるべき運用タスク1つ`,
  },
  {
    role: 'CFO',
    task_type: 'budget_review',
    prompt: `あなたはLaunchpadのCFO（最高財務責任者）です。以下の3事業の収益化状況をレビューしてください:
- AI Tool Lab: Amazon Associates (tag=robocoop-ai-22)
- Prompt Pack: Gumroad販売 ($9/$7/$12の3商品)
- Puzzle Games: Google AdSense (審査待ち)

以下を日本語で報告:
1. 各チャネルの期待収益見込み（月額）
2. コスト構造（APIコスト、ホスティング）
3. 収益改善のための提案1つ`,
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
    return NextResponse.json({ message: 'スタートアップなし' })
  }

  const results = []
  let totalCost = 0

  // 事業別タスク（CMO / CTO）
  for (const startup of startups) {
    const task = BUSINESS_TASKS[startup.business_type]
    if (!task) continue

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: task.prompt }],
      system: `あなたはLaunchpadの${task.role}です。実行可能で具体的な提案を日本語で行います。`,
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    const costUsd = (response.usage.input_tokens / 1_000_000 * 3.0) + (response.usage.output_tokens / 1_000_000 * 15.0)
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

  // 横断タスク（COO / CFO）
  for (const task of CROSS_CXO_TASKS) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: task.prompt }],
      system: `あなたはLaunchpadの${task.role}です。実行可能で具体的な提案を日本語で行います。`,
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    const costUsd = (response.usage.input_tokens / 1_000_000 * 3.0) + (response.usage.output_tokens / 1_000_000 * 15.0)
    totalCost += costUsd

    // COO/CFOは全体担当なので代表startup_idを使用
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
