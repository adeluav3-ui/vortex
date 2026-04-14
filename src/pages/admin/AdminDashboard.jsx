// src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'

// All plan prices including combo plans
const TIER_PRICES = {
    starter: 8000,
    growth: 15000,
    business: 25000,
    solo: 4500,
    hustle: 9500,
    scale: 18000,
    combo_basic: 12500,
    combo_standard: 24500,
    combo_premium: 43000,
}

// Plan display names
const TIER_NAMES = {
    starter: 'Starter',
    growth: 'Growth',
    business: 'Business',
    solo: 'Solo',
    hustle: 'Hustle',
    scale: 'Scale',
    combo_basic: 'Combo Basic',
    combo_standard: 'Combo Standard',
    combo_premium: 'Combo Premium',
}

const TIER_COLORS = {
    starter: '#6b7280',
    growth: '#eab308',
    business: '#f97316',
    solo: '#6b7280',
    hustle: '#3b82f6',
    scale: '#8b5cf6',
    combo_basic: '#6b7280',
    combo_standard: '#3b82f6',
    combo_premium: '#8b5cf6',
}

export default function AdminDashboard() {
    const { profile } = useAuth()
    const navigate = useNavigate()

    const [stats, setStats] = useState({
        totalBusinesses: 0,
        activeSubscriptions: 0,
        totalUsers: 0,
        totalRevenue: 0,
        newBusinessesThisMonth: 0,
        newUsersThisMonth: 0,
        mrr: 0,
        arr: 0,
        businessesByMode: { retail: 0, online_vendor: 0, combo: 0 }
    })
    const [recentBusinesses, setRecentBusinesses] = useState([])
    const [recentUsers, setRecentUsers] = useState([])
    const [revenueData, setRevenueData] = useState([])
    const [subscriptionData, setSubscriptionData] = useState([])
    const [modeDistribution, setModeDistribution] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (profile?.role !== 'super_admin') {
            navigate('/dashboard')
            return
        }
        fetchAdminData()
    }, [profile])

    async function fetchAdminData() {
        setLoading(true)

        try {
            // Get all businesses
            const { data: businesses, error: bizError } = await supabase
                .from('businesses')
                .select('*')
                .order('created_at', { ascending: false })

            if (bizError) throw bizError

            // Get all subscriptions with business info
            const { data: subscriptions, error: subError } = await supabase
                .from('subscriptions')
                .select(`
                    *,
                    businesses!inner (
                        id, 
                        name, 
                        mode, 
                        logo_url
                    )
                `)

            if (subError) throw subError

            // Get all users
            const { data: users, error: userError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (userError) throw userError

            // Calculate active subscriptions (excluding cancelled/inactive)
            const activeSubs = (subscriptions || []).filter(s =>
                s.status === 'active' || s.status === 'trialing'
            )

            // Calculate MRR from active subscriptions
            const mrr = activeSubs.reduce((sum, s) => sum + (TIER_PRICES[s.tier] || 0), 0)
            const arr = mrr * 12

            // Get businesses created this month
            const now = new Date()
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const newBusinessesThisMonth = (businesses || []).filter(b => new Date(b.created_at) >= thisMonth).length || 0

            // Get users created this month
            const newUsersThisMonth = (users || []).filter(u => new Date(u.created_at) >= thisMonth).length || 0

            // Calculate businesses by mode
            const businessesByMode = {
                retail: (businesses || []).filter(b => b.mode === 'retail').length,
                online_vendor: (businesses || []).filter(b => b.mode === 'online_vendor').length,
                combo: (businesses || []).filter(b => b.mode === 'combo').length
            }

            // Prepare subscription distribution data
            const subDistribution = {}
            activeSubs.forEach(sub => {
                const tierName = TIER_NAMES[sub.tier] || sub.tier
                subDistribution[tierName] = (subDistribution[tierName] || 0) + 1
            })

            const subscriptionDistribution = Object.entries(subDistribution).map(([name, value]) => ({
                name,
                value,
                color: TIER_COLORS[Object.keys(TIER_NAMES).find(key => TIER_NAMES[key] === name)] || '#6b7280'
            }))

            // Prepare mode distribution data
            const modeDist = [
                { name: 'Retail Stores', value: businessesByMode.retail, color: '#3b82f6' },
                { name: 'Online Vendors', value: businessesByMode.online_vendor, color: '#10b981' },
                { name: 'Combo Plans', value: businessesByMode.combo, color: '#8b5cf6' }
            ].filter(m => m.value > 0)

            // Prepare revenue chart data (last 6 months)
            const monthlyRevenue = {}
            activeSubs.forEach(sub => {
                const month = new Date(sub.created_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
                monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (TIER_PRICES[sub.tier] || 0)
            })

            const chartData = Object.entries(monthlyRevenue)
                .map(([month, revenue]) => ({ month, revenue }))
                .slice(-6)

            setStats({
                totalBusinesses: businesses?.length || 0,
                activeSubscriptions: activeSubs.length,
                totalUsers: users?.length || 0,
                totalRevenue: activeSubs.reduce((sum, s) => sum + (TIER_PRICES[s.tier] || 0), 0) || 0,
                newBusinessesThisMonth,
                newUsersThisMonth,
                mrr,
                arr,
                businessesByMode
            })

            setRecentBusinesses(businesses?.slice(0, 5) || [])
            setRecentUsers(users?.slice(0, 5) || [])
            setRevenueData(chartData)
            setSubscriptionData(subscriptionDistribution)
            setModeDistribution(modeDist)
        } catch (err) {
            console.error('Error fetching admin data:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-gray-400">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
                <h1 className="text-2xl font-bold mb-2">Welcome back, {profile?.full_name?.split(' ')[0] || 'Admin'}!</h1>
                <p className="text-blue-100">Here's what's happening with your platform today.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Businesses', value: stats.totalBusinesses, icon: '🏢', color: 'bg-blue-500', change: `+${stats.newBusinessesThisMonth} this month` },
                    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: '✅', color: 'bg-green-500', change: `${Math.round((stats.activeSubscriptions / stats.totalBusinesses) * 100)}% conversion` },
                    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'bg-purple-500', change: `+${stats.newUsersThisMonth} this month` },
                    { label: 'Monthly Revenue (MRR)', value: `₦${stats.mrr.toLocaleString()}`, icon: '💰', color: 'bg-orange-500', change: `ARR: ₦${stats.arr.toLocaleString()}` },
                ].map(stat => (
                    <div key={stat.label} className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:shadow-lg transition">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-gray-400">{stat.label}</p>
                            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center text-lg`}>
                                {stat.icon}
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-2">{stat.change}</p>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Revenue Trend (Last 6 Months)</h3>
                    {revenueData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                                    formatter={v => [`₦${Number(v).toLocaleString()}`, 'Revenue']}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500">No revenue data yet</div>
                    )}
                </div>

                {/* Plan Distribution Pie Chart */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Active Plan Distribution</h3>
                    {subscriptionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={subscriptionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {subscriptionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                                    formatter={(value, name) => [`${value} businesses`, name]}
                                />
                                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500">No subscription data yet</div>
                    )}
                </div>
            </div>

            {/* Business Mode Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Mode Distribution */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 lg:col-span-1">
                    <h3 className="text-sm font-semibold text-white mb-4">Business Mode Distribution</h3>
                    {modeDistribution.length > 0 ? (
                        <div className="space-y-3">
                            {modeDistribution.map(mode => (
                                <div key={mode.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mode.color }} />
                                        <span className="text-sm text-gray-300">{mode.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-white">{mode.value}</span>
                                        <span className="text-xs text-gray-500">
                                            ({Math.round((mode.value / stats.totalBusinesses) * 100)}%)
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-3 border-t border-gray-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-400">Total Businesses</span>
                                    <span className="text-sm font-bold text-white">{stats.totalBusinesses}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-gray-500">No business data yet</div>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-white mb-4">Platform Overview</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800 rounded-lg p-3">
                            <p className="text-xs text-gray-400">Businesses per Mode</p>
                            <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Retail</span>
                                    <span className="text-white font-semibold">{stats.businessesByMode.retail}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Online Vendors</span>
                                    <span className="text-white font-semibold">{stats.businessesByMode.online_vendor}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Combo</span>
                                    <span className="text-white font-semibold">{stats.businessesByMode.combo}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-3">
                            <p className="text-xs text-gray-400">Subscription Health</p>
                            <div className="mt-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Active</span>
                                    <span className="text-green-400 font-semibold">{stats.activeSubscriptions}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-gray-400">Inactive</span>
                                    <span className="text-red-400 font-semibold">{stats.totalBusinesses - stats.activeSubscriptions}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                                    <div
                                        className="bg-green-500 h-1.5 rounded-full transition-all"
                                        style={{ width: `${(stats.activeSubscriptions / stats.totalBusinesses) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Businesses */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">Recent Businesses</h3>
                        <span className="text-xs text-gray-500">Newest first</span>
                    </div>
                    <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
                        {recentBusinesses.length === 0 ? (
                            <div className="px-5 py-8 text-center text-gray-500">No businesses yet</div>
                        ) : (
                            recentBusinesses.map(business => (
                                <div key={business.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-800 transition">
                                    <div className="flex items-center gap-3">
                                        {business.logo_url ? (
                                            <img src={business.logo_url} alt={business.name} className="w-8 h-8 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center text-blue-400 text-sm font-bold">
                                                {business.name?.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-white">{business.name}</p>
                                            <p className="text-xs text-gray-500">{new Date(business.created_at).toLocaleDateString('en-NG')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${business.mode === 'combo' ? 'bg-purple-900 text-purple-300' :
                                                business.mode === 'online_vendor' ? 'bg-green-900 text-green-300' :
                                                    'bg-blue-900 text-blue-300'
                                            }`}>
                                            {business.mode === 'combo' ? 'Combo' : business.mode === 'online_vendor' ? 'Vendor' : 'Retail'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="px-5 py-3 border-t border-gray-800">
                        <button onClick={() => navigate('/admin/businesses')} className="text-xs text-blue-400 hover:underline">
                            View all businesses →
                        </button>
                    </div>
                </div>

                {/* Recent Users */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">Recent Users</h3>
                        <span className="text-xs text-gray-500">Newest first</span>
                    </div>
                    <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
                        {recentUsers.length === 0 ? (
                            <div className="px-5 py-8 text-center text-gray-500">No users yet</div>
                        ) : (
                            recentUsers.map(user => (
                                <div key={user.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-800 transition">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-900 flex items-center justify-center text-purple-400 text-sm font-bold">
                                            {user.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{user.full_name || 'No name'}</p>
                                            <p className="text-xs text-gray-500">{user.email || 'No email'}</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'super_admin' ? 'bg-yellow-900 text-yellow-300' :
                                            user.role === 'owner' ? 'bg-blue-900 text-blue-300' :
                                                user.role === 'manager' ? 'bg-cyan-900 text-cyan-300' :
                                                    'bg-gray-700 text-gray-400'
                                        } capitalize`}>
                                        {user.role || 'user'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="px-5 py-3 border-t border-gray-800">
                        <button onClick={() => navigate('/admin/users')} className="text-xs text-blue-400 hover:underline">
                            View all users →
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                        { label: 'Manage Businesses', icon: '🏢', path: '/admin/businesses', color: 'bg-blue-600' },
                        { label: 'View Subscriptions', icon: '💳', path: '/admin/subscriptions', color: 'bg-green-600' },
                        { label: 'Add Logistics', icon: '🚚', path: '/admin/logistics', color: 'bg-purple-600' },
                        { label: 'View Revenue', icon: '💰', path: '/admin/revenue', color: 'bg-orange-600' },
                        { label: 'Manage Users', icon: '👥', path: '/admin/users', color: 'bg-pink-600' },
                    ].map(action => (
                        <button
                            key={action.label}
                            onClick={() => navigate(action.path)}
                            className={`${action.color} text-white px-4 py-3 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2`}
                        >
                            <span>{action.icon}</span>
                            <span className="hidden sm:inline">{action.label}</span>
                            <span className="sm:hidden">{action.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}