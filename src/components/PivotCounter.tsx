'use client'

interface StartupPivot {
  id: string
  name: string
  pivotCount: number
}

interface PivotCounterProps {
  startups: StartupPivot[]
  startDate: string // ISO日付
}

const MAX_PIVOTS = 30
const TOTAL_DAYS = 30

export default function PivotCounter({ startups, startDate }: PivotCounterProps) {
  const totalPivots = startups.reduce((sum, s) => sum + s.pivotCount, 0)
  const start = new Date(startDate)
  const now = new Date()
  const daysPassed = Math.min(TOTAL_DAYS, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const daysRemaining = Math.max(0, TOTAL_DAYS - daysPassed)

  return (
    <div className="space-y-4">
      {/* 30マスグリッド */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">実験進捗</span>
          <span className="text-sm text-gray-400">{totalPivots} / {MAX_PIVOTS}</span>
        </div>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: MAX_PIVOTS }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-sm transition-colors ${
                i < totalPivots
                  ? 'bg-purple-500'
                  : 'bg-gray-700'
              }`}
              title={`実験 ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* 日数カウントダウン */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">残り日数</span>
        <span className={`font-bold ${daysRemaining <= 7 ? 'text-red-400' : 'text-green-400'}`}>
          {daysRemaining} 日
        </span>
      </div>

      {/* スタートアップ別内訳 */}
      <div className="space-y-2">
        {startups.map((startup) => (
          <div key={startup.id} className="flex items-center justify-between">
            <span className="text-xs text-gray-400 truncate max-w-[120px]">{startup.name}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-sm ${
                    i < startup.pivotCount ? 'bg-purple-400' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
