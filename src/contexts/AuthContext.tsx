import React, { createContext, useContext, useEffect, useState } from 'react'
import { UserRecord } from '@/types/finance'
import { authService, GoogleAuthPayload, SavedGoogleAccount } from '@/services/auth'
import { indexedDbStore } from '@/lib/storage/indexedDbStore'

interface AuthContextType {
  user: UserRecord | null
  loading: boolean
  savedAccounts: SavedGoogleAccount[]
  loginWithGoogle: (payload?: GoogleAuthPayload) => Promise<UserRecord>
  loginWithGooglePopup: (loginHint?: string) => Promise<UserRecord>
  unlockOfflineVault: (email: string, pin?: string) => Promise<UserRecord>
  loginDemo: () => Promise<UserRecord>
  setVaultPin: (email: string, pin: string) => Promise<void>
  logout: () => void
  removeSavedAccount: (email: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos de inatividade bloqueiam o cofre

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(authService.getCurrentUser())
  const [loading, setLoading] = useState<boolean>(true)
  const [savedAccounts, setSavedAccounts] = useState<SavedGoogleAccount[]>(
    authService.getSavedAccounts(),
  )

  const refreshSavedAccounts = () => {
    setSavedAccounts(authService.getSavedAccounts())
  }

  useEffect(() => {
    let mounted = true

    authService
      .initializeSession()
      .then((restoredUser) => {
        if (!mounted) return
        setUser(restoredUser)
        refreshSavedAccounts()
        setLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setUser(null)
        setLoading(false)
      })

    const unsubAuth = authService.subscribe((newUser) => {
      if (!mounted) return
      setUser(newUser)
      refreshSavedAccounts()
    })

    // Coordenação entre abas abertas: se uma aba bloquear o cofre, todas as demais bloqueiam imediatamente
    const unsubBroadcast =
      typeof indexedDbStore.onSyncMessage === 'function'
        ? indexedDbStore.onSyncMessage((event) => {
            if (event.type === 'VAULT_LOCKED' && mounted) {
              authService.logout()
              setUser(null)
              refreshSavedAccounts()
            }
          })
        : () => {}

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'gestio_local_auth_v1' && !e.newValue && mounted) {
        authService.logout()
        setUser(null)
        refreshSavedAccounts()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent)
    }

    return () => {
      mounted = false
      unsubAuth()
      unsubBroadcast()
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageEvent)
      }
    }
  }, [])

  // Auto-bloqueio por inatividade quando há sessão autenticada ativa
  useEffect(() => {
    if (!user || typeof window === 'undefined') return

    let timer: ReturnType<typeof setTimeout>

    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        authService.logout()
        setUser(null)
        refreshSavedAccounts()
      }, INACTIVITY_TIMEOUT_MS)
    }

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll']
    activityEvents.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      clearTimeout(timer)
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetTimer))
    }
  }, [user])

  const loginWithGoogle = async (payload?: GoogleAuthPayload) => {
    const logged = await authService.loginWithGoogle(payload)
    setUser(logged)
    refreshSavedAccounts()
    return logged
  }

  const loginWithGooglePopup = async (loginHint?: string) => {
    const logged = await authService.loginWithGooglePopup(loginHint)
    setUser(logged)
    refreshSavedAccounts()
    return logged
  }

  const unlockOfflineVault = async (email: string, pin?: string) => {
    const unlocked = await authService.unlockOfflineVault(email, pin)
    setUser(unlocked)
    refreshSavedAccounts()
    return unlocked
  }

  const loginDemo = async () => {
    const demoUser = await authService.loginDemo()
    setUser(demoUser)
    refreshSavedAccounts()
    return demoUser
  }

  const setVaultPin = async (email: string, pin: string) => {
    await authService.setVaultPin(email, pin)
    refreshSavedAccounts()
  }

  const logout = () => {
    authService.logout()
    setUser(null)
    refreshSavedAccounts()
  }

  const removeSavedAccount = (email: string) => {
    const updated = authService.removeSavedAccount(email)
    setSavedAccounts(updated)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        savedAccounts,
        loginWithGoogle,
        loginWithGooglePopup,
        unlockOfflineVault,
        loginDemo,
        setVaultPin,
        logout,
        removeSavedAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
