// src/pages/settings/Settings.jsx
import { useAuth } from '../../context/AuthContext'
import VendorSettings from './VendorSettings'
import RetailSettings from './RetailSettings'
import ComboSettings from './ComboSettings'  // Create this new component

export default function Settings() {
    const { profile } = useAuth()
    const mode = profile?.businesses?.mode

    if (mode === 'online_vendor') return <VendorSettings />
    if (mode === 'combo') return <ComboSettings />  // Add this
    return <RetailSettings />
}