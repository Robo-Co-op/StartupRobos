'use client'

import { useState } from 'react'

interface CXOSession {
  sessionId: string
  ctoReport: string
  cmoReport: string
  cooReport: string
  cfoReport: string
  ceoDecision: string
  totalCostUsd: number
  budgetRemaining: number
}

interface CXOCardProps {
  role: string
  label: string
  content: string
  colorClass: string
}

function CXOCard({ role, label, content, colorClass }: CXOCardProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border rounded-xl overflow-hidden ${colorClass}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold opacity-60">{role}</span>
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <span className="text-xs opacity-40">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-300 whitespace-pre-wrap border-t border-white/10 pt-3">
          {content}
        </div>
      )}
    </div>
  )
}

const CXO_CONFIG = [
  { key: 'ctoReport' as const, role: 'CTO', label: 'Technology Strategy', colorClass: 'border-blue-800 bg-blue-950/30' },
  { key: 'cmoReport' as const, role: 'CMO', label: 'Marketing Strategy', colorClass: 'border-pink-800 bg-pink-950/30' },
  { key: 'cooReport' as const, role: 'COO', label: 'Operations Strategy', colorClass: 'border-orange-800 bg-orange-950/30' },
  { key: 'cfoReport' as const, role: 'CFO', label: 'Finance Strategy', colorClass: 'border-green-800 bg-green-950/30' },
]

interface CXOBoardProps {
  startupId: string
}

export default function CXOBoard({ startupId }: CXOBoardProps) {
  const [agenda, setAgenda] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState<CXOSession | null>(null)

  async function handleRunCouncil(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSession(null)

    try {
      const res = await fetch('/api/cxo/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startupId, agenda }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'An error occurred')
      setSession(data)
      setAgenda('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Agenda Input */}
      <form onSubmit={handleRunCouncil} className="space-y-3">
        <textarea
          value={agenda}
          onChange={e => setAgenda(e.target.value)}
          placeholder="Enter CXO meeting agenda...&#10;Example: A competitor has appeared. Should we lower prices or differentiate by features?"
          rows={3}
          maxLength={2000}
          required
          minLength={10}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none"
        />
        <button
          type="submit"
          disabled={loading || agenda.trim().length < 10}
          className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin text-base">⟳</span>
              CEO / CTO / CMO / COO / CFO meeting in progress...
            </>
          ) : (
            '⚡ Convene CXO Council'
          )}
        </button>
      </form>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Meeting Results */}
      {session && (
        <div className="space-y-3">
          {/* CEO Decision (highlighted) */}
          <div className="border border-purple-700 bg-purple-950/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono font-bold text-purple-400">CEO</span>
              <span className="text-sm font-semibold text-purple-300">Strategic Decision</span>
              <span className="ml-auto text-xs text-gray-500">${session.totalCostUsd.toFixed(4)}</span>
            </div>
            <p className="text-sm text-gray-200 whitespace-pre-wrap">{session.ceoDecision}</p>
          </div>

          {/* CXO Reports (collapsible) */}
          <div className="space-y-2">
            {CXO_CONFIG.map(cfg => (
              <CXOCard
                key={cfg.key}
                role={cfg.role}
                label={cfg.label}
                content={session[cfg.key]}
                colorClass={cfg.colorClass}
              />
            ))}
          </div>

          <p className="text-xs text-gray-600 text-right">
            Remaining Budget: ${session.budgetRemaining.toFixed(4)}
          </p>
        </div>
      )}
    </div>
  )
}
