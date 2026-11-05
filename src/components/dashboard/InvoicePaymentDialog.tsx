import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle2, CreditCard, Landmark, Undo2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { paymentsService, MarkPaidInput } from '@/services/payments'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { AccountRecord, InvoiceRecord, PaymentRecord, TransactionRecord } from '@/types/finance'
import { invoicesService } from '@/services/invoices'
import { formatBRL, formatDateBR } from './format'

export interface InvoiceItem {
  tx: TransactionRecord
  /** Parcela (1-based) que vence neste mês. */
  index: number
  value: number
}

interface InvoicePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fatura do mês: itens agrupados por cartão (sem as já pagas). */
  card: AccountRecord
  items: InvoiceItem[]
  total: number
  paidTotal: number
  /** Fatura formal persistida (opcional). */
  formalInvoice?: InvoiceRecord
  /** Pagamentos já registrados desta fatura (para exibir data/banco). */
  paidRecords: PaymentRecord[]
  accounts: AccountRecord[]
  month: string
  onDone: () => void
}

const todayISO = (): string => new Date().toISOString().slice(0, 10)

export const InvoicePaymentDialog: React.FC<InvoicePaymentDialogProps> = ({
  open,
  onOpenChange,
  card,
  items,
  total,
  paidTotal,
  formalInvoice,
  paidRecords,
  accounts,
  month,
  onDone,
}) => {
  const { toast } = useToast()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [date, setDate] = useState<string>(todayISO())
  const [accountId, setAccountId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [unmarking, setUnmarking] = useState<string | null>(null)

  // Contas ativas que NÃO são cartão de crédito — candidatos a "banco" pagador.
  const payerAccounts = useMemo(
    () => accounts.filter((a) => a.type !== 'credit_card' && (a.status ?? 'active') === 'active'),
    [accounts],
  )

  useEffect(() => {
    if (open) {
      setSelectedIds(items.map((i) => `${i.tx.id}#${i.index}`))
      setDate(todayISO())
      setAccountId(payerAccounts[0]?.id || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card.id, month])

  const selectedTotal = items
    .filter((i) => selectedIds.includes(`${i.tx.id}#${i.index}`))
    .reduce((acc, i) => acc + i.value, 0)

  const remaining = Math.max(0, Math.round((total - paidTotal) * 100) / 100)

  const toggle = (key: string) => {
    setSelectedIds((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const handleConfirm = async () => {
    if (!accountId) {
      toast({
        title: 'Escolha a conta/banco',
        description: 'Indique por onde o dinheiro saiu para registrar o pagamento.',
        variant: 'destructive',
      })
      return
    }
    if (!date) {
      toast({
        title: 'Informe a data do pagamento',
        variant: 'destructive',
      })
      return
    }
    if (selectedIds.length === 0) {
      toast({ title: 'Selecione ao menos uma parcela', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const chosen = items.filter((i) => selectedIds.includes(`${i.tx.id}#${i.index}`))

      // Garante que exista fatura formal registrada para este cartão e mês
      let invoice = formalInvoice
      if (!invoice) {
        try {
          invoice = await invoicesService.createForMonth(card.id, month)
        } catch (invErr) {
          console.warn('Não foi possível auto-criar fatura formal:', invErr)
        }
      }

      const isFullPayment = chosen.length === items.length && items.length > 0

      // Se temos fatura formal e todas as parcelas pendentes foram selecionadas,
      // usamos payViaMovement: ele cria o movimento bancário (invoice_payment),
      // debita a conta pagadora, cria os registros em payments e marca a fatura como paga.
      if (invoice && isFullPayment && invoice.status !== 'paid') {
        await invoicesService.payViaMovement({
          invoiceId: invoice.id,
          paymentAccountId: accountId,
          paidDate: date,
          amount: selectedTotal,
          notes: `Quitação da fatura ${month} do cartão ${card.name}`,
        })
      } else {
        // Quitação parcial ou fatura sem registro formal: registra parcela a parcela
        for (const item of chosen) {
          const input: MarkPaidInput = {
            transaction: item.tx,
            installmentIndex: item.index,
            amount: item.value,
            cashMonth: month,
            paidDate: date,
            paymentAccountId: accountId,
            cardAccountId: card.id,
          }
          await paymentsService.markPaid(input)
        }
      }

      toast({
        title: 'Pagamento de fatura registrado!',
        description: `${chosen.length} parcela(s) quitada(s) no valor de ${formatBRL(selectedTotal)} via ${payerAccounts.find((a) => a.id === accountId)?.name ?? 'conta'}. Registrado como Pagamento de Fatura (neutro, sem duplicar despesa).`,
      })
      onOpenChange(false)
      onDone()
    } catch (err) {
      toast({
        title: 'Erro ao registrar pagamento',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUnmark = async (payment: PaymentRecord) => {
    setUnmarking(payment.id)
    try {
      await paymentsService.unmarkPaid(payment.id)
      toast({
        title: 'Pagamento desfeito',
        description: 'A parcela voltou para a lista de pendentes.',
      })
      onDone()
    } catch (err) {
      toast({
        title: 'Erro ao desfazer pagamento',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setUnmarking(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            Fatura {month} — {card.name}
          </DialogTitle>
          <DialogDescription>
            Marque as parcelas que foram pagas, informe a data do pagamento e de qual conta/banco o
            dinheiro saiu. O saldo da conta escolhida é atualizado.
          </DialogDescription>
        </DialogHeader>

        {/* Parcelas já pagas nesta fatura */}
        {paidRecords.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Pagas nesta fatura
            </p>
            <div className="space-y-2">
              {paidRecords.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-900 truncate">
                      {p.expand?.source_transaction_id?.description ||
                        items.find((i) => i.tx.id === p.source_transaction_id)?.tx.description ||
                        'Parcela'}
                    </p>
                    <p className="text-xs text-emerald-800/80 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Paga em {formatDateBR(p.paid_date)} •{' '}
                      {p.expand?.payment_account_id?.name || 'Conta'} ({formatBRL(p.amount)})
                      {p.installment_index ? ` • parcela ${p.installment_index}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={unmarking === p.id}
                    onClick={() => handleUnmark(p)}
                    className="text-xs text-emerald-800 hover:bg-emerald-100 gap-1.5 flex-shrink-0"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> Desfazer
                  </Button>
                  {unmarking === p.id && (
                    <span className="text-xs text-emerald-700 flex-shrink-0">Desfazendo…</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parcelas pendentes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Parcelas vencendo em {month}
            </p>
            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">
              {formatBRL(remaining)} em aberto
            </Badge>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">
              {paidRecords.length > 0
                ? 'Tudo pago nesta fatura. 🎉'
                : 'Nenhuma parcela vencendo nesta fatura.'}
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.map((item) => {
                const key = `${item.tx.id}#${item.index}`
                const checked = selectedIds.includes(key)
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      checked
                        ? 'bg-purple-50 border-purple-300'
                        : 'bg-white border-slate-200 hover:border-purple-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(key)}
                      className="w-4 h-4 accent-purple-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {item.tx.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        Parcela {item.index}
                        {item.tx.installments_total ? ` de ${item.tx.installments_total}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-900 flex-shrink-0">
                      {formatBRL(item.value)}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="payment-date" className="text-xs font-bold text-slate-700">
                  Data do pagamento
                </Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-account" className="text-xs font-bold text-slate-700">
                  Banco/conta pagadora
                </Label>
                <select
                  id="payment-account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {payerAccounts.length === 0 && <option value="">Nenhuma conta disponível</option>}
                  {payerAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total selecionado</span>
                <span className="font-bold text-slate-900">{formatBRL(selectedTotal)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-slate-600">Sai da conta</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-emerald-600" />
                  {payerAccounts.find((a) => a.id === accountId)?.name || '—'}
                </span>
              </div>
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Fechar
          </Button>
          {items.length > 0 && (
            <Button
              onClick={handleConfirm}
              disabled={saving || payerAccounts.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              {saving ? 'Registrando…' : `Marcar ${selectedIds.length || 0} como paga(s)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
