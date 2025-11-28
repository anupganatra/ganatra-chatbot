import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SetupPasswordForm } from '@/components/auth/setup-password-form'

export default async function SetupPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect if not authenticated
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SetupPasswordForm />
    </div>
  )
}

