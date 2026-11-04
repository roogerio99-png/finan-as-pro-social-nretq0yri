import React, { useState, useEffect } from 'react'
import { transactionsService } from '@/services/transactions'
import { accountsService } from '@/services/accounts'
import { categoriesService } from '@/services/categories'
import { invoicesService } from '@/services/invoices'
import {
  TransactionRecord,
  AccountRecord,
  CategoryRecord,
  TransactionType,
  InvoiceRecord,
} from '@/types/finance'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  PlusCircle,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Receipt,
  Calendar,
  Filter,
  Trash2,
  Clock,
  CreditCard,
  Pencil,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  isInstallmentTransaction,
  installmentValue,
  cashValueForMonth,
  firstCashMonth,
} from '@/services/installments'
import { TransactionDialog } from '@/components/transactions/TransactionDialog'

export const TransactionsPage: React.FC = () => {
  const { toast } = useToast()
  const currentMonthStr = new Date().toISOString().slice(0, 7)
  const todayStr = new Date().toISOString().slice(0, 10)

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr)
  const [regime, setRegime] = useState<'competence' | 'cash'>('competence')
  const [filterType, setFilterType] = useState<string>('all')

  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [openInvoices, setOpenInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Modal de criação e alteração
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionRecord | null>(null)
  const [description, setDescription] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [type, setType] = useState<TransactionType>('expense')
  const [accountId, setAccountId] = useState<string>('')
  const [targetAccountId, setTargetAccountId] = useState<string>('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [date, setDate] = useState<string>(todayStr)
  const [notes, setNotes] = useState<string>('')
  const [installmentsTotal, setInstallmentsTotal] = useState<string>('')
  const [installmentsPaid, setInstallmentsPaid] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)

  const selectedAccount = accounts.find((a) => a.id === accountId)
  const isCreditCard = selectedAccount?.type === 'credit_card'

  const loadData = async () => {
    setLoading(true)
    try {
      const [txs, accs, cats, invs] = await Promise.all([
        transactionsService.list({ month: selectedMonth, regime }),
        accountsService.list(),
        categoriesService.list(),
        invoicesService.list({ status: 'open' }),
      ])
      setTransactions(txs)
      setAccounts(accs)
      setCategories(cats)
      setOpenInvoices(invs)

      if (accs.length > 0 && !accountId) setAccountId(accs[0].id)
      if (accs.length > 1 && !targetAccountId) setTargetAccountId(accs[1].id)
      if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id)
      if (invs.length > 0 && !selectedInvoiceId) setSelectedInvoiceId(invs[0].id)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedMonth, regime])

  const handleOpenCreate = () => {
    setEditingTransaction(null)
    resetForm()
    setType('expense')
    setDate(todayStr)
    if (accounts.length > 0) setAccountId(accounts[0].id)
    if (accounts.length > 1) setTargetAccountId(accounts[1].id)
    if (categories.length > 0) setCategoryId(categories[0].id)
    setDialogOpen(true)
  }

  const handleOpenEdit = (tx: TransactionRecord) => {
    setEditingTransaction(tx)
    setType(tx.type)
    setDescription(tx.description || '')
    setAmount(String(tx.amount || ''))
    setDate(tx.date || todayStr)
    setAccountId(tx.account_id || (accounts[0]?.id || ''))
    setTargetAccountId(tx.transfer_account_id || (accounts[1]?.id || ''))
    setSelectedInvoiceId(tx.invoice_id || (openInvoices[0]?.id || ''))
    setCategoryId(tx.category_id || '')
    setNotes(tx.notes || '')
    setInstallmentsTotal(
      tx.installments_total && tx.installments_total > 1 ? String(tx.installments_total) : '',
    )
    setInstallmentsPaid(
      tx.installments_paid && tx.installments_paid > 0 ? String(tx.installments_paid) : '',
    )
    setDialogOpen(true)
  }

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !accountId) return

    setSaving(true)
    try {
      const parsedAmount = Math.abs(parseFloat(amount))
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Informe um valor válido maior que zero.')
      }

      // CASO 0: Alteração de lançamento existente
      if (editingTransaction) {
        if (type !== 'invoice_payment' && !description) {
          throw new Error('Informe uma descrição para o lançamento.')
        }

        const selectedAcc = accounts.find((a) => a.id === accountId)
        const competenceMonth = date.slice(0, 7)

        let cashMonth = competenceMonth
        if (
          selectedAcc &&
          selectedAcc.type === 'credit_card' &&
          selectedAcc.closing_day &&
          selectedAcc.due_day
        ) {
          cashMonth = accountsService.calculateCashDueDate(
            date,
            selectedAcc.closing_day,
            selectedAcc.due_day,
          )
        }

        const installments =
          type === 'expense' && isCreditCard ? Math.max(1, parseInt(installmentsTotal, 10) || 1) : 1

        await transactionsService.update(editingTransaction.id, {
          description:
            type === 'transfer' ? description || 'Transferência entre contas' : description,
          amount: parsedAmount,
          type,
          account_id: accountId,
          transfer_account_id: type === 'transfer' ? targetAccountId : undefined,
          category_id:
            type === 'expense' || type === 'income' ? categoryId || undefined : undefined,
          date,
          competence_month: competenceMonth,
          cash_month: cashMonth,
          installments_total: installments,
          installments_paid:
            installments > 1
              ? Math.min(installments, Math.max(0, parseInt(installmentsPaid, 10) || 0))
              : 0,
          notes: notes || undefined,
        })

        toast({
          title: 'Lançamento alterado!',
          description: 'As alterações foram salvas com sucesso.',
        })

        setDialogOpen(false)
        setEditingTransaction(null)
        resetForm()
        loadData()
        return
      }

      // CASO 1: Transferência entre contas
      if (type === 'transfer') {
        if (!targetAccountId) {
          throw new Error('Selecione a conta de destino da transferência.')
        }
        if (accountId === targetAccountId) {
          throw new Error('A conta de origem e destino devem ser diferentes.')
        }

        await transactionsService.transfer({
          sourceAccountId: accountId,
          targetAccountId: targetAccountId,
          amount: parsedAmount,
          date,
          description: description || 'Transferência entre contas',
          notes: notes || undefined,
        })

        toast({
          title: 'Transferência realizada com sucesso!',
          description: `Valor de ${formatCurrency(parsedAmount)} transferido entre contas (movimentação neutra, não afeta despesas/receitas).`,
        })

        setDialogOpen(false)
        resetForm()
        loadData()
        return
      }

      // CASO 2: Pagamento de fatura de cartão
      if (type === 'invoice_payment') {
        if (!selectedInvoiceId) {
          throw new Error(
            'Selecione a fatura que está sendo quitada ou crie a fatura na tela de Faturas.',
          )
        }

        await invoicesService.payViaMovement({
          invoiceId: selectedInvoiceId,
          paymentAccountId: accountId,
          paidDate: date,
          amount: parsedAmount,
          notes: notes || undefined,
        })

        toast({
          title: 'Pagamento de fatura registrado!',
          description: `O saldo da conta pagadora foi debitado em ${formatCurrency(parsedAmount)} sem gerar despesa duplicada.`,
        })

        setDialogOpen(false)
        resetForm()
        loadData()
        return
      }

      // CASO 3: Despesa ou Receita normal
      if (!description) {
        throw new Error('Informe uma descrição para o lançamento.')
      }

      const selectedAcc = accounts.find((a) => a.id === accountId)
      const competenceMonth = date.slice(0, 7)

      let cashMonth = competenceMonth
      if (
        selectedAcc &&
        selectedAcc.type === 'credit_card' &&
        selectedAcc.closing_day &&
        selectedAcc.due_day
      ) {
        cashMonth = accountsService.calculateCashDueDate(
          date,
          selectedAcc.closing_day,
          selectedAcc.due_day,
        )
      }

      const installments =
        type === 'expense' && isCreditCard ? Math.max(1, parseInt(installmentsTotal, 10) || 1) : 1

      await transactionsService.create({
        description,
        amount: parsedAmount,
        type,
        account_id: accountId,
        category_id: categoryId || undefined,
        date,
        competence_month: competenceMonth,
        cash_month: cashMonth,
        installments_total: installments,
        installments_paid:
          installments > 1
            ? Math.min(installments, Math.max(0, parseInt(installmentsPaid, 10) || 0))
            : 0,
        is_reconciled: true,
        notes:
          installments > 1
            ? `Parcelado em ${installments}x de ${formatCurrency(installmentValue(parsedAmount, installments))}${parseInt(installmentsPaid, 10) > 0 ? ` • ${Math.min(installments, parseInt(installmentsPaid, 10))} parcela(s) paga(s)` : ''}`
            : notes || undefined,
      })

      toast({
        title: 'Lançamento registrado!',
        description:
          installments > 1
            ? `Competência ${competenceMonth} com ${formatCurrency(parsedAmount)} • caixa em ${installments}x de ${formatCurrency(installmentValue(parsedAmount, installments))} a partir de ${cashMonth}.`
            : `Salvo com competência em ${competenceMonth} e caixa em ${cashMonth}.`,
      })

      setDialogOpen(false)
      resetForm()
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Verifique os campos informados.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setDescription('')
    setAmount('')
    setNotes('')
    setInstallmentsTotal('')
    setInstallmentsPaid('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este lançamento?')) return
    try {
      await transactionsService.delete(id)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      toast({ title: 'Lançamento excluído com sucesso.' })
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  const [clearing, setClearing] = useState(false)

  const handleClearAll = async () => {
    if (
      !confirm(
        'Atenção: Deseja realmente limpar toda a base de lançamentos?\n\nEsta ação apagará todos os lançamentos e faturas para que você possa iniciar o registro dos seus dados reais. Suas contas bancárias e categorias cadastradas continuarão preservadas.',
      )
    ) {
      return
    }

    setClearing(true)
    try {
      await transactionsService.clearAll()
      await loadData()
      toast({
        title: 'Base de lançamentos limpa com sucesso!',
        description: 'Todos os lançamentos foram removidos. Pronto para ingressar com seus dados reais.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao limpar lançamentos',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setClearing(false)
    }
  }

  // Filtragem
  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (regime === 'cash') {
      return cashValueForMonth(t, selectedMonth, accounts) > 0
    }
    return t.competence_month === selectedMonth
  })

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const firstCashMonthFor = (tx: TransactionRecord, accs: AccountRecord[]): string => {
    const acc = accs.find((a) => a.id === tx.account_id)
    return firstCashMonth(tx.date, acc?.closing_day, acc?.due_day)
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

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Lançamentos Financeiros
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Controle de despesas, receitas, transferências entre contas e pagamentos de fatura.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-bold w-full sm:w-auto justify-center sm:justify-start">
            <button
              onClick={() => setRegime('competence')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all ${
                regime === 'competence' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Competência
            </button>
            <button
              onClick={() => setRegime('cash')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all ${
                regime === 'cash' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Caixa
            </button>
          </div>

          <div className="flex items-center space-x-2 flex-1 sm:flex-initial">
            <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 w-full"
            />
          </div>

          {transactions.length > 0 && (
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={clearing}
              className="w-full sm:w-auto text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1.5 rounded-xl h-10 font-bold text-xs"
              title="Limpar todos os lançamentos para iniciar com dados reais"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearing ? 'Limpando...' : 'Limpar Lançamentos'}
            </Button>
          )}

          <Button
            onClick={handleOpenCreate}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl h-10 font-bold"
          >
            <PlusCircle className="w-4 h-4" /> Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Totais do mês no regime selecionado — Neutro para transferência e pagamento de fatura */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Receitas ({selectedMonth})
            </span>
            <div className="text-xl font-black text-emerald-600 mt-1">
              {formatCurrency(
                filteredTransactions
                  .filter((t) => t.type === 'income')
                  .reduce(
                    (acc, t) =>
                      acc +
                      (regime === 'cash'
                        ? cashValueForMonth(t, selectedMonth, accounts)
                        : t.amount),
                    0,
                  ),
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Despesas ({selectedMonth})
            </span>
            <div className="text-xl font-black text-rose-600 mt-1">
              {formatCurrency(
                filteredTransactions
                  .filter((t) => t.type === 'expense')
                  .reduce(
                    (acc, t) =>
                      acc +
                      (regime === 'cash'
                        ? cashValueForMonth(t, selectedMonth, accounts)
                        : t.amount),
                    0,
                  ),
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Não inclui transferências nem quitações de fatura
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Saldo do Mês ({regime === 'cash' ? 'Caixa' : 'Competência'})
            </span>
            <div className="text-xl font-black text-slate-900 mt-1">
              {formatCurrency(
                filteredTransactions
                  .filter((t) => t.type === 'income' || t.type === 'expense')
                  .reduce(
                    (acc, t) =>
                      acc +
                      (t.type === 'income' ? 1 : -1) *
                        (regime === 'cash'
                          ? cashValueForMonth(t, selectedMonth, accounts)
                          : t.amount),
                    0,
                  ),
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros por tipo de movimento — scroll horizontal suave em mobile */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        <div className="flex items-center gap-1 flex-shrink-0 text-slate-400">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-bold text-slate-500 mr-1 hidden sm:inline">Filtrar:</span>
        </div>
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
            filterType === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos ({transactions.length})
        </button>
        <button
          onClick={() => setFilterType('income')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            filterType === 'income'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          Receitas ({transactions.filter((t) => t.type === 'income').length})
        </button>
        <button
          onClick={() => setFilterType('expense')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            filterType === 'expense'
              ? 'bg-rose-600 text-white'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
          }`}
        >
          Despesas ({transactions.filter((t) => t.type === 'expense').length})
        </button>
        <button
          onClick={() => setFilterType('transfer')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            filterType === 'transfer'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          Transferências ({transactions.filter((t) => t.type === 'transfer').length})
        </button>
        <button
          onClick={() => setFilterType('invoice_payment')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            filterType === 'invoice_payment'
              ? 'bg-purple-600 text-white'
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
          }`}
        >
          Pagamento Fatura ({transactions.filter((t) => t.type === 'invoice_payment').length})
        </button>
      </div>

      {/* Visualização Mobile: Cards empilhados (md:hidden) */}
      <div className="md:hidden space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {transactions.length === 0 ? 'Base de Lançamentos Limpa' : 'Nenhum lançamento encontrado'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {transactions.length === 0
                ? 'Base limpa e pronta para receber seus dados reais. Clique no botão abaixo para adicionar seu primeiro lançamento.'
                : 'Não há lançamentos para o mês ou filtro selecionado.'}
            </p>
            <Button
              onClick={handleOpenCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Novo Lançamento Real
            </Button>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isExpense = tx.type === 'expense'
            const isIncome = tx.type === 'income'
            const isNeutral = tx.type === 'transfer' || tx.type === 'invoice_payment'
            const account = tx.expand?.account_id || accounts.find((a) => a.id === tx.account_id)
            const targetAcc = accounts.find((a) => a.id === tx.transfer_account_id)
            const category =
              tx.expand?.category_id || categories.find((c) => c.id === tx.category_id)

            return (
              <div
                key={tx.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderTypeBadge(tx.type)}
                      <span className="text-[11px] font-bold text-slate-400">{tx.date}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug break-words">
                      {tx.description}
                    </h3>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-base font-black tracking-tight ${
                        isIncome
                          ? 'text-emerald-600'
                          : isExpense
                            ? 'text-rose-600'
                            : 'text-slate-700'
                      }`}
                    >
                      {isIncome ? '+ ' : isExpense ? '- ' : ''}
                      {regime === 'cash' && isInstallmentTransaction(tx)
                        ? formatCurrency(cashValueForMonth(tx, selectedMonth, accounts))
                        : formatCurrency(tx.amount)}
                    </span>
                    {regime === 'cash' && isInstallmentTransaction(tx) && (
                      <div className="text-[10px] text-purple-600 font-semibold">
                        (de {formatCurrency(tx.amount)})
                      </div>
                    )}
                  </div>
                </div>

                {tx.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {tx.notes}
                  </p>
                )}

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
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

                    {!isNeutral && category && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 text-[11px] font-medium max-w-[140px] truncate">
                        {category.name}
                      </span>
                    )}

                    {isInstallmentTransaction(tx) ? (
                      <span className="px-2 py-0.5 rounded-md font-bold bg-purple-50 text-purple-700 border border-purple-200 text-[10px]">
                        {tx.installments_total}x
                        {(tx.installments_paid ?? 0) > 0 ? ` (${tx.installments_paid}p)` : ''}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Comp: {tx.competence_month}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => handleOpenEdit(tx)}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Alterar lançamento"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir lançamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Tabela Desktop (md:block) — Preservada sem alterações */}
      <Card className="hidden md:block border-slate-200 shadow-xs rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Data / Mês</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Conta / Cartão</th>
                <th className="py-3 px-4">Categoria / Subgrupo</th>
                <th className="py-3 px-4">Caixa vs Competência</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-slate-800">
                        {transactions.length === 0
                          ? 'Base de Lançamentos Limpa'
                          : 'Nenhum lançamento encontrado'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {transactions.length === 0
                          ? 'Pronto para ingressar com seus dados financeiros reais. Clique no botão abaixo para adicionar seu primeiro lançamento.'
                          : 'Nenhum lançamento encontrado para os filtros selecionados no mês.'}
                      </p>
                      <Button
                        onClick={handleOpenCreate}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Inserir Lançamento Real
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isExpense = tx.type === 'expense'
                  const isIncome = tx.type === 'income'
                  const isNeutral = tx.type === 'transfer' || tx.type === 'invoice_payment'
                  const account =
                    tx.expand?.account_id || accounts.find((a) => a.id === tx.account_id)
                  const targetAcc = accounts.find((a) => a.id === tx.transfer_account_id)
                  const category =
                    tx.expand?.category_id || categories.find((c) => c.id === tx.category_id)

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-900">{tx.date}</div>
                        <div className="text-[11px] text-slate-400">
                          Comp: {tx.competence_month}
                        </div>
                        {isInstallmentTransaction(tx) && (
                          <div className="text-[11px] font-bold text-purple-600">
                            {tx.installments_total}x
                            {(tx.installments_paid ?? 0) > 0
                              ? ` • ${tx.installments_paid} paga(s)`
                              : ''}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">{renderTypeBadge(tx.type)}</td>

                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {tx.description}
                        {tx.notes && (
                          <div className="text-xs font-normal text-slate-400">{tx.notes}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-800">
                          {account?.type === 'credit_card' ? (
                            <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          {account?.name || 'Conta'}
                          {tx.type === 'transfer' && targetAcc && (
                            <span className="text-blue-700 font-bold flex items-center gap-1">
                              → {targetAcc.name}
                            </span>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {isNeutral ? (
                          <span className="text-xs text-slate-400 italic">Movimento Neutro</span>
                        ) : (
                          <>
                            <div className="text-xs font-bold text-slate-800">
                              {category?.name || 'Sem Categoria'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {category?.group_level1} • {category?.group_level2}
                            </div>
                          </>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isInstallmentTransaction(tx) ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            {tx.installments_total}x de{' '}
                            {formatCurrency(
                              installmentValue(tx.amount, tx.installments_total ?? 1),
                            )}
                            {regime === 'cash' && (
                              <span className="ml-1 font-normal text-purple-600">
                                • desembolso a partir de {firstCashMonthFor(tx, accounts)}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                              tx.competence_month === tx.cash_month
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-purple-50 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {tx.competence_month === tx.cash_month
                              ? 'Mesmo mês'
                              : `Desembolso: ${tx.cash_month}`}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-black">
                        <span
                          className={
                            isIncome
                              ? 'text-emerald-600'
                              : isExpense
                                ? 'text-rose-600'
                                : 'text-slate-700'
                          }
                        >
                          {isIncome ? '+ ' : isExpense ? '- ' : ''}
                          {regime === 'cash' && isInstallmentTransaction(tx)
                            ? formatCurrency(cashValueForMonth(tx, selectedMonth, accounts))
                            : formatCurrency(tx.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Alterar lançamento"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={(val) => {
          setDialogOpen(val)
          if (!val) setEditingTransaction(null)
        }}
        isEditing={!!editingTransaction}
        type={type}
        setType={setType}
        description={description}
        setDescription={setDescription}
        amount={amount}
        setAmount={setAmount}
        date={date}
        setDate={setDate}
        accountId={accountId}
        setAccountId={setAccountId}
        targetAccountId={targetAccountId}
        setTargetAccountId={setTargetAccountId}
        selectedInvoiceId={selectedInvoiceId}
        setSelectedInvoiceId={setSelectedInvoiceId}
        categoryId={categoryId}
        setCategoryId={setCategoryId}
        notes={notes}
        setNotes={setNotes}
        installmentsTotal={installmentsTotal}
        setInstallmentsTotal={setInstallmentsTotal}
        installmentsPaid={installmentsPaid}
        setInstallmentsPaid={setInstallmentsPaid}
        accounts={accounts}
        categories={categories}
        openInvoices={openInvoices}
        saving={saving}
        onSubmit={handleSubmitTransaction}
      />
    </div>
  )
}
