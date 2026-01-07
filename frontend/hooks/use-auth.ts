'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types/user'
import { getCurrentUser } from '@/lib/api/backend'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const initializedRef = useRef(false)
  const fetchingUserRef = useRef(false)
  const userRef = useRef<User | null>(null) // Track user state for event handlers

  // Keep userRef in sync with user state
  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initializedRef.current) return
    initializedRef.current = true

    // Use getSession for initial load (uses cached data, doesn't hit server)
    const initializeAuth = async () => {
      let session
      try {
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 8000) // 8 second timeout
        )
        const result = await Promise.race([sessionPromise, timeoutPromise])
        session = (result as { data: { session: any } }).data.session
      } catch (error) {
        // Session check timed out - treat as no session
        console.error('Session check timeout:', error)
        setUser(null)
        setLoading(false)
        return
      }
      
      if (session?.user) {
        // Prevent multiple simultaneous fetches
        if (fetchingUserRef.current) return
        fetchingUserRef.current = true
        
        try {
          // Verify with backend that user is allowed to log in (not deactivated)
          const backendUser = await getCurrentUser()
          // User is allowed, use backend user data (which has verified role)
          setUser(backendUser)
          setLoading(false)
        } catch (error) {
          // Handle network/timeout errors differently
          if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('Failed to fetch'))) {
            console.error('Network error fetching user:', error)
            // Don't sign out on network errors - keep existing user if available
            // Set loading to false so UI doesn't hang
            setLoading(false)
          } else {
            // Backend rejected the user (likely deactivated), sign them out
            console.error('User not allowed to log in:', error)
            await supabase.auth.signOut()
            setUser(null)
            setLoading(false)
          }
        } finally {
          fetchingUserRef.current = false
        }
      } else {
        setUser(null)
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle different event types appropriately
        if (event === 'TOKEN_REFRESHED' && userRef.current) {
          // Token refreshed but we already have user data
          // Only refetch if we want to ensure data is fresh, but don't block UI
          // For now, skip refetch to avoid unnecessary calls and potential hangs
          return
        }

        if (session?.user) {
          // Prevent multiple simultaneous fetches
          if (fetchingUserRef.current) return
          fetchingUserRef.current = true
          
          try {
            // Verify with backend that user is allowed to log in (not deactivated)
            const backendUser = await getCurrentUser()
            // User is allowed, use backend user data (which has verified role)
            setUser(backendUser)
            setLoading(false)
          } catch (error) {
            // Handle network/timeout errors differently
            if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('Failed to fetch'))) {
              console.error('Network error fetching user after auth change:', error)
              // Don't sign out on network errors - keep existing user if available
              setLoading(false)
            } else {
              // Backend rejected the user (likely deactivated), sign them out
              console.error('User not allowed to log in:', error)
              await supabase.auth.signOut()
              setUser(null)
              setLoading(false)
            }
          } finally {
            fetchingUserRef.current = false
          }
        } else {
          // No session - user signed out
          setUser(null)
          setLoading(false)
          fetchingUserRef.current = false
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
  }, [supabase, router])

  const updateUser = useCallback(async (data: { fullName?: string }) => {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: data.fullName }
    })
    if (!error) {
      // Refresh user data from backend to ensure consistency
      try {
        const backendUser = await getCurrentUser()
        setUser(backendUser)
      } catch (err) {
        // If backend refresh fails, update local state as fallback
        console.error('Error refreshing user from backend:', err)
        setUser(prev => prev ? { ...prev, fullName: data.fullName } : null)
      }
    }
    return { error }
  }, [supabase])

  return { user, loading, signOut, updateUser }
}
