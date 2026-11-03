import React, { useState, useEffect } from 'react'
import { transactionsService } from '@/services/transactions'
import { accountsService } from '@/services/accounts'
import { categoriesService } from '@/services/categories'
import { TransactionRecord, AccountRecord, CategoryRecord } from '@/types/finance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Trash2,
  CheckCircle,
  Clock,
  Sparkles,
  CreditCard,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const TransactionsPage: React.FC = () => {
  const { toast } = useToast()
  const currentMonthStr = new Date().toISOString().slice(0, 7)
  const todayStr = new Date().toISOString().slice(0, 10)

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr)
  const [regime, setRegime] = useState<'competence' | 'cash'>('competence')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')

  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Modal de criação
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [description, setDescription] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [accountId, setAccountId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [date, setDate] = useState<string>(todayStr)
  const [notes, setNotes] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [txs, accs, cats] = await Promise.all([
        transactionsService.list({ month: selectedMonth, regime }),
        accountsService.list(),
        categoriesService.list(),
      ])
      setTransactions(txs)
      setAccounts(accs)
      setCategories(cats)
      if (accs.length > 0 && !accountId) setAccountId(accs[0].id)
      if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id)
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
    if (!description || !amount || !accountId) return

    setSaving(true)
    try {
      const selectedAcc = accounts.find((a) => a.id === accountId)
      const parsedAmount = Math.abs(parseFloat(amount))
      const competenceMonth = date.slice(0, 7)

      // Cálculo automático de competência vs caixa para cartões de crédito
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

      await transactionsService.create({
        description,
        amount: parsedAmount,
        type,
        account_id: accountId,
        category_id: categoryId || undefined,
        date,
        competence_month: competenceMonth,
        cash_month: cashMonth,
        is_reconciled: true,
        notes: notes || undefined,
      })

      toast({
        title: 'Lançamento registrado!',
        description: `Salvo com competência em ${competenceMonth} e caixa em ${cashMonth}.`,
      })

      setDialogOpen(false)
      setDescription('')
      setAmount('')
      setNotes('')
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

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === 'all') return true
    return t.type === filterType
  })

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Lançamentos Financeiros
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Controle de receitas e despesas por mês de competência e desembolso de caixa.
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

      {/* Filtros por tipo */}
      <div className="flex items-center space-x-2">
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
      </div>

      {/* Lista de Transações */}
      <Card className="border-slate-200 shadow-xs rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Data / Mês</th>
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
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isExpense = tx.type === 'expense'
                  const account =
                    tx.expand?.account_id || accounts.find((a) => a.id === tx.account_id)
                  const category =
                    tx.expand?.category_id || categories.find((c) => c.id === tx.category_id)

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-900">{tx.date}</div>
                        <div className="text-[11px] text-slate-400">
                          Comp: {tx.competence_month}
                        </div>
                      </td>

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
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-800">
                          {category?.name || 'Sem Categoria'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {category?.group_level1} • {category?.group_level2}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
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
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-black">
                        <span className={isExpense ? 'text-rose-600' : 'text-emerald-600'}>
                          {isExpense ? '-' : '+'} {formatCurrency(tx.amount)}
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

      {/* Modal de Criação de Lançamento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Novo Lançamento</DialogTitle>
            <DialogDescription>
              Cadastre sua receita ou despesa. O mês de desembolso é calculado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTransaction} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'expense'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <TrendingDown className="w-4 h-4 text-rose-600" /> Despesa
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'income'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Receita
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Descrição</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Supermercado, Aluguel, Salário..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amt">Valor (R$)</Label>
                <Input
                  id="amt"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dt">Data da Operação</Label>
                <Input
                  id="dt"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc">Conta / Cartão</Label>
              <select
                id="acc"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type === 'credit_card' ? 'Cartão de Crédito' : 'Conta/Dinheiro'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat">Categoria (Plano de Contas)</Label>
              <select
                id="cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecione uma categoria...</option>
                {categories
                  .filter((c) => (type === 'income' ? c.type === 'income' : c.type === 'expense'))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.group_level1} &gt; {c.group_level2} &gt; {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nt">Observações (opcional)</Label>
              <Input
                id="nt"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Compra parcelada em 3x..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? 'Salvando...' : 'Salvar Lançamento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
