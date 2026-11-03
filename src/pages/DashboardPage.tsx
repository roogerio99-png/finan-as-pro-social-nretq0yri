import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountsService } from '@/services/accounts'
import { transactionsService } from '@/services/transactions'
import { budgetsService } from '@/services/budgets'
import { microlearningPills, MicrolearningPill } from '@/services/microlearning'
import { cashValueForMonth } from '@/services/installments'
import { netCashForMonth, remainingFutureCommitted } from '@/services/invoicePayments'
import { InvoicePaymentsSection } from '@/components/dashboard/InvoicePaymentsSection'
import { paymentsService } from '@/services/payments'
import { categoriesService } from '@/services/categories'
import {
  AccountRecord,
  TransactionRecord,
  BudgetRecord,
  PaymentRecord,
  CategoryRecord,
} from '@/types/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EducationalPillCard } from '@/components/EducationalPillCard'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building,
  PlusCircle,
  ChevronRight,
  ShieldCheck,
  Scale,
} from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()

  // Mês de referência atual (YYYY-MM)
  const currentMonthStr = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr)
  const [regime, setRegime] = useState<'competence' | 'cash'>('competence')

  // Dados
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [budgets, setBudgets] = useState<BudgetRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [activePill, setActivePill] = useState<MicrolearningPill | null>(null)

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [accs, txs, bdgs, pmts, cats] = await Promise.all([
        accountsService.list(),
        transactionsService.list({ month: selectedMonth, regime }),
        budgetsService.list(selectedMonth),
        paymentsService.list(),
        categoriesService.list(),
      ])
      setAccounts(accs)
      setTransactions(txs)
      setBudgets(bdgs)
      setPayments(pmts)
      setCategories(cats)

      // Gatilho de Pílula Educativa
      evaluateEducationalTrigger(txs, bdgs)
    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [selectedMonth, regime])

  // Cálculos financeiros do mês.
  // Competência: valor cheio da transação. Caixa: parcela mensal de compras parceladas.
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0)

  const totalExpense =
    regime === 'cash'
      ? netCashForMonth(transactions, accounts, payments, selectedMonth)
      : transactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)

  const netBalance = totalIncome - totalExpense

  // Saldo geral em contas (contas ativas de saldo positivo, usando current_balance quando definido)
  const totalAvailableBalance = accounts
    .filter((a) => a.type !== 'credit_card' && a.status !== 'archived')
    .reduce((acc, a) => acc + (a.current_balance ?? a.initial_balance ?? 0), 0)

  // Sobra para faturas futuras: saldo das contas menos o caixa comprometido
  // nos próximos meses (parcelas que ainda vão desembolsar) — quitadas não contam.
  const committedFutureCash = remainingFutureCommitted(
    transactions,
    accounts,
    payments,
    selectedMonth,
  )
  // Cartões de crédito (fatura estimada para o mês)
  const creditCards = accounts.filter((a) => a.type === 'credit_card')

  // Pendências de conciliação
  const unreconciledCount = transactions.filter((t) => !t.is_reconciled).length

  // Três Indicadores de Saúde Financeira com Semáfora:
  // 1. Taxa de Poupança (Target: >= 20% verde, 10-19% amarelo, < 10% vermelho)
  const savingsRate =
    totalIncome > 0 ? Math.max(0, Math.round((netBalance / totalIncome) * 100)) : 0
  const savingsStatus = savingsRate >= 20 ? 'green' : savingsRate >= 10 ? 'yellow' : 'red'

  // 2. Reserva de Renda Fixa / Emergência (Meses de cobertura: saldo líquido / despesa média mensal)
  const monthsOfRunway =
    totalExpense > 0 ? Math.round((totalAvailableBalance / totalExpense) * 10) / 10 : 0
  const runwayStatus = monthsOfRunway >= 3 ? 'green' : monthsOfRunway >= 1 ? 'yellow' : 'red'

  // 3. Acurácia Orçamentária (evita somar duplamente grupo e subgrupo no teto total:
  // Se existirem metas de subgrupo, soma os subgrupos + grupos sem metas filhas; ou vice-versa).
  // Mais claro: agrupa por itens ativos.
  const groupBudgets = budgets.filter(
    (b) => budgetsService.resolveTargetType(b, categories) === 'group',
  )
  const subgroupBudgets = budgets.filter(
    (b) => budgetsService.resolveTargetType(b, categories) === 'subgroup',
  )

  // Identifica alertas de estouro específicos para cada meta (seja grupo ou subgrupo)
  const budgetAlerts = budgets.map((b) => {
    const isGroup = budgetsService.resolveTargetType(b, categories) === 'group'
    const spent = transactions
      .filter((t) => {
        if (t.type !== 'expense') return false
        const cat = t.expand?.category_id || categories.find((c) => c.id === t.category_id)
        if (isGroup) {
          return cat?.group_level1 === b.category_group
        }
        return cat?.group_level2 === b.category_group || cat?.name === b.category_group
      })
      .reduce((acc, t) => acc + t.amount, 0)

    const percent = b.limit_amount > 0 ? Math.round((spent / b.limit_amount) * 100) : 0
    const isWarning = percent >= (b.warning_threshold || 75) && percent < (b.danger_threshold || 90)
    const isDanger = percent >= (b.danger_threshold || 90)

    return {
      budget: b,
      isGroup,
      spent,
      percent,
      isWarning,
      isDanger,
      remaining: b.limit_amount - spent,
    }
  })

  const dangerAlerts = budgetAlerts.filter((a) => a.isDanger)
  const warningAlerts = budgetAlerts.filter((a) => a.isWarning)

  // Teto total do orçamento para o card global:
  // Se houver metas de grupo, o teto geral é a soma das metas de grupo + metas de subgrupos cujos grupos pai NÃO têm meta cadastrada.
  // Caso não haja metas de grupo, é a soma de todos os subgrupos.
  const totalBudgeted = (() => {
    if (budgets.length === 0) return 0
    if (groupBudgets.length === 0) {
      return subgroupBudgets.reduce((acc, b) => acc + b.limit_amount, 0)
    }
    // Soma grupos
    const groupSum = groupBudgets.reduce((acc, b) => acc + b.limit_amount, 0)
    // Para subgrupos, só soma se o grupo_level1 ao qual pertence NÃO tiver meta de grupo
    const standaloneSubgroupSum = subgroupBudgets
      .filter((sb) => {
        const cat = categories.find(
          (c) => c.group_level2 === sb.category_group || c.name === sb.category_group,
        )
        const parentGroup = cat?.group_level1
        return !parentGroup || !groupBudgets.some((gb) => gb.category_group === parentGroup)
      })
      .reduce((acc, b) => acc + b.limit_amount, 0)

    return groupSum + standaloneSubgroupSum
  })()

  const budgetRatio = totalBudgeted > 0 ? Math.round((totalExpense / totalBudgeted) * 100) : 0
  const budgetStatus =
    dangerAlerts.length > 0 || budgetRatio > 100
      ? 'red'
      : warningAlerts.length > 0 || budgetRatio > 90
        ? 'yellow'
        : 'green'

  const evaluateEducationalTrigger = (txs: TransactionRecord[], bdgs: BudgetRecord[]) => {
    // Se estourou orçamento geral ou tem alertas críticos
    const hasDanger = bdgs.some((b) => {
      // cálculo simplificado para trigger
      const spent = txs.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
      return b.limit_amount > 0 && spent / b.limit_amount >= 0.9
    })

    if ((totalBudgeted > 0 && totalExpense > totalBudgeted) || hasDanger) {
      setActivePill(microlearningPills.find((p) => p.trigger === 'overbudget') || null)
    } else if (netBalance > 500) {
      setActivePill(microlearningPills.find((p) => p.trigger === 'surplus') || null)
    } else {
      setActivePill(microlearningPills.find((p) => p.trigger === 'general') || null)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Top Header & Seletor de Mês e Regime */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Painel Financeiro
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Visão consolidada da sua saúde financeira com rigor e acolhimento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Seletor Regime Caixa vs Competência */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 w-full sm:w-auto justify-center sm:justify-start">
            <button
              onClick={() => setRegime('competence')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                regime === 'competence'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Registra despesas no mês do consumo"
            >
              Competência
            </button>
            <button
              onClick={() => setRegime('cash')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                regime === 'cash'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Registra despesas no mês do efetivo pagamento da fatura"
            >
              Caixa (Desembolso)
            </button>
          </div>

          {/* Seletor de Mês */}
          <div className="flex items-center space-x-2 flex-1 sm:flex-initial">
            <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 w-full"
            />
          </div>

          <Button
            size="sm"
            onClick={() => navigate('/lancamentos')}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-xl shadow-xs h-10 font-bold"
          >
            <PlusCircle className="w-4 h-4" /> Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Alerta de Conciliação Pendente */}
      {unreconciledCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                Você tem {unreconciledCount} lançamento{unreconciledCount > 1 ? 's' : ''} pendente
                {unreconciledCount > 1 ? 's' : ''} de conciliação
              </h4>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Importe seu extrato bancário ou marque os itens conferidos para manter a fidelidade
                dos saldos.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/conciliacao')}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 rounded-xl flex-shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" /> Conciliar Agora
          </Button>
        </div>
      )}

      {/* Alertas de Metas Orçamentárias (Grupos ou Subgrupos com Atenção ou Estouro) */}
      {(dangerAlerts.length > 0 || warningAlerts.length > 0) && (
        <div className="space-y-2">
          {dangerAlerts.map((alert) => (
            <div
              key={alert.budget.id}
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">
                    Estouro de Meta: {alert.budget.category_group} (
                    {alert.isGroup ? 'Grupo Principal' : 'Subgrupo'})
                  </h4>
                  <p className="text-xs text-rose-800/90 mt-0.5">
                    Consumido {formatCurrency(alert.spent)} de{' '}
                    {formatCurrency(alert.budget.limit_amount)} ({alert.percent}% do teto definido
                    para {selectedMonth}).
                    {alert.remaining < 0 &&
                      ` Estouro de ${formatCurrency(Math.abs(alert.remaining))}.`}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/orcamento')}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 rounded-xl flex-shrink-0"
              >
                Ver no Orçamento
              </Button>
            </div>
          ))}

          {warningAlerts.map((alert) => (
            <div
              key={alert.budget.id}
              className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">
                    Atenção ao Teto: {alert.budget.category_group} (
                    {alert.isGroup ? 'Grupo Principal' : 'Subgrupo'})
                  </h4>
                  <p className="text-xs text-amber-800/90 mt-0.5">
                    Já consumiu {alert.percent}% do teto ({formatCurrency(alert.spent)} de{' '}
                    {formatCurrency(alert.budget.limit_amount)}). Restam apenas{' '}
                    {formatCurrency(alert.remaining)}.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/orcamento')}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 rounded-xl flex-shrink-0"
              >
                Ajustar Orçamento
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Cards de Saldo e Fluxo de Caixa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Disponível */}
        <Card className="border-slate-200 shadow-xs rounded-2xl">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Saldo Líquido em Contas
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(totalAvailableBalance)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Building className="w-3.5 h-3.5" />{' '}
              {accounts.filter((a) => a.type !== 'credit_card').length} contas cadastradas
            </p>
            {committedFutureCash > 0 && (
              <p className="text-[11px] font-semibold text-purple-700 mt-1.5">
                {formatCurrency(committedFutureCash)} já comprometidos em parcelas futuras (12
                meses)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Receitas do Mês */}
        <Card className="border-slate-200 shadow-xs rounded-2xl">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Receitas ({selectedMonth})
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-emerald-600">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Entradas contabilizadas</p>
          </CardContent>
        </Card>

        {/* Despesas do Mês */}
        <Card className="border-slate-200 shadow-xs rounded-2xl">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Despesas ({selectedMonth})
              </span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-rose-600">{formatCurrency(totalExpense)}</div>
            <p className="text-xs text-slate-500 mt-1">
              Regime: {regime === 'competence' ? 'Competência' : 'Caixa'}
            </p>
          </CardContent>
        </Card>

        {/* Saldo do Mês (Sobra / Déficit) */}
        <Card className="border-slate-200 shadow-xs rounded-2xl">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Resultado Mensal
              </span>
              <div
                className={`p-2 rounded-xl ${netBalance >= 0 ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'}`}
              >
                <Scale className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div
              className={`text-2xl font-black ${netBalance >= 0 ? 'text-teal-700' : 'text-rose-600'}`}
            >
              {formatCurrency(netBalance)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {netBalance >= 0 ? 'Sobra disponível para aporte' : 'Déficit que exige atenção'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Três Indicadores de Saúde Financeira com Semáfora */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Três Indicadores de Saúde Financeira
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Semáforo: Verde (Saudável), Amarelo (Atenção), Vermelho (Crítico)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Indicador 1: Taxa de Poupança */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Taxa de Poupança
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    savingsStatus === 'green'
                      ? 'bg-emerald-100 text-emerald-800'
                      : savingsStatus === 'yellow'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {savingsRate}% da Renda
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                {savingsStatus === 'green' && 'Excelente Poupança'}
                {savingsStatus === 'yellow' && 'Margem Estreita'}
                {savingsStatus === 'red' && 'Consumo Superior'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {savingsStatus === 'green' &&
                  'Você está guardando mais de 20% das receitas, o padrão ouro do enriquecimento consciente.'}
                {savingsStatus === 'yellow' &&
                  'Você está entre 10% e 19%. Vale revisar pequenas despesas para atingir 20%.'}
                {savingsStatus === 'red' &&
                  'Menos de 10% ou no negativo. Atenção para não entrar em endividamento rotativo.'}
              </p>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full mt-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  savingsStatus === 'green'
                    ? 'bg-emerald-500'
                    : savingsStatus === 'yellow'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, savingsRate))}%` }}
              />
            </div>
          </div>

          {/* Indicador 2: Meses de Renda Fixa / Reserva */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Reserva de Liquidez
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    runwayStatus === 'green'
                      ? 'bg-emerald-100 text-emerald-800'
                      : runwayStatus === 'yellow'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {monthsOfRunway} Meses
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                {runwayStatus === 'green' && 'Proteção Sólida'}
                {runwayStatus === 'yellow' && 'Proteção Mínima'}
                {runwayStatus === 'red' && 'Vulnerabilidade Alta'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {runwayStatus === 'green' &&
                  'Seus saldos cobrem mais de 3 meses do seu custo de vida atual sem depender de nova renda.'}
                {runwayStatus === 'yellow' &&
                  'Sua reserva cobre entre 1 e 3 meses. Continue fortalecendo seu colchão financeiro.'}
                {runwayStatus === 'red' &&
                  'Menos de 1 mês de cobertura. Prioridade máxima: criar sua reserva de emergência.'}
              </p>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full mt-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  runwayStatus === 'green'
                    ? 'bg-emerald-500'
                    : runwayStatus === 'yellow'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, (monthsOfRunway / 6) * 100)}%` }}
              />
            </div>
          </div>

          {/* Indicador 3: Acurácia Orçamentária */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  3. Acurácia Orçamentária
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    budgetStatus === 'green'
                      ? 'bg-emerald-100 text-emerald-800'
                      : budgetStatus === 'yellow'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {budgetRatio}% Consumido
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                {budgetStatus === 'green' && 'Dentro da Meta'}
                {budgetStatus === 'yellow' && 'Próximo do Teto'}
                {budgetStatus === 'red' && 'Estouro do Teto'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {totalBudgeted === 0 &&
                  'Cadastre suas metas na aba Orçamento para monitorar seus tetos por subgrupo.'}
                {totalBudgeted > 0 &&
                  budgetStatus === 'green' &&
                  'Gastos controlados dentro dos 90% do teto planejado.'}
                {totalBudgeted > 0 &&
                  budgetStatus === 'yellow' &&
                  'Você atingiu entre 90% e 100% do teto. Modere gastos discricionários.'}
                {totalBudgeted > 0 &&
                  budgetStatus === 'red' &&
                  'Orçamento ultrapassado. Veja na aba Orçamento onde cortar sem culpa.'}
              </p>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full mt-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetStatus === 'green'
                    ? 'bg-emerald-500'
                    : budgetStatus === 'yellow'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, budgetRatio)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pílula Educativa Contextual */}
      {activePill && (
        <EducationalPillCard pill={activePill} onDismiss={() => setActivePill(null)} />
      )}

      {/* Parcelas & Faturas do Mês — marcar pagamento (data + banco) no regime caixa */}
      {regime === 'cash' && (
        <InvoicePaymentsSection
          transactions={transactions}
          accounts={accounts}
          month={selectedMonth}
          regime={regime}
          onPaymentsChanged={loadDashboardData}
        />
      )}

      {/* Seção Cartões de Crédito e Faturas */}
      {creditCards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Cartões de Crédito & Faturas
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Controle de Fechamento e Desembolso
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {creditCards.map((card) => {
              // Fatura do mês: em competência, o valor TOTAL das compras do mês
              // (parcelado entra inteiro); em caixa, apenas as parcelas do mês.
              const cardExpenses = transactions
                .filter((t) => t.account_id === card.id && t.type === 'expense')
                .reduce(
                  (acc, t) =>
                    acc +
                    (regime === 'competence'
                      ? t.amount
                      : cashValueForMonth(t, selectedMonth, accounts)),
                  0,
                )

              const availableLimit = (card.credit_limit || 0) - cardExpenses
              const limitUsedPercent = card.credit_limit
                ? Math.min(100, Math.round((cardExpenses / card.credit_limit) * 100))
                : 0

              return (
                <div
                  key={card.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{card.name}</h4>
                      <p className="text-xs text-slate-500">
                        Fecha dia {card.closing_day || '--'} • Vence dia {card.due_day || '--'}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
                      Fatura: {formatCurrency(cardExpenses)}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                      <span>Limite Usado ({limitUsedPercent}%)</span>
                      <span>Disponível: {formatCurrency(Math.max(0, availableLimit))}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          limitUsedPercent > 80
                            ? 'bg-rose-500'
                            : limitUsedPercent > 50
                              ? 'bg-amber-500'
                              : 'bg-purple-600'
                        }`}
                        style={{ width: `${limitUsedPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Atalhos Rápidos para Outras Ferramentas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/orcamento')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-500 hover:shadow-xs transition-all text-left flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-bold text-emerald-700 block">Metas Orçamentárias</span>
            <span className="text-sm font-bold text-slate-900">
              Termômetros com Alertas 75% e 90%
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
        </button>

        <button
          onClick={() => navigate('/dividas')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-500 hover:shadow-xs transition-all text-left flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-bold text-rose-700 block">Quitação de Dívidas</span>
            <span className="text-sm font-bold text-slate-900">Bola de Neve vs. Avalanche</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-rose-600 transition-colors" />
        </button>

        <button
          onClick={() => navigate('/sonhos')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-500 hover:shadow-xs transition-all text-left flex items-center justify-between group"
        >
          <div>
            <span className="text-xs font-bold text-teal-700 block">Metas & Sonhos</span>
            <span className="text-sm font-bold text-slate-900">
              Tradutor Comportamental de Cortes
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition-colors" />
        </button>
      </div>
    </div>
  )
}
