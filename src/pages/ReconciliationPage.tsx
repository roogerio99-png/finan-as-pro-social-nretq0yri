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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
  CreditCard,
  Building2,
  Loader2,
  Pencil,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { statementParserService, ParsedStatementTransaction } from '@/services/statementParser'
import { categoryOptionLabel } from '@/components/cadastros/categoriesTree'
import { CategoryCascadeSelect } from '@/components/transactions/CategoryCascadeSelect'

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
  const [detectedBadge, setDetectedBadge] = useState<string | null>(null)
  const [detectedDocType, setDetectedDocType] = useState<'invoice' | 'statement' | null>(null)
  const [statementSummary, setStatementSummary] = useState<{
    badge: string
    startDate?: string
    endDate?: string
    totalIncome: number
    totalExpense: number
    count: number
  } | null>(null)
  const [isDragOver, setIsDragOver] = useState<boolean>(false)
  const [savingBatch, setSavingBatch] = useState<boolean>(false)

  // Modal/Form de Nova Regra De-Para
  const [newPattern, setNewPattern] = useState<string>('')
  const [newCategoryTarget, setNewCategoryTarget] = useState<string>('')

  // Edição de Regra De-Para
  const [editingRule, setEditingRule] = useState<DeparaRuleRecord | null>(null)
  const [editPattern, setEditPattern] = useState<string>('')
  const [editCategoryId, setEditCategoryId] = useState<string>('')
  const [editRuleDialogOpen, setEditRuleDialogOpen] = useState<boolean>(false)
  const [savingEditRule, setSavingEditRule] = useState<boolean>(false)

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

  // Exemplo de demonstração pré-carregado (Fatura com parcelas e compras)
  const handleLoadSampleStatement = () => {
    const today = new Date()
    const currMonth = today.toISOString().slice(0, 7)

    setDetectedBadge('Fatura Nubank (Exemplo)')
    setDetectedDocType('invoice')

    const cardAcc = accounts.find((a) => a.type === 'credit_card' && a.status !== 'archived')
    if (cardAcc) {
      setSelectedAccountId(cardAcc.id)
    }

    const sampleRaw: ParsedStatementTransaction[] = [
      {
        date: `${currMonth}-03`,
        desc: 'IFOOD *RESTAURANTE SAO PAULO',
        amount: 68.9,
        type: 'expense',
      },
      {
        date: `${currMonth}-05`,
        desc: 'UBER *TRIP HELP SP',
        amount: 28.4,
        type: 'expense',
      },
      {
        date: `${currMonth}-08`,
        desc: 'SUPERMERCADO CARREFOUR SP',
        amount: 412.3,
        type: 'expense',
      },
      {
        date: `${currMonth}-10`,
        desc: 'MAGAZINE LUIZA - SMARTPHONE 03/10',
        amount: 199.9,
        type: 'expense',
        installments_total: 10,
        installment_index: 3,
      },
      {
        date: `${currMonth}-12`,
        desc: 'NETFLIX.COM MENSALIDADE',
        amount: 55.9,
        type: 'expense',
      },
      {
        date: `${currMonth}-14`,
        desc: 'ESTORNO COMPRA CANCELADA',
        amount: 75.0,
        type: 'income',
      },
      {
        date: `${currMonth}-08`,
        desc: 'SUPERMERCADO CARREFOUR SP',
        amount: 412.3,
        type: 'expense',
      }, // Duplicata proposital
    ]

    processExtractedLines(sampleRaw)
  }

  // Localiza automaticamente a conta bancária ou cartão que melhor corresponde ao extrato
  const findMatchingAccountId = (
    bankName: string | undefined,
    docType: 'invoice' | 'statement' | undefined,
    acctId: string | undefined,
  ): string | undefined => {
    const active = accounts.filter((a) => a.status !== 'archived')
    if (active.length === 0) return undefined

    // 1. Se for fatura de cartão de crédito
    if (docType === 'invoice') {
      if (bankName) {
        const match = active.find(
          (a) => a.type === 'credit_card' && a.name.toLowerCase().includes(bankName.toLowerCase()),
        )
        if (match) return match.id
      }
      const anyCard = active.find((a) => a.type === 'credit_card')
      if (anyCard) return anyCard.id
    }

    // 2. Por número da conta bancária
    if (acctId) {
      const cleanId = acctId.replace(/[-]/g, '').trim()
      if (cleanId) {
        const match = active.find((a) => a.name.replace(/[-]/g, '').includes(cleanId))
        if (match) return match.id
      }
    }

    // 3. Por nome do banco
    if (bankName) {
      const bankLower = bankName.toLowerCase()
      const match = active.find((a) => {
        const nameLower = a.name.toLowerCase()
        if (bankLower.includes('nubank') || bankLower.includes('nu pagamentos')) {
          return nameLower.includes('nubank') || nameLower.includes('nu')
        }
        if (bankLower.includes('banco do brasil') || bankLower.includes('bco do brasil')) {
          return nameLower.includes('brasil') || nameLower.includes('bb')
        }
        if (bankLower.includes('mercado pago')) {
          return nameLower.includes('mercado pago') || nameLower.includes('mp')
        }
        if (bankLower.includes('santander')) return nameLower.includes('santander')
        if (bankLower.includes('itaú') || bankLower.includes('itau')) return nameLower.includes('itau')
        if (bankLower.includes('bradesco')) return nameLower.includes('bradesco')
        if (bankLower.includes('inter')) return nameLower.includes('inter')
        if (bankLower.includes('c6')) return nameLower.includes('c6')
        return nameLower.includes(bankLower)
      })
      if (match) return match.id
    }

    return undefined
  }

  // Processamento genérico e multi-formato de arquivo (OFX, CSV, PDF, TXT)
  const processIncomingFile = async (file: File) => {
    const fileName = file.name.toLowerCase()
    setDetectedBadge(null)
    setDetectedDocType(null)
    setStatementSummary(null)

    // 1. Arquivo OFX (Open Financial Exchange - Nubank, BB, Itaú, Santander, etc.)
    if (fileName.endsWith('.ofx')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        try {
          const result = statementParserService.parseOfx(text)
          if (result.count > 0) {
            setDetectedBadge(result.badge || 'Extrato OFX')
            setDetectedDocType(result.document_type || 'statement')
            setStatementSummary({
              badge: result.badge || 'Extrato OFX',
              startDate: result.startDate,
              endDate: result.endDate,
              totalIncome: result.totalIncome,
              totalExpense: result.totalExpense,
              count: result.count,
            })

            const matchedAccId = findMatchingAccountId(result.bank, result.document_type, result.acctId)
            if (matchedAccId) {
              setSelectedAccountId(matchedAccId)
            }

            processExtractedLines(result.transactions)
            toast({
              title: `${result.badge || 'Arquivo OFX'} importado!`,
              description: `${result.count} lançamentos identificados com sucesso.`,
            })
          } else {
            toast({
              title: 'Nenhum lançamento no arquivo OFX',
              description: 'O arquivo foi lido, mas não contém transações válidas.',
              variant: 'destructive',
            })
          }
        } catch (err: any) {
          toast({
            title: 'Erro ao processar OFX',
            description: err.message || 'Verifique se o arquivo está no padrão OFX válido.',
            variant: 'destructive',
          })
        }
      }
      reader.readAsText(file)
      return
    }

    // 2. Arquivo PDF (Fatura ou Extrato)
    if (fileName.endsWith('.pdf')) {
      setParsingPdf(true)
      try {
        const result = await statementParserService.parsePdf(file)
        const badge =
          result.badge ||
          (result.bank
            ? `${result.document_type === 'invoice' ? 'Fatura' : 'Extrato'} ${result.bank}`
            : 'Documento PDF')
        setDetectedBadge(badge)
        setDetectedDocType(result.document_type || 'statement')
        setStatementSummary({
          badge,
          startDate: result.startDate,
          endDate: result.endDate,
          totalIncome: result.totalIncome,
          totalExpense: result.totalExpense,
          count: result.count,
        })

        const matchedAccId = findMatchingAccountId(result.bank, result.document_type, result.acctId)
        if (matchedAccId) {
          setSelectedAccountId(matchedAccId)
        }

        processExtractedLines(result.transactions)
        toast({
          title: `${badge} importado!`,
          description: `${result.transactions.length} lançamentos extraídos com sucesso.`,
        })
      } catch (err: any) {
        toast({
          title: 'Não foi possível ler este arquivo',
          description: err.message || 'Verifique se o arquivo PDF contém texto selecionável.',
          variant: 'destructive',
        })
      } finally {
        setParsingPdf(false)
      }
      return
    }

    // 3. Arquivo CSV / TXT / TSV (Nubank, Banco do Brasil, Mercado Pago, etc.)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const result = statementParserService.parseCsv(text)

      if (result.count > 0) {
        setDetectedBadge(result.badge || 'Arquivo CSV / Planilha')
        setDetectedDocType(result.document_type || 'statement')
        setStatementSummary({
          badge: result.badge || 'Arquivo CSV',
          startDate: result.startDate,
          endDate: result.endDate,
          totalIncome: result.totalIncome,
          totalExpense: result.totalExpense,
          count: result.count,
        })

        const matchedAccId = findMatchingAccountId(result.bank, result.document_type, result.acctId)
        if (matchedAccId) {
          setSelectedAccountId(matchedAccId)
        }

        processExtractedLines(result.transactions)
        toast({
          title: `${result.badge || 'Arquivo de Planilha'} lido!`,
          description: `${result.count} lançamentos extraídos com sucesso.`,
        })
      } else {
        toast({
          title: 'Formato não reconhecido',
          description: 'Não foi possível identificar linhas com data e valor no arquivo enviado.',
          variant: 'destructive',
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

  const processExtractedLines = (raw: ParsedStatementTransaction[]) => {
    const seen = new Set<string>()

    const processed: StatementImportLine[] = raw.map((item, idx) => {
      // Normaliza descrição removendo múltiplos espaços para chave única de deduplicação
      const normDesc = item.desc.trim().toUpperCase().replace(/\s+/g, ' ')
      // Se houver fitId (identificador único bancário OFX/Nubank), usa ele com prioridade
      const key = item.fitId ? `fitid_${item.fitId}` : `${item.date}_${normDesc}_${item.amount}`
      const isDuplicate = seen.has(key)
      seen.add(key)

      // Classificação automática via De-Para com nível de confiança
      const suggestion = deparaService.suggestCategory(item.desc, rules, categories)
      const suggestedCatId = suggestion?.categoryId
      const suggestedSource = suggestion?.source

      return {
        id: `line-${idx}-${Date.now()}`,
        date: item.date,
        description: item.desc,
        amount: item.amount,
        type: item.type,
        installments_total: item.installments_total,
        installment_index: item.installment_index,
        suggested_category_id: suggestedCatId,
        suggested_source: suggestedSource,
        // Alta confiança (regra exata) ou regra aprendida por palavra-chave:
        // a categoria já vem pré-selecionada e continua editável.
        selected_category_id:
          suggestedSource === 'exact' || suggestedSource === 'keyword' ? suggestedCatId || '' : '',
        // Selo "sugerido" para confiança menor (palavra-chave do estabelecimento)
        is_suggested: suggestedSource === 'keyword',
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
        installments_total: l.installments_total,
        installments_paid: l.installment_index ?? (l.installments_total ? 1 : undefined),
        category_id: l.selected_category_id || undefined,
        is_reconciled: true,
        import_batch_id: batchId,
      }))

      await transactionsService.createBatch(toCreate)

      // Aprendizado: reforça regras existentes (uso) ou cria por palavra-chave
      // do estabelecimento (ex: 'UBER' a partir de 'UBER DO BRASIL*1234')
      let learnedCount = 0
      let workingRules = [...rules]
      for (const line of validLines) {
        if (!line.selected_category_id) continue
        try {
          const learned = await deparaService.applyConfirmed(
            line.description,
            line.selected_category_id,
            workingRules,
          )
          if (learned) {
            learnedCount++
            workingRules = workingRules.some((r) => r.id === learned.id)
              ? workingRules.map((r) => (r.id === learned.id ? learned : r))
              : [learned, ...workingRules]
          }
        } catch {
          // Ignora falha de aprendizado isolada — o lote já foi salvo
        }
      }
      setRules(workingRules)
      if (learnedCount > 0) {
        toast({ title: `De-Para atualizado: ${learnedCount} regra(s) aprendida(s)/reforçada(s).` })
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

  // Sugerir categorias em massa: aplica as regras aprendidas nas linhas sem
  // categoria e informa quantas foram classificadas de uma vez.
  const handleBulkSuggest = () => {
    const pending = importLines.filter((l) => l.status === 'ready' && !l.selected_category_id)
    if (pending.length === 0) {
      toast({
        title: 'Nada a sugerir',
        description: 'Todas as linhas prontas já têm categoria definida.',
      })
      return
    }

    let categorized = 0
    setImportLines((prev) =>
      prev.map((line) => {
        if (line.status !== 'ready' || line.selected_category_id) return line
        const suggestion = deparaService.suggestCategory(line.description, rules, categories)
        if (!suggestion?.categoryId) return line
        categorized++
        return {
          ...line,
          suggested_category_id: suggestion.categoryId,
          suggested_source: suggestion.source,
          is_suggested: suggestion.source === 'keyword',
          selected_category_id: suggestion.categoryId,
        }
      }),
    )

    if (categorized > 0) {
      toast({
        title: `${categorized} lançamento(s) categorizado(s) automaticamente!`,
        description: 'Revise as categorias sugeridas antes de salvar o lote.',
      })
    } else {
      toast({
        title: 'Nenhuma regra casou com as linhas pendentes',
        description: 'Classifique manualmente e o De-Para aprende ao salvar o lote.',
      })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Top Header & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border transition-all ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-100 shadow-md'
            : 'border-slate-200 shadow-xs'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Conciliação & De-Para
            </h1>
            {detectedBadge && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-xs ${
                  detectedDocType === 'invoice'
                    ? 'bg-purple-100 text-purple-900 border-purple-200'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                }`}
              >
                {detectedDocType === 'invoice' ? (
                  <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                )}
                {detectedBadge}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Importe <strong>Extratos Bancários</strong> ou <strong>Faturas de Cartão</strong> nos
            formatos <strong>OFX</strong>, <strong>CSV</strong> ou <strong>PDF</strong> (Nubank, Banco
            do Brasil, Mercado Pago, Itaú, Santander, Bradesco, etc.). Detecção automática do banco,
            parcelas, identificadores e bloqueio de duplicatas.
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
              accept=".ofx,.csv,.tsv,.txt,.pdf,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={parsingPdf}
            />
            <div className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-colors">
              {parsingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Lendo documento...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Importar OFX / CSV / PDF
                </>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Resumo Consolidado do Arquivo Importado */}
      {statementSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 text-white shadow-md border border-slate-800">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Origem Identificada</span>
            <p className="text-sm font-black text-emerald-400 truncate">{statementSummary.badge}</p>
            {statementSummary.startDate && statementSummary.endDate && (
              <p className="text-[10px] text-slate-300">
                {statementSummary.startDate.split('-').reverse().join('/')} até {statementSummary.endDate.split('-').reverse().join('/')}
              </p>
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Lançamentos</span>
            <p className="text-lg font-black">{statementSummary.count}</p>
            <p className="text-[10px] text-slate-300">identificados no arquivo</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">Total Entradas (+)</span>
            <p className="text-lg font-black text-emerald-400">{formatCurrency(statementSummary.totalIncome)}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-rose-300 uppercase font-bold tracking-wider">Total Saídas (-)</span>
            <p className="text-lg font-black text-rose-400">{formatCurrency(statementSummary.totalExpense)}</p>
          </div>
        </div>
      )}

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
                onClick={handleBulkSuggest}
                variant="outline"
                disabled={savingBatch}
                className="text-xs text-purple-800 border-purple-200 bg-purple-50 hover:bg-purple-100 gap-1.5 rounded-xl"
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                Sugerir categorias
              </Button>

              <Button
                onClick={() => {
                  setImportLines([])
                  setStatementSummary(null)
                  setDetectedBadge(null)
                  setDetectedDocType(null)
                }}
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 gap-1 rounded-xl"
                title="Descartar este lote e carregar outro extrato"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
                Limpar Lote
              </Button>

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

          {/* Visualização Mobile do Lote: Cards empilhados */}
          <div className="md:hidden divide-y divide-slate-100">
            {importLines.map((line) => (
              <div
                key={line.id}
                className={`p-3.5 space-y-2.5 ${line.is_duplicate ? 'bg-rose-50/60' : 'bg-white'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">{line.date}</span>
                      {line.installments_total && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {line.installment_index
                            ? `${line.installment_index}/${line.installments_total}`
                            : `${line.installments_total}x`}
                        </span>
                      )}
                      {line.is_duplicate ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          Duplicata
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Pronto
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 text-sm mt-0.5 break-words">
                      {line.description}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-sm font-black ${
                        line.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {line.type === 'expense' ? '-' : '+'} {formatCurrency(line.amount)}
                    </p>
                    <button
                      onClick={() =>
                        setImportLines((prev) => prev.filter((item) => item.id !== line.id))
                      }
                      className="text-slate-400 hover:text-rose-600 p-1 mt-1 inline-block"
                      title="Descartar linha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Categoria (De-Para):
                  </label>
                  <CategoryCascadeSelect
                    categories={categories}
                    type={line.type === 'income' ? 'income' : 'expense'}
                    categoryId={line.selected_category_id || ''}
                    onCategoryChange={(val) => {
                      setImportLines((prev) =>
                        prev.map((item) =>
                          item.id === line.id
                            ? { ...item, selected_category_id: val, is_suggested: false }
                            : item,
                        ),
                      )
                    }}
                    variant="compact"
                    idPrefix={`cat-mobile-${line.id}`}
                    selectClassName={
                      line.is_suggested && line.selected_category_id
                        ? 'border-purple-300 bg-purple-50 text-purple-900'
                        : 'bg-white border-slate-200 text-slate-800'
                    }
                  />
                  {line.is_suggested && line.selected_category_id && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      <Sparkles className="w-2.5 h-2.5" /> sugerido
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tabela Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Descrição / Estabelecimento</th>
                  <th className="py-2.5 px-3">Parcelas</th>
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

                    <td className="py-2.5 px-3 text-xs text-slate-600 whitespace-nowrap">
                      {line.installments_total ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          {line.installment_index
                            ? `${line.installment_index}/${line.installments_total}`
                            : `${line.installments_total}x`}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">À vista</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-bold text-xs whitespace-nowrap">
                      <span
                        className={line.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}
                      >
                        {line.type === 'expense' ? '-' : '+'} {formatCurrency(line.amount)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="space-y-1">
                        <CategoryCascadeSelect
                          categories={categories}
                          type={line.type === 'income' ? 'income' : 'expense'}
                          categoryId={line.selected_category_id || ''}
                          onCategoryChange={(val) => {
                            setImportLines((prev) =>
                              prev.map((item) =>
                                item.id === line.id
                                  ? { ...item, selected_category_id: val, is_suggested: false }
                                  : item,
                              ),
                            )
                          }}
                          variant="compact"
                          idPrefix={`cat-desktop-${line.id}`}
                          selectClassName={`max-w-[220px] ${
                            line.is_suggested && line.selected_category_id
                              ? 'border-purple-300 bg-purple-50 text-purple-900'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        />
                        {line.is_suggested && line.selected_category_id && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                            <Sparkles className="w-3 h-3" /> sugerido
                          </span>
                        )}
                      </div>
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
                    {categoryOptionLabel(c)}
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
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        usada {r.usage_count ?? 0}x
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingRule(r)
                          setEditPattern(r.pattern)
                          setEditCategoryId(r.category_id)
                          setEditRuleDialogOpen(true)
                        }}
                        className="text-slate-400 hover:text-slate-800 p-1 rounded"
                        title="Alterar regra"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Deseja excluir a regra "${r.pattern}"?`)) return
                          await deparaService.delete(r.id)
                          setRules((prev) => prev.filter((item) => item.id !== r.id))
                          toast({ title: 'Regra removida.' })
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                        title="Excluir regra"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>

      {/* Modal de Edição de Regra De-Para */}
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
                  pattern: editPattern,
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
              <Label htmlFor="edPat">Termo no Extrato / Fatura</Label>
              <Input
                id="edPat"
                value={editPattern}
                onChange={(e) => setEditPattern(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edCat">Categoria Destino</Label>
              <select
                id="edCat"
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
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
