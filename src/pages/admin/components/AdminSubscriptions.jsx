import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const RETAIL_TIERS = ['starter', 'growth', 'business']
const VENDOR_TIERS = ['solo', 'hustle', 'scale']
const ALL_TIERS = [...RETAIL_TIERS, ...VENDOR_TIERS]

const TIER_PRICES = {
    starter: 8000, growth: 15000, business: 25000,
    solo: 4500, hustle: 9500, scale: 18000,
}

const TIER_COLORS = {
    starter: 'bg-gray-700 text-gray-300',
    growth: 'bg-yellow-900 text-yellow-300',
    business: 'bg-orange-900 text-orange-300',
    solo: 'bg-gray-700 text-gray-300',
    hustle: 'bg-blue-900 text-blue-300',
    scale: 'bg-indigo-900 text-indigo-300',
}

const STATUS_COLORS = {
    active: 'bg-green-900 text-green-300',
    trialing: 'bg-amber-900 text-amber-300',
    inactive: 'bg-gray-700 text-gray-400',
    expired: 'bg-red-900 text-red-300',
    cancelled: 'bg-red-900 text-red-300',
    past_due: 'bg-red-900 text-red-300',
}

export default function AdminSubscriptions() {
    const [subscriptions, setSubscriptions] = useState([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(null)
    const [modeFilter, setModeFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')

    useEffect(() => { fetchSubscriptions() }, [])

    async function fetchSubscriptions() {
        setLoading(true)
        const { data } = await supabase
            .from('subscriptions')
            .select(`
                *,
                businesses ( name, logo_url, mode )
            `)
            .order('created_at', { ascending: false })
        setSubscriptions(data ?? [])
        setLoading(false)
    }

    async function updateTier(subId, tier) {
        setUpdating(subId)
        await supabase.from('subscriptions').update({ tier }).eq('id', subId)
        await fetchSubscriptions()
        setUpdating(null)
    }

    async function updateStatus(subId, status) {
        setUpdating(subId)
        const updates = { status }
        // Clear trial fields when activating
        if (status === 'active') {
            updates.is_trial = false
            updates.trial_start = null
            updates.trial_end = null
        }
        await supabase.from('subscriptions').update(updates).eq('id', subId)
        await fetchSubscriptions()
        setUpdating(null)
    }

    const filtered = subscriptions.filter(s => {
        const isVendor = s.businesses?.mode === 'online_vendor'
        const matchMode = modeFilter === 'all' ||
            (modeFilter === 'vendor' && isVendor) ||
            (modeFilter === 'retail' && !isVendor)
        const matchStatus = statusFilter === 'all' || s.status === statusFilter
        return matchMode && matchStatus
    })

    const totalMRR = subscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (TIER_PRICES[s.tier] ?? 0), 0)

    if (loading) return <div className="text-sm text-gray-500 py-8 text-center">Loading...</div>

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-lg font-bold text-white">Subscriptions ({subscriptions.length})</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        MRR: <span className="text-green-400 font-semibold">₦{totalMRR.toLocaleString()}</span>
                        {' · '}
                        {subscriptions.filter(s => s.status === 'trialing').length} trialing
                        {' · '}
                        {subscriptions.filter(s => s.status === 'active').length} active
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {/* Mode filter */}
                    {['all', 'retail', 'vendor'].map(f => (
                        <button
                            key={f}
                            onClick={() => setModeFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${modeFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                    >
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="trialing">Trialing</option>
                        <option value="inactive">Inactive</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Business</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mode</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Plan</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Trial End</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Change Plan</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Since</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filtered.map(sub => {
                                const isVendor = sub.businesses?.mode === 'online_vendor'
                                const tiers = isVendor ? VENDOR_TIERS : RETAIL_TIERS
                                return (
                                    <tr key={sub.id} className="hover:bg-gray-800 transition">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {sub.businesses?.logo_url ? (
                                                    <img src={sub.businesses.logo_url} alt={sub.businesses.name} className="w-7 h-7 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-lg bg-blue-900 flex items-center justify-center text-blue-400 text-xs font-bold">
                                                        {sub.businesses?.name?.charAt(0)}
                                                    </div>
                                                )}
                                                <p className="font-medium text-white text-xs">{sub.businesses?.name ?? '—'}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isVendor ? 'bg-purple-900 text-purple-300' : 'bg-cyan-900 text-cyan-300'}`}>
                                                {isVendor ? 'Vendor' : 'Retail'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${TIER_COLORS[sub.tier] ?? 'bg-gray-700 text-gray-400'}`}>
                                                {sub.tier}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[sub.status] ?? 'bg-gray-700 text-gray-400'}`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {sub.trial_end
                                                ? new Date(sub.trial_end).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
                                                : '—'
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={sub.tier}
                                                onChange={e => updateTier(sub.id, e.target.value)}
                                                disabled={updating === sub.id}
                                                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                            >
                                                {tiers.map(t => (
                                                    <option key={t} value={t} className="capitalize">{t}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                {sub.status !== 'active' && (
                                                    <button
                                                        onClick={() => updateStatus(sub.id, 'active')}
                                                        disabled={updating === sub.id}
                                                        className="text-xs text-green-400 hover:underline disabled:opacity-50"
                                                    >
                                                        Activate
                                                    </button>
                                                )}
                                                {sub.status === 'active' && (
                                                    <button
                                                        onClick={() => updateStatus(sub.id, 'cancelled')}
                                                        disabled={updating === sub.id}
                                                        className="text-xs text-red-400 hover:underline disabled:opacity-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                                {sub.status === 'trialing' && (
                                                    <button
                                                        onClick={() => updateStatus(sub.id, 'active')}
                                                        disabled={updating === sub.id}
                                                        className="text-xs text-amber-400 hover:underline disabled:opacity-50"
                                                    >
                                                        End Trial
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {new Date(sub.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="py-12 text-center text-sm text-gray-500">No subscriptions match your filters</div>
                )}
            </div>
        </div>
    )
}