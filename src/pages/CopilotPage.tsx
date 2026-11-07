import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Target,
  TrendingDown,
  ArrowRight,
  TrendingUp,
  Receipt,
  Bot,
  Zap,
  HelpCircle,
  ShieldCheck,
  Calendar,
  Wallet,
  Tag,
  DollarSign,
  Mic,
  MicOff,
  Flame,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { CopilotLiveMode } from '@/components/copilot/CopilotLiveMode'
import { TransactionDialog } from '@/components/transactions/TransactionDialog'
import { invoicesService } from '@/services/invoices'
import { deparaService } from '@/services/depara'
import { InvoiceRecord, DeparaRuleRecord, TransactionType } from '@/types/finance'
import { Radio } from 'lucide-react'
import {
  copilotService,
  QuickTransactionSuggestion,
  FinancialHealthDiagnostic,
  BudgetRecommendation,
} from '@/services/copilotService'
import { transactionsService } from '@/services/transactions'
import { accountsService } from '@/services/accounts'
import { categoriesService } from '@/services/categories'
import { AccountRecord } from '@/types/finance'
import { CategoryRecord } from '@/services/categories'

export const CopilotPage: React.FC = () => {
  const { toast } = useToast()

  // Estados gerais
  const [activeTab, setActiveTab] = useState<'quick-tx' | 'budget' | 'insights' | 'chat'>('quick-tx')
  const [liveModeOpen, setLiveModeOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])

  // Estados do Modal de Confirmação e Validação do Lançamento
  const [dialogOpen, setDialogOpen] = useState(false)
  const [txType, setTxType] = useState<TransactionType>('expense')
  const [txDescription, setTxDescription] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0])
  const [txAccountId, setTxAccountId] = useState('')
  const [txTargetAccountId, setTxTargetAccountId] = useState('')
  const [txSelectedInvoiceId, setTxSelectedInvoiceId] = useState('')
  const [txCategoryId, setTxCategoryId] = useState('')
  const [txNotes, setTxNotes] = useState('')
  const [txInstallmentsTotal, setTxInstallmentsTotal] = useState('1')
  const [txInstallmentsPaid, setTxInstallmentsPaid] = useState('0')
  const [voiceFields, setVoiceFields] = useState<Record<string, boolean>>({})
  const [openInvoices, setOpenInvoices] = useState<InvoiceRecord[]>([])
  const [deparaRules, setDeparaRules] = useState<DeparaRuleRecord[]>([])

  // Estado do Lançamento Rápido
  const [quickInput, setQuickInput] = useState('')
  const [suggestion, setSuggestion] = useState<QuickTransactionSuggestion | null>(null)
  const [isSavingTx, setIsSavingTx] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Estado do Orçamento Inteligente
  const [customIncome, setCustomIncome] = useState<number>(4000)
  const [budgetRecs, setBudgetRecs] = useState<BudgetRecommendation[]>([])
  const [isApplyingBudgets, setIsApplyingBudgets] = useState(false)

  // Estado do Diagnóstico
  const [diagnostic, setDiagnostic] = useState<FinancialHealthDiagnostic | null>(null)

  // Estado do Chat
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    {
      sender: 'bot',
      text: 'Olá! Sou seu **Copiloto Financeiro Inteligente**. Estou aqui para analisar seus números, sugerir orçamentos realistas e registrar seus gastos com linguagem natural. Como posso te apoiar hoje?',
    },
  ])

  // Carrega contas, categorias e diagnóstico
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const accs = await accountsService.getAll().catch(() => [])
      const cats = await categoriesService.getAll().catch(() => [])
      setAccounts(accs)
      setCategories(cats)

      const [diag, invs, rules] = await Promise.all([
        copilotService.getDiagnostic().catch(() => null),
        invoicesService.getAll().catch(() => []),
        deparaService.getAll().catch(() => []),
      ])
      if (diag) {
        setDiagnostic(diag)
        if (diag.totalIncomeMonth > 0) {
          setCustomIncome(diag.totalIncomeMonth)
        }
        try {
          const budgetData = await copilotService.generateSmartBudget(diag.totalIncomeMonth || 4000)
          setBudgetRecs(budgetData.recommendations)
        } catch {
          // ignore
        }
      }
      setOpenInvoices((invs || []).filter((i: any) => i.status === 'open' || i.status === 'overdue'))
      setDeparaRules(rules || [])
    } catch (err) {
      console.error('Erro ao carregar dados do copiloto:', err)
    } finally {
      setLoading(false)
    }
  }

  // Interpretação em tempo real da frase digitada
  const handleQuickInputChange = async (text: string) => {
    setQuickInput(text)
    if (text.trim().length > 3) {
      try {
        const parsed = await copilotService.parseNaturalTransaction(text, accounts, categories)
        setSuggestion(parsed)
      } catch (err) {
        console.error('Erro no parser:', err)
      }
    } else {
      setSuggestion(null)
    }
  }

  // Abre a tela de lançamento pré-preenchida para validação do usuário
  const openTransactionDialogWithData = async (data: {
    type?: TransactionType
    description?: string
    amount?: number | string | null
    date?: string
    accountId?: string
    categoryId?: string
    notes?: string
  }) => {
    const todayIso = new Date().toISOString().split('T')[0]
    setTxType(data.type || 'expense')
    setTxDescription(data.description || '')
    setTxAmount(data.amount ? String(data.amount) : '')
    setTxDate(data.date || todayIso)

    // Garante que accounts e categories estejam disponíveis
    let currentAccounts = accounts
    if (currentAccounts.length === 0) {
      currentAccounts = await accountsService.getAll().catch(() => [])
      setAccounts(currentAccounts)
    }
    let currentCategories = categories
    if (currentCategories.length === 0) {
      currentCategories = await categoriesService.getAll().catch(() => [])
      setCategories(currentCategories)
    }

    let accId = data.accountId
    if (accId && !currentAccounts.some((a) => a.id === accId)) {
      accId = ''
    }
    if (!accId && currentAccounts.length > 0) {
      accId = currentAccounts[0].id
    }
    setTxAccountId(accId || '')

    let catId = data.categoryId
    if (catId && !currentCategories.some((c) => c.id === catId)) {
      catId = ''
    }
    if (!catId && currentCategories.length > 0) {
      const match = currentCategories.find((c) => c.type === (data.type || 'expense'))
      catId = match?.id || currentCategories[0].id
    }
    setTxCategoryId(catId || '')

    setTxTargetAccountId('')
    setTxSelectedInvoiceId('')
    setTxNotes(data.notes || 'Preenchido automaticamente pelo Copiloto IA')
    setTxInstallmentsTotal('1')
    setTxInstallmentsPaid('0')
    setVoiceFields({
      amount: !!data.amount,
      description: !!data.description,
      category: !!catId,
      account: !!accId,
      date: !!data.date,
    })
    setDialogOpen(true)
  }

  // Submissão oficial após validação do usuário na tela
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!txAmount || !txAccountId) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha o valor e a conta do lançamento.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingTx(true)
    try {
      const parsedAmount = Math.abs(parseFloat(txAmount))
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Informe um valor válido maior que zero.')
      }

      const selectedAcc = accounts.find((a) => a.id === txAccountId)
      const competenceMonth = txDate.slice(0, 7)
      let cashMonth = competenceMonth

      if (
        selectedAcc &&
        selectedAcc.type === 'credit_card' &&
        selectedAcc.closing_day &&
        selectedAcc.due_day
      ) {
        cashMonth = accountsService.calculateCashDueDate(
          txDate,
          selectedAcc.closing_day,
          selectedAcc.due_day,
        )
      }

      const isCreditCard = selectedAcc?.type === 'credit_card'
      const installments =
        txType === 'expense' && isCreditCard ? Math.max(1, parseInt(txInstallmentsTotal, 10) || 1) : 1

      await transactionsService.create({
        description: txDescription || 'Lançamento via Copiloto',
        amount: parsedAmount,
        type: txType,
        account_id: txAccountId,
        category_id: txType === 'expense' || txType === 'income' ? txCategoryId || undefined : undefined,
        date: txDate,
        competence_month: competenceMonth,
        cash_month: cashMonth,
        installments_total: installments,
        installments_paid:
          installments > 1
            ? Math.min(installments, Math.max(0, parseInt(txInstallmentsPaid, 10) || 0))
            : 0,
        notes: txNotes || undefined,
        status: 'completed',
      })

      toast({
        title: 'Lançamento confirmado com sucesso!',
        description: `${txType === 'income' ? 'Receita' : 'Despesa'} de ${formatBRL(parsedAmount)} cadastrada.`,
      })

      setDialogOpen(false)
      setQuickInput('')
      setSuggestion(null)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar o lançamento.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingTx(false)
    }
  }

  // Confirma e abre a tela com a sugestão atual
  const handleConfirmTransaction = () => {
    if (!suggestion || suggestion.parseResult.amount === null) {
      toast({
        title: 'Valor não identificado',
        description: 'Por favor, inclua um valor numérico na frase (ex: "Gastei 45 no almoço").',
        variant: 'destructive',
      })
      return
    }

    openTransactionDialogWithData({
      type: suggestion.parseResult.type,
      description: suggestion.parseResult.description,
      amount: suggestion.parseResult.amount,
      date: suggestion.parseResult.date,
      accountId: suggestion.suggestedAccountId,
      categoryId: suggestion.suggestedCategoryId,
    })
  }

  // Ao clicar em Enviar por texto ou dar Enter: interpreta e abre a tela de confirmação
  const handleSendQuickInput = async () => {
    const text = quickInput.trim()
    if (!text) return

    try {
      const parsed = await copilotService.parseNaturalTransaction(text, accounts, categories)
      setSuggestion(parsed)

      if (parsed.parseResult.amount === null) {
        toast({
          title: 'Valor não identificado',
          description: 'Por favor, inclua um valor monetário na frase (ex: "Almoço 45 reais").',
          variant: 'destructive',
        })
        return
      }

      // Abre a tela de lançamento pré-preenchida para validação
      openTransactionDialogWithData({
        type: parsed.parseResult.type,
        description: parsed.parseResult.description,
        amount: parsed.parseResult.amount,
        date: parsed.parseResult.date,
        accountId: parsed.suggestedAccountId,
        categoryId: parsed.suggestedCategoryId,
      })
    } catch (err) {
      toast({
        title: 'Erro ao interpretar',
        description: 'Não foi possível ler as informações do lançamento.',
        variant: 'destructive',
      })
    }
  }

  // Encerra a escuta do microfone com segurança
  const stopListening = useCallback(() => {
    setIsListening(false)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
  }, [])

  // Processa o texto falado e abre a tela com sugestões
  const processSpokenTranscript = async (transcript: string) => {
    const text = transcript.trim()
    if (!text) return
    setQuickInput(text)
    try {
      const parsed = await copilotService.parseNaturalTransaction(text, accounts, categories)
      setSuggestion(parsed)
      if (parsed.parseResult.amount !== null && parsed.parseResult.amount > 0) {
        openTransactionDialogWithData({
          type: parsed.parseResult.type,
          description: parsed.parseResult.description,
          amount: parsed.parseResult.amount,
          date: parsed.parseResult.date,
          accountId: parsed.suggestedAccountId,
          categoryId: parsed.suggestedCategoryId,
        })
      } else {
        toast({
          title: 'Frase reconhecida!',
          description: `"${text}" — Para abrir a tela de lançamento, inclua também o valor (ex: "Almoço 42 reais").`,
        })
      }
    } catch (err) {
      console.error('Erro ao interpretar fala:', err)
    }
  }

  // Ativa e controla o reconhecimento de voz nativo com permissões explícitas e transcrição em tempo real
  const handleToggleVoice = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      toast({
        title: 'Microfone não suportado neste navegador',
        description: 'Recomendamos usar o Google Chrome ou Microsoft Edge no celular/desktop para comando por voz.',
        variant: 'destructive',
      })
      return
    }

    if (isListening) {
      stopListening()
      if (quickInput.trim()) {
        handleSendQuickInput()
      }
      return
    }

    // Solicita permissão explícita de microfone ao navegador para evitar falha silenciosa
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
      } catch (err: any) {
        toast({
          title: 'Permissão de microfone necessária',
          description: 'Por favor, clique no ícone de cadeado/permissões ao lado do endereço do site e autorize o microfone.',
          variant: 'destructive',
        })
        return
      }
    }

    try {
      stopListening()
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.lang = 'pt-BR'
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        let interimText = ''
        let finalText = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript
          } else {
            interimText += event.results[i][0].transcript
          }
        }

        const currentSaid = (finalText || interimText).trim()
        if (currentSaid) {
          setQuickInput(currentSaid)
        }

        if (finalText.trim().length > 0) {
          stopListening()
          processSpokenTranscript(finalText.trim())
        }
      }

      recognition.onerror = (e: any) => {
        stopListening()
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          toast({
            title: 'Microfone bloqueado',
            description: 'Autorize o acesso ao microfone nas configurações do navegador para ditar seus gastos.',
            variant: 'destructive',
          })
        } else if (e.error === 'no-speech') {
          toast({
            title: 'Nenhuma voz ouvida',
            description: 'Não detectamos som. Clique no microfone e tente falar mais próximo do aparelho.',
          })
        } else if (e.error !== 'aborted') {
          toast({
            title: 'Falha na captura de áudio',
            description: 'Não foi possível captar o áudio. Tente novamente ou use o campo de texto.',
            variant: 'destructive',
          })
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
    } catch {
      stopListening()
      toast({
        title: 'Erro ao ligar microfone',
        description: 'Não foi possível inicializar a captura de áudio.',
        variant: 'destructive',
      })
    }
  }

  // Recalcular orçamento inteligente
  const handleRecalculateBudget = async () => {
    setLoading(true)
    try {
      const budgetData = await copilotService.generateSmartBudget(customIncome)
      setBudgetRecs(budgetData.recommendations)
      toast({
        title: 'Orçamento recalculado!',
        description: `Metas geradas com base na renda mensal de R$ ${customIncome.toLocaleString('pt-BR')}.`,
      })
    } finally {
      setLoading(false)
    }
  }

  // Aplicar orçamento no sistema
  const handleApplyBudgets = async () => {
    setIsApplyingBudgets(true)
    try {
      const curMonth = new Date().toISOString().slice(0, 7)
      if (!budgetRecs || budgetRecs.length === 0) {
        toast({
          title: 'Nenhum teto para aplicar',
          description: 'Ajuste a renda para gerar recomendações.',
          variant: 'destructive',
        })
        return
      }
      const count = await copilotService.applyBudgetRecommendations(budgetRecs, curMonth)
      toast({
        title: 'Orçamento ativado com sucesso!',
        description: `${count} tetos orçamentários definidos para o mês ${curMonth}.`,
      })
      await loadData()
    } catch (err: any) {
      console.error('Erro ao aplicar orçamento:', err)
      toast({
        title: 'Erro ao aplicar orçamento',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsApplyingBudgets(false)
    }
  }

  // Envio de mensagem no chat
  const handleSendChat = async (textToSend?: string) => {
    const query = (textToSend || chatInput).trim()
    if (!query) return

    const newMessages = [...chatMessages, { sender: 'user' as const, text: query }]
    setChatMessages(newMessages)
    setChatInput('')

    try {
      const response = await copilotService.askCopilot(query)
      setChatMessages([...newMessages, { sender: 'bot' as const, text: response }])
    } catch {
      setChatMessages([
        ...newMessages,
        {
          sender: 'bot' as const,
          text: 'Desculpe, tive uma oscilação temporária ao processar a resposta. Tente novamente em alguns segundos.',
        },
      ])
    }
  }

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Banner Principal com Apelo Visual Moderno */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 border border-indigo-500/30 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Copiloto de Inteligência Financeira</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Seu Assistente Pessoal para Lançamentos, Orçamento &amp; Economia
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Interprete gastos em linguagem natural, gere tetos orçamentários realistas com a regra
              50/30/20 e receba diagnósticos práticos para acelerar sua liberdade financeira.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <Button
                onClick={() => setLiveModeOpen(true)}
                className="bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:via-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl h-14 px-6 text-sm gap-2.5 shadow-xl transition-all active:scale-95 border border-white/20 w-full sm:w-auto"
              >
                <Radio className="w-5 h-5 text-rose-300 animate-pulse" />
                <span>Iniciar Modo Live</span>
              </Button>
              <span className="text-[11px] text-center text-slate-300">
                Conversa bidirecional por voz
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[140px]">
              <p className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
                Saúde Financeira
              </p>
              <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center justify-center gap-1">
                {diagnostic?.score || 50}
                <span className="text-xs text-slate-400">/100</span>
              </div>
              <Badge
                className={`mt-2 text-[10px] font-bold ${
                  diagnostic?.status === 'excellent' || diagnostic?.status === 'good'
                    ? 'bg-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/30 text-amber-300'
                }`}
              >
                {diagnostic?.status === 'excellent'
                  ? 'Excelente'
                  : diagnostic?.status === 'good'
                    ? 'Saudável'
                    : 'Atenção Necessária'}
              </Badge>
            </div>
          </div>
          </div>
        </div>

        {/* Garantia de Privacidade Local */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            100% dos dados financeiros e análises permanecem salvos no seu aparelho celular ou
            computador.
          </span>
        </div>
      </div>

      {/* Navegação por Abas Principais */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 p-1 bg-slate-200/80 rounded-2xl h-auto">
          <TabsTrigger
            value="quick-tx"
            className="rounded-xl py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-sm"
          >
            <Receipt className="w-4 h-4 text-indigo-600" />
            Lançamento Rápido
          </TabsTrigger>
          <TabsTrigger
            value="budget"
            className="rounded-xl py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-sm"
          >
            <Target className="w-4 h-4 text-emerald-600" />
            Orçamento 50/30/20
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="rounded-xl py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-sm"
          >
            <Lightbulb className="w-4 h-4 text-amber-600" />
            Raio-X &amp; Economia
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="rounded-xl py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-sm"
          >
            <Bot className="w-4 h-4 text-purple-600" />
            Consultor IA
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: LANÇAMENTO RÁPIDO POR LINGUAGEM NATURAL */}
        <TabsContent value="quick-tx" className="space-y-6">
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Lançamento Inteligente por Texto ou Voz
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Basta digitar ou ditar a despesa ou receita como você fala. A IA detecta o valor, a
                    conta e a categoria ideal.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Campo de Entrada Principal */}
              <div className="relative flex items-center">
                <Input
                  value={quickInput}
                  onChange={(e) => handleQuickInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendQuickInput()
                    }
                  }}
                  placeholder={
                    isListening
                      ? '🎙️ Gravando sua voz... Fale agora seu lançamento!'
                      : 'Ex: Paguei 54 reais no almoço hoje com cartão de crédito...'
                  }
                  className={`h-16 pl-5 pr-28 sm:pr-36 text-base sm:text-lg rounded-2xl transition-all ${
                    isListening
                      ? 'border-rose-400 ring-4 ring-rose-100 bg-rose-50/30'
                      : 'border-slate-300 focus-visible:ring-indigo-500 bg-slate-50/50'
                  }`}
                />
                <div className="absolute right-3 top-3 flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleToggleVoice}
                    className={`h-10 w-10 rounded-xl transition-all shadow-md ${
                      isListening
                        ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-4 ring-rose-200'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                    title={isListening ? 'Parar gravação e processar' : 'Falar comando de voz'}
                  >
                    {isListening ? <MicOff className="w-5 h-5 animate-bounce" /> : <Mic className="w-5 h-5" />}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSendQuickInput}
                    disabled={!quickInput.trim() || isSavingTx}
                    className="h-10 px-3.5 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-40"
                    title="Enviar e processar lançamento (Enter)"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs font-semibold">Enviar</span>
                  </Button>
                </div>
              </div>

              {/* Indicador em tempo real de gravação */}
              {isListening && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 text-rose-900 text-xs font-medium animate-pulse">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                  </span>
                  <span>
                    <strong>Microfone ligado:</strong> fale por exemplo <em>"Almoço restaurante 42 reais hoje"</em>. Ao pausar a fala ou clicar no microfone, a tela abrirá pré-preenchida.
                  </span>
                </div>
              )}

              {/* Botões com Exemplos Práticos */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Clique em um exemplo para testar:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Almoço restaurante 42 reais hoje',
                    'Mercado mensal 350 reais no débito',
                    'Conta de luz 145 reais',
                    'Recebi freela 1200 via pix',
                    'Farmácia remédio 68 reais',
                    'Combustível posto 180 reais',
                  ].map((ex, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickInputChange(ex)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pré-visualização da Sugestão da IA */}
              {suggestion && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-emerald-50/50 border border-indigo-200/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`font-bold ${
                          suggestion.parseResult.type === 'income'
                            ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                            : 'bg-rose-600 hover:bg-rose-600 text-white'
                        }`}
                      >
                        {suggestion.parseResult.type === 'income' ? 'Receita (+)' : 'Despesa (-)'}
                      </Badge>
                      <span className="text-xs text-slate-500 font-medium">
                        Confiança da IA: <b>{suggestion.confidence}%</b>
                      </span>
                    </div>

                    <div className="text-xl sm:text-2xl font-black text-slate-900">
                      {suggestion.parseResult.amount !== null
                        ? formatBRL(suggestion.parseResult.amount)
                        : 'Valor pendente'}
                    </div>
                  </div>

                  {/* Detalhes Extraídos */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-100 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-slate-400 block mb-1">Descrição:</span>
                      <strong className="text-slate-800 text-sm">
                        {suggestion.parseResult.description || 'Lançamento sem título'}
                      </strong>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-slate-400 block mb-1">Categoria Sugerida:</span>
                      <strong className="text-indigo-700 text-sm flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                        {suggestion.suggestedCategoryName || 'Geral'}
                      </strong>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-slate-400 block mb-1">Conta / Forma:</span>
                      <strong className="text-slate-800 text-sm flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-slate-500" />
                        {suggestion.suggestedAccountName || 'Conta Principal'}
                      </strong>
                    </div>
                  </div>

                  {/* Ação de Confirmação */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={handleConfirmTransaction}
                      disabled={isSavingTx || suggestion.parseResult.amount === null}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isSavingTx ? 'Salvando...' : 'Confirmar e Salvar Lançamento'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: ORÇAMENTO INTELIGENTE (50/30/20) */}
        <TabsContent value="budget" className="space-y-6">
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Orçamento Baseado na Regra 50/30/20
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Divisão equilibrada recomendada por especialistas para manter as contas em dia e
                      guardar dinheiro.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <span className="text-xs font-semibold text-slate-600 pl-2">Renda Mensal: R$</span>
                    <Input
                      type="number"
                      value={customIncome}
                      onChange={(e) => setCustomIncome(Number(e.target.value) || 0)}
                      className="w-28 h-8 rounded-xl text-xs font-bold text-slate-900 bg-white"
                    />
                    <Button
                      size="sm"
                      onClick={handleRecalculateBudget}
                      className="h-8 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                    >
                      Ajustar
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Visão Macro da Regra 50/30/20 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge className="bg-blue-600 text-white text-xs font-bold">50% Essenciais</Badge>
                    <span className="text-xs text-blue-700 font-semibold">Custos Fixos</span>
                  </div>
                  <div className="text-2xl font-black text-blue-950">
                    {formatBRL(customIncome * 0.5)}
                  </div>
                  <p className="text-xs text-blue-700">
                    Moradia, alimentação básica, saúde, energia, água e transporte essencial.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge className="bg-purple-600 text-white text-xs font-bold">30% Estilo de Vida</Badge>
                    <span className="text-xs text-purple-700 font-semibold">Discricionários</span>
                  </div>
                  <div className="text-2xl font-black text-purple-950">
                    {formatBRL(customIncome * 0.3)}
                  </div>
                  <p className="text-xs text-purple-700">
                    Lazer, restaurantes, viagens, compras pessoais e streamings.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge className="bg-emerald-600 text-white text-xs font-bold">20% Futuro</Badge>
                    <span className="text-xs text-emerald-700 font-semibold">Segurança &amp; Metas</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-950">
                    {formatBRL(customIncome * 0.2)}
                  </div>
                  <p className="text-xs text-emerald-700">
                    Amortização rápida de dívidas e aporte para sua Reserva de Emergência.
                  </p>
                </div>
              </div>

              {/* Tabela de Recomendações por Grupo de Contas */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800">
                  Tetos Orçamentários Recomendados para o seu Mês
                </h3>

                <div className="space-y-2.5">
                  {budgetRecs.map((rec, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-slate-900">{rec.groupName}</strong>
                          <Badge variant="outline" className="text-[10px] text-slate-500">
                            {rec.recommendedPercent}% da renda
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 max-w-xl">{rec.reason}</p>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                            Teto Sugerido
                          </span>
                          <span className="text-base font-extrabold text-emerald-700">
                            {formatBRL(rec.recommendedAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão de Aplicação no Sistema */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="text-sm font-bold">Deseja ativar esse orçamento no seu aplicativo?</h4>
                  <p className="text-xs text-slate-400">
                    A IA criará e atualizará os limites das categorias para o mês atual.
                  </p>
                </div>
                <Button
                  onClick={handleApplyBudgets}
                  disabled={isApplyingBudgets}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl gap-2 w-full sm:w-auto"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isApplyingBudgets ? 'Aplicando...' : 'Aplicar Orçamento Sugerido'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: RAIO-X & DICAS DE ECONOMIA */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Maiores Centros de Custo */}
            <Card className="rounded-3xl border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  Para onde seu dinheiro está indo este mês?
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Categorias com maior peso sobre o total de gastos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {diagnostic?.topExpenseCategories && diagnostic.topExpenseCategories.length > 0 ? (
                  diagnostic.topExpenseCategories.map((cat, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-800">{cat.name}</span>
                        <span className="text-slate-600 font-semibold">
                          {formatBRL(cat.amount)} ({cat.percent}%)
                        </span>
                      </div>
                      <Progress value={cat.percent} className="h-2 rounded-full" />
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Nenhum gasto registrado ainda este mês. Conforme você lançar, os gráficos serão
                    gerados automaticamente.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dicas Práticas de Economia */}
            <Card className="rounded-3xl border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Plano Prático de Economia &amp; Melhores Ações
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Ações baseadas na sua realidade para cortar desperdícios.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {diagnostic?.actionableTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/50 text-xs text-amber-950 flex items-start gap-3"
                  >
                    <div className="p-1 rounded-full bg-amber-500 text-white mt-0.5 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <span className="leading-relaxed font-medium">{tip}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA 4: CHAT COM O COPILOTO */}
        <TabsContent value="chat" className="space-y-6">
          <Card className="rounded-3xl border-slate-200 shadow-sm bg-white flex flex-col h-[580px] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Conversar com o Copiloto IA
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Pergunte sobre orçamento, estratégias de dívidas ou como guardar mais dinheiro.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            {/* Histórico de Mensagens */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Perguntas Rápidas */}
            <div className="p-3 border-t border-slate-100 bg-white shrink-0 flex items-center gap-2 overflow-x-auto">
              <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
                Sugestões:
              </span>
              {[
                'Como posso economizar este mês?',
                'Como dividir meu orçamento na regra 50/30/20?',
                'Qual a melhor estratégia para dívidas?',
                'Como estão minhas finanças?',
              ].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChat(q)}
                  className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 shrink-0 border border-slate-200/80 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Formulário de Envio */}
            <div className="p-4 border-t border-slate-200 bg-white shrink-0 flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Digite sua dúvida financeira para o Copiloto..."
                className="h-11 rounded-xl text-xs sm:text-sm border-slate-300 focus-visible:ring-purple-500"
              />
              <Button
                onClick={() => handleSendChat()}
                className="h-11 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2 font-bold"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Perguntar</span>
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal / Tela Cheia do Modo Live com Callback de Confirmação */}
      <CopilotLiveMode
        isOpen={liveModeOpen}
        onClose={() => setLiveModeOpen(false)}
        onTransactionCreated={loadData}
        onReviewTransaction={(data) => {
          openTransactionDialogWithData(data)
        }}
      />

      {/* Modal Oficial de Lançamento para Validação Prévia do Usuário */}
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={txType}
        setType={setTxType}
        description={txDescription}
        setDescription={setTxDescription}
        amount={txAmount}
        setAmount={setTxAmount}
        date={txDate}
        setDate={setTxDate}
        accountId={txAccountId}
        setAccountId={setTxAccountId}
        targetAccountId={txTargetAccountId}
        setTargetAccountId={setTxTargetAccountId}
        selectedInvoiceId={txSelectedInvoiceId}
        setSelectedInvoiceId={setTxSelectedInvoiceId}
        categoryId={txCategoryId}
        setCategoryId={setTxCategoryId}
        notes={txNotes}
        setNotes={setTxNotes}
        installmentsTotal={txInstallmentsTotal}
        setInstallmentsTotal={setTxInstallmentsTotal}
        installmentsPaid={txInstallmentsPaid}
        setInstallmentsPaid={setTxInstallmentsPaid}
        accounts={accounts}
        categories={categories}
        openInvoices={openInvoices}
        deparaRules={deparaRules}
        saving={isSavingTx}
        onSubmit={handleSubmitTransaction}
        voiceFields={voiceFields}
      />
    </div>
  )
}
