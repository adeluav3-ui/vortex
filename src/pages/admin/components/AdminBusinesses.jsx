import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const TIER_COLORS = {
    starter: 'bg-gray-700 text-gray-300',
    growth: 'bg-yellow-900 text-yellow-300',
    business: 'bg-orange-900 text-orange-300',
    solo: 'bg-gray-700 text-gray-300',
    hustle: 'bg-blue-900 text-blue-300',
    scale: 'bg-indigo-900 text-indigo-300',
    combo_basic: 'bg-gray-700 text-gray-300',
    combo_standard: 'bg-blue-900 text-blue-300',
    combo_premium: 'bg-purple-900 text-purple-300',
}

const STATUS_COLORS = {
    active: 'bg-green-900 text-green-300',
    trialing: 'bg-amber-900 text-amber-300',
    inactive: 'bg-gray-700 text-gray-400',
    expired: 'bg-red-900 text-red-300',
    cancelled: 'bg-red-900 text-red-300',
    past_due: 'bg-red-900 text-red-300',
}

const MODE_COLORS = {
    retail: 'bg-cyan-900 text-cyan-300',
    online_vendor: 'bg-purple-900 text-purple-300',
    combo: 'bg-indigo-900 text-indigo-300',
}

const MODE_NAMES = {
    retail: '🏪 Retail',
    online_vendor: '📦 Vendor',
    combo: '🚀 Combo',
}

