import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardPage } from './DashboardPage'

export default function Index() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    )
  }

  // Redireciona para o Painel principal ou exibe o Dashboard
  return <DashboardPage />
}
