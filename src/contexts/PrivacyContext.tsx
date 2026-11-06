import React, { createContext, useContext, useState, useEffect } from 'react'

interface PrivacyContextType {
  isPrivacyMode: boolean
  togglePrivacyMode: () => void
  formatCurrencySecure: (val: number) => string
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined)

const PRIVACY_STORAGE_KEY = 'gestio_privacy_mode'

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PRIVACY_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(PRIVACY_STORAGE_KEY, String(isPrivacyMode))
    } catch {
      // ignore storage error
    }
  }, [isPrivacyMode])

  const togglePrivacyMode = () => {
    setIsPrivacyMode((prev) => !prev)
  }

  const formatCurrencySecure = (val: number): string => {
    if (isPrivacyMode) {
      return 'R$ ••••••'
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  }

  return (
    <PrivacyContext.Provider
      value={{
        isPrivacyMode,
        togglePrivacyMode,
        formatCurrencySecure,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  )
}

export const usePrivacy = (): PrivacyContextType => {
  const context = useContext(PrivacyContext)
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider')
  }
  return context
}