export default function AdminBusinesses() {
    [businesses, setBusinesses] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [modeFilter, setModeFilter] = useState('all')

    useEffect(() => {
        fetchBusinesses()
    }, [])

    async function fetchBusinesses() {
        setLoading(true)
        setError('')

        try {
            // First, get all businesses
            const { data: businessesData, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .order('created_at', { ascending: false })

            if (bizError) throw bizError

            if (!businessesData || businessesData.length === 0) {
                setBusinesses([])
                setLoading(false)
                return
            }

            // Get subscriptions for all businesses
            const businessIds = businessesData.map(b => b.id)
            const { data: subscriptionsData, error: subError } = await supabase
                .from('subscriptions')
                .select('*')
                .in('business_id', businessIds)

            if (subError) throw subError

            // Get branches count for each business
            const { data: branchesData, error: branchError } = await supabase
                .from('branches')
                .select('business_id')
                .in('business_id', businessIds)

            if (branchError) throw branchError

            // Get profiles (users) for each business
            const { data: profilesData, error: profileError } = await supabase
                .from('profiles')
                .select('business_id, full_name, role')
                .in('business_id', businessIds)

            if (profileError) throw profileError

            // Create maps for quick lookup
            const subscriptionsMap = {}
            subscriptionsData?.forEach(sub => {
                if (!subscriptionsMap[sub.business_id]) {
                    subscriptionsMap[sub.business_id] = []
                }
                subscriptionsMap[sub.business_id].push(sub)
            })

            const branchesCountMap = {}
            branchesData?.forEach(branch => {
                branchesCountMap[branch.business_id] = (branchesCountMap[branch.business_id] || 0) + 1
            })

            const profilesMap = {}
            profilesData?.forEach(profile => {
                if (!profilesMap[profile.business_id]) {
                    profilesMap[profile.business_id] = []
                }
                profilesMap[profile.business_id].push(profile)
            })

            // Enrich businesses with related data
            const enriched = businessesData.map(business => ({
                ...business,
                subscriptions: subscriptionsMap[business.id] || [],
                branches_count: branchesCountMap[business.id] || 0,
                profiles: profilesMap[business.id] || [],
                subscription: subscriptionsMap[business.id]?.[0] || null,
                owner: profilesMap[business.id]?.find(p => p.role === 'owner')
            }))

            setBusinesses(enriched)
        } catch (err) {
            console.error('Error fetching businesses:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const filtered = businesses.filter(b => {
        const matchSearch = !search.trim() ||
            b.name?.toLowerCase().includes(search.toLowerCase()) ||
            b.email?.toLowerCase().includes(search.toLowerCase()) ||
            b.owner?.full_name?.toLowerCase().includes(search.toLowerCase())

        const matchMode = modeFilter === 'all' || b.mode === modeFilter

        return matchSearch && matchMode
    })

    // Calculate summary stats
    const vendorCount = businesses.filter(b => b.mode === 'online_vendor').length
    const retailCount = businesses.filter(b => b.mode === 'retail').length
    const comboCount = businesses.filter(b => b.mode === 'combo').length

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="animate-spin text-3xl mb-3">⏳</div>
                    <p className="text-sm text-gray-500">Loading businesses...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-900/50 border border-red-800 rounded-xl p-6 text-center">
                <p className="text-red-400">Error loading businesses: {error}</p>
                <button
                    onClick={fetchBusinesses}
                    className="mt-3 text-sm text-blue-400 hover:underline"
                >
                    Try again →
                </button>
            </div>
        )
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-lg font-bold text-white">
                        All Businesses ({businesses.length})
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {retailCount} retail · {vendorCount} vendors · {comboCount} combo
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {/* Mode filter */}
                    <div className="flex gap-1">
                        {[
                            { value: 'all', label: 'All' },
                            { value: 'retail', label: '🏪 Retail' },
                            { value: 'online_vendor', label: '📦 Vendor' },
                            { value: 'combo', label: '🚀 Combo' },
                        ].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setModeFilter(f.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${modeFilter === f.value
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search businesses..."
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                    />
                </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800 bg-gray-800/50">
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Business</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mode</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Owner</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Plan</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Branches</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Users</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-4 py-12 text-center text-sm text-gray-500">
                                        No businesses match your search
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(biz => {
                                    const sub = biz.subscription
                                    const owner = biz.owner
                                    const isTrialing = sub?.status === 'trialing'
                                    const mode = biz.mode || 'retail'

                                    return (
                                        <tr key={biz.id} className="hover:bg-gray-800 transition">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {biz.logo_url ? (
                                                        <img
                                                            src={biz.logo_url}
                                                            alt={biz.name}
                                                            className="w-8 h-8 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center text-blue-400 text-sm font-bold">
                                                            {biz.name?.charAt(0) || '?'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-white">{biz.name || 'Unnamed'}</p>
                                                        {biz.email && <p className="text-xs text-gray-500">{biz.email}</p>}
                                                        {biz.business_type && biz.mode !== 'online_vendor' && (
                                                            <p className="text-xs text-gray-600 capitalize mt-0.5">{biz.business_type}</p>
                                                        )}
                                                        {biz.vendor_category && biz.mode === 'online_vendor' && (
                                                            <p className="text-xs text-gray-600 capitalize mt-0.5">{biz.vendor_category}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${MODE_COLORS[mode] || 'bg-gray-700 text-gray-400'}`}>
                                                    {MODE_NAMES[mode] || mode}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="text-sm text-gray-300">{owner?.full_name || '—'}</p>
                                                    {owner?.email && <p className="text-xs text-gray-500">{owner.email}</p>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize w-fit ${TIER_COLORS[sub?.tier] ?? 'bg-gray-700 text-gray-400'}`}>
                                                        {sub?.tier ? (sub.tier.includes('combo') ?
                                                            sub.tier.replace('combo_', 'Combo ').charAt(0).toUpperCase() + sub.tier.replace('combo_', 'Combo ').slice(1) :
                                                            sub.tier) : 'No plan'}
                                                    </span>
                                                    {isTrialing && (
                                                        <span className="text-xs text-amber-400 font-medium">🎁 Trial</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[sub?.status] ?? 'bg-gray-700 text-gray-400'}`}>
                                                    {sub?.status === 'trialing' ? 'Trial' : sub?.status || 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 text-center">
                                                {mode === 'online_vendor' ? '—' : (biz.branches_count || 0)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 text-center">
                                                {biz.profiles?.length || 0}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">
                                                {biz.created_at ? new Date(biz.created_at).toLocaleDateString('en-NG', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                }) : '—'}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}