import fs from 'fs'

let code = fs.readFileSync('src/pages/CopilotPage.tsx', 'utf8')

// 1. Atualizar imports de lucide-react
code = code.replace(
  "  Flame,\n  Lock,\n} from 'lucide-react'",
  "  Flame,\n  Lock,\n  Home,\n  Users,\n  Car,\n  Sliders,\n  CheckSquare,\n  Square,\n  Info,\n  Check,\n} from 'lucide-react'"
)

// 2. Atualizar imports de copilotService
code = code.replace(
  "  FinancialHealthDiagnostic,\n  BudgetRecommendation,\n} from '@/services/copilotService'",
  "  FinancialHealthDiagnostic,\n  BudgetRecommendation,\n  UserBudgetProfile,\n} from '@/services/copilotService'"
)

// 3. Atualizar estados de orçamento
const oldBudgetStates = `  // Estado do Orçamento Inteligente
  const [customIncome, setCustomIncome] = useState<number>(4000)
  const [budgetRecs, setBudgetRecs] = useState<BudgetRecommendation[]>([])
  const [isApplyingBudgets, setIsApplyingBudgets] = useState(false)`

const newBudgetStates = `  // Estado do Orçamento Inteligente & Interativo
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
  })`

code = code.replace(oldBudgetStates, newBudgetStates)

// 4. Atualizar loadData para alimentar o perfil
code = code.replace(
  `        try {
          const budgetData = await copilotService.generateSmartBudget(diag.totalIncomeMonth || 4000)
          setBudgetRecs(budgetData.recommendations)
        } catch {
          // ignore
        }`,
  `        try {
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
        }`
)

// 5. Handlers de recálculo e customização do orçamento
const oldRecalculate = `  // Recalcular orçamento inteligente
  const handleRecalculateBudget = async () => {
    setLoading(true)
    try {
      const budgetData = await copilotService.generateSmartBudget(customIncome)
      setBudgetRecs(budgetData.recommendations)
      toast({
        title: 'Orçamento recalculado!',
        description: \`Metas geradas com base na renda mensal de R$ \${customIncome.toLocaleString('pt-BR')}.\`,
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
        description: \`\${count} tetos orçamentários definidos para o mês \${curMonth}.\`,
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
  }`

const newRecalculate = `  // Recalcular orçamento interativo sob medida
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
        description: \`\${count} tetos orçamentários definidos para o mês \${curMonth} de acordo com as suas escolhas.\`,
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
  }`

code = code.replace(oldRecalculate, newRecalculate)

// 6. Substituir a aba <TabsContent value="budget"> inteira
const startTabIdx = code.indexOf('{/* ABA 2: ORÇAMENTO INTELIGENTE (50/30/20) */}')
const endTabTarget = '</TabsContent>'
const endTabIdx = code.indexOf(endTabTarget, startTabIdx) + endTabTarget.length

const newBudgetTab = `{/* ABA 2: ORÇAMENTO INTERATIVO & SOB MEDIDA */}
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
                        className={\`p-4 rounded-2xl border transition-all \${
                          isEnabled
                            ? 'border-slate-200/90 bg-white hover:border-emerald-300 shadow-xs'
                            : 'border-slate-200/50 bg-slate-50/60 opacity-60'
                        }\`}
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
                                <strong className={\`text-sm \${isEnabled ? 'text-slate-900 font-bold' : 'text-slate-500'}\`}>
                                  {rec.groupName}
                                </strong>
                                <Badge
                                  variant="outline"
                                  className={\`text-[10px] font-bold \${
                                    rec.macroGroup === 'needs'
                                      ? 'text-blue-700 border-blue-200 bg-blue-50'
                                      : rec.macroGroup === 'wants'
                                      ? 'text-purple-700 border-purple-200 bg-purple-50'
                                      : 'text-emerald-700 border-emerald-200 bg-emerald-50'
                                  }\`}
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
        </TabsContent>`

code = code.slice(0, startTabIdx) + newBudgetTab + code.slice(endTabIdx)

fs.writeFileSync('src/pages/CopilotPage.tsx', code)
console.log('CopilotPage.tsx updated successfully!')
