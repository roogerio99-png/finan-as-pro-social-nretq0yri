import React from 'react'
import { InvoiceRecord, InvoiceItemEntry } from '@/types/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Undo2 } from 'lucide-react'

interface InvoiceCardProps {
  invoice: InvoiceRecord
  onPay: (invoice: InvoiceRecord) => void
  onUndo: (invoice: InvoiceRecord) => void
  formatCurrency: (val: number) => string
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  onPay,
  onUndo,
  formatCurrency,
}) => {
  const isPaid = invoice.status === 'paid'
  const paymentAccount = invoice.expand?.payment_account_id

  const parseInvoiceItems = (itemsJson?: any): InvoiceItemEntry[] => {
    if (!itemsJson) return []
    if (Array.isArray(itemsJson)) return itemsJson
    try {
      const parsed = JSON.parse(itemsJson)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const items = parseInvoiceItems(invoice.items)

  return (
    <Card
      className={`border-slate-200 shadow-xs rounded-2xl bg-white overflow-hidden transition-all ${
        isPaid ? 'border-emerald-200' : 'border-purple-200'
      }`}
    >
      <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <CardTitle className="text-lg font-black text-slate-900">
              Fatura {invoice.reference_month}
            </CardTitle>
            <Badge
              className={
                isPaid
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200'
              }
              variant="outline"
            >
              {isPaid ? (
                <span className="flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Paga em {invoice.paid_date}
                  {paymentAccount ? ` • ${paymentAccount.name}` : ''}
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Aberta
                </span>
              )}
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-500">
            {items.length} lançamento(s) conciliado(s) • Total da fatura:{' '}
            <strong className="text-slate-900">{formatCurrency(invoice.total_amount || 0)}</strong>
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {!isPaid ? (
            <Button
              size="sm"
              onClick={() => onPay(invoice)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" /> Informar Pagamento
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUndo(invoice)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold text-xs gap-1.5 rounded-xl"
            >
              <Undo2 className="w-4 h-4" /> Desfazer Pagamento
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Compras e Parcelas Agrupadas nesta Fatura:
          </span>
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Nenhum item detalhado gravado na fatura.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden bg-slate-50/40">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3 flex items-center justify-between text-xs hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span className="font-semibold text-slate-900">
                      {it.description || 'Compra no cartão'}
                    </span>
                    {it.index > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                        Parcela {it.index}
                      </span>
                    )}
                  </div>
                  <span className="font-black text-slate-900">{formatCurrency(it.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
