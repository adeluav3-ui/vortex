import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function AdminStats() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetchStats() }, [])

    async function fetchStats() {
        setLoading(true)
        const [businessRes, subRes, profileRes] = await Promise.all([
            supabase.from('businesses').select('id, mode'),
            supabase.from('subscriptions').select('tier, status, is_trial'),
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
        ])

        const businesses = businessRes.data ?? []
        const subs = subRes.data ?? []

        const retailBusinesses = businesses.filter(b => b.mode !== 'online_vendor')
        const vendorBusinesses = businesses.filter(b => b.mode === 'online_vendor')

        const active = subs.filter(s => s.status === 'active')
        const trialing = subs.filter(s => s.status === 'trialing')

        // Retail plan counts
        const starterCount = active.filter(s => s.tier === 'starter').length
        const growthCount = active.filter(s => s.tier === 'growth').length
        const businessCount = active.filter(s => s.tier === 'business').length

        // Vendor plan counts
        const soloCount = active.filter(s => s.tier === 'solo').length
        const hustleCount = active.filter(s => s.tier === 'hustle').length
        const scaleCount = active.filter(s => s.tier === 'scale').length

        setStats({
            totalBusinesses: businesses.length,
            retailBusinesses: retailBusinesses.length,
            vendorBusinesses: vendorBusinesses.length,
            activeSubscriptions: active.length,
            trialing: trialing.length,
            totalUsers: profileRes.count ?? 0,
            // Retail tiers
            starterCount, growthCount, businessCount,
            // Vendor tiers
            soloCount, hustleCount, scaleCount,
        })
        setLoading(false)
    }

    if (loading || !stats) {
        return (
            <div>
                <h2 className="text-lg font-bold text-white mb-5">Platform Overview</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-24 animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    const topCards = [
        { label: 'Total Businesses', value: stats.totalBusinesses, icon: '🏢', color: 'text-blue-400' },
        { label: 'Retail Stores', value: stats.retailBusinesses, icon: '🏪', color: 'text-cyan-400' },
        { label: 'Online Vendors', value: stats.vendorBusinesses, icon: '📦', color: 'text-purple-400' },
        { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: '✅', color: 'text-green-400' },
        { label: 'Free Trials Active', value: stats.trialing, icon: '🎁', color: 'text-amber-400' },
        { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'text-pink-400' },
    ]

    const retailPlanCards = [
        { label: 'Starter', value: stats.starterCount, icon: '🌱', color: 'text-gray-400' },
        { label: 'Growth', value: stats.growthCount, icon: '📈', color: 'text-yellow-400' },
        { label: 'Business', value: stats.businessCount, icon: '💼', color: 'text-orange-400' },
    ]

    const vendorPlanCards = [
        { label: 'Solo', value: stats.soloCount, icon: '👤', color: 'text-gray-400' },
        { label: 'Hustle', value: stats.hustleCount, icon: '⚡', color: 'text-blue-400' },
        { label: 'Scale', value: stats.scaleCount, icon: '🚀', color: 'text-indigo-400' },
    ]

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Platform Overview</h2>

            {/* Top stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {topCards.map(card => (
                    <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-gray-400 leading-tight">{card.label}</p>
                            <span className="text-lg">{card.icon}</span>
                        </div>
                        <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Plan breakdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Retail */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🏪 Retail Plans</p>
                    <div className="grid grid-cols-3 gap-3">
                        {retailPlanCards.map(card => (
                            <div key={card.label} className="bg-gray-800 rounded-lg p-3 text-center">
                                <p className="text-xs text-gray-400 mb-1">{card.icon} {card.label}</p>
                                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Vendor */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">📦 Vendor Plans</p>
                    <div className="grid grid-cols-3 gap-3">
                        {vendorPlanCards.map(card => (
                            <div key={card.label} className="bg-gray-800 rounded-lg p-3 text-center">
                                <p className="text-xs text-gray-400 mb-1">{card.icon} {card.label}</p>
                                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}