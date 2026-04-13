import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

const ROLES = ['manager', 'staff', 'cashier']
const FREQUENCIES = ['monthly', 'weekly', 'daily']

export default function StaffModal({ staff, onClose, onSaved }) {
    const { profile, user } = useAuth()
    const [branches, setBranches] = useState([])
    const [loading, setLoading] = useState(false)
    const [inviting, setInviting] = useState(false)
    const [error, setError] = useState('')
    const [inviteStatus, setInviteStatus] = useState(null) // 'sent', 'failed', null

    const [form, setForm] = useState({
        full_name: staff?.full_name ?? '',
        phone: staff?.phone ?? '',
        email: staff?.email ?? '',
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

    async function sendInvite(staffId, email, fullName, role, branchId) {
        setInviting(true)
        setInviteStatus(null)

        try {
            // Get fresh session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError || !session) {
                console.error('Session error:', sessionError)
                throw new Error('Unable to authenticate. Please refresh and try again.')
            }

            const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-staff`
            console.log('Calling edge function at:', functionUrl)

            const payload = {
                email: email.trim(),
                full_name: fullName.trim(),
                role: role,
                business_id: profile.business_id,
                branch_id: branchId || null,
                staff_id: staffId,
            }
            console.log('Invite payload:', payload)

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(payload),
            })

            const result = await response.json()
            console.log('Invite response:', result)

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}: Failed to send invite`)
            }

            setInviteStatus('sent')
            return true
        } catch (err) {
            console.error('Invite error:', err)
            setInviteStatus('failed')
            setError(`Invite failed: ${err.message}. The staff member was added but they won't receive an email. You can resend invite later.`)
            return false
        } finally {
            setInviting(false)
        }
    }

    async function handleSave() {
        setError('')
        if (!form.full_name.trim()) return setError('Full name is required')
        setLoading(true)

        try {
            if (staff) {
                // Update existing staff
                const { error } = await supabase
                    .from('staff')
                    .update({
                        full_name: form.full_name.trim(),
                        phone: form.phone.trim() || null,
                        email: form.email.trim() || null,
                        role: form.role,
                        branch_id: form.branch_id || null,
                        salary: Number(form.salary) || 0,
                        salary_frequency: form.salary_frequency,
                    })
                    .eq('id', staff.id)
                if (error) throw error

                onSaved()
            } else {
                // Create new staff record first
                const { data: newStaff, error: staffErr } = await supabase
                    .from('staff')
                    .insert({
                        business_id: profile.business_id,
                        branch_id: form.branch_id || null,
                        full_name: form.full_name.trim(),
                        phone: form.phone.trim() || null,
                        email: form.email.trim() || null,
                        role: form.role,
                        salary: Number(form.salary) || 0,
                        salary_frequency: form.salary_frequency,
                        invite_sent: false, // Start with false
                    })
                    .select()
                    .single()
                if (staffErr) throw staffErr

                // Send invite if email provided
                if (form.email.trim()) {
                    await sendInvite(newStaff.id, form.email, form.full_name, form.role, form.branch_id)

                    // Update the staff record to mark invite as sent
                    if (inviteStatus === 'sent') {
                        await supabase
                            .from('staff')
                            .update({ invite_sent: true })
                            .eq('id', newStaff.id)
                    }
                }

                onSaved()
            }
        } catch (err) {
            setError(err.message)
            setLoading(false)
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

                    {inviteStatus === 'sent' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                            <p className="text-sm text-green-600">✓ Invite sent successfully to {form.email}</p>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email {!staff && <span className="text-gray-400 font-normal">(invite will be sent)</span>}
                        </label>
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

                    {!staff && form.email && (
                        <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700">
                            📧 An invite email will be sent to <strong>{form.email}</strong> so they can set up their login.
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
                        disabled={loading || inviting}
                        className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {inviting ? 'Sending invite...' : loading ? 'Saving...' : staff ? 'Save Changes' : 'Add Staff'}
                    </button>
                </div>
            </div>
        </div>
    )
}