'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon, exact: true },
  { href: '/dashboard/startups', label: 'Startups', icon: StartupsIcon, badge: '3' },
  { href: '/dashboard/budget', label: 'Budget', icon: BudgetIcon },
]

const projectLinks = [
  { href: 'https://robo-co-op.github.io/ai-tool-lab/', label: 'AI Tool Lab', color: '#3b82f6' },
  { href: 'https://robo-co-op.github.io/prompt-pack/', label: 'Prompt Pack', color: '#a855f7' },
  { href: 'https://robo-co-op.github.io/puzzle-games/', label: 'Puzzle Games', color: '#22c55e' },
]

const agents = [
  { label: 'CEO', model: 'Opus', color: '#f59e0b' },
  { label: 'CTO', model: 'Sonnet', color: '#3b82f6' },
  { label: 'CMO', model: 'Sonnet', color: '#ec4899' },
  { label: 'COO', model: 'Sonnet', color: '#f97316' },
  { label: 'CFO', model: 'Haiku', color: '#22c55e' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-[#09090b] text-white">
      {/* サイドバー */}
      <aside className="w-60 shrink-0 border-r border-[#1c1c22] flex flex-col bg-[#09090b]">
        {/* ロゴ */}
        <div className="px-5 py-4 border-b border-[#1c1c22]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-sm font-bold shadow-lg shadow-purple-900/30">
              L
            </div>
            <div>
              <p className="text-sm font-semibold leading-none tracking-tight">Launchpad</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Mission Control</p>
            </div>
          </div>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {/* Overview */}
          <div>
            <p className="text-[10px] text-zinc-600 font-semibold px-2 mb-2 uppercase tracking-[0.1em]">Overview</p>
            <div className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[13px] transition-all duration-150 ${
                      isActive
                        ? 'bg-purple-500/10 text-purple-300 border-l-2 border-purple-500 pl-2.5'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <item.icon active={isActive} />
                      <span>{item.label}</span>
                    </span>
                    {item.badge && (
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 min-w-[20px] text-center py-0.5 px-1.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Projects */}
          <div>
            <p className="text-[10px] text-zinc-600 font-semibold px-2 mb-2 uppercase tracking-[0.1em]">Projects</p>
            <div className="space-y-0.5">
              {projectLinks.map((site) => (
                <a
                  key={site.href}
                  href={site.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all duration-150 group"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: site.color }}
                  />
                  <span className="flex-1 truncate">{site.label}</span>
                  <svg className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Agents */}
          <div>
            <p className="text-[10px] text-zinc-600 font-semibold px-2 mb-2 uppercase tracking-[0.1em]">Agents</p>
            <div className="space-y-0.5">
              {agents.map((agent) => (
                <div
                  key={agent.label}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] text-zinc-500"
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white/90"
                    style={{ backgroundColor: agent.color + '20', color: agent.color }}
                  >
                    {agent.label[0]}
                  </div>
                  <span>{agent.label}</span>
                  <span className="text-[10px] text-zinc-700 ml-auto font-mono">{agent.model}</span>
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* フッター */}
        <div className="px-4 py-3 border-t border-[#1c1c22]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse-dot" />
            <span className="text-[11px] text-zinc-600">CXO Team Active</span>
          </div>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        {children}
      </div>
    </div>
  )
}

// SVG アイコンコンポーネント
function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 ${active ? 'text-purple-400' : 'text-zinc-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
}

function StartupsIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 ${active ? 'text-purple-400' : 'text-zinc-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  )
}

function BudgetIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 ${active ? 'text-purple-400' : 'text-zinc-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
