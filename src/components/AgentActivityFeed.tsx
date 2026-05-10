import { timeAgo } from '@/lib/timeAgo'
import { TASK_AGENT } from '@/lib/agent/roles'

// task_typeごとに役職を分離する（model単位だとSonnet勢がまとまってしまう）

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


export default function AgentActivityFeed({ runs, startupNames }: AgentActivityFeedProps) {
  if (runs.length === 0) {
    return (
      <div className="card p-5 h-full">
        <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.08em] mb-4">Activity</h3>
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <span className="text-zinc-600 text-sm">~</span>
          </div>
          <p className="text-[12px] text-zinc-600">CXO team on standby</p>
          <p className="text-[10px] text-zinc-700">Execution logs will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5 h-full flex flex-col">
      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.08em] mb-4">Activity</h3>
      <div className="space-y-0.5 flex-1 overflow-y-auto">
        {runs.map((run, i) => {
          const mapped = run.task_type ? TASK_AGENT[run.task_type] : undefined
          const agent = mapped ?? {
            label: 'Agent',
            color: '#71717a',
            taskLabel: run.task_type?.replace(/_/g, ' ') ?? 'Task',
          }
          return (
            <div
              key={run.id}
              className="flex items-start gap-2.5 py-2 border-b border-[#1c1c22] last:border-0 animate-fade-in"
              style={{
                animationDelay: `${i * 30}ms`,
                opacity: Math.max(0.3, 1 - i * 0.06),
              }}
            >
              {/* Timeline dot */}
              <div className="relative mt-1.5">
                <div
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ backgroundColor: agent.color }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: agent.color }}
                  >
                    {agent.label}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {agent.taskLabel}
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

              {/* Right: Time + Cost */}
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
