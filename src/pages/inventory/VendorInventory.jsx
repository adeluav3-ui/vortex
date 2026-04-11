import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getVendorLimits } from '../../lib/vendorPlanLimits'
import PageWrapper from '../../components/layout/PageWrapper'

// ── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({ product, businessId, branchId, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: product?.name ?? '',
        description: product?.description ?? '',
        selling_price: product?.selling_price ?? '',
        cost_price: product?.cost_price ?? '',
        stock_quantity: product?.stock_quantity ?? '',
        is_active: product?.is_active ?? true,
        image_url: product?.image_url ?? '',
    })
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(product?.image_url ?? null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef()

    function handleImageChange(e) {
        const file = e.target.files[0]
        if (!file) return
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
    }

    async function handleSave() {
        if (!form.name.trim()) return setError('Product name is required')
        if (!form.selling_price || isNaN(Number(form.selling_price))) return setError('Enter a valid selling price')
        setSaving(true)
        setError('')
        try {
            let image_url = form.image_url
            if (imageFile) {
                const ext = imageFile.name.split('.').pop()
                const path = `${businessId}/${Date.now()}.${ext}`
                const { error: uploadError } = await supabase.storage.from('product-images').upload(path, imageFile, { upsert: true })
                if (uploadError) throw uploadError
                const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path)
                image_url = urlData.publicUrl
            }

            const productPayload = {
                business_id: businessId,
                name: form.name.trim(),
                description: form.description.trim() || null,
                unit: 'piece',
                is_active: form.is_active,
                image_url,
            }

            if (product) {
                await supabase.from('products').update(productPayload).eq('id', product.id)
                if (product._variantId) {
                    await supabase.from('product_variants').update({
                        selling_price: Number(form.selling_price),
                        buying_price: Number(form.cost_price) || 0,
                    }).eq('id', product._variantId)
                    if (product._stockLevelId) {
                        await supabase.from('stock_levels').update({ quantity: Number(form.stock_quantity) || 0 }).eq('id', product._stockLevelId)
                    }
                }
            } else {
                const { data: newProduct, error: productError } = await supabase.from('products').insert(productPayload).select().single()
                if (productError) throw productError
                const { data: variant, error: variantError } = await supabase.from('product_variants').insert({
                    product_id: newProduct.id,
                    business_id: businessId,
                    name: 'Default',
                    selling_price: Number(form.selling_price),
                    buying_price: Number(form.cost_price) || 0,
                }).select().single()
                if (variantError) throw variantError
                if (branchId) {
                    await supabase.from('stock_levels').insert({
                        business_id: businessId,
                        branch_id: branchId,
                        variant_id: variant.id,
                        quantity: Number(form.stock_quantity) || 0,
                        low_stock_threshold: 5,
                    })
                }
            }
            onSaved()
        } catch (err) {
            setError(err.message)
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 z-10">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900">{product ? 'Edit Product' : 'Add Product'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                    <div className="flex items-center gap-4">
                        <div onClick={() => fileInputRef.current?.click()}
                            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-blue-400 transition shrink-0">
                            {imagePreview ? <img src={imagePreview} alt="preview" className="w-full h-full object-cover" /> : <span className="text-2xl">📷</span>}
                        </div>
                        <div className="space-y-1">
                            <button onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 font-medium hover:underline block">
                                {imagePreview ? 'Change image' : 'Upload image'}
                            </button>
                            {imagePreview && <button onClick={() => { setImageFile(null); setImagePreview(null); setForm({ ...form, image_url: '' }) }} className="text-xs text-red-400 hover:text-red-600 block">Remove</button>}
                            <p className="text-xs text-gray-400">JPG, PNG — max 2MB</p>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ankara Midi Dress" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Shown on your storefront to customers..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₦) <span className="text-red-500">*</span></label>
                        <input type="number" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₦)</label>
                        <input type="number" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                    <input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <div>
                        <p className="text-sm font-medium text-gray-700">Show on storefront</p>
                        <p className="text-xs text-gray-400">Hidden products won't appear to customers</p>
                    </div>
                    <button onClick={() => setForm({ ...form, is_active: !form.is_active })}
                        className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                        {saving ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VendorInventory() {
    const { profile } = useAuth()
    const navigate = useNavigate()

    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [overLimitBanner, setOverLimitBanner] = useState(null)

    // ── Always use vendor-specific limits with subscription status ────────────
    // getVendorLimits(tier, status) handles trialing → scale, active → real tier
    const tier = profile?.businesses?.subscription_tier ?? 'solo'
    const subStatus = profile?.subscription?.status ?? 'inactive'
    const { products: limit } = getVendorLimits(tier, subStatus)

    // Limit is based on ACTIVE products only — hidden ones don't count
    const activeCount = products.filter(p => p.is_active).length
    const atLimit = limit !== Infinity && activeCount >= limit

    useEffect(() => {
        if (!profile?.business_id) return
        fetchProducts()
    }, [profile?.business_id])

    async function fetchProducts() {
        setLoading(true)
        const { data } = await supabase
            .from('products')
            .select(`
                id, name, description, is_active, image_url, created_at,
                product_variants (
                    id, selling_price, buying_price,
                    stock_levels ( id, quantity )
                )
            `)
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: true }) // oldest first — critical for limit enforcement

        const enriched = (data ?? []).map(p => {
            const variant = p.product_variants?.[0]
            const stockLevel = variant?.stock_levels?.[0]
            return {
                ...p,
                selling_price: variant?.selling_price ?? 0,
                cost_price: variant?.buying_price ?? 0,
                stock_quantity: stockLevel?.quantity ?? 0,
                _variantId: variant?.id ?? null,
                _stockLevelId: stockLevel?.id ?? null,
            }
        })

        // ── Plan enforcement on load ──────────────────────────────────────────
        // When a vendor downgrades (e.g. trial ends → Solo), they may have more
        // active products than their new plan allows. We enforce this by
        // deactivating the most recently added products beyond the limit,
        // keeping the oldest ones active (first-in, first-protected).
        if (limit !== Infinity) {
            const activeOnes = enriched.filter(p => p.is_active)
            if (activeOnes.length > limit) {
                // Products sorted oldest-first. Keep first `limit`, deactivate rest.
                const toDeactivate = activeOnes.slice(limit)
                const ids = toDeactivate.map(p => p.id)

                await supabase.from('products').update({ is_active: false }).in('id', ids)

                // Apply deactivation to local array without waiting for refetch
                enriched.forEach(p => { if (ids.includes(p.id)) p.is_active = false })
                setOverLimitBanner({ count: toDeactivate.length, limit })
            } else {
                setOverLimitBanner(null)
            }
        } else {
            setOverLimitBanner(null)
        }

        // Display newest first for the UI
        setProducts(enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
        setLoading(false)
    }

    async function toggleVisibility(product) {
        // Prevent re-activating when at the plan limit
        if (!product.is_active && atLimit) return
        await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id)
        fetchProducts()
    }

    async function deleteProduct(id) {
        if (!confirm('Delete this product? This cannot be undone.')) return
        setDeletingId(id)
        await supabase.from('products').delete().eq('id', id)
        await fetchProducts()
        setDeletingId(null)
    }

    const filtered = products.filter(p => {
        const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase())
        const matchFilter = (() => {
            switch (filter) {
                case 'active': return p.is_active
                case 'hidden': return !p.is_active
                case 'low_stock': return p.stock_quantity > 0 && p.stock_quantity <= 5
                case 'out_of_stock': return p.stock_quantity === 0
                default: return true
            }
        })()
        return matchSearch && matchFilter
    })

    const profit = p => (p.cost_price && p.selling_price) ? Number(p.selling_price) - Number(p.cost_price) : null

    return (
        <PageWrapper title="Products">

            {/* ── Downgrade enforcement banner ── */}
            {overLimitBanner && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                    <span className="text-lg shrink-0">⚠️</span>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-800">
                            {overLimitBanner.count} product{overLimitBanner.count !== 1 ? 's were' : ' was'} hidden due to your plan limit
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            Your current plan allows {overLimitBanner.limit} active products. The {overLimitBanner.count} most recently added
                            {overLimitBanner.count !== 1 ? ' products have' : ' product has'} been hidden. Delete or hide others to re-activate them, or upgrade your plan.
                        </p>
                    </div>
                    <a href="/settings/billing" className="text-xs text-amber-700 font-semibold underline shrink-0 mt-0.5">Upgrade</a>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                    {activeCount} active · {products.length} total
                    {limit !== Infinity && (
                        <span className={`ml-1 ${atLimit ? 'text-red-500 font-medium' : ''}`}>
                            · {activeCount}/{limit} plan limit
                        </span>
                    )}
                </p>
                <button
                    onClick={() => { setEditingProduct(null); setShowModal(true) }}
                    disabled={atLimit}
                    title={atLimit ? `Plan limit of ${limit} active products reached` : ''}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${atLimit ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                    ➕ Add Product
                </button>
            </div>

            {/* ── Approaching limit warning ── */}
            {limit !== Infinity && (atLimit || activeCount >= limit * 0.8) && (
                <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between ${atLimit ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}>
                    <span>
                        {atLimit
                            ? `You've reached your ${limit} active product limit. Hide some products or upgrade.`
                            : `You're using ${activeCount} of ${limit} active products on your plan.`}
                    </span>
                    <a href="/settings/billing" className="font-semibold underline ml-4 shrink-0">Upgrade</a>
                </div>
            )}

            {/* ── Storefront nudge ── */}
            {products.length > 0 && (
                <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
                    <p className="text-sm text-blue-800">
                        <span className="font-semibold">Tip:</span> Products you mark as visible automatically appear on your storefront.
                    </p>
                    <button
                        onClick={() => navigate('/storefront')}
                        className="text-xs text-blue-600 font-semibold hover:underline shrink-0 ml-3"
                    >
                        Manage storefront →
                    </button>
                </div>
            )}

            {/* ── Search + filter ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <select value={filter} onChange={e => setFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="all">All Products</option>
                    <option value="active">Visible on storefront</option>
                    <option value="hidden">Hidden</option>
                    <option value="low_stock">Low Stock (≤5)</option>
                    <option value="out_of_stock">Out of Stock</option>
                </select>
            </div>

            {/* ── Grid ── */}
            {loading ? (
                <div className="py-16 text-center text-sm text-gray-400">Loading products...</div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center space-y-3">
                    <p className="text-3xl">📦</p>
                    <p className="text-sm text-gray-500">{search || filter !== 'all' ? 'No products match your filter' : 'No products yet'}</p>
                    {!search && filter === 'all' && (
                        <button onClick={() => { setEditingProduct(null); setShowModal(true) }} className="text-sm text-blue-600 font-medium hover:underline">
                            Add your first product →
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(product => {
                        const margin = profit(product)
                        const isLow = product.stock_quantity > 0 && product.stock_quantity <= 5
                        const isOut = product.stock_quantity === 0
                        const cantActivate = !product.is_active && atLimit

                        return (
                            <div key={product.id}
                                className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col transition ${product.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                                <div className="w-full h-40 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                                    {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <span className="text-4xl">📷</span>}
                                    <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${product.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                                        {product.is_active ? 'Visible' : 'Hidden'}
                                    </span>
                                </div>
                                <div className="p-4 flex flex-col gap-2 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">{product.name}</p>
                                    {product.description && <p className="text-xs text-gray-400 line-clamp-2">{product.description}</p>}
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-bold text-blue-600">₦{Number(product.selling_price).toLocaleString()}</p>
                                        {margin !== null && <span className="text-xs text-green-600 font-medium">+₦{margin.toLocaleString()} profit</span>}
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${isOut ? 'bg-red-100 text-red-600' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {isOut ? 'Out of stock' : isLow ? `${product.stock_quantity} left — low` : `${product.stock_quantity} in stock`}
                                    </span>
                                    <div className="flex gap-2 pt-1 mt-auto">
                                        <button onClick={() => { setEditingProduct(product); setShowModal(true) }}
                                            className="flex-1 text-xs border border-gray-200 text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition">
                                            ✏️ Edit
                                        </button>
                                        <button onClick={() => toggleVisibility(product)} disabled={cantActivate}
                                            title={cantActivate ? `Hide another product first or upgrade to activate more` : ''}
                                            className={`flex-1 text-xs border px-2 py-1.5 rounded-lg transition ${cantActivate ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                                            {product.is_active ? '🙈 Hide' : '👁 Show'}
                                        </button>
                                        <button onClick={() => deleteProduct(product.id)} disabled={deletingId === product.id}
                                            className="text-xs border border-red-100 text-red-400 px-2 py-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                                            {deletingId === product.id ? '...' : '🗑'}
                                        </button>
                                    </div>
                                    {cantActivate && (
                                        <p className="text-xs text-amber-600 text-center">
                                            Hide an active product first or <a href="/settings/billing" className="underline">upgrade →</a>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {showModal && (
                <ProductModal
                    product={editingProduct}
                    businessId={profile.business_id}
                    branchId={profile.branch_id}
                    onClose={() => { setShowModal(false); setEditingProduct(null) }}
                    onSaved={() => { setShowModal(false); setEditingProduct(null); fetchProducts() }}
                />
            )}
        </PageWrapper>
    )
}