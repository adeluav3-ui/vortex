import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

const ROLES = ['manager', 'staff', 'cashier']
const FREQUENCIES = ['monthly', 'weekly', 'daily']

export default function StaffModal({ staff, onClose, onSaved }) {
    const { profile, user } = useAuth()
    const [branches, setBranches] = useState([])
    const [loading, setLoading] = useState(false)
    const [creatingUser, setCreatingUser] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [form, setForm] = useState({
        full_name: staff?.full_name ?? '',
        phone: staff?.phone ?? '',
        email: staff?.email ?? '',
        password: '',
        role: staff?.role ?? 'staff',
        branch_id: staff?.branch_id ?? '',
        salary: staff?.salary ?? '',
        salary_frequency: staff?.salary_frequency ?? 'monthly',
    })

    useEffect(() => {
        supabase
            .from('branches')
            .select('*')
            .eq('business_id', profile.business_id)
            .then(({ data }) => setBranches(data ?? []))
    }, [])

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    async function handleSave() {
        setError('')
        setSuccess('')

        if (!form.full_name.trim()) return setError('Full name is required')
        if (!form.email.trim()) return setError('Email is required')

        // For new staff, password is required
        if (!staff && !form.password) return setError('Password is required for new staff')
        if (!staff && form.password.length < 6) return setError('Password must be at least 6 characters')

        setLoading(true)

        try {
            if (staff) {
                // Update existing staff
                const { error } = await supabase
                    .from('staff')
                    .update({
                        full_name: form.full_name.trim(),
                        phone: form.phone.trim() || null,
                        email: form.email.trim(),
                        role: form.role,
                        branch_id: form.branch_id || null,
                        salary: Number(form.salary) || 0,
                        salary_frequency: form.salary_frequency,
                    })
                    .eq('id', staff.id)
                if (error) throw error

                // If password is provided, update it in auth
                if (form.password) {
                    setCreatingUser(true)

                    // Update user password via admin API (requires edge function)
                    const { data: { session } } = await supabase.auth.getSession()

                    const response = await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`,
                            },
                            body: JSON.stringify({
                                email: form.email.trim(),
                                password: form.password,
                            }),
                        }
                    )

                    const result = await response.json()
                    if (!response.ok) throw new Error(result.error || 'Failed to update password')
                    setCreatingUser(false)
                }

                setSuccess('Staff updated successfully!')
                setTimeout(() => onSaved(), 1500)
            } else {
                // Create new staff with auth user
                setCreatingUser(true)

                // Call edge function to create user with password
                const { data: { session } } = await supabase.auth.getSession()

                const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-user`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({
                            email: form.email.trim(),
                            password: form.password,
                            full_name: form.full_name.trim(),
                            role: form.role,
                            business_id: profile.business_id,
                            branch_id: form.branch_id || null,
                            phone: form.phone.trim() || null,
                            salary: Number(form.salary) || 0,
                            salary_frequency: form.salary_frequency,
                        }),
                    }
                )

                const result = await response.json()
                if (!response.ok) throw new Error(result.error || 'Failed to create staff account')

                setCreatingUser(false)
                setSuccess(`Staff account created! ${form.full_name} can now log in with the password you set.`)
                setTimeout(() => onSaved(), 2000)
            }
        } catch (err) {
            setError(err.message)
            setLoading(false)
            setCreatingUser(false)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {staff ? 'Edit Staff' : 'Add Staff Member'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                            <p className="text-sm text-green-600">{success}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input
                            name="full_name"
                            value={form.full_name}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Chidi Okeke"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="chidi@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password {!staff && <span className="text-red-500">*</span>}
                            {staff && <span className="text-gray-400 text-xs ml-2">(leave blank to keep current)</span>}
                        </label>
                        <input
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Min 6 characters"
                        />
                        {!staff && (
                            <p className="text-xs text-gray-400 mt-1">
                                This password will be used by the staff to log in.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="08012345678"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select
                                name="role"
                                value={form.role}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {ROLES.map(r => (
                                    <option key={r} value={r} className="capitalize">{r}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                        <select
                            name="branch_id"
                            value={form.branch_id}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">No specific branch</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Salary (₦)</label>
                            <input
                                name="salary"
                                type="number"
                                value={form.salary}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                            <select
                                name="salary_frequency"
                                value={form.salary_frequency}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {FREQUENCIES.map(f => (
                                    <option key={f} value={f} className="capitalize">{f}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {!staff && (
                        <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700">
                            🔐 Staff will log in using the email and password you set here.
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || creatingUser}
                        className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {creatingUser ? 'Creating account...' : loading ? 'Saving...' : staff ? 'Save Changes' : 'Create Staff'}
                    </button>
                </div>
            </div>
        </div>
    )
}