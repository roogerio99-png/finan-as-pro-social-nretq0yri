import React, { useMemo, useState } from 'react'
import { TransactionRecord, AccountRecord, CategoryRecord } from '@/types/finance'
import { isInstallmentTransaction, cashValueForMonth } from '@/services/installments'
import { Card, CardContent } from '@/components/ui/card'
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { DayTransactionsDialog } from './DayTransactionsDialog'

interface TransactionsCalendarViewProps {
  transactions: TransactionRecord[] // transações já filtradas ou do mês
  accounts: AccountRecord[]
  categories: CategoryRecord[]
  selectedMonth: string // YYYY-MM
  onMonthChange: (month: string) => void
  regime: 'competence' | 'cash'
  onEditTransaction: (tx: TransactionRecord) => void
  onDeleteTransaction?: (id: string) => void
}

interface DayCell {
  dateStr: string // YYYY-MM-DD
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  transactions: TransactionRecord[]
  totalIncome: number
  totalExpense: number
}

const WEEKDAYS = [
  { short: 'Dom', full: 'Domingo' },
  { short: 'Seg', full: 'Segunda' },
  { short: 'Ter', full: 'Terça' },
  { short: 'Qua', full: 'Quarta' },
  { short: 'Qui', full: 'Quinta' },
  { short: 'Sex', full: 'Sexta' },
  { short: 'Sáb', full: 'Sábado' },
]

export const TransactionsCalendarView: React.FC<TransactionsCalendarViewProps> = ({
  transactions,
  accounts,
  categories,
  selectedMonth,
  onMonthChange,
  regime,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)

  // Data de hoje em horário local (evita bug de timezone ao comparar com YYYY-MM-DD local)
  const todayStr = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  // Formato compacto para pílulas (ex: "R$ 150" ou "R$ 1,5k")
  const formatCompactCurrency = (val: number) => {
    if (Math.abs(val) >= 1000) {
      const formatted = (val / 1000).toFixed(1).replace('.', ',')
      return `R$ ${formatted}k`
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Deslocamento de mês (navegação rápida anterior / próximo)
  const shiftMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const newY = d.getFullYear()
    const newM = String(d.getMonth() + 1).padStart(2, '0')
    onMonthChange(`${newY}-${newM}`)
  }

  // Nome do mês formatado em PT-BR (ex: "Novembro de 2026")
  const monthName = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 1, 1)
    const formatted = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }, [selectedMonth])

  // Agrupamento de transações por dia (YYYY-MM-DD)
  // No regime de competência, usa tx.date (ou competence_month).
  // No regime de caixa, as transações exibidas na tela já estão filtradas para o mês.
  // Seu dia no calendário é o dia da transação original (se do mês) ou o dia 1 do mês de desembolso.
  const transactionsByDate = useMemo(() => {
    const map = new Map<string, TransactionRecord[]>()
    for (const tx of transactions) {
      let txDate = tx.date
      if (!txDate) {
        txDate = `${selectedMonth}-01`
      }
      // Se for regime caixa e a transação for de outro mês (compra parcelada anterior),
      // alocamos no dia de vencimento da conta no mês corrente, ou no dia 01
      if (regime === 'cash' && !txDate.startsWith(selectedMonth)) {
        const acc = accounts.find((a) => a.id === tx.account_id)
        const dueDay = acc?.due_day ? String(acc.due_day).padStart(2, '0') : '01'
        txDate = `${selectedMonth}-${dueDay}`
      }

      const list = map.get(txDate) || []
      list.push(tx)
      map.set(txDate, list)
    }
    return map
  }, [transactions, selectedMonth, regime, accounts])

  // Cálculo da grade de dias (7 colunas)
  const calendarCells = useMemo<DayCell[]>(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const firstDayOfMonth = new Date(year, month - 1, 1)
    const lastDayOfMonth = new Date(year, month, 0)
    const daysInMonth = lastDayOfMonth.getDate()

    // Dia da semana do 1º dia (0 = Domingo, 1 = Segunda, ...)
    const firstWeekday = firstDayOfMonth.getDay()

    // Dias do mês anterior para preencher a primeira semana
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate()

    const cells: DayCell[] = []

    // Dias do mês anterior
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i
      const prevD = new Date(year, month - 2, dayNum)
      const prevY = prevD.getFullYear()
      const prevM = String(prevD.getMonth() + 1).padStart(2, '0')
      const prevDay = String(prevD.getDate()).padStart(2, '0')
      const dateStr = `${prevY}-${prevM}-${prevDay}`
      const dayTxs = transactionsByDate.get(dateStr) || []
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        transactions: dayTxs,
        totalIncome: 0,
        totalExpense: 0,
      })
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`
      const dayTxs = transactionsByDate.get(dateStr) || []

      const totalIncome = dayTxs
        .filter((t) => t.type === 'income')
        .reduce(
          (acc, t) =>
            acc + (regime === 'cash' ? cashValueForMonth(t, selectedMonth, accounts) : t.amount),
          0,
        )

      const totalExpense = dayTxs
        .filter((t) => t.type === 'expense')
        .reduce(
          (acc, t) =>
            acc + (regime === 'cash' ? cashValueForMonth(t, selectedMonth, accounts) : t.amount),
          0,
        )

      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        transactions: dayTxs,
        totalIncome,
        totalExpense,
      })
    }

    // Dias do mês seguinte para completar até múltiplo de 7 (geralmente 35 ou 42)
    const remaining = 7 - (cells.length % 7)
    if (remaining < 7) {
      for (let day = 1; day <= remaining; day++) {
        const nextD = new Date(year, month, day)
        const nextY = nextD.getFullYear()
        const nextM = String(nextD.getMonth() + 1).padStart(2, '0')
        const nextDay = String(nextD.getDate()).padStart(2, '0')
        const dateStr = `${nextY}-${nextM}-${nextDay}`
        const dayTxs = transactionsByDate.get(dateStr) || []
        cells.push({
          dateStr,
          dayNumber: day,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          transactions: dayTxs,
          totalIncome: 0,
          totalExpense: 0,
        })
      }
    }

    return cells
  }, [selectedMonth, transactionsByDate, todayStr, regime, accounts])

  // Totais do mês para o rodapé/cabeçalho de conferência
  const monthTotals = useMemo(() => {
    let income = 0
    let expense = 0
    for (const tx of transactions) {
      const val = regime === 'cash' ? cashValueForMonth(tx, selectedMonth, accounts) : tx.amount
      if (tx.type === 'income') income += val
      if (tx.type === 'expense') expense += val
    }
    return {
      income,
      expense,
      balance: income - expense,
    }
  }, [transactions, selectedMonth, regime, accounts])

  const handleCellClick = (cell: DayCell) => {
    setSelectedDayDate(cell.dateStr)
    setDialogOpen(true)
  }

  const selectedDayTransactions = useMemo(() => {
    if (!selectedDayDate) return []
    return transactionsByDate.get(selectedDayDate) || []
  }, [selectedDayDate, transactionsByDate])

  return (
    <div className="space-y-4">
      {/* Barra de controle e totais do calendário */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900">
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>{monthName}</span>
            </div>
            <button
              onClick={() => shiftMonth(1)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-[11px] font-semibold text-slate-400 hidden md:inline">
            Regime: {regime === 'cash' ? 'Caixa' : 'Competência'}
          </span>
        </div>

        {/* Totais do mês compactos no calendário */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold flex-wrap">
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px] text-emerald-900 hidden xs:inline">Receitas:</span>
            <span>{formatCurrency(monthTotals.income)}</span>
          </div>

          <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-100">
            <TrendingDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="text-[11px] text-rose-900 hidden xs:inline">Despesas:</span>
            <span>{formatCurrency(monthTotals.expense)}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">
            <span className="text-[11px] text-slate-500 hidden xs:inline">Saldo:</span>
            <span
              className={
                monthTotals.balance > 0
                  ? 'text-emerald-700'
                  : monthTotals.balance < 0
                    ? 'text-rose-700'
                    : 'text-slate-700'
              }
            >
              {formatCurrency(monthTotals.balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Grade do Calendário */}
      <Card className="border-slate-200 shadow-xs rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-1.5 sm:p-4">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 mb-1 text-center">
            {WEEKDAYS.map((w, idx) => (
              <div
                key={w.short}
                className={`py-2 text-[11px] sm:text-xs font-black uppercase tracking-wider ${
                  idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                <span className="sm:hidden">{w.short.slice(0, 1)}</span>
                <span className="hidden sm:inline">{w.short}</span>
              </div>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarCells.map((cell) => {
              const txCount = cell.transactions.length
              const visibleTxs = cell.transactions.slice(0, 3)
              const remainingCount = txCount - visibleTxs.length

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => handleCellClick(cell)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleCellClick(cell)
                    }
                  }}
                  className={`min-h-[70px] sm:min-h-[110px] p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    cell.isCurrentMonth
                      ? cell.isToday
                        ? 'bg-emerald-50/40 border-emerald-400 shadow-xs'
                        : txCount > 0
                          ? 'bg-white hover:bg-slate-50/80 border-slate-200'
                          : 'bg-white/60 hover:bg-slate-50/50 border-slate-100'
                      : 'bg-slate-50/40 border-transparent opacity-40 hover:opacity-75'
                  }`}
                >
                  {/* Número do dia + badges de status */}
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`inline-flex items-center justify-center text-xs sm:text-sm font-extrabold w-5 h-5 sm:w-6 sm:h-6 rounded-full ${
                        cell.isToday
                          ? 'bg-emerald-600 text-white'
                          : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Indicador de total diário resumido (desktop) */}
                    {cell.isCurrentMonth && txCount > 0 && (
                      <span className="text-[10px] font-bold text-slate-400 hidden lg:inline">
                        {txCount} {txCount === 1 ? 'lanç.' : 'lanç.'}
                      </span>
                    )}

                    {/* Indicador de bolinha colorida no mobile quando há lançamentos */}
                    {txCount > 0 && (
                      <div className="flex items-center gap-0.5 sm:hidden">
                        {cell.totalIncome > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                        {cell.totalExpense > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pílulas de lançamentos (visíveis em desktop/tablet e compactas em mobile) */}
                  <div className="mt-1 space-y-1 flex-1 overflow-hidden">
                    {/* Versão Desktop / Tablet (sm:block) */}
                    <div className="hidden sm:block space-y-1">
                      {visibleTxs.map((tx) => {
                        const isIncome = tx.type === 'income'
                        const isExpense = tx.type === 'expense'
                        const displayAmount =
                          regime === 'cash' && isInstallmentTransaction(tx)
                            ? cashValueForMonth(tx, selectedMonth, accounts)
                            : tx.amount

                        return (
                          <div
                            key={tx.id}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate flex items-center justify-between gap-1 border ${
                              isIncome
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : isExpense
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                            title={`${tx.description} - ${formatCurrency(displayAmount)}`}
                          >
                            <span className="truncate">{tx.description}</span>
                            <span className="shrink-0 font-extrabold text-[9px]">
                              {formatCompactCurrency(displayAmount)}
                            </span>
                          </div>
                        )
                      })}

                      {remainingCount > 0 && (
                        <div className="text-[10px] font-bold text-slate-500 text-center py-0.5 bg-slate-100 rounded-md">
                          +{remainingCount} mais
                        </div>
                      )}
                    </div>

                    {/* Versão Mobile (sm:hidden): exibição super compacta com valores resumidos */}
                    <div className="sm:hidden flex flex-col justify-end space-y-0.5 h-full">
                      {cell.totalIncome > 0 && (
                        <div className="text-[9px] font-extrabold text-emerald-700 truncate">
                          +{formatCompactCurrency(cell.totalIncome)}
                        </div>
                      )}
                      {cell.totalExpense > 0 && (
                        <div className="text-[9px] font-extrabold text-rose-700 truncate">
                          -{formatCompactCurrency(cell.totalExpense)}
                        </div>
                      )}
                      {remainingCount > 0 && (
                        <div className="text-[8px] font-bold text-slate-400">{txCount} itens</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal detalhando os lançamentos do dia clicado */}
      <DayTransactionsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedDayDate || ''}
        transactions={selectedDayTransactions}
        accounts={accounts}
        categories={categories}
        regime={regime}
        selectedMonth={selectedMonth}
        onEdit={(tx) => {
          onEditTransaction(tx)
        }}
        onDelete={onDeleteTransaction}
      />
    </div>
  )
}
