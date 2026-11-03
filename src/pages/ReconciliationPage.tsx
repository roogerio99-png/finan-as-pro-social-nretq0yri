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
  FileText,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { statementParserService, ParsedStatementTransaction } from '@/services/statementParser'

export const ReconciliationPage: React.FC = () => {
  const { toast } = useToast()
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [rules, setRules] = useState<DeparaRuleRecord[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')

  // Linhas importadas em processamento
  const [importLines, setImportLines] = useState<StatementImportLine[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [parsingPdf, setParsingPdf] = useState<boolean>(false)
  const [detectedBank, setDetectedBank] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState<boolean>(false)
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

  // Processamento genérico de arquivo (PDF, CSV, XLSX, TXT)
  const processIncomingFile = async (file: File) => {
    const fileName = file.name.toLowerCase()
    setDetectedBank(null)

    if (fileName.endsWith('.pdf')) {
      setParsingPdf(true)
      try {
        const result = await statementParserService.parsePdf(file)
        if (result.bank) setDetectedBank(result.bank)
        processExtractedLines(result.transactions)
        toast({
          title: result.bank ? `Extrato ${result.bank} importado!` : 'Extrato PDF importado!',
          description: `${result.transactions.length} movimentações extraídas com sucesso.`,
        })
      } catch (err: any) {
        toast({
          title: 'Não foi possível ler este extrato',
          description: err.message || 'Verifique se o arquivo PDF contém texto selecionável.',
          variant: 'destructive',
        })
      } finally {
        setParsingPdf(false)
      }
      return
    }

    // Leitura CSV / Texto
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = statementParserService.parseCsv(text)

      if (parsed.length > 0) {
        processExtractedLines(parsed)
        toast({
          title: 'Arquivo de planilha lido!',
          description: `${parsed.length} linhas extraídas com sucesso.`,
        })
      } else {
        handleLoadSampleStatement()
        toast({
          title: 'Aviso',
          description: 'Formato não reconhecido, carregando lote de demonstração com deduplicação.',
        })
      }
    }
    reader.readAsText(file)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processIncomingFile(file)
    // Limpa o input para permitir selecionar o mesmo arquivo novamente se desejar
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processIncomingFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
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
      {/* Top Header & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border transition-all ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-100 shadow-md'
            : 'border-slate-200 shadow-xs'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Conciliação Bancária & De-Para
            </h1>
            {detectedBank && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Extrato {detectedBank}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Importe extratos bancários em <strong>PDF</strong> (Nubank, Banco do Brasil, Mercado Pago, Itaú...) ou planilhas (.csv / .xlsx). O leitor genérico extrai movimentações sem precisar configurar nada.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            onClick={handleLoadSampleStatement}
            disabled={parsingPdf}
            className="text-xs text-emerald-800 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Carregar Exemplo
          </Button>

          <label className={`cursor-pointer ${parsingPdf ? 'pointer-events-none opacity-60' : ''}`}>
            <input
              type="file"
              accept=".pdf,.csv,.xlsx,.xls,.txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={parsingPdf}
            />
            <div className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-colors">
              {parsingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processando PDF...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Importar Extrato (PDF / CSV)
                </>
              )}
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
