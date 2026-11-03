import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  Target,
  BadgeAlert,
  Sparkles,
  Users,
  Compass,
  BookOpen,
  LogOut,
  CreditCard,
  UserCheck,
  Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { financeGlossary } from '@/services/microlearning'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface NavbarProps {
  children?: React.ReactNode
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [glossaryOpen, setGlossaryOpen] = useState(false)

  const navItems = [
    { to: '/painel', label: 'Painel', icon: LayoutDashboard },
    { to: '/lancamentos', label: 'Lançamentos', icon: Receipt },
    { to: '/faturas', label: 'Faturas', icon: CreditCard },
    { to: '/conciliacao', label: 'Conciliação', icon: FileSpreadsheet },
    { to: '/orcamento', label: 'Orçamento', icon: Target },
    { to: '/dividas', label: 'Dívidas', icon: BadgeAlert },
    { to: '/sonhos', label: 'Sonhos', icon: Sparkles },
    { to: '/familia', label: 'Família', icon: Users },
    { to: '/cadastros', label: 'Cadastros', icon: Database },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/painel')}
              className="flex items-center space-x-2.5 font-bold text-xl text-primary hover:opacity-90 transition-opacity"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="leading-tight text-slate-900 font-extrabold tracking-tight">
                  Finanças Pro
                </span>
                <span className="text-xs font-medium text-emerald-600 tracking-wider uppercase">
                  Social & Família
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGlossaryOpen(true)}
              className="text-slate-600 border-slate-200 hover:bg-slate-50 gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Glossário Vivo</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/boas-vindas')}
              className="text-slate-600 hover:text-slate-900 gap-1.5"
              title="Guia de Boas-vindas e Configuração"
            >
              <Compass className="w-4 h-4 text-teal-600" />
              <span>Guia</span>
            </Button>

            {user ? (
              <div className="flex items-center pl-2 border-l border-slate-200 space-x-2">
                <div className="flex items-center space-x-2 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-800 max-w-[120px] truncate">
                    {user.name || user.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  onClick={logout}
                  title="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : null}
          </div>

          {/* Mobile Right Actions (Guia ou Sair simplificado no topo) */}
          <div className="md:hidden flex items-center space-x-1.5">
            {user ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-700 max-w-[100px] truncate">
                  {user.name?.split(' ')[0] || 'Você'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-rose-600"
                  onClick={logout}
                  title="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Modal do Glossário Vivo */}
      <Dialog open={glossaryOpen} onOpenChange={setGlossaryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <BookOpen className="w-6 h-6 text-emerald-600" />
              Glossário Vivo de Finanças Conscientes
            </DialogTitle>
            <DialogDescription>
              Conceitos fundamentais explicados sem jargões para você assumir o controle do seu
              dinheiro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {financeGlossary.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
              >
                <h4 className="font-bold text-emerald-800 text-base">{item.term}</h4>
                <p className="text-slate-700 text-sm mt-1 leading-relaxed">{item.meaning}</p>
                <div className="mt-2 text-xs bg-emerald-100/60 text-emerald-900 p-2 rounded-lg font-medium">
                  <span className="font-bold">Exemplo prático:</span> {item.example}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
