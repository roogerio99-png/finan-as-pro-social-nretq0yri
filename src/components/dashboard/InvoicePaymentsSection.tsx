// Seção "Parcelas & Faturas do Mês" do Painel: lista as faturas (por cartão)
// com parcelas vencendo no mês selecionado (regime caixa) e permite marcar o
// pagamento da fatura — data + banco pagador — via InvoicePaymentDialog.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, CheckCircle2, CalendarClock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { paymentsService } from '@/services/payments'
import { invoicesService } from '@/services/invoices'
import { dueInvoiceGroups, InvoiceGroup } from '@/services/invoicePayments'
import { AccountRecord, InvoiceRecord, PaymentRecord, TransactionRecord } from '@/types/finance'
import { InvoicePaymentDialog } from './InvoicePaymentDialog'
import { formatBRL, monthLabelPT } from './format'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { FileText, Loader2, Sparkles } from 'lucide-react'

interface InvoicePaymentsSectionProps {
  transactions: TransactionRecord[]
  accounts: AccountRecord[]
  month: string
  regime: 'competence' | 'cash'
  onPaymentsChanged?: () => void
}

export const InvoicePaymentsSection: React.FC<InvoicePaymentsSectionProps> = ({
  transactions,
  accounts,
  month,
  regime,
  onPaymentsChanged,
}) => {
  const { toast } = useToast()
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [formalInvoices, setFormalInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingInvoiceFor, setCreatingInvoiceFor] = useState<string | null>(null)
  const [dialogCard, setDialogCard] = useState<InvoiceGroup | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [pList, invList] = await Promise.all([
        paymentsService.list(),
        invoicesService.list({ month }),
      ])
      setPayments(pList)
      setFormalInvoices(invList)
    } catch (err) {
      console.error('Erro ao carregar pagamentos e faturas:', err)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    loadData()
  }, [loadData])

  const groups = useMemo(
    () => dueInvoiceGroups(transactions, accounts, payments, month, formalInvoices),
    [transactions, accounts, payments, month, formalInvoices],
  )

  // Em competência a fatura ainda não "vence" — a marcação só existe no regime caixa.
  if (regime === 'competence') {
    return null
  }

  const openDialog = (group: InvoiceGroup) => {
    setDialogCard(group)
    setDialogOpen(true)
  }

  const handleCreateInvoice = async (group: InvoiceGroup) => {
    setCreatingInvoiceFor(group.card.id)
    try {
      const created = await invoicesService.createForMonth(group.card.id, month)
      toast({
        title: 'Fatura criada e conciliada!',
        description: `Fatura de ${monthLabelPT(month)} do cartão ${group.card.name} gerada com ${created.items?.length || group.items.length} compra(s)/parcela(s), total de ${formatBRL(created.total_amount)}.`,
      })
      await loadData()
      onPaymentsChanged?.()
    } catch (err) {
      toast({
        title: 'Erro ao criar fatura',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setCreatingInvoiceFor(null)
    }
  }

  const handleDone = () => {
    loadData()
    onPaymentsChanged?.()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-purple-600" />
          Parcelas &amp; Faturas do Mês
        </h2>
        <span className="text-xs text-slate-500 font-medium">
          Marque o pagamento de cada fatura: data + banco pagador
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando parcelas…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nenhuma parcela vencendo em {monthLabelPT(month)} — nada a marcar. 🎉
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => {
            const allPaid = g.paidTotal >= g.total
            return (
              <Card key={g.card.id} className="border-slate-200 shadow-xs rounded-2xl">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900">{g.card.name}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5" />
                        Fatura {monthLabelPT(month)} • {g.items.length} parcela(s) em aberto
                      </p>
                    </div>
                    <Badge
                      className={
                        allPaid
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-purple-100 text-purple-800 border-purple-200'
                      }
                      variant="outline"
                    >
                      {allPaid ? 'Paga' : formatBRL(g.total - g.paidTotal)}
                    </Badge>
                  </div>

                  {/* Status da Fatura Formal Conciliada */}
                  {g.formalInvoice ? (
                    <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-purple-900 font-medium">
                        <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <span>
                          Fatura formal:{' '}
                          <strong>{g.formalInvoice.status === 'paid' ? 'Paga' : 'Aberta'}</strong> •
                          Total: {formatBRL(g.formalInvoice.total_amount)}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          g.formalInvoice.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]'
                            : 'bg-amber-100 text-amber-800 border-amber-200 text-[10px]'
                        }
                      >
                        {g.formalInvoice.status === 'paid' ? 'Quitada' : 'Aberta'}
                      </Badge>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600">
                        Fatura deste mês ainda não foi formalizada.
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={creatingInvoiceFor === g.card.id}
                        onClick={() => handleCreateInvoice(g)}
                        className="h-7 text-xs bg-white text-purple-700 border-purple-200 hover:bg-purple-50 rounded-lg gap-1"
                      >
                        {creatingInvoiceFor === g.card.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Gerando…
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-purple-600" /> Criar fatura
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Compras &amp; Parcelas ({g.items.length + (g.paidTotal > 0 ? 1 : 0)})
                    </p>
                    {g.items.map((item) => (
                      <div
                        key={`${item.tx.id}#${item.index}`}
                        className="text-xs text-slate-700 flex items-center justify-between py-0.5"
                      >
                        <span className="truncate pr-2">
                          {item.tx.description} — parcela {item.index}
                          {item.tx.installments_total ? `/${item.tx.installments_total}` : ''}
                        </span>
                        <span className="font-semibold text-slate-900 flex-shrink-0">
                          {formatBRL(item.value)}
                        </span>
                      </div>
                    ))}
                    {g.paidTotal > 0 && (
                      <div className="text-xs text-emerald-700 font-semibold pt-1 border-t border-slate-100 flex items-center justify-between">
                        <span>Já pago nesta fatura:</span>
                        <span>{formatBRL(g.paidTotal)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    {!g.formalInvoice && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={creatingInvoiceFor === g.card.id}
                        onClick={() => handleCreateInvoice(g)}
                        className="flex-1 bg-white text-purple-700 border-purple-200 hover:bg-purple-50 rounded-xl"
                      >
                        {creatingInvoiceFor === g.card.id ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Criando…
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> Criar fatura
                          </span>
                        )}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      onClick={() => openDialog(g)}
                      className={
                        allPaid
                          ? 'flex-1 bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 rounded-xl'
                          : 'flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl'
                      }
                    >
                      {allPaid ? (
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Ver pagamentos
                        </span>
                      ) : (
                        'Marcar como paga'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {dialogCard && (
        <InvoicePaymentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          card={dialogCard.card}
          items={dialogCard.items}
          total={dialogCard.total}
          paidTotal={dialogCard.paidTotal}
          formalInvoice={dialogCard.formalInvoice}
          paidRecords={payments.filter(
            (p) => p.card_account_id === dialogCard.card.id && p.cash_month === month,
          )}
          accounts={accounts}
          month={month}
          onDone={handleDone}
        />
      )}
    </div>
  )
}
