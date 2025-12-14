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

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initializedRef.current) return
    initializedRef.current = true

    // Use getSession for initial load (uses cached data, doesn't hit server)
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
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
          // Backend rejected the user (likely deactivated), sign them out
          console.error('User not allowed to log in:', error)
          await supabase.auth.signOut()
          setUser(null)
          setLoading(false)
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
        if (session?.user) {
          // Prevent multiple simultaneous fetches
          if (fetchingUserRef.current) return
          fetchingUserRef.current = true
          
          try {
            // Verify with backend that user is allowed to log in (not deactivated)
            // getCurrentUser() already has deduplication, but this prevents multiple listeners from trying
            const backendUser = await getCurrentUser()
            // User is allowed, use backend user data (which has verified role)
            setUser(backendUser)
            setLoading(false)
          } catch (error) {
            // Backend rejected the user (likely deactivated), sign them out
            console.error('User not allowed to log in:', error)
            await supabase.auth.signOut()
            setUser(null)
            setLoading(false)
          } finally {
            fetchingUserRef.current = false
          }
        } else {
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
