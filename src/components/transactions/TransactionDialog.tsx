import React from 'react'
import {
  AccountRecord,
  CategoryRecord,
  DeparaRuleRecord,
  InvoiceRecord,
  TransactionType,
} from '@/types/finance'
import { deparaService } from '@/services/depara'
import { useEffect, useRef, useState } from 'react'
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
import { Mic, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CategoryCascadeSelect } from '@/components/transactions/CategoryCascadeSelect'
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Receipt,
  CreditCard,
  Sparkles,
} from 'lucide-react'
import { installmentValue, firstCashMonth } from '@/services/installments'
import { accountsService } from '@/services/accounts'
import { categoriesService } from '@/services/categories'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEditing?: boolean
  type: TransactionType
  setType: (t: TransactionType) => void
  description: string
  setDescription: (d: string) => void
  amount: string
  setAmount: (a: string) => void
  date: string
  setDate: (d: string) => void
  accountId: string
  setAccountId: (id: string) => void
  targetAccountId: string
  setTargetAccountId: (id: string) => void
  selectedInvoiceId: string
  setSelectedInvoiceId: (id: string) => void
  categoryId: string
  setCategoryId: (id: string) => void
  notes: string
  setNotes: (n: string) => void
  installmentsTotal: string
  setInstallmentsTotal: (i: string) => void
  installmentsPaid: string
  setInstallmentsPaid: (i: string) => void
  accounts: AccountRecord[]
  categories: CategoryRecord[]
  openInvoices: InvoiceRecord[]
  /** Regras De-Para aprendidas: sugerem categoria conforme o usuário digita. */
  deparaRules?: DeparaRuleRecord[]
  saving: boolean
  onSubmit: (e: React.FormEvent) => void
  // Preenchimento por voz: campos reconhecidos ficam destacados; campos não
  // reconhecidos aparecem com dica para preenchimento manual.
  voiceFields?: Record<string, boolean>
  voiceAccountLabel?: string
  voiceHints?: string[]
}

const voiceHighlight = (flag?: boolean): string =>
  flag ? 'ring-2 ring-amber-400 border-amber-300 bg-amber-50/60' : ''

