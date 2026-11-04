import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users } from 'lucide-react'
import { UsersTab } from '@/components/cadastros/UsersTab'
import { AccountsTab } from '@/components/cadastros/AccountsTab'
import { CategoriesTab } from '@/components/cadastros/CategoriesTab'
import { PrivacyTab } from '@/components/cadastros/PrivacyTab'

const TABS = [
  { value: 'usuarios', label: 'Usuários' },
  { value: 'contas', label: 'Contas & Cartões' },
  { value: 'categorias', label: 'Categorias & Subgrupos' },
  { value: 'privacidade', label: '🔒 Privacidade & Dados Locais' },
] as const

type TabValue = (typeof TABS)[number]['value']

const slugToTab = (slug?: string): TabValue => {
  if (slug === 'contas') return 'contas'
  if (slug === 'categorias') return 'categorias'
  if (slug === 'privacidade') return 'privacidade'
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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Cadastros &amp; Privacidade
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pessoas do lar, contas/cartões, categorias e gestão de soberania dos dados locais no seu
            aparelho.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <Users className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">
            100% dos dados salvos no armazenamento seguro deste dispositivo.
          </span>
        </div>
      </div>

      {/* Abas */}
      <Tabs value={tabValue} onValueChange={handleTabChange}>
        <TabsList className="h-11 bg-white border border-slate-200 rounded-2xl p-1 shadow-xs w-full grid grid-cols-2 sm:grid-cols-4 sm:w-auto sm:inline-flex">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="rounded-xl px-2 sm:px-4 py-2 text-xs font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-none truncate"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tabValue === 'usuarios' && <UsersTab />}
      {tabValue === 'contas' && <AccountsTab />}
      {tabValue === 'categorias' && <CategoriesTab />}
      {tabValue === 'privacidade' && <PrivacyTab />}
    </div>
  )
}
