import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BudgetExhaustedError } from '@/lib/agent/budgetDeduction'

// Mock Anthropic SDK — should not be called on pre-flight budget exhaustion
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: vi.fn() }
  },
}))

import { runAgent } from './harness'

function makeSupabase(budgetRow: { spent_usd: number; total_usd: number } | null): SupabaseClient {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: budgetRow,
            error: budgetRow === null ? { message: 'not found' } : null,
          }),
        })),
      })),
    })),
  } as unknown as SupabaseClient
}

const BASE_CONFIG = {
  userId: 'user-abc',
  startupId: 'startup-xyz',
  taskType: 'market_research' as const,
}

describe('runAgent — pre-flight budget check', () => {
  it('throws BudgetExhaustedError when spent_usd equals total_usd (zero remaining)', async () => {
    const supabase = makeSupabase({ spent_usd: 10.0, total_usd: 10.0 })

    await expect(runAgent(BASE_CONFIG, 'any prompt', supabase)).rejects.toThrow(
      BudgetExhaustedError
    )
  })

  it('throws BudgetExhaustedError when spent_usd exceeds total_usd (negative remaining)', async () => {
    const supabase = makeSupabase({ spent_usd: 15.0, total_usd: 10.0 })

    await expect(runAgent(BASE_CONFIG, 'any prompt', supabase)).rejects.toThrow(
      BudgetExhaustedError
    )
  })

  it('throws generic Error when budget row is not found', async () => {
    const supabase = makeSupabase(null)

    await expect(runAgent(BASE_CONFIG, 'any prompt', supabase)).rejects.toThrow(
      'Budget information not found'
    )
    await expect(runAgent(BASE_CONFIG, 'any prompt', supabase)).rejects.not.toThrow(
      BudgetExhaustedError
    )
  })
})
