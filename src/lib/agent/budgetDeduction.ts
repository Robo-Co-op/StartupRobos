// アトミックなトークン予算控除
// Postgres RPC `deduct_budget` を呼び出し、TOCTOU 競合を排除する
//
// 成功: { ok: true, remaining: number }
// 残量不足（RPC が NULL を返した場合）: { ok: false, remaining: null }
// Supabase エラー: throw

import type { SupabaseClient } from '@supabase/supabase-js'

export async function deductBudget(
  supabase: SupabaseClient,
  userId: string,
  cost: number
): Promise<{ ok: boolean; remaining: number | null }> {
  const { data, error } = await supabase.rpc('deduct_budget', {
    p_user_id: userId,
    p_cost: cost,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (typeof data !== 'number') {
    // 残量不足（NULL返却）または予期しない型: 更新対象行なし
    return { ok: false, remaining: null }
  }

  return { ok: true, remaining: data }
}
