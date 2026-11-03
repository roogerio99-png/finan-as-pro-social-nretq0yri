import React, { createContext, useContext, useEffect, useState } from 'react'
import { UserRecord } from '@/types/finance'
import { authService } from '@/services/auth'

interface AuthContextType {
  user: UserRecord | null
  loading: boolean
  login: (email: string, pass: string) => Promise<UserRecord>
  loginAsDefault: () => Promise<UserRecord>
  register: (email: string, pass: string, name: string) => Promise<UserRecord>
  requestPasswordReset: (email: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(authService.getCurrentUser())
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    // Se não tiver login prévio, tenta logar automaticamente com a conta semente para experiência fluida imediata
    const checkInit = async () => {
      if (!authService.isAuthenticated()) {
        try {
          const defaultUser = await authService.loginAsDefault()
          setUser(defaultUser)
        } catch (e) {
          console.warn('Auto-login skip:', e)
        }
      } else {
        setUser(authService.getCurrentUser())
      }
      setLoading(false)
    }

    checkInit()

    const unsub = authService.subscribe((newUser) => {
      setUser(newUser)
    })

    return () => unsub()
  }, [])

  const login = async (email: string, pass: string) => {
    const logged = await authService.login(email, pass)
    setUser(logged)
    return logged
  }

  const loginAsDefault = async () => {
    const logged = await authService.loginAsDefault()
    setUser(logged)
    return logged
  }

  const register = async (email: string, pass: string, name: string) => {
    const registered = await authService.register(email, pass, name)
    setUser(registered)
    return registered
  }

  const requestPasswordReset = async (email: string) => {
    await authService.requestPasswordReset(email)
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
        login,
        loginAsDefault,
        register,
        requestPasswordReset,
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
