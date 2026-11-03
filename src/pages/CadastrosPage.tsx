import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users } from 'lucide-react'
import { UsersTab } from '@/components/cadastros/UsersTab'
import { AccountsTab } from '@/components/cadastros/AccountsTab'
import { CategoriesTab } from '@/components/cadastros/CategoriesTab'

const TABS = [
  { value: 'usuarios', label: 'Usuários' },
  { value: 'contas', label: 'Contas & Cartões' },
  { value: 'categorias', label: 'Categorias & Subgrupos' },
] as const

type TabValue = (typeof TABS)[number]['value']

const slugToTab = (slug?: string): TabValue => {
  if (slug === 'contas') return 'contas'
  if (slug === 'categorias') return 'categorias'
  return 'usuarios'
}

export const CadastrosPage: React.FC = () => {
  const navigate = useNavigate()
  const { tab } = useParams<{ tab?: string }>()
  const [tabValue, setTabValue] = useState<TabValue>(() => slugToTab(tab))

  useEffect(() => {
    setTabValue(slugToTab(tab))
  }, [tab])

  const handleTabChange = (value: string) => {
    setTabValue(value as TabValue)
    navigate(`/cadastros/${value}`, { replace: true })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Cadastros
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pessoas do lar, contas/cartões e o plano de contas que alimentam lançamentos, orçamento
            e sonhos.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <Users className="w-4 h-4 text-emerald-600" />
          <span className="font-medium">
            Tudo criado aqui aparece automaticamente nas outras telas do app.
          </span>
        </div>
      </div>

      {/* Abas */}
      <Tabs value={tabValue} onValueChange={handleTabChange}>
        <TabsList className="h-11 bg-white border border-slate-200 rounded-2xl p-1 shadow-xs w-full sm:w-auto">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tabValue === 'usuarios' && <UsersTab />}
      {tabValue === 'contas' && <AccountsTab />}
      {tabValue === 'categorias' && <CategoriesTab />}
    </div>
  )
}
