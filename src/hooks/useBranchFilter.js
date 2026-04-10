import { useAuth } from '../context/AuthContext'

export function useBranchFilter() {
    const { profile } = useAuth()

    const isOwner = profile?.role === 'owner' || profile?.role === 'super_admin'

    // Owners see everything, others see their branch only
    const branchId = isOwner ? null : profile?.branch_id

    // Apply to a Supabase query
    function applyFilter(query, column = 'branch_id') {
        if (branchId) return query.eq(column, branchId)
        return query
    }

    return { branchId, isOwner, applyFilter }
}