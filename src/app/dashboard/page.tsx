'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import BudgetGauge from '@/components/BudgetGauge'
import PivotCounter from '@/components/PivotCounter'

// TODO: Add user context via .env or URL param
export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [startups, setStartups] = useState<any[]>([])
  const [budget, setBudget] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = getSupabaseClient()

        const [startupsRes, budgetRes] = await Promise.all([
          supabase.from('startups').select('id, name, status, pivot_count, business_type, experiment_count, created_at').order('created_at'),
          supabase.from('token_budgets').select('*').limit(1).single(),
        ])

        setStartups(startupsRes.data || [])
        setBudget(budgetRes.data || null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const earliestStartup = startups[0]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin text-base">⟳</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Launchpad Mission Control</h1>
          <p className="text-sm text-gray-400">Read-only Dashboard</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center">
            <h2 className="text-sm font-medium text-gray-400 mb-4">AIトークン予算</h2>
            {budget ? (
              <BudgetGauge
                spentUsd={Number(budget.spent_usd)}
                totalUsd={Number(budget.total_usd)}
              />
            ) : (
              <p className="text-gray-500 text-sm">予算未設定</p>
            )}
            <Link href="/dashboard/budget" className="mt-4 text-xs text-purple-400 hover:text-purple-300">
              詳細を見る →
            </Link>
          </div>

          <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-sm font-medium text-gray-400 mb-4">実験進捗</h2>
            <PivotCounter
              startups={startups.map((s) => ({
                id: s.id,
                name: s.name,
                pivotCount: s.experiment_count ?? s.pivot_count,
              }))}
              startDate={earliestStartup?.created_at ?? new Date().toISOString()}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">スタートアップ</h2>
          </div>

          {startups.length === 0 ? (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-12 text-center">
              <p className="text-gray-500 mb-4">データなし</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {startups.map((startup) => (
                <Link key={startup.id} href={`/dashboard/startups/${startup.id}`}>
                  <div className="bg-gray-900 border border-gray-800 hover:border-purple-700 rounded-xl p-5 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-white">{startup.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        startup.status === 'active' ? 'bg-green-900/50 text-green-400' :
                        startup.status === 'pivoted' ? 'bg-orange-900/50 text-orange-400' :
                        startup.status === 'graduated' ? 'bg-blue-900/50 text-blue-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {startup.status}
                      </span>
                    </div>
                    {startup.business_type && (
                      <p className="text-xs text-purple-400 mb-1">{startup.business_type.replace('_', ' ')}</p>
                    )}
                    <div className="text-sm text-gray-400">
                      実験: {startup.experiment_count ?? startup.pivot_count}/10
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
