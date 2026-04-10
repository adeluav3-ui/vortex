import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

const UNITS = ['piece', 'kg', 'g', 'litre', 'ml', 'pack', 'carton', 'bottle', 'bag', 'dozen']

export default function ProductModal({ product, onClose, onSaved }) {
    const { profile } = useAuth()
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [activeTab, setActiveTab] = useState('details')

    const [form, setForm] = useState({
        name: product?.name ?? '',
        description: product?.description ?? '',
        category_id: product?.category_id ?? '',
        unit: product?.unit ?? 'piece',
    })

    const [variants, setVariants] = useState(
        product?.product_variants?.length
            ? product.product_variants.map(v => ({
                id: v.id,
                name: v.name,
                sku: v.sku ?? '',
                buying_price: v.buying_price ?? 0,
                selling_price: v.selling_price ?? 0,
                stock: v.stock_levels?.[0]?.quantity ?? 0,
                low_stock_threshold: v.stock_levels?.[0]?.low_stock_threshold ?? 5,
                stock_level_id: v.stock_levels?.[0]?.id ?? null,
            }))
            : [{ id: null, name: 'Default', sku: '', buying_price: 0, selling_price: 0, stock: 0, low_stock_threshold: 5, stock_level_id: null }]
    )

    useEffect(() => {
        supabase.from('categories').select('*')
            .eq('business_id', profile.business_id)
            .then(({ data }) => setCategories(data ?? []))
    }, [])

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    function handleVariantChange(index, field, value) {
        const updated = [...variants]
        updated[index] = { ...updated[index], [field]: value }
        setVariants(updated)
    }

    function addVariant() {
        setVariants([...variants, { id: null, name: '', sku: '', buying_price: 0, selling_price: 0, stock: 0, low_stock_threshold: 5, stock_level_id: null }])
    }

    function removeVariant(index) {
        if (variants.length === 1) return
        setVariants(variants.filter((_, i) => i !== index))
    }

    async function handleSave() {
        setError('')
        if (!form.name.trim()) return setError('Product name is required')
        if (variants.some(v => !v.name.trim())) return setError('All variants need a name')
        if (variants.some(v => Number(v.selling_price) <= 0)) return setError('All variants need a selling price')
        setLoading(true)

        try {
            let productId = product?.id

            if (product) {
                // Update product
                await supabase.from('products').update({
                    name: form.name,
                    description: form.description,
                    category_id: form.category_id || null,
                    unit: form.unit,
                }).eq('id', productId)
            } else {
                // Insert product
                const { data, error: pErr } = await supabase.from('products').insert({
                    business_id: profile.business_id,
                    name: form.name,
                    description: form.description,
                    category_id: form.category_id || null,
                    unit: form.unit,
                }).select().single()
                if (pErr) throw pErr
                productId = data.id
            }

            // Upsert variants + stock levels
            for (const v of variants) {
                let variantId = v.id

                if (v.id) {
                    await supabase.from('product_variants').update({
                        name: v.name,
                        sku: v.sku || null,
                        buying_price: v.buying_price,
                        selling_price: v.selling_price,
                    }).eq('id', v.id)
                } else {
                    const { data, error: vErr } = await supabase.from('product_variants').insert({
                        product_id: productId,
                        business_id: profile.business_id,
                        name: v.name,
                        sku: v.sku || null,
                        buying_price: v.buying_price,
                        selling_price: v.selling_price,
                    }).select().single()
                    if (vErr) throw vErr
                    variantId = data.id
                }

                // Upsert stock level — replace the entire if/else block
                await supabase.from('stock_levels')
                    .upsert({
                        business_id: profile.business_id,
                        branch_id: profile.branch_id,
                        variant_id: variantId,
                        quantity: v.stock,
                        low_stock_threshold: v.low_stock_threshold,
                    }, {
                        onConflict: 'branch_id,variant_id'
                    })
            }

            onSaved()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {product ? 'Edit Product' : 'Add Product'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    {['details', 'variants'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition capitalize ${activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                    {activeTab === 'details' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Indomie Noodles"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="Optional description"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select
                                        name="category_id"
                                        value={form.category_id}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">No category</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                    <select
                                        name="unit"
                                        value={form.unit}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'variants' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">Each variant has its own price and stock level.</p>
                            {variants.map((v, i) => (
                                <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-700">Variant {i + 1}</p>
                                        {variants.length > 1 && (
                                            <button onClick={() => removeVariant(i)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Variant Name</label>
                                            <input
                                                value={v.name}
                                                onChange={e => handleVariantChange(i, 'name', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="e.g. Small, Red, 500ml"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">SKU (optional)</label>
                                            <input
                                                value={v.sku}
                                                onChange={e => handleVariantChange(i, 'sku', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="e.g. NDL-SM-001"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Buying Price (₦)</label>
                                            <input
                                                type="number"
                                                value={v.buying_price}
                                                onChange={e => handleVariantChange(i, 'buying_price', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Selling Price (₦)</label>
                                            <input
                                                type="number"
                                                value={v.selling_price}
                                                onChange={e => handleVariantChange(i, 'selling_price', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Stock Quantity</label>
                                            <input
                                                type="number"
                                                value={v.stock}
                                                onChange={e => handleVariantChange(i, 'stock', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Low Stock Alert</label>
                                            <input
                                                type="number"
                                                value={v.low_stock_threshold}
                                                onChange={e => handleVariantChange(i, 'low_stock_threshold', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={addVariant}
                                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition"
                            >
                                + Add Variant
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
                    </button>
                </div>
            </div>
        </div>
    )
}