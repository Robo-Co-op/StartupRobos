import Link from 'next/link'

const SITE_URLS: Record<string, string> = {
  affiliate_seo: 'https://robo-co-op.github.io/ai-tool-lab/',
  digital_product: 'https://robo-co-op.github.io/prompt-pack/',
  game_ads: 'https://robo-co-op.github.io/puzzle-games/',
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  affiliate_seo: { label: 'Affiliate / SEO', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  digital_product: { label: 'Digital Product', color: '#a855f7', bg: 'rgba(168,85,247,0.08)' },
  game_ads: { label: 'Game + Ads', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  pivoted: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  graduated: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
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
  const typeConfig = startup.business_type ? TYPE_CONFIG[startup.business_type] : null
  const activeExp = experiments.find(e => e.status === 'running') ?? experiments[0]
  const expCount = startup.experiment_count ?? startup.pivot_count

  return (
    <div className="card p-4 flex flex-col gap-3 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
            {startup.name}
          </h3>
          {typeConfig && (
            <span
              className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: typeConfig.bg, color: typeConfig.color }}
            >
              {typeConfig.label}
            </span>
          )}
        </div>
        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${
          STATUS_STYLES[startup.status] ?? 'bg-zinc-800 text-zinc-500'
        }`}>
          {startup.status}
        </span>
      </div>

      {/* Experiments */}
      {activeExp && (
        <div className="bg-zinc-900/50 border border-[#1c1c22] rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`status-dot ${
              activeExp.status === 'running' ? 'status-running animate-pulse-dot' :
              activeExp.status === 'success' ? 'status-done' :
              activeExp.status === 'failed' ? 'status-blocked' :
              'status-idle'
            }`} />
            <span className="text-[10px] text-zinc-500 font-mono">Exp #{expCount}</span>
            <span className="text-[10px] text-zinc-600">{activeExp.status}</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">{activeExp.hypothesis}</p>
          <div className="flex items-center gap-2 text-[10px] text-zinc-600">
            <span>Metric: {activeExp.metric}</span>
            {activeExp.target_value && <span>Target: {activeExp.target_value}</span>}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <Link
          href={`/dashboard/startups/${startup.id}`}
          className="text-[11px] text-purple-400/80 hover:text-purple-300 transition-colors font-medium"
        >
          Details →
        </Link>
        {siteUrl && (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
          >
            Site
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}
