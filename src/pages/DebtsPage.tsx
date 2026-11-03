import React, { useState, useEffect } from 'react'
import { debtsService, DebtSimulationResult } from '@/services/debts'
import { DebtRecord } from '@/types/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  BadgeAlert,
  Snowflake,
  Flame,
  PlusCircle,
  HelpCircle,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  PhoneCall,
  FileText,
  Percent,
  Sparkles,
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

  // Modal de Nova Dívida
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [creditor, setCreditor] = useState<string>('')
  const [currentBalance, setCurrentBalance] = useState<string>('')
  const [interestRate, setInterestRate] = useState<string>('8.5')
  const [minimumPayment, setMinimumPayment] = useState<string>('200')
  const [notes, setNotes] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)

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
    if (debts.length > 0) {
      const extra = parseFloat(extraMonthlyBudget) || 0
      const res = debtsService.simulatePayoff(debts, simulationMethod, extra)
      setSimulationResult(res)
    } else {
      setSimulationResult(null)
    }
  }, [debts, simulationMethod, extraMonthlyBudget])

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!creditor || !currentBalance) return

    setSaving(true)
    try {
      const bal = parseFloat(currentBalance)
      await debtsService.create({
        creditor,
        total_debt: bal,
        current_balance: bal,
        interest_rate_monthly: parseFloat(interestRate) || 0,
        minimum_payment: parseFloat(minimumPayment) || 50,
        status: 'active',
        notes: notes || undefined,
      })

      toast({
        title: 'Dívida cadastrada com acolhimento',
        description: 'Primeiro passo dado: quem conhece seus números domina seu futuro.',
      })

      setDialogOpen(false)
      setCreditor('')
      setCurrentBalance('')
      setNotes('')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const totalDebtBalance = debts.reduce((acc, d) => acc + d.current_balance, 0)
  const totalMinPayment = debts.reduce((acc, d) => acc + d.minimum_payment, 0)

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header com Acolhimento */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Quitação de Dívidas com Acolhimento
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Sem Julgamentos
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Sair das dívidas não é sobre culpa do passado: é sobre estratégia clara para os próximos
            meses. Simule os métodos Bola de Neve e Avalanche.
          </p>
        </div>

        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl text-xs font-bold"
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

      {/* Lista de Dívidas Cadastradas */}
      <Card className="border-slate-200 shadow-xs rounded-2xl bg-white overflow-hidden p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Suas Dívidas Atuais ({debts.length})</h3>

        <div className="space-y-3">
          {debts.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Nenhuma dívida cadastrada. Parabéns!
            </p>
          ) : (
            debts.map((d) => (
              <div
                key={d.id}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{d.creditor}</h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>
                      Taxa:{' '}
                      <strong className="text-rose-600">{d.interest_rate_monthly}% ao mês</strong>
                    </span>
                    <span>
                      Mínimo: <strong>{formatCurrency(d.minimum_payment)}</strong>
                    </span>
                    {d.due_day && (
                      <span>
                        Vence dia: <strong>{d.due_day}</strong>
                      </span>
                    )}
                  </div>
                  {d.notes && <p className="text-xs text-slate-400 mt-1">{d.notes}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Saldo Devedor
                    </span>
                    <span className="text-base font-black text-rose-600">
                      {formatCurrency(d.current_balance)}
                    </span>
                  </div>
                </div>
              </div>
            ))
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

      {/* Modal de Criação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Cadastrar Dívida</DialogTitle>
            <DialogDescription>
              Mapeie o credor para traçar o plano de quitação mais rápido.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDebt} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cred">Credor / Banco</Label>
              <Input
                id="cred"
                value={creditor}
                onChange={(e) => setCreditor(e.target.value)}
                placeholder="Ex: Cartão Santander, Empréstimo Itaú..."
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
                <Label htmlFor="rate">Juros Mensais (%)</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="8.5"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="minPay">Pagamento Mínimo Mensal (R$)</Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="dNotes">Anotações (opcional)</Label>
              <Input
                id="dNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Renegociar em novembro..."
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
                {saving ? 'Salvando...' : 'Salvar Dívida'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
