import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/client'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

// 事業タイプ別のCXOタスク定義
const CXO_TASKS: Record<string, { role: string; prompt: string }> = {
  affiliate_seo: {
    role: 'CMO',
    prompt: `あなたはSEO専門のCMOです。AI Tool Lab（日本語AIツール紹介サイト）の集客改善案を3つ提案してください。
キーワード戦略・記事タイトル案・内部リンク改善など具体的に。各提案は2-3行で。`,
  },
  digital_product: {
    role: 'CMO',
    prompt: `あなたはデジタル商品専門のCMOです。Prompt Pack（Claude/ChatGPT用プロンプト集、Gumroad販売）の
販売促進案を3つ提案してください。SNS戦略・LP改善・価格設定など。各提案は2-3行で。`,
  },
  game_ads: {
    role: 'CTO',
    prompt: `あなたはゲーム開発CTOです。Puzzle Games（数独・ひらがなマッチ、AdSense収益）の
エンゲージメント改善案を3つ提案してください。ゲーム機能追加・UX改善・SEO対策など。各提案は2-3行で。`,
  },
}

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

  for (const startup of startups) {
    const task = CXO_TASKS[startup.business_type]
    if (!task) continue

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: task.prompt }],
      system: `あなたは${task.role}です。実行可能で具体的な提案を日本語で行います。`,
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
      task_type: 'market_research',
      result: content,
    })

    results.push({ startup: startup.name, role: task.role, suggestions: content })
  }

  return NextResponse.json({ ok: true, total_cost_usd: totalCost, results })
}
