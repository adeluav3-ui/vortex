import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function ChangePassword() {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [form, setForm] = useState({
        password: '',
        confirm: '',
    })

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    async function handleSave() {
        setError('')
        setSuccess('')
        if (!form.password) return setError('Password is required')
        if (form.password.length < 6) return setError('Password must be at least 6 characters')
        if (form.password !== form.confirm) return setError('Passwords do not match')
        setLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({ password: form.password })
            if (error) throw error
            setSuccess('Password updated successfully.')
            setForm({ password: '', confirm: '' })
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-xl">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>

                {error && <p className="text-sm text-red-500">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Min 6 characters"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                        name="confirm"
                        type="password"
                        value={form.confirm}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Repeat new password"
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {loading ? 'Updating...' : 'Update Password'}
                </button>
            </div>
        </div>
    )
}