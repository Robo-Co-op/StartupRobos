import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/client'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Vercel Cron は Authorization: Bearer {CRON_SECRET} を送ってくる
function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // アクティブなスタートアップと直近の実験を取得
  const { data: startups } = await supabase
    .from('startups')
    .select('id, name, business_type, status')
    .eq('status', 'active')

  if (!startups?.length) {
    return NextResponse.json({ message: 'スタートアップなし' })
  }

  const { data: experiments } = await supabase
    .from('experiments')
    .select('startup_id, hypothesis, status, result')
    .in('startup_id', startups.map(s => s.id))
    .order('created_at', { ascending: false })

  // CEO向けコンテキスト構築
  const context = startups.map(s => {
    const exps = (experiments ?? []).filter(e => e.startup_id === s.id)
    const recent = exps.slice(0, 3).map(e => `- ${e.hypothesis} [${e.status}]`).join('\n')
    return `## ${s.name} (${s.business_type})\n直近の実験:\n${recent || 'なし'}`
  }).join('\n\n')

  const prompt = `あなたはLaunchpadのCEOです。以下の3つのスタートアップの状況を評価し、各事業の次のアクションを1つずつ日本語で提案してください。

${context}

各事業について:
1. 現状の課題（1行）
2. 次に試すべき実験（具体的に）
3. 優先度（High/Medium/Low）`

  const start = Date.now()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
    system: 'あなたは経験豊富なスタートアップCEOです。データに基づいて簡潔・具体的に判断します。',
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  const costUsd = (response.usage.input_tokens / 1_000_000 * 3.0) + (response.usage.output_tokens / 1_000_000 * 15.0)

  // 実行ログをSupabaseに保存
  await supabase.from('agent_runs').insert({
    startup_id: startups[0].id, // CEO は全体担当なので代表1件
    model: 'claude-sonnet-4-6',
    tokens_input: response.usage.input_tokens,
    tokens_output: response.usage.output_tokens,
    cost_usd: costUsd,
    task_type: 'pivot_analysis',
    result: content,
  })

  return NextResponse.json({
    ok: true,
    elapsed_ms: Date.now() - start,
    cost_usd: costUsd,
    assessment: content,
  })
}
