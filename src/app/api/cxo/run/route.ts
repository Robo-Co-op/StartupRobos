import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/client'
import { maskPII } from '@/lib/security/piiMasker'
import { runCouncil } from '@/lib/agent/council'

// レート制限: CXO会議は重いので 3回/分/ユーザー
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

const requestSchema = z.object({
  startupId: z.string().uuid(),
  agenda: z.string().min(10).max(2000),
})

// TODO: Add API key auth for Mission Control
export async function POST(req: NextRequest) {
  // レート制限チェック (3回/分) — using IP-based limiting for now
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'CXO会議は1分間に3回までです' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '入力値が無効です', details: parsed.error.issues }, { status: 400 })
  }

  const { startupId, agenda } = parsed.data
  const supabaseService = createServiceClient()

  // スタートアップ取得 + コンテキスト
  const { data: startup } = await supabaseService
    .from('startups')
    .select('id, user_id, name, description, status, pivot_count')
    .eq('id', startupId)
    .single()

  if (!startup) {
    return NextResponse.json({ error: 'スタートアップが見つかりません' }, { status: 404 })
  }

  const startupContext = [
    `会社名: ${startup.name}`,
    startup.description ? `説明: ${startup.description}` : '',
    `ステータス: ${startup.status}`,
    `ピボット数: ${startup.pivot_count} / 30`,
  ].filter(Boolean).join('\n')

  const sanitizedAgenda = maskPII(agenda)

  try {
    const result = await runCouncil(
      startup.user_id ?? 'anonymous',
      startupId,
      startupContext,
      sanitizedAgenda,
      supabaseService
    )
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'CXO会議でエラーが発生しました'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
