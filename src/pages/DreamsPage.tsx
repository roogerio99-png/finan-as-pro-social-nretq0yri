import React, { useState, useEffect } from 'react'
import { dreamsService } from '@/services/dreams'
import { DreamRecord } from '@/types/finance'
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
  Sparkles,
  Target,
  PlusCircle,
  Scissors,
  CheckCircle,
  Calendar,
  Shield,
  Plane,
  Car,
  Home,
  Heart,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const DreamsPage: React.FC = () => {
  const { toast } = useToast()
  const [dreams, setDreams] = useState<DreamRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Tradutor Comportamental de Cortes de Gastos
  const [expenseCutAmount, setExpenseCutAmount] = useState<string>('150')

  // Modal de Criação de Sonho
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [title, setTitle] = useState<string>('')
  const [targetAmount, setTargetAmount] = useState<string>('')
  const [currentAmount, setCurrentAmount] = useState<string>('0')
  const [targetDate, setTargetDate] = useState<string>('2026-12-31')
  const [monthlyContribution, setMonthlyContribution] = useState<string>('400')
  const [icon, setIcon] = useState<string>('Plane')
  const [saving, setSaving] = useState<boolean>(false)

  // Modal de Aporte Rápido
  const [contributionModalOpen, setContributionModalOpen] = useState<boolean>(false)
  const [selectedDreamId, setSelectedDreamId] = useState<string>('')
  const [contributionValue, setContributionValue] = useState<string>('200')

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await dreamsService.list()
      setDreams(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateDream = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !targetAmount) return

    setSaving(true)
    try {
      await dreamsService.create({
        title,
        target_amount: parseFloat(targetAmount) || 1000,
        current_amount: parseFloat(currentAmount) || 0,
        target_date: targetDate,
        monthly_contribution: parseFloat(monthlyContribution) || 100,
        icon,
        status: 'in_progress',
      })

      toast({
        title: 'Sonho registrado!',
        description: 'Toda grande conquista começa com uma meta clara e aportes constantes.',
      })

      setDialogOpen(false)
      setTitle('')
      setTargetAmount('')
      setCurrentAmount('0')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao criar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDreamId || !contributionValue) return

    try {
      await dreamsService.addContribution(selectedDreamId, parseFloat(contributionValue))
      toast({
        title: 'Aporte realizado com sucesso!',
        description: `Você está mais perto do seu sonho!`,
      })
      setContributionModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao aportar', description: err.message, variant: 'destructive' })
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const parsedCut = parseFloat(expenseCutAmount) || 0

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Metas & Sonhos de Longo Prazo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Acompanhe seus aportes, meça prazos e veja como cortes conscientes de gastos aceleram a
            realização do que realmente importa.
          </p>
        </div>

        <Button
          onClick={() => setDialogOpen(true)}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl text-xs font-bold h-10"
        >
          <PlusCircle className="w-4 h-4" /> Criar Novo Sonho
        </Button>
      </div>

      {/* Tradutor Comportamental de Cortes de Gastos */}
      <Card className="border-teal-200 shadow-xs rounded-2xl bg-gradient-to-r from-teal-50/70 to-emerald-50/70 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-teal-700" />
            <h2 className="text-lg font-bold text-teal-950">
              Tradutor Comportamental: O Poder dos Pequenos Cortes
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
            <Label htmlFor="cutInp">Se eu economizar:</Label>
            <Input
              id="cutInp"
              type="number"
              value={expenseCutAmount}
              onChange={(e) => setExpenseCutAmount(e.target.value)}
              className="w-28 h-8 text-xs font-bold bg-white"
              placeholder="R$ 150"
            />
            <span>/ mês</span>
          </div>
        </div>

        <p className="text-xs text-teal-900 leading-relaxed">
          Cortar R$ {parsedCut} em delivery ou assinaturas não significa privação: significa
          antecipar seu sonho. Veja o impacto direto em cada uma das suas metas abaixo:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {dreams.map((dream) => {
            const impact = dreamsService.calculateBehavioralImpact(dream, parsedCut)
            return (
              <div
                key={dream.id}
                className="p-3.5 bg-white rounded-xl border border-teal-100 shadow-2xs space-y-1"
              >
                <span className="font-bold text-xs text-slate-900 truncate block">
                  {dream.title}
                </span>
                <div className="flex items-baseline gap-1.5 text-xs text-emerald-800 font-extrabold">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{impact.monthsSaved} meses adiantados!</span>
                </div>
                <span className="text-[11px] text-slate-500 block">
                  Prazo cai de {impact.monthsOriginal} para {impact.monthsWithCut} meses (
                  {impact.fasterPercent}% mais rápido).
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Grid de Sonhos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dreams.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
            <Sparkles className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Nenhum sonho cadastrado ainda</h3>
            <p className="text-xs max-w-md mx-auto text-slate-500">
              A reserva de emergência, uma viagem em família, a reforma da casa ou a aposentadoria:
              dê um nome ao seu futuro.
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 rounded-xl"
            >
              <PlusCircle className="w-4 h-4" /> Criar Meu Primeiro Sonho
            </Button>
          </div>
        ) : (
          dreams.map((dr) => {
            const percent =
              dr.target_amount > 0
                ? Math.min(100, Math.round((dr.current_amount / dr.target_amount) * 100))
                : 0
            const remaining = Math.max(0, dr.target_amount - dr.current_amount)

            return (
              <Card
                key={dr.id}
                className="border-slate-200 shadow-xs rounded-2xl bg-white p-5 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Meta Financeira
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-base mt-0.5">{dr.title}</h3>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {percent}% Concluído
                    </span>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="space-y-1.5 mt-4">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-black text-emerald-700 text-sm">
                        {formatCurrency(dr.current_amount)}
                      </span>
                      <span className="text-slate-500 font-medium">
                        Alvo: {formatCurrency(dr.target_amount)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 pt-0.5 font-medium">
                      <span>Resta {formatCurrency(remaining)}</span>
                      <span>Prazo: {dr.target_date}</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                    <span>Aporte Mensal Planejado:</span>
                    <strong className="text-slate-900">
                      {formatCurrency(dr.monthly_contribution || 0)} / mês
                    </strong>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => {
                      setSelectedDreamId(dr.id)
                      setContributionModalOpen(true)
                    }}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 rounded-xl gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Registrar Aporte
                  </Button>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal de Novo Sonho */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Novo Sonho ou Meta
            </DialogTitle>
            <DialogDescription>
              Defina o valor alvo, aporte mensal e prazo para realizar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDream} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="dTitle">Título do Sonho</Label>
              <Input
                id="dTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Viagem Europa, Troca de Carro, Reserva 6 Meses..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tAmt">Valor Alvo (R$)</Label>
                <Input
                  id="tAmt"
                  type="number"
                  step="100"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="15000"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cAmt">Já Acumulado (R$)</Label>
                <Input
                  id="cAmt"
                  type="number"
                  step="50"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mCont">Aporte Mensal (R$)</Label>
                <Input
                  id="mCont"
                  type="number"
                  step="50"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                  placeholder="300"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tDate">Prazo Estimado</Label>
                <Input
                  id="tDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                />
              </div>
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
                {saving ? 'Salvando...' : 'Salvar Sonho'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Aporte Rápido */}
      <Dialog open={contributionModalOpen} onOpenChange={setContributionModalOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Registrar Aporte</DialogTitle>
            <DialogDescription>Quanto você está guardando hoje para esta meta?</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddContribution} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cVal">Valor do Aporte (R$)</Label>
              <Input
                id="cVal"
                type="number"
                step="10"
                value={contributionValue}
                onChange={(e) => setContributionValue(e.target.value)}
                placeholder="200"
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setContributionModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Confirmar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
