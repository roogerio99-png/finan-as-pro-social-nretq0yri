import React, { useState, useEffect } from 'react'
import { budgetsService } from '@/services/budgets'
import { transactionsService } from '@/services/transactions'
import { categoriesService } from '@/services/categories'
import { BudgetRecord, TransactionRecord, CategoryRecord } from '@/types/finance'
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
  Target,
  AlertTriangle,
  CheckCircle,
  PlusCircle,
  Calendar,
  Sparkles,
  TrendingDown,
  Percent,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const BudgetPage: React.FC = () => {
  const { toast } = useToast()
  const currentMonthStr = new Date().toISOString().slice(0, 7)

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr)
  const [budgets, setBudgets] = useState<BudgetRecord[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Modal de Definição de Meta
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [categoryGroup, setCategoryGroup] = useState<string>('Alimentação')
  const [limitAmount, setLimitAmount] = useState<string>('1200')
  const [warningThreshold, setWarningThreshold] = useState<string>('75')
  const [dangerThreshold, setDangerThreshold] = useState<string>('90')
  const [saving, setSaving] = useState<boolean>(false)

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

  // Lista de grupos únicos para sugerir
  const availableGroups = Array.from(
    new Set(categories.filter((c) => c.type === 'expense').map((c) => c.group_level2)),
  )

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryGroup || !limitAmount) return

    setSaving(true)
    try {
      await budgetsService.upsert(
        selectedMonth,
        categoryGroup,
        parseFloat(limitAmount),
        parseInt(warningThreshold, 10) || 75,
        parseInt(dangerThreshold, 10) || 90,
      )

      toast({
        title: 'Meta Orçamentária salva!',
        description: `Teto de R$ ${limitAmount} definido para ${categoryGroup}.`,
      })

      setDialogOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Orçamento com Semáforo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Defina tetos por subgrupo e receba alertas automáticos nos 75% (Atenção) e 90%
            (Crítico).
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 rounded-xl"
          >
            <PlusCircle className="w-4 h-4" /> Definir Nova Meta
          </Button>
        </div>
      </div>

      {/* Grid de Metas Orçamentárias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {budgets.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
            <Target className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">
              Nenhuma meta definida para {selectedMonth}
            </h3>
            <p className="text-xs max-w-md mx-auto text-slate-500">
              Defina tetos para suas categorias mais críticas (como Alimentação, Lazer ou Habitação)
              para ter visibilidade antes do dinheiro acabar.
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 rounded-xl"
            >
              <PlusCircle className="w-4 h-4" /> Criar Primeira Meta
            </Button>
          </div>
        ) : (
          budgets.map((b) => {
            // Calcula gastos das categorias deste subgrupo
            const spent = transactions
              .filter((t) => {
                if (t.type !== 'expense') return false
                const cat = t.expand?.category_id || categories.find((c) => c.id === t.category_id)
                return cat?.group_level2 === b.category_group || cat?.name === b.category_group
              })
              .reduce((acc, t) => acc + t.amount, 0)

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

            return (
              <Card
                key={b.id}
                className="border-slate-200 shadow-xs rounded-2xl bg-white p-5 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Subgrupo / Categoria
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base mt-0.5">
                      {b.category_group}
                    </h3>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}
                  >
                    {isDanger ? 'Crítico (>90%)' : isWarning ? 'Atenção (>75%)' : 'No Limite'}
                  </span>
                </div>

                {/* Termômetro com Semáforo */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-black text-slate-900 text-sm">
                      {formatCurrency(spent)}
                    </span>
                    <span className="text-slate-500 font-medium">
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
                    <span>{percent}% do teto</span>
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

                {/* Dica Sem Culpa */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>
                    {isDanger
                      ? 'Teto quase esgotado ou ultrapassado. Evite novos gastos discricionários neste subgrupo até o próximo mês.'
                      : isWarning
                        ? 'Você atingiu a faixa amarela. Fique de olho para não estourar na última semana.'
                        : 'Gastos equilibrados dentro da meta. Parabéns pela disciplina financeira!'}
                  </span>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal de Nova Meta */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Definir Meta Orçamentária
            </DialogTitle>
            <DialogDescription>
              Ajuste o teto mensal e os pontos de alerta nos 75% e 90%.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBudget} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="catGrp">Subgrupo ou Categoria</Label>
              <select
                id="catGrp"
                value={categoryGroup}
                onChange={(e) => setCategoryGroup(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800"
                required
              >
                {availableGroups.map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? 'Salvando...' : 'Salvar Meta'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
