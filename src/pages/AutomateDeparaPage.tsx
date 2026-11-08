import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { deparaService, normalizeText } from '@/services/depara'
import { categoriesService } from '@/services/categories'
import { DeparaRuleRecord, CategoryRecord } from '@/types/finance'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
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
  ArrowRightLeft,
  Sparkles,
  Plus,
  Search,
  Trash2,
  Pencil,
  FileSpreadsheet,
  CheckCircle2,
  Info,
  Play,
  RotateCcw,
  Zap,
  Filter,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { categoryOptionLabel } from '@/components/cadastros/categoriesTree'

export const AutomateDeparaPage: React.FC = () => {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [rules, setRules] = useState<DeparaRuleRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Formulário Nova Regra
  const [newPattern, setNewPattern] = useState<string>('')
  const [newCategoryTarget, setNewCategoryTarget] = useState<string>('')
  const [creatingRule, setCreatingRule] = useState<boolean>(false)

  // Testador / Simulador em Tempo Real
  const [simulatorInput, setSimulatorInput] = useState<string>('')

  // Filtros & Pesquisa
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')

  // Modal de Edição
  const [editingRule, setEditingRule] = useState<DeparaRuleRecord | null>(null)
  const [editPattern, setEditPattern] = useState<string>('')
  const [editCategoryId, setEditCategoryId] = useState<string>('')
  const [editRuleDialogOpen, setEditRuleDialogOpen] = useState<boolean>(false)
  const [savingEditRule, setSavingEditRule] = useState<boolean>(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [cats, rls] = await Promise.all([categoriesService.list(), deparaService.list()])
      setCategories(cats)
      setRules(rls)
    } catch (err) {
      console.error('Erro ao carregar regras de De-Para:', err)
      toast({
        title: 'Erro ao carregar regras',
        description: 'Não foi possível carregar as regras De-Para salvas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Criação de nova regra
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPattern = newPattern.trim().toUpperCase()
    if (!cleanPattern || !newCategoryTarget) return

    setCreatingRule(true)
    try {
      const created = await deparaService.create(cleanPattern, newCategoryTarget)
      setRules((prev) => [created, ...prev])
      setNewPattern('')
      setNewCategoryTarget('')
      toast({
        title: 'Regra criada com sucesso!',
        description: `O termo "${cleanPattern}" agora será classificado automaticamente.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao criar regra',
        description: err.message || 'Verifique se a regra já não existe.',
        variant: 'destructive',
      })
    } finally {
      setCreatingRule(false)
    }
  }

  // Simulação / Teste em tempo real
  const simulationResult = useMemo(() => {
    const raw = simulatorInput.trim()
    if (!raw) return null

    const suggestion = deparaService.suggestCategory(raw, rules, categories)
    if (!suggestion) {
      return {
        matched: false,
        message: 'Nenhuma regra ou padrão heurístico combinou com este texto.',
      }
    }

    const matchedCategory = categories.find((c) => c.id === suggestion.categoryId)
    const matchedRule = suggestion.ruleId ? rules.find((r) => r.id === suggestion.ruleId) : null

    return {
      matched: true,
      category: matchedCategory,
      rule: matchedRule,
      source: suggestion.source,
      pattern: suggestion.matchedPattern || matchedRule?.pattern,
    }
  }, [simulatorInput, rules, categories])

  // Filtragem e busca das regras
  const filteredRules = useMemo(() => {
    let list = [...rules]

    if (searchTerm.trim()) {
      const termNorm = normalizeText(searchTerm)
      list = list.filter((r) => {
        const pNorm = normalizeText(r.pattern)
        const cat = r.expand?.category_id || categories.find((c) => c.id === r.category_id)
        const catNorm = cat ? normalizeText(cat.name + ' ' + (cat.group_level1 || '')) : ''
        return pNorm.includes(termNorm) || catNorm.includes(termNorm)
      })
    }

    if (selectedCategoryFilter !== 'all') {
      list = list.filter((r) => r.category_id === selectedCategoryFilter)
    }

    // Ordena por maior uso, depois alfabética
    return list.sort(
      (a, b) =>
        (b.usage_count || 0) - (a.usage_count || 0) || a.pattern.localeCompare(b.pattern, 'pt-BR'),
    )
  }, [rules, searchTerm, selectedCategoryFilter, categories])

  // Estatísticas
  const totalUsage = useMemo(
    () => rules.reduce((acc, curr) => acc + (curr.usage_count || 0), 0),
    [rules],
  )

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Automatizar De-Para
              </h1>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block mt-0.5">
                Classificação Inteligente &amp; Autônoma
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            Vincule palavras e termos de extratos bancários e faturas diretamente às categorias do
            seu plano de contas. Suas importações são categorizadas de forma 100% instantânea.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            onClick={() => navigate('/importador-extratos')}
            className="text-xs text-indigo-800 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 gap-1.5 h-10 px-3.5 rounded-xl font-bold shadow-xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            Importador de Extratos
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            title="Recarregar regras"
            className="text-xs text-slate-700 bg-white hover:bg-slate-50 gap-1 rounded-xl h-10 px-3 border border-slate-200 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Recarregar
          </Button>
        </div>
      </div>

      {/* Banner Explicativo de Automação */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/20 p-5 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Como a Automação De-Para Funciona</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Sempre que você importar um arquivo (OFX, PDF, Excel ou CSV), o sistema procura no
              histórico cada termo cadastrado aqui. Ao encontrar termos como{' '}
              <strong className="text-emerald-300">"UBER"</strong>,{' '}
              <strong className="text-emerald-300">"IFOOD"</strong> ou{' '}
              <strong className="text-emerald-300">"POSTO"</strong>, a categoria correspondente é
              preenchida sem você precisar digitar nada. Além disso, novas regras são aprendidas
              automaticamente ao salvar lotes!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <p className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">
                Regras Ativas
              </p>
              <div className="text-xl font-black text-emerald-400 mt-0.5">{rules.length}</div>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <p className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">
                Classificações
              </p>
              <div className="text-xl font-black text-indigo-300 mt-0.5">{totalUsage}x</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Principal: Criação de Nova Regra e Simulador em Tempo Real */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Criar Nova Regra */}
        <Card className="lg:col-span-5 border-slate-200 shadow-xs rounded-2xl bg-white p-5 space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Criar Nova Regra De-Para
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Associe uma palavra-chave presente no texto do extrato à respectiva categoria de
              despesa ou receita.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleCreateRule} className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label htmlFor="pattern" className="text-xs font-bold text-slate-700">
                Termo no Histórico Bancário
              </Label>
              <Input
                id="pattern"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value.toUpperCase())}
                placeholder="Ex: IFOOD, CARREFOUR, SHELL, SPOTIFY"
                className="font-mono font-bold uppercase text-xs rounded-xl h-10 border-slate-300"
                required
              />
              <p className="text-[11px] text-slate-400">
                Dica: Escolha a marca ou termo chave (ex: UBER em vez de UBER DO BRASIL LTDA).
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="targetCat" className="text-xs font-bold text-slate-700">
                Categoria Correspondente
              </Label>
              <select
                id="targetCat"
                value={newCategoryTarget}
                onChange={(e) => setNewCategoryTarget(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 h-10 transition-all cursor-pointer"
                required
              >
                <option value="">-- Selecione a categoria de destino --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryOptionLabel(c)}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              disabled={creatingRule || !newPattern.trim() || !newCategoryTarget}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 rounded-xl h-10 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {creatingRule ? 'Criando Regra...' : 'Adicionar Regra De-Para'}
            </Button>
          </form>
        </Card>

        {/* Card 2: Testador / Simulador em Tempo Real */}
        <Card className="lg:col-span-7 border-slate-200 shadow-xs rounded-2xl bg-white p-5 space-y-4">
          <CardHeader className="p-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-600" />
                Simulador de Regras em Tempo Real
              </CardTitle>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                Teste Imediato
              </span>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Digite uma linha qualquer de extrato bancário para testar instantaneamente qual regra
              será acionada.
            </CardDescription>
          </CardHeader>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label htmlFor="simInput" className="text-xs font-bold text-slate-700">
                Texto de Teste do Extrato
              </Label>
              <div className="relative">
                <Input
                  id="simInput"
                  value={simulatorInput}
                  onChange={(e) => setSimulatorInput(e.target.value)}
                  placeholder="Ex: PGTO COMPRA PIX CARREFOUR SAO PAULO BR"
                  className="text-xs rounded-xl h-10 pr-24 border-slate-300"
                />
                {simulatorInput && (
                  <button
                    type="button"
                    onClick={() => setSimulatorInput('')}
                    className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Resultado da Simulação */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 min-h-[90px] flex items-center">
              {!simulatorInput.trim() ? (
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Digite qualquer histórico acima para ver a correspondência automática em tempo
                    real.
                  </span>
                </div>
              ) : simulationResult?.matched ? (
                <div className="space-y-1 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Regra Encontrada
                    </span>
                    <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800">
                      Termo: {simulationResult.pattern}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      (Origem: {simulationResult.source !== 'heuristic' ? 'Regra De-Para' : 'Heurística Local'})
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 pt-1">
                    Categoria Atribuída:{' '}
                    <span className="text-emerald-700">
                      {simulationResult.category
                        ? categoryOptionLabel(simulationResult.category)
                        : 'Não identificada'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl w-full flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Nenhuma regra cadastrada corresponde a esse termo. Você pode criá-la no painel ao
                    lado!
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Seção Inferior: Tabela & Catálogo de Regras Existentes */}
      <Card className="border-slate-200 shadow-xs rounded-2xl bg-white p-5 space-y-4">
        <CardHeader className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Regras De-Para Ativas ({filteredRules.length})</span>
                {rules.length !== filteredRules.length && (
                  <span className="text-xs font-normal text-slate-400">
                    (de {rules.length} no total)
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Gerencie todas as regras inteligentes aprendidas ou configuradas no seu dispositivo.
              </CardDescription>
            </div>

            {/* Barra de Filtros */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar termo ou categoria..."
                  className="text-xs pl-8 h-9 w-48 sm:w-60 rounded-xl border-slate-300"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 h-9 font-medium text-slate-700 cursor-pointer"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 pt-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Carregando regras...</div>
          ) : filteredRules.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700">Nenhuma regra De-Para encontrada</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchTerm || selectedCategoryFilter !== 'all'
                  ? 'Nenhum resultado corresponde aos filtros aplicados.'
                  : 'Cadastre sua primeira regra acima ou importe um extrato bancário para o sistema aprender automaticamente.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredRules.map((r) => {
                const cat = r.expand?.category_id || categories.find((c) => c.id === r.category_id)
                return (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 font-mono tracking-wide bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                          {r.pattern}
                        </span>
                        <Badge variant="outline" className="text-[10px] text-slate-500 bg-white">
                          {r.usage_count ?? 0}x uso{(r.usage_count ?? 0) !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <span className="text-slate-400 font-normal">&rarr;</span>
                        <span className="truncate">{cat ? categoryOptionLabel(cat) : 'Sem categoria'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {cat?.group_level1 || 'Plano de Contas'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingRule(r)
                            setEditPattern(r.pattern)
                            setEditCategoryId(r.category_id)
                            setEditRuleDialogOpen(true)
                          }}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors"
                          title="Alterar regra"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Deseja excluir a regra "${r.pattern}"?`)) return
                            try {
                              await deparaService.delete(r.id)
                              setRules((prev) => prev.filter((item) => item.id !== r.id))
                              toast({ title: 'Regra excluída com sucesso.' })
                            } catch (err: any) {
                              toast({
                                title: 'Erro ao excluir regra',
                                description: err.message,
                                variant: 'destructive',
                              })
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Excluir regra"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição de Regra */}
      <Dialog open={editRuleDialogOpen} onOpenChange={setEditRuleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-emerald-600" />
              Alterar Regra De-Para
            </DialogTitle>
            <DialogDescription>
              Modifique o padrão de texto ou a categoria de destino desta regra.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!editingRule || !editPattern || !editCategoryId) return
              setSavingEditRule(true)
              try {
                const updated = await deparaService.update(editingRule.id, {
                  pattern: editPattern.trim().toUpperCase(),
                  category_id: editCategoryId,
                })
                setRules((prev) =>
                  prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
                )
                toast({ title: 'Regra atualizada com sucesso!' })
                setEditRuleDialogOpen(false)
                loadData()
              } catch (err: any) {
                toast({
                  title: 'Erro ao atualizar regra',
                  description: err.message,
                  variant: 'destructive',
                })
              } finally {
                setSavingEditRule(false)
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="edPat" className="text-xs font-bold text-slate-700">
                Termo no Extrato / Fatura
              </Label>
              <Input
                id="edPat"
                value={editPattern}
                onChange={(e) => setEditPattern(e.target.value.toUpperCase())}
                className="font-mono font-bold uppercase text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edCat" className="text-xs font-bold text-slate-700">
                Categoria Destino
              </Label>
              <select
                id="edCat"
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryOptionLabel(c)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditRuleDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingEditRule}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {savingEditRule ? 'Salvando...' : 'Salvar Alteração'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
