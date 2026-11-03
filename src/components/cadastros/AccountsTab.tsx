import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Wallet,
  CreditCard,
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  SwitchCamera,
  PiggyBank,
  TrendingUp,
  Banknote,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { accountsService } from '@/services/accounts'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { AccountRecord, AccountType } from '@/types/finance'
import { accountTypeLabels } from '@/types/cadastros'

const ACCOUNT_TYPES: AccountType[] = ['checking', 'savings', 'cash', 'investment', 'credit_card']

const TYPE_ICONS: Record<AccountType, React.ReactNode> = {
  checking: <Wallet className="w-5 h-5" />,
  savings: <PiggyBank className="w-5 h-5" />,
  cash: <Banknote className="w-5 h-5" />,
  investment: <TrendingUp className="w-5 h-5" />,
  credit_card: <CreditCard className="w-5 h-5" />,
}

interface AccountForm {
  id?: string
  name: string
  type: AccountType
  initial_balance: string
  current_balance: string
  credit_limit: string
  closing_day: string
  due_day: string
  status: 'active' | 'archived'
}

const emptyForm = (): AccountForm => ({
  name: '',
  type: 'checking',
  initial_balance: '0',
  current_balance: '0',
  credit_limit: '',
  closing_day: '',
  due_day: '',
  status: 'active',
})

