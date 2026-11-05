import React from 'react'
import { InvoiceRecord, InvoiceItemEntry } from '@/types/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Clock,
  Undo2,
  Pencil,
  Trash2,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'

interface InvoiceCardProps {
  invoice: InvoiceRecord
  onPay: (invoice: InvoiceRecord) => void
  onUndo: (invoice: InvoiceRecord) => void
  onEdit: (invoice: InvoiceRecord) => void
  onDelete: (invoice: InvoiceRecord) => void
  onExcludeItem?: (invoice: InvoiceRecord, item: InvoiceItemEntry) => void
  onEditItemValue?: (invoice: InvoiceRecord, item: InvoiceItemEntry) => void
  formatCurrency: (val: number) => string
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  onPay,
  onUndo,
  onEdit,
  onDelete,
  onExcludeItem,
  onEditItemValue,
  formatCurrency,
}) => {
  const isPaid = invoice.status === 'paid'
  const paymentAccount = invoice.expand?.payment_account_id
  const cardAccount = invoice.expand?.card_account_id
  const [itemsExpanded, setItemsExpanded] = React.useState<boolean>(true)

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
              <strong className="text-slate-900">
                {formatCurrency(invoice.total_amount || 0)}
              </strong>
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
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>Títulos que compõem a Fatura</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {items.length}
              </span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setItemsExpanded(!itemsExpanded)}
              className="h-7 text-xs text-slate-500 hover:text-slate-900 px-2"
            >
              {itemsExpanded ? (
                <>
                  <span className="text-[11px]">Recolher</span>
                  <ChevronUp className="w-3.5 h-3.5 ml-1" />
                </>
              ) : (
                <>
                  <span className="text-[11px]">Expandir títulos</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>

          {!itemsExpanded ? null : items.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center space-y-1">
              <p className="text-xs text-slate-500 font-medium">
                Nenhum título detalhado registrado nesta fatura.
              </p>
              <p className="text-[11px] text-slate-400">
                Gere ou atualize a fatura para listar os lançamentos individuais de cartão.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                      <span className="font-bold text-slate-900 truncate">
                        {it.description || 'Compra no cartão'}
                      </span>

                      {it.index > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold shrink-0">
                          Parcela {it.index}
                          {it.installments_total ? `/${it.installments_total}` : ''}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium shrink-0">
                          À vista
                        </span>
                      )}

                      {it.date && (
                        <span className="text-[11px] text-slate-400 shrink-0">
                          • {it.date.split('-').reverse().join('/')}
                        </span>
                      )}
                    </div>

                    {it.adjustment_note && (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md w-fit">
                        <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Ajuste: {it.adjustment_note}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t border-slate-100 sm:border-0">
                    <span className="text-sm font-black text-slate-900">
                      {formatCurrency(it.value)}
                    </span>

                    {/* Ações de auditoria do título: Alterar Valor e Excluir */}
                    {!isPaid && (
                      <div className="flex items-center gap-1">
                        {onEditItemValue && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditItemValue(invoice, it)}
                            className="h-7 px-2 text-[11px] font-medium text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg gap-1"
                            title="Alterar valor deste título (recalcula fatura atual e futuras)"
                          >
                            <Pencil className="w-3 h-3 text-purple-600" />
                            <span>Alterar Valor</span>
                          </Button>
                        )}

                        {onExcludeItem && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onExcludeItem(invoice, it)}
                            className="h-7 px-2 text-[11px] font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg gap-1"
                            title="Excluir da fatura atual (será adiado para a fatura do mês seguinte)"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                            <span>Excluir</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
