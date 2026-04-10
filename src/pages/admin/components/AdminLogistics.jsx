// src/pages/admin/components/AdminLogistics.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const NIGERIAN_STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa',
    'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger',
    'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
    'FCT Abuja'
]

const SERVICE_TYPES = [
    { value: 'local', label: '🇳🇬 Local (Nigeria only)' },
    { value: 'international', label: '🌍 International' },
    { value: 'both', label: '🌍🇳🇬 Both' }
]

export default function AdminLogistics() {
    const [partners, setPartners] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingPartner, setEditingPartner] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        coverage: '',
        states_covered: [],
        pricing_note: '',
        delivery_time_range: '',
        phone_number: '',
        whatsapp_number: '',
        website_url: '',
        logo_url: '',
        service_type: 'local',
        is_active: true
    })

    useEffect(() => {
        fetchPartners()
    }, [])

    async function fetchPartners() {
        setLoading(true)
        const { data } = await supabase
            .from('logistics_partners')
            .select('*')
            .order('name')
        setPartners(data ?? [])
        setLoading(false)
    }

    function openForm(partner = null) {
        if (partner) {
            setEditingPartner(partner)
            setFormData({
                name: partner.name,
                coverage: partner.coverage || '',
                states_covered: partner.states_covered || [],
                pricing_note: partner.pricing_note || '',
                delivery_time_range: partner.delivery_time_range || '',
                phone_number: partner.phone_number || '',
                whatsapp_number: partner.whatsapp_number || '',
                website_url: partner.website_url || '',
                logo_url: partner.logo_url || '',
                service_type: partner.service_type || 'local',
                is_active: partner.is_active
            })
        } else {
            setEditingPartner(null)
            setFormData({
                name: '',
                coverage: '',
                states_covered: [],
                pricing_note: '',
                delivery_time_range: '',
                phone_number: '',
                whatsapp_number: '',
                website_url: '',
                logo_url: '',
                service_type: 'local',
                is_active: true
            })
        }
        setShowForm(true)
    }

    // In AdminLogistics.jsx - fix the savePartner function

    async function savePartner() {
        if (!formData.name.trim()) {
            alert('Partner name is required')
            return
        }

        // Check for duplicate name before inserting
        if (!editingPartner) {
            const { data: existing } = await supabase
                .from('logistics_partners')
                .select('id')
                .eq('name', formData.name.trim())
                .maybeSingle()

            if (existing) {
                alert('A partner with this name already exists!')
                return
            }
        }

        if (editingPartner) {
            const { error } = await supabase
                .from('logistics_partners')
                .update({
                    name: formData.name,
                    coverage: formData.coverage,
                    states_covered: formData.states_covered,
                    pricing_note: formData.pricing_note,
                    delivery_time_range: formData.delivery_time_range,
                    phone_number: formData.phone_number,
                    whatsapp_number: formData.whatsapp_number,
                    website_url: formData.website_url,
                    logo_url: formData.logo_url,
                    service_type: formData.service_type,
                    is_active: formData.is_active
                })
                .eq('id', editingPartner.id)

            if (error) {
                alert('Error updating: ' + error.message)
                return
            }
        } else {
            const { error } = await supabase
                .from('logistics_partners')
                .insert({
                    id: crypto.randomUUID(),
                    name: formData.name,
                    coverage: formData.coverage,
                    states_covered: formData.states_covered,
                    pricing_note: formData.pricing_note,
                    delivery_time_range: formData.delivery_time_range,
                    phone_number: formData.phone_number,
                    whatsapp_number: formData.whatsapp_number,
                    website_url: formData.website_url,
                    logo_url: formData.logo_url,
                    service_type: formData.service_type,
                    is_active: formData.is_active
                })

            if (error) {
                alert('Error creating: ' + error.message)
                return
            }
        }

        setShowForm(false)
        fetchPartners()
    }

    async function toggleActive(partner) {
        await supabase
            .from('logistics_partners')
            .update({ is_active: !partner.is_active })
            .eq('id', partner.id)
        fetchPartners()
    }

    async function deletePartner(partner) {
        if (confirm(`Delete "${partner.name}"? This cannot be undone.`)) {
            await supabase
                .from('logistics_partners')
                .delete()
                .eq('id', partner.id)
            fetchPartners()
        }
    }

    function toggleState(state) {
        setFormData(prev => ({
            ...prev,
            states_covered: prev.states_covered.includes(state)
                ? prev.states_covered.filter(s => s !== state)
                : [...prev.states_covered, state]
        }))
    }

    const SERVICE_TYPE_COLORS = {
        local: 'bg-green-900 text-green-300',
        international: 'bg-blue-900 text-blue-300',
        both: 'bg-purple-900 text-purple-300'
    }

    if (loading) return <div className="text-sm text-gray-500 py-8 text-center">Loading logistics partners...</div>

    return (
        <div>
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Logistics Partners ({partners.length})</h2>
                <button
                    onClick={() => openForm()}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                >
                    + Add Partner
                </button>
            </div>

            {/* Partners Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Partner</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Service Type</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Coverage</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {partners.map(partner => (
                                <tr key={partner.id} className="hover:bg-gray-800 transition">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {partner.logo_url ? (
                                                <img src={partner.logo_url} alt={partner.name} className="w-8 h-8 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center text-blue-400 text-sm font-bold">
                                                    {partner.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-white">{partner.name}</p>
                                                {partner.delivery_time_range && (
                                                    <p className="text-xs text-gray-500">{partner.delivery_time_range}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${SERVICE_TYPE_COLORS[partner.service_type]}`}>
                                            {partner.service_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-xs text-gray-400 max-w-xs truncate">
                                            {partner.states_covered && partner.states_covered.length > 0
                                                ? `${partner.states_covered.length} states covered`
                                                : partner.coverage || '—'}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-1">
                                            {partner.phone_number && (
                                                <p className="text-xs text-gray-400">📞 {partner.phone_number}</p>
                                            )}
                                            {partner.whatsapp_number && (
                                                <p className="text-xs text-gray-400">💬 {partner.whatsapp_number}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${partner.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                                            {partner.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openForm(partner)}
                                                className="text-xs text-blue-400 hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => toggleActive(partner)}
                                                className="text-xs text-yellow-400 hover:underline"
                                            >
                                                {partner.is_active ? 'Disable' : 'Enable'}
                                            </button>
                                            <button
                                                onClick={() => deletePartner(partner)}
                                                className="text-xs text-red-400 hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setShowForm(false)} />
                    <div className="relative bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl p-6 z-10 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-white">
                                {editingPartner ? 'Edit Partner' : 'Add Logistics Partner'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>

                        <div className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Partner Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., GIG Logistics"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Service Type</label>
                                    <select
                                        value={formData.service_type}
                                        onChange={e => setFormData({ ...formData, service_type: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {SERVICE_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Coverage */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Coverage Description</label>
                                <input
                                    type="text"
                                    value={formData.coverage}
                                    onChange={e => setFormData({ ...formData, coverage: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Nationwide delivery, Major cities only"
                                />
                            </div>

                            {/* States Covered (for local services) */}
                            {(formData.service_type === 'local' || formData.service_type === 'both') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">States Covered</label>
                                    <div className="bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto">
                                        <div className="grid grid-cols-3 gap-2">
                                            {NIGERIAN_STATES.map(state => (
                                                <label key={state} className="flex items-center gap-2 text-sm text-gray-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.states_covered.includes(state)}
                                                        onChange={() => toggleState(state)}
                                                        className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                                                    />
                                                    {state}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Selected: {formData.states_covered.length} states
                                    </p>
                                </div>
                            )}

                            {/* Delivery & Pricing */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Delivery Time Range</label>
                                    <input
                                        type="text"
                                        value={formData.delivery_time_range}
                                        onChange={e => setFormData({ ...formData, delivery_time_range: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., 1-3 business days"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Pricing Note</label>
                                    <input
                                        type="text"
                                        value={formData.pricing_note}
                                        onChange={e => setFormData({ ...formData, pricing_note: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., ₦2,500 - ₦15,000"
                                    />
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={formData.phone_number}
                                        onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="08012345678"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp Number</label>
                                    <input
                                        type="text"
                                        value={formData.whatsapp_number}
                                        onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="08012345678"
                                    />
                                </div>
                            </div>

                            {/* Website & Logo */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Website URL</label>
                                    <input
                                        type="url"
                                        value={formData.website_url}
                                        onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Logo URL</label>
                                    <input
                                        type="url"
                                        value={formData.logo_url}
                                        onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            {/* Active Status */}
                            <div className="flex items-center justify-between pt-2">
                                <label className="text-sm font-medium text-gray-300">Active</label>
                                <button
                                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${formData.is_active ? 'bg-green-600' : 'bg-gray-700'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowForm(false)}
                                className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={savePartner}
                                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition"
                            >
                                {editingPartner ? 'Save Changes' : 'Add Partner'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}