import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useBranchFilter } from '../../../hooks/useBranchFilter'

const METHOD_COLORS = {
    cash: 'bg-green-50 text-green-600',
    card: 'bg-blue-50 text-blue-600',
    transfer: 'bg-purple-50 text-purple-600',
    credit: 'bg-orange-50 text-orange-600',
}

export default function SalesHistory({ refresh }) {
    const { profile } = useAuth()
    const [sales, setSales] = useState([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState(null)
    const { applyFilter } = useBranchFilter()

    useEffect(() => { fetchSales() }, [refresh])

    async function fetchSales() {
        setLoading(true)
        let query = supabase
            .from('sales')
            .select(`*, sale_items(*), customers(full_name)`)
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: false })
            .limit(100)
        query = applyFilter(query)
        const { data } = await query
        setSales(data ?? [])
        setLoading(false)
    }

    const todayTotal = sales
        .filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
        .reduce((sum, s) => sum + Number(s.total), 0)

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>

    return (
        <div>
            {/* Today summary */}
            <div className="bg-blue-50 rounded-xl px-5 py-4 mb-5 flex items-center justify-between">
                <div>
                    <p className="text-sm text-blue-600 font-medium">Today's Revenue</p>
                    <p className="text-2xl font-bold text-blue-700">₦{todayTotal.toLocaleString()}</p>
                </div>
                <div className="text-3xl">📈</div>
            </div>

            {sales.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                    <p className="text-4xl mb-3">🧾</p>
                    <p className="text-gray-500 text-sm">No sales yet</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    {sales.map(sale => (
                        <div key={sale.id} className="border-b border-gray-50 last:border-0">
                            <button
                                onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${METHOD_COLORS[sale.payment_method]}`}>
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
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900">₦{Number(sale.total).toLocaleString()}</p>
                                    <p className="text-xs text-gray-400">{sale.sale_items?.length} item(s)</p>
                                </div>
                            </button>

                            {expanded === sale.id && (
                                <div className="px-4 pb-3 bg-gray-50 space-y-1">
                                    {sale.sale_items?.map(item => (
                                        <div key={item.id} className="flex justify-between text-xs text-gray-600">
                                            <span>{item.product_name} {item.variant_name !== 'Default' ? `(${item.variant_name})` : ''} × {item.quantity}</span>
                                            <span>₦{Number(item.subtotal).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {sale.discount > 0 && (
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>Discount</span>
                                            <span>-₦{Number(sale.discount).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {sale.note && <p className="text-xs text-gray-400 italic">Note: {sale.note}</p>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}