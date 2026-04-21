export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/client'

// task_type → エージェント
const TASK_AGENT: Record<string, { label: string; color: string; role: string }> = {
  pivot_analysis: { label: 'CEO', color: '#f59e0b', role: 'ceo' },
  mvp_spec: { label: 'CTO', color: '#3b82f6', role: 'cto' },
  market_research: { label: 'CMO', color: '#ec4899', role: 'cmo' },
  ops_review: { label: 'COO', color: '#f97316', role: 'coo' },
  budget_review: { label: 'CFO', color: '#22c55e', role: 'cfo' },
}

const TASK_LABELS: Record<string, string> = {
  pivot_analysis: 'Pivot Analysis',
  market_research: 'Market Research',
  mvp_spec: 'MVP Specification',
  pivot_decision: 'Pivot Decision',
  budget_review: 'Budget Review',
  ops_review: 'Operations Review',
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  affiliate_seo: { label: 'Affiliate SEO', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  digital_product: { label: 'Digital Product', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
  game_ads: { label: 'Game + Ads', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
}

const SITE_URLS: Record<string, string> = {
  'AI Tool Lab': 'https://robo-co-op.github.io/ai-tool-lab/',
  'Prompt Pack': 'https://robo-co-op.github.io/prompt-pack/',
  'Puzzle Games': 'https://robo-co-op.github.io/puzzle-games/',
}

async function getStartupData(id: string) {
  try {
    const supabase = createServiceClient()
    const [startupRes, experimentsRes, runsRes] = await Promise.all([
      supabase.from('startups').select('*').eq('id', id).single(),
      supabase
        .from('experiments')
        .select('*')
        .eq('startup_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('agent_runs')
        .select('*')
        .eq('startup_id', id)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    if (!startupRes.data) return null

    return {
      startup: startupRes.data,
      experiments: experimentsRes.data ?? [],
      runs: runsRes.data ?? [],
    }
  } catch {
    return null
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default async function StartupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getStartupData(id)

  if (!data) notFound()

  const { startup, experiments, runs } = data
  const typeConfig = TYPE_CONFIG[startup.business_type] || {
    label: startup.business_type,
    color: '#6b7280',
    bg: 'rgba(107, 114, 128, 0.1)',
  }
  const siteUrl = SITE_URLS[startup.name]

  // Kanban: experiments by status
  const kanban = {
    planned: experiments.filter((e: any) => e.status === 'planned'),
    running: experiments.filter((e: any) => e.status === 'running'),
    success: experiments.filter((e: any) => e.status === 'success'),
    failed: experiments.filter((e: any) => e.status === 'failed'),
  }

  const totalCost = runs.reduce((sum: number, r: any) => sum + Number(r.cost_usd || 0), 0)
  const runsByAgent: Record<string, number> = {}
  runs.forEach((r: any) => {
    if (!r.task_type) return
    runsByAgent[r.task_type] = (runsByAgent[r.task_type] || 0) + 1
  })

  return (
    <div className="flex flex-col min-h-0 overflow-auto">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-[#1c1c22] shrink-0">
        <Link
          href="/dashboard"
          className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          ← Mission Control
        </Link>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <h1 className="text-[18px] font-semibold tracking-tight">{startup.name}</h1>
          <span
            className="text-[10px] px-2 py-1 rounded-md font-medium"
            style={{ backgroundColor: typeConfig.bg, color: typeConfig.color }}
          >
            {typeConfig.label}
          </span>
          <span
            className={`text-[10px] px-2 py-1 rounded-md font-medium ${
              startup.status === 'active'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : startup.status === 'pivoted'
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}
          >
            {startup.status}
          </span>
          {siteUrl && (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5"
            >
              Visit Site
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
        {startup.description && (
          <p className="text-[12px] text-zinc-500 mt-2">{startup.description}</p>
        )}
      </div>

      <div className="flex-1 px-6 py-5 space-y-5">
        {/* メトリクスカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Experiments"
            value={experiments.length.toString()}
            detail={`${kanban.running.length} running`}
            color="green"
          />
          <MetricCard
            label="Agent Runs"
            value={runs.length.toString()}
            detail="last 30"
            color="blue"
          />
          <MetricCard
            label="Cost"
            value={`$${totalCost.toFixed(2)}`}
            detail="cumulative"
            color="purple"
          />
          <MetricCard
            label="Pivots"
            value={(startup.pivot_count || 0).toString()}
            detail={`${30 - (startup.pivot_count || 0)} left`}
            color="orange"
          />
        </div>

        {/* Experiment Kanban */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold">Experiment Board</h2>
            <span className="text-[10px] text-zinc-600 font-mono">{experiments.length} total</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <KanbanColumn
              title="Planned"
              count={kanban.planned.length}
              color="#6b7280"
              experiments={kanban.planned}
            />
            <KanbanColumn
              title="Running"
              count={kanban.running.length}
              color="#3b82f6"
              experiments={kanban.running}
              pulse
            />
            <KanbanColumn
              title="Success"
              count={kanban.success.length}
              color="#22c55e"
              experiments={kanban.success}
            />
            <KanbanColumn
              title="Failed"
              count={kanban.failed.length}
              color="#ef4444"
              experiments={kanban.failed}
            />
          </div>
        </div>

        {/* Agent activity breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {Object.entries(TASK_AGENT).map(([taskType, agent]) => {
            const count = runsByAgent[taskType] || 0
            return (
              <Link
                key={taskType}
                href={`/dashboard/agents/${agent.role}`}
                className="card p-3 flex items-center gap-2.5 hover:border-[#27272a] transition-colors group"
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: agent.color + '20', color: agent.color }}
                >
                  {agent.label}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-zinc-300 font-medium truncate group-hover:text-white transition-colors">
                    {count}
                  </p>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider">
                    {agent.label} runs
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Recent runs timeline */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold">Recent Activity</h2>
            <Link
              href="/dashboard/activity"
              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              View all →
            </Link>
          </div>
          {runs.length === 0 ? (
            <p className="text-[12px] text-zinc-600">No runs yet.</p>
          ) : (
            <div className="space-y-2">
              {runs.slice(0, 10).map((run: any, i: number) => {
                const agent = run.task_type ? TASK_AGENT[run.task_type] : null
                const taskLabel = run.task_type
                  ? TASK_LABELS[run.task_type] || run.task_type
                  : 'Unknown'
                const resultPreview = typeof run.result === 'string'
                  ? run.result.slice(0, 140).replace(/\n/g, ' ')
                  : ''
                return (
                  <details
                    key={run.id}
                    className="group border border-[#1c1c22] rounded-lg overflow-hidden hover:border-[#27272a] transition-colors"
                    style={{
                      animation: 'fadeIn 0.3s ease-out both',
                      animationDelay: `${i * 30}ms`,
                    }}
                  >
                    <summary className="px-3 py-2 cursor-pointer hover:bg-zinc-900/50 flex items-center gap-3 list-none">
                      {agent && (
                        <span
                          className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                          style={{
                            backgroundColor: agent.color + '20',
                            color: agent.color,
                          }}
                        >
                          {agent.label}
                        </span>
                      )}
                      <span className="text-[12px] text-zinc-300 font-medium">{taskLabel}</span>
                      {resultPreview && (
                        <span className="text-[10px] text-zinc-600 truncate flex-1 hidden md:block">
                          {resultPreview}...
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-700 font-mono shrink-0">
                        ${Number(run.cost_usd || 0).toFixed(4)}
                      </span>
                      <span className="text-[10px] text-zinc-700 font-mono w-14 text-right shrink-0">
                        {timeAgo(run.created_at)}
                      </span>
                    </summary>
                    <div className="px-3 py-3 border-t border-[#1c1c22] bg-zinc-950/50">
                      {run.result ? (
                        <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-auto">
                          {run.result}
                        </pre>
                      ) : (
                        <p className="text-[11px] text-zinc-600">No result captured.</p>
                      )}
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  detail,
  color,
}: {
  label: string
  value: string
  detail?: string
  color: 'green' | 'blue' | 'purple' | 'orange'
}) {
  const colorMap = {
    green: '#22c55e',
    blue: '#3b82f6',
    purple: '#a855f7',
    orange: '#f97316',
  }
  return (
    <div className="card p-4">
      <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-[20px] font-semibold tracking-tight" style={{ color: colorMap[color] }}>
        {value}
      </p>
      {detail && <p className="text-[10px] text-zinc-600 mt-1">{detail}</p>}
    </div>
  )
}

function KanbanColumn({
  title,
  count,
  color,
  experiments,
  pulse = false,
}: {
  title: string
  count: number
  color: string
  experiments: any[]
  pulse?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span
          className={`w-2 h-2 rounded-full ${pulse ? 'animate-pulse-dot' : ''}`}
          style={{ backgroundColor: color }}
        />
        <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
          {title}
        </span>
        <span className="text-[10px] text-zinc-600 font-mono ml-auto">{count}</span>
      </div>
      <div className="space-y-1.5 min-h-[60px]">
        {experiments.length === 0 ? (
          <div className="border border-dashed border-[#1c1c22] rounded-md h-16 flex items-center justify-center">
            <span className="text-[10px] text-zinc-700">empty</span>
          </div>
        ) : (
          experiments.map((exp) => (
            <div
              key={exp.id}
              className="border border-[#1c1c22] rounded-md p-2.5 bg-[#0a0a0c] hover:border-[#27272a] transition-colors"
              style={{ borderLeftWidth: '2px', borderLeftColor: color }}
            >
              <p className="text-[11px] text-zinc-300 leading-snug line-clamp-3">
                {exp.hypothesis}
              </p>
              {exp.metric && (
                <p className="text-[9px] text-zinc-600 mt-2 font-mono">
                  {exp.metric}
                  {exp.target_value ? ` → ${exp.target_value}` : ''}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