export const TransactionDialog: React.FC<TransactionDialogProps> = ({
  open,
  onOpenChange,
  isEditing = false,
  type,
  setType,
  description,
  setDescription,
  amount,
  setAmount,
  date,
  setDate,
  accountId,
  setAccountId,
  targetAccountId,
  setTargetAccountId,
  selectedInvoiceId,
  setSelectedInvoiceId,
  categoryId,
  setCategoryId,
  notes,
  setNotes,
  installmentsTotal,
  setInstallmentsTotal,
  installmentsPaid,
  setInstallmentsPaid,
  accounts,
  categories,
  openInvoices,
  deparaRules = [],
  saving,
  onSubmit,
  voiceFields,
  voiceAccountLabel = '',
  voiceHints = [],
}) => {
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const isCreditCard = selectedAccount?.type === 'credit_card'
  const isVoice = !!voiceFields
  const vField = (k: string) => !!voiceFields?.[k]

  // Sugestão automática de categoria conforme o usuário digita a descrição:
  // usa as regras De-Para aprendidas. Só preenche se o campo ainda está vazio
  // (nunca sobrescreve a escolha do usuário) e o campo segue editável.
  const [suggestedLabel, setSuggestedLabel] = useState<string>('')
  const userPickedCategory = useRef<boolean>(false)
  useEffect(() => {
    userPickedCategory.current = false
    setSuggestedLabel('')
    if (open && !accountId && accounts.length > 0) {
      setAccountId(accounts[0].id)
    }
  }, [open, accountId, accounts, setAccountId])

  useEffect(() => {
    if (!open || userPickedCategory.current) return
    const trimmed = description.trim()
    if (!trimmed) {
      setSuggestedLabel('')
      return
    }
    const suggestion = deparaService.suggestCategory(trimmed, deparaRules, categories)
    if (!suggestion?.categoryId || suggestion.categoryId === categoryId) {
      setSuggestedLabel('')
      return
    }
    setCategoryId(suggestion.categoryId)
    setSuggestedLabel(
      suggestion.source === 'exact'
        ? 'Categoria preenchida pela regra aprendida — pode trocar se quiser.'
        : 'Categoria sugerida — pode trocar se quiser.',
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, open])

  const handleCategoryChange = (id: string) => {
    userPickedCategory.current = true
    setSuggestedLabel('')
    setCategoryId(id)
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {isEditing ? 'Alterar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados deste lançamento (valor, data, categoria, conta ou observações).'
              : 'Selecione a situação da movimentação bancária: Despesa, Receita, Transferência entre contas ou Pagamento de fatura.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          {isVoice && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <Mic className="w-3.5 h-3.5" /> Preenchido por voz — revise antes de salvar
              </div>
              <p className="text-[11px] leading-snug">
                Os campos destacados em amarelo foram reconhecidos pela fala. Nada foi gravado
                ainda: edite o que precisar e confirme.
                {voiceAccountLabel && (
                  <>
                    {' '}
                    Meio de pagamento ouvido: <strong>{voiceAccountLabel}</strong>
                    {vField('account') ? ' (conta encontrada)' : ' (selecione a conta abaixo)'}.
                  </>
                )}
              </p>
              {voiceHints.length > 0 && (
                <div className="space-y-1 pt-1">
                  {voiceHints.map((hint, i) => (
                    <p
                      key={i}
                      className="text-[11px] flex items-start gap-1.5 bg-white/70 border border-amber-200 rounded-lg px-2 py-1.5"
                    >
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-600" />
                      {hint}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Opções de Tipo de Movimento */}
          {isEditing && (type === 'transfer' || type === 'invoice_payment') ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="text-slate-500">Tipo de movimentação:</span>
              <span className="font-bold text-slate-900">
                {type === 'transfer' ? 'Transferência entre Contas' : 'Pagamento de Fatura'}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={cn(
                  'py-2 px-2 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all',
                  type === 'expense'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                  voiceHighlight(vField('type')),
                )}
              >
                <TrendingDown className="w-4 h-4 text-rose-600" /> Despesa
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={cn(
                  'py-2 px-2 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all',
                  type === 'income'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                  type === 'expense' ? '' : voiceHighlight(vField('type')),
                )}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Receita
              </button>
              <button
                type="button"
                onClick={() => setType('transfer')}
                className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  type === 'transfer'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4 text-blue-600" /> Transferência
              </button>
              <button
                type="button"
                onClick={() => setType('invoice_payment')}
                className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  type === 'invoice_payment'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Receipt className="w-4 h-4 text-purple-600" /> Pagto Fatura
              </button>
            </div>
          )}

          {/* Aviso de movimento neutro */}
          {type === 'transfer' && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Transferência entre contas:</strong> debita a conta de origem e credita a
                conta de destino. Não gera receita nem despesa nos indicadores e no fluxo.
              </span>
            </div>
          )}

          {type === 'invoice_payment' && (
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-800 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Pagamento de fatura:</strong> debita a conta pagadora e quita a fatura
                conciliada. Não gera despesa duplicada, pois o gasto original já foi lançado.
              </span>
            </div>
          )}

          {/* Seletor de Fatura Aberta para Pagto de Fatura */}
          {type === 'invoice_payment' && (
            <div className="space-y-1.5">
              <Label htmlFor="invSelect">Fatura a quitar</Label>
              {openInvoices.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  Nenhuma fatura aberta encontrada. Crie primeiro a fatura no menu{' '}
                  <strong>Faturas</strong> para conciliá-la.
                </p>
              ) : (
                <select
                  id="invSelect"
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value)
                    const inv = openInvoices.find((i) => i.id === e.target.value)
                    if (inv) setAmount(String(inv.total_amount || ''))
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      Fatura {inv.reference_month} • Total: {formatCurrency(inv.total_amount || 0)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Descrição */}
          {type !== 'invoice_payment' && (
            <div className="space-y-1.5">
              <Label htmlFor="desc">Descrição</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  type === 'transfer'
                    ? 'Ex: Transferência da Corrente para Poupança'
                    : 'Ex: Supermercado, Aluguel, Salário...'
                }
                required={type !== 'transfer'}
                className={voiceHighlight(vField('description'))}
              />
            </div>
          )}

          {/* Valor e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amt">Valor (R$)</Label>
              <Input
                id="amt"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className={voiceHighlight(vField('amount'))}
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
                className={voiceHighlight(vField('date'))}
              />
            </div>
          </div>

          {/* Contas: Origem e Destino */}
          {type === 'transfer' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="srcAcc">Conta de Origem (Sai)</Label>
                <select
                  id="srcAcc"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tgtAcc">Conta de Destino (Entra)</Label>
                <select
                  id="tgtAcc"
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="acc">
                {type === 'invoice_payment' ? 'Conta Pagadora (Banco/Dinheiro)' : 'Conta / Cartão'}
              </Label>
              <select
                id="acc"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className={cn(
                  'w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500',
                  voiceHighlight(vField('account')),
                )}
                required
              >
                <option value="">Selecione uma conta ou cartão...</option>
                {accounts
                  .filter((a) => (type === 'invoice_payment' ? a.type !== 'credit_card' : true))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type === 'credit_card' ? 'Cartão de Crédito' : 'Conta/Dinheiro'})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Categoria e Subgrupo em cascata: Apenas para Despesa e Receita */}
          {(type === 'expense' || type === 'income') && (
            <div className="space-y-1.5">
              <CategoryCascadeSelect
                categories={activeCategories}
                type={type === 'income' ? 'income' : 'expense'}
                categoryId={categoryId}
                onCategoryChange={handleCategoryChange}
              />
              {suggestedLabel && (
                <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> {suggestedLabel}
                </p>
              )}
            </div>
          )}

          {/* Parcelamento para despesa no cartão */}
          {type === 'expense' && isCreditCard && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-purple-50 border border-purple-200">
              <div className="col-span-2 flex items-center gap-1.5 text-[11px] font-bold text-purple-800">
                <CreditCard className="w-3.5 h-3.5" /> Parcelamento no cartão
                <span className="font-normal text-purple-600">
                  — o valor total entra na competência deste mês; o caixa mostra 1 parcela por mês
                  até quitar.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inst">Em quantas parcelas?</Label>
                <Input
                  id="inst"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={48}
                  value={installmentsTotal}
                  onChange={(e) => setInstallmentsTotal(e.target.value)}
                  placeholder="1 = à vista"
                  className={voiceHighlight(vField('installments'))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="instPaid">Quantas já foram pagas?</Label>
                <Input
                  id="instPaid"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={installmentsPaid}
                  onChange={(e) => setInstallmentsPaid(e.target.value)}
                  placeholder="0"
                  disabled={!installmentsTotal || parseInt(installmentsTotal, 10) <= 1}
                />
              </div>

              {installmentsTotal && parseInt(installmentsTotal, 10) > 1 && amount && (
                <p className="col-span-2 text-[11px] font-semibold text-purple-700">
                  {formatCurrency(parseFloat(amount) || 0)} na competência de {date.slice(0, 7)} •{' '}
                  {installmentsTotal}x de{' '}
                  {formatCurrency(
                    installmentValue(parseFloat(amount) || 0, parseInt(installmentsTotal, 10)),
                  )}{' '}
                  no caixa, começando em{' '}
                  {selectedAccount?.closing_day && selectedAccount?.due_day
                    ? firstCashMonth(date, selectedAccount.closing_day, selectedAccount.due_day)
                    : date.slice(0, 7)}
                  .
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="nt">Observações (opcional)</Label>
            <Input
              id="nt"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pagamento Pix, TED, observação da fatura..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || (type === 'invoice_payment' && !selectedInvoiceId)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {saving
                ? isEditing
                  ? 'Salvando alterações...'
                  : 'Salvando...'
                : isEditing
                  ? 'Salvar Alterações'
                  : 'Salvar Lançamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
