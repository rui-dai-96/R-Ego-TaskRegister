// oxlint-disable react/only-export-components -- provider and hook intentionally share one context module
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isDemoMode, supabase } from '../../lib/supabase'
import type { Profile } from '../../types/database'

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  demoMode: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  changePassword: (password: string) => Promise<void>
}

const demoProfile: Profile = {
  id: 'demo-admin',
  role: 'admin',
  vendor_id: null,
  display_name: 'Admin Console',
  email: 'admin@ropedia.ai',
  must_change_password: false,
  disabled_at: null,
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    // vendors references profiles via three FKs (profile_id/created_by/disabled_by),
    // so the embed must name the one linking a vendor to its own account.
    .select('id, role, display_name, must_change_password, vendors!vendors_profile_id_fkey(id,contact_email,disabled_at)')
    .eq('id', userId)
    .single()

  if (error) throw error
  const vendor = Array.isArray(data.vendors) ? data.vendors[0] : data.vendors
  if (vendor?.disabled_at) throw new Error('该账号已停用，请联系管理员。')
  return {
    id: data.id,
    role: data.role,
    vendor_id: vendor?.id ?? null,
    display_name: data.display_name,
    email: vendor?.contact_email ?? '',
    must_change_password: data.must_change_password,
    disabled_at: vendor?.disabled_at ?? null,
  } as Profile
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(isDemoMode ? demoProfile : null)
  const [loading, setLoading] = useState(!isDemoMode)

  const loadSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)
    if (!nextSession) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      setProfile(await fetchProfile(nextSession.user.id))
    } catch {
      await supabase.auth.signOut()
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isDemoMode) return
    supabase.auth.getSession().then(({ data }) => loadSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadSession(nextSession)
    })
    return () => data.subscription.unsubscribe()
  }, [loadSession])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    profile,
    loading,
    demoMode: isDemoMode,
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await loadSession(data.session)
    },
    signOut: async () => {
      if (isDemoMode) return
      await supabase.auth.signOut()
      setProfile(null)
    },
    changePassword: async (password) => {
      const { error: passwordError } = await supabase.auth.updateUser({ password })
      if (passwordError) throw passwordError
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', session?.user.id)
      if (profileError) throw profileError
      if (session) setProfile(await fetchProfile(session.user.id))
    },
  }), [loading, loadSession, profile, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
