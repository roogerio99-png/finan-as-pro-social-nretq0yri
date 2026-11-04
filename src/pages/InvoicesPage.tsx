import React, { useState, useEffect, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  PlusCircle,
  AlertCircle,
  Receipt,
  Sparkles,
  Pencil,
  Trash2,
  Plus,
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

  // Modal de Criação / Edição de Fatura (Alterar e Criar Manual)
  const [formDialogOpen, setFormDialogOpen] = useState<boolean>(false)
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null)
  const [formCardId, setFormCardId] = useState<string>('')
  const [formMonth, setFormMonth] = useState<string>(currentMonthStr)
  const [formDueDate, setFormDueDate] = useState<string>('')
  const [formTotalAmount, setFormTotalAmount] = useState<string>('')
  const [formStatus, setFormStatus] = useState<'open' | 'paid'>('open')
  const [formPaidDate, setFormPaidDate] = useState<string>('')
  const [formPaymentAccountId, setFormPaymentAccountId] = useState<string>('')
  const [formNotes, setFormNotes] = useState<string>('')
  const [savingForm, setSavingForm] = useState<boolean>(false)

  // Modal de Exclusão com Confirmação
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceRecord | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false)
  const [deleting, setDeleting] = useState<boolean>(false)

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
  }, [loadData])

  // Ação: Criar / Conciliar Fatura Automaticamente
  const handleAutoConciliateInvoice = async () => {
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
        title: 'Fatura gerada com sucesso!',
        description: `Fatura de ${referenceMonth} agrupou compras totalizando ${formatCurrency(created.total_amount || 0)}.`,
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Não foi possível gerar fatura',
        description: err.message || 'Verifique se há compras com vencimento neste mês.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  // Ação: Abrir modal para Criar Nova Fatura Manual
  const openCreateManualDialog = () => {
    setEditingInvoice(null)
    setFormCardId(selectedCardId || cards[0]?.id || '')
    setFormMonth(referenceMonth || currentMonthStr)
    const card = cards.find((c) => c.id === (selectedCardId || cards[0]?.id))
    const dueDay = card?.due_day || 10
    setFormDueDate(`${referenceMonth || currentMonthStr}-${String(dueDay).padStart(2, '0')}`)
    setFormTotalAmount('')
    setFormStatus('open')
    setFormPaidDate('')
    setFormPaymentAccountId(bankAccounts[0]?.id || '')
    setFormNotes('')
    setFormDialogOpen(true)
  }

  // Ação: Abrir modal para Alterar / Editar Fatura
  const openEditDialog = (invoice: InvoiceRecord) => {
    setEditingInvoice(invoice)
    setFormCardId(invoice.card_account_id)
    setFormMonth(invoice.reference_month)
    setFormDueDate((invoice as any).due_date || '')
    setFormTotalAmount(String(invoice.total_amount ?? 0))
    setFormStatus(invoice.status || 'open')
    setFormPaidDate(invoice.paid_date || '')
    setFormPaymentAccountId(invoice.payment_account_id || bankAccounts[0]?.id || '')
    setFormNotes(invoice.notes || '')
    setFormDialogOpen(true)
  }

  // Salvar Fatura (Criação Manual ou Alteração)
  const handleSaveInvoiceForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCardId || !formMonth) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione o cartão e o mês de referência.',
        variant: 'destructive',
      })
      return
    }

    const parsedTotal = parseFloat(formTotalAmount) || 0

    setSavingForm(true)
    try {
      if (editingInvoice) {
        // Alterar fatura existente
        const updates: Partial<InvoiceRecord> & { due_date?: string } = {
          card_account_id: formCardId,
          reference_month: formMonth,
          total_amount: parsedTotal,
          status: formStatus,
          due_date: formDueDate || undefined,
          paid_date: formStatus === 'paid' ? formPaidDate || todayStr : undefined,
          payment_account_id: formStatus === 'paid' ? formPaymentAccountId : undefined,
          notes: formNotes || undefined,
        }
        await invoicesService.update(editingInvoice.id, updates)
        toast({
          title: 'Fatura alterada!',
          description: `A fatura de ${formMonth} foi atualizada com sucesso.`,
        })
      } else {
        // Criar nova fatura
        const newInvoiceData: Partial<InvoiceRecord> & { due_date?: string } = {
          card_account_id: formCardId,
          reference_month: formMonth,
          total_amount: parsedTotal,
          status: formStatus,
          due_date: formDueDate || undefined,
          paid_date: formStatus === 'paid' ? formPaidDate || todayStr : undefined,
          payment_account_id: formStatus === 'paid' ? formPaymentAccountId : undefined,
          notes: formNotes || undefined,
        }
        await invoicesService.create(newInvoiceData)
        toast({
          title: 'Fatura criada com sucesso!',
          description: `Nova fatura de ${formMonth} cadastrada.`,
        })
      }

      setFormDialogOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar fatura',
        description: err.message || 'Verifique os dados informados.',
        variant: 'destructive',
      })
    } finally {
      setSavingForm(false)
    }
  }

  // Ação: Abrir modal de Confirmação de Exclusão
  const openDeleteDialog = (invoice: InvoiceRecord) => {
    setInvoiceToDelete(invoice)
    setDeleteDialogOpen(true)
  }

  // Executar Exclusão da Fatura
  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return

    setDeleting(true)
    try {
      await invoicesService.delete(invoiceToDelete.id)
      toast({
        title: 'Fatura excluída!',
        description: `A fatura de ${invoiceToDelete.reference_month} foi removida com sucesso.`,
      })
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir fatura',
        description: err.message || 'Não foi possível excluir o registro.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // Ação: Informar Pagamento da Fatura
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

  // Ação: Desfazer Pagamento
  const handleUndoPayment = async (invoice: InvoiceRecord) => {
    if (
      !confirm(
        'Deseja desfazer o pagamento desta fatura? O saldo da conta pagadora será estornado.',
      )
    ) {
      return
    }

    try {
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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
            Faturas de Cartão
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Crie, altere e exclua faturas de cartão. Você pode gerar a fatura agrupando compras do
            mês ou cadastrar manualmente. Ao registrar pagamento, o saldo bancário é debitado sem
            duplicar despesa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center space-x-2 flex-1 sm:flex-initial min-w-[150px]">
            <Label htmlFor="cardSelect" className="text-xs font-bold text-slate-600 flex-shrink-0">
              Cartão:
            </Label>
            <select
              id="cardSelect"
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 w-full"
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 flex-1 sm:flex-initial">
            <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input
              type="month"
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 w-full"
            ></input>
          </div>

          <Button
            onClick={handleAutoConciliateInvoice}
            disabled={creating || !selectedCardId}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-2 rounded-xl h-9"
            title="Agrupa compras do cartão cujo desembolso cai neste mês"
          >
            <PlusCircle className="w-4 h-4" />
            {creating ? 'Agrupando...' : 'Conciliar Mês'}
          </Button>

          <Button
            onClick={openCreateManualDialog}
            variant="outline"
            disabled={cards.length === 0}
            className="w-full sm:w-auto border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-bold gap-1.5 rounded-xl h-9"
            title="Cadastrar uma fatura manualmente com valor e vencimento definidos"
          >
            <Plus className="w-4 h-4" />
            Nova Fatura
          </Button>
        </div>
      </div>

      {/* Regra explicativa */}
      <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-purple-900 leading-relaxed">
          <span className="font-bold">Gerenciamento completo de faturas:</span> você pode{' '}
          <strong>Criar</strong> novas faturas, <strong>Alterar</strong> qualquer dado (mês,
          vencimento, valor total, status, observações) e <strong>Excluir</strong> faturas com total
          segurança. Quando você registra o pagamento, o movimento bancário baixa a conta sem
          duplicar gastos de despesas.
        </div>
      </div>

      {/* Lista de Faturas */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-700" />
            Faturas de {selectedCard?.name || 'Cartão'}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Total de {invoices.length} fatura(s) cadastrada(s)
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando faturas...</div>
        ) : invoices.length === 0 ? (
          <Card className="border-slate-200 shadow-xs rounded-2xl bg-white p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-purple-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">
              Nenhuma fatura cadastrada para este cartão
            </h3>
            <p className="text-xs max-w-md mx-auto text-slate-500">
              Você pode clicar em <strong>Conciliar Mês</strong> para agrupar as compras do período
              ou em <strong>Nova Fatura</strong> para registrar uma fatura avulsa.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                onClick={openCreateManualDialog}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-1.5 rounded-xl"
              >
                <Plus className="w-4 h-4" /> Cadastrar Fatura Manual
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {invoices.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                onPay={openPayDialog}
                onUndo={handleUndoPayment}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição de Fatura (Alterar & Criar) */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {editingInvoice ? (
                <>
                  <Pencil className="w-5 h-5 text-purple-600" />
                  Alterar Fatura
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 text-purple-600" />
                  Nova Fatura de Cartão
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingInvoice
                ? 'Atualize os dados da fatura, como vencimento, mês de referência, valor e status.'
                : 'Cadastre os detalhes da fatura para conciliação e controle de vencimento.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveInvoiceForm} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="formCard">Cartão de Crédito</Label>
              <select
                id="formCard"
                value={formCardId}
                onChange={(e) => setFormCardId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                required
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="formMth">Mês de Referência</Label>
                <Input
                  id="formMth"
                  type="month"
                  value={formMonth}
                  onChange={(e) => setFormMonth(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formDue">Vencimento</Label>
                <Input
                  id="formDue"
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="formAmt">Valor Total (R$)</Label>
                <Input
                  id="formAmt"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formTotalAmount}
                  onChange={(e) => setFormTotalAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formSts">Status</Label>
                <select
                  id="formSts"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'open' | 'paid')}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                >
                  <option value="open">Aberta</option>
                  <option value="paid">Paga</option>
                </select>
              </div>
            </div>

            {formStatus === 'paid' && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-3">
                <span className="text-xs font-bold text-emerald-900 block">
                  Dados do Pagamento:
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="formPaidDt" className="text-xs">
                      Data Pago
                    </Label>
                    <Input
                      id="formPaidDt"
                      type="date"
                      value={formPaidDate || todayStr}
                      onChange={(e) => setFormPaidDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="formPayAcc" className="text-xs">
                      Conta Pagadora
                    </Label>
                    <select
                      id="formPayAcc"
                      value={formPaymentAccountId}
                      onChange={(e) => setFormPaymentAccountId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      {bankAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="formObs">Observações / Detalhes</Label>
              <Input
                id="formObs"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Ex: Fatura antecipada ou renegociada"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingForm}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                {savingForm ? 'Salvando...' : editingInvoice ? 'Salvar Alterações' : 'Criar Fatura'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação para Excluir Fatura */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-2">
              <Trash2 className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Excluir Fatura {invoiceToDelete?.reference_month}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 space-y-2">
              <p>
                Tem certeza que deseja excluir esta fatura do mês{' '}
                <strong className="text-slate-900">{invoiceToDelete?.reference_month}</strong> no
                valor de{' '}
                <strong className="text-slate-900">
                  {formatCurrency(invoiceToDelete?.total_amount || 0)}
                </strong>
                ?
              </p>
              <p className="text-xs text-slate-500">
                Esta ação remove o registro da fatura. Compras vinculadas voltarão a ficar
                disponíveis para nova conciliação.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {deleting ? 'Excluindo...' : 'Sim, Excluir Fatura'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
