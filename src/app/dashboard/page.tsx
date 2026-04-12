export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/client'
import StartupCard from '@/components/StartupCard'
import AgentActivityFeed from '@/components/AgentActivityFeed'

async function getDashboardData() {
  try {
    const supabase = createServiceClient()
    const [startupsRes, experimentsRes, runsRes, budgetRes] = await Promise.all([
      supabase.from('startups').select('id, name, status, business_type, experiment_count, pivot_count, created_at').order('created_at'),
      supabase.from('experiments').select('id, startup_id, hypothesis, metric, target_value, status, result, started_at, completed_at').order('created_at'),
      supabase.from('agent_runs').select('id, startup_id, model, task_type, cost_usd, created_at').order('created_at', { ascending: false }).limit(20),
      supabase.from('token_budgets').select('*').limit(1).single(),
    ])
    return {
      startups: startupsRes.data ?? [],
      experiments: experimentsRes.data ?? [],
      recentRuns: runsRes.data ?? [],
      budget: budgetRes.data ?? null,
    }
  } catch {
    return { startups: [], experiments: [], recentRuns: [], budget: null }
  }
}

export default async function DashboardPage() {
  const { startups, experiments, recentRuns, budget } = await getDashboardData()

  const startupNames: Record<string, string> = Object.fromEntries(
    startups.map((s: any) => [s.id, s.name])
  )

  const runningExps = experiments.filter((e: any) => e.status === 'running').length
  const successExps = experiments.filter((e: any) => e.status === 'success').length
  const failedExps = experiments.filter((e: any) => e.status === 'failed').length
  const totalCost = Number(budget?.spent_usd ?? 0)
  const budgetTotal = Number(budget?.total_usd ?? 500)
  const budgetPct = Math.min(100, Math.round((totalCost / budgetTotal) * 100))
  const earliestDate = startups[0]?.created_at
  const daysSinceStart = earliestDate
    ? Math.floor((Date.now() - new Date(earliestDate).getTime()) / 86400000)
    : 0
  const daysLeft = Math.max(0, 30 - daysSinceStart)

  // 直近5件のエージェント作業
  const recentAgentWork = recentRuns.slice(0, 5)

  return (
    <div className="flex flex-col min-h-0 overflow-auto">
      {/* ページヘッダー */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between shrink-0">
        <h1 className="text-base font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })}</span>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 space-y-6">

        {/* エージェントアクティビティカード (Paperclip風) */}
        {recentAgentWork.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Recent Agent Work</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentAgentWork.map((run: any) => (
                <div key={run.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-900/60 border border-purple-700/40 flex items-center justify-center text-xs">
                        {run.model?.includes('opus') ? '👑' : run.model?.includes('haiku') ? '⚡' : '🤖'}
                      </div>
                      <span className="text-xs font-medium text-white">
                        {run.model?.includes('opus') ? 'CEO' : run.model?.includes('haiku') ? 'Research' : 'CXO'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-600">
                      {new Date(run.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{run.task_type ?? 'タスク実行'}</p>
                  {run.cost_usd > 0 && (
                    <p className="text-xs text-gray-600 mt-1">${Number(run.cost_usd).toFixed(4)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Recent Agent Work</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {['CEO (Opus)', 'CMO (Sonnet)', 'CTO (Sonnet)'].map((agent) => (
                <div key={agent} className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm">
                    {agent.startsWith('CEO') ? '👑' : agent.startsWith('CMO') ? '📣' : '⚙️'}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400">{agent}</p>
                    <p className="text-xs text-gray-600">待機中</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Experiments Active</p>
            <p className="text-2xl font-bold text-green-400">{runningExps}</p>
            <p className="text-xs text-gray-600 mt-1">/ {experiments.length} total</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Tasks In Progress</p>
            <p className="text-2xl font-bold text-blue-400">{recentRuns.length}</p>
            <p className="text-xs text-gray-600 mt-1">{failedExps} failed</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Month Spend</p>
            <p className="text-2xl font-bold text-purple-400">${totalCost.toFixed(2)}</p>
            <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${budgetPct}%` }} />
            </div>
            <p className="text-xs text-gray-600 mt-1">{budgetPct}% of ${budgetTotal}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Days Remaining</p>
            <p className={`text-2xl font-bold ${daysLeft <= 7 ? 'text-red-400' : 'text-orange-400'}`}>{daysLeft}</p>
            <p className="text-xs text-gray-600 mt-1">Day {daysSinceStart} of 30</p>
          </div>
        </div>

        {/* スタートアップ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Startups</p>
            <span className="text-xs text-gray-600">{experiments.length} experiments total</span>
          </div>
          {startups.length === 0 ? (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-10 text-center">
              <p className="text-gray-500 text-sm">CCでオンボーディングを完了すると事業が表示されます</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {startups.map((startup: any) => (
                <StartupCard
                  key={startup.id}
                  startup={startup}
                  experiments={experiments.filter((e: any) => e.startup_id === startup.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 下段: 実験トラッカー + アクティビティ */}
        <div className="grid md:grid-cols-5 gap-4">
          {/* 実験トラッカー (3/5) */}
          <div className="md:col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Experiment Tracker</p>
              <span className="text-xs text-gray-600">{successExps} / 30 complete</span>
            </div>
            {/* 30マスグリッド */}
            <div className="grid grid-cols-10 gap-1.5 mb-4">
              {Array.from({ length: 30 }).map((_, i) => {
                const exp = experiments[i]
                return (
                  <div
                    key={i}
                    title={exp ? `#${i + 1}: ${exp.hypothesis?.slice(0, 50)}` : `実験 #${i + 1}`}
                    className={`aspect-square rounded ${
                      exp?.status === 'success' ? 'bg-green-500' :
                      exp?.status === 'running' ? 'bg-purple-500' :
                      exp?.status === 'failed' ? 'bg-red-800' :
                      'bg-gray-800'
                    }`}
                  />
                )
              })}
            </div>
            {/* 凡例 + 事業別 */}
            <div className="flex gap-4 text-xs text-gray-500 mb-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500" />Running</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500" />Success</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-800" />Failed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-800" />Pending</span>
            </div>
            <div className="space-y-2 border-t border-gray-800 pt-3">
              {startups.map((s: any) => {
                const exps = experiments.filter((e: any) => e.startup_id === s.id)
                const done = exps.filter((e: any) => e.status === 'success').length
                const running = exps.filter((e: any) => e.status === 'running').length
                return (
                  <div key={s.id} className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400 w-28 truncate shrink-0">{s.name}</span>
                    <div className="flex gap-0.5 flex-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={`h-2 flex-1 rounded-sm ${
                          exps[i]?.status === 'success' ? 'bg-green-500' :
                          exps[i]?.status === 'running' ? 'bg-purple-500' :
                          'bg-gray-800'
                        }`} />
                      ))}
                    </div>
                    <span className="text-gray-600 w-12 text-right">
                      {running > 0 ? <span className="text-purple-400">{running} run</span> : done > 0 ? <span className="text-green-400">{done} done</span> : '0/10'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* アクティビティフィード (2/5) */}
          <div className="md:col-span-2">
            <AgentActivityFeed runs={recentRuns} startupNames={startupNames} />
          </div>
        </div>
      </div>
    </div>
  )
}
