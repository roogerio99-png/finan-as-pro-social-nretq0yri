import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { GoogleLoginPage } from '@/pages/GoogleLoginPage'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export default function Layout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-xs font-semibold text-slate-300">Carregando Gestio Finanças...</p>
      </div>
    )
  }

  if (!user) {
    return <GoogleLoginPage />
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
      <Navbar />
      <main className="flex-1 w-full pb-24 lg:pb-16">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500 hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-semibold text-slate-700">
            Gestio Finanças &copy; {new Date().getFullYear()} — Gestão Financeira Pessoal com Rigor
            Profissional
          </div>
          <div className="text-slate-400">
            Regime de Competência vs. Caixa • Modo Família • Protegido por Skip Cloud
          </div>
        </div>
      </footer>
      <MobileBottomNav />
    </div>
  )
}
