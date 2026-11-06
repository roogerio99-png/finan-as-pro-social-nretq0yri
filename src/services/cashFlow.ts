import { AccountRecord, CategoryRecord, PaymentRecord, TransactionRecord } from '@/types/finance'
import { cashValueForMonth, installmentIndexOfMonth, monthShift } from '@/services/installments'

export type CashFlowRegime = 'competence' | 'cash'

export interface MonthFlowSummary {
  month: string // YYYY-MM
  label: string // Ex: "Jan 2026"
  income: number
  expense: number
  net: number // income - expense
  openingBalance: number // saldo inicial no início do mês
  closingBalance: number // saldo final acumulado no fim do mês
  transactionsCount: number
}

export interface FlowItemContributor {
  transaction: TransactionRecord
  effectiveAmount: number
  effectiveDate: string
  installmentInfo?: string
  accountName: string
  categoryName: string
  subgroupLabel: string
}

export interface SubgroupBreakdownItem {
  key: string
  groupCode?: string
  code?: string
  groupName: string
  subgroupName: string
  displayLabel: string // "1.3 Concessionárias e Utilidades"
  type: 'income' | 'expense'
  total: number
  percentage: number // dentro de income ou expense
  items: FlowItemContributor[]
}

export interface AccountBreakdownItem {
  accountId: string
  accountName: string
  accountType: string
  color?: string
  income: number
  expense: number
  net: number
  items: FlowItemContributor[]
}

export interface CashFlowReportData {
  regime: CashFlowRegime
  startMonth: string
  endMonth: string
  monthsList: string[]
  // Saldo inicial anterior ao período selecionado
  initialOpeningBalance: number
  // Totais do período
  totalIncome: number
  totalExpense: number
  totalNet: number
  finalClosingBalance: number
  // Mensal detalhado
  monthlySummaries: MonthFlowSummary[]
  // Detalhamento por subgrupo do plano de contas
  incomeSubgroups: SubgroupBreakdownItem[]
  expenseSubgroups: SubgroupBreakdownItem[]
  // Detalhamento por conta
  accountBreakdowns: AccountBreakdownItem[]
}

export const formatMonthLabel = (monthIso: string): string => {
  if (!monthIso || !monthIso.includes('-')) return monthIso
  const [yearStr, monthStr] = monthIso.split('-')
  const m = parseInt(monthStr, 10)
  const monthNames = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]
  const name = monthNames[m - 1] || monthStr
  return `${name}/${yearStr.slice(2)}`
}

export const formatMonthFull = (monthIso: string): string => {
  if (!monthIso || !monthIso.includes('-')) return monthIso
  const [yearStr, monthStr] = monthIso.split('-')
  const m = parseInt(monthStr, 10)
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  const name = monthNames[m - 1] || monthStr
  return `${name} de ${yearStr}`
}

/**
 * Gera lista de meses 'YYYY-MM' entre startMonth e endMonth inclusive.
 */
export const generateMonthsRange = (startMonth: string, endMonth: string): string[] => {
  if (!startMonth || !endMonth) return [startMonth || endMonth]
  let cur = startMonth <= endMonth ? startMonth : endMonth
  const target = startMonth <= endMonth ? endMonth : startMonth
  const list: string[] = []

  // Segurança para evitar loops infinitos (máximo 120 meses / 10 anos)
  let steps = 0
  while (cur <= target && steps < 120) {
    list.push(cur)
    if (cur === target) break
    cur = monthShift(cur, 1)
    steps++
  }
  return list
}

/**
 * Determina a contribuição de valor e data de uma transação para um determinado mês sob o regime especificado.
 * Retorna null se a transação não gerar fluxo no mês `month`.
 */
export const getTransactionContributionForMonth = (
  tx: TransactionRecord,
  month: string,
  regime: CashFlowRegime,
  accounts: AccountRecord[],
  payments: PaymentRecord[],
): { amount: number; installmentInfo?: string } | null => {
  // Transferências entre contas e pagamentos de fatura não são fluxo primário de receita/despesa
  if (tx.type === 'transfer' || tx.type === 'invoice_payment') return null

  if (regime === 'competence') {
    // Competência: transação entra pelo competence_month pelo valor total
    const txMonth = tx.competence_month || tx.date.slice(0, 7)
    if (txMonth !== month) return null
    return { amount: tx.amount }
  }

  // Regime de Caixa:
  if (tx.type === 'income') {
    const txCashMonth = tx.cash_month || tx.date.slice(0, 7)
    if (txCashMonth !== month) return null
    return { amount: tx.amount }
  }

  if (tx.type === 'expense') {
    const value = cashValueForMonth(tx, month, accounts)
    if (value <= 0) return null

    const index = installmentIndexOfMonth(tx, month, accounts)
    const isPaid =
      index > 0 &&
      payments.some(
        (p) =>
          p.source_transaction_id === tx.id &&
          p.installment_index === index &&
          p.cash_month === month,
      )

    // Se a parcela já foi quitada via payments, no Painel netCashForMonth ela é descontada do desembolso pendente da fatura,
    // mas num relatório de fluxo de caixa realizado vs orçado, devemos checar se ela foi paga.
    // Para manter fidelidade EXATA ao Painel:
    // netCashForMonth ignora a despesa se index > 0 && alreadyPaid.
    if (index > 0 && isPaid) {
      return null
    }

    const installmentInfo =
      index > 0 && tx.installments_total && tx.installments_total > 1
        ? `Parcela ${index}/${tx.installments_total}`
        : undefined

    return { amount: value, installmentInfo }
  }

  return null
}

/**
 * Calcula o saldo inicial no início de `startMonth`.
 * Estratégia:
 * 1. Base: soma dos initial_balance de todas as contas ativas de saldo positivo (não-cartão).
 * 2. Adiciona o líquido (receitas - despesas) de todos os meses anteriores a `startMonth`.
 * Dessa forma, o saldo acumulado encadeia corretamente desde o início dos registros.
 */
export const computeOpeningBalanceBefore = (
  startMonth: string,
  regime: CashFlowRegime,
  allTransactions: TransactionRecord[],
  accounts: AccountRecord[],
  payments: PaymentRecord[],
): number => {
  // Saldo inicial base cadastrado nas contas bancárias / carteiras
  const baseInitial = accounts
    .filter((a) => a.type !== 'credit_card' && a.status !== 'archived')
    .reduce((acc, a) => acc + (a.initial_balance || 0), 0)

  // Descobrir qual o mês mais antigo registrado para iterar
  let minMonth = startMonth
  for (const tx of allTransactions) {
    const m =
      regime === 'competence'
        ? tx.competence_month || tx.date.slice(0, 7)
        : tx.cash_month || tx.date.slice(0, 7)
    if (m && m < minMonth) {
      minMonth = m
    }
  }

  if (minMonth >= startMonth) {
    return Math.round(baseInitial * 100) / 100
  }

  // Iterar mês a mês até o mês anterior a startMonth
  const priorMonths = generateMonthsRange(minMonth, monthShift(startMonth, -1))
  let historicalNet = 0

  for (const m of priorMonths) {
    for (const tx of allTransactions) {
      const contrib = getTransactionContributionForMonth(tx, m, regime, accounts, payments)
      if (contrib && contrib.amount > 0) {
        if (tx.type === 'income') {
          historicalNet += contrib.amount
        } else if (tx.type === 'expense') {
          historicalNet -= contrib.amount
        }
      }
    }
  }

  return Math.round((baseInitial + historicalNet) * 100) / 100
}

/**
 * Constrói o relatório completo de fluxo de caixa para o intervalo [startMonth, endMonth].
 */
export const buildCashFlowReport = (params: {
  startMonth: string
  endMonth: string
  regime: CashFlowRegime
  transactions: TransactionRecord[]
  accounts: AccountRecord[]
  categories: CategoryRecord[]
  payments: PaymentRecord[]
}): CashFlowReportData => {
  const { startMonth, endMonth, regime, transactions, accounts, categories, payments } = params

  const monthsList = generateMonthsRange(startMonth, endMonth)
  const initialOpeningBalance = computeOpeningBalanceBefore(
    startMonth,
    regime,
    transactions,
    accounts,
    payments,
  )

  let runningBalance = initialOpeningBalance
  const monthlySummaries: MonthFlowSummary[] = []

  let totalIncome = 0
  let totalExpense = 0

  // Mapas para detalhamento acumulado do período
  const subgroupMap = new Map<
    string,
    {
      groupCode?: string
      code?: string
      groupName: string
      subgroupName: string
      type: 'income' | 'expense'
      total: number
      items: FlowItemContributor[]
    }
  >()

  const accountMap = new Map<
    string,
    {
      account: AccountRecord
      income: number
      expense: number
      items: FlowItemContributor[]
    }
  >()

  // Inicializar todas as contas conhecidas no mapa
  for (const acc of accounts) {
    accountMap.set(acc.id, {
      account: acc,
      income: 0,
      expense: 0,
      items: [],
    })
  }

  // Iterar mês a mês do intervalo
  for (const month of monthsList) {
    let mIncome = 0
    let mExpense = 0
    let mCount = 0

    const monthOpening = runningBalance

    for (const tx of transactions) {
      const contrib = getTransactionContributionForMonth(tx, month, regime, accounts, payments)
      if (!contrib || contrib.amount <= 0) continue

      mCount++
      const effectiveAmount = Math.round(contrib.amount * 100) / 100

      // Encontrar conta e categoria
      const acc = accounts.find((a) => a.id === tx.account_id)
      const cat = tx.expand?.category_id || categories.find((c) => c.id === tx.category_id)

      const accountName = acc?.name || 'Conta não identificada'
      const categoryName = cat?.name || 'Sem categoria'
      const groupName = cat?.group_level1 || 'Outros'
      const subgroupName = cat?.group_level2 || cat?.name || 'Geral'
      const code = cat?.code
      const groupCode = cat?.group_code

      let subgroupLabel = subgroupName
      if (code) {
        subgroupLabel = `${code} ${subgroupName}`
      } else if (groupCode) {
        subgroupLabel = `${groupCode} ${subgroupName}`
      }

      const contributor: FlowItemContributor = {
        transaction: tx,
        effectiveAmount,
        effectiveDate: regime === 'competence' ? tx.date : `${month}-${tx.date.slice(8, 10)}`,
        installmentInfo: contrib.installmentInfo,
        accountName,
        categoryName,
        subgroupLabel,
      }

      if (tx.type === 'income') {
        mIncome += effectiveAmount
        totalIncome += effectiveAmount
      } else if (tx.type === 'expense') {
        mExpense += effectiveAmount
        totalExpense += effectiveAmount
      }

      // Acumular no mapa de subgrupos
      const subKey = `${tx.type}:${groupName}:${subgroupName}`
      let subEntry = subgroupMap.get(subKey)
      if (!subEntry) {
        subEntry = {
          groupCode,
          code,
          groupName,
          subgroupName,
          type: tx.type === 'income' ? 'income' : 'expense',
          total: 0,
          items: [],
        }
        subgroupMap.set(subKey, subEntry)
      }
      subEntry.total = Math.round((subEntry.total + effectiveAmount) * 100) / 100
      subEntry.items.push(contributor)

      // Acumular no mapa de contas
      if (tx.account_id) {
        let accEntry = accountMap.get(tx.account_id)
        if (!accEntry) {
          const fallbackAcc: AccountRecord = acc || {
            id: tx.account_id,
            user_id: tx.user_id,
            name: accountName,
            type: 'checking',
            initial_balance: 0,
            created: '',
            updated: '',
          }
          accEntry = {
            account: fallbackAcc,
            income: 0,
            expense: 0,
            items: [],
          }
          accountMap.set(tx.account_id, accEntry)
        }
        if (tx.type === 'income') {
          accEntry.income = Math.round((accEntry.income + effectiveAmount) * 100) / 100
        } else if (tx.type === 'expense') {
          accEntry.expense = Math.round((accEntry.expense + effectiveAmount) * 100) / 100
        }
        accEntry.items.push(contributor)
      }
    }

    mIncome = Math.round(mIncome * 100) / 100
    mExpense = Math.round(mExpense * 100) / 100
    const mNet = Math.round((mIncome - mExpense) * 100) / 100
    const mClosing = Math.round((monthOpening + mNet) * 100) / 100
    runningBalance = mClosing

    monthlySummaries.push({
      month,
      label: formatMonthLabel(month),
      income: mIncome,
      expense: mExpense,
      net: mNet,
      openingBalance: monthOpening,
      closingBalance: mClosing,
      transactionsCount: mCount,
    })
  }

  totalIncome = Math.round(totalIncome * 100) / 100
  totalExpense = Math.round(totalExpense * 100) / 100
  const totalNet = Math.round((totalIncome - totalExpense) * 100) / 100
  const finalClosingBalance = runningBalance

  // Organizar subgrupos de Receita e Despesa
  const allSubgroupItems = Array.from(subgroupMap.entries()).map(([key, val]) => {
    const parentTotal = val.type === 'income' ? totalIncome : totalExpense
    const percentage = parentTotal > 0 ? Math.round((val.total / parentTotal) * 1000) / 10 : 0
    let displayLabel = val.subgroupName
    if (val.code) {
      displayLabel = `${val.code} ${val.subgroupName}`
    } else if (val.groupCode) {
      displayLabel = `${val.groupCode} ${val.subgroupName}`
    }

    return {
      key,
      groupCode: val.groupCode,
      code: val.code,
      groupName: val.groupName,
      subgroupName: val.subgroupName,
      displayLabel,
      type: val.type,
      total: val.total,
      percentage,
      items: val.items.sort((a, b) => b.effectiveAmount - a.effectiveAmount),
    } satisfies SubgroupBreakdownItem
  })

  const incomeSubgroups = allSubgroupItems
    .filter((s) => s.type === 'income' && s.total > 0)
    .sort((a, b) => b.total - a.total)

  const expenseSubgroups = allSubgroupItems
    .filter((s) => s.type === 'expense' && s.total > 0)
    .sort((a, b) => b.total - a.total)

  // Organizar contas
  const accountBreakdowns: AccountBreakdownItem[] = Array.from(accountMap.values())
    .filter((a) => a.income > 0 || a.expense > 0 || a.items.length > 0)
    .map((a) => ({
      accountId: a.account.id,
      accountName: a.account.name,
      accountType: a.account.type,
      color: a.account.color,
      income: a.income,
      expense: a.expense,
      net: Math.round((a.income - a.expense) * 100) / 100,
      items: a.items.sort((x, y) => y.effectiveAmount - x.effectiveAmount),
    }))
    .sort((a, b) => Math.abs(b.expense) + b.income - (Math.abs(a.expense) + a.income))

  return {
    regime,
    startMonth,
    endMonth,
    monthsList,
    initialOpeningBalance,
    totalIncome,
    totalExpense,
    totalNet,
    finalClosingBalance,
    monthlySummaries,
    incomeSubgroups,
    expenseSubgroups,
    accountBreakdowns,
  }
}
