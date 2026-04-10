import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export default function PersonalProfile() {
    const { profile, fetchProfile, user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    const [form, setForm] = useState({
        full_name: '',
        phone: '',
    })

    useEffect(() => {
        if (profile) {
            setForm({
                full_name: profile.full_name ?? '',
                phone: profile.phone ?? '',
            })
        }
    }, [profile])

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    async function handleSave() {
        setError('')
        setSuccess('')
        if (!form.full_name.trim()) return setError('Full name is required')
        setLoading(true)

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: form.full_name.trim(),
                    phone: form.phone.trim() || null,
                })
                .eq('id', user.id)
            if (error) throw error

            await fetchProfile(user.id)
            setSuccess('Profile updated successfully.')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-xl">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold text-gray-900">Personal Profile</h3>

                {error && <p className="text-sm text-red-500">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}

                {/* Avatar */}
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                        {profile?.full_name?.charAt(0) ?? 'U'}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{profile?.full_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                        name="full_name"
                        value={form.full_name}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

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

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                        value={user?.email ?? ''}
                        disabled
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
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