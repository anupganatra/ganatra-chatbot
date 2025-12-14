'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types/user'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const initializedRef = useRef(false)

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initializedRef.current) return
    initializedRef.current = true

    // Use getSession for initial load (uses cached data, doesn't hit server)
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const userMetadata = session.user.user_metadata || {}
        // Read role directly from user_metadata for all users
        const role = userMetadata.role || 'user' // Default to 'user' if not set
        
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: role,
          fullName: userMetadata.full_name || ''
        })
        setLoading(false)
      } else {
        setUser(null)
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const userMetadata = session.user.user_metadata || {}
          // Read role directly from user_metadata for all users
          const role = userMetadata.role || 'user' // Default to 'user' if not set
          
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: role,
            fullName: userMetadata.full_name || ''
          })
          setLoading(false)
        } else {
          setUser(null)
          setLoading(false)
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
      setUser(prev => prev ? { ...prev, fullName: data.fullName } : null)
    }
    return { error }
  }, [supabase])

  return { user, loading, signOut, updateUser }
}
