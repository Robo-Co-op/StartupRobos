import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deductBudget } from './budgetDeduction'

// Supabase クライアントのモックファクトリー
function makeSupabase(rpcResult: { data: unknown; error: unknown }): SupabaseClient {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
  } as unknown as SupabaseClient
}

describe('deductBudget', () => {
  it('RPC が数値を返した場合 { ok: true, remaining } を返す', async () => {
    const supabase = makeSupabase({ data: 500, error: null })

    const result = await deductBudget(supabase, 'user-123', 10)

    expect(result).toEqual({ ok: true, remaining: 500 })
    expect(supabase.rpc).toHaveBeenCalledWith('deduct_budget', {
      p_user_id: 'user-123',
      p_cost: 10,
    })
  })

  it('RPC が null を返した場合（残量不足）{ ok: false, remaining: null } を返す', async () => {
    const supabase = makeSupabase({ data: null, error: null })

    const result = await deductBudget(supabase, 'user-456', 9999)

    expect(result).toEqual({ ok: false, remaining: null })
  })

  it('RPC がエラーを返した場合 throw する', async () => {
    const supabase = makeSupabase({ data: null, error: { message: 'DB connection failed' } })

    await expect(deductBudget(supabase, 'user-789', 5)).rejects.toThrow('DB connection failed')
  })
})
