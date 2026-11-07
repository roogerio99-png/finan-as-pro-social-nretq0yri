import { parseVoiceTransaction, VoiceParseResult } from '@/services/voiceParser'
import { transactionsService, TransactionRecord } from '@/services/transactions'
import { accountsService } from '@/services/accounts'
import { categoriesService, CategoryRecord } from '@/services/categories'
import { budgetsService, BudgetRecord } from '@/services/budgets'
import { debtsService, DebtRecord } from '@/services/debts'
import { dreamsService, DreamRecord } from '@/services/dreams'
import { AccountRecord } from '@/types/finance'

export interface QuickTransactionSuggestion {
  parseResult: VoiceParseResult
  suggestedCategoryId: string | null
  suggestedCategoryName: string | null
  suggestedAccountId: string | null
  suggestedAccountName: string | null
  confidence: number
}

export interface BudgetRecommendation {
  groupName: string
  recommendedPercent: number
  recommendedAmount: number
  currentBudgetAmount: number
  targetType: 'group' | 'subgroup'
  categoryIds: string[]
  reason: string
}

export interface FinancialHealthDiagnostic {
  score: number // 0 a 100
  status: 'critical' | 'attention' | 'good' | 'excellent'
  savingsRate: number
  totalIncomeMonth: number
  totalExpenseMonth: number
  balanceMonth: number
  topExpenseCategories: { name: string; amount: number; percent: number }[]
  budgetAlerts: { category: string; spent: number; limit: number; percent: number }[]
  debtInsights: {
    totalDebt: number
    recommendedStrategy: 'avalanche' | 'snowball'
    priorityDebtName: string
    monthlyInterestCost: number
    actionTip: string
  } | null
  dreamInsights: {
    totalDreams: number
    monthlyTarget: number
    estimatedMonthsToComplete: number
  } | null
  actionableTips: string[]
}

