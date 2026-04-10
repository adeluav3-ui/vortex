import { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import StaffList from './components/StaffList'
import StaffModal from './components/StaffModal'
import StaffDrawer from './components/StaffDrawer'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function Staff() {
    const [showModal, setShowModal] = useState(false)
    const [editingStaff, setEditingStaff] = useState(null)
    const [selectedStaff, setSelectedStaff] = useState(null)
    const [refresh, setRefresh] = useState(0)
    const { profile, planLimit } = useAuth()
    const [staffCount, setStaffCount] = useState(0)

    useEffect(() => {
        fetchStaffCount()
    }, [])

    async function fetchStaffCount() {
        const { count } = await supabase
            .from('staff')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', profile.business_id)
        setStaffCount(count ?? 0)
    }
    const limit = planLimit('staff')
    const atLimit = staffCount >= limit

    function handleSaved() {
        setShowModal(false)
        setEditingStaff(null)
        setRefresh(r => r + 1)
    }

    function handleEdit(staff) {
        setEditingStaff(staff)
        setShowModal(true)
    }

    function handleView(staff) {
        setSelectedStaff(staff)
    }

    return (
        <PageWrapper title="Staff">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Staff</h2>
                    <p className="text-sm text-gray-500">Manage your team, roles and salary payments</p>
                </div>
                <button
                    onClick={() => {
                        if (atLimit) return
                        setEditingStaff(null)
                        setShowModal(true)
                    }}
                    disabled={atLimit}
                    title={atLimit ? `You've reached the ${limit} staff limit for your plan` : ''}
                    className={`px-3 py-2 text-sm rounded-lg transition ${atLimit
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                >
                    {atLimit ? `Limit reached (${limit})` : '+ Add Staff'}
                </button>
            </div>

            <StaffList
                refresh={refresh}
                onEdit={handleEdit}
                onView={handleView}
            />

            {showModal && (
                <StaffModal
                    staff={editingStaff}
                    onClose={() => { setShowModal(false); setEditingStaff(null) }}
                    onSaved={handleSaved}
                />
            )}

            {selectedStaff && (
                <StaffDrawer
                    staff={selectedStaff}
                    onClose={() => setSelectedStaff(null)}
                    onEdit={handleEdit}
                    onPaymentRecorded={() => setRefresh(r => r + 1)}
                />
            )}
        </PageWrapper>
    )
}