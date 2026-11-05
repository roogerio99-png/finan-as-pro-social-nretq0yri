import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
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
  Database,
  ChevronDown,
  Wallet,
  Settings,
  Smartphone,
  ShieldCheck,
  Percent,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { financeGlossary } from '@/services/microlearning'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [glossaryOpen, setGlossaryOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast({
      title: 'Sessão encerrada',
      description: 'Você saiu da sua conta. Para acessar novamente, selecione sua Conta Google.',
    })
    navigate('/')
  }

  // Rotas primárias de uso contínuo no cabeçalho
  const primaryNav = [
    { to: '/painel', label: 'Painel', icon: LayoutDashboard },
    { to: '/lancamentos', label: 'Lançamentos', icon: Receipt },
    { to: '/faturas', label: 'Faturas', icon: CreditCard },
    { to: '/orcamento', label: 'Orçamento', icon: Target },
    { to: '/conciliacao', label: 'Conciliação', icon: FileSpreadsheet },
  ]

  // Grupos secundários com dropdown limpo
  const planningRoutes = [
    {
      to: '/dividas',
      label: 'Dívidas & Quitação',
      desc: 'Bola de neve vs. avalanche',
      icon: BadgeAlert,
    },
    {
      to: '/sonhos',
      label: 'Sonhos & Metas',
      desc: 'Reserva e objetivos de vida',
      icon: Sparkles,
    },
    {
      to: '/simulacoes',
      label: 'Simulações',
      desc: 'Juros compostos e simples',
      icon: Percent,
    },
  ]

  const managementRoutes = [
    {
      to: '/familia',
      label: 'Modo Família',
      desc: 'Orçamento compartilhado',
      icon: Users,
    },
    {
      to: '/cadastros',
      label: 'Cadastros',
      desc: 'Contas, cartões e categorias',
      icon: Database,
    },
  ]

  const isPlanningActive = planningRoutes.some((r) => location.pathname.startsWith(r.to))
  const isManagementActive = managementRoutes.some((r) => location.pathname.startsWith(r.to))

  // Iniciais do usuário
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/)
      if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      return parts[0].slice(0, 2).toUpperCase()
    }
    if (email) return email.slice(0, 2).toUpperCase()
    return 'GF'
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Marca / Logo */}
          <div className="flex items-center space-x-8">
            <button
              onClick={() => navigate('/painel')}
              className="flex items-center space-x-2.5 text-left group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-0.5"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-xs group-hover:bg-slate-800 transition-colors">
                <Wallet className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center">
                  <span className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                    Gestio
                  </span>
                  <span className="text-emerald-600 font-black text-lg leading-none -ml-0.5">
                    .
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
                  Finanças
                </span>
              </div>
            </button>

            {/* Navegação Principal Desktop */}
            <nav className="hidden lg:flex items-center space-x-1">
              {primaryNav.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5 opacity-80" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}

              {/* Dropdown Planejamento */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      isPlanningActive
                        ? 'bg-emerald-50 text-emerald-800 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <span>Planejamento</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1.5">
                  <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1">
                    Metas &amp; Estratégia
                  </DropdownMenuLabel>
                  {planningRoutes.map((route) => {
                    const Icon = route.icon
                    return (
                      <DropdownMenuItem
                        key={route.to}
                        onClick={() => navigate(route.to)}
                        className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer"
                      >
                        <div className="p-1.5 rounded-md bg-slate-100 text-slate-700 mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            {route.label}
                          </p>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                            {route.desc}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Dropdown Gestão */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      isManagementActive
                        ? 'bg-emerald-50 text-emerald-800 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <span>Gestão</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1.5">
                  <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1">
                    Administração &amp; Núcleo
                  </DropdownMenuLabel>
                  {managementRoutes.map((route) => {
                    const Icon = route.icon
                    return (
                      <DropdownMenuItem
                        key={route.to}
                        onClick={() => navigate(route.to)}
                        className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer"
                      >
                        <div className="p-1.5 rounded-md bg-slate-100 text-slate-700 mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            {route.label}
                          </p>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                            {route.desc}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          {/* Ações à Direita */}
          <div className="flex items-center space-x-2">
            {/* Glossário Vivo */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGlossaryOpen(true)}
              className="text-slate-600 hover:text-slate-900 text-xs font-medium gap-1.5 h-8 px-2.5 rounded-lg"
              title="Glossário Financeiro Comportamental"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Glossário</span>
            </Button>

            {/* Instalar App no Celular / Computador */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
              className="hidden md:inline-flex text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border-emerald-200 text-xs font-bold gap-1.5 h-8 px-2.5 rounded-lg transition-colors cursor-pointer"
              title="Instalar Gestio Finanças como Aplicativo"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instalar App</span>
            </Button>

            {/* Menu do Usuário */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center tracking-tight shadow-xs">
                      {getInitials(user.name, user.email)}
                    </div>
                    <div className="hidden sm:flex flex-col min-w-0 max-w-[110px]">
                      <span className="text-xs font-bold text-slate-800 truncate leading-tight">
                        {user.name?.split(' ')[0] || 'Usuário'}
                      </span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 p-1.5">
                  <div className="p-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user.name || 'Usuário'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                      <span>100% Local neste aparelho</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <DropdownMenuItem
                      onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
                      className="text-xs gap-2 py-2 cursor-pointer font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Instalar no Celular (PWA)</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => navigate('/cadastros/privacidade')}
                      className="text-xs gap-2 py-2 cursor-pointer font-semibold text-slate-800 hover:text-emerald-800"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Privacidade &amp; Dados Locais</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => navigate('/cadastros')}
                      className="text-xs gap-2 py-2 cursor-pointer font-medium"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-500" />
                      <span>Cadastros &amp; Contas</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => navigate('/boas-vindas')}
                      className="text-xs gap-2 py-2 cursor-pointer font-medium"
                    >
                      <Compass className="w-3.5 h-3.5 text-teal-600" />
                      <span>Guia de Boas-vindas</span>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-xs gap-2 py-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Sair da conta</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </header>

      {/* Modal do Glossário Vivo */}
      <Dialog open={glossaryOpen} onOpenChange={setGlossaryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              Glossário Vivo de Finanças Conscientes
            </DialogTitle>
            <DialogDescription className="text-xs">
              Conceitos fundamentais explicados sem jargões para você assumir o controle do seu
              dinheiro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {financeGlossary.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
              >
                <h4 className="font-bold text-emerald-800 text-sm">{item.term}</h4>
                <p className="text-slate-700 text-xs mt-1 leading-relaxed">{item.meaning}</p>
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