export const copilotService = {
  /**
   * Interpreta uma frase em linguagem natural (digitada ou falada) e sugere um lançamento completo
   */
  async parseNaturalTransaction(
    text: string,
    accountsList?: AccountRecord[],
    categoriesList?: CategoryRecord[],
  ): Promise<QuickTransactionSuggestion> {
    const accounts = accountsList || (await accountsService.getAll())
    const categories = categoriesList || (await categoriesService.getAll())

    const parseResult = parseVoiceTransaction(text, accounts)

    // Detecção inteligente de categoria baseada nas palavras da frase
    const cleanNorm = (s?: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()

    const normalizedText = cleanNorm(text)

    let bestCategory: CategoryRecord | null = null
    let maxScore = 0

    // Palavras-chave mapeadas para conceitos do Plano de Contas Oficial
    const keywordMap: Record<string, string[]> = {
      restaurante: ['almoco', 'jantar', 'restaurante', 'lanche', 'ifood', 'hamburguer', 'pizza', 'comida', 'refeicao', 'cafe', 'cafeteria', 'bar', 'churrasco', 'refeicoes'],
      mercado: ['mercado', 'supermercado', 'compras', 'feira', 'acougue', 'padaria', 'hortifruti', 'pao de acucar', 'carrefour', 'assai', 'atacadista', 'despensa'],
      habitacao: ['aluguel', 'condominio', 'iptu', 'imovel', 'casa', 'apartamento', 'moradia', 'reforma'],
      utilidades: ['luz', 'energia', 'enel', 'cpfl', 'light', 'agua', 'sabesp', 'sanepar', 'gas', 'conta de luz'],
      telecom: ['internet', 'fibra', 'celular', 'telefone', 'tim', 'vivo', 'claro', 'telefonia'],
      transporte: ['uber', '99', 'taxi', 'corrida', 'onibus', 'metro', 'passagem', 'combustivel', 'gasolina', 'etanol', 'alcool', 'diesel', 'posto', 'estacionamento', 'mobilidade'],
      farmacia: ['farmacia', 'drogaria', 'drogasil', 'droga raia', 'remedio', 'medicamento', 'consulta', 'medico', 'dentista', 'hospital', 'exame', 'saude'],
      assinaturas: ['netflix', 'spotify', 'prime', 'amazon prime', 'disney', 'streaming', 'youtube', 'hbo', 'globo', 'deezer'],
      vestuario: ['roupa', 'roupas', 'calcado', 'calcados', 'tenis', 'sapato', 'vestuario', 'loja de roupa', 'compras'],
      reserva: ['reserva', 'emergencia', 'aporte', 'poupanca', 'investimento', 'tesouro'],
      dividas: ['divida', 'parcelamento', 'financiamento', 'emprestimo', 'bancario'],
      salario: ['salario', 'holerite', 'adiantamento', 'vale', 'empresa', 'pagamento clt', 'prolabore'],
      freela: ['freela', 'freelancer', 'bico', 'extra', 'servico prestado', 'comissao', 'venda pix'],
      investimentos: ['dividendos', 'rendimento', 'juros', 'tesouro', 'cdb', 'fii', 'acoes'],
    }

    for (const cat of categories) {
      // Compatibilidade de tipo (income vs expense)
      if (cat.type !== parseResult.type) {
        continue
      }

      let score = 0
      const catNameNorm = cleanNorm(cat.name)
      const catGroup1Norm = cleanNorm(cat.group_level1)
      const catGroup2Norm = cleanNorm(cat.group_level2)
      const catSub3Norm = cleanNorm(cat.subgroup_level3)

      // Subgrupos (onde há group_level2 definido) são mais específicos que grupos gerais:
      const isSubgroup = Boolean(cat.group_level2)

      // Verificação por palavras-chave mapeadas
      for (const [concept, keywords] of Object.entries(keywordMap)) {
        const matchesConcept =
          catNameNorm.includes(concept) ||
          catGroup2Norm.includes(concept) ||
          catGroup1Norm.includes(concept) ||
          catSub3Norm.includes(concept)

        if (matchesConcept) {
          for (const kw of keywords) {
            if (normalizedText.includes(kw)) {
              score += isSubgroup ? 35 : 20
            }
          }
        }
      }

      // Match direto de termos
      if (catNameNorm && normalizedText.includes(catNameNorm)) score += isSubgroup ? 40 : 25
      if (catGroup2Norm && normalizedText.includes(catGroup2Norm)) score += 30
      if (catGroup1Norm && normalizedText.includes(catGroup1Norm)) score += 15

      // Bônus para subgrupo quando houver pontuação (preferir a folha específica da árvore)
      if (isSubgroup && score > 0) {
        score += 15
      }

      if (score > maxScore) {
        maxScore = score
        bestCategory = cat
      }
    }

    // Se nenhuma categoria específica combinou, usa uma padrão adequada ao tipo (preferindo ativas)
    if (!bestCategory && categories.length > 0) {
      bestCategory =
        categories.find((c) => c.type === parseResult.type && (c.status ?? 'active') === 'active') ||
        categories.find((c) => c.type === parseResult.type) ||
        categories[0]
    }

    // Identificação de Conta
    let matchedAccount = accounts.find((a) => a.id === parseResult.accountId)
    if (!matchedAccount && accounts.length > 0) {
      if (
        normalizedText.includes('credito') ||
        normalizedText.includes('cartao') ||
        normalizedText.includes('fatura')
      ) {
        matchedAccount =
          accounts.find((a) => a.type === 'credit_card' && (a.status ?? 'active') === 'active') ||
          accounts.find((a) => a.type === 'credit_card')
      } else {
        matchedAccount =
          accounts.find((a) => a.type === 'checking' && (a.status ?? 'active') === 'active') ||
          accounts.find((a) => a.type === 'checking') ||
          accounts[0]
      }
    }

    if (!matchedAccount && accounts.length > 0) {
      matchedAccount = accounts[0]
    }

    return {
      parseResult,
      suggestedCategoryId: bestCategory?.id || null,
      suggestedCategoryName: bestCategory?.name || bestCategory?.subgroup_level3 || null,
      suggestedAccountId: matchedAccount?.id || null,
      suggestedAccountName: matchedAccount?.name || null,
      confidence: maxScore > 0 ? Math.min(maxScore * 3, 98) : 60,
    }
  },

  /**
   * Gera uma recomendação de orçamento baseada na Regra 50/30/20 e receitas do usuário
   */
  async generateSmartBudget(
    customMonthlyIncome?: number,
  ): Promise<{
    estimatedIncome: number
    recommendations: BudgetRecommendation[]
    methodology: string
  }> {
    const transactions = await transactionsService.getAll()
    const categories = await categoriesService.getAll()
    const currentBudgets = await budgetsService.getAll()

    // 1. Determina a renda base
    let estimatedIncome = customMonthlyIncome || 0
    if (!estimatedIncome) {
      const now = new Date()
      const curMonth = now.toISOString().slice(0, 7)
      const currentMonthIncomes = transactions
        .filter((t) => t.type === 'income' && (t.date || '').startsWith(curMonth))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

      if (currentMonthIncomes > 0) {
        estimatedIncome = currentMonthIncomes
      } else {
        // Média dos últimos 3 meses ou valor padrão de referência
        const allIncomes = transactions
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
        estimatedIncome = allIncomes > 0 ? Math.round(allIncomes) : 4000
      }
    }

    // Regra 50-30-20
    // 50% = Necessidades e Custos Fixos
    // 30% = Desejos e Estilo de Vida
    // 20% = Metas, Dívidas e Investimentos
    const needsBudget = estimatedIncome * 0.5
    const wantsBudget = estimatedIncome * 0.3
    const savingsBudget = estimatedIncome * 0.2

    // Mapeia categorias do plano de contas para cada grupo da regra
    const getExistingBudgetForGroup = (groupName: string) => {
      const found = currentBudgets.find((b) => b.category_group === groupName)
      return found ? Number(found.limit_amount) || 0 : 0
    }

    const recommendations: BudgetRecommendation[] = [
      {
        groupName: 'Habitação & Moradia',
        recommendedPercent: 25,
        recommendedAmount: Math.round(estimatedIncome * 0.25),
        currentBudgetAmount: getExistingBudgetForGroup('Habitação & Moradia') || getExistingBudgetForGroup('Habitação'),
        targetType: 'group',
        categoryIds: categories.filter((c) => (c.group_level2 || '').includes('Habitação')).map((c) => c.id),
        reason: 'Aluguel/parcela, condomínio, IPTU e manutenção do lar (idealmente até 25% da renda).',
      },
      {
        groupName: 'Alimentação & Mercado',
        recommendedPercent: 15,
        recommendedAmount: Math.round(estimatedIncome * 0.15),
        currentBudgetAmount: getExistingBudgetForGroup('Alimentação & Mercado') || getExistingBudgetForGroup('Alimentação'),
        targetType: 'group',
        categoryIds: categories.filter((c) => (c.group_level2 || '').includes('Alimentação')).map((c) => c.id),
        reason: 'Compras de supermercado essencial, feira e açougue.',
      },
      {
        groupName: 'Transporte & Mobilidade',
        recommendedPercent: 10,
        recommendedAmount: Math.round(estimatedIncome * 0.1),
        currentBudgetAmount: getExistingBudgetForGroup('Transporte & Mobilidade') || getExistingBudgetForGroup('Transporte'),
        targetType: 'group',
        categoryIds: categories.filter((c) => (c.group_level2 || '').includes('Transporte') || (c.group_level2 || '').includes('Mobilidade')).map((c) => c.id),
        reason: 'Combustível, transporte público, manutenção e aplicativos.',
      },
      {
        groupName: 'Lazer, Restaurantes & Estilo de Vida',
        recommendedPercent: 20,
        recommendedAmount: Math.round(estimatedIncome * 0.2),
        currentBudgetAmount: getExistingBudgetForGroup('Lazer & Alimentação') || getExistingBudgetForGroup('Lazer'),
        targetType: 'group',
        categoryIds: categories.filter((c) => (c.group_level1 || '').includes('Estilo de Vida') || (c.group_level2 || '').includes('Lazer')).map((c) => c.id),
        reason: 'Restaurantes, saídas de fim de semana, hobbies e compras pessoais.',
      },
      {
        groupName: 'Assinaturas & Conectividade',
        recommendedPercent: 5,
        recommendedAmount: Math.round(estimatedIncome * 0.05),
        currentBudgetAmount: getExistingBudgetForGroup('Comunicação') || getExistingBudgetForGroup('Assinaturas'),
        targetType: 'group',
        categoryIds: categories.filter((c) => (c.group_level2 || '').includes('Comunicação') || (c.group_level2 || '').includes('Assinaturas')).map((c) => c.id),
        reason: 'Internet, plano de celular e serviços de streaming (Netflix, Spotify, etc.).',
      },
      {
        groupName: 'Investimentos & Reserva de Emergência',
        recommendedPercent: 20,
        recommendedAmount: Math.round(savingsBudget),
        currentBudgetAmount: getExistingBudgetForGroup('Investimentos') || getExistingBudgetForGroup('Metas'),
        targetType: 'group',
        categoryIds: categories.filter((c) => (c.group_level1 || '').includes('Investimentos')).map((c) => c.id),
        reason: 'Aporte mensal para construção da reserva de emergência e independência financeira.',
      },
    ]

    return {
      estimatedIncome,
      recommendations,
      methodology: 'Regra dos 50-30-20 (50% Custos Fixos / 30% Estilo de Vida / 20% Futuro Financeiro)',
    }
  },

  /**
   * Aplica em lote uma lista de recomendações de orçamento diretamente no sistema local
   */
  async applyBudgetRecommendations(
    recommendations: BudgetRecommendation[],
    targetMonth: string,
  ): Promise<number> {
    let appliedCount = 0

    for (const rec of recommendations) {
      if (!rec || rec.recommendedAmount <= 0) continue

      await budgetsService.upsert(
        targetMonth,
        rec.groupName,
        rec.recommendedAmount,
        75,
        90,
        rec.targetType || 'group',
      )
      appliedCount++
    }

    return appliedCount
  },

  /**
   * Realiza um diagnóstico completo da saúde financeira do usuário
   */
  async getDiagnostic(): Promise<FinancialHealthDiagnostic> {
    const now = new Date()
    const curMonth = now.toISOString().slice(0, 7)

    const [transactions, accounts, budgets, debts, dreams, categories] = await Promise.all([
      transactionsService.getAll(),
      accountsService.getAll(),
      budgetsService.getAll(),
      debtsService.getAll(),
      dreamsService.getAll(),
      categoriesService.getAll(),
    ])

    const catMap = new Map<string, CategoryRecord>()
    categories.forEach((c) => catMap.set(c.id, c))

    // 1. Receitas e Despesas do mês
    const monthTx = transactions.filter((t) => (t.date || '').startsWith(curMonth))
    const totalIncome = monthTx
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const totalExpense = monthTx
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const balance = totalIncome - totalExpense

    const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0

    // 2. Maiores categorias de gastos
    const expensesByCategory: Record<string, number> = {}
    monthTx
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = catMap.get(t.category_id || '')
        const name = cat?.group_level2 || cat?.name || 'Outros'
        expensesByCategory[name] = (expensesByCategory[name] || 0) + (Number(t.amount) || 0)
      })

    const topExpenseCategories = Object.entries(expensesByCategory)
      .map(([name, amount]) => ({
        name,
        amount,
        percent: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4)

    // 3. Alertas de Orçamento
    const currentMonthBudgets = budgets.filter((b) => b.month === curMonth)
    const budgetAlerts = currentMonthBudgets
      .map((b) => {
        const spent = expensesByCategory[b.category_group] || 0
        const limit = Number(b.limit_amount) || 1
        const pct = Math.round((spent / limit) * 100)
        return {
          category: b.category_group,
          spent,
          limit,
          percent: pct,
        }
      })
      .filter((b) => b.percent >= 75)
      .sort((a, b) => b.percent - a.percent)

    // 4. Análise de Dívidas
    let debtInsights = null
    const activeDebts = debts.filter((d) => (d.status ?? 'active') === 'active')
    if (activeDebts.length > 0) {
      const totalDebt = activeDebts.reduce((s, d) => s + (Number(d.current_balance) || 0), 0)
      const monthlyInterestCost = activeDebts.reduce((s, d) => {
        const bal = Number(d.current_balance) || 0
        const rate = (Number(d.interest_rate_monthly) || 0) / 100
        return s + bal * rate
      }, 0)

      // Determinar prioridade (maior taxa = avalanche)
      const highestRateDebt = [...activeDebts].sort(
        (a, b) => (Number(b.interest_rate_monthly) || 0) - (Number(a.interest_rate_monthly) || 0),
      )[0]

      debtInsights = {
        totalDebt,
        recommendedStrategy: 'avalanche' as const,
        priorityDebtName: highestRateDebt.creditor || 'Dívida prioritária',
        monthlyInterestCost: Math.round(monthlyInterestCost),
        actionTip: `Priorize pagar ${highestRateDebt.creditor} (${highestRateDebt.interest_rate_monthly}% a.m.). Amortizar esta dívida reduzirá imediatamente o custo de juros mensais.`,
      }
    }

    // 5. Análise de Sonhos
    let dreamInsights = null
    const activeDreams = dreams.filter((d) => d.status === 'in_progress')
    if (activeDreams.length > 0) {
      const monthlyTarget = activeDreams.reduce((s, d) => s + (Number(d.monthly_contribution) || 0), 0)
      const remainingAmount = activeDreams.reduce(
        (s, d) => s + Math.max(0, (Number(d.target_amount) || 0) - (Number(d.current_amount) || 0)),
        0,
      )
      const estimatedMonthsToComplete = monthlyTarget > 0 ? Math.ceil(remainingAmount / monthlyTarget) : 12

      dreamInsights = {
        totalDreams: activeDreams.length,
        monthlyTarget,
        estimatedMonthsToComplete,
      }
    }

    // 6. Cálculo da Pontuação (Score de 0 a 100)
    let score = 50
    if (balance > 0) score += 20
    if (savingsRate >= 20) score += 15
    if (budgetAlerts.length === 0) score += 10
    if (activeDebts.length === 0) score += 15
    if (activeDreams.length > 0) score += 10
    score = Math.min(100, Math.max(10, score))

    let status: 'critical' | 'attention' | 'good' | 'excellent' = 'good'
    if (score < 40) status = 'critical'
    else if (score < 65) status = 'attention'
    else if (score < 85) status = 'good'
    else status = 'excellent'

    // Dicas Práticas de Economia
    const actionableTips: string[] = []
    if (budgetAlerts.length > 0) {
      actionableTips.push(
        `Atenção com ${budgetAlerts[0].category}: você já consumiu ${budgetAlerts[0].percent}% do limite mensal definido.`,
      )
    }
    if (topExpenseCategories.length > 0 && topExpenseCategories[0].percent > 35) {
      actionableTips.push(
        `A categoria "${topExpenseCategories[0].name}" representa ${topExpenseCategories[0].percent}% de todas as suas despesas do mês. Um corte de 10% aqui liberará R$ ${Math.round(topExpenseCategories[0].amount * 0.1)} no seu bolso.`,
      )
    }
    if (activeDebts.length > 0) {
      actionableTips.push(
        `Você tem R$ ${Math.round(debtInsights?.monthlyInterestCost || 0)} saindo em juros todo mês. Pagar o valor integral da fatura ou amortizar a dívida mais cara é o melhor investimento no momento.`,
      )
    }
    if (savingsRate <= 0 && totalIncome > 0) {
      actionableTips.push(
        'Seus gastos superaram ou empataram com a renda do mês. Revise os custos com estilo de vida para voltar ao fluxo de caixa positivo.',
      )
    }
    if (actionableTips.length < 3) {
      actionableTips.push(
        'Mantenha o hábito de registrar todos os pequenos gastos diários: eles costumam ser os maiores responsáveis por vazamentos orçamentários invisíveis.',
      )
    }

    return {
      score,
      status,
      savingsRate,
      totalIncomeMonth: totalIncome,
      totalExpenseMonth: totalExpense,
      balanceMonth: balance,
      topExpenseCategories,
      budgetAlerts,
      debtInsights,
      dreamInsights,
      actionableTips,
    }
  },

  /**
   * Chat do Copiloto Financeiro: responde a qualquer dúvida do usuário baseando-se nos seus dados reais
   */
  async askCopilot(question: string): Promise<string> {
    const qNorm = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const diagnostic = await this.getDiagnostic()

    // 1. Perguntas sobre economia ou como economizar
    if (qNorm.includes('economizar') || qNorm.includes('guardar dinheiro') || qNorm.includes('cortar')) {
      const top = diagnostic.topExpenseCategories[0]
      return `💡 **Estratégia Recomendada para o seu Momento:**\n\n1. **Foco no maior centro de custo:** Atualmente, a área de **${top?.name || 'Custos Variáveis'}** é a que mais pesa no seu orçamento (${top ? 'R$ ' + top.amount.toFixed(2) : 'gastos recentes'}). Tente estipular um teto semanal para ela.\n2. **Regra das 48 Horas:** Para compras discricionárias não essenciais acima de R$ 100, espere 2 dias antes de passar o cartão. Quase 60% dos impulsos desaparecem nesse período.\n3. **Cancelamento de Vazamentos:** Faça uma revisão rápida em assinaturas e streamings que você não usou nos últimos 30 dias.`
    }

    // 2. Perguntas sobre dívidas
    if (qNorm.includes('divida') || qNorm.includes('emprestimo') || qNorm.includes('cartao') || qNorm.includes('juros')) {
      if (diagnostic.debtInsights) {
        return `🎯 **Plano de Ataque para suas Dívidas:**\n\n• **Dívida Prioritária:** **${diagnostic.debtInsights.priorityDebtName}**.\n• **Método Avalanche:** Pague o mínimo em todas as outras e jogue todo o dinheiro extra disponível nesta dívida de maior taxa. Você está pagando cerca de **R$ ${diagnostic.debtInsights.monthlyInterestCost},00/mês só em juros**, dinheiro que deveria estar rendendo na sua reserva!`
      }
      return `🎉 Excelente notícia! Você não possui dívidas críticas ativas cadastradas no momento. Isso significa que você pode destinar 100% da sua capacidade de poupança (20% da renda) diretamente para sua **Reserva de Emergência** e **Investimentos**.`
    }

    // 3. Perguntas sobre orçamento e regra 50/30/20
    if (qNorm.includes('orcamento') || qNorm.includes('50 30 20') || qNorm.includes('divisao') || qNorm.includes('meta')) {
      return `📊 **Como aplicar a Regra 50/30/20 na sua rotina:**\n\n• **50% — Necessidades Básicas:** Aluguel, contas de consumo (água, luz, gás), mercado e transporte para o trabalho.\n• **30% — Estilo de Vida:** Restaurantes, saídas, lazer, compras pessoais e hobbies.\n• **20% — Futuro e Segurança:** Quitação rápida de dívidas e aplicação em renda fixa para sua reserva.\n\n👉 *Você pode usar a aba "Orçamento Inteligente" aqui no Copiloto para que eu calcule e aplique automaticamente esses tetos em todas as suas categorias!*`
    }

    // 4. Pergunta sobre saúde financeira / situação atual
    if (qNorm.includes('como estao minhas financas') || qNorm.includes('saldo') || qNorm.includes('situacao') || qNorm.includes('resumo')) {
      return `📈 **Raio-X das suas Finanças este Mês:**\n\n• **Entradas:** R$ ${diagnostic.totalIncomeMonth.toFixed(2)}\n• **Saídas:** R$ ${diagnostic.totalExpenseMonth.toFixed(2)}\n• **Resultado do Mês:** R$ ${diagnostic.balanceMonth.toFixed(2)} (${diagnostic.balanceMonth >= 0 ? '🟢 Positivo' : '🔴 Atenção: Gastos superaram a renda'})\n• **Taxa de Poupança:** ${diagnostic.savingsRate}%\n\n${diagnostic.actionableTips[0] || 'Continue acompanhando seus números para manter o controle total!'}`
    }

    // Resposta padrão inteligente
    return `Olá! Sou seu **Copiloto Financeiro Inteligente** do Gestio Finanças.\n\nPosso te ajudar em três áreas essenciais:\n1. ✍️ **Lançamento Rápido:** Digite coisas como *"Gastei 45 no almoço hoje"* e eu crio o registro pronto.\n2. 🎯 **Orçamento Automático:** Calculo o teto ideal para cada área da sua vida usando a regra 50/30/20.\n3. 💡 **Consultoria de Gastos & Dívidas:** Analiso seus números reais para indicar onde economizar e acelerar seus sonhos.\n\nComo posso te ajudar hoje?`
  },
}
