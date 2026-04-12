import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/client'

export async function GET() {
  const supabase = createServiceClient()

  const [startupsRes, experimentsRes, runsRes, budgetRes] = await Promise.all([
    supabase
      .from('startups')
      .select('id, name, status, business_type, experiment_count, pivot_count, created_at')
      .order('created_at'),
    supabase
      .from('experiments')
      .select('id, startup_id, hypothesis, metric, target_value, status, result, started_at, completed_at')
      .order('created_at'),
    supabase
      .from('agent_runs')
      .select('id, startup_id, model, task_type, cost_usd, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('token_budgets')
      .select('*')
      .limit(1)
      .single(),
  ])

  return NextResponse.json({
    startups: startupsRes.data || [],
    experiments: experimentsRes.data || [],
    recentRuns: runsRes.data || [],
    budget: budgetRes.data || null,
  })
}