export const AccountsTab: React.FC = () => {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AccountForm>(emptyForm())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAccounts(await accountsService.list(undefined, { includeArchived: true }))
    } catch (err) {
      toast({
        title: 'Erro ao carregar contas',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (a: AccountRecord) => {
    setForm({
      id: a.id,
      name: a.name,
      type: a.type,
      initial_balance: String(a.initial_balance ?? 0),
      current_balance: String(a.current_balance ?? 0),
      credit_limit: a.credit_limit ? String(a.credit_limit) : '',
      closing_day: a.closing_day ? String(a.closing_day) : '',
      due_day: a.due_day ? String(a.due_day) : '',
      status: a.status ?? 'active',
    })
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const isCredit = form.type === 'credit_card'
      const payload: Partial<AccountRecord> = {
        name: form.name.trim(),
        type: form.type,
        status: form.status,
        initial_balance: parseFloat(form.initial_balance) || 0,
        current_balance: parseFloat(form.current_balance) || 0,
        credit_limit: isCredit ? parseFloat(form.credit_limit) || 0 : 0,
        closing_day: isCredit ? parseInt(form.closing_day, 10) || 0 : 0,
        due_day: isCredit ? parseInt(form.due_day, 10) || 0 : 0,
      }

      if (form.id) {
        await accountsService.update(form.id, payload)
        toast({ title: 'Conta atualizada!', description: `${form.name} foi atualizada.` })
      } else {
        await accountsService.create(payload)
        toast({ title: 'Conta cadastrada!', description: `${form.name} está pronta para uso.` })
      }
      setDialogOpen(false)
      load()
    } catch (err) {
      toast({
        title: 'Erro ao salvar conta',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleArchive = async (a: AccountRecord) => {
    const next = (a.status ?? 'active') === 'archived' ? 'active' : 'archived'
    try {
      await accountsService.update(a.id, { status: next })
      toast({
        title: next === 'archived' ? 'Conta arquivada' : 'Conta reativada',
        description:
          next === 'archived'
            ? `${a.name} saiu das listas de lançamento, mas o histórico foi preservado.`
            : `${a.name} voltou para a lista de contas ativas.`,
      })
      load()
    } catch (err) {
      toast({
        title: 'Erro ao atualizar conta',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const visible = showArchived
    ? accounts
    : accounts.filter((a) => (a.status ?? 'active') === 'active')
  const archivedCount = accounts.filter((a) => (a.status ?? 'active') === 'archived').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {visible.length} {visible.length === 1 ? 'conta' : 'contas'}
          {archivedCount > 0 && !showArchived && ` · ${archivedCount} arquivada(s) oculta(s)`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs font-bold rounded-xl border-slate-200"
          >
            {showArchived ? 'Ocultar arquivadas' : `Arquivadas (${archivedCount})`}
          </Button>
          <Button
            onClick={openCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Nova Conta/Cartão
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-slate-200 rounded-2xl bg-white animate-pulse">
              <CardContent className="p-5 h-32" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((a) => {
            const isCredit = a.type === 'credit_card'
            const isArchived = (a.status ?? 'active') === 'archived'
            return (
              <Card
                key={a.id}
                className={`border shadow-xs rounded-2xl bg-white p-5 space-y-3 ${
                  isArchived ? 'border-slate-200 opacity-70' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isCredit
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {TYPE_ICONS[a.type] ?? <Wallet className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{a.name}</h3>
                      <p className="text-xs text-slate-500">
                        {accountTypeLabels[a.type] ?? a.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(a)}
                      className="h-8 w-8 text-slate-500 hover:text-slate-900"
                      aria-label={`Editar ${a.name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleArchive(a)}
                      className="h-8 w-8 text-slate-500 hover:text-slate-900"
                      aria-label={isArchived ? `Reativar ${a.name}` : `Arquivar ${a.name}`}
                    >
                      {isArchived ? (
                        <ArchiveRestore className="w-4 h-4" />
                      ) : (
                        <Archive className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isCredit ? 'Limite disponível' : 'Saldo atual'}
                  </span>
                  <p className="text-lg font-black text-slate-900">
                    {isCredit
                      ? formatCurrency((a.credit_limit ?? 0) - (a.current_balance ?? 0))
                      : formatCurrency(a.current_balance ?? 0)}
                  </p>
                </div>

                {isCredit && (
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold border-slate-200 text-slate-600"
                    >
                      Limite {formatCurrency(a.credit_limit ?? 0)}
                    </Badge>
                    {(a.closing_day ?? 0) > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold border-slate-200 text-slate-600"
                      >
                        Fecha dia {a.closing_day}
                      </Badge>
                    )}
                    {(a.due_day ?? 0) > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold border-slate-200 text-slate-600"
                      >
                        Vence dia {a.due_day}
                      </Badge>
                    )}
                  </div>
                )}

                {isArchived && (
                  <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-200">
                    Arquivada
                  </Badge>
                )}
              </Card>
            )
          })}

          {visible.length === 0 && (
            <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
              <Wallet className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                {showArchived ? 'Nenhuma conta arquivada' : 'Nenhuma conta cadastrada'}
              </h3>
              <p className="text-xs max-w-md mx-auto">
                Cadastre bancos, carteiras e cartões para organizar seus lançamentos.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal de Conta/Cartão */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {form.id ? 'Editar Conta/Cartão' : 'Nova Conta/Cartão'}
            </DialogTitle>
            <DialogDescription>
              Bancos, carteiras, investimentos e cartões de crédito do seu lar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="accName">Nome</Label>
              <Input
                id="accName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Nubank, Carteira, Poupança..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accType">Tipo</Label>
              <select
                id="accType"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {accountTypeLabels[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="accInitial">Saldo inicial (R$)</Label>
                <Input
                  id="accInitial"
                  type="number"
                  step="0.01"
                  value={form.initial_balance}
                  onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="accCurrent">Saldo atual (R$)</Label>
                <Input
                  id="accCurrent"
                  type="number"
                  step="0.01"
                  value={form.current_balance}
                  onChange={(e) => setForm({ ...form, current_balance: e.target.value })}
                />
              </div>
            </div>

            {form.type === 'credit_card' && (
              <div className="space-y-3 p-3 bg-violet-50 border border-violet-100 rounded-xl">
                <p className="text-[11px] font-bold text-violet-800 uppercase tracking-wider flex items-center gap-1.5">
                  <SwitchCamera className="w-3.5 h-3.5" /> Específico do cartão
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="accLimit">Limite de crédito (R$)</Label>
                  <Input
                    id="accLimit"
                    type="number"
                    step="0.01"
                    value={form.credit_limit}
                    onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
                    placeholder="5000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="accClosing">Dia de fechamento</Label>
                    <Input
                      id="accClosing"
                      type="number"
                      min="1"
                      max="31"
                      value={form.closing_day}
                      onChange={(e) => setForm({ ...form, closing_day: e.target.value })}
                      placeholder="25"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="accDue">Vencimento da fatura</Label>
                    <Input
                      id="accDue"
                      type="number"
                      min="1"
                      max="31"
                      value={form.due_day}
                      onChange={(e) => setForm({ ...form, due_day: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                </div>
              </div>
            )}

            {form.id && (
              <div className="space-y-1.5">
                <Label htmlFor="accStatus">Status</Label>
                <select
                  id="accStatus"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as 'active' | 'archived' })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800"
                >
                  <option value="active">Ativo</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? 'Salvando...' : form.id ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
