import Link from 'next/link'

const SITE_URLS: Record<string, string> = {
  affiliate_seo: 'https://robo-co-op.github.io/ai-tool-lab/',
  digital_product: 'https://robo-co-op.github.io/prompt-pack/',
  game_ads: 'https://robo-co-op.github.io/puzzle-games/',
}

const TYPE_LABELS: Record<string, string> = {
  affiliate_seo: 'Affiliate / SEO',
  digital_product: 'Digital Product',
  game_ads: 'Game + Ads',
}

const TYPE_COLORS: Record<string, string> = {
  affiliate_seo: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  digital_product: 'bg-purple-900/40 text-purple-300 border-purple-700/40',
  game_ads: 'bg-green-900/40 text-green-300 border-green-700/40',
}

interface Experiment {
  id: string
  startup_id: string
  hypothesis: string
  metric: string
  target_value: string | null
  status: string
  result: string | null
}

interface StartupCardProps {
  startup: {
    id: string
    name: string
    status: string
    business_type: string | null
    experiment_count: number | null
    pivot_count: number
  }
  experiments: Experiment[]
}

export default function StartupCard({ startup, experiments }: StartupCardProps) {
  const siteUrl = startup.business_type ? SITE_URLS[startup.business_type] : null
  const typeLabel = startup.business_type ? TYPE_LABELS[startup.business_type] : null
  const typeColor = startup.business_type ? TYPE_COLORS[startup.business_type] : 'bg-gray-800 text-gray-400 border-gray-700'
  const activeExp = experiments.find(e => e.status === 'running') ?? experiments[0]
  const expCount = startup.experiment_count ?? startup.pivot_count

  return (
    <div className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition-colors flex flex-col gap-3">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{startup.name}</h3>
          {typeLabel && (
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${typeColor}`}>
              {typeLabel}
            </span>
          )}
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
          startup.status === 'active' ? 'bg-green-900/50 text-green-400' :
          startup.status === 'pivoted' ? 'bg-orange-900/50 text-orange-400' :
          startup.status === 'graduated' ? 'bg-blue-900/50 text-blue-400' :
          'bg-gray-800 text-gray-400'
        }`}>
          {startup.status}
        </span>
      </div>

      {/* 実験 */}
      {activeExp && (
        <div className="bg-gray-800/60 rounded-lg p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${
              activeExp.status === 'running' ? 'bg-green-400 animate-pulse' :
              activeExp.status === 'success' ? 'bg-blue-400' :
              activeExp.status === 'failed' ? 'bg-red-400' :
              'bg-gray-500'
            }`} />
            <span className="text-gray-400 font-medium">実験 #{expCount}</span>
            <span className="text-gray-500">{activeExp.status}</span>
          </div>
          <p className="text-gray-300 line-clamp-2">{activeExp.hypothesis}</p>
          <p className="text-gray-500">指標: {activeExp.metric}</p>
          {activeExp.target_value && (
            <p className="text-gray-500">目標: {activeExp.target_value}</p>
          )}
        </div>
      )}

      {/* フッター */}
      <div className="flex items-center justify-between mt-auto">
        <Link
          href={`/dashboard/startups/${startup.id}`}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          詳細 →
        </Link>
        {siteUrl && (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <span>サイト</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}
