import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const TIER_PRICES = {
    // Retail
    starter: 8000, growth: 15000, business: 25000,
    // Vendor
    solo: 4500, hustle: 9500, scale: 18000,
}

const TIER_LABELS = {
    starter: 'Starter (Retail)', growth: 'Growth (Retail)', business: 'Business (Retail)',
    solo: 'Solo (Vendor)', hustle: 'Hustle (Vendor)', scale: 'Scale (Vendor)',
}

const TIER_COLORS_CHART = {
    starter: '#6b7280', growth: '#f59e0b', business: '#f97316',
    solo: '#9ca3af', hustle: '#3b82f6', scale: '#6366f1',
}

export default function AdminRevenue() {
    const [subscriptions, setSubscriptions] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetchData() }, [])

    async function fetchData() {
        setLoading(true)
        const { data } = await supabase
            .from('subscriptions')
            .select('tier, status, created_at, is_trial, businesses(name, mode)')
            .in('status', ['active', 'trialing'])
        setSubscriptions(data ?? [])
        setLoading(false)
    }

    const activeSubs = subscriptions.filter(s => s.status === 'active')
    const mrr = activeSubs.reduce((sum, s) => sum + (TIER_PRICES[s.tier] ?? 0), 0)
    const arr = mrr * 12

    // Retail vs vendor MRR split
    const retailMRR = activeSubs
        .filter(s => s.businesses?.mode !== 'online_vendor')
        .reduce((sum, s) => sum + (TIER_PRICES[s.tier] ?? 0), 0)
    const vendorMRR = activeSubs
        .filter(s => s.businesses?.mode === 'online_vendor')
        .reduce((sum, s) => sum + (TIER_PRICES[s.tier] ?? 0), 0)

    // Group by tier
    const byTier = activeSubs.reduce((acc, s) => {
        acc[s.tier] = (acc[s.tier] ?? 0) + 1
        return acc
    }, {})

    const tierData = Object.entries(byTier)
        .map(([tier, count]) => ({
            tier: TIER_LABELS[tier] ?? tier,
            count,
            revenue: count * (TIER_PRICES[tier] ?? 0),
            fill: TIER_COLORS_CHART[tier] ?? '#6b7280',
        }))
        .sort((a, b) => b.revenue - a.revenue)

    // Group by month (new signups)
    const byMonth = activeSubs.reduce((acc, s) => {
        const month = new Date(s.created_at).toLocaleDateString('en-NG', { month: 'short', year: '2-digit' })
        if (!acc[month]) acc[month] = { month, retail: 0, vendor: 0 }
        const isVendor = s.businesses?.mode === 'online_vendor'
        const price = TIER_PRICES[s.tier] ?? 0
        if (isVendor) acc[month].vendor += price
        else acc[month].retail += price
        return acc
    }, {})

    const monthlyData = Object.values(byMonth).slice(-12)

    if (loading) return <div className="text-sm text-gray-500 py-8 text-center">Loading...</div>

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Platform Revenue</h2>

            {/* MRR / ARR */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total MRR', value: `₦${mrr.toLocaleString()}`, color: 'text-green-400', icon: '📈' },
                    { label: 'Annual Run Rate', value: `₦${arr.toLocaleString()}`, color: 'text-blue-400', icon: '🚀' },
                    { label: 'Retail MRR', value: `₦${retailMRR.toLocaleString()}`, color: 'text-cyan-400', icon: '🏪' },
                    { label: 'Vendor MRR', value: `₦${vendorMRR.toLocaleString()}`, color: 'text-purple-400', icon: '📦' },
                ].map(stat => (
                    <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-gray-400">{stat.label}</p>
                            <span className="text-xl">{stat.icon}</span>
                        </div>
                        <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Paying + trialing count */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                    <span className="text-2xl">✅</span>
                    <div>
                        <p className="text-xs text-gray-400">Paying Businesses</p>
                        <p className="text-2xl font-bold text-green-400">{activeSubs.length}</p>
                    </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                    <span className="text-2xl">🎁</span>
                    <div>
                        <p className="text-xs text-gray-400">Free Trials</p>
                        <p className="text-2xl font-bold text-amber-400">
                            {subscriptions.filter(s => s.status === 'trialing').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Revenue by tier */}
            {tierData.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Revenue by Plan</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={tierData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="tier" tick={{ fontSize: 10, fill: '#9ca3af' }} width={130} />
                            <Tooltip
                                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                                formatter={(v, n) => [`₦${Number(v).toLocaleString()}`, 'Monthly Revenue']}
                            />
                            <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                                {tierData.map((entry, index) => (
                                    <rect key={index} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
                        {tierData.map(t => (
                            <div key={t.tier} className="bg-gray-800 rounded-lg p-2 text-center">
                                <p className="text-xs text-gray-400 mb-1 leading-tight truncate" title={t.tier}>{t.tier.split(' ')[0]}</p>
                                <p className="text-sm font-bold text-white">{t.count}</p>
                                <p className="text-xs text-blue-400">₦{(t.revenue / 1000).toFixed(0)}k</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Monthly growth by mode */}
            {monthlyData.length > 1 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Monthly Revenue by Mode</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                                formatter={v => [`₦${Number(v).toLocaleString()}`, '']}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="retail" name="Retail" fill="#06b6d4" radius={[4, 4, 0, 0]} stackId="a" />
                            <Bar dataKey="vendor" name="Vendor" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}