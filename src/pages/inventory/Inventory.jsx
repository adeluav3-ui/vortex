import { useAuth } from '../../context/AuthContext'
import RetailInventory from './RetailInventory'
import VendorInventory from './VendorInventory'

export default function Inventory() {
    const { profile } = useAuth()
    const mode = profile?.businesses?.mode

    if (mode === 'online_vendor') return <VendorInventory />
    return <RetailInventory />
}