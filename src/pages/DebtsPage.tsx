import React, { useState, useEffect } from 'react'
import { debtsService, DebtSimulationResult } from '@/services/debts'
import { DebtRecord, DebtStatus } from '@/types/finance'
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
  Snowflake,
  Flame,
  PlusCircle,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  Pencil,
  Trash2,
  Clock,
  Check,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const DebtsPage: React.FC = () => {
  const { toast } = useToast()
  const [debts, setDebts] = useState<DebtRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Simulador
  const [simulationMethod, setSimulationMethod] = useState<'snowball' | 'avalanche'>('snowball')
  const [extraMonthlyBudget, setExtraMonthlyBudget] = useState<string>('300')
  const [simulationResult, setSimulationResult] = useState<{
    months: number
    totalInterest: number
    steps: DebtSimulationResult[]
  } | null>(null)

  // Modal de Criação / Edição de Dívida
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null)
  const [creditor, setCreditor] = useState<string>('')
  const [totalDebt, setTotalDebt] = useState<string>('')
  const [currentBalance, setCurrentBalance] = useState<string>('')
  const [interestRate, setInterestRate] = useState<string>('8.5')
  const [minimumPayment, setMinimumPayment] = useState<string>('200')
  const [dueDay, setDueDay] = useState<string>('')
  const [status, setStatus] = useState<DebtStatus>('active')
  const [notes, setNotes] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)

  // Modal de Exclusão
  const [deletingDebt, setDeletingDebt] = useState<DebtRecord | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await debtsService.list()
      setDebts(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Executa a simulação sempre que mudar método, dívidas ou aporte extra
  useEffect(() => {
    const activeDebts = debts.filter((d) => (d.status ?? 'active') !== 'paid_off')
    if (activeDebts.length > 0) {
      const extra = parseFloat(extraMonthlyBudget) || 0
      const res = debtsService.simulatePayoff(activeDebts, simulationMethod, extra)
      setSimulationResult(res)
    } else {
      setSimulationResult(null)
    }
  }, [debts, simulationMethod, extraMonthlyBudget])

  const openCreateDialog = () => {
    setEditingDebt(null)
    setCreditor('')
    setTotalDebt('')
    setCurrentBalance('')
    setInterestRate('8.5')
    setMinimumPayment('200')
    setDueDay('')
    setStatus('active')
    setNotes('')
    setDialogOpen(true)
  }

  const openEditDialog = (d: DebtRecord) => {
    setEditingDebt(d)
    setCreditor(d.creditor)
    setTotalDebt(String(d.total_debt || d.current_balance))
    setCurrentBalance(String(d.current_balance))
    setInterestRate(String(d.interest_rate_monthly))
    setMinimumPayment(String(d.minimum_payment))
    setDueDay(d.due_day ? String(d.due_day) : '')
    setStatus(d.status || 'active')
    setNotes(d.notes || '')
    setDialogOpen(true)
  }

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!creditor || !currentBalance) return

    setSaving(true)
    try {
      const bal = parseFloat(currentBalance)
      const tot = parseFloat(totalDebt) || bal
      const payload: Partial<DebtRecord> = {
        creditor,
        total_debt: tot,
        current_balance: bal,
        interest_rate_monthly: parseFloat(interestRate) || 0,
        minimum_payment: parseFloat(minimumPayment) || 50,
        due_day: dueDay ? parseInt(dueDay, 10) : undefined,
        status,
        notes: notes || undefined,
      }

      if (editingDebt) {
        await debtsService.update(editingDebt.id, payload)
        toast({
          title: 'Dívida atualizada',
          description: `Os dados da dívida "${creditor}" foram alterados com sucesso.`,
        })
      } else {
        await debtsService.create(payload)
        toast({
          title: 'Dívida cadastrada com acolhimento',
          description: 'Primeiro passo dado: quem conhece seus números domina seu futuro.',
        })
      }

      setDialogOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: editingDebt ? 'Erro ao atualizar' : 'Erro ao cadastrar',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePrompt = (d: DebtRecord) => {
    setDeletingDebt(d)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingDebt) return
    setIsDeleting(true)
    try {
      await debtsService.delete(deletingDebt.id)
      toast({
        title: 'Dívida excluída',
        description: `A dívida com "${deletingDebt.creditor}" foi removida com sucesso.`,
      })
      setDeleteConfirmOpen(false)
      setDeletingDebt(null)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir dívida', description: err.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleStatus = async (d: DebtRecord) => {
    try {
      const newStatus: DebtStatus = d.status === 'paid_off' ? 'active' : 'paid_off'
      await debtsService.update(d.id, {
        status: newStatus,
        current_balance: newStatus === 'paid_off' ? 0 : (d.total_debt || d.minimum_payment),
      })
      toast({
        title: newStatus === 'paid_off' ? '🎉 Parabéns! Dívida quitada!' : 'Dívida reativada',
        description: newStatus === 'paid_off'
          ? `A dívida com "${d.creditor}" foi marcada como quitada.`
          : `A dívida com "${d.creditor}" voltou ao status ativo.`,
      })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao alterar status', description: err.message, variant: 'destructive' })
    }
  }

  const totalDebtBalance = debts.reduce((acc, d) => acc + d.current_balance, 0)
  const totalMinPayment = debts.reduce((acc, d) => acc + d.minimum_payment, 0)

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
      {/* Header com Acolhimento */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Quitação de Dívidas com Acolhimento
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex-shrink-0">
              Sem Julgamentos
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Sair das dívidas não é sobre culpa do passado: é sobre estratégia clara para os próximos
            meses. Simule os métodos Bola de Neve e Avalanche.
          </p>
        </div>

        <Button
          onClick={openCreateDialog}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl text-xs font-bold h-10 shadow-xs"
        >
          <PlusCircle className="w-4 h-4" /> Cadastrar Dívida
        </Button>
      </div>

      {/* Cards Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white p-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Saldo Devedor Total
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {formatCurrency(totalDebtBalance)}
          </div>
          <p className="text-xs text-slate-500 mt-1">{debts.length} débitos mapeados</p>
        </Card>

        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white p-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Pagamento Mínimo Comprometido
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(totalMinPayment)} / mês
          </div>
          <p className="text-xs text-slate-500 mt-1">Soma das parcelas mínimas atuais</p>
        </Card>

        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white p-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Prazo Estimado de Liberdade
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {simulationResult ? `${simulationResult.months} Meses` : '--'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pelo método {simulationMethod === 'snowball' ? 'Bola de Neve' : 'Avalanche'}
          </p>
        </Card>
      </div>

      {/* Simulador Bola de Neve vs Avalanche */}
      <Card className="border-slate-200 shadow-xs rounded-2xl bg-white p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Simulador Interativo: Bola de Neve vs. Avalanche
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha a melhor estratégia psicológica ou matemática para acelerar sua quitação.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Método */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setSimulationMethod('snowball')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  simulationMethod === 'snowball'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Snowflake className="w-3.5 h-3.5 text-indigo-600" />
                Bola de Neve (Menor Saldo)
              </button>
              <button
                onClick={() => setSimulationMethod('avalanche')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  simulationMethod === 'avalanche'
                    ? 'bg-white text-rose-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                Avalanche (Maior Juros)
              </button>
            </div>

            {/* Aporte Extra */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Label htmlFor="extraAporte">Aporte Extra Mensal:</Label>
              <Input
                id="extraAporte"
                type="number"
                value={extraMonthlyBudget}
                onChange={(e) => setExtraMonthlyBudget(e.target.value)}
                className="w-24 h-8 text-xs font-bold bg-slate-50"
                placeholder="R$ 300"
              />
            </div>
          </div>
        </div>

        {/* Comparativo de Estratégias */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-xl border-2 transition-all ${
              simulationMethod === 'snowball'
                ? 'border-indigo-500 bg-indigo-50/40'
                : 'border-slate-100 bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm">
              <Snowflake className="w-4 h-4 text-indigo-600" /> Método Bola de Neve (Psicologia e
              Motivação)
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Paga o mínimo em todas e ataca com força total a dívida de{' '}
              <strong>menor saldo</strong>. Assim que ela zera, você sente o alívio e redireciona a
              parcela para a próxima.
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border-2 transition-all ${
              simulationMethod === 'avalanche'
                ? 'border-rose-500 bg-rose-50/40'
                : 'border-slate-100 bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-rose-950 text-sm">
              <Flame className="w-4 h-4 text-rose-600" /> Método Avalanche (Matemática e Economia)
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Ataca primeiro a dívida com a <strong>maior taxa de juros</strong> (ex: rotativo do
              cartão). Economiza o máximo de dinheiro em juros bancários.
            </p>
          </div>
        </div>

        {/* Projeção Mês a Mês */}
        {simulationResult && simulationResult.steps.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Projeção dos Próximos Meses de Quitação
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {simulationResult.steps.slice(0, 12).map((st) => (
                <div
                  key={st.month}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center"
                >
                  <span className="text-[10px] font-bold text-slate-400 block">Mês {st.month}</span>
                  <span className="text-xs font-black text-slate-800 block mt-0.5">
                    {formatCurrency(st.totalRemaining)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                    {st.debtsState.filter((d) => d.paidOff).length} quitadas
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Lista de Dívidas Cadastradas com Ações de Alteração e Exclusão */}
      <Card className="border-slate-200 shadow-xs rounded-2xl bg-white overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Suas Dívidas Cadastradas ({debts.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Gerencie, altere valores ou exclua débitos a qualquer momento
          </span>
        </div>

        <div className="space-y-3">
          {debts.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Nenhuma dívida cadastrada no momento.</p>
              <p className="text-xs text-slate-500">
                Caso tenha empréstimos, cheque especial ou faturas pendentes, cadastre-os para planejar a quitação.
              </p>
              <Button
                onClick={openCreateDialog}
                size="sm"
                className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Cadastrar Dívida
              </Button>
            </div>
          ) : (
            debts.map((d) => {
              const isPaid = (d.status ?? 'active') === 'paid_off' || d.current_balance <= 0
              const isNegotiating = d.status === 'negotiating'

              return (
                <div
                  key={d.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isPaid
                      ? 'bg-emerald-50/50 border-emerald-200 opacity-90'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-slate-900 text-base">{d.creditor}</h4>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Check className="w-3 h-3" /> Quitada
                        </span>
                      ) : isNegotiating ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3" /> Em Negociação
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Ativa
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>
                        Taxa de Juros:{' '}
                        <strong className="text-rose-600 font-bold">{d.interest_rate_monthly}% a.m.</strong>
                      </span>
                      <span>
                        Pagamento Mínimo:{' '}
                        <strong className="text-slate-800 font-bold">{formatCurrency(d.minimum_payment)}</strong>
                      </span>
                      {d.due_day && (
                        <span>
                          Vencimento: <strong className="text-slate-800 font-bold">Dia {d.due_day}</strong>
                        </span>
                      )}
                      {d.total_debt && d.total_debt > d.current_balance && (
                        <span className="text-slate-400">
                          (Original: {formatCurrency(d.total_debt)})
                        </span>
                      )}
                    </div>

                    {d.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 max-w-xl">
                        {d.notes}
                      </p>
                    )}
                  </div>

                  {/* Saldo e Botões de Ação */}
                  <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Saldo Devedor Atual
                      </span>
                      <span
                        className={`text-lg font-black ${
                          isPaid ? 'text-emerald-700 line-through' : 'text-rose-600'
                        }`}
                      >
                        {formatCurrency(d.current_balance)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Botão de Toggle Quitação Rápida */}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStatus(d)}
                        title={isPaid ? 'Reativar dívida' : 'Marcar como quitada'}
                        className={`h-8 px-2.5 text-xs font-semibold rounded-lg ${
                          isPaid
                            ? 'text-emerald-700 hover:bg-emerald-100'
                            : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {isPaid ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Quitada
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Quitar
                          </span>
                        )}
                      </Button>

                      {/* Botão Alterar / Editar */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(d)}
                        className="h-8 px-2.5 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 rounded-lg border-slate-200 gap-1.5 shadow-2xs"
                        title="Alterar dados desta dívida"
                      >
                        <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Alterar</span>
                      </Button>

                      {/* Botão Excluir */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePrompt(d)}
                        className="h-8 px-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300 rounded-lg border-slate-200 gap-1.5 shadow-2xs"
                        title="Excluir esta dívida"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Excluir</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Roteiro Humanizado de Negociação */}
      <Card className="border-emerald-200 shadow-xs rounded-2xl bg-emerald-50/60 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <PhoneCall className="w-5 h-5 text-emerald-700" />
          <h3 className="text-base font-bold text-emerald-950">
            Roteiro de Negociação com Credores
          </h3>
        </div>
        <p className="text-xs text-emerald-900 leading-relaxed">
          Antes de aceitar qualquer proposta de renegociação do banco, lembre-se destas 3 regras de
          ouro:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
            <span className="font-bold text-xs text-emerald-800 block">
              1. Não aceite a primeira oferta
            </span>
            <span className="text-xs text-slate-600">
              O atendente sempre começa com juros altos. Peça o Custo Efetivo Total (CET) anual por
              escrito.
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
            <span className="font-bold text-xs text-emerald-800 block">
              2. Proposta dentro do seu fluxo
            </span>
            <span className="text-xs text-slate-600">
              Nunca assine uma parcela que ultrapasse o que sobra do seu orçamento, para não atrasar
              novamente.
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
            <span className="font-bold text-xs text-emerald-800 block">
              3. Desconto para quitação à vista
            </span>
            <span className="text-xs text-slate-600">
              Se conseguir juntar uma reserva, feirões do Desenrola ou Serasa chegam a 80% a 95% de
              desconto no valor total.
            </span>
          </div>
        </div>
      </Card>

      {/* Modal de Criação / Edição de Dívida */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingDebt ? 'Alterar Dados da Dívida' : 'Cadastrar Dívida'}
            </DialogTitle>
            <DialogDescription>
              {editingDebt
                ? `Atualize o saldo, juros, vencimento ou status do credor "${editingDebt.creditor}".`
                : 'Mapeie o credor para traçar o plano de quitação mais rápido.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDebt} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cred">Credor / Instituição Financeira</Label>
              <Input
                id="cred"
                value={creditor}
                onChange={(e) => setCreditor(e.target.value)}
                placeholder="Ex: Cartão Nubank, Empréstimo Itaú, Financiamento..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bal">Saldo Devedor Atual (R$)</Label>
                <Input
                  id="bal"
                  type="number"
                  step="0.01"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(e.target.value)}
                  placeholder="3000.00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tot">Valor Original / Total (R$)</Label>
                <Input
                  id="tot"
                  type="number"
                  step="0.01"
                  value={totalDebt}
                  onChange={(e) => setTotalDebt(e.target.value)}
                  placeholder="Ex: 5000.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rate">Juros Mensais (%)</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="8.5"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="minPay">Parcela / Mínimo (R$)</Label>
                <Input
                  id="minPay"
                  type="number"
                  step="0.01"
                  value={minimumPayment}
                  onChange={(e) => setMinimumPayment(e.target.value)}
                  placeholder="150.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="due">Dia de Vencimento</Label>
                <Input
                  id="due"
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="Ex: 10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dStatus">Status da Dívida</Label>
                <select
                  id="dStatus"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DebtStatus)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="active">Ativa</option>
                  <option value="negotiating">Em Negociação</option>
                  <option value="paid_off">Quitada</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dNotes">Anotações e Estratégia de Negociação</Label>
              <Input
                id="dNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Tentar 50% de desconto no feirão do Desenrola..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {saving
                  ? 'Salvando...'
                  : editingDebt
                    ? 'Salvar Alterações'
                    : 'Cadastrar Dívida'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Dívida */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Excluir Dívida?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              Tem certeza de que deseja remover o cadastro da dívida com{' '}
              <strong className="text-slate-900 font-bold">"{deletingDebt?.creditor}"</strong> (Saldo:{' '}
              {deletingDebt ? formatCurrency(deletingDebt.current_balance) : 'R$ 0,00'})?
              Esta ação removerá este registro do seu dispositivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
