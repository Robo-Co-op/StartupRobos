export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/client'
import StartupCard from '@/components/StartupCard'
import AgentActivityFeed from '@/components/AgentActivityFeed'
import BudgetGauge from '@/components/BudgetGauge'

async function getDashboardData() {
  try {
    const supabase = createServiceClient()
    const [startupsRes, experimentsRes, runsRes, budgetRes] = await Promise.all([
      supabase.from('startups').select('id, name, status, business_type, experiment_count, pivot_count, created_at').order('created_at'),
      supabase.from('experiments').select('id, startup_id, hypothesis, metric, target_value, status, result, started_at, completed_at').order('created_at'),
      supabase.from('agent_runs').select('id, startup_id, model, task_type, cost_usd, created_at').order('created_at', { ascending: false }).limit(10),
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
  const totalCost = budget?.spent_usd ?? 0
  const earliestDate = startups[0]?.created_at
  const daysSinceStart = earliestDate
    ? Math.floor((Date.now() - new Date(earliestDate).getTime()) / 86400000)
    : 0

  const stats = [
    { label: '実験中', value: runningExps, sub: `/ ${experiments.length} 実験`, color: 'text-green-400' },
    { label: '完了実験', value: successExps, sub: experiments.length > 0 ? `成功 ${Math.round(successExps / experiments.length * 100)}%` : '-', color: 'text-blue-400' },
    { label: '今月コスト', value: `$${Number(totalCost).toFixed(2)}`, sub: budget ? `/ $${Number(budget.total_usd).toFixed(0)} 予算` : '予算未設定', color: 'text-purple-400' },
    { label: '稼働日数', value: `${daysSinceStart}日`, sub: `残り ${Math.max(0, 30 - daysSinceStart)}日`, color: 'text-orange-400' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">🚀 Launchpad Mission Control</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            最終更新: {new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/budget" className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500">
            予算詳細
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-900/20 border border-green-800/40 px-3 py-1.5 rounded-lg">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            稼働中
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-600 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* 3事業カード */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">スタートアップ</h2>
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

        {/* 実験進捗 + CXOアクティビティ */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-4">実験トラッカー (30実験)</h3>
            <div className="grid grid-cols-10 gap-1 mb-4">
              {Array.from({ length: 30 }).map((_, i) => {
                const exp = experiments[i]
                return (
                  <div
                    key={i}
                    title={exp ? `#${i + 1}: ${exp.hypothesis?.slice(0, 40)}` : `実験 #${i + 1}`}
                    className={`w-5 h-5 rounded-sm ${
                      exp?.status === 'success' ? 'bg-green-500' :
                      exp?.status === 'running' ? 'bg-purple-500' :
                      exp?.status === 'failed' ? 'bg-red-700' :
                      'bg-gray-800'
                    }`}
                  />
                )
              })}
            </div>
            <div className="space-y-2">
              {startups.map((s: any) => {
                const exps = experiments.filter((e: any) => e.startup_id === s.id)
                const done = exps.filter((e: any) => e.status === 'success').length
                const running = exps.filter((e: any) => e.status === 'running').length
                return (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 truncate max-w-[140px]">{s.name}</span>
                    <div className="flex items-center gap-2">
                      {running > 0 && <span className="text-purple-400">{running} 実行中</span>}
                      {done > 0 && <span className="text-green-400">{done} 完了</span>}
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} className={`w-3 h-3 rounded-sm ${
                            exps[i]?.status === 'success' ? 'bg-green-500' :
                            exps[i]?.status === 'running' ? 'bg-purple-500' :
                            'bg-gray-700'
                          }`} />
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <AgentActivityFeed runs={recentRuns} startupNames={startupNames} />
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col items-center">
              <p className="text-xs text-gray-500 mb-3">AIトークン予算</p>
              {budget ? (
                <BudgetGauge spentUsd={Number(budget.spent_usd)} totalUsd={Number(budget.total_usd)} />
              ) : (
                <p className="text-sm text-gray-600">予算未設定</p>
              )}
            </div>
          </div>
        </div>

        {/* 公開サイトリンク */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">公開サイト</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { name: 'AI Tool Lab', url: 'https://robo-co-op.github.io/ai-tool-lab/', type: 'Affiliate / SEO', color: 'text-blue-400' },
              { name: 'Prompt Pack', url: 'https://robo-co-op.github.io/prompt-pack/', type: 'Digital Product', color: 'text-purple-400' },
              { name: 'Puzzle Games', url: 'https://robo-co-op.github.io/puzzle-games/', type: 'Game + Ads', color: 'text-green-400' },
            ].map((site) => (
              <a
                key={site.url}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 flex items-center justify-between group transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">{site.name}</p>
                  <p className={`text-xs ${site.color} mt-0.5`}>{site.type}</p>
                </div>
                <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
