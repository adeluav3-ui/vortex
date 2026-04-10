import { useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import CustomerList from './components/CustomerList'
import CustomerModal from './components/CustomerModal'
import CustomerDrawer from './components/CustomerDrawer'

export default function Customers() {
    const [showModal, setShowModal] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState(null)
    const [selectedCustomer, setSelectedCustomer] = useState(null)
    const [refresh, setRefresh] = useState(0)

    function handleSaved() {
        setShowModal(false)
        setEditingCustomer(null)
        setRefresh(r => r + 1)
    }

    function handleEdit(customer) {
        setEditingCustomer(customer)
        setShowModal(true)
    }

    function handleView(customer) {
        setSelectedCustomer(customer)
    }

    return (
        <PageWrapper title="Customers">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
                    <p className="text-sm text-gray-500">Manage your customers and track credit balances</p>
                </div>
                <button
                    onClick={() => { setEditingCustomer(null); setShowModal(true) }}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    + Add Customer
                </button>
            </div>

            <CustomerList
                refresh={refresh}
                onEdit={handleEdit}
                onView={handleView}
            />

            {showModal && (
                <CustomerModal
                    customer={editingCustomer}
                    onClose={() => { setShowModal(false); setEditingCustomer(null) }}
                    onSaved={handleSaved}
                />
            )}

            {selectedCustomer && (
                <CustomerDrawer
                    customer={selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                    onEdit={handleEdit}
                    onRepayment={() => setRefresh(r => r + 1)}
                />
            )}
        </PageWrapper>
    )
}