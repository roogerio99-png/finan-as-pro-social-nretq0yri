import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { FlowItemContributor } from '@/services/cashFlow'
import { Calendar, CreditCard, Tag, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const formatDateBR = (isoDate: string) => {
  if (!isoDate) return ''
  const parts = isoDate.split('-')
  if (parts.length < 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export interface CashFlowTransactionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  totalAmount: number
  type?: 'income' | 'expense' | 'net'
  items: FlowItemContributor[]
}

export const CashFlowTransactionsDialog: React.FC<CashFlowTransactionsDialogProps> = ({
  open,
  onOpenChange,
  title,
  subtitle,
  totalAmount,
  type = 'expense',
  items,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="space-y-1.5 border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
              {title}
            </DialogTitle>
            <Badge
              variant="secondary"
              className={`text-xs font-bold px-2.5 py-1 flex items-center gap-1 ${
                type === 'income'
                  ? 'bg-emerald-100 text-emerald-800'
                  : type === 'expense'
                    ? 'bg-rose-100 text-rose-800'
                    : totalAmount >= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
              }`}
            >
              {type === 'income' ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {brl.format(totalAmount)}
            </Badge>
          </div>
          {subtitle && (
            <DialogDescription className="text-xs text-slate-500">
              {subtitle} • {items.length} {items.length === 1 ? 'lançamento' : 'lançamentos'}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Lista de transações */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhum lançamento encontrado para este item no período.
            </div>
          ) : (
            items.map((item, idx) => {
              const isIncome = item.transaction.type === 'income'
              return (
                <div
                  key={`${item.transaction.id}-${idx}`}
                  className="p-3 sm:p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 break-words">
                        {item.transaction.description || 'Sem descrição'}
                      </span>
                      {item.installmentInfo && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
                          {item.installmentInfo}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        {formatDateBR(item.effectiveDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{item.accountName}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[140px]">{item.subgroupLabel}</span>
                      </span>
                    </div>

                    {item.transaction.notes && (
                      <p className="text-[10px] text-slate-400 italic line-clamp-1">
                        {item.transaction.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-xs sm:text-sm font-extrabold ${
                        isIncome ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {brl.format(item.effectiveAmount)}
                    </span>
                    {item.transaction.installments_total &&
                      item.transaction.installments_total > 1 && (
                        <p className="text-[10px] text-slate-400">
                          Total: {brl.format(item.transaction.amount)}
                        </p>
                      )}
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
