import React, { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResponsiveTabsList } from '@/components/ui/responsive-tabs'
import { useAuth } from '@/contexts/AuthContext'
import { pb } from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { accountsService } from '@/services/accounts'
import { categoriesService } from '@/services/categories'
import { transactionsService } from '@/services/transactions'
import { monthShift } from '@/services/installments'
import {
  CashFlowRegime,
  CashFlowReportData,
  buildCashFlowReport,
  formatMonthLabel,
  formatMonthFull,
} from '@/services/cashFlow'
import { AccountRecord, CategoryRecord, PaymentRecord, TransactionRecord } from '@/types/finance'
import { CashFlowSummaryCards } from '@/components/reports/CashFlowSummaryCards'
import { CashFlowCharts } from '@/components/reports/CashFlowCharts'
import { CashFlowBreakdownTabs } from '@/components/reports/CashFlowBreakdownTabs'
import { CashFlowMonthlyTable } from '@/components/reports/CashFlowMonthlyTable'
import {
  Calendar,
  Layers,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  HelpCircle,
  AlertCircle,
} from 'lucide-react'

// Gera opções de meses disponíveis (últimos 18 meses até próximos 6 meses)
const generateAvailableMonthOptions = (): { value: string; label: string }[] => {
  const current = new Date().toISOString().slice(0, 7)
  const options: { value: string; label: string }[] = []
  // Começar 18 meses atrás
  let cur = monthShift(current, -18)
  const end = monthShift(current, 6)

  while (cur <= end) {
    options.push({ value: cur, label: formatMonthFull(cur) })
    cur = monthShift(cur, 1)
  }
  return options
}

