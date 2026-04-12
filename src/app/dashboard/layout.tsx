import Link from 'next/link'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/dashboard/startups', label: 'Startups', icon: '🚀', sub: '3' },
  { href: '/dashboard/budget', label: 'Budget', icon: '💰' },
]

const siteLinks = [
  { href: 'https://robo-co-op.github.io/ai-tool-lab/', label: 'AI Tool Lab', icon: '📊', color: 'text-blue-400' },
  { href: 'https://robo-co-op.github.io/prompt-pack/', label: 'Prompt Pack', icon: '📦', color: 'text-purple-400' },
  { href: 'https://robo-co-op.github.io/puzzle-games/', label: 'Puzzle Games', icon: '🎮', color: 'text-green-400' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      {/* サイドバー */}
      <aside className="w-56 shrink-0 border-r border-gray-800 flex flex-col">
        {/* ロゴ */}
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-sm font-bold">L</div>
            <div>
              <p className="text-sm font-semibold leading-none">Launchpad</p>
              <p className="text-xs text-gray-500 mt-0.5">Mission Control</p>
            </div>
          </div>
        </div>

        {/* ナビ */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="text-xs text-gray-600 font-medium px-2 mb-2 uppercase tracking-wider">Overview</p>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors group"
            >
              <span className="flex items-center gap-2">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
              {item.sub && (
                <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full">{item.sub}</span>
              )}
            </Link>
          ))}

          <p className="text-xs text-gray-600 font-medium px-2 mt-4 mb-2 uppercase tracking-wider">Sites</p>
          {siteLinks.map((site) => (
            <a
              key={site.href}
              href={site.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <span>{site.icon}</span>
              <span className={site.color}>{site.label}</span>
              <svg className="w-3 h-3 ml-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </nav>

        {/* フッター */}
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">CXO Team Active</span>
          </div>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  )
}
