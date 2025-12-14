import { useState, useCallback, useEffect } from 'react'
import {
  getTenants,
  createTenant,
  updateTenant,
  deactivateTenant,
  activateTenant,
  getTenantUsers,
  addUserToTenant,
  deactivateUserFromTenant,
  activateUserInTenant,
  updateUserTenantRole,
  type Tenant,
  type TenantUser
} from '@/lib/api/backend'

export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshTenants = useCallback(async (includeInactive = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTenants(includeInactive)
      setTenants(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tenants'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const createTenantHandler = useCallback(async (name: string): Promise<Tenant | null> => {
    setLoading(true)
    setError(null)
    try {
      const newTenant = await createTenant(name)
      await refreshTenants()
      return newTenant
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tenant'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [refreshTenants])

  const updateTenantHandler = useCallback(async (tenantId: string, name: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await updateTenant(tenantId, name)
      await refreshTenants()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tenant'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [refreshTenants])

  const deactivateTenantHandler = useCallback(async (tenantId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await deactivateTenant(tenantId)
      await refreshTenants()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate tenant'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [refreshTenants])

  const activateTenantHandler = useCallback(async (tenantId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await activateTenant(tenantId)
      await refreshTenants()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to activate tenant'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [refreshTenants])

  return {
    tenants,
    loading,
    error,
    refreshTenants,
    createTenant: createTenantHandler,
    updateTenant: updateTenantHandler,
    deactivateTenant: deactivateTenantHandler,
    activateTenant: activateTenantHandler
  }
}

export function useTenantUsers(tenantId: string | null) {
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshUsers = useCallback(async (includeInactive = false) => {
    if (!tenantId) {
      setUsers([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await getTenantUsers(tenantId, includeInactive)
      setUsers(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tenant users'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const addUser = useCallback(async (email: string, password: string, fullName: string | undefined, role: 'admin' | 'user'): Promise<TenantUser | null> => {
    if (!tenantId) return null

    setLoading(true)
    setError(null)
    try {
      const newUser = await addUserToTenant(tenantId, email, password, fullName, role)
      await refreshUsers()
      return newUser
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add user to tenant'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [tenantId, refreshUsers])

  const deactivateUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!tenantId) return false

    setLoading(true)
    setError(null)
    try {
      await deactivateUserFromTenant(tenantId, userId)
      await refreshUsers()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate user'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [tenantId, refreshUsers])

  const activateUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!tenantId) return false

    setLoading(true)
    setError(null)
    try {
      await activateUserInTenant(tenantId, userId)
      await refreshUsers()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to activate user'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [tenantId, refreshUsers])

  const updateUserRole = useCallback(async (userId: string, role: 'admin' | 'user'): Promise<boolean> => {
    if (!tenantId) return false

    setLoading(true)
    setError(null)
    try {
      await updateUserTenantRole(tenantId, userId, role)
      await refreshUsers()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user role'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [tenantId, refreshUsers])

  useEffect(() => {
    if (tenantId) {
      refreshUsers()
    }
  }, [tenantId, refreshUsers])

  return {
    users,
    loading,
    error,
    refreshUsers,
    addUser,
    deactivateUser,
    activateUser,
    updateUserRole
  }
}

