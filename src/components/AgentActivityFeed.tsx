const AGENT_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  'claude-opus-4-6': { label: 'CEO', color: '#f59e0b', icon: 'C' },
  'claude-sonnet-4-6': { label: 'CXO', color: '#a855f7', icon: 'S' },
  'claude-haiku-4-5-20251001': { label: 'Research', color: '#06b6d4', icon: 'R' },
}

const TASK_LABELS: Record<string, string> = {
  pivot_analysis: 'ピボット分析',
  market_research: '市場調査',
  mvp_spec: 'MVP仕様',
  pivot_decision: 'ピボット判断',
  budget_review: '予算レビュー',
  ops_review: 'Ops レビュー',
}

interface AgentRun {
  id: string
  startup_id: string | null
  model: string | null
  task_type: string | null
  cost_usd: number | null
  created_at: string
}

interface AgentActivityFeedProps {
  runs: AgentRun[]
  startupNames: Record<string, string>
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export default function AgentActivityFeed({ runs, startupNames }: AgentActivityFeedProps) {
  if (runs.length === 0) {
    return (
      <div className="card p-5 h-full">
        <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.08em] mb-4">Activity</h3>
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <span className="text-zinc-600 text-sm">~</span>
          </div>
          <p className="text-[12px] text-zinc-600">CXOチーム待機中</p>
          <p className="text-[10px] text-zinc-700">実行ログがここに表示されます</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5 h-full flex flex-col">
      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.08em] mb-4">Activity</h3>
      <div className="space-y-0.5 flex-1 overflow-y-auto">
        {runs.map((run, i) => {
          const agent = run.model ? AGENT_CONFIG[run.model] ?? { label: 'Agent', color: '#71717a', icon: 'A' } : { label: 'Agent', color: '#71717a', icon: 'A' }
          return (
            <div
              key={run.id}
              className="flex items-start gap-2.5 py-2 border-b border-[#1c1c22] last:border-0 animate-fade-in"
              style={{
                animationDelay: `${i * 30}ms`,
                opacity: Math.max(0.3, 1 - i * 0.06),
              }}
            >
              {/* タイムラインドット */}
              <div className="relative mt-1.5">
                <div
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ backgroundColor: agent.color }}
                />
              </div>

              {/* コンテンツ */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: agent.color }}
                  >
                    {agent.label}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {run.task_type ? (TASK_LABELS[run.task_type] ?? run.task_type.replace(/_/g, ' ')) : 'タスク'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {run.startup_id && startupNames[run.startup_id] && (
                    <span className="text-[10px] text-zinc-700 truncate">
                      {startupNames[run.startup_id]}
                    </span>
                  )}
                </div>
              </div>

              {/* 右: 時間 + コスト */}
              <div className="text-right shrink-0">
                <span className="text-[10px] text-zinc-700 font-mono">{timeAgo(run.created_at)}</span>
                {run.cost_usd != null && run.cost_usd > 0 && (
                  <p className="text-[9px] text-zinc-800 font-mono">${run.cost_usd.toFixed(4)}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
