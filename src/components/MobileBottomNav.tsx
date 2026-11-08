import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  Target,
  Sparkles,
  CreditCard,
  Menu,
  BadgeAlert,
  Users,
  Database,
  Compass,
  BookOpen,
  Percent,
  TrendingUp,
  BarChart3,
  LogOut,
  ChevronRight,
  Smartphone,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { financeGlossary } from '@/services/microlearning'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export const MobileBottomNav: React.FC = () => {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const [glossaryOpen, setGlossaryOpen] = useState(false)

  const handleLogout = () => {
    setMoreOpen(false)
    logout()
    toast({
      title: 'Sessão encerrada',
      description: 'Você saiu da sua conta. Para acessar novamente, selecione sua Conta Google.',
    })
    navigate('/')
  }

  // 4 itens principais mais frequentes + Botão Menu
  const primaryTabs = [
    { to: '/painel', label: 'Painel', icon: LayoutDashboard },
    { to: '/lancamentos', label: 'Lançamentos', icon: Receipt },
    { to: '/copiloto', label: 'Copiloto IA', icon: Sparkles, isAi: true },
    { to: '/faturas', label: 'Faturas', icon: CreditCard },
    { to: '/orcamento', label: 'Orçamento', icon: Target },
  ]

  // Módulos organizados por seções na gaveta
  const sections = [
    {
      title: 'Inteligência Financeira',
      items: [
        {
          to: '/copiloto',
          label: 'Copiloto IA',
          desc: 'Lançamentos rápidos, orçamento 50/30/20 e economia',
          icon: Sparkles,
          color: 'text-indigo-600 bg-indigo-50',
        },
      ],
    },
    {
      title: 'Movimentações & Bancos',
      items: [
        {
          to: '/conciliacao',
          label: 'Conciliação Bancária',
          desc: 'Conferência de extratos e de-para',
          icon: FileSpreadsheet,
          color: 'text-amber-600 bg-amber-50',
        },
      ],
    },
    {
      title: 'Planejamento & Estratégia',
      items: [
        {
          to: '/dividas',
          label: 'Quitação de Dívidas',
          desc: 'Bola de neve vs. avalanche com taxas',
          icon: BadgeAlert,
          color: 'text-rose-600 bg-rose-50',
        },
        {
          to: '/sonhos',
          label: 'Sonhos & Metas',
          desc: 'Reserva e metas com tradutor de cortes',
          icon: Sparkles,
          color: 'text-purple-600 bg-purple-50',
        },
        {
          to: '/simulacoes',
          label: 'Simulações',
          desc: 'Juros compostos e simples',
          icon: Percent,
          color: 'text-emerald-700 bg-emerald-50',
        },
        {
          to: '/investimentos',
          label: 'Investimentos',
          desc: 'Renda variável, preço médio e imposto',
          icon: TrendingUp,
          color: 'text-sky-700 bg-sky-50',
        },
        {
          to: '/relatorios',
          label: 'Relatórios',
          desc: 'Fluxo de caixa e demonstrativo',
          icon: BarChart3,
          color: 'text-indigo-700 bg-indigo-50',
        },
      ],
    },
    {
      title: 'Gestão & Núcleo',
      items: [
        {
          to: '/familia',
          label: 'Modo Família',
          desc: 'Finanças compartilhadas e membros',
          icon: Users,
          color: 'text-blue-600 bg-blue-50',
        },
        {
          to: '/cadastros',
          label: 'Cadastros',
          desc: 'Contas bancárias, cartões e categorias',
          icon: Database,
          color: 'text-emerald-600 bg-emerald-50',
        },
        {
          to: '/boas-vindas',
          label: 'Guia de Boas-vindas',
          desc: 'Tour de conceitos e configuração inicial',
          icon: Compass,
          color: 'text-teal-600 bg-teal-50',
        },
      ],
    },
  ]

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
      {/* Barra de Navegação Inferior Móvel */}
      <nav
        aria-label="Navegação móvel"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)' }}
      >
        <div className="grid grid-cols-6 items-center px-1 pt-1.5 pb-1 max-w-lg mx-auto">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon
            const isAi = (tab as any).isAi
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-150 min-h-[48px] touch-manipulation active:scale-95 ${
                    isActive
                      ? isAi
                        ? 'text-indigo-600 font-bold'
                        : 'text-emerald-700 font-bold'
                      : isAi
                        ? 'text-indigo-600 font-semibold'
                        : 'text-slate-500 hover:text-slate-900 font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`p-1 rounded-lg transition-colors ${
                        isAi
                          ? isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-200/60'
                          : isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : ''
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] leading-tight tracking-tight mt-0.5 truncate">
                      {tab.label}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}

          {/* Botão Menu Completo */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-150 min-h-[48px] touch-manipulation active:scale-95 ${
              moreOpen
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
            aria-label="Abrir menu completo"
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                moreOpen ? 'bg-emerald-50 text-emerald-700' : ''
              }`}
            >
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] leading-tight tracking-tight mt-0.5">Menu</span>
          </button>
        </div>
      </nav>

      {/* Gaveta "Menu Completo" */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t border-slate-200 bg-white px-5 pt-3 pb-8 max-h-[85vh] overflow-y-auto"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
        >
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="text-base font-bold text-slate-900">Menu Completo</SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              Todas as ferramentas e configurações de SimplaFin
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-2">
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1.5">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-1">
                  {section.title}
                </h4>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.to}
                        type="button"
                        onClick={() => {
                          setMoreOpen(false)
                          navigate(item.to)
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 active:bg-slate-100 transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-tight">
                              {item.label}
                            </p>
                            <p className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200 h-10 rounded-xl text-xs font-bold"
              onClick={() => {
                setMoreOpen(false)
                window.dispatchEvent(new CustomEvent('open-pwa-install'))
              }}
            >
              <Smartphone className="w-4 h-4 text-emerald-600 mr-2" />
              Instalar Aplicativo no Celular (PWA)
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start text-slate-700 h-10 rounded-xl text-xs font-semibold border-slate-200"
              onClick={() => {
                setMoreOpen(false)
                setGlossaryOpen(true)
              }}
            >
              <BookOpen className="w-4 h-4 text-emerald-600 mr-2" />
              Glossário Financeiro Comportamental
            </Button>

            {user && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {getInitials(user.name, user.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user.name || 'Usuário'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold gap-1 rounded-lg h-8 px-2.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal do Glossário Vivo no Mobile */}
      <Dialog open={glossaryOpen} onOpenChange={setGlossaryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
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
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
              >
                <h4 className="font-bold text-emerald-800 text-xs">{item.term}</h4>
                <p className="text-xs text-slate-800 mt-0.5 leading-relaxed">{item.meaning}</p>
                <p className="text-[11px] text-emerald-700 mt-1.5 font-medium bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                  <span className="font-bold">Exemplo prático:</span> {item.example}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
