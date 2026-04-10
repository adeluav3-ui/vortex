import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function PublicStorefront() {
    const { slug } = useParams()

    const [business, setBusiness] = useState(null)
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchStorefront()
    }, [slug])

    async function fetchStorefront() {
        const { data: biz } = await supabase
            .from('businesses')
            .select('id, name, logo_url, store_slug, store_enabled, store_description, store_whatsapp')
            .eq('store_slug', slug)
            .maybeSingle()

        if (!biz) {
            setNotFound(true)
            setLoading(false)
            return
        }

        setBusiness(biz)

        if (biz.store_enabled) {
            const { data: prods } = await supabase
                .from('products')
                .select(`
                    id, name, description, image_url, is_active,
                    product_variants (
                        selling_price,
                        stock_levels ( quantity )
                    )
                `)
                .eq('business_id', biz.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            const enriched = (prods ?? []).map(p => {
                const variant = p.product_variants?.[0]
                const stock = variant?.stock_levels?.[0]
                return {
                    ...p,
                    selling_price: variant?.selling_price ?? 0,
                    stock_quantity: stock?.quantity ?? 0,
                }
            })
            setProducts(enriched)
        }

        setLoading(false)
    }

    function buildWhatsAppMessage(product) {
        const message = `Hi! I'd like to order *${product.name}* (₦${Number(product.selling_price).toLocaleString()}) from your store.`
        return `https://wa.me/${business.store_whatsapp}?text=${encodeURIComponent(message)}`
    }

    const filtered = products.filter(p => {
        if (!search.trim()) return true
        return p.name.toLowerCase().includes(search.toLowerCase())
    })

    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-sm text-gray-400">Loading store...</p>
            </div>
        )
    }

    // ── Not found ──
    if (notFound) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4 space-y-4">
                <p className="text-5xl">🔍</p>
                <h1 className="text-xl font-bold text-gray-900">Store not found</h1>
                <p className="text-sm text-gray-500">
                    The store you're looking for doesn't exist or the link may be incorrect.
                </p>
            </div>
        )
    }

    // ── Store offline ──
    if (!business.store_enabled) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4 space-y-4">
                {business.logo_url ? (
                    <img src={business.logo_url} alt={business.name} className="w-16 h-16 rounded-2xl object-contain border border-gray-200" />
                ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-400">
                        {business.name?.charAt(0)}
                    </div>
                )}
                <h1 className="text-xl font-bold text-gray-900">{business.name}</h1>
                <p className="text-sm text-gray-500">This store is currently offline. Check back soon.</p>
            </div>
        )
    }

    // ── Live store ──
    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Header ── */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
                    {business.logo_url ? (
                        <img
                            src={business.logo_url}
                            alt={business.name}
                            className="w-11 h-11 rounded-xl object-contain border border-gray-100 shrink-0"
                        />
                    ) : (
                        <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                            {business.name?.charAt(0)}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold text-gray-900 truncate">{business.name}</h1>
                        {business.store_description && (
                            <p className="text-xs text-gray-500 truncate">{business.store_description}</p>
                        )}
                    </div>
                    {business.store_whatsapp && (
                        <a
                            href={`https://wa.me/${business.store_whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-1.5 bg-green-500 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-green-600 transition"
                        >
                            <span>💬</span>
                            <span className="hidden sm:inline">Contact Us</span>
                        </a>
                    )}
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

                {/* ── Store description (expanded) ── */}
                {business.store_description && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                        <p className="text-sm text-blue-800">{business.store_description}</p>
                    </div>
                )}

                {/* ── Search ── */}
                {products.length > 6 && (
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search products..."
                            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>
                )}

                {/* ── Products ── */}
                {filtered.length === 0 ? (
                    <div className="text-center py-16 space-y-2">
                        <p className="text-3xl">📭</p>
                        <p className="text-sm text-gray-500">
                            {search ? 'No products match your search' : 'No products available right now'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filtered.map(product => (
                            <div
                                key={product.id}
                                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
                            >
                                {/* Image */}
                                <div className="w-full aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-4xl">📦</span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-3 flex flex-col gap-2 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
                                        {product.name}
                                    </p>
                                    {product.description && (
                                        <p className="text-xs text-gray-400 line-clamp-2">{product.description}</p>
                                    )}
                                    <p className="text-base font-bold text-blue-600 mt-auto">
                                        ₦{Number(product.selling_price).toLocaleString()}
                                    </p>

                                    {/* Stock badge */}
                                    {product.stock_quantity === 0 && (
                                        <span className="text-xs text-red-500 font-medium">Out of stock</span>
                                    )}

                                    {/* Order button */}
                                    {business.store_whatsapp && product.stock_quantity !== 0 ? (
                                        <a
                                            href={buildWhatsAppMessage(product)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full mt-1 bg-green-500 text-white text-xs font-semibold py-2 rounded-lg text-center hover:bg-green-600 transition flex items-center justify-center gap-1"
                                        >
                                            <span>💬</span> Order Now
                                        </a>
                                    ) : product.stock_quantity === 0 ? (
                                        <button
                                            disabled
                                            className="w-full mt-1 bg-gray-100 text-gray-400 text-xs font-medium py-2 rounded-lg cursor-not-allowed"
                                        >
                                            Out of Stock
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full mt-1 bg-gray-100 text-gray-400 text-xs font-medium py-2 rounded-lg cursor-not-allowed"
                                        >
                                            Contact to Order
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Footer ── */}
                <div className="text-center pt-6 pb-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                        Powered by{' '}
                        <span className="font-semibold text-gray-500">Vortex</span>
                    </p>
                </div>
            </div>
        </div>
    )
}