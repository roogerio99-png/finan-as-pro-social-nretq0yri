import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  Lock,
  Home,
  Users,
  Car,
  Sliders,
  CheckSquare,
  Square,
  Info,
  Check,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { CopilotLiveMode } from '@/components/copilot/CopilotLiveMode'
import { MicrophonePermissionModal } from '@/components/copilot/MicrophonePermissionModal'
import { MicrophoneStatusBanner } from '@/components/copilot/MicrophoneStatusBanner'
import { useVoiceCommander } from '@/hooks/useVoiceCommander'
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
  UserBudgetProfile,
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

  // Estado do Orçamento Inteligente & Interativo
  const [customIncome, setCustomIncome] = useState<number>(4000)
  const [budgetRecs, setBudgetRecs] = useState<BudgetRecommendation[]>([])
  const [isApplyingBudgets, setIsApplyingBudgets] = useState(false)
  const [budgetProfile, setBudgetProfile] = useState<UserBudgetProfile>({
    monthlyIncome: 4000,
    housingType: 'rent',
    rentAmount: 1200,
    hasChildren: false,
    childrenCount: 1,
    transportType: 'car',
    hasHighDebts: false,
    primaryGoal: 'balanced',
    macroNeedsPercent: 50,
    macroWantsPercent: 30,
    macroSavingsPercent: 20,
  })
  const [budgetMethodology, setBudgetMethodology] = useState<string>('Modelo 50/30/20')
  const [budgetProfileReason, setBudgetProfileReason] = useState<string>('')
  const [macroDistribution, setMacroDistribution] = useState<{
    needsPercent: number
    wantsPercent: number
    savingsPercent: number
    needsAmount: number
    wantsAmount: number
    savingsAmount: number
  }>({
    needsPercent: 50,
    wantsPercent: 30,
    savingsPercent: 20,
    needsAmount: 2000,
    wantsAmount: 1200,
    savingsAmount: 800,
  })

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
          const inc = diag.totalIncomeMonth || 4000
          const initialProfile: UserBudgetProfile = {
            monthlyIncome: inc,
            housingType: 'rent',
            rentAmount: Math.round(inc * 0.25),
            hasChildren: false,
            childrenCount: 1,
            transportType: 'car',
            hasHighDebts: (diag.debtInsights?.totalDebt || 0) > 0,
            primaryGoal: (diag.debtInsights?.totalDebt || 0) > 0 ? 'pay_debts' : 'balanced',
            macroNeedsPercent: 50,
            macroWantsPercent: 30,
            macroSavingsPercent: 20,
          }
          setBudgetProfile(initialProfile)
          const budgetData = await copilotService.generateSmartBudget(inc, initialProfile)
          setBudgetRecs(budgetData.recommendations)
          setBudgetMethodology(budgetData.methodology)
          setBudgetProfileReason(budgetData.profileReason)
          setMacroDistribution(budgetData.macroDistribution)
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

  // Hook moderno de comando por voz e permissões nativas
  const {
    permissionState,
    isListening,
    isRequestingPermission,
    audioLevel,
    permissionModalOpen,
    setPermissionModalOpen,
    requestPermission,
    startListening,
    toggleListening,
    stopListening,
  } = useVoiceCommander({
    onInterimResult: (text) => {
      setQuickInput(text)
    },
    onFinalResult: (text) => {
      setQuickInput(text)
      processSpokenTranscript(text)
    },
    onError: (err) => {
      toast({
        title: 'Microfone',
        description: err,
        variant: 'destructive',
      })
    },
  })

  // Recalcular orçamento interativo sob medida
  const handleRecalculateTailoredBudget = async (overrideProfile?: Partial<UserBudgetProfile>) => {
    setLoading(true)
    try {
      const updatedProfile = { ...budgetProfile, ...overrideProfile }
      setBudgetProfile(updatedProfile)
      setCustomIncome(updatedProfile.monthlyIncome)

      const budgetData = await copilotService.generateSmartBudget(
        updatedProfile.monthlyIncome,
        updatedProfile,
      )
      setBudgetRecs(budgetData.recommendations)
      setBudgetMethodology(budgetData.methodology)
      setBudgetProfileReason(budgetData.profileReason)
      setMacroDistribution(budgetData.macroDistribution)

      toast({
        title: 'Orçamento recalculado sob medida!',
        description: budgetData.profileReason,
      })
    } finally {
      setLoading(false)
    }
  }

  // Alterna ativação/desativação de uma categoria recomendada
  const handleToggleRecEnabled = (recId?: string, groupName?: string) => {
    setBudgetRecs((prev) =>
      prev.map((r) => {
        if ((recId && r.id === recId) || r.groupName === groupName) {
          return { ...r, enabled: r.enabled === false ? true : false }
        }
        return r
      }),
    )
  }

  // Ajusta o valor manual do teto de uma categoria
  const handleUpdateRecAmount = (recId?: string, groupName?: string, newAmount?: number) => {
    setBudgetRecs((prev) =>
      prev.map((r) => {
        if ((recId && r.id === recId) || r.groupName === groupName) {
          const val = Number(newAmount) || 0
          return { ...r, customAmount: val }
        }
        return r
      }),
    )
  }

  // Molda percentuais macro (ex: 50/30/20 ou 60/25/15)
  const handleUpdateMacroPercents = (needs: number, wants: number, savings: number) => {
    handleRecalculateTailoredBudget({
      macroNeedsPercent: needs,
      macroWantsPercent: wants,
      macroSavingsPercent: savings,
    })
  }

  // Aplicar orçamento customizado no sistema
  const handleApplyBudgets = async () => {
    setIsApplyingBudgets(true)
    try {
      const curMonth = new Date().toISOString().slice(0, 7)
      const activeRecs = budgetRecs.filter((r) => r.enabled !== false)
      if (activeRecs.length === 0) {
        toast({
          title: 'Nenhuma categoria selecionada',
          description: 'Marque pelo menos uma categoria para aplicar o teto no aplicativo.',
          variant: 'destructive',
        })
        return
      }
      const count = await copilotService.applyBudgetRecommendations(activeRecs, curMonth)
      toast({
        title: 'Orçamento ativado com sucesso!',
        description: `${count} tetos orçamentários definidos para o mês ${curMonth} de acordo com as suas escolhas.`,
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
          {/* Banner Reativo de Permissão e Status do Microfone */}
          <MicrophoneStatusBanner
            permissionState={permissionState}
            isRequesting={isRequestingPermission}
            onRequestPermission={requestPermission}
            onOpenHelpModal={() => setPermissionModalOpen(true)}
          />

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
                <div className="absolute right-3 top-3 z-30 flex items-center gap-2 pointer-events-auto">
                  <Button
                    type="button"
                    size="icon"
                    onClick={toggleListening}
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

              {/* Ações Rápidas de Acessibilidade ao Microfone */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <Button
                  type="button"
                  onClick={toggleListening}
                  variant={isListening ? 'destructive' : 'outline'}
                  className={`rounded-xl text-xs font-bold gap-2 transition-all ${
                    isListening
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                      : 'border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4 animate-bounce" /> Parar Gravação e Processar
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-indigo-600" /> Ditar Lançamento por Voz
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setPermissionModalOpen(true)}
                  className="text-[11px] text-slate-500 hover:text-indigo-600 underline font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" /> Como liberar o microfone no navegador?
                </button>
              </div>

              {/* Indicador em tempo real de gravação com Medidor de Ondas Sonoras */}
              {isListening && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 border border-rose-200 text-rose-950">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 h-6 px-1">
                      {[0.4, 0.8, 1.3, 0.6, 1.5, 0.9, 0.5, 1.2, 0.7].map((factor, i) => (
                        <span
                          key={i}
                          className="w-1.5 bg-rose-600 rounded-full transition-all duration-75"
                          style={{
                            height: `${Math.max(6, Math.min(26, ((audioLevel || 20) * factor) / 3))}px`,
                          }}
                        />
                      ))}
                    </div>
                    <div>
                      <p className="font-bold text-xs flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                        </span>
                        Microfone captando sua voz em tempo real...
                      </p>
                      <p className="text-[11px] text-rose-800 mt-0.5">
                        Diga ex: <em>"Almoço restaurante 42 reais"</em> ou <em>"Mercado 150 no débito"</em>.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={stopListening}
                    className="rounded-xl text-xs font-bold gap-1.5 shadow-xs shrink-0"
                  >
                    <MicOff className="w-3.5 h-3.5" /> Concluir e Processar
                  </Button>
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

        {/* ABA 2: ORÇAMENTO INTERATIVO & SOB MEDIDA */}
        <TabsContent value="budget" className="space-y-6">
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-50 via-emerald-50/30 to-blue-50/30 border-b border-slate-100 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-xs">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      Orçamento Inteligente & Interativo
                      <Badge className="bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 hover:bg-emerald-100">
                        {budgetMethodology}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      O Copiloto entende a sua realidade (se paga aluguel, tem filhos, ganha X) para sugerir tetos realistas que você pode moldar livremente.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-600 pl-1">Renda Líquida Mensal: R$</span>
                    <Input
                      type="number"
                      value={budgetProfile.monthlyIncome}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0
                        setBudgetProfile((prev) => ({ ...prev, monthlyIncome: val }))
                      }}
                      onBlur={() => handleRecalculateTailoredBudget({ monthlyIncome: budgetProfile.monthlyIncome })}
                      className="w-28 h-8 rounded-xl text-xs font-black text-slate-900 bg-slate-50 border-slate-300"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleRecalculateTailoredBudget({ monthlyIncome: budgetProfile.monthlyIncome })}
                      className="h-8 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                    >
                      Ajustar
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* ETAPA 1: Conhecendo a sua Realidade (Aluguel, Filhos, Moradia, Dívidas) */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      1. Sua Realidade &amp; Estilo de Vida
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    Responda para a IA personalizar a distribuição ideal para você
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Pergunta: Moradia */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-blue-600" />
                      Moradia:
                    </label>
                    <select
                      value={budgetProfile.housingType}
                      onChange={(e) => {
                        const val = e.target.value as any
                        handleRecalculateTailoredBudget({ housingType: val })
                      }}
                      className="w-full h-9 rounded-xl text-xs font-semibold bg-white border border-slate-200 px-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="rent">🏠 Pago Aluguel</option>
                      <option value="mortgage">🏦 Financiamento Imobiliário</option>
                      <option value="own_free">🏡 Casa Própria Quitada</option>
                      <option value="family">👨‍👩‍👧 Moro com Pais / Família</option>
                    </select>

                    {(budgetProfile.housingType === 'rent' || budgetProfile.housingType === 'mortgage') && (
                      <div className="pt-1 flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 font-medium">Valor R$:</span>
                        <Input
                          type="number"
                          value={budgetProfile.rentAmount}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0
                            setBudgetProfile((prev) => ({ ...prev, rentAmount: val }))
                          }}
                          onBlur={() => handleRecalculateTailoredBudget({ rentAmount: budgetProfile.rentAmount })}
                          placeholder="Valor do aluguel/parcela"
                          className="h-7 text-xs font-bold w-28 bg-white rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* Pergunta: Filhos & Dependentes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      Filhos / Dependentes:
                    </label>
                    <select
                      value={budgetProfile.hasChildren ? (budgetProfile.childrenCount || 1) : 0}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        handleRecalculateTailoredBudget({
                          hasChildren: val > 0,
                          childrenCount: val > 0 ? val : 0,
                        })
                      }}
                      className="w-full h-9 rounded-xl text-xs font-semibold bg-white border border-slate-200 px-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="0">Sem dependentes / filhos</option>
                      <option value="1">👶 1 filho(a)</option>
                      <option value="2">👶👶 2 filhos</option>
                      <option value="3">👨‍👩‍👦‍👦 3 ou mais filhos</option>
                    </select>
                  </div>

                  {/* Pergunta: Transporte Principal */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-amber-600" />
                      Transporte Diário:
                    </label>
                    <select
                      value={budgetProfile.transportType}
                      onChange={(e) => {
                        const val = e.target.value as any
                        handleRecalculateTailoredBudget({ transportType: val })
                      }}
                      className="w-full h-9 rounded-xl text-xs font-semibold bg-white border border-slate-200 px-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="car">🚗 Carro próprio / Moto</option>
                      <option value="public">🚌 Ônibus / Metrô / Trem</option>
                      <option value="rideshare">📱 Uber / 99 / Aplicativos</option>
                      <option value="hybrid">🚶 Híbrido / Trabalho remoto</option>
                    </select>
                  </div>

                  {/* Pergunta: Dívidas / Objetivo */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      Prioridade do Momento:
                    </label>
                    <select
                      value={budgetProfile.hasHighDebts ? 'pay_debts' : budgetProfile.primaryGoal}
                      onChange={(e) => {
                        const val = e.target.value as any
                        const isDebt = val === 'pay_debts'
                        handleRecalculateTailoredBudget({
                          hasHighDebts: isDebt,
                          primaryGoal: val,
                        })
                      }}
                      className="w-full h-9 rounded-xl text-xs font-semibold bg-white border border-slate-200 px-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="balanced">⚖️ Equilibrar o mês com folga</option>
                      <option value="pay_debts">🚨 Quitar dívidas urgente</option>
                      <option value="emergency_fund">🛡️ Montar reserva de emergência</option>
                      <option value="invest_wealth">🚀 Acelerar investimentos</option>
                    </select>
                  </div>
                </div>

                {budgetProfileReason && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Diagnóstico do Copiloto:</strong> {budgetProfileReason}
                    </div>
                  </div>
                )}
              </div>

              {/* ETAPA 2: Moldando a Divisão Macro (Controles Interativos) */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-slate-700" />
                    <h3 className="text-sm font-bold text-slate-900">
                      2. Molde a Distribuição Macro da sua Renda
                    </h3>
                  </div>
                  
                  {/* Modelos Prontos para Escolher */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400">Modelos rápidos:</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateMacroPercents(50, 30, 20)}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                    >
                      50/30/20 Clássico
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateMacroPercents(60, 25, 15)}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                    >
                      60/25/15 Família
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateMacroPercents(40, 30, 30)}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                    >
                      40/30/30 Investidor
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Macro 1: Essenciais */}
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <Badge className="bg-blue-600 text-white text-xs font-bold">
                        {macroDistribution.needsPercent}% Essenciais
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={macroDistribution.needsPercent}
                          onChange={(e) => {
                            const val = Math.min(90, Math.max(10, Number(e.target.value) || 0))
                            const diff = val - macroDistribution.needsPercent
                            const newWants = Math.max(0, macroDistribution.wantsPercent - diff)
                            handleUpdateMacroPercents(val, newWants, macroDistribution.savingsPercent)
                          }}
                          className="w-16 h-7 text-xs font-black text-blue-900 bg-white border-blue-300"
                        />
                        <span className="text-xs font-bold text-blue-700">%</span>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-blue-950">
                      {formatBRL(macroDistribution.needsAmount)}
                    </div>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Habitação (aluguel/financiamento), contas de luz/água, alimentação essencial, saúde e transporte.
                    </p>
                  </div>

                  {/* Macro 2: Estilo de Vida */}
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <Badge className="bg-purple-600 text-white text-xs font-bold">
                        {macroDistribution.wantsPercent}% Estilo de Vida
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={macroDistribution.wantsPercent}
                          onChange={(e) => {
                            const val = Math.min(90, Math.max(0, Number(e.target.value) || 0))
                            const diff = val - macroDistribution.wantsPercent
                            const newSavings = Math.max(0, macroDistribution.savingsPercent - diff)
                            handleUpdateMacroPercents(macroDistribution.needsPercent, val, newSavings)
                          }}
                          className="w-16 h-7 text-xs font-black text-purple-900 bg-white border-purple-300"
                        />
                        <span className="text-xs font-bold text-purple-700">%</span>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-purple-950">
                      {formatBRL(macroDistribution.wantsAmount)}
                    </div>
                    <p className="text-xs text-purple-800 leading-relaxed">
                      Lazer, restaurantes, viagens, compras discricionárias, hobbies e streamings.
                    </p>
                  </div>

                  {/* Macro 3: Futuro */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <Badge className="bg-emerald-600 text-white text-xs font-bold">
                        {macroDistribution.savingsPercent}% Futuro &amp; Metas
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={macroDistribution.savingsPercent}
                          onChange={(e) => {
                            const val = Math.min(90, Math.max(0, Number(e.target.value) || 0))
                            const diff = val - macroDistribution.savingsPercent
                            const newWants = Math.max(0, macroDistribution.wantsPercent - diff)
                            handleUpdateMacroPercents(macroDistribution.needsPercent, newWants, val)
                          }}
                          className="w-16 h-7 text-xs font-black text-emerald-900 bg-white border-emerald-300"
                        />
                        <span className="text-xs font-bold text-emerald-700">%</span>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-emerald-950">
                      {formatBRL(macroDistribution.savingsAmount)}
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Reserva de emergência, quitação acelerada de dívidas e investimentos de longo prazo.
                    </p>
                  </div>
                </div>
              </div>

              {/* ETAPA 3: Escolha e Ajuste Fino dos Valores por Categoria */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>3. Escolha Onde Aplicar &amp; Altere Valores ou Categorias</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Marque ou desmarque quais tetos você deseja criar e digite o valor exato se quiser mudar a sugestão da IA.
                    </p>
                  </div>
                  <div className="text-xs text-slate-600 font-semibold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                    {budgetRecs.filter((r) => r.enabled !== false).length} de {budgetRecs.length} categorias selecionadas
                  </div>
                </div>

                <div className="space-y-3">
                  {budgetRecs.map((rec) => {
                    const isEnabled = rec.enabled !== false
                    const currentAmount = rec.customAmount ?? rec.recommendedAmount

                    return (
                      <div
                        key={rec.id || rec.groupName}
                        className={`p-4 rounded-2xl border transition-all ${
                          isEnabled
                            ? 'border-slate-200/90 bg-white hover:border-emerald-300 shadow-xs'
                            : 'border-slate-200/50 bg-slate-50/60 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          {/* Checkbox de Ativação e Informações da Categoria */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleRecEnabled(rec.id, rec.groupName)}
                              className="mt-0.5 text-slate-400 hover:text-emerald-600 focus:outline-none"
                              title={isEnabled ? 'Desmarcar esta categoria' : 'Marcar para aplicar'}
                            >
                              {isEnabled ? (
                                <CheckSquare className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-300" />
                              )}
                            </button>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className={`text-sm ${isEnabled ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                                  {rec.groupName}
                                </strong>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-bold ${
                                    rec.macroGroup === 'needs'
                                      ? 'text-blue-700 border-blue-200 bg-blue-50'
                                      : rec.macroGroup === 'wants'
                                      ? 'text-purple-700 border-purple-200 bg-purple-50'
                                      : 'text-emerald-700 border-emerald-200 bg-emerald-50'
                                  }`}
                                >
                                  {rec.macroGroup === 'needs'
                                    ? 'Essencial'
                                    : rec.macroGroup === 'wants'
                                    ? 'Estilo de Vida'
                                    : 'Futuro'}{' '}
                                  • {rec.recommendedPercent}%
                                </Badge>
                                {!isEnabled && (
                                  <span className="text-[10px] text-slate-400 italic">
                                    (Não será aplicado)
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed">{rec.reason}</p>
                            </div>
                          </div>

                          {/* Campo Editável de Valor (R$) */}
                          <div className="flex items-center gap-3 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-end">
                            <div className="text-right">
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                                Teto Limite (R$)
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-bold text-slate-400">R$</span>
                                <Input
                                  type="number"
                                  disabled={!isEnabled}
                                  value={currentAmount}
                                  onChange={(e) =>
                                    handleUpdateRecAmount(
                                      rec.id,
                                      rec.groupName,
                                      Number(e.target.value) || 0,
                                    )
                                  }
                                  className="w-28 h-8 text-xs font-black text-slate-900 bg-white border-slate-300 rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ETAPA 4: Ativação das Escolhas no Aplicativo */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="text-sm font-bold flex items-center justify-center sm:justify-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Ativar Orçamento Sob Medida no Aplicativo
                  </h4>
                  <p className="text-xs text-slate-400">
                    O aplicativo gravará tetos e alertas com semáforo nas{' '}
                    <span className="text-emerald-400 font-bold">
                      {budgetRecs.filter((r) => r.enabled !== false).length} categorias selecionadas
                    </span>{' '}
                    com os valores customizados por você.
                  </p>
                </div>

                <Button
                  onClick={handleApplyBudgets}
                  disabled={isApplyingBudgets || budgetRecs.filter((r) => r.enabled !== false).length === 0}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl gap-2 w-full sm:w-auto px-6 py-2.5 h-11 text-xs shadow-xs"
                >
                  {isApplyingBudgets ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Ativando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Ativar Orçamento Personalizado
                    </>
                  )}
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

      {/* Modal didático e ilustrado de permissão do microfone */}
      <MicrophonePermissionModal
        open={permissionModalOpen}
        onOpenChange={setPermissionModalOpen}
        onPermissionGranted={startListening}
      />
    </div>
  )
}
