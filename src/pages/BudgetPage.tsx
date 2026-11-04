import React, { useState, useEffect } from 'react'
import { budgetsService } from '@/services/budgets'
import { transactionsService } from '@/services/transactions'
import { categoriesService } from '@/services/categories'
import { BudgetRecord, TransactionRecord, CategoryRecord, BudgetTargetType } from '@/types/finance'
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
import { Target, PlusCircle, Calendar, Sparkles, Layers, Tag, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const BudgetPage: React.FC = () => {
  const { toast } = useToast()
  const currentMonthStr = new Date().toISOString().slice(0, 7)

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr)
  const [budgets, setBudgets] = useState<BudgetRecord[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Filtro de visualização (Todas, Apenas Grupos, Apenas Subgrupos)
  const [viewFilter, setViewFilter] = useState<'all' | 'group' | 'subgroup'>('all')

  // Modal de Definição de Meta
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [targetType, setTargetType] = useState<BudgetTargetType>('subgroup')
  const [categoryGroup, setCategoryGroup] = useState<string>('Alimentação')
  const [limitAmount, setLimitAmount] = useState<string>('1200')
  const [warningThreshold, setWarningThreshold] = useState<string>('75')
  const [dangerThreshold, setDangerThreshold] = useState<string>('90')
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null)
  const [saving, setSaving] = useState<boolean>(false)

  // Exclusão de Meta com Confirmação Segura
  const [deletingBudget, setDeletingBudget] = useState<{ id: string; name: string } | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [bdgs, txs, cats] = await Promise.all([
        budgetsService.list(selectedMonth),
        transactionsService.list({ month: selectedMonth, regime: 'competence' }),
        categoriesService.list(),
      ])
      setBudgets(bdgs)
      setTransactions(txs)
      setCategories(cats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedMonth])

  // Lista de grupos principais (Nível 1 - ex: Custos Fixos, Estilo de Vida, etc.)
  const availableMainGroups = Array.from(
    new Set(
      categories
        .filter(
          (c) => c.type === 'expense' && (c.status ?? 'active') === 'active' && c.group_level1,
        )
        .map((c) => c.group_level1),
    ),
  ).sort()

  // Lista de subgrupos (Nível 2 - ex: Habitação, Alimentação, Transporte, etc.)
  const availableSubgroups = Array.from(
    new Set(
      categories
        .filter(
          (c) => c.type === 'expense' && (c.status ?? 'active') === 'active' && c.group_level2,
        )
        .map((c) => c.group_level2),
    ),
  ).sort()

  // Opções disponíveis no modal dependendo do nível escolhido
  const availableOptions = targetType === 'group' ? availableMainGroups : availableSubgroups

  const openNewDialog = (type: BudgetTargetType = 'subgroup') => {
    setEditingBudgetId(null)
    setTargetType(type)
    const options = type === 'group' ? availableMainGroups : availableSubgroups
    setCategoryGroup(options[0] || '')
    setLimitAmount('1000')
    setWarningThreshold('75')
    setDangerThreshold('90')
    setDialogOpen(true)
  }

  const openEditDialog = (b: BudgetRecord) => {
    const resolvedType = budgetsService.resolveTargetType(b, categories)
    setEditingBudgetId(b.id)
    setTargetType(resolvedType)
    setCategoryGroup(b.category_group)
    setLimitAmount(String(b.limit_amount))
    setWarningThreshold(String(b.warning_threshold || 75))
    setDangerThreshold(String(b.danger_threshold || 90))
    setDialogOpen(true)
  }

  const handleDeleteBudgetPrompt = (id: string, name: string) => {
    setDeletingBudget({ id, name })
    setDeleteConfirmOpen(true)
  }

  const confirmDeleteBudget = async () => {
    if (!deletingBudget) return
    setIsDeleting(true)
    try {
      await budgetsService.delete(deletingBudget.id)
      toast({
        title: 'Meta removida',
        description: `A meta para "${deletingBudget.name}" foi excluída com sucesso.`,
      })
      setDeleteConfirmOpen(false)
      setDeletingBudget(null)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao remover meta', description: err.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryGroup || !limitAmount) return

    setSaving(true)
    try {
      const limitVal = parseFloat(limitAmount)
      const warnVal = parseInt(warningThreshold, 10) || 75
      const dangVal = parseInt(dangerThreshold, 10) || 90

      if (editingBudgetId) {
        await budgetsService.update(editingBudgetId, {
          category_group: categoryGroup,
          limit_amount: limitVal,
          warning_threshold: warnVal,
          danger_threshold: dangVal,
          target_type: targetType,
        })

        toast({
          title: 'Meta alterada com sucesso!',
          description: `Novo teto de ${formatCurrency(limitVal)} definido para "${categoryGroup}".`,
        })
      } else {
        await budgetsService.upsert(
          selectedMonth,
          categoryGroup,
          limitVal,
          warnVal,
          dangVal,
          targetType,
        )

        toast({
          title: 'Meta orçamentária cadastrada!',
          description: `Teto de ${formatCurrency(limitVal)} definido para ${
            targetType === 'group' ? 'a categoria/grupo' : 'o subgrupo'
          } "${categoryGroup}".`,
        })
      }

      setDialogOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: editingBudgetId ? 'Erro ao atualizar meta' : 'Erro ao cadastrar meta',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Orçamento com Semáforo
            </h1>
            <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              Grupos & Subgrupos
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Defina tetos por categoria principal (grupo) ou por subgrupo e acompanhe o consumo com
            semáforo nos 75% e 90%.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center space-x-2 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 flex-1 sm:flex-initial">
            <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => openNewDialog('group')}
              variant="outline"
              className="flex-1 sm:flex-initial border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold gap-1.5 rounded-xl h-9"
            >
              <Layers className="w-4 h-4" /> Meta por Grupo
            </Button>
            <Button
              onClick={() => openNewDialog('subgroup')}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 rounded-xl h-9"
            >
              <PlusCircle className="w-4 h-4" /> Meta por Subgrupo
            </Button>
          </div>
        </div>
      </div>

      {/* Resumo e Filtro de Visualização */}
      {budgets.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
            {' '}
            <button
              type="button"
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                viewFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({budgets.length})
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('group')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                viewFilter === 'group'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Por Grupo (
              {
                budgets.filter((b) => budgetsService.resolveTargetType(b, categories) === 'group')
                  .length
              }
              )
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('subgroup')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                viewFilter === 'subgroup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Por Subgrupo (
              {
                budgets.filter(
                  (b) => budgetsService.resolveTargetType(b, categories) === 'subgroup',
                ).length
              }
              )
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Mostrando {selectedMonth} • Despesas em regime de competência (compras parceladas entram
            pelo valor total)
          </div>
        </div>
      )}

      {/* Grid de Metas Orçamentárias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {budgets.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
            <Target className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">
              Nenhuma meta definida para {selectedMonth}
            </h3>
            <p className="text-xs max-w-md mx-auto text-slate-500">
              Defina tetos por categoria principal (grupo, como Custos Fixos) ou por subgrupo (como
              Alimentação ou Habitação) para ter visibilidade antes do dinheiro acabar.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                onClick={() => openNewDialog('group')}
                variant="outline"
                className="border-emerald-600 text-emerald-700 text-xs gap-1.5 rounded-xl"
              >
                <Layers className="w-4 h-4" /> Criar Meta de Grupo
              </Button>
              <Button
                onClick={() => openNewDialog('subgroup')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 rounded-xl"
              >
                <PlusCircle className="w-4 h-4" /> Criar Meta de Subgrupo
              </Button>
            </div>
          </div>
        ) : (
          budgets
            .filter((b) => {
              if (viewFilter === 'all') return true
              const type = budgetsService.resolveTargetType(b, categories)
              return type === viewFilter
            })
            .map((b) => {
              const isGroupBudget = budgetsService.resolveTargetType(b, categories) === 'group'

              // Cálculo do realizado na competência:
              // Se for meta de grupo: soma despesas de todas as categorias cujo group_level1 === b.category_group
              // Se for meta de subgrupo: soma despesas de categorias com group_level2 === b.category_group ou name === b.category_group
              const matchedTransactions = transactions.filter((t) => {
                if (t.type !== 'expense') return false
                const cat = t.expand?.category_id || categories.find((c) => c.id === t.category_id)
                if (isGroupBudget) {
                  return cat?.group_level1 === b.category_group
                }
                return cat?.group_level2 === b.category_group || cat?.name === b.category_group
              })

              const spent = matchedTransactions.reduce((acc, t) => acc + t.amount, 0)
              const percent = b.limit_amount > 0 ? Math.round((spent / b.limit_amount) * 100) : 0
              const remaining = b.limit_amount - spent

              const isWarning =
                percent >= (b.warning_threshold || 75) && percent < (b.danger_threshold || 90)
              const isDanger = percent >= (b.danger_threshold || 90)

              const statusColor = isDanger
                ? 'bg-rose-500'
                : isWarning
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'

              const badgeColor = isDanger
                ? 'bg-rose-100 text-rose-800 border-rose-200'
                : isWarning
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'

              // Para grupos, identificar quais subgrupos possuem transações ou metas
              const groupSubgroups = isGroupBudget
                ? Array.from(
                    new Set(
                      categories
                        .filter((c) => c.group_level1 === b.category_group && c.group_level2)
                        .map((c) => c.group_level2!),
                    ),
                  )
                : []

              return (
                <Card
                  key={b.id}
                  className={`rounded-2xl bg-white p-5 space-y-4 transition-all ${
                    isGroupBudget
                      ? 'border-2 border-emerald-200/70 shadow-sm bg-gradient-to-b from-emerald-50/20 to-white'
                      : 'border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isGroupBudget
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isGroupBudget ? 'Meta de Grupo' : 'Meta de Subgrupo'}
                        </span>
                        {isGroupBudget && (
                          <span className="text-[10px] font-medium text-slate-400">
                            (engloba subgrupos)
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-base mt-1">
                        {b.category_group}
                      </h3>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}
                      >
                        {isDanger ? 'Crítico (>90%)' : isWarning ? 'Atenção (>75%)' : 'No Limite'}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(b)}
                          className="h-7 px-2 text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg gap-1"
                          title="Alterar esta meta"
                        >
                          <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Alterar</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteBudgetPrompt(b.id, b.category_group)}
                          className="h-7 px-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg gap-1"
                          title="Excluir esta meta"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Excluir</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Termômetro com Semáforo */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <div>
                        <span className="font-black text-slate-900 text-base">
                          {formatCurrency(spent)}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-1.5">
                          ({matchedTransactions.length} lançamentos)
                        </span>
                      </div>
                      <span className="text-slate-600 font-semibold text-xs">
                        Teto: {formatCurrency(b.limit_amount)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${statusColor}`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] font-medium text-slate-500 pt-0.5">
                      <span className="font-bold text-slate-700">{percent}% consumido</span>
                      <span
                        className={
                          remaining >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'
                        }
                      >
                        {remaining >= 0
                          ? `Resta ${formatCurrency(remaining)}`
                          : `Estourado em ${formatCurrency(Math.abs(remaining))}`}
                      </span>
                    </div>
                  </div>

                  {/* Subgrupos englobados para metas de Grupo */}
                  {isGroupBudget && groupSubgroups.length > 0 && (
                    <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-600">Subgrupos somados:</span>{' '}
                      {groupSubgroups.join(', ')}
                    </div>
                  )}

                  {/* Dica Sem Culpa */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>
                      {isDanger
                        ? isGroupBudget
                          ? `Teto do grupo "${b.category_group}" ultrapassado ou crítico. Considere rever gastos discricionários em seus subgrupos até a virada do mês.`
                          : 'Teto quase esgotado ou ultrapassado. Evite novos gastos discricionários neste subgrupo até o próximo mês.'
                        : isWarning
                          ? `Você atingiu a faixa amarela (${percent}% do teto). Fique de olho para não estourar na reta final do mês.`
                          : 'Gastos equilibrados dentro da meta. Parabéns pela disciplina financeira!'}
                    </span>
                  </div>
                </Card>
              )
            })
        )}
      </div>

      {/* Modal de Nova / Editar Meta */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingBudgetId ? 'Editar Meta Orçamentária' : 'Definir Meta Orçamentária'}
            </DialogTitle>
            <DialogDescription>
              Escolha se a meta será por Categoria Principal (Grupo) ou por Subgrupo e defina os
              tetos e alertas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBudget} className="space-y-4 pt-2">
            {/* Escolha do Nível da Meta: Grupo vs Subgrupo */}
            <div className="space-y-1.5">
              <Label>Nível da Meta</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('group')
                    if (!editingBudgetId && availableMainGroups.length > 0) {
                      setCategoryGroup(availableMainGroups[0])
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    targetType === 'group'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    Por Grupo
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Soma todos os subgrupos (ex: Custos Fixos)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetType('subgroup')
                    if (!editingBudgetId && availableSubgroups.length > 0) {
                      setCategoryGroup(availableSubgroups[0])
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    targetType === 'subgroup'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    Por Subgrupo
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Meta específica (ex: Alimentação, Habitação)
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catGrp">
                {targetType === 'group' ? 'Categoria Principal (Grupo)' : 'Subgrupo de Despesa'}
              </Label>
              <select
                id="catGrp"
                value={categoryGroup}
                onChange={(e) => setCategoryGroup(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              >
                {availableOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                {targetType === 'group'
                  ? 'O consumo será a soma de todas as despesas lançadas nos subgrupos desta categoria.'
                  : 'O consumo considera apenas os lançamentos deste subgrupo específico.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="limitAmt">Teto em R$ para {selectedMonth}</Label>
              <Input
                id="limitAmt"
                type="number"
                step="10"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                placeholder="1000"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="warnThresh">Alerta Atenção (%)</Label>
                <Input
                  id="warnThresh"
                  type="number"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(e.target.value)}
                  placeholder="75"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dangThresh">Alerta Crítico (%)</Label>
                <Input
                  id="dangThresh"
                  type="number"
                  value={dangerThreshold}
                  onChange={(e) => setDangerThreshold(e.target.value)}
                  placeholder="90"
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {saving ? 'Salvando...' : editingBudgetId ? 'Salvar Alterações' : 'Salvar Meta'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Meta Orçamentária */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Excluir Meta Orçamentária?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              Tem certeza de que deseja remover a meta para{' '}
              <strong className="text-slate-900 font-bold">"{deletingBudget?.name}"</strong> no mês
              de <strong className="text-slate-900 font-bold">{selectedMonth}</strong>? Esta ação
              removerá este teto de gastos do seu dispositivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBudget}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir Meta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
