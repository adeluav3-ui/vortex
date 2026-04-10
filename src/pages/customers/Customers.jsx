import { useAuth } from '../../context/AuthContext'
import VendorCustomers from './VendorCustomers'

// RetailCustomers is your existing Customers.jsx content
// Rename your current Customers.jsx to RetailCustomers.jsx
// and change the export from `Customers` to `RetailCustomers`
import RetailCustomers from './RetailCustomers'

export default function Customers() {
    const { profile } = useAuth()
    const mode = profile?.businesses?.mode

    if (mode === 'online_vendor') return <VendorCustomers />
    return <RetailCustomers />
}