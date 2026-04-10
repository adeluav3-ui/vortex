import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export default function BranchManager() {
    const { profile, planLimit } = useAuth()
    const [branches, setBranches] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingBranch, setEditingBranch] = useState(null)
    const [form, setForm] = useState({ name: '', address: '' })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => { fetchBranches() }, [])

    async function fetchBranches() {
        setLoading(true)
        const { data } = await supabase
            .from('branches')
            .select('*')
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: true })
        setBranches(data ?? [])
        setLoading(false)
    }

    function openAdd() {
        setEditingBranch(null)
        setForm({ name: '', address: '' })
        setError('')
        setShowModal(true)
    }

    function openEdit(branch) {
        setEditingBranch(branch)
        setForm({ name: branch.name, address: branch.address ?? '' })
        setError('')
        setShowModal(true)
    }

    async function handleSave() {
        setError('')
        if (!form.name.trim()) return setError('Branch name is required')
        setSaving(true)

        try {
            if (editingBranch) {
                const { error } = await supabase
                    .from('branches')
                    .update({ name: form.name.trim(), address: form.address.trim() || null })
                    .eq('id', editingBranch.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('branches')
                    .insert({
                        business_id: profile.business_id,
                        name: form.name.trim(),
                        address: form.address.trim() || null,
                        is_main: false,
                    })
                if (error) throw error
            }
            setShowModal(false)
            fetchBranches()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    async function deleteBranch(branch) {
        if (branch.is_main) return
        if (!confirm(`Delete "${branch.name}"? Staff and stock assigned to this branch will be unlinked.`)) return
        await supabase.from('branches').delete().eq('id', branch.id)
        fetchBranches()
    }

    const limit = planLimit('branches')
    const atLimit = limit !== Infinity && branches.length >= limit

    if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading branches...</div>

    return (
        <div className="max-w-xl">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Branches</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {limit === Infinity ? 'Unlimited branches' : `${branches.length} of ${limit} branches used`}
                        </p>
                    </div>
                    <button
                        onClick={openAdd}
                        disabled={atLimit}
                        title={atLimit ? `Upgrade your plan to add more branches` : ''}
                        className={`px-3 py-2 text-sm rounded-lg transition ${atLimit
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {atLimit ? 'Limit reached' : '+ Add Branch'}
                    </button>
                </div>

                <div className="space-y-3">
                    {branches.map(branch => (
                        <div key={branch.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900">{branch.name}</p>
                                    {branch.is_main && (
                                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">Main</span>
                                    )}
                                </div>
                                {branch.address && <p className="text-xs text-gray-400 mt-0.5">{branch.address}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openEdit(branch)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Edit
                                </button>
                                {!branch.is_main && (
                                    <button
                                        onClick={() => deleteBranch(branch)}
                                        className="text-xs text-red-400 hover:underline"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {editingBranch ? 'Edit Branch' : 'Add Branch'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                        </div>

                        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Ikeja Branch"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address (optional)</label>
                                <textarea
                                    value={form.address}
                                    onChange={e => setForm({ ...form, address: e.target.value })}
                                    rows={2}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="12 Allen Avenue, Ikeja, Lagos"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : editingBranch ? 'Save Changes' : 'Add Branch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}