import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export default function ProductList({ refresh, onEdit }) {
    const { profile } = useAuth()
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [categories, setCategories] = useState([])

    useEffect(() => {
        fetchProducts()
        fetchCategories()
    }, [refresh])

    async function fetchProducts() {
        setLoading(true)
        const { data } = await supabase
            .from('products')
            .select(`
        *,
        categories(name),
        product_variants(
          id, name, sku, selling_price, buying_price,
          stock_levels(quantity, low_stock_threshold, branch_id)
        )
      `)
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: false })
        setProducts(data ?? [])
        setLoading(false)
    }

    async function fetchCategories() {
        const { data } = await supabase
            .from('categories')
            .select('*')
            .eq('business_id', profile.business_id)
        setCategories(data ?? [])
    }

    async function toggleActive(product) {
        await supabase
            .from('products')
            .update({ is_active: !product.is_active })
            .eq('id', product.id)
        fetchProducts()
    }

    async function deleteProduct(id) {
        if (!confirm('Delete this product? This cannot be undone.')) return
        await supabase.from('products').delete().eq('id', id)
        fetchProducts()
    }

    function getTotalStock(variants) {
        return variants?.reduce((sum, v) =>
            sum + (v.stock_levels?.reduce((s, sl) => s + Number(sl.quantity), 0) ?? 0), 0) ?? 0
    }

    function isLowStock(variants) {
        return variants?.some(v =>
            v.stock_levels?.some(sl => Number(sl.quantity) <= Number(sl.low_stock_threshold))
        )
    }

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
        const matchCategory = categoryFilter ? p.category_id === categoryFilter : true
        return matchSearch && matchCategory
    })

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading products...</div>

    return (
        <div>
            {/* Filters */}
            <div className="flex gap-3 mb-4">
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search products..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All Categories</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                    <p className="text-4xl mb-3">📦</p>
                    <p className="text-gray-500 text-sm">No products yet. Add your first product.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Variants</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(product => {
                                    const totalStock = getTotalStock(product.product_variants)
                                    const lowStock = isLowStock(product.product_variants)
                                    const minPrice = Math.min(...(product.product_variants?.map(v => v.selling_price) ?? [0]))
                                    const maxPrice = Math.max(...(product.product_variants?.map(v => v.selling_price) ?? [0]))

                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt={product.name} className="w-8 h-8 rounded-lg object-cover" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">📦</div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-gray-900">{product.name}</p>
                                                        <p className="text-xs text-gray-400">{product.unit}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">{product.categories?.name ?? '—'}</td>
                                            <td className="px-4 py-3 text-gray-500">{product.product_variants?.length ?? 0}</td>
                                            <td className="px-4 py-3">
                                                <span className={`font-medium ${lowStock ? 'text-red-500' : 'text-gray-900'}`}>
                                                    {totalStock}
                                                    {lowStock && <span className="ml-1 text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">Low</span>}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">
                                                {minPrice === maxPrice
                                                    ? `₦${minPrice.toLocaleString()}`
                                                    : `₦${minPrice.toLocaleString()} – ₦${maxPrice.toLocaleString()}`}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => toggleActive(product)}
                                                    className={`text-xs px-2 py-1 rounded-full font-medium ${product.is_active
                                                            ? 'bg-green-50 text-green-600'
                                                            : 'bg-gray-100 text-gray-400'
                                                        }`}
                                                >
                                                    {product.is_active ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => onEdit(product)}
                                                        className="text-xs text-blue-600 hover:underline"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteProduct(product.id)}
                                                        className="text-xs text-red-500 hover:underline"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}