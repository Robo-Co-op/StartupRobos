const MODEL_LABELS: Record<string, string> = {
  'claude-opus-4-6': 'CEO (Opus)',
  'claude-sonnet-4-6': 'CXO (Sonnet)',
  'claude-haiku-4-5-20251001': 'Research (Haiku)',
}

const TASK_LABELS: Record<string, string> = {
  pivot_analysis: 'ピボット分析',
  market_research: '市場調査',
  mvp_spec: 'MVP仕様',
  pivot_decision: 'ピボット判断',
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
  if (mins < 1) return 'たった今'
  if (mins < 60) return `${mins}分前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}時間前`
  return `${Math.floor(hours / 24)}日前`
}

export default function AgentActivityFeed({ runs, startupNames }: AgentActivityFeedProps) {
  if (runs.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-400 mb-4">CXO アクティビティ</h3>
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
            <span className="text-gray-500 text-lg">⏳</span>
          </div>
          <p className="text-sm text-gray-500">CXOチーム待機中</p>
          <p className="text-xs text-gray-600">エージェント実行ログがここに表示されます</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4">CXO アクティビティ</h3>
      <div className="space-y-3">
        {runs.map((run) => (
          <div key={run.id} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-900/50 border border-purple-700/40 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs">🤖</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-white">
                  {run.model ? MODEL_LABELS[run.model] ?? run.model : 'Agent'}
                </span>
                {run.task_type && (
                  <span className="text-xs text-gray-500">
                    {TASK_LABELS[run.task_type] ?? run.task_type}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {run.startup_id && startupNames[run.startup_id] && (
                  <span className="text-xs text-gray-500 truncate">
                    {startupNames[run.startup_id]}
                  </span>
                )}
                <span className="text-xs text-gray-600">{timeAgo(run.created_at)}</span>
                {run.cost_usd != null && run.cost_usd > 0 && (
                  <span className="text-xs text-gray-600">${run.cost_usd.toFixed(4)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
