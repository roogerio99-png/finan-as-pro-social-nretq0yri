import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TransactionRecord, AccountRecord, CategoryRecord, TransactionType } from '@/types/finance'
import { isInstallmentTransaction, cashValueForMonth } from '@/services/installments'
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Receipt,
  CreditCard,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react'

interface DayTransactionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string // YYYY-MM-DD
  transactions: TransactionRecord[]
  accounts: AccountRecord[]
  categories: CategoryRecord[]
  regime: 'competence' | 'cash'
  selectedMonth: string
  onEdit: (tx: TransactionRecord) => void
  onDelete?: (id: string) => void
}

export const DayTransactionsDialog: React.FC<DayTransactionsDialogProps> = ({
  open,
  onOpenChange,
  date,
  transactions,
  accounts,
  categories,
  regime,
  selectedMonth,
  onEdit,
  onDelete,
}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const formatDayTitle = (dateStr: string) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length !== 3) return dateStr
    const [y, m, d] = parts
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(dateObj)
    return `${d}/${m}/${y} • ${weekday.charAt(0).toUpperCase() + weekday.slice(1)}`
  }

  const renderTypeBadge = (t: TransactionType) => {
    switch (t) {
      case 'income':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <TrendingUp className="w-3 h-3 text-emerald-600" /> Receita
          </span>
        )
      case 'expense':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <TrendingDown className="w-3 h-3 text-rose-600" /> Despesa
          </span>
        )
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <ArrowRightLeft className="w-3 h-3 text-blue-600" /> Transferência
          </span>
        )
      case 'invoice_payment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Receipt className="w-3 h-3 text-purple-600" /> Pagamento de Fatura
          </span>
        )
    }
  }

  // Totais do dia
  const dayIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce(
      (acc, t) =>
        acc + (regime === 'cash' ? cashValueForMonth(t, selectedMonth, accounts) : t.amount),
      0,
    )

  const dayExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce(
      (acc, t) =>
        acc + (regime === 'cash' ? cashValueForMonth(t, selectedMonth, accounts) : t.amount),
      0,
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-5 sm:p-6 rounded-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="text-left pb-2 border-b border-slate-100">
          <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
            {formatDayTitle(date)}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {transactions.length === 0
              ? 'Nenhum lançamento registrado neste dia.'
              : `${transactions.length} lançamento(s) registrado(s) no regime de ${
                  regime === 'cash' ? 'Caixa' : 'Competência'
                }.`}
          </DialogDescription>

          {transactions.length > 0 && (
            <div className="flex items-center gap-3 pt-2 text-xs font-semibold">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                + {formatCurrency(dayIncome)}
              </span>
              <span className="text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                - {formatCurrency(dayExpense)}
              </span>
              <span className="text-slate-700 bg-slate-100 px-2 py-1 rounded-lg font-bold">
                Saldo: {formatCurrency(dayIncome - dayExpense)}
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="overflow-y-auto space-y-3 py-2 pr-1">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Nenhum lançamento neste dia.
            </div>
          ) : (
            transactions.map((tx) => {
              const isExpense = tx.type === 'expense'
              const isIncome = tx.type === 'income'
              const isNeutral = tx.type === 'transfer' || tx.type === 'invoice_payment'
              const account = tx.expand?.account_id || accounts.find((a) => a.id === tx.account_id)
              const targetAcc = accounts.find((a) => a.id === tx.transfer_account_id)
              const category =
                tx.expand?.category_id || categories.find((c) => c.id === tx.category_id)

              const displayAmount =
                regime === 'cash' && isInstallmentTransaction(tx)
                  ? cashValueForMonth(tx, selectedMonth, accounts)
                  : tx.amount

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderTypeBadge(tx.type)}
                        {category && !isNeutral && (
                          <span className="text-[11px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-[170px]">
                            {category.code ? `${category.code} ` : ''}
                            {category.name}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug break-words">
                        {tx.description}
                      </h4>
                      {category &&
                        !isNeutral &&
                        (category.group_level1 || category.group_level2) && (
                          <div className="text-[10px] text-slate-400">
                            {category.group_code ? `${category.group_code} ` : ''}
                            {category.group_level1}
                            {category.group_level2 ? ` • ${category.group_level2}` : ''}
                          </div>
                        )}
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm sm:text-base font-black ${
                          isIncome
                            ? 'text-emerald-600'
                            : isExpense
                              ? 'text-rose-600'
                              : 'text-slate-700'
                        }`}
                      >
                        {isIncome ? '+ ' : isExpense ? '- ' : ''}
                        {formatCurrency(displayAmount)}
                      </div>
                      {regime === 'cash' && isInstallmentTransaction(tx) && (
                        <div className="text-[10px] text-purple-600 font-semibold">
                          (de {formatCurrency(tx.amount)})
                        </div>
                      )}
                    </div>
                  </div>

                  {tx.notes && (
                    <p className="text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                      {tx.notes}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-[11px]">
                        {account?.type === 'credit_card' ? (
                          <CreditCard className="w-3 h-3 text-purple-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-slate-500" />
                        )}
                        <span className="max-w-[120px] truncate">{account?.name || 'Conta'}</span>
                        {tx.type === 'transfer' && targetAcc && (
                          <span className="text-blue-700 font-bold">→ {targetAcc.name}</span>
                        )}
                      </span>

                      {isInstallmentTransaction(tx) && (
                        <span className="px-1.5 py-0.5 rounded font-bold bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">
                          {tx.installments_total}x
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onOpenChange(false)
                          onEdit(tx)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                        title="Editar lançamento"
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => {
                            onDelete(tx.id)
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
