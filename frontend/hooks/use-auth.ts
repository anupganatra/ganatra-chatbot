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
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: userMetadata.role || 'user',
          fullName: userMetadata.full_name || ''
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          const userMetadata = session.user.user_metadata || {}
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: userMetadata.role || 'user',
            fullName: userMetadata.full_name || ''
          })
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
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

