import React, { createContext, useContext, useEffect, useState } from 'react'
import { UserRecord } from '@/types/finance'
import { authService, GoogleAuthPayload } from '@/services/auth'

interface AuthContextType {
  user: UserRecord | null
  loading: boolean
  loginWithGoogle: (payload?: GoogleAuthPayload) => Promise<UserRecord>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(authService.getCurrentUser())
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    // Restaura o usuário autenticado caso já possua sessão Google salva
    if (authService.isAuthenticated()) {
      setUser(authService.getCurrentUser())
    } else {
      setUser(null)
    }
    setLoading(false)

    const unsub = authService.subscribe((newUser) => {
      setUser(newUser)
    })

    return () => unsub()
  }, [])

  const loginWithGoogle = async (payload?: GoogleAuthPayload) => {
    const logged = await authService.loginWithGoogle(payload)
    setUser(logged)
    return logged
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        logout,
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