export const ReportsPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const monthOptions = useMemo(() => generateAvailableMonthOptions(), [])

  // Modos de período: 'single' (mês único) ou 'range' (intervalo de meses)
  const [periodMode, setPeriodMode] = useState<'single' | 'range'>('single')
  const [startMonth, setStartMonth] = useState<string>(currentMonth)
  const [endMonth, setEndMonth] = useState<string>(currentMonth)

  // Regime: 'cash' (Caixa) ou 'competence' (Competência)
  const [regime, setRegime] = useState<CashFlowRegime>('cash')

  // Dados carregados
  const [loading, setLoading] = useState<boolean>(true)
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])

  const familyId = user?.family_id

  // Carregar dados brutos
  const loadData = async () => {
    try {
      setLoading(true)

      const [accs, cats, txs, pmts] = await Promise.all([
        accountsService.list(familyId),
        categoriesService.list({ includeInactive: true }),
        // Buscar todas as transações da família/usuário para garantir encadeamento de saldo histórico
        transactionsService.list({ familyId }),
        // Buscar pagamentos de fatura registrados
        pb
          .collection('payments')
          .getFullList<PaymentRecord>({
            filter: familyId
              ? `family_id = "${familyId}"`
              : `user_id = "${user?.id || pb.authStore.record?.id}"`,
            sort: '-cash_month',
          })
          .catch(() => [] as PaymentRecord[]),
      ])

      setAccounts(accs || [])
      setCategories(cats || [])
      setTransactions(txs || [])
      setPayments(pmts || [])
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados do relatório',
        description: err?.message || 'Não foi possível carregar os lançamentos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [familyId])

  // Ajustes ao trocar o modo de período
  const handlePeriodModeChange = (mode: 'single' | 'range') => {
    setPeriodMode(mode)
    if (mode === 'single') {
      setEndMonth(startMonth)
    } else {
      // Se estava em single e virou range, colocar intervalo padrão de 3 meses se start === end
      if (startMonth === endMonth) {
        setStartMonth(monthShift(currentMonth, -2))
        setEndMonth(currentMonth)
      }
    }
  }

  // Se o usuário seleciona startMonth posterior a endMonth, ajusta endMonth
  const handleStartMonthChange = (val: string) => {
    setStartMonth(val)
    if (periodMode === 'single') {
      setEndMonth(val)
    } else if (val > endMonth) {
      setEndMonth(val)
    }
  }

  const handleEndMonthChange = (val: string) => {
    setEndMonth(val)
    if (val < startMonth) {
      setStartMonth(val)
    }
  }

  // Atalhos rápidos de intervalo
  const applyQuickRange = (monthsBack: number) => {
    setPeriodMode('range')
    setStartMonth(monthShift(currentMonth, -monthsBack + 1))
    setEndMonth(currentMonth)
  }

  // Construir relatório calculado
  const reportData: CashFlowReportData = useMemo(() => {
    const effectiveEnd = periodMode === 'single' ? startMonth : endMonth
    return buildCashFlowReport({
      startMonth,
      endMonth: effectiveEnd,
      regime,
      transactions,
      accounts,
      categories,
      payments,
    })
  }, [startMonth, endMonth, periodMode, regime, transactions, accounts, categories, payments])

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* Cabeçalho Superior da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Relatórios de Fluxo de Caixa
            </h1>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold">
              {regime === 'cash' ? 'Regime de Caixa' : 'Competência'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Acompanhe entradas, saídas, resultado operacional e evolução do saldo acumulado da
            família
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs font-bold gap-1.5 rounded-xl border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Controles: Período e Regime */}
      <Card className="p-4 sm:p-5 rounded-2xl border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Seletor de Modo de Período e Meses */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Período:
              </span>

              {/* Botões Mês Único / Intervalo */}
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => handlePeriodModeChange('single')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    periodMode === 'single'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mês Único
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodModeChange('range')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    periodMode === 'range'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Intervalo de Meses
                </button>
              </div>

              {/* Atalhos rápidos quando em intervalo */}
              {periodMode === 'range' && (
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => applyQuickRange(3)}
                    className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600 cursor-pointer"
                  >
                    3M
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickRange(6)}
                    className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600 cursor-pointer"
                  >
                    6M
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickRange(12)}
                    className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600 cursor-pointer"
                  >
                    12M
                  </button>
                </div>
              )}
            </div>

            {/* Selects de Mês */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pt-1">
              <div className="w-full sm:w-60">
                <Select value={startMonth} onValueChange={handleStartMonthChange}>
                  <SelectTrigger className="w-full h-10 rounded-xl border-slate-200 bg-white text-xs font-bold">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {periodMode === 'range' && (
                <>
                  <div className="text-slate-400 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4" />
                  </div>

                  <div className="w-full sm:w-60">
                    <Select value={endMonth} onValueChange={handleEndMonthChange}>
                      <SelectTrigger className="w-full h-10 rounded-xl border-slate-200 bg-white text-xs font-bold">
                        <SelectValue placeholder="Até o mês" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {monthOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Seletor de Regime: Competência vs Caixa */}
          <div className="space-y-2 lg:text-right">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
              Regime Financeiro:
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setRegime('cash')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  regime === 'cash'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Regime de Caixa: lançamentos entram pelo vencimento e parcelas pelo mês de desembolso"
              >
                Caixa (Desembolso)
              </button>
              <button
                type="button"
                onClick={() => setRegime('competence')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  regime === 'competence'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Regime de Competência: lançamentos entram pelo mês de compra pelo valor total"
              >
                Competência (Data Compra)
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {regime === 'cash'
                ? 'Valores batem com os desembolsos reais e parcelas do Painel'
                : 'Considera o valor total da compra na data de emissão'}
            </p>
          </div>
        </div>
      </Card>

      {/* Conteúdo Principal do Relatório */}
      {loading ? (
        <Card className="p-12 text-center rounded-2xl border-slate-200 space-y-3">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">
            Processando fluxo de caixa e encadeamento de saldos...
          </p>
        </Card>
      ) : (
        <>
          {/* 1. Cards de Resumo do Período */}
          <CashFlowSummaryCards report={reportData} />

          {/* 2. Gráficos de Entradas vs Saídas e Saldo Acumulado */}
          <CashFlowCharts summaries={reportData.monthlySummaries} />

          {/* 3. Tabela Mensal Detalhada (com versão Mobile em cards) */}
          <CashFlowMonthlyTable report={reportData} />

          {/* 4. Detalhamento por Plano de Contas (Subgrupos) e por Conta Bancária/Cartão */}
          <CashFlowBreakdownTabs report={reportData} />
        </>
      )}
    </div>
  )
}
