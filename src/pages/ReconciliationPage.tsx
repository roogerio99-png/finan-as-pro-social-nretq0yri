import React, { useState, useEffect } from 'react'
import { deparaService } from '@/services/depara'
import { categoriesService } from '@/services/categories'
import { accountsService } from '@/services/accounts'
import { transactionsService } from '@/services/transactions'
import {
  DeparaRuleRecord,
  CategoryRecord,
  AccountRecord,
  StatementImportLine,
} from '@/types/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FileSpreadsheet,
  Upload,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Plus,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const ReconciliationPage: React.FC = () => {
  const { toast } = useToast()
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [rules, setRules] = useState<DeparaRuleRecord[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')

  // Linhas importadas em processamento
  const [importLines, setImportLines] = useState<StatementImportLine[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [savingBatch, setSavingBatch] = useState<boolean>(false)

  // Modal/Form de Nova Regra De-Para
  const [newPattern, setNewPattern] = useState<string>('')
  const [newCategoryTarget, setNewCategoryTarget] = useState<string>('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [cats, accs, rls] = await Promise.all([
        categoriesService.list(),
        accountsService.list(),
        deparaService.list(),
      ])
      setCategories(cats)
      setAccounts(accs)
      setRules(rls)
      if (accs.length > 0 && !selectedAccountId) setSelectedAccountId(accs[0].id)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Exemplo de extrato pré-carregado inteligente para o usuário testar ou carregar seu arquivo
  const handleLoadSampleStatement = () => {
    const today = new Date()
    const currMonth = today.toISOString().slice(0, 7)

    const sampleRaw = [
      {
        date: `${currMonth}-03`,
        desc: 'IFOOD *RESTAURANTE SAO PAULO',
        amount: 68.9,
        type: 'expense' as const,
      },
      {
        date: `${currMonth}-05`,
        desc: 'UBER *TRIP HELP SP',
        amount: 28.4,
        type: 'expense' as const,
      },
      {
        date: `${currMonth}-08`,
        desc: 'SUPERMERCADO CARREFOUR SP',
        amount: 412.3,
        type: 'expense' as const,
      },
      {
        date: `${currMonth}-10`,
        desc: 'NETFLIX.COM MENSALIDADE',
        amount: 55.9,
        type: 'expense' as const,
      },
      {
        date: `${currMonth}-12`,
        desc: 'PIX RECEBIDO CLIENTE TECH',
        amount: 1200.0,
        type: 'income' as const,
      },
      {
        date: `${currMonth}-08`,
        desc: 'SUPERMERCADO CARREFOUR SP',
        amount: 412.3,
        type: 'expense' as const,
      }, // Duplicata proposital
    ]

    processExtractedLines(sampleRaw)
  }

  // Simulação / Leitura de arquivo CSV ou XLSX
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter((l) => l.trim().length > 0)

      const parsed: { date: string; desc: string; amount: number; type: 'income' | 'expense' }[] =
        []
      const currMonth = new Date().toISOString().slice(0, 7)

      for (let i = 0; i < lines.length; i++) {
        // Ignora cabeçalhos comuns
        if (
          i === 0 &&
          (lines[i].toLowerCase().includes('data') || lines[i].toLowerCase().includes('date'))
        )
          continue

        const parts = lines[i].split(/[;,]/)
        if (parts.length >= 2) {
          const date = parts[0]?.trim() || `${currMonth}-01`
          const desc = parts[1]?.trim() || 'Lançamento Importado'
          const rawAmount = parts[2]
            ? parseFloat(parts[2].replace(/[R$\s]/g, '').replace(',', '.'))
            : 50
          const amount = isNaN(rawAmount) ? 50 : Math.abs(rawAmount)
          const type = (parts[2] && parts[2].includes('-')) || rawAmount < 0 ? 'expense' : 'income'

          parsed.push({ date, desc, amount, type })
        }
      }

      if (parsed.length > 0) {
        processExtractedLines(parsed)
        toast({
          title: 'Arquivo lido!',
          description: `${parsed.length} linhas extraídas com sucesso.`,
        })
      } else {
        // Se arquivo não formatado, carrega extrato demonstrativo
        handleLoadSampleStatement()
        toast({
          title: 'Aviso',
          description: 'Formato não reconhecido, carregando lote de demonstração com deduplicação.',
        })
      }
    }

    reader.readAsText(file)
  }

  const processExtractedLines = (
    raw: { date: string; desc: string; amount: number; type: 'income' | 'expense' }[],
  ) => {
    const seen = new Set<string>()

    const processed: StatementImportLine[] = raw.map((item, idx) => {
      const key = `${item.date}_${item.desc.trim().toUpperCase()}_${item.amount}`
      const isDuplicate = seen.has(key)
      seen.add(key)

      // Classificação automática via De-Para
      const suggestedCatId = deparaService.matchCategory(item.desc, rules, categories)

      return {
        id: `line-${idx}-${Date.now()}`,
        date: item.date,
        description: item.desc,
        amount: item.amount,
        type: item.type,
        suggested_category_id: suggestedCatId,
        selected_category_id: suggestedCatId || '',
        competence_month: item.date.slice(0, 7),
        cash_month: item.date.slice(0, 7),
        is_duplicate: isDuplicate,
        duplicate_reason: isDuplicate ? 'Lançamento idêntico no mesmo lote' : undefined,
        status: isDuplicate ? 'dismissed' : 'ready',
      }
    })

    setImportLines(processed)
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPattern || !newCategoryTarget) return

    try {
      const rule = await deparaService.create(newPattern, newCategoryTarget)
      setRules((prev) => [rule, ...prev])
      setNewPattern('')
      toast({ title: 'Regra De-Para aprendida com sucesso!' })
    } catch (err: any) {
      toast({ title: 'Erro ao criar regra', description: err.message, variant: 'destructive' })
    }
  }

  const handleSaveBatch = async () => {
    const validLines = importLines.filter((l) => l.status === 'ready')
    if (validLines.length === 0) {
      toast({ title: 'Nenhum lançamento pronto para salvar', variant: 'destructive' })
      return
    }

    setSavingBatch(true)
    try {
      const batchId = `batch-${Date.now()}`
      const toCreate = validLines.map((l) => ({
        account_id: selectedAccountId,
        description: l.description,
        amount: l.amount,
        type: l.type,
        date: l.date,
        competence_month: l.competence_month,
        cash_month: l.cash_month,
        category_id: l.selected_category_id || undefined,
        is_reconciled: true,
        import_batch_id: batchId,
      }))

      await transactionsService.createBatch(toCreate)

      // Aprende novas regras De-Para automaticamente se o usuário categorizou
      for (const line of validLines) {
        if (line.selected_category_id && line.selected_category_id !== line.suggested_category_id) {
          try {
            await deparaService.create(line.description.slice(0, 15), line.selected_category_id)
          } catch {
            // Ignora duplicata de regra
          }
        }
      }

      toast({
        title: 'Lote conciliado com sucesso!',
        description: `${validLines.length} lançamentos salvos e duplicatas descartadas.`,
      })

      setImportLines([])
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar lote', description: err.message, variant: 'destructive' })
    } finally {
      setSavingBatch(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Conciliação Bancária & De-Para
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Importe planilhas (.csv / .xlsx), elimine duplicatas e classifique automaticamente com
            inteligência de histórico.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleLoadSampleStatement}
            className="text-xs text-emerald-800 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Carregar Exemplo de Extrato
          </Button>

          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-colors">
              <Upload className="w-4 h-4" /> Importar Planilha
            </div>
          </label>
        </div>
      </div>

      {/* Tabela de Classificação De-Para e Lote */}
      {importLines.length > 0 && (
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Lote Importado: Revisão e Classificação De-Para
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {importLines.filter((l) => l.status === 'ready').length} prontos para salvar •{' '}
                {importLines.filter((l) => l.is_duplicate).length} duplicatas bloqueadas
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Label htmlFor="accSelect">Conta Destino:</Label>
                <select
                  id="accSelect"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleSaveBatch}
                disabled={
                  savingBatch || importLines.filter((l) => l.status === 'ready').length === 0
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 gap-1.5 rounded-xl"
              >
                {savingBatch ? 'Salvando...' : 'Salvar Lote no App'}
                <CheckCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Descrição no Extrato</th>
                  <th className="py-2.5 px-3">Valor</th>
                  <th className="py-2.5 px-3">Categoria Sugerida (De-Para)</th>
                  <th className="py-2.5 px-3">Status / Duplicidade</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importLines.map((line) => (
                  <tr
                    key={line.id}
                    className={`transition-colors ${
                      line.is_duplicate ? 'bg-rose-50/50 opacity-70' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-xs font-bold text-slate-700 whitespace-nowrap">
                      {line.date}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-900 text-xs">
                      {line.description}
                    </td>

                    <td className="py-2.5 px-3 font-bold text-xs whitespace-nowrap">
                      <span
                        className={line.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}
                      >
                        {line.type === 'expense' ? '-' : '+'} {formatCurrency(line.amount)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <select
                        value={line.selected_category_id}
                        onChange={(e) => {
                          const val = e.target.value
                          setImportLines((prev) =>
                            prev.map((item) =>
                              item.id === line.id ? { ...item, selected_category_id: val } : item,
                            ),
                          )
                        }}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 w-full max-w-[220px]"
                      >
                        <option value="">Selecione categoria...</option>
                        {categories
                          .filter((c) =>
                            line.type === 'income' ? c.type === 'income' : c.type === 'expense',
                          )
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.group_level2})
                            </option>
                          ))}
                      </select>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {line.is_duplicate ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Duplicata Bloqueada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Pronto
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() =>
                          setImportLines((prev) => prev.filter((item) => item.id !== line.id))
                        }
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Descartar linha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Regras de De-Para Aprendidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-slate-200 shadow-xs rounded-2xl bg-white p-5 space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Nova Regra De-Para
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Associe um termo frequente do extrato a uma categoria para automatizar importações
              futuras.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleCreateRule} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="pattern" className="text-xs">
                Termo no Histórico (Ex: IFOOD, POSTO, UBER)
              </Label>
              <Input
                id="pattern"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="Ex: CARREFOUR"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="targetCat" className="text-xs">
                Categoria Correspondente
              </Label>
              <select
                id="targetCat"
                value={newCategoryTarget}
                onChange={(e) => setNewCategoryTarget(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                required
              >
                <option value="">Selecione a categoria...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.group_level1} &gt; {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Criar Regra De-Para
            </Button>
          </form>
        </Card>

        {/* Lista de Regras Existentes */}
        <Card className="lg:col-span-2 border-slate-200 shadow-xs rounded-2xl bg-white p-5 space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span>Regras De-Para Ativas ({rules.length})</span>
              <span className="text-xs font-normal text-slate-400">
                Classificação inteligente automática
              </span>
            </CardTitle>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
            {rules.length === 0 ? (
              <div className="col-span-2 text-center text-slate-400 text-xs py-8">
                Nenhuma regra De-Para cadastrada ainda.
              </div>
            ) : (
              rules.map((r) => {
                const cat = r.expand?.category_id || categories.find((c) => c.id === r.category_id)
                return (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-black text-slate-900 tracking-wide font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {r.pattern}
                      </span>
                      <div className="text-xs text-emerald-800 font-semibold mt-1">
                        &rarr; {cat?.name || 'Categoria'}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await deparaService.delete(r.id)
                        setRules((prev) => prev.filter((item) => item.id !== r.id))
                        toast({ title: 'Regra removida.' })
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Excluir regra"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
