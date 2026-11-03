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
  MoreHorizontal,
  BadgeAlert,
  Users,
  Database,
  Compass,
  BookOpen,
  LogOut,
  X,
  UserCheck,
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

export const MobileBottomNav: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const [glossaryOpen, setGlossaryOpen] = useState(false)

  // Itens de acesso rápido e mais frequentes na barra inferior
  const primaryTabs = [
    { to: '/painel', label: 'Painel', icon: LayoutDashboard },
    { to: '/lancamentos', label: 'Lançamentos', icon: Receipt },
    { to: '/conciliacao', label: 'Conciliar', icon: FileSpreadsheet },
    { to: '/orcamento', label: 'Orçamento', icon: Target },
    { to: '/sonhos', label: 'Sonhos', icon: Sparkles },
  ]

  // Rotas complementares dentro da gaveta "Mais"
  const secondaryItems = [
    {
      to: '/faturas',
      label: 'Faturas & Cartões',
      desc: 'Fechamento, vencimento e limites de crédito',
      icon: CreditCard,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      to: '/dividas',
      label: 'Quitação de Dívidas',
      desc: 'Simulador Bola de Neve vs. Avalanche',
      icon: BadgeAlert,
      color: 'text-rose-600 bg-rose-50',
    },
    {
      to: '/familia',
      label: 'Modo Família',
      desc: 'Visão individual vs. consolidada do lar',
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      to: '/cadastros',
      label: 'Cadastros',
      desc: 'Usuários, contas/cartões e categorias',
      icon: Database,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      to: '/boas-vindas',
      label: 'Guia de Boas-vindas',
      desc: 'Tour de configuração inicial e métodos',
      icon: Compass,
      color: 'text-teal-600 bg-teal-50',
    },
  ]

  return (
    <>
      {/* Barra de Navegação Inferior Fixa (Apenas telas mobile < 768px e quando logado) */}
      <nav
        aria-label="Navegação móvel"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      >
        <div className="grid grid-cols-6 items-center px-1 pt-1.5 pb-1">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-150 min-h-[50px] touch-manipulation active:scale-95 ${
                    isActive
                      ? 'text-emerald-700 font-bold'
                      : 'text-slate-500 hover:text-slate-900 font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`relative p-1 rounded-xl transition-colors ${
                        isActive ? 'bg-emerald-100/70 text-emerald-700' : ''
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {isActive && (
                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      )}
                    </div>
                    <span className="text-[10px] leading-tight tracking-tight mt-0.5 truncate max-w-[54px]">
                      {tab.label}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}

          {/* Botão "Mais" */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-150 min-h-[50px] touch-manipulation active:scale-95 ${
              moreOpen
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
            aria-label="Abrir mais opções"
          >
            <div
              className={`p-1 rounded-xl transition-colors ${
                moreOpen ? 'bg-emerald-100/70 text-emerald-700' : ''
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] leading-tight tracking-tight mt-0.5">Mais</span>
          </button>
        </div>
      </nav>

      {/* Gaveta "Mais" (Sheet no formato bottom drawer moderno) */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-slate-200 bg-white px-5 pt-4 pb-8 max-h-[85vh] overflow-y-auto"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
          <SheetHeader className="text-left pb-2">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-lg font-black text-slate-900">
                  Mais Módulos &amp; Ferramentas
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  Acesse recursos avançados, cadastros e educação financeira.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-2 py-3">
            {secondaryItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => {
                    setMoreOpen(false)
                    navigate(item.to)
                  }}
                  className="w-full flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 active:bg-slate-100 transition-colors text-left"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 leading-tight">{item.label}</p>
                    <p className="text-xs text-slate-500 leading-tight mt-0.5 truncate">
                      {item.desc}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start text-slate-700 h-12 rounded-xl text-sm font-semibold border-slate-200"
              onClick={() => {
                setMoreOpen(false)
                setGlossaryOpen(true)
              }}
            >
              <BookOpen className="w-4 h-4 text-emerald-600 mr-2.5" />
              Glossário Vivo de Finanças
            </Button>

            {user && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    <UserCheck className="w-4 h-4" />
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
                  onClick={() => {
                    setMoreOpen(false)
                    logout()
                  }}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold gap-1 rounded-xl"
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
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
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Significado Comportamental:
                </p>
                <p className="text-sm text-slate-800 mt-0.5 leading-relaxed">{item.definition}</p>
                <p className="text-xs text-emerald-700 mt-2 font-medium bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                  <span className="font-bold">Como aplicar:</span> {item.actionable}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
