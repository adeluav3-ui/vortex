import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'

const DELIVERY_STATUS_COLORS = {
    pending: 'bg-yellow-50 text-yellow-700',
    picked_up: 'bg-blue-50 text-blue-700',
    in_transit: 'bg-purple-50 text-purple-700',
    delivered: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-600',
    returned: 'bg-gray-100 text-gray-600',
}

const DELIVERY_STATUS_LABELS = {
    pending: 'Pending',
    picked_up: 'Picked Up',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    failed: 'Failed',
    returned: 'Returned',
}

// Nigerian States
const NIGERIAN_STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa',
    'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger',
    'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
    'FCT Abuja'
]

// Plan gating
const VENDOR_TRACKER_TIERS = ['hustle', 'scale']

// Helper function to format phone numbers
function formatWhatsAppNumber(number) {
    if (!number) return ''
    let cleaned = number.replace(/\s/g, '').replace(/[^0-9]/g, '')
    if (cleaned.startsWith('0')) {
        cleaned = '234' + cleaned.substring(1)
    }
    if (!cleaned.startsWith('234') && !cleaned.startsWith('+')) {
        cleaned = '234' + cleaned
    }
    return cleaned
}

export default function DeliveryHub() {
    const { profile, user } = useAuth()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState('directory')
    const [serviceTypeTab, setServiceTypeTab] = useState('local')
    const [partners, setPartners] = useState([])
    const [filteredPartners, setFilteredPartners] = useState([])
    const [deliveries, setDeliveries] = useState([])
    const [loadingPartners, setLoadingPartners] = useState(true)
    const [loadingDeliveries, setLoadingDeliveries] = useState(true)
    const [updatingId, setUpdatingId] = useState(null)
    const [selectedState, setSelectedState] = useState('')
    const [savingPreference, setSavingPreference] = useState(false)

    const tier = profile?.businesses?.subscription_tier ?? 'solo'
    const canTrack = VENDOR_TRACKER_TIERS.includes(tier)

    // Load saved state preference from database on mount
    useEffect(() => {
        if (profile?.delivery_state_preference) {
            setSelectedState(profile.delivery_state_preference)
        }
    }, [profile])

    useEffect(() => {
        fetchPartners()
        if (canTrack) fetchDeliveries()
    }, [profile?.business_id])

    useEffect(() => {
        filterPartners()
    }, [partners, serviceTypeTab, selectedState])

    async function fetchPartners() {
        const { data } = await supabase
            .from('logistics_partners')
            .select('*')
            .eq('is_active', true)
            .order('name')
        setPartners(data ?? [])
        setLoadingPartners(false)
    }

    function filterPartners() {
        let filtered = [...partners]

        // Filter by service type
        filtered = filtered.filter(p => {
            if (serviceTypeTab === 'local') {
                return p.service_type === 'local' || p.service_type === 'both' || p.service_type === null
            } else {
                return p.service_type === 'international' || p.service_type === 'both'
            }
        })

        // Filter by state for local deliveries
        if (serviceTypeTab === 'local' && selectedState) {
            filtered = filtered.filter(p => {
                if (p.states_covered && p.states_covered.length > 0) {
                    return p.states_covered.includes(selectedState)
                }
                if (p.coverage) {
                    return p.coverage.toLowerCase().includes('nigeria') ||
                        p.coverage.toLowerCase().includes('national') ||
                        p.coverage.toLowerCase().includes(selectedState.toLowerCase())
                }
                return true
            })
        }

        setFilteredPartners(filtered)
    }

    async function fetchDeliveries() {
        const { data } = await supabase
            .from('deliveries')
            .select(`
                *,
                vendor_orders (
                    order_number,
                    customer_name,
                    customer_phone
                )
            `)
            .eq('business_id', profile.business_id)
            .order('created_at', { ascending: false })
        setDeliveries(data ?? [])
        setLoadingDeliveries(false)
    }

    async function updateDeliveryStatus(deliveryId, newStatus) {
        setUpdatingId(deliveryId)
        await supabase
            .from('deliveries')
            .update({
                status: newStatus,
                ...(newStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
                updated_at: new Date().toISOString(),
            })
            .eq('id', deliveryId)
        await fetchDeliveries()
        setUpdatingId(null)
    }

    function isOverdue(delivery) {
        if (!delivery.estimated_delivery_date) return false
        if (['delivered', 'returned', 'failed'].includes(delivery.status)) return false
        return new Date(delivery.estimated_delivery_date) < new Date()
    }

    // Save state preference to database
    const handleStateChange = async (state) => {
        setSelectedState(state)
        setSavingPreference(true)

        const { error } = await supabase
            .from('profiles')
            .update({ delivery_state_preference: state || null })
            .eq('id', user.id)

        if (error) {
            console.error('Failed to save state preference:', error)
        }

        setSavingPreference(false)
    }

    const activeDeliveries = deliveries.filter(d => !['delivered', 'returned', 'failed'].includes(d.status))
    const overdueDeliveries = deliveries.filter(d => isOverdue(d))
    const deliveredToday = deliveries.filter(d => {
        if (d.status !== 'delivered' || !d.delivered_at) return false
        const today = new Date().toISOString().split('T')[0]
        return d.delivered_at.startsWith(today)
    })

    return (
        <PageWrapper title="Delivery Hub">

            {/* ── Main Tabs ── */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('directory')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'directory'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                >
                    🏢 Logistics Directory
                </button>
                {canTrack && (
                    <button
                        onClick={() => setActiveTab('tracker')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'tracker'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                            }`}
                    >
                        📦 My Deliveries
                    </button>
                )}
            </div>

            {/* ══════════════════════════════════════════
                LOGISTICS DIRECTORY
            ══════════════════════════════════════════ */}
            {activeTab === 'directory' && (
                <div className="space-y-5">

                    {/* Service Type Tabs */}
                    <div className="flex gap-2 border-b border-gray-200">
                        <button
                            onClick={() => setServiceTypeTab('local')}
                            className={`px-4 py-2 text-sm font-medium transition ${serviceTypeTab === 'local'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            🇳🇬 Local Delivery (Within Nigeria)
                        </button>
                        <button
                            onClick={() => setServiceTypeTab('international')}
                            className={`px-4 py-2 text-sm font-medium transition ${serviceTypeTab === 'international'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            🌍 International Delivery
                        </button>
                    </div>

                    {/* State Filter Dropdown - Only for Local Delivery */}
                    {serviceTypeTab === 'local' && (
                        <div className="bg-gray-50 rounded-xl p-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                📍 Select Your State
                            </label>
                            <select
                                value={selectedState}
                                onChange={(e) => handleStateChange(e.target.value)}
                                disabled={savingPreference}
                                className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="">-- Select a State --</option>
                                {NIGERIAN_STATES.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                            {savingPreference && (
                                <p className="text-xs text-gray-400 mt-2">Saving preference...</p>
                            )}
                            {selectedState && !savingPreference && (
                                <p className="text-xs text-green-600 mt-2">
                                    ✅ Showing delivery services available in <span className="font-semibold">{selectedState}</span>
                                </p>
                            )}
                            {!selectedState && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Select a state to see delivery services available in your location
                                </p>
                            )}
                        </div>
                    )}

                    {/* Partner grid */}
                    {loadingPartners ? (
                        <div className="py-16 text-center text-sm text-gray-400">Loading partners...</div>
                    ) : filteredPartners.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
                            <p className="text-3xl mb-3">📭</p>
                            <p className="text-sm text-gray-500">
                                {serviceTypeTab === 'local'
                                    ? selectedState
                                        ? `No delivery services found for ${selectedState} yet. Try another state or check back soon.`
                                        : 'Select a state above to see available delivery services in your area.'
                                    : 'No international delivery services found.'}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">More partners are being added regularly.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPartners.map(partner => (
                                <div
                                    key={partner.id}
                                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
                                >
                                    {/* Partner header */}
                                    <div className="flex items-center gap-3">
                                        {partner.logo_url ? (
                                            <img
                                                src={partner.logo_url}
                                                alt={partner.name}
                                                className="w-12 h-12 rounded-xl object-contain border border-gray-100"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600">
                                                {partner.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{partner.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {serviceTypeTab === 'local' ? 'Local Delivery' : 'International Shipping'}
                                            </p>
                                            {partner.states_covered && partner.states_covered.length > 0 && (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    📍 Covers {partner.states_covered.length} state{partner.states_covered.length !== 1 ? 's' : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Coverage */}
                                    {partner.coverage && (
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs text-gray-400 shrink-0">📍</span>
                                            <p className="text-xs text-gray-600">{partner.coverage}</p>
                                        </div>
                                    )}

                                    {/* Delivery Time */}
                                    {partner.delivery_time_range && (
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs text-gray-400 shrink-0">⏱️</span>
                                            <p className="text-xs text-gray-600">{partner.delivery_time_range}</p>
                                        </div>
                                    )}

                                    {/* Pricing */}
                                    {(partner.pricing_note || partner.price_range) && (
                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                            <p className="text-xs text-gray-600">
                                                <span className="font-medium">💰 Pricing: </span>
                                                {partner.price_range || partner.pricing_note}
                                            </p>
                                        </div>
                                    )}

                                    {/* Contact numbers */}
                                    {(partner.phone_number || partner.whatsapp_number) && (
                                        <div className="space-y-1.5">
                                            {partner.phone_number && (
                                                <a
                                                    href={`tel:${partner.phone_number.replace(/\s/g, '')}`}
                                                    className="flex items-center gap-2 text-xs text-gray-700 hover:text-blue-600 transition"
                                                >
                                                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">📞</span>
                                                    <span className="font-medium">{partner.phone_number}</span>
                                                    <span className="text-gray-400">(Call)</span>
                                                </a>
                                            )}
                                            {partner.whatsapp_number && (
                                                <a
                                                    href={`https://wa.me/${formatWhatsAppNumber(partner.whatsapp_number)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-xs text-gray-700 hover:text-green-600 transition"
                                                >
                                                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">💬</span>
                                                    <span className="font-medium">{partner.whatsapp_number}</span>
                                                    <span className="text-gray-400">(WhatsApp)</span>
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="mt-auto">
                                        {partner.website_url ? (
                                            <a
                                                href={partner.website_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full block text-center text-xs bg-blue-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                                            >
                                                Visit Website →
                                            </a>
                                        ) : (
                                            <div className="flex gap-2">
                                                {partner.phone_number && (
                                                    <a
                                                        href={`tel:${partner.phone_number.replace(/\s/g, '')}`}
                                                        className="flex-1 text-center text-xs bg-green-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                                                    >
                                                        📞 Call
                                                    </a>
                                                )}
                                                {partner.whatsapp_number && (
                                                    <a
                                                        href={`https://wa.me/${formatWhatsAppNumber(partner.whatsapp_number)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 text-center text-xs bg-green-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                                                    >
                                                        💬 WhatsApp
                                                    </a>
                                                )}
                                                {!partner.phone_number && !partner.whatsapp_number && (
                                                    <button
                                                        disabled
                                                        className="w-full text-xs bg-gray-100 text-gray-400 px-3 py-2 rounded-lg font-medium cursor-not-allowed"
                                                    >
                                                        No contact info
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Suggest a partner */}
                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-5 text-center space-y-1">
                        <p className="text-sm font-medium text-gray-700">Know a logistics company we should add?</p>
                        <p className="text-xs text-gray-400">Email us at partners@vortex.ng to suggest a delivery partner.</p>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                MY DELIVERIES TRACKER
            ══════════════════════════════════════════ */}
            {activeTab === 'tracker' && canTrack && (
                <div className="space-y-5">

                    {/* Stats summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: 'Active Deliveries', value: activeDeliveries.length, icon: '🚚', color: 'text-blue-600' },
                            { label: 'Overdue', value: overdueDeliveries.length, icon: '⚠️', color: 'text-red-500' },
                            { label: 'Delivered Today', value: deliveredToday.length, icon: '✅', color: 'text-green-600' },
                        ].map(stat => (
                            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-gray-500">{stat.label}</p>
                                    <span className="text-xl">{stat.icon}</span>
                                </div>
                                <p className={`text-2xl font-bold ${loadingDeliveries ? 'text-gray-200' : stat.color}`}>
                                    {loadingDeliveries ? '...' : stat.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Deliveries list */}
                    {loadingDeliveries ? (
                        <div className="py-16 text-center text-sm text-gray-400">Loading deliveries...</div>
                    ) : deliveries.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
                            <p className="text-3xl mb-3">📦</p>
                            <p className="text-sm text-gray-500">No delivery records yet</p>
                            <p className="text-xs text-gray-400 mt-2">When you add delivery info to orders, they'll appear here</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="divide-y divide-gray-50">
                                {deliveries.map(delivery => {
                                    const overdue = isOverdue(delivery)
                                    return (
                                        <div key={delivery.id} className="px-5 py-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {delivery.vendor_orders?.customer_name || 'Unknown'}
                                                        </p>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DELIVERY_STATUS_COLORS[delivery.status]}`}>
                                                            {DELIVERY_STATUS_LABELS[delivery.status]}
                                                        </span>
                                                        {overdue && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                                                                Overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400">
                                                        Order: {delivery.vendor_orders?.order_number}
                                                    </p>
                                                    {delivery.courier_name && (
                                                        <p className="text-xs text-gray-500 mt-1">📦 {delivery.courier_name}</p>
                                                    )}
                                                    {delivery.tracking_number && (
                                                        <p className="text-xs text-gray-400">Tracking: {delivery.tracking_number}</p>
                                                    )}
                                                    {delivery.estimated_delivery_date && !overdue && (
                                                        <p className="text-xs text-gray-400">
                                                            Expected: {new Date(delivery.estimated_delivery_date).toLocaleDateString('en-NG')}
                                                        </p>
                                                    )}
                                                    {overdue && delivery.estimated_delivery_date && (
                                                        <p className="text-xs text-red-500">
                                                            Expected: {new Date(delivery.estimated_delivery_date).toLocaleDateString('en-NG')}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    {delivery.status !== 'delivered' && delivery.status !== 'returned' && (
                                                        <select
                                                            value={delivery.status}
                                                            onChange={e => updateDeliveryStatus(delivery.id, e.target.value)}
                                                            disabled={updatingId === delivery.id}
                                                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="picked_up">Picked Up</option>
                                                            <option value="in_transit">In Transit</option>
                                                            <option value="delivered">Delivered</option>
                                                            <option value="failed">Failed</option>
                                                            <option value="returned">Returned</option>
                                                        </select>
                                                    )}
                                                    {delivery.status === 'delivered' && delivery.delivered_at && (
                                                        <p className="text-xs text-green-600 mt-1">
                                                            Delivered {new Date(delivery.delivered_at).toLocaleDateString('en-NG')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </PageWrapper>
    )
}