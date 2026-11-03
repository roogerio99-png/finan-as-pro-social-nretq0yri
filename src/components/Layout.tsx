import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { useAuth } from '@/contexts/AuthContext'

export default function Layout() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
      <Navbar />
      <main className={`flex-1 w-full ${user ? 'pb-24 md:pb-16' : 'pb-16'}`}>
        <Outlet />
      </main>
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-semibold text-slate-700">
            Finanças Pro Social &copy; {new Date().getFullYear()} — Rigor Profissional com Abordagem
            Humana
          </div>
          <div className="text-slate-400">
            Regime de Competência vs. Caixa • Modo Família • Protegido por Skip Cloud
          </div>
        </div>
      </footer>
      {user && <MobileBottomNav />}
    </div>
  )
}
