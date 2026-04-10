import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import CheckoutModal from './CheckoutModal'
import ReceiptModal from './ReceiptModal'
import BarcodeScanner from './BarcodeScanner'

export default function POS({ onSaleComplete }) {
    const { profile } = useAuth()
    const [products, setProducts] = useState([])
    const [search, setSearch] = useState('')
    const [cart, setCart] = useState([])
    const [showCheckout, setShowCheckout] = useState(false)
    const [completedSale, setCompletedSale] = useState(null)
    const [categoryFilter, setCategoryFilter] = useState('')
    const [categories, setCategories] = useState([])
    const [showScanner, setShowScanner] = useState(false)
    const [scanError, setScanError] = useState('')
    const barcodeBufferRef = useRef('')
    const barcodeTimerRef = useRef(null)

    useEffect(() => {
        fetchProducts()
        fetchCategories()
    }, [])

    async function fetchProducts() {
        const { data } = await supabase
            .from('products')
            .select(`
        id, name, image_url, unit,
        categories(name),
        product_variants(
  id, name, selling_price, buying_price,
  stock_levels(quantity, branch_id)
)
      `)
            .eq('business_id', profile.business_id)
            .eq('is_active', true)
        setProducts(data ?? [])
    }

    async function fetchCategories() {
        const { data } = await supabase
            .from('categories')
            .select('*')
            .eq('business_id', profile.business_id)
        setCategories(data ?? [])
    }

    async function handleBarcodeScan(barcode) {
        setScanError('')

        // Look up by SKU in product_variants
        const { data: variant } = await supabase
            .from('product_variants')
            .select(`
      id, name, selling_price, buying_price, sku,
      products(id, name, image_url, is_active, business_id),
      stock_levels(quantity, branch_id)
    `)
            .eq('sku', barcode)
            .single()

        if (!variant) {
            setScanError(`No product found for barcode: ${barcode}`)
            return
        }

        if (!variant.products?.is_active) {
            setScanError(`Product "${variant.products?.name}" is inactive.`)
            return
        }

        if (variant.products?.business_id !== profile.business_id) {
            setScanError('This product does not belong to your business.')
            return
        }

        // Add to cart
        addToCart(variant.products, variant)
        setShowScanner(false)
    }

    useEffect(() => {
        function handleKeyDown(e) {
            // Ignore if user is typing in an input field
            const tag = document.activeElement.tagName.toLowerCase()
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return

            if (e.key === 'Enter') {
                const barcode = barcodeBufferRef.current.trim()
                if (barcode.length >= 3) {
                    handleBarcodeScan(barcode)
                }
                barcodeBufferRef.current = ''
                clearTimeout(barcodeTimerRef.current)
                return
            }

            // Only accept printable characters
            if (e.key.length === 1) {
                barcodeBufferRef.current += e.key

                // Clear buffer if no new input within 100ms (human typing is slower)
                clearTimeout(barcodeTimerRef.current)
                barcodeTimerRef.current = setTimeout(() => {
                    barcodeBufferRef.current = ''
                }, 100)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            clearTimeout(barcodeTimerRef.current)
        }
    }, [products, cart, profile])

    function getStock(variant) {
        return variant.stock_levels
            ?.filter(sl => sl.branch_id === profile.branch_id)
            ?.reduce((sum, sl) => sum + Number(sl.quantity), 0) ?? 0
    }

    function addToCart(product, variant) {
        const stock = getStock(variant)
        const existing = cart.find(i => i.variant_id === variant.id)
        if (existing) {
            if (existing.quantity >= stock) return
            setCart(cart.map(i =>
                i.variant_id === variant.id
                    ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
                    : i
            ))
        } else {
            if (stock <= 0) return
            setCart([...cart, {
                variant_id: variant.id,
                product_name: product.name,
                variant_name: variant.name,
                unit_price: variant.selling_price,
                buying_price: variant.buying_price ?? 0,
                quantity: 1,
                subtotal: variant.selling_price,
                max_stock: stock,
            }])
        }
    }

    function updateCartQty(variant_id, qty) {
        if (qty <= 0) {
            setCart(cart.filter(i => i.variant_id !== variant_id))
            return
        }
        setCart(cart.map(i =>
            i.variant_id === variant_id
                ? { ...i, quantity: Math.min(qty, i.max_stock), subtotal: Math.min(qty, i.max_stock) * i.unit_price }
                : i
        ))
    }

    function removeFromCart(variant_id) {
        setCart(cart.filter(i => i.variant_id !== variant_id))
    }

    function clearCart() {
        setCart([])
    }

    const subtotal = cart.reduce((sum, i) => sum + i.subtotal, 0)

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
        const matchCategory = categoryFilter ? p.categories?.name === categoryFilter : true
        return matchSearch && matchCategory
    })

    function handleSaleComplete(sale) {
        setCompletedSale(sale)
        setCart([])
        setShowCheckout(false)
        onSaleComplete()
        fetchProducts()
    }

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-full">
            {/* Left — Product Grid */}
            <div className="flex-1">
                {/* Search + filter + scan */}
                <div className="flex gap-2 mb-4">
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search products..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={() => { setShowScanner(true); setScanError('') }}
                        className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition flex items-center gap-1.5"
                        title="Scan barcode"
                    >
                        <span>📷</span>
                        <span className="hidden sm:inline">Scan</span>
                    </button>
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>

                {/* Scan error */}
                {scanError && (
                    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center justify-between">
                        <span>{scanError}</span>
                        <button onClick={() => setScanError('')} className="text-red-400 hover:text-red-600">✕</button>
                    </div>
                )}

                {/* Product cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filtered.map(product =>
                        product.product_variants?.map(variant => {
                            const stock = getStock(variant)
                            const inCart = cart.find(i => i.variant_id === variant.id)
                            return (
                                <button
                                    key={variant.id}
                                    onClick={() => addToCart(product, variant)}
                                    disabled={stock <= 0}
                                    className={`bg-white border rounded-xl p-3 text-left transition relative ${stock <= 0
                                        ? 'opacity-50 cursor-not-allowed border-gray-100'
                                        : inCart
                                            ? 'border-blue-400 ring-2 ring-blue-100'
                                            : 'border-gray-100 hover:border-blue-300 hover:shadow-sm'
                                        }`}
                                >
                                    <div className="w-full aspect-square rounded-lg bg-gray-50 flex items-center justify-center mb-2 overflow-hidden">
                                        {product.image_url
                                            ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                                            : <span className="text-2xl">📦</span>
                                        }
                                    </div>
                                    <p className="text-xs font-semibold text-gray-900 leading-tight truncate">{product.name}</p>
                                    {variant.name !== 'Default' && (
                                        <p className="text-xs text-gray-400 truncate">{variant.name}</p>
                                    )}
                                    <p className="text-sm font-bold text-blue-600 mt-1">₦{Number(variant.selling_price).toLocaleString()}</p>
                                    <p className="text-xs text-gray-400">Stock: {stock}</p>
                                    {inCart && (
                                        <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                            {inCart.quantity}
                                        </span>
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Right — Cart */}
            <div className="w-full lg:w-80 bg-white rounded-xl border border-gray-100 flex flex-col">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Cart</h3>
                    {cart.length > 0 && (
                        <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600">Clear</button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {cart.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-8">Cart is empty</p>
                    )}
                    {cart.map(item => (
                        <div key={item.variant_id} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                                {item.variant_name !== 'Default' && (
                                    <p className="text-xs text-gray-400">{item.variant_name}</p>
                                )}
                                <p className="text-xs text-blue-600">₦{Number(item.unit_price).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => updateCartQty(item.variant_id, item.quantity - 1)}
                                    className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm"
                                >−</button>
                                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                <button
                                    onClick={() => updateCartQty(item.variant_id, item.quantity + 1)}
                                    className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm"
                                >+</button>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">₦{Number(item.subtotal).toLocaleString()}</p>
                                <button onClick={() => removeFromCart(item.variant_id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-4 py-4 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Subtotal</span>
                        <span className="text-sm font-semibold text-gray-900">₦{subtotal.toLocaleString()}</span>
                    </div>
                    <button
                        onClick={() => setShowCheckout(true)}
                        disabled={cart.length === 0}
                        className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        Checkout — ₦{subtotal.toLocaleString()}
                    </button>
                </div>
            </div>

            {showCheckout && (
                <CheckoutModal
                    cart={cart}
                    subtotal={subtotal}
                    onClose={() => setShowCheckout(false)}
                    onSaleComplete={handleSaleComplete}
                />
            )}

            {completedSale && (
                <ReceiptModal
                    sale={completedSale}
                    onClose={() => setCompletedSale(null)}
                />
            )}
            {showScanner && (
                <BarcodeScanner
                    onDetected={handleBarcodeScan}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    )
}