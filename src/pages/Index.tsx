import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardPage } from './DashboardPage'
import { WelcomePage } from './WelcomePage'

export default function Index() {
  const { user, loading } = useAuth()

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
