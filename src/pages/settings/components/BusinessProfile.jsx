import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export default function BusinessProfile() {
    const { profile, fetchProfile, user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [logoFile, setLogoFile] = useState(null)
    const [logoPreview, setLogoPreview] = useState(null)

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
    })

    useEffect(() => {
        if (profile?.businesses) {
            setForm({
                name: profile.businesses.name ?? '',
                email: profile.businesses.email ?? '',
                phone: profile.businesses.phone ?? '',
                address: profile.businesses.address ?? '',
            })
            setLogoPreview(profile.businesses.logo_url ?? null)
        }
    }, [profile])

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    function handleLogoChange(e) {
        const file = e.target.files[0]
        if (!file) return
        setLogoFile(file)
        setLogoPreview(URL.createObjectURL(file))
    }

    async function handleSave() {
        setError('')
        setSuccess('')
        if (!form.name.trim()) return setError('Business name is required')
        setLoading(true)

        try {
            let logo_url = profile.businesses.logo_url ?? null

            if (logoFile) {
                const ext = logoFile.name.split('.').pop()
                const path = `${user.id}/logo.${ext}`
                const { error: uploadError } = await supabase.storage
                    .from('business-logos')
                    .upload(path, logoFile, { upsert: true })
                if (uploadError) throw uploadError
                const { data: urlData } = supabase.storage
                    .from('business-logos')
                    .getPublicUrl(path)
                logo_url = urlData.publicUrl
            }

            const { error: updateError } = await supabase
                .from('businesses')
                .update({
                    name: form.name.trim(),
                    email: form.email.trim() || null,
                    phone: form.phone.trim() || null,
                    address: form.address.trim() || null,
                    logo_url,
                })
                .eq('id', profile.business_id)
            if (updateError) throw updateError

            await fetchProfile(user.id)
            setSuccess('Business profile updated successfully.')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-xl">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold text-gray-900">Business Profile</h3>

                {error && <p className="text-sm text-red-500">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}

                {/* Logo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo</label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                            {logoPreview ? (
                                <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl">🏢</span>
                            )}
                        </div>
                        <label className="cursor-pointer text-sm text-blue-600 font-medium hover:underline">
                            {logoPreview ? 'Change logo' : 'Upload logo'}
                            <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                        </label>
                    </div>
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
                    <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="business@example.com"
                    />
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="08012345678"
                    />
                </div>

                {/* Address */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                    <textarea
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="12 Akin Adesola Street, Victoria Island, Lagos"
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    )
}