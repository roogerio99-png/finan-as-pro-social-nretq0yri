import React, { useState, useEffect, useCallback } from 'react'
import { accountsService } from '@/services/accounts'
import { invoicesService } from '@/services/invoices'
import { AccountRecord, InvoiceRecord } from '@/types/finance'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  PlusCircle,
  AlertCircle,
  Receipt,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { InvoiceCard } from '@/components/invoices/InvoiceCard'

export const InvoicesPage: React.FC = () => {
  const { toast } = useToast()
  const currentMonthStr = new Date().toISOString().slice(0, 7)
  const todayStr = new Date().toISOString().slice(0, 10)

  const [cards, setCards] = useState<AccountRecord[]>([])
  const [bankAccounts, setBankAccounts] = useState<AccountRecord[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const [referenceMonth, setReferenceMonth] = useState<string>(currentMonthStr)
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [creating, setCreating] = useState<boolean>(false)

  // Modal de pagamento de fatura
  const [payDialogOpen, setPayDialogOpen] = useState<boolean>(false)
  const [invoiceToPay, setInvoiceToPay] = useState<InvoiceRecord | null>(null)
  const [paymentAccountId, setPaymentAccountId] = useState<string>('')
  const [paidDate, setPaidDate] = useState<string>(todayStr)
  const [payAmount, setPayAmount] = useState<string>('')
  const [payNotes, setPayNotes] = useState<string>('')
  const [paying, setPaying] = useState<boolean>(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const allAccs = await accountsService.list()
      const cardAccs = allAccs.filter((a) => a.type === 'credit_card' && a.status !== 'archived')
      const banks = allAccs.filter((a) => a.type !== 'credit_card' && a.status !== 'archived')
      setCards(cardAccs)
      setBankAccounts(banks)

      if (banks.length > 0 && !paymentAccountId) {
        setPaymentAccountId(banks[0].id)
      }

      const activeCardId = selectedCardId || (cardAccs.length > 0 ? cardAccs[0].id : '')
      if (!selectedCardId && cardAccs.length > 0) {
        setSelectedCardId(cardAccs[0].id)
      }

      const invList = await invoicesService.list({
        cardAccountId: activeCardId || undefined,
      })
      setInvoices(invList)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao carregar dados',
        description: err.message || 'Não foi possível carregar as faturas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [selectedCardId, paymentAccountId, toast])

  useEffect(() => {
    loadData()
  }, [selectedCardId])

  const handleCreateInvoice = async () => {
    if (!selectedCardId || !referenceMonth) {
      toast({
        title: 'Atenção',
        description: 'Selecione um cartão e o mês de referência.',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      const created = await invoicesService.createForMonth(selectedCardId, referenceMonth)
      toast({
        title: 'Fatura criada com sucesso!',
        description: `Fatura ${referenceMonth} agrupou compras totalizando ${formatCurrency(created.total_amount || 0)}.`,
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Não foi possível criar fatura',
        description: err.message || 'Verifique se há compras com vencimento neste mês.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const openPayDialog = (invoice: InvoiceRecord) => {
    setInvoiceToPay(invoice)
    setPayAmount(String(invoice.total_amount || ''))
    setPaidDate(todayStr)
    setPayNotes('')
    setPayDialogOpen(true)
  }

  const handlePayInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceToPay || !paymentAccountId || !paidDate) return

    setPaying(true)
    try {
      await invoicesService.payViaMovement({
        invoiceId: invoiceToPay.id,
        paymentAccountId,
        paidDate,
        amount: payAmount ? parseFloat(payAmount) : undefined,
        notes: payNotes || undefined,
      })

      toast({
        title: 'Fatura paga com sucesso!',
        description:
          'O pagamento foi lançado como movimento bancário sem gerar despesa duplicada, e o saldo da conta foi debitado.',
      })

      setPayDialogOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar pagamento',
        description: err.message || 'Ocorreu um erro ao processar o pagamento.',
        variant: 'destructive',
      })
    } finally {
      setPaying(false)
    }
  }

  const handleUndoPayment = async (invoice: InvoiceRecord) => {
    if (
      !confirm(
        'Deseja desfazer o pagamento desta fatura? O saldo da conta pagadora será estornado.',
      )
    ) {
      return
    }

    try {
      const pb = (await import('@/lib/pocketbase/client')).default
      const txs = await pb.collection('transactions').getFullList({
        filter: `invoice_id = '${invoice.id}' && type = 'invoice_payment'`,
        sort: '-created',
        limit: 1,
      })

      if (txs.length === 0) {
        throw new Error('Movimento de pagamento correspondente não encontrado.')
      }

      await invoicesService.undoPayment(txs[0].id)
      toast({
        title: 'Pagamento desfeito',
        description: 'A fatura voltou para a situação Aberta e o saldo foi estornado.',
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao desfazer pagamento',
        description: err.message || 'Não foi possível estornar.',
        variant: 'destructive',
      })
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const selectedCard = cards.find((c) => c.id === selectedCardId)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-8 h-8 text-purple-600" />
            Faturas de Cartão
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Crie e concilie a fatura agrupando todas as compras do mês. Ao informar o pagamento, a
            movimentação debita a conta sem duplicar despesa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Label htmlFor="cardSelect" className="text-xs font-bold text-slate-600">
              Cartão:
            </Label>
            <select
              id="cardSelect"
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="month"
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
            />
          </div>

          <Button
            onClick={handleCreateInvoice}
            disabled={creating || !selectedCardId}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2 rounded-xl"
          >
            <PlusCircle className="w-4 h-4" />
            {creating ? 'Agrupando Compras...' : 'Criar / Conciliar Fatura'}
          </Button>
        </div>
      </div>

      {/* Regra explicativa */}
      <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-purple-900 leading-relaxed">
          <span className="font-bold">Como funciona a conciliação:</span> a fatura agrupa todas as
          compras (à vista e parceladas) cujo mês de desembolso (caixa) seja o mês de referência.
          Quando você registra o pagamento com tipo{' '}
          <span className="font-bold">Pagamento de Fatura</span>, o saldo da conta/banco é debitado
          e nenhuma nova despesa é gerada, pois o gasto já foi computado na competência da compra
          original.
        </div>
      </div>

      {/* Lista de Faturas */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-700" />
            Faturas de {selectedCard?.name || 'Cartão'}
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Total de {invoices.length} fatura(s) cadastrada(s)
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando faturas...</div>
        ) : invoices.length === 0 ? (
          <Card className="border-slate-200 shadow-xs rounded-2xl bg-white p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-purple-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">
              Nenhuma fatura formal criada para este cartão
            </h3>
            <p className="text-xs max-w-md mx-auto text-slate-500">
              Escolha o mês de referência acima e clique em{' '}
              <strong>Criar / Conciliar Fatura</strong> para agrupar todas as compras do período.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {invoices.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                onPay={openPayDialog}
                onUndo={handleUndoPayment}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal para Informar Pagamento da Fatura */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Pagar Fatura {invoiceToPay?.reference_month}
            </DialogTitle>
            <DialogDescription>
              Informe a conta/banco pagador e a data. O saldo bancário será debitado sem criar
              despesa duplicada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePayInvoice} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="payAcc">Conta / Banco Pagador</Label>
              <select
                id="payAcc"
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                required
              >
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Saldo atual: {formatCurrency(a.current_balance ?? a.initial_balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pAmt">Valor Pago (R$)</Label>
                <Input
                  id="pAmt"
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pDate">Data do Pagamento</Label>
                <Input
                  id="pDate"
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pNotes">Observações (Opcional)</Label>
              <Input
                id="pNotes"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Ex: Pagamento débito automático / Pix"
              />
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                Esta operação registra um movimento bancário do tipo{' '}
                <strong>Pagamento de Fatura</strong>, garantindo que o saldo diminua sem afetar seu
                orçamento de despesas do mês.
              </span>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPayDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={paying}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {paying ? 'Processando...' : 'Confirmar Pagamento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
