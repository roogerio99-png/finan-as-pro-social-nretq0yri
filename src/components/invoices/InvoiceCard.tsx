import React from 'react'
import { InvoiceRecord, InvoiceItemEntry } from '@/types/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Undo2, Pencil, Trash2, Calendar, FileText } from 'lucide-react'

interface InvoiceCardProps {
  invoice: InvoiceRecord
  onPay: (invoice: InvoiceRecord) => void
  onUndo: (invoice: InvoiceRecord) => void
  onEdit: (invoice: InvoiceRecord) => void
  onDelete: (invoice: InvoiceRecord) => void
  formatCurrency: (val: number) => string
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  onPay,
  onUndo,
  onEdit,
  onDelete,
  formatCurrency,
}) => {
  const isPaid = invoice.status === 'paid'
  const paymentAccount = invoice.expand?.payment_account_id
  const cardAccount = invoice.expand?.card_account_id

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
      <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base sm:text-lg font-black text-slate-900">
              Fatura {invoice.reference_month}
            </CardTitle>
            {cardAccount && (
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                {cardAccount.name}
              </span>
            )}
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
                  Paga {invoice.paid_date ? `em ${invoice.paid_date}` : ''}
                  {paymentAccount ? ` • ${paymentAccount.name}` : ''}
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Aberta
                </span>
              )}
            </Badge>
          </div>

          <CardDescription className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {items.length} item(ns) conciliado(s) • Total:{' '}
              <strong className="text-slate-900">{formatCurrency(invoice.total_amount || 0)}</strong>
            </span>
            {(invoice as any).due_date && (
              <span className="flex items-center gap-1 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Vencimento: <strong>{(invoice as any).due_date}</strong>
              </span>
            )}
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isPaid ? (
            <Button
              size="sm"
              onClick={() => onPay(invoice)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Informar Pagamento
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUndo(invoice)}
              className="text-amber-700 border-amber-200 hover:bg-amber-50 font-bold text-xs gap-1.5 rounded-xl"
            >
              <Undo2 className="w-3.5 h-3.5" /> Desfazer Pagamento
            </Button>
          )}

          {/* Botão Alterar / Editar Fatura */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(invoice)}
            className="text-slate-700 border-slate-200 hover:bg-slate-100 font-bold text-xs gap-1.5 rounded-xl"
            title="Alterar dados da fatura"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-600" />
            <span>Alterar</span>
          </Button>

          {/* Botão Excluir Fatura */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(invoice)}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold text-xs gap-1.5 rounded-xl"
            title="Excluir fatura"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Excluir</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-3">
        {invoice.notes && (
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <span>{invoice.notes}</span>
          </div>
        )}

        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Compras e Parcelas Agrupadas nesta Fatura:
          </span>
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Nenhum item avulso detalhado vinculado a esta fatura.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden bg-slate-50/40">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-2.5 sm:p-3 flex items-center justify-between text-xs hover:bg-white transition-colors"
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
