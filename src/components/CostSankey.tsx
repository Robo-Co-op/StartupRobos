// Month Spend → Agent → Task type の3段 Sankey（SVG、依存なし）
// Grafana調のスマートなフロー可視化

interface Run {
  task_type: string | null
  cost_usd: number | null
  startup_id: string | null
}

interface Props {
  runs: Run[]
  startupNames: Record<string, string>
  width?: number
  height?: number
}

import { TASK_AGENT } from '@/lib/agent/roles'

const PROJECT_COLORS: Record<string, string> = {
  'AI Tool Lab': '#3b82f6',
  'Prompt Pack': '#a855f7',
  'Puzzle Games': '#22c55e',
}

export default function CostSankey({
  runs,
  startupNames,
  width = 680,
  height = 300,
}: Props) {
  const totalCost = runs.reduce((s, r) => s + Number(r.cost_usd || 0), 0)

  // エージェント別コスト集計
  const byAgent: Record<string, { label: string; color: string; cost: number; role: string }> = {}
  const byProject: Record<string, { label: string; color: string; cost: number }> = {}
  // エッジ: agent → project
  const links: Record<string, { source: string; target: string; cost: number }> = {}

  runs.forEach((r) => {
    const agent = r.task_type ? TASK_AGENT[r.task_type] : null
    if (!agent) return
    const cost = Number(r.cost_usd || 0)
    if (!byAgent[agent.role]) {
      byAgent[agent.role] = { label: agent.label, color: agent.color, cost: 0, role: agent.role }
    }
    byAgent[agent.role].cost += cost

    const projName = r.startup_id && startupNames[r.startup_id] ? startupNames[r.startup_id] : 'Portfolio'
    if (!byProject[projName]) {
      byProject[projName] = {
        label: projName,
        color: PROJECT_COLORS[projName] || '#71717a',
        cost: 0,
      }
    }
    byProject[projName].cost += cost

    const linkKey = `${agent.role}→${projName}`
    if (!links[linkKey]) {
      links[linkKey] = { source: agent.role, target: projName, cost: 0 }
    }
    links[linkKey].cost += cost
  })

  if (totalCost === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[12px] text-zinc-600">まだコストデータなし。Heartbeat実行を待機中...</p>
      </div>
    )
  }

  // 3列レイアウト: 左 Budget / 中 Agents / 右 Projects
  const col0x = 10
  const col1x = width * 0.4
  const col2x = width * 0.82
  const barW = 14
  const padding = 30

  // 各ノードの高さを割り当て（比例）
  const usableH = height - padding * 2
  const budgetBarH = usableH

  // Agent側
  const sortedAgents = Object.values(byAgent).sort((a, b) => b.cost - a.cost)
  let yAgent = padding
  const agentPositions: Record<string, { y: number; h: number; mid: number }> = {}
  sortedAgents.forEach((a) => {
    const h = (a.cost / totalCost) * usableH
    agentPositions[a.role] = { y: yAgent, h, mid: yAgent + h / 2 }
    yAgent += h + 2
  })

  // Project側
  const sortedProjects = Object.values(byProject).sort((a, b) => b.cost - a.cost)
  let yProj = padding
  const projectPositions: Record<string, { y: number; h: number; mid: number }> = {}
  sortedProjects.forEach((p) => {
    const h = (p.cost / totalCost) * usableH
    projectPositions[p.label] = { y: yProj, h, mid: yProj + h / 2 }
    yProj += h + 2
  })

  // リンクの端位置を計算（各ノードを上から流れ順に積み上げ）
  const agentOutgoing: Record<string, number> = {}
  const projectIncoming: Record<string, number> = {}

  const orderedLinks = Object.values(links).sort(
    (a, b) =>
      (agentPositions[a.source]?.y ?? 0) - (agentPositions[b.source]?.y ?? 0) ||
      (projectPositions[a.target]?.y ?? 0) - (projectPositions[b.target]?.y ?? 0)
  )

  return (
    <div className="card p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-[0.08em]">Cost Flow</p>
          <p className="text-[10px] text-zinc-700 mt-0.5">Budget → Agents → Projects</p>
        </div>
        <span className="text-[10px] text-zinc-600 font-mono">Total ${totalCost.toFixed(4)}</span>
      </div>

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {sortedAgents.map((a) => (
            <linearGradient key={a.role} id={`grad-${a.role}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={a.color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={a.color} stopOpacity="0.15" />
            </linearGradient>
          ))}
        </defs>

        {/* Budget bar (左) */}
        <rect
          x={col0x}
          y={padding}
          width={barW}
          height={budgetBarH}
          fill="#a855f7"
          opacity="0.8"
          rx="2"
        />
        <text
          x={col0x + barW + 8}
          y={padding + 12}
          fill="#a1a1aa"
          fontSize="11"
          fontWeight="600"
        >
          Budget
        </text>
        <text
          x={col0x + barW + 8}
          y={padding + 25}
          fill="#71717a"
          fontSize="9"
          fontFamily="monospace"
        >
          ${totalCost.toFixed(2)}
        </text>

        {/* Budget → Agent links */}
        {sortedAgents.map((a) => {
          const pos = agentPositions[a.role]
          const startY = padding + (a.cost / totalCost) * usableH / 2
          const budgetCumulative = sortedAgents
            .slice(0, sortedAgents.findIndex((x) => x.role === a.role))
            .reduce((s, x) => s + (x.cost / totalCost) * usableH, 0)
          const sY = padding + budgetCumulative + (a.cost / totalCost) * usableH / 2

          return (
            <path
              key={`budget-${a.role}`}
              d={`M ${col0x + barW} ${sY} C ${(col0x + col1x) / 2} ${sY}, ${(col0x + col1x) / 2} ${pos.mid}, ${col1x} ${pos.mid}`}
              stroke={a.color}
              strokeWidth={Math.max(2, (a.cost / totalCost) * usableH * 0.9)}
              fill="none"
              opacity="0.35"
            />
          )
        })}

        {/* Agent bars (中央) */}
        {sortedAgents.map((a) => {
          const pos = agentPositions[a.role]
          return (
            <g key={a.role}>
              <rect
                x={col1x}
                y={pos.y}
                width={barW}
                height={pos.h}
                fill={a.color}
                rx="2"
              />
              <text
                x={col1x + barW + 6}
                y={pos.y + Math.min(pos.h, 14) / 2 + 4}
                fill="#e4e4e7"
                fontSize="10"
                fontWeight="600"
              >
                {a.label}
              </text>
              {pos.h > 18 && (
                <text
                  x={col1x + barW + 6}
                  y={pos.y + 24}
                  fill="#71717a"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  ${a.cost.toFixed(4)}
                </text>
              )}
            </g>
          )
        })}

        {/* Agent → Project links */}
        {orderedLinks.map((link) => {
          const agent = sortedAgents.find((a) => a.role === link.source)!
          if (!agent) return null
          const aPos = agentPositions[link.source]
          const pPos = projectPositions[link.target]
          if (!aPos || !pPos) return null

          const fromOffset = agentOutgoing[link.source] ?? 0
          const toOffset = projectIncoming[link.target] ?? 0
          const linkH = (link.cost / totalCost) * usableH

          const sY = aPos.y + fromOffset + linkH / 2
          const tY = pPos.y + toOffset + linkH / 2

          agentOutgoing[link.source] = fromOffset + linkH
          projectIncoming[link.target] = toOffset + linkH

          return (
            <path
              key={`${link.source}-${link.target}`}
              d={`M ${col1x + barW} ${sY} C ${(col1x + col2x) / 2} ${sY}, ${(col1x + col2x) / 2} ${tY}, ${col2x} ${tY}`}
              stroke={agent.color}
              strokeWidth={Math.max(1, linkH * 0.9)}
              fill="none"
              opacity="0.4"
            />
          )
        })}

        {/* Project bars (右) */}
        {sortedProjects.map((p) => {
          const pos = projectPositions[p.label]
          return (
            <g key={p.label}>
              <rect
                x={col2x}
                y={pos.y}
                width={barW}
                height={pos.h}
                fill={p.color}
                rx="2"
              />
              <text
                x={col2x + barW + 6}
                y={pos.y + Math.min(pos.h, 14) / 2 + 4}
                fill="#e4e4e7"
                fontSize="10"
                fontWeight="600"
              >
                {p.label}
              </text>
              {pos.h > 18 && (
                <text
                  x={col2x + barW + 6}
                  y={pos.y + 24}
                  fill="#71717a"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  ${p.cost.toFixed(4)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
