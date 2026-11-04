import React, { createContext, useContext, useEffect, useState } from 'react'
import { UserRecord } from '@/types/finance'
import { authService, GoogleAuthPayload, SavedGoogleAccount } from '@/services/auth'

interface AuthContextType {
  user: UserRecord | null
  loading: boolean
  savedAccounts: SavedGoogleAccount[]
  loginWithGoogle: (payload?: GoogleAuthPayload) => Promise<UserRecord>
  logout: () => void
  removeSavedAccount: (email: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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
    // Restaura o usuário autenticado caso já possua sessão Google salva
    if (authService.isAuthenticated()) {
      setUser(authService.getCurrentUser())
    } else {
      setUser(null)
    }
    refreshSavedAccounts()
    setLoading(false)

    const unsub = authService.subscribe((newUser) => {
      setUser(newUser)
      refreshSavedAccounts()
    })

    return () => unsub()
  }, [])

  const loginWithGoogle = async (payload?: GoogleAuthPayload) => {
    const logged = await authService.loginWithGoogle(payload)
    setUser(logged)
    refreshSavedAccounts()
    return logged
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
