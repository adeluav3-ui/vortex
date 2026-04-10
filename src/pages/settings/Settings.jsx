import { useAuth } from '../../context/AuthContext'
import VendorSettings from './VendorSettings'

// RetailSettings is your existing Settings.jsx content
// Rename your current Settings.jsx to RetailSettings.jsx
// and change the export from `Settings` to `RetailSettings`
import RetailSettings from './RetailSettings'

export default function Settings() {
    const { profile } = useAuth()
    const mode = profile?.businesses?.mode

    if (mode === 'online_vendor') return <VendorSettings />
    return <RetailSettings />
}