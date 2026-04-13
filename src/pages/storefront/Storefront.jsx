import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import { getEffectiveTier } from '../../lib/vendorPlanLimits'

const BASE_URL = window.location.origin

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
}

// ── Product Form Modal ────────────────────────────────────────────────────────
function ProductModal({ product, businessId, branchId, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: product?.name ?? '',
        description: product?.description ?? '',
        selling_price: product?.selling_price ?? '',
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
        if (!form.selling_price || isNaN(Number(form.selling_price))) return setError('Enter a valid price')

        setSaving(true)
        setError('')

        try {
            let image_url = form.image_url

            // Upload image if new file selected
            if (imageFile) {
                const ext = imageFile.name.split('.').pop()
                const path = `${businessId}/${Date.now()}.${ext}`
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(path, imageFile, { upsert: true })
                if (uploadError) throw uploadError
                const { data: urlData } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(path)
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
                    await supabase
                        .from('product_variants')
                        .update({ selling_price: Number(form.selling_price) })
                        .eq('id', product._variantId)
                }
                if (product._stockLevelId) {
                    await supabase
                        .from('stock_levels')
                        .update({ quantity: Number(form.stock_quantity) || 0 })
                        .eq('id', product._stockLevelId)
                }
            } else {
                const { data: newProduct, error: productError } = await supabase
                    .from('products')
                    .insert(productPayload)
                    .select()
                    .single()
                if (productError) throw productError

                const { data: variant, error: variantError } = await supabase
                    .from('product_variants')
                    .insert({
                        product_id: newProduct.id,
                        business_id: businessId,
                        name: 'Default',
                        selling_price: Number(form.selling_price),
                        buying_price: 0,
                    })
                    .select()
                    .single()
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
                <h3 className="text-base font-bold text-gray-900">
                    {product ? 'Edit Product' : 'Add Product'}
                </h3>

                {/* Image upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                    <div className="flex items-center gap-4">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-blue-400 transition"
                        >
                            {imagePreview ? (
                                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl">📷</span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-sm text-blue-600 font-medium hover:underline block"
                            >
                                {imagePreview ? 'Change image' : 'Upload image'}
                            </button>
                            {imagePreview && (
                                <button
                                    onClick={() => { setImageFile(null); setImagePreview(null); setForm({ ...form, image_url: '' }) }}
                                    className="text-xs text-red-400 hover:text-red-600"
                                >
                                    Remove
                                </button>
                            )}
                            <p className="text-xs text-gray-400">JPG, PNG — max 2MB</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Ankara Midi Dress"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        rows={2}
                        placeholder="Brief product description shown on your storefront..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                </div>

                {/* Price + Stock */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price (₦) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={form.selling_price}
                            onChange={e => setForm({ ...form, selling_price: e.target.value })}
                            placeholder="0"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                        <input
                            type="number"
                            value={form.stock_quantity}
                            onChange={e => setForm({ ...form, stock_quantity: e.target.value })}
                            placeholder="0"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <div>
                        <p className="text-sm font-medium text-gray-700">Show on storefront</p>
                        <p className="text-xs text-gray-400">Hidden products won't appear to customers</p>
                    </div>
                    <button
                        onClick={() => setForm({ ...form, is_active: !form.is_active })}
                        className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Storefront() {
    const { profile, fetchProfile, user } = useAuth()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState('settings')
    const [business, setBusiness] = useState(null)
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')
    const [copied, setCopied] = useState(false)
    const [showProductModal, setShowProductModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [deletingId, setDeletingId] = useState(null)

    const [settings, setSettings] = useState({
        store_slug: '',
        store_enabled: false,
        store_description: '',
        store_whatsapp: '',
    })

    const tier = profile?.businesses?.subscription_tier ?? 'solo'
    const subStatus = profile?.subscription?.status ?? 'inactive'
    const effectiveTier = getEffectiveTier(tier, subStatus)
    const isScale = effectiveTier === 'scale'

    useEffect(() => {
        if (!profile?.business_id) return
        fetchBusiness()
        fetchProducts()
    }, [profile?.business_id])

    async function fetchBusiness() {
        const { data } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', profile.business_id)
            .single()
        setBusiness(data)
        setSettings({
            store_slug: data?.store_slug ?? slugify(data?.name ?? ''),
            store_enabled: data?.store_enabled ?? false,
            store_description: data?.store_description ?? '',
            store_whatsapp: data?.store_whatsapp ?? '',
        })
        setLoading(false)
    }

    async function fetchProducts() {
        const { data } = await supabase
            .from('products')
            .select(`
                id, name, description, is_active, image_url, created_at,
                product_variants (
                    id, selling_price,
                    stock_levels ( id, quantity )
                )
            `)
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: false })

        const enriched = (data ?? []).map(p => {
            const variant = p.product_variants?.[0]
            const stockLevel = variant?.stock_levels?.[0]
            return {
                ...p,
                selling_price: variant?.selling_price ?? 0,
                stock_quantity: stockLevel?.quantity ?? 0,
                _variantId: variant?.id ?? null,
                _stockLevelId: stockLevel?.id ?? null,
            }
        })
        setProducts(enriched)
    }

    async function saveSettings() {
        setSaving(true)
        setError('')
        setSuccessMsg('')

        const slug = slugify(settings.store_slug)
        if (!slug) return setError('Store URL handle cannot be empty')

        // Check slug uniqueness (exclude current business)
        const { data: existing } = await supabase
            .from('businesses')
            .select('id')
            .eq('store_slug', slug)
            .neq('id', profile.business_id)
            .maybeSingle()

        if (existing) {
            setSaving(false)
            return setError('That store URL is already taken. Please choose a different one.')
        }

        const { error: updateError } = await supabase
            .from('businesses')
            .update({
                store_slug: slug,
                store_enabled: settings.store_enabled,
                store_description: settings.store_description,
                store_whatsapp: settings.store_whatsapp,
            })
            .eq('id', profile.business_id)

        if (updateError) {
            setError(updateError.message)
        } else {
            setSettings({ ...settings, store_slug: slug })
            setSuccessMsg('Storefront settings saved.')
            await fetchProfile(user.id)
        }
        setSaving(false)
    }

    function copyLink() {
        const link = `${BASE_URL}/store/${settings.store_slug}`
        navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    async function toggleProductVisibility(product) {
        await supabase
            .from('products')
            .update({ is_active: !product.is_active })
            .eq('id', product.id)
        fetchProducts()
    }

    async function deleteProduct(id) {
        setDeletingId(id)
        await supabase.from('products').delete().eq('id', id)
        await fetchProducts()
        setDeletingId(null)
    }

    if (!isScale) {
        return (
            <PageWrapper title="Storefront">
                <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                    <span className="text-5xl">🔒</span>
                    <h2 className="text-lg font-bold text-gray-900">Storefront is a Scale feature</h2>
                    <p className="text-sm text-gray-500 max-w-sm">
                        Upgrade to the Scale plan to get your own shareable product page, manage your catalog with photos, and let customers browse and order directly.
                    </p>
                    <button
                        onClick={() => navigate('/settings/billing')}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                    >
                        Upgrade to Scale →
                    </button>
                </div>
            </PageWrapper>
        )
    }

    return (
        <PageWrapper title="Storefront">

            {/* ── Tabs ── */}
            <div className="flex gap-2 mb-6">
                {[
                    { value: 'settings', label: '⚙️ Settings' },
                    { value: 'products', label: `📦 Products (${products.length})` },
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ══════════════════════
                SETTINGS TAB
            ══════════════════════ */}
            {activeTab === 'settings' && (
                <div className="max-w-xl space-y-5">

                    {/* Live link card */}
                    {settings.store_slug && (
                        <div className={`rounded-xl p-4 border ${settings.store_enabled
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Your Storefront Link
                                </p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${settings.store_enabled
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    {settings.store_enabled ? '● Live' : '● Offline'}
                                </span>
                            </div>
                            <p className="text-sm font-mono text-gray-800 break-all mb-3">
                                {BASE_URL}/store/{settings.store_slug}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={copyLink}
                                    className="flex-1 text-xs bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
                                >
                                    {copied ? '✓ Copied!' : '📋 Copy Link'}
                                </button>
                                <a
                                    href={`/store/${settings.store_slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-center"
                                >
                                    👁 Preview
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Enable toggle */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Enable Storefront</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    When off, your store link will show a "coming soon" page
                                </p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, store_enabled: !settings.store_enabled })}
                                className={`relative w-11 h-6 rounded-full transition-colors ${settings.store_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.store_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Settings form */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Store URL Handle
                            </label>
                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                <span className="px-3 py-2 bg-gray-50 text-xs text-gray-400 border-r border-gray-300 shrink-0">
                                    {BASE_URL}/store/
                                </span>
                                <input
                                    value={settings.store_slug}
                                    onChange={e => setSettings({ ...settings, store_slug: slugify(e.target.value) })}
                                    placeholder="your-store-name"
                                    className="flex-1 px-3 py-2 text-sm focus:outline-none"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                Only lowercase letters, numbers, and hyphens
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                WhatsApp Number
                            </label>
                            <input
                                value={settings.store_whatsapp}
                                onChange={e => setSettings({ ...settings, store_whatsapp: e.target.value })}
                                placeholder="e.g. 2348012345678 (international format, no +)"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Customers will message this number when ordering
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Store Description
                            </label>
                            <textarea
                                value={settings.store_description}
                                onChange={e => setSettings({ ...settings, store_description: e.target.value })}
                                rows={3}
                                placeholder="Tell customers what you sell and what makes your store special..."
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}
                    {successMsg && (
                        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                            <p className="text-sm text-green-700">{successMsg}</p>
                        </div>
                    )}

                    <button
                        onClick={saveSettings}
                        disabled={saving}
                        className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            )}

            {/* ══════════════════════
                PRODUCTS TAB
            ══════════════════════ */}
            {activeTab === 'products' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            {products.filter(p => p.is_active).length} of {products.length} products visible on storefront
                        </p>
                        <button
                            onClick={() => { setEditingProduct(null); setShowProductModal(true) }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            ➕ Add Product
                        </button>
                    </div>

                    {products.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center space-y-3">
                            <p className="text-3xl">📦</p>
                            <p className="text-sm text-gray-500">No products yet</p>
                            <button
                                onClick={() => { setEditingProduct(null); setShowProductModal(true) }}
                                className="text-sm text-blue-600 font-medium hover:underline"
                            >
                                Add your first product →
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.map(product => (
                                <div
                                    key={product.id}
                                    className={`bg-white rounded-xl border shadow-sm overflow-hidden ${product.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}
                                >
                                    {/* Product image */}
                                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-4xl">📷</span>
                                        )}
                                    </div>

                                    {/* Product info */}
                                    <div className="p-4 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-semibold text-gray-900 leading-tight">{product.name}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${product.is_active
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {product.is_active ? 'Visible' : 'Hidden'}
                                            </span>
                                        </div>
                                        {product.description && (
                                            <p className="text-xs text-gray-400 line-clamp-2">{product.description}</p>
                                        )}
                                        <p className="text-base font-bold text-blue-600">
                                            ₦{Number(product.selling_price).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {product.stock_quantity > 0
                                                ? `${product.stock_quantity} in stock`
                                                : <span className="text-red-400">Out of stock</span>
                                            }
                                        </p>

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={() => { setEditingProduct(product); setShowProductModal(true) }}
                                                className="flex-1 text-xs border border-gray-200 text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition"
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => toggleProductVisibility(product)}
                                                className="flex-1 text-xs border border-gray-200 text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition"
                                            >
                                                {product.is_active ? '🙈 Hide' : '👁 Show'}
                                            </button>
                                            <button
                                                onClick={() => deleteProduct(product.id)}
                                                disabled={deletingId === product.id}
                                                className="text-xs border border-red-100 text-red-400 px-2 py-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                                            >
                                                {deletingId === product.id ? '...' : '🗑'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Product modal */}
            {showProductModal && (
                <ProductModal
                    product={editingProduct}
                    businessId={profile.business_id}
                    branchId={profile.branch_id}
                    onClose={() => { setShowProductModal(false); setEditingProduct(null) }}
                    onSaved={() => {
                        setShowProductModal(false)
                        setEditingProduct(null)
                        fetchProducts()
                    }}
                />
            )}
        </PageWrapper>
    )
}