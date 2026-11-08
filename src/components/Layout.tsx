import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { GoogleLoginPage } from '@/pages/GoogleLoginPage'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { licenseService, AppLicenseConfig } from '@/services/licenseService'
import { CommercialBlockModal } from '@/components/CommercialBlockModal'

export default function Layout() {
  const { user, loading } = useAuth()
  const [license, setLicense] = useState<AppLicenseConfig | null>(null)
  const [licenseLoading, setLicenseLoading] = useState<boolean>(true)

  useEffect(() => {
    let mounted = true
    licenseService.fetchLicense().then((cfg) => {
      if (mounted) {
        setLicense(cfg)
        setLicenseLoading(false)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  if (loading || licenseLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-xs font-semibold text-slate-300">Carregando SimplaFin...</p>
      </div>
    )
  }

  if (!user) {
    return <GoogleLoginPage />
  }

  const isBlocked = license ? licenseService.isBlocked(license, user.email) : false

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Se o uso de terceiros estiver bloqueado, exibe a barreira comercial */}
      {isBlocked && license && <CommercialBlockModal license={license} />}

      <Navbar licenseConfig={license} onUpdateLicense={setLicense} />
      <main className="flex-1 w-full pb-24 lg:pb-16">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500 hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-semibold text-slate-700">
            SimplaFin &copy; {new Date().getFullYear()} — Gestão Financeira Pessoal com Rigor
            Profissional
          </div>
          <div className="text-slate-400">
            100% dos dados salvos no seu aparelho • Privacidade Zero-Knowledge
          </div>
        </div>
      </footer>
      <MobileBottomNav />
    </div>
  )
}
