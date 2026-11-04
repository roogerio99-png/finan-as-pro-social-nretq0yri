import React, { useState, useEffect } from 'react'
import { dreamsService } from '@/services/dreams'
import { DreamRecord, DreamStatus } from '@/types/finance'
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
import { Sparkles, Target, PlusCircle, Scissors, Pencil, Trash2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const DreamsPage: React.FC = () => {
  const { toast } = useToast()
  const [dreams, setDreams] = useState<DreamRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Tradutor Comportamental de Cortes de Gastos
  const [expenseCutAmount, setExpenseCutAmount] = useState<string>('150')

  // Modal de Criação / Edição de Sonho
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [editingDream, setEditingDream] = useState<DreamRecord | null>(null)
  const [title, setTitle] = useState<string>('')
  const [targetAmount, setTargetAmount] = useState<string>('')
  const [currentAmount, setCurrentAmount] = useState<string>('0')
  const [targetDate, setTargetDate] = useState<string>('2026-12-31')
  const [monthlyContribution, setMonthlyContribution] = useState<string>('400')
  const [status, setStatus] = useState<DreamStatus>('in_progress')
  const [icon, setIcon] = useState<string>('Plane')
  const [saving, setSaving] = useState<boolean>(false)

  // Modal de Exclusão de Sonho
  const [deletingDream, setDeletingDream] = useState<DreamRecord | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

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

  const openCreateDialog = () => {
    setEditingDream(null)
    setTitle('')
    setTargetAmount('')
    setCurrentAmount('0')
    setTargetDate('2026-12-31')
    setMonthlyContribution('400')
    setStatus('in_progress')
    setIcon('Plane')
    setDialogOpen(true)
  }

  const openEditDialog = (dr: DreamRecord) => {
    setEditingDream(dr)
    setTitle(dr.title)
    setTargetAmount(String(dr.target_amount || ''))
    setCurrentAmount(String(dr.current_amount || 0))
    setTargetDate(dr.target_date || '2026-12-31')
    setMonthlyContribution(String(dr.monthly_contribution || 0))
    setStatus(dr.status || 'in_progress')
    setIcon(dr.icon || 'Plane')
    setDialogOpen(true)
  }

  const handleSaveDream = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !targetAmount) return

    setSaving(true)
    try {
      const payload: Partial<DreamRecord> = {
        title,
        target_amount: parseFloat(targetAmount) || 1000,
        current_amount: parseFloat(currentAmount) || 0,
        target_date: targetDate,
        monthly_contribution: parseFloat(monthlyContribution) || 100,
        icon,
        status,
      }

      if (editingDream) {
        await dreamsService.update(editingDream.id, payload)
        toast({
          title: 'Meta atualizada!',
          description: `"${title}" foi alterada com sucesso.`,
        })
      } else {
        await dreamsService.create(payload)
        toast({
          title: 'Sonho registrado!',
          description: 'Toda grande conquista começa com uma meta clara e aportes constantes.',
        })
      }

      setDialogOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar sonho',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const openDeleteConfirm = (dr: DreamRecord) => {
    setDeletingDream(dr)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingDream) return
    setIsDeleting(true)
    try {
      await dreamsService.delete(deletingDream.id)
      toast({
        title: 'Meta excluída com sucesso',
        description: `"${deletingDream.title}" foi removida do seu planejamento.`,
      })
      setDeleteConfirmOpen(false)
      setDeletingDream(null)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir meta',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
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
            Crie, altere e exclua metas financeiras. Acompanhe aportes e meça o impacto de cortes
            conscientes para acelerar sua conquista.
          </p>
        </div>

        <Button
          onClick={openCreateDialog}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl h-10 px-4"
        >
          <Plus className="w-4 h-4" /> Novo Sonho / Meta
        </Button>
      </div>

      {/* Tradutor Comportamental */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Simulador Comportamental de Cortes
              </h3>
              <p className="text-xs text-slate-600">
                Se você cortar uma despesa desnecessária hoje e direcionar para seus sonhos:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Corte de Gastos:</span>
            <div className="relative w-32">
              <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R$</span>
              <Input
                type="number"
                value={expenseCutAmount}
                onChange={(e) => setExpenseCutAmount(e.target.value)}
                className="pl-8 text-xs font-bold bg-white"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {dreams.map((dr) => {
            const impact = dreamsService.calculateBehavioralImpact(dr, parsedCut)
            return (
              <div
                key={dr.id}
                className="p-3 bg-white/80 rounded-xl border border-emerald-100 space-y-1.5"
              >
                <div className="flex justify-between items-center text-xs">
                  <strong className="text-slate-900 truncate">{dr.title}</strong>
                  <span className="text-emerald-700 font-bold">
                    -{impact.monthsSaved} meses adiantados
                  </span>
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
              onClick={openCreateDialog}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 rounded-xl font-bold"
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

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {percent}%
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(dr)}
                        className="h-7 w-7 text-slate-400 hover:text-slate-800"
                        title="Alterar meta"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openDeleteConfirm(dr)}
                        className="h-7 w-7 text-slate-400 hover:text-rose-600"
                        title="Excluir meta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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

                <div className="pt-2 flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setSelectedDreamId(dr.id)
                      setContributionModalOpen(true)
                    }}
                    className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 rounded-xl gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Registrar Aporte
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openEditDialog(dr)}
                    className="text-xs font-bold text-slate-700 border-slate-200 rounded-xl px-2.5"
                    title="Alterar meta"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    Alterar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openDeleteConfirm(dr)}
                    className="text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl px-2.5"
                    title="Excluir meta"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" />
                    Excluir
                  </Button>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal de Criar / Alterar Sonho */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {editingDream ? (
                <>
                  <Pencil className="w-5 h-5 text-emerald-600" />
                  Alterar Sonho ou Meta
                </>
              ) : (
                <>
                  <Target className="w-5 h-5 text-emerald-600" />
                  Novo Sonho ou Meta
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingDream
                ? 'Atualize os dados e valores do seu objetivo.'
                : 'Defina o valor alvo, aporte mensal e prazo para realizar.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDream} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="dTitle">Título do Sonho</Label>
              <Input
                id="dTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Viagem Europa, Troca de Carro, Reserva de Emergência..."
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

            {editingDream && (
              <div className="space-y-1.5">
                <Label htmlFor="dStatus">Situação da Meta</Label>
                <select
                  id="dStatus"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DreamStatus)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800"
                >
                  <option value="in_progress">Em Andamento</option>
                  <option value="achieved">Concluído / Atingido</option>
                  <option value="paused">Pausado</option>
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {saving ? 'Salvando...' : editingDream ? 'Salvar Alterações' : 'Criar Sonho'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação para Excluir Sonho */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-2">
              <Trash2 className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Excluir Sonho "{deletingDream?.title}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              Tem certeza que deseja remover esta meta financeira? O histórico e o progresso
              acumulado serão apagados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir Meta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Confirmar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
