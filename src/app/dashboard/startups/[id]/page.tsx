'use client'

import { useEffect, useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'
import CXOBoard from '@/components/CXOBoard'

// TODO: Add user context via .env or URL param
export default function StartupDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [startup, setStartup] = useState<any>(null)
  const [pivotLogs, setPivotLogs] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = getSupabaseClient()

        const [startupRes, logsRes] = await Promise.all([
          supabase
            .from('startups')
            .select('*')
            .eq('id', id)
            .single(),
          supabase
            .from('pivot_log')
            .select('*')
            .eq('startup_id', id)
            .order('created_at', { ascending: false })
            .limit(20),
        ])

        setStartup(startupRes.data || null)
        setPivotLogs(logsRes.data || [])

        if (!startupRes.data) {
          notFound()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load startup')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin text-base">⟳</div>
      </div>
    )
  }

  if (!startup) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-300">← 戻る</Link>
          <div>
            <h1 className="text-xl font-bold">{startup.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              startup.status === 'active' ? 'bg-green-900/50 text-green-400' :
              startup.status === 'pivoted' ? 'bg-orange-900/50 text-orange-400' :
              startup.status === 'graduated' ? 'bg-blue-900/50 text-blue-400' :
              'bg-gray-800 text-gray-400'
            }`}>
              {startup.status}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          ピボット数: <span className="text-white font-semibold">{startup.pivot_count}</span> / 30
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* CXO マルチエージェント会議 */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-base font-semibold">CXO マルチエージェント</h2>
            <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-400 rounded-full">Zero Human Company</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            CEO・CTO・CMO・COO・CFO の5つのAIエージェントが並列で会議を行い、戦略的意思決定を行います。
          </p>
          <CXOBoard startupId={startup.id} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-5">ピボットログ</h2>

          {startup.description && (
            <div className="mb-5 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-xs text-gray-500 mb-1">説明</h3>
              <p className="text-sm text-gray-300">{startup.description}</p>
            </div>
          )}

          {pivotLogs && pivotLogs.length > 0 ? (
            <div className="space-y-3">
              {pivotLogs.map((log) => (
                <div key={log.id} className="p-4 bg-gray-800 rounded-lg border-l-2 border-orange-500">
                  <div className="text-xs text-gray-500 mb-2">
                    {new Date(log.created_at).toLocaleDateString('ja-JP')}
                  </div>
                  <div className="text-sm space-y-1">
                    <p><span className="text-gray-500">前:</span> <span className="text-gray-300">{log.pivot_from}</span></p>
                    <p><span className="text-gray-500">後:</span> <span className="text-orange-300">{log.pivot_to}</span></p>
                    {log.reason && (
                      <p className="text-xs text-gray-500 mt-2">{log.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">ピボットログなし</p>
          )}
        </div>
      </main>
    </div>
  )
}
