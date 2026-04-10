// src/pages/WaitingList.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function WaitingList() {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        business_type: 'online_vendor'
    })
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const businessTypes = [
        { value: 'online_vendor', label: 'Online Vendor (WhatsApp/Instagram/Website)' },
        { value: 'retail', label: 'Physical Store (Shop/Restaurant/Pharmacy)' },
        { value: 'both', label: 'Both' },
    ]

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (!formData.full_name.trim()) {
            setError('Please enter your full name')
            setLoading(false)
            return
        }
        if (!formData.email.trim() || !formData.email.includes('@')) {
            setError('Please enter a valid email address')
            setLoading(false)
            return
        }

        try {
            const { error: insertError } = await supabase
                .from('waiting_list')
                .insert({
                    full_name: formData.full_name.trim(),
                    email: formData.email.trim().toLowerCase(),
                    phone: formData.phone.trim() || null,
                    business_type: formData.business_type,
                })

            if (insertError) {
                if (insertError.code === '23505') {
                    setError('This email is already on the waiting list!')
                } else {
                    throw insertError
                }
            } else {
                setSuccess(true)
            }
        } catch (err) {
            setError('Something went wrong. Please try again.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">You're on the list!</h2>
                    <p className="text-gray-600 mb-4">
                        Thanks {formData.full_name}! We'll notify you as soon as Vortex launches.
                    </p>
                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-blue-800">
                            🚀 You're now in line for early access.
                        </p>
                    </div>
                    <button
                        onClick={() => window.open('https://vortex.ng', '_blank')}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Learn more about Vortex →
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Hero Section */}
            <div className="max-w-4xl mx-auto px-4 py-16 md:py-24">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
                        <img
                            src="/logo.png"
                            alt="Vortex Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                        Vortex
                    </h1>
                    <p className="text-xl text-gray-600">Your business, organized.</p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="grid md:grid-cols-2">
                        {/* Left - Info */}
                        <div className="p-8 md:p-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                            <div className="mb-6">
                                <div className="text-4xl mb-3">🚀</div>
                                <h2 className="text-2xl font-bold mb-2">
                                    Business management made simple
                                </h2>
                                <p className="text-blue-100">
                                    Join the waitlist to get early access to Vortex — the all-in-one platform for Nigerian businesses.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">📦</span>
                                    <div>
                                        <h3 className="font-semibold">For Online Vendors</h3>
                                        <p className="text-sm text-blue-100">Manage orders, products, payments, and deliveries from WhatsApp, Instagram, and more.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">🏪</span>
                                    <div>
                                        <h3 className="font-semibold">For Physical Stores</h3>
                                        <p className="text-sm text-blue-100">Track sales, inventory, expenses, and staff across multiple branches.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">💰</span>
                                    <div>
                                        <h3 className="font-semibold">Know Your Real Profit</h3>
                                        <p className="text-sm text-blue-100">See exactly what you're earning, not just what customers paid.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">📥</span>
                                    <div>
                                        <h3 className="font-semibold">Import Your Data</h3>
                                        <p className="text-sm text-blue-100">Bring your existing customers, products, and orders from Excel or CSV.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="mt-8 pt-6 border-t border-blue-500">
                                <div className="flex justify-around text-center">
                                    <div>
                                        <div className="text-2xl font-bold">2</div>
                                        <div className="text-xs text-blue-100">Business Modes</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">✓</div>
                                        <div className="text-xs text-blue-100">Profit Tracking</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">📊</div>
                                        <div className="text-xs text-blue-100">Real Reports</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right - Form */}
                        <div className="p-8 md:p-10">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Get early access
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Be the first to know when Vortex launches. No spam, just updates.
                            </p>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        placeholder="John Doe"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="john@example.com"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number <span className="text-gray-400 text-xs">(optional)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="08012345678"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        I run a... <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="business_type"
                                        value={formData.business_type}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {businessTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Joining...
                                        </span>
                                    ) : (
                                        'Join the Waitlist →'
                                    )}
                                </button>
                            </form>

                            <p className="text-xs text-gray-400 text-center mt-4">
                                We'll notify you when Vortex launches. Your information is safe with us.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-gray-500 text-sm">
                    <p>© 2026 Vortex. All rights reserved.</p>
                </div>
            </div>
        </div>
    )
}