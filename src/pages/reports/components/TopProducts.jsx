import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { exportToCSV } from '../utils/exportUtils';
import { useBranchFilter } from '../../../hooks/useBranchFilter';

export default function TopProducts({ dateRange }) {
    const { profile } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { applyFilter } = useBranchFilter();

    const mode = profile?.businesses?.mode;
    const isCombo = mode === 'combo';

    useEffect(() => {
        if (dateRange?.from && dateRange?.to) {
            fetchData();
        }
    }, [dateRange]);

    async function fetchData() {
        setLoading(true);

        try {
            // Fetch completed POS sales
            let posQuery = supabase
                .from('sales')
                .select('id')
                .eq('business_id', profile.business_id)
                .eq('status', 'completed')
                .gte('created_at', dateRange.from)
                .lte('created_at', `${dateRange.to}T23:59:59`);

            posQuery = applyFilter(posQuery);
            const { data: posSales, error: posError } = await posQuery;

            if (posError) console.error('POS sales fetch error:', posError);

            let allItems = [];

            // Process POS sale items
            if (posSales?.length) {
                const saleIds = posSales.map(s => s.id);

                const { data: saleItems, error: itemsError } = await supabase
                    .from('sale_items')
                    .select('product_name, variant_name, quantity, subtotal')
                    .in('sale_id', saleIds);

                if (itemsError) console.error('Sale items error:', itemsError);

                const posAgg = (saleItems ?? []).reduce((acc, item) => {
                    const variant = item.variant_name && item.variant_name !== 'Default'
                        ? ` (${item.variant_name})`
                        : '';
                    const key = `${item.product_name}${variant}`;

                    if (!acc[key]) {
                        acc[key] = { name: key, quantity: 0, revenue: 0 };
                    }
                    acc[key].quantity += Number(item.quantity || 0);
                    acc[key].revenue += Number(item.subtotal || 0);
                    return acc;
                }, {});

                allItems = Object.values(posAgg);
            }

            // For combo users: also include vendor order items
            if (isCombo) {
                const { data: vendorOrders, error: orderError } = await supabase
                    .from('vendor_orders')
                    .select('id')
                    .eq('business_id', profile.business_id)
                    .eq('status', 'completed')
                    .gte('created_at', dateRange.from)
                    .lte('created_at', `${dateRange.to}T23:59:59`);

                if (orderError) console.error('Vendor orders error:', orderError);

                if (vendorOrders?.length) {
                    const orderIds = vendorOrders.map(o => o.id);

                    const { data: orderItems, error: orderItemsError } = await supabase
                        .from('order_items')
                        .select('product_name, variant_name, quantity, subtotal')
                        .in('order_id', orderIds);

                    if (orderItemsError) console.error('Order items error:', orderItemsError);

                    const vendorAgg = (orderItems ?? []).reduce((acc, item) => {
                        const variant = item.variant_name ? ` (${item.variant_name})` : '';
                        const key = `${item.product_name}${variant}`;

                        if (!acc[key]) {
                            acc[key] = { name: key, quantity: 0, revenue: 0 };
                        }
                        acc[key].quantity += Number(item.quantity || 0);
                        acc[key].revenue += Number(item.subtotal || 0);
                        return acc;
                    }, {});

                    const vendorItems = Object.values(vendorAgg);

                    // Merge POS + Vendor items
                    const mergedMap = new Map();

                    [...allItems, ...vendorItems].forEach(item => {
                        if (mergedMap.has(item.name)) {
                            const existing = mergedMap.get(item.name);
                            existing.quantity += item.quantity;
                            existing.revenue += item.revenue;
                        } else {
                            mergedMap.set(item.name, { ...item });
                        }
                    });

                    allItems = Array.from(mergedMap.values());
                }
            }

            // Sort by revenue descending
            allItems.sort((a, b) => b.revenue - a.revenue);

            setItems(allItems);
        } catch (error) {
            console.error('Error fetching top products:', error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }

    const top10 = items.slice(0, 10);

    if (loading) {
        return <div className="text-sm text-gray-400 py-8 text-center">Loading products data...</div>;
    }

    return (
        <div className="space-y-5">
            {/* Top 10 Chart */}
            {top10.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Top 10 Products by Revenue</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={top10} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                type="number"
                                tick={{ fontSize: 11 }}
                                tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fontSize: 10 }}
                                width={160}
                            />
                            <Tooltip
                                formatter={v => [`₦${Number(v).toLocaleString()}`, 'Revenue']}
                            />
                            <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* All Products Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                        All Products ({items.length})
                    </h3>
                    <button
                        onClick={() => exportToCSV(
                            items.map((item, i) => ({
                                Rank: i + 1,
                                Product: item.name,
                                'Qty Sold': item.quantity,
                                Revenue: item.revenue,
                            })),
                            'top-products-report'
                        )}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Export CSV
                    </button>
                </div>

                {items.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">
                        No product sales data found in this period
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rank</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty Sold</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {items.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-400 font-medium">#{i + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.quantity}</td>
                                        <td className="px-4 py-3 font-semibold text-blue-600">
                                            ₦{Number(item.revenue).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}