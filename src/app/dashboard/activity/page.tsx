'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/timeAgo'
import { TASK_AGENT } from '@/lib/agent/roles'

interface Run {
  id: string
  startup_id: string | null
  model: string | null
  task_type: string | null
  cost_usd: number | null
  created_at: string
  result?: string | null
}

interface Startup {
  id: string
  name: string
}

export default function ActivityPage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [startups, setStartups] = useState<Record<string, Startup>>({})
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const supabase = getSupabaseClient()

    // 初期データ読み込み
    const loadInitial = async () => {
      const [runsRes, startupsRes] = await Promise.all([
        supabase
          .from('agent_runs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('startups').select('id, name'),
      ])
      if (!mountedRef.current) return
      setRuns(runsRes.data ?? [])
      setStartups(
        Object.fromEntries(
          (startupsRes.data ?? []).map((s: any) => [s.id, s])
        )
      )
      setLoading(false)
    }
    loadInitial()

    // Supabase realtime subscription
    const channel = supabase
      .channel('agent_runs_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_runs' },
        (payload) => {
          if (!mountedRef.current) return
          const newRun = payload.new as Run
          setRuns((prev) => [newRun, ...prev].slice(0, 100))
          setNewIds((prev) => new Set([...prev, newRun.id]))
          // 3秒後にハイライト解除
          setTimeout(() => {
            if (!mountedRef.current) return
            setNewIds((prev) => {
              const next = new Set(prev)
              next.delete(newRun.id)
              return next
            })
          }, 3000)
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return
        setIsLive(status === 'SUBSCRIBED')
      })

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [])

  // 1秒ごとに時刻表示を更新するためのタイマー
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  const totalCost = runs.reduce((sum, r) => sum + Number(r.cost_usd || 0), 0)

  return (
    <div className="flex flex-col min-h-0 overflow-auto">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-[#1c1c22] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight">Live Activity</h1>
          <p className="text-[11px] text-zinc-600 mt-0.5">Real-time agent run stream</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${
              isLive
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-zinc-800/50 text-zinc-500 border-zinc-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive ? 'bg-green-500 animate-pulse-dot' : 'bg-zinc-600'
              }`}
            />
            {isLive ? 'LIVE' : 'Connecting...'}
          </span>
          <span className="text-zinc-600 font-mono">
            {runs.length} runs · ${totalCost.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex-1 px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-[12px] text-zinc-600 animate-pulse">Loading stream...</div>
          </div>
        ) : runs.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-[12px] text-zinc-600">
              まだエージェント実行なし。次のheartbeatを待機中...
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {runs.map((run, i) => {
              const agent = run.task_type ? TASK_AGENT[run.task_type] : null
              const startup = run.startup_id ? startups[run.startup_id] : null
              const taskLabel = agent?.taskLabel ?? run.task_type ?? 'Unknown'
              const isNew = newIds.has(run.id)

              return (
                <div
                  key={run.id}
                  className={`group border rounded-lg px-3 py-2.5 transition-all ${
                    isNew
                      ? 'border-purple-500/50 bg-purple-500/5 animate-glow'
                      : 'border-[#1c1c22] hover:border-[#27272a] hover:bg-zinc-900/30'
                  }`}
                  style={{
                    animation: i < 20 ? 'fadeIn 0.3s ease-out both' : undefined,
                    animationDelay: `${Math.min(i, 20) * 20}ms`,
                    opacity: Math.max(0.4, 1 - (i / 100) * 0.6),
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Agent badge */}
                    {agent ? (
                      <Link
                        href={`/dashboard/agents/${agent.role}`}
                        className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-105"
                        style={{
                          backgroundColor: agent.color + '20',
                          color: agent.color,
                        }}
                      >
                        {agent.label}
                      </Link>
                    ) : (
                      <div className="shrink-0 w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                        ?
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[12px] text-zinc-200 font-medium truncate">
                          {taskLabel}
                        </span>
                        {startup ? (
                          <Link
                            href={`/dashboard/startups/${startup.id}`}
                            className="text-[11px] text-zinc-500 hover:text-zinc-300"
                          >
                            · {startup.name}
                          </Link>
                        ) : run.startup_id ? (
                          <span className="text-[11px] text-zinc-600">· Portfolio</span>
                        ) : null}
                        {isNew && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold animate-pulse-dot">
                            NEW
                          </span>
                        )}
                      </div>
                      {run.result && (
                        <p className="text-[10px] text-zinc-600 truncate mt-0.5">
                          {typeof run.result === 'string'
                            ? run.result.replace(/\n/g, ' ').slice(0, 120)
                            : ''}
                        </p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="shrink-0 flex items-center gap-3 text-[10px] font-mono">
                      <span className="text-zinc-600">
                        ${Number(run.cost_usd || 0).toFixed(4)}
                      </span>
                      <span className="text-zinc-700 w-14 text-right">
                        {timeAgo(run.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
