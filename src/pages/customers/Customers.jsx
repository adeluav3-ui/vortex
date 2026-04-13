// src/pages/customers/Customers.jsx
import { useAuth } from '../../context/AuthContext'
import VendorCustomers from './VendorCustomers'
import RetailCustomers from './RetailCustomers'
import ComboCustomers from './ComboCustomers'  // Add this import

export default function Customers() {
    const { profile } = useAuth()
    const mode = profile?.businesses?.mode

    if (mode === 'online_vendor') return <VendorCustomers />
    if (mode === 'combo') return <ComboCustomers />  // Add this line
    return <RetailCustomers />
}