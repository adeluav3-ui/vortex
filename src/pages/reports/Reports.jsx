import { useAuth } from '../../context/AuthContext'
import RetailReports from './RetailReports'
import VendorReports from './VendorReports'

export default function Reports() {
    const { profile } = useAuth()
    const mode = profile?.businesses?.mode

    if (mode === 'online_vendor') return <VendorReports />
    return <RetailReports />
}