export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/client'
import StartupCard from '@/components/StartupCard'
import AgentActivityFeed from '@/components/AgentActivityFeed'
import BurnDownGauge from '@/components/BurnDownGauge'
import CostSankey from '@/components/CostSankey'
import { TASK_AGENT } from '@/lib/agent/roles'

async function getDashboardData() {
  try {
    const supabase = createServiceClient()
    // 実費はagent_runsテーブルを直接集計する（token_budgetsは未同期のため信用しない）
    const [startupsRes, experimentsRes, runsRes, allRunsRes, budgetRes] = await Promise.all([
      supabase.from('startups').select('id, name, status, business_type, experiment_count, pivot_count, created_at').order('created_at'),
      supabase.from('experiments').select('id, startup_id, hypothesis, metric, target_value, status, result, started_at, completed_at').order('created_at'),
      supabase.from('agent_runs').select('id, startup_id, model, task_type, cost_usd, created_at').order('created_at', { ascending: false }).limit(20),
      supabase.from('agent_runs').select('task_type, startup_id, cost_usd, created_at'),
      supabase.from('token_budgets').select('*').limit(1).maybeSingle(),
    ])

    // 月初からの合計で当月支出を計算
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const allRuns = allRunsRes.data ?? []
    const monthSpend = allRuns
      .filter((r: any) => r.created_at >= monthStart)
      .reduce((sum: number, r: any) => sum + Number(r.cost_usd || 0), 0)
    const totalSpend = allRuns
      .reduce((sum: number, r: any) => sum + Number(r.cost_usd || 0), 0)
    const budgetTotal = Number(budgetRes.data?.total_usd ?? 500)

    return {
      startups: startupsRes.data ?? [],
      experiments: experimentsRes.data ?? [],
      recentRuns: runsRes.data ?? [],
      allRuns,
      monthSpend,
      totalSpend,
      budgetTotal,
      totalRuns: allRuns.length,
    }
  } catch {
    return { startups: [], experiments: [], recentRuns: [], allRuns: [], monthSpend: 0, totalSpend: 0, budgetTotal: 500, totalRuns: 0 }
  }
}

