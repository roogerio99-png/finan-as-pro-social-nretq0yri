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
import { dueInvoiceGroups, InvoiceGroup } from '@/services/invoicePayments'
import { AccountRecord, PaymentRecord, TransactionRecord } from '@/types/finance'
import { InvoicePaymentDialog } from './InvoicePaymentDialog'
import { formatBRL, monthLabelPT } from './format'

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
  const [loading, setLoading] = useState(true)
  const [dialogCard, setDialogCard] = useState<InvoiceGroup | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadPayments = useCallback(async () => {
    try {
      setPayments(await paymentsService.list())
    } catch (err) {
      console.error('Erro ao carregar pagamentos de fatura:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  const groups = useMemo(
    () => dueInvoiceGroups(transactions, accounts, payments, month),
    [transactions, accounts, payments, month],
  )

  // Em competência a fatura ainda não "vence" — a marcação só existe no regime caixa.
  if (regime === 'competence') {
    return null
  }

  const openDialog = (group: InvoiceGroup) => {
    setDialogCard(group)
    setDialogOpen(true)
  }

  const handleDone = () => {
    loadPayments()
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

                  <div className="space-y-1.5">
                    {g.items.map((item) => (
                      <div key={`${item.tx.id}#${item.index}`} className="text-xs text-slate-600">
                        {item.tx.description} — parcela {item.index}
                        {item.tx.installments_total ? `/${item.tx.installments_total}` : ''} ·{' '}
                        {formatBRL(item.value)}
                      </div>
                    ))}
                    {g.paidTotal > 0 && (
                      <div className="text-xs text-emerald-700 font-semibold">
                        Já pago nesta fatura: {formatBRL(g.paidTotal)}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => openDialog(g)}
                    className={
                      allPaid
                        ? 'w-full bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 rounded-xl'
                        : 'w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl'
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
