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

  // Modal de criação
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
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

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !accountId) return

    setSaving(true)
    try {
      const parsedAmount = Math.abs(parseFloat(amount))
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Informe um valor válido maior que zero.')
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Lançamentos Financeiros
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Controle de despesas, receitas, transferências entre contas e pagamentos de fatura.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setRegime('competence')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                regime === 'competence' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Competência
            </button>
            <button
              onClick={() => setRegime('cash')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                regime === 'cash' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Caixa
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
            />
          </div>

          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl"
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

      {/* Filtros por tipo de movimento */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-bold text-slate-500 mr-2">Filtrar:</span>
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
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

      {/* Lista de Transações */}
      <Card className="border-slate-200 shadow-xs rounded-2xl overflow-hidden bg-white">
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
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-sm">
                    Nenhum lançamento encontrado para os filtros selecionados.
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
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
        onOpenChange={setDialogOpen}
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
        onSubmit={handleCreateTransaction}
      />
    </div>
  )
}