export default async function DashboardPage() {
  const { startups, experiments, recentRuns, allRuns, monthSpend, totalSpend, budgetTotal, totalRuns } = await getDashboardData()

  const startupNames: Record<string, string> = Object.fromEntries(
    startups.map((s: any) => [s.id, s.name])
  )

  const runningExps = experiments.filter((e: any) => e.status === 'running').length
  const successExps = experiments.filter((e: any) => e.status === 'success').length
  const failedExps = experiments.filter((e: any) => e.status === 'failed').length
  const budgetPct = Math.min(100, Math.round((monthSpend / budgetTotal) * 100))
  const earliestDate = startups[0]?.created_at
  const daysSinceStart = earliestDate
    ? Math.floor((Date.now() - new Date(earliestDate).getTime()) / 86400000)
    : 0
  const daysLeft = Math.max(0, 30 - daysSinceStart)

  const recentAgentWork = recentRuns.slice(0, 5)

  return (
    <div className="flex flex-col min-h-0 overflow-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1c1c22] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[11px] text-zinc-600 mt-0.5">Autonomous operations of 3 businesses</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-600">
          <Link href="/dashboard/heartbeats" className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
            Next heartbeat: {(() => {
              const now = new Date()
              const ceoNext = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
              if (ceoNext <= now) ceoNext.setUTCDate(ceoNext.getUTCDate() + 1)
              const cxoNext = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0))
              if (cxoNext <= now) cxoNext.setUTCDate(cxoNext.getUTCDate() + 1)
              const next = ceoNext < cxoNext ? ceoNext : cxoNext
              const who = ceoNext < cxoNext ? 'CEO' : 'CxO'
              const mins = Math.floor((next.getTime() - now.getTime()) / 60000)
              const h = Math.floor(mins / 60)
              const m = mins % 60
              return `${who} in ${h}h ${m}m`
            })()}
          </Link>
          <span className="text-zinc-700">|</span>
          <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC</span>
        </div>
      </div>

      <div className="flex-1 px-6 py-5 space-y-5">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            label="Experiments"
            value={runningExps.toString()}
            sub={`${experiments.length} total`}
            color="green"
            detail={successExps > 0 ? `${successExps} success` : undefined}
          />
          <KPICard
            label="Agent Runs"
            value={totalRuns.toString()}
            sub={failedExps > 0 ? `${failedExps} failed exp` : 'all good'}
            color="blue"
          />
          <KPICard
            label="Month Spend"
            value={`$${monthSpend.toFixed(2)}`}
            sub={`${budgetPct}% of $${budgetTotal} · $${totalSpend.toFixed(2)} total`}
            color="purple"
            progress={budgetPct}
          />
          <KPICard
            label="Days Left"
            value={daysLeft.toString()}
            sub={`Day ${daysSinceStart} of 30`}
            color={daysLeft <= 7 ? 'red' : 'orange'}
          />
        </div>

        {/* Burn-Down Gauge + Cost Sankey */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div>
            <BurnDownGauge
              spent={monthSpend}
              budget={budgetTotal}
              dayOfMonth={new Date().getUTCDate()}
              daysInMonth={new Date(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0).getUTCDate()}
            />
          </div>
          <div className="lg:col-span-2">
            <CostSankey
              runs={allRuns}
              startupNames={startupNames}
              height={220}
            />
          </div>
        </div>

        {/* Agent Work */}
        <section>
          <SectionHeader title="Recent Agent Work" count={recentAgentWork.length} />
          {recentAgentWork.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {recentAgentWork.map((run: any, i: number) => {
                const mapped = run.task_type ? TASK_AGENT[run.task_type] : undefined
                const agent = mapped ?? {
                  label: 'Agent',
                  color: '#71717a',
                  role: '',
                  taskLabel: run.task_type?.replace(/_/g, ' ') ?? 'Task',
                }
                const startupName = run.startup_id ? startupNames[run.startup_id] : null
                return (
                  <Link
                    key={run.id}
                    href={agent.role ? `/dashboard/agents/${agent.role}` : '#'}
                    className="card p-3.5 animate-fade-in hover:border-[#27272a] transition-colors group"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: agent.color + '20', color: agent.color }}
                        >
                          {agent.label}
                        </div>
                        <span className="text-[12px] font-medium text-zinc-300 group-hover:text-white transition-colors">
                          {agent.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-700 font-mono">
                        {new Date(run.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{agent.taskLabel}</p>
                    {startupName && (
                      <p className="text-[10px] text-zinc-600 mt-0.5 truncate">· {startupName}</p>
                    )}
                    {run.cost_usd > 0 && (
                      <p className="text-[10px] text-zinc-700 mt-1 font-mono">${Number(run.cost_usd).toFixed(4)}</p>
                    )}
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'CEO', model: 'Opus', color: '#f59e0b' },
                { label: 'CMO', model: 'Sonnet', color: '#ec4899' },
                { label: 'CTO', model: 'Sonnet', color: '#3b82f6' },
              ].map((agent) => (
                <div key={agent.label} className="card border-dashed p-3.5 flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: agent.color + '15', color: agent.color }}
                  >
                    {agent.label[0]}
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-zinc-500">{agent.label}</p>
                    <p className="text-[10px] text-zinc-700">待機中</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Startups */}
        <section>
          <SectionHeader title="Startups" detail={`${experiments.length} experiments total`} />
          {startups.length === 0 ? (
            <div className="card border-dashed p-10 text-center">
              <p className="text-zinc-600 text-[13px]">Businesses appear after onboarding in the agent console</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-3">
              {startups.map((startup: any) => (
                <StartupCard
                  key={startup.id}
                  startup={startup}
                  experiments={experiments.filter((e: any) => e.startup_id === startup.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Bottom: Experiment Tracker + Activity */}
        <div className="grid md:grid-cols-5 gap-3">
          {/* Experiment Tracker – 実際の実験数ベースで可視化 */}
          <div className="md:col-span-3 card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-[0.08em]">Experiment Tracker</p>
              <span className="text-[11px] text-zinc-600 font-mono">
                {runningExps} running · {successExps} done · {experiments.length} total
              </span>
            </div>
            {/* 実験リスト（空状態は non-misleading） */}
            {experiments.length === 0 ? (
              <div className="border border-dashed border-[#1c1c22] rounded-md py-8 flex flex-col items-center gap-1.5">
                <p className="text-[11px] text-zinc-600">No experiments yet</p>
                <p className="text-[10px] text-zinc-700">CXO team will propose hypotheses during next heartbeat</p>
              </div>
            ) : (
              <div className="space-y-1.5 mb-3">
                {experiments.map((exp: any) => {
                  const sName = exp.startup_id ? startupNames[exp.startup_id] : null
                  const statusColor =
                    exp.status === 'success' ? '#22c55e' :
                    exp.status === 'running' ? '#a855f7' :
                    exp.status === 'failed' ? '#ef4444' :
                    '#6b7280'
                  return (
                    <Link
                      key={exp.id}
                      href={exp.startup_id ? `/dashboard/startups/${exp.startup_id}` : '#'}
                      className="flex items-center gap-3 px-3 py-2 rounded-md border border-[#1c1c22] hover:border-[#27272a] hover:bg-zinc-900/30 transition-colors group"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${exp.status === 'running' ? 'animate-pulse-dot' : ''}`}
                        style={{ backgroundColor: statusColor }}
                      />
                      <span className="text-[11px] text-zinc-300 line-clamp-1 flex-1 group-hover:text-white transition-colors">
                        {exp.hypothesis}
                      </span>
                      {sName && (
                        <span className="text-[10px] text-zinc-600 shrink-0 truncate max-w-[80px]">{sName}</span>
                      )}
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase shrink-0"
                        style={{ backgroundColor: statusColor + '20', color: statusColor }}
                      >
                        {exp.status}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
            {/* Business progress summary */}
            <div className="space-y-2 border-t border-[#1c1c22] pt-3">
              {startups.map((s: any) => {
                const exps = experiments.filter((e: any) => e.startup_id === s.id)
                const done = exps.filter((e: any) => e.status === 'success').length
                const running = exps.filter((e: any) => e.status === 'running').length
                const total = exps.length || 1
                const donePct = (done / total) * 100
                const runningPct = (running / total) * 100
                return (
                  <div key={s.id} className="flex items-center gap-3 text-[11px]">
                    <Link href={`/dashboard/startups/${s.id}`} className="text-zinc-400 hover:text-zinc-200 w-24 truncate shrink-0 transition-colors">
                      {s.name}
                    </Link>
                    <div className="flex-1 h-[6px] bg-zinc-800/50 rounded-sm overflow-hidden flex">
                      <div className="bg-green-500/70 h-full transition-all" style={{ width: `${donePct}%` }} />
                      <div className="bg-purple-500/70 h-full transition-all" style={{ width: `${runningPct}%` }} />
                    </div>
                    <span className="text-zinc-700 w-14 text-right font-mono text-[10px]">
                      {running > 0 ? <span className="text-purple-400">{running} run</span> : done > 0 ? <span className="text-green-400">{done} done</span> : `0/${exps.length}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="md:col-span-2">
            <AgentActivityFeed runs={recentRuns} startupNames={startupNames} />
          </div>
        </div>
      </div>
    </div>
  )
}

// KPI Card Component
function KPICard({ label, value, sub, color, progress, detail }: {
  label: string
  value: string
  sub: string
  color: 'green' | 'blue' | 'purple' | 'red' | 'orange'
  progress?: number
  detail?: string
}) {
  const colorMap = {
    green: { text: 'text-emerald-400', glow: 'shadow-emerald-500/5' },
    blue: { text: 'text-blue-400', glow: 'shadow-blue-500/5' },
    purple: { text: 'text-purple-400', glow: 'shadow-purple-500/5' },
    red: { text: 'text-red-400', glow: 'shadow-red-500/5' },
    orange: { text: 'text-amber-400', glow: 'shadow-amber-500/5' },
  }
  const c = colorMap[color]

  return (
    <div className={`card p-4 ${c.glow}`}>
      <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-xl font-bold tracking-tight ${c.text}`}>{value}</p>
      {progress !== undefined && (
        <div className="mt-2 h-[3px] bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500/70 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[10px] text-zinc-700">{sub}</p>
        {detail && <p className="text-[10px] text-emerald-600">{detail}</p>}
      </div>
    </div>
  )
}

// Section Header
function SectionHeader({ title, count, detail }: { title: string; count?: number; detail?: string }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-[0.08em]">{title}</p>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {detail && <span className="text-[10px] text-zinc-700">{detail}</span>}
    </div>
  )
}
