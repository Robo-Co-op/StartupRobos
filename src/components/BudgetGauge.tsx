'use client'

interface BudgetGaugeProps {
  spentUsd: number
  totalUsd: number
}

export default function BudgetGauge({ spentUsd, totalUsd }: BudgetGaugeProps) {
  const remaining = totalUsd - spentUsd
  const pct = Math.min(100, (spentUsd / totalUsd) * 100)
  const remainingPct = 100 - pct

  // Color based on remaining amount
  const color =
    remainingPct > 50 ? 'text-green-400' :
    remainingPct > 20 ? 'text-yellow-400' :
    'text-red-400'

  const strokeColor =
    remainingPct > 50 ? '#4ade80' :
    remainingPct > 20 ? '#facc15' :
    '#f87171'

  // SVG circular progress
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (pct / 100)

  // Haiku token conversion (input $1/1M, output $5/1M — average ~$2/1M)
  const haikuTokensLeft = Math.floor((remaining / 2) * 1_000_000)
  const haikuK = Math.round(haikuTokensLeft / 1000)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          {/* Background track */}
          <circle cx="64" cy="64" r={radius} fill="none" stroke="#374151" strokeWidth="10" />
          {/* Consumed arc */}
          <circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeDasharray={`${offset} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl font-bold ${color}`}>${remaining.toFixed(2)}</span>
          <span className="text-xs text-gray-400">Remaining</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-300">
          <span className={color}>~{haikuK}k tokens</span> remaining (Haiku)
        </p>
        <p className="text-xs text-gray-500 mt-1">
          ${spentUsd.toFixed(4)} / ${totalUsd.toFixed(2)} spent
        </p>
      </div>
    </div>
  )
}
