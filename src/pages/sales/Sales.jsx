import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Lazy import retail Sales to avoid loading POS for vendors
import RetailSales from './RetailSales'

export default function Sales() {
    const { profile } = useAuth()
    const navigate = useNavigate()
    const isVendor = profile?.businesses?.mode === 'online_vendor'

    useEffect(() => {
        if (isVendor) {
            navigate('/orders', { replace: true })
        }
    }, [isVendor])

    if (isVendor) return null

    return <RetailSales />
}