import { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import ProductList from './components/ProductList'
import ProductModal from './components/ProductModal'
import CategoryModal from './components/CategoryModal'
import StockTransfer from './components/StockTransfer'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function Inventory() {
    const { profile, planLimit, planCan } = useAuth()
    const [productCount, setProductCount] = useState(0)
    const [showProductModal, setShowProductModal] = useState(false)
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [showTransfer, setShowTransfer] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [refresh, setRefresh] = useState(0)
    const [error, setError] = useState('')

    function handleProductSaved() {
        setShowProductModal(false)
        setEditingProduct(null)
        setRefresh(r => r + 1)
    }

    function handleEdit(product) {
        setEditingProduct(product)
        setShowProductModal(true)
    }

    useEffect(() => { fetchProductCount() }, [])

    async function fetchProductCount() {
        const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', profile?.business_id)
            .eq('is_active', true)
        setProductCount(count ?? 0)
    }

    const limit = planLimit('products')
    const atLimit = productCount >= limit

    return (
        <PageWrapper title="Inventory">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Products</h2>
                    <p className="text-sm text-gray-500">Manage your products, variants and stock</p>
                </div>
                <div className="flex gap-2">
                    {planCan('stockTransfers') && (
                        <button
                            onClick={() => setShowTransfer(true)}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                        >
                            🔄 Transfer Stock
                        </button>
                    )}
                    <button
                        onClick={() => setShowCategoryModal(true)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    >
                        Categories
                    </button>
                    <button
                        onClick={() => {
                            if (atLimit) return
                            setEditingProduct(null)
                            setShowProductModal(true)
                        }}
                        disabled={atLimit}
                        title={atLimit ? `You've reached the ${limit} product limit for your plan` : ''}
                        className={`px-3 py-2 text-sm rounded-lg transition ${atLimit
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {atLimit ? `Limit reached (${limit})` : '+ Add Product'}
                    </button>
                </div>
            </div>

            {limit !== Infinity && (
                <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between ${atLimit
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : productCount >= limit * 0.8
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                            : 'hidden'
                    }`}>
                    <span>
                        {atLimit
                            ? `You've reached your ${limit} product limit. Upgrade to add more.`
                            : `You're using ${productCount} of ${limit} products on your plan.`}
                    </span>
                    <a href="/settings/billing" className="font-semibold underline ml-4">Upgrade</a>
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            <ProductList refresh={refresh} onEdit={handleEdit} />

            {showProductModal && (
                <ProductModal
                    product={editingProduct}
                    onClose={() => { setShowProductModal(false); setEditingProduct(null) }}
                    onSaved={handleProductSaved}
                />
            )}

            {showCategoryModal && (
                <CategoryModal onClose={() => setShowCategoryModal(false)} />
            )}

            {showTransfer && (
                <StockTransfer onClose={() => setShowTransfer(false)} />
            )}
        </PageWrapper>
    )
}