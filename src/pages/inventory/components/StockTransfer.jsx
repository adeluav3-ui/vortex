import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export default function StockTransfer({ onClose }) {
    const { profile, user } = useAuth()
    const [branches, setBranches] = useState([])
    const [products, setProducts] = useState([])
    const [transfers, setTransfers] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [activeTab, setActiveTab] = useState('transfer')

    const [form, setForm] = useState({
        from_branch_id: profile?.branch_id ?? '',
        to_branch_id: '',
        variant_id: '',
        quantity: '',
        note: '',
    })

    const [availableStock, setAvailableStock] = useState(0)

    useEffect(() => {
        fetchBranches()
        fetchProducts()
        fetchTransfers()
    }, [])

    useEffect(() => {
        if (form.variant_id && form.from_branch_id) {
            fetchAvailableStock()
        }
    }, [form.variant_id, form.from_branch_id])

    async function fetchBranches() {
        const { data } = await supabase
            .from('branches')
            .select('*')
            .eq('business_id', profile?.business_id)
        setBranches(data ?? [])
    }

    async function fetchProducts() {
        const { data } = await supabase
            .from('products')
            .select(`
                id, name,
                product_variants(id, name, sku)
            `)
            .eq('business_id', profile?.business_id)
            .eq('is_active', true)
        setProducts(data ?? [])
    }

    async function fetchAvailableStock() {
        const { data } = await supabase
            .from('stock_levels')
            .select('quantity')
            .eq('variant_id', form.variant_id)
            .eq('branch_id', form.from_branch_id)
            .single()
        setAvailableStock(Number(data?.quantity ?? 0))
    }

    async function fetchTransfers() {
        const { data } = await supabase
            .from('stock_transfers')
            .select(`
                *,
                from_branch:from_branch_id(name),
                to_branch:to_branch_id(name),
                product_variants(name, products(name))
            `)
            .eq('business_id', profile?.business_id)
            .order('created_at', { ascending: false })
            .limit(20)
        setTransfers(data ?? [])
    }

    async function handleTransfer() {
        setError('')
        setSuccess('')

        if (!form.from_branch_id) return setError('Select source branch')
        if (!form.to_branch_id) return setError('Select destination branch')
        if (form.from_branch_id === form.to_branch_id) return setError('Source and destination must be different')
        if (!form.variant_id) return setError('Select a product')
        const qty = Number(form.quantity)
        if (!qty || qty <= 0) return setError('Enter a valid quantity')
        if (qty > availableStock) return setError(`Only ${availableStock} units available at source branch`)

        setLoading(true)

        try {
            // 1. Deduct from source branch
            const { data: sourceStock } = await supabase
                .from('stock_levels')
                .select('id, quantity')
                .eq('variant_id', form.variant_id)
                .eq('branch_id', form.from_branch_id)
                .single()

            if (!sourceStock) throw new Error('Source stock level not found')

            const { error: deductError } = await supabase
                .from('stock_levels')
                .update({ quantity: Number(sourceStock.quantity) - qty })
                .eq('id', sourceStock.id)

            if (deductError) throw deductError

            // 2. Add to destination branch
            const { data: destStock } = await supabase
                .from('stock_levels')
                .select('id, quantity')
                .eq('variant_id', form.variant_id)
                .eq('branch_id', form.to_branch_id)
                .single()

            if (destStock) {
                const { error: addError } = await supabase
                    .from('stock_levels')
                    .update({ quantity: Number(destStock.quantity) + qty })
                    .eq('id', destStock.id)

                if (addError) throw addError
            } else {
                // Create stock level for destination if it doesn't exist
                const { error: insertError } = await supabase
                    .from('stock_levels')
                    .insert({
                        business_id: profile.business_id,
                        branch_id: form.to_branch_id,
                        variant_id: form.variant_id,
                        quantity: qty,
                    })

                if (insertError) throw insertError
            }

            // 3. Log stock movements
            const fromBranch = branches.find(b => b.id === form.from_branch_id)
            const toBranch = branches.find(b => b.id === form.to_branch_id)

            const { error: movementError } = await supabase.from('stock_movements').insert([
                {
                    business_id: profile.business_id,
                    branch_id: form.from_branch_id,
                    variant_id: form.variant_id,
                    user_id: user.id,
                    type: 'transfer',
                    quantity: -qty,
                    note: `Transfer to ${toBranch?.name}${form.note ? ` — ${form.note}` : ''}`,
                },
                {
                    business_id: profile.business_id,
                    branch_id: form.to_branch_id,
                    variant_id: form.variant_id,
                    user_id: user.id,
                    type: 'transfer',
                    quantity: qty,
                    note: `Transfer from ${fromBranch?.name}${form.note ? ` — ${form.note}` : ''}`,
                },
            ])

            if (movementError) throw movementError

            // 4. Record transfer
            const { error: transferError } = await supabase.from('stock_transfers').insert({
                business_id: profile.business_id,
                from_branch_id: form.from_branch_id,
                to_branch_id: form.to_branch_id,
                variant_id: form.variant_id,
                user_id: user.id,
                quantity: qty,
                status: 'completed',
                note: form.note || null,
            })

            if (transferError) throw transferError

            setSuccess(`Successfully transferred ${qty} units.`)
            setForm(f => ({ ...f, quantity: '', note: '' }))
            setAvailableStock(prev => prev - qty)
            fetchTransfers()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Flat list of variants for the select
    const variantOptions = products.flatMap(p =>
        p.product_variants?.map(v => ({
            id: v.id,
            label: `${p.name}${v.name !== 'Default' ? ` — ${v.name}` : ''}${v.sku ? ` (${v.sku})` : ''}`,
        })) ?? []
    )

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Stock Transfers</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    {['transfer', 'history'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition capitalize ${activeTab === tab
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab === 'transfer' ? 'New Transfer' : 'Transfer History'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {activeTab === 'transfer' && (
                        <div className="space-y-4">
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            {success && <p className="text-sm text-green-600">{success}</p>}

                            {/* From / To branches */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">From Branch</label>
                                    <select
                                        value={form.from_branch_id}
                                        onChange={e => setForm({ ...form, from_branch_id: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select branch</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">To Branch</label>
                                    <select
                                        value={form.to_branch_id}
                                        onChange={e => setForm({ ...form, to_branch_id: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select branch</option>
                                        {branches
                                            .filter(b => b.id !== form.from_branch_id)
                                            .map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            {/* Product */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                                <select
                                    value={form.variant_id}
                                    onChange={e => setForm({ ...form, variant_id: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select product</option>
                                    {variantOptions.map(v => (
                                        <option key={v.id} value={v.id}>{v.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Available stock indicator */}
                            {form.variant_id && form.from_branch_id && (
                                <div className={`px-4 py-2.5 rounded-lg text-sm ${availableStock > 0
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'bg-red-50 text-red-600'
                                    }`}>
                                    {availableStock > 0
                                        ? `${availableStock} units available at source branch`
                                        : 'No stock available at source branch'}
                                </div>
                            )}

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Transfer</label>
                                <input
                                    type="number"
                                    value={form.quantity}
                                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0"
                                    min="1"
                                    max={availableStock}
                                />
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                                <input
                                    value={form.note}
                                    onChange={e => setForm({ ...form, note: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Reason for transfer..."
                                />
                            </div>

                            <button
                                onClick={handleTransfer}
                                disabled={loading || availableStock === 0}
                                className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Transfer Stock'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div>
                            {transfers.length === 0 ? (
                                <div className="py-12 text-center text-sm text-gray-400">
                                    No transfers yet
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {transfers.map(t => (
                                        <div key={t.id} className="bg-gray-50 rounded-xl px-4 py-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {t.product_variants?.products?.name}
                                                    {t.product_variants?.name !== 'Default' && (
                                                        <span className="text-gray-500"> — {t.product_variants?.name}</span>
                                                    )}
                                                </p>
                                                <span className="text-sm font-bold text-blue-600">{t.quantity} units</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{t.from_branch?.name}</span>
                                                <span>→</span>
                                                <span>{t.to_branch?.name}</span>
                                            </div>
                                            {t.note && <p className="text-xs text-gray-400 mt-1 italic">{t.note}</p>}
                                            <p className="text-xs text-gray-300 mt-1">
                                                {new Date(t.created_at).toLocaleDateString('en-NG', {
                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}