// LangSmith風 Waterfall Trace（spans テーブルなしでも run の時系列を視覚化）
// 現状は 1 run を表示するが、将来 spans[] を受け取って深さ別に積めるよう拡張可能

interface Span {
  id: string
  label: string
  role?: string
  color: string
  startedAt: string
  durationMs: number
  cost: number
  tokensIn?: number
  tokensOut?: number
  depth?: number
}

interface Props {
  runs: Array<{
    id: string
    task_type: string | null
    cost_usd: number | null
    created_at: string
    model?: string | null
  }>
  referenceEnd?: number  // 基準時刻（ms）
}

import { TASK_AGENT as TASK_AGENT_DEF } from '@/lib/agent/roles'

// WaterfallTrace 用: label を「役職 タスク名」の複合形式に変換
const TASK_AGENT = Object.fromEntries(
  Object.entries(TASK_AGENT_DEF).map(([k, v]) => [
    k,
    { label: `${v.label} ${v.taskLabel}`, color: v.color, role: v.role },
  ])
)

export default function WaterfallTrace({ runs, referenceEnd }: Props) {
  if (runs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[12px] text-zinc-600">ランデータなし</p>
      </div>
    )
  }

  // 時系列昇順にソート
  const sorted = [...runs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const startTime = new Date(sorted[0].created_at).getTime()
  const endTime = referenceEnd ?? new Date(sorted[sorted.length - 1].created_at).getTime() + 60_000
  const totalMs = Math.max(endTime - startTime, 1)

  // 各 run を span として表示（durationMs は便宜上、1分固定として可視化）
  const DEFAULT_DURATION = 60_000

  return (
    <div className="card p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-[0.08em]">
            Waterfall Trace
          </p>
          <p className="text-[10px] text-zinc-700 mt-0.5">
            {sorted.length} spans · {(totalMs / 1000 / 60 / 60 / 24).toFixed(1)}d range
          </p>
        </div>
        <span className="text-[10px] text-zinc-600 font-mono">
          ${sorted.reduce((s, r) => s + Number(r.cost_usd || 0), 0).toFixed(4)}
        </span>
      </div>

      {/* タイムルーラー */}
      <div className="relative h-5 mb-2 border-b border-[#1c1c22]">
        {Array.from({ length: 5 }).map((_, i) => {
          const ts = startTime + (totalMs * i) / 4
          const pct = (i / 4) * 100
          return (
            <div
              key={i}
              className="absolute top-0 text-[9px] text-zinc-700 font-mono"
              style={{ left: `${pct}%`, transform: i === 4 ? 'translateX(-100%)' : undefined }}
            >
              {new Date(ts).toISOString().slice(5, 16).replace('T', ' ')}
              <div className="absolute top-3 left-0 w-px h-2 bg-zinc-800" />
            </div>
          )
        })}
      </div>

      {/* スパン */}
      <div className="space-y-1">
        {sorted.map((run, i) => {
          const agent = run.task_type ? TASK_AGENT[run.task_type] : null
          const startAt = new Date(run.created_at).getTime()
          const offsetPct = ((startAt - startTime) / totalMs) * 100
          const widthPct = Math.max(0.5, (DEFAULT_DURATION / totalMs) * 100)

          return (
            <div
              key={run.id}
              className="relative h-6 group"
              style={{ animation: 'fadeIn 0.3s ease-out both', animationDelay: `${i * 20}ms` }}
            >
              {/* 左側ラベル */}
              <div className="absolute left-0 top-0 w-40 h-full flex items-center gap-1.5 pr-2 overflow-hidden shrink-0">
                {agent && (
                  <span
                    className="text-[9px] px-1 py-0.5 rounded font-bold shrink-0"
                    style={{ backgroundColor: agent.color + '20', color: agent.color }}
                  >
                    {agent.label.split(' ')[0]}
                  </span>
                )}
                <span className="text-[10px] text-zinc-500 truncate">
                  {agent?.label.split(' ').slice(1).join(' ') || run.task_type || 'task'}
                </span>
              </div>

              {/* バー */}
              <div className="ml-40 relative h-full">
                <div className="absolute inset-y-0 left-0 right-0 bg-zinc-900/20 rounded-sm" />
                <div
                  className="absolute top-1 bottom-1 rounded-sm transition-all group-hover:brightness-125"
                  style={{
                    left: `${offsetPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: agent?.color ?? '#71717a',
                    boxShadow: `0 0 6px ${agent?.color ?? '#71717a'}60`,
                    minWidth: '4px',
                  }}
                  title={`${new Date(run.created_at).toISOString()} · $${Number(run.cost_usd || 0).toFixed(4)}`}
                />
                {/* 右端にコスト */}
                <span
                  className="absolute top-0 h-full flex items-center text-[9px] text-zinc-600 font-mono pointer-events-none"
                  style={{ left: `calc(${offsetPct + widthPct}% + 4px)` }}
                >
                  ${Number(run.cost_usd || 0).toFixed(4)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
