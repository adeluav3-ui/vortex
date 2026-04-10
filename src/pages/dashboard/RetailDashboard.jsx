import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import { useBranchFilter } from '../../hooks/useBranchFilter'

export default function RetailDashboard() {
    const { profile } = useAuth()
    const [stats, setStats] = useState({
        todaySales: 0,
        inventoryItems: 0,
        totalCustomers: 0,
        expensesToday: 0,
    })
    const [recentSales, setRecentSales] = useState([])
    const [loading, setLoading] = useState(true)
    const { applyFilter } = useBranchFilter()

    useEffect(() => {
        if (!profile?.business_id) return
        fetchStats()

        const channel = supabase
            .channel('retail-dashboard')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'sales',
                filter: `business_id=eq.${profile.business_id}`,
            }, () => fetchStats())
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'expenses',
                filter: `business_id=eq.${profile.business_id}`,
            }, () => fetchStats())
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [profile?.business_id])

    async function fetchStats() {
        const now = new Date()
        const todayDate = now.toISOString().split('T')[0]
        const todayStart = new Date(`${todayDate}T00:00:00.000Z`)

        let salesQuery = supabase
            .from('sales')
            .select('total')
            .eq('business_id', profile.business_id)
            .eq('status', 'completed')
            .gte('created_at', todayStart.toISOString())
        salesQuery = applyFilter(salesQuery)

        let recentQuery = supabase
            .from('sales')
            .select('*, customers(full_name)')
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: false })
            .limit(5)
        recentQuery = applyFilter(recentQuery)

        let expensesQuery = supabase
            .from('expenses')
            .select('amount')
            .eq('business_id', profile.business_id)
            .gte('expense_date', todayDate)
            .lte('expense_date', todayDate)
        expensesQuery = applyFilter(expensesQuery)

        const [salesRes, inventoryRes, customerRes, recentRes, expensesRes] = await Promise.all([
            salesQuery,
            supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', profile.business_id)
                .eq('is_active', true),
            supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', profile.business_id),
            recentQuery,
            expensesQuery,
        ])

        const todaySales = salesRes.data?.reduce((sum, s) => sum + Number(s.total), 0) ?? 0
        const expensesToday = expensesRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0

        setStats({
            todaySales,
            inventoryItems: inventoryRes.count ?? 0,
            totalCustomers: customerRes.count ?? 0,
            expensesToday,
        })
        setRecentSales(recentRes.data ?? [])
        setLoading(false)
    }

    const METHOD_COLORS = {
        cash: 'bg-green-50 text-green-600',
        card: 'bg-blue-50 text-blue-600',
        transfer: 'bg-purple-50 text-purple-600',
        credit: 'bg-orange-50 text-orange-600',
    }

    return (
        <PageWrapper title="Dashboard">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: "Today's Sales", value: `₦${stats.todaySales.toLocaleString()}`, icon: '🧾', color: 'text-blue-600' },
                    { label: 'Active Products', value: stats.inventoryItems.toString(), icon: '📦', color: 'text-purple-600' },
                    { label: 'Total Customers', value: stats.totalCustomers.toString(), icon: '👥', color: 'text-green-600' },
                    { label: 'Expenses Today', value: `₦${stats.expensesToday.toLocaleString()}`, icon: '💸', color: 'text-orange-600' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-500">{stat.label}</p>
                            <span className="text-xl">{stat.icon}</span>
                        </div>
                        <p className={`text-2xl font-bold ${loading ? 'text-gray-300' : stat.color}`}>
                            {loading ? '...' : stat.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Recent Sales</h3>
                    <span className="text-xs text-green-500 font-medium">● Live</span>
                </div>
                {recentSales.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">
                        No sales yet — head to the POS to record your first sale
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {recentSales.map(sale => (
                            <div key={sale.id} className="flex items-center justify-between px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${METHOD_COLORS[sale.payment_method] ?? 'bg-gray-50 text-gray-600'}`}>
                                        {sale.payment_method}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{sale.sale_number}</p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(sale.created_at).toLocaleString('en-NG', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                            {sale.customers ? ` — ${sale.customers.full_name}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-gray-900">₦{Number(sale.total).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </PageWrapper>
    )
}