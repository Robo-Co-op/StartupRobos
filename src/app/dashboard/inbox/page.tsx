export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/timeAgo'
import { TASK_AGENT } from '@/lib/agent/roles'

// Agent Inbox: 人間承認待ちのタスクをGmail風のリストで集約
// 現状 experiments の pivoted/failed を approval対象として表示
// 将来は approvals テーブルを追加して明示的に管理


async function getInboxItems() {
  try {
    const supabase = createServiceClient()
    const [runsRes, experimentsRes, startupsRes] = await Promise.all([
      // CEOの最新 pivot_analysis は高優先度レビュー対象
      supabase
        .from('agent_runs')
        .select('*')
        .eq('task_type', 'pivot_analysis')
        .order('created_at', { ascending: false })
        .limit(10),
      // 失敗・ピボット検討の実験
      supabase
        .from('experiments')
        .select('*')
        .in('status', ['failed', 'pivoted'])
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('startups').select('id, name'),
    ])

    const startupMap = Object.fromEntries((startupsRes.data ?? []).map((s: any) => [s.id, s]))

    type InboxItem = {
      id: string
      kind: 'pivot_review' | 'experiment_review' | 'budget_alert'
      priority: 'high' | 'medium' | 'low'
      title: string
      description: string
      agentLabel?: string
      agentColor?: string
      startupName?: string
      createdAt: string
      actionLabel: string
      href?: string
    }

    const items: InboxItem[] = []

    // CEOの pivot_analysis レポートは review対象
    ;(runsRes.data ?? []).slice(0, 5).forEach((run: any) => {
      const agent = run.task_type ? TASK_AGENT[run.task_type] : null
      const startup = run.startup_id ? startupMap[run.startup_id] : null
      const preview = typeof run.result === 'string'
        ? run.result.slice(0, 180).replace(/[\n#*]/g, ' ').trim()
        : 'Pivot analysis report'
      items.push({
        id: run.id,
        kind: 'pivot_review',
        priority: 'high',
        title: 'CEO Pivot Analysis — レビュー推奨',
        description: preview,
        agentLabel: agent?.label,
        agentColor: agent?.color,
        startupName: startup?.name,
        createdAt: run.created_at,
        actionLabel: 'Review',
        href: '/dashboard/agents/ceo',
      })
    })

    // 失敗実験
    ;(experimentsRes.data ?? []).forEach((exp: any) => {
      const startup = exp.startup_id ? startupMap[exp.startup_id] : null
      items.push({
        id: exp.id,
        kind: 'experiment_review',
        priority: exp.status === 'failed' ? 'high' : 'medium',
        title: exp.status === 'failed' ? '実験失敗 — 判断要' : '実験ピボット — 次フェーズ承認要',
        description: exp.hypothesis || '実験が終了しました',
        startupName: startup?.name,
        createdAt: exp.created_at,
        actionLabel: exp.status === 'failed' ? 'Analyze' : 'Approve Next',
        href: exp.startup_id ? `/dashboard/startups/${exp.startup_id}` : undefined,
      })
    })

    return { items: items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) }
  } catch {
    return { items: [] }
  }
}

export default async function InboxPage() {
  const { items } = await getInboxItems()

  const highPriority = items.filter((i) => i.priority === 'high').length
  const medium = items.filter((i) => i.priority === 'medium').length

  return (
    <div className="flex flex-col min-h-0 overflow-auto">
      <div className="px-6 py-4 border-b border-[#1c1c22] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight">Inbox</h1>
          <p className="text-[11px] text-zinc-600 mt-0.5">エージェントからの承認・判断依頼</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          {highPriority > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-dot" />
              {highPriority} urgent
            </span>
          )}
          <span className="text-zinc-600 font-mono">{items.length} total</span>
        </div>
      </div>

      <div className="flex-1 px-6 py-5 space-y-1.5">
        {items.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[13px] text-zinc-400 mb-1">Inbox Zero 🎉</p>
            <p className="text-[11px] text-zinc-600">承認待ちのアイテムはありません</p>
          </div>
        ) : (
          items.map((item, i) => (
            <InboxCard
              key={item.id}
              item={item}
              delay={i * 30}
            />
          ))
        )}
      </div>
    </div>
  )
}

function InboxCard({
  item,
  delay,
}: {
  item: {
    id: string
    kind: string
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    agentLabel?: string
    agentColor?: string
    startupName?: string
    createdAt: string
    actionLabel: string
    href?: string
  }
  delay: number
}) {
  const priorityColor =
    item.priority === 'high' ? '#ef4444' :
    item.priority === 'medium' ? '#eab308' : '#6b7280'

  const Content = (
    <>
      <div className="flex items-center gap-3 mb-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: priorityColor }}
        />
        {item.agentLabel && item.agentColor && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
            style={{ backgroundColor: item.agentColor + '20', color: item.agentColor }}
          >
            {item.agentLabel}
          </span>
        )}
        <span className="text-[12px] font-semibold text-zinc-200 flex-1 truncate group-hover:text-white transition-colors">
          {item.title}
        </span>
        <span className="text-[10px] text-zinc-700 font-mono shrink-0">
          {timeAgo(item.createdAt)}
        </span>
      </div>

      <p className="text-[11px] text-zinc-500 line-clamp-2 ml-4 mb-2">{item.description}</p>

      <div className="flex items-center gap-2 ml-4 text-[10px]">
        {item.startupName && (
          <span className="text-zinc-600">· {item.startupName}</span>
        )}
        <span className="ml-auto flex items-center gap-1 text-zinc-500 group-hover:text-purple-400 transition-colors font-semibold">
          {item.actionLabel}
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </>
  )

  const baseClass = "block border border-[#1c1c22] rounded-lg px-3 py-3 bg-[#0a0a0c] hover:border-[#27272a] hover:bg-zinc-900/30 transition-all group"
  const style = {
    animation: 'fadeIn 0.3s ease-out both',
    animationDelay: `${delay}ms`,
  }

  return item.href ? (
    <Link href={item.href} className={baseClass} style={style}>{Content}</Link>
  ) : (
    <div className={baseClass} style={style}>{Content}</div>
  )
}
