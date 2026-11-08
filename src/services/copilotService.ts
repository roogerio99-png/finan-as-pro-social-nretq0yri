import { parseVoiceTransaction, VoiceParseResult } from '@/services/voiceParser'
import { transactionsService } from '@/services/transactions'
import { accountsService } from '@/services/accounts'
import { categoriesService } from '@/services/categories'
import { budgetsService } from '@/services/budgets'
import { debtsService } from '@/services/debts'
import { dreamsService } from '@/services/dreams'
import {
  AccountRecord,
  TransactionRecord,
  CategoryRecord,
  BudgetRecord,
  DebtRecord,
  DreamRecord,
} from '@/types/finance'

export interface QuickTransactionSuggestion {
  parseResult: VoiceParseResult
  suggestedCategoryId: string | null
  suggestedCategoryName: string | null
  suggestedAccountId: string | null
  suggestedAccountName: string | null
  confidence: number
}

export interface UserBudgetProfile {
  monthlyIncome: number
  housingType: 'rent' | 'mortgage' | 'own_free' | 'family'
  rentAmount: number
  hasChildren: boolean
  childrenCount: number
  transportType: 'car' | 'public' | 'rideshare' | 'motorcycle' | 'hybrid'
  hasHighDebts: boolean
  primaryGoal: 'pay_debts' | 'emergency_fund' | 'balanced' | 'invest_wealth' | 'cut_waste'
  macroNeedsPercent: number
  macroWantsPercent: number
  macroSavingsPercent: number
}

export interface BudgetRecommendation {
  id?: string
  groupName: string
  recommendedPercent: number
  recommendedAmount: number
  currentBudgetAmount: number
  targetType: 'group' | 'subgroup'
  categoryIds: string[]
  reason: string
  enabled?: boolean
  customAmount?: number
  macroGroup?: 'needs' | 'wants' | 'savings'
  warningPercent?: number
  dangerPercent?: number
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
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    const normalizedText = cleanNorm(text)
    const textWords = normalizedText
      .split(' ')
      .map((w) => w.trim())
      .filter((w) => w.length >= 3 && !['para', 'com', 'uma', 'este', 'hoje', 'reais', 'real', 'paguei', 'pago', 'gastei', 'comprei', 'valor'].includes(w))

    let bestCategory: CategoryRecord | null = null
    let maxScore = 0

    // Mapeamento semântico conceitual que conecta termos corriqueiros aos Subgrupos Oficiais e suas Descrições
    const semanticConcepts: Array<{
      targetSubgroupCode?: string
      targetKeywords: string[]
      triggerWords: string[]
    }> = [
      {
        targetSubgroupCode: '2.3', // Refeições em Trânsito
        targetKeywords: ['refeicoes em transito', 'almocos executivos', 'lanches de expediente', 'cafes matinais'],
        triggerWords: ['almoco', 'almoço', 'restaurante', 'lanche', 'refeicao', 'refeição', 'cafe', 'cafeteria', 'executivo', 'expediente', 'prato feito', 'comida quilo', 'self service'],
      },
      {
        targetSubgroupCode: '7.1', // Gastronomia Social
        targetKeywords: ['gastronomia social', 'jantares', 'almocos de lazer', 'delivery', 'ifood', 'cafes especiais'],
        triggerWords: ['ifood', 'delivery', 'jantar', 'pizza', 'hamburguer', 'churrasco', 'churrascaria', 'bar', 'chopp', 'cerveja', 'rodizio', 'outback', 'mcdonalds', 'burger king'],
      },
      {
        targetSubgroupCode: '2.1', // Mercado Principal
        targetKeywords: ['mercado principal', 'compras de base', 'graos', 'higiene domestica', 'descartaveis'],
        triggerWords: ['mercado', 'supermercado', 'compras', 'arroz', 'feijao', 'carrefour', 'pao de acucar', 'assai', 'atacadista', 'despensa', 'sabao', 'detergente'],
      },
      {
        targetSubgroupCode: '2.2', // Açougue, Feira e Perecíveis
        targetKeywords: ['acougue feira pereciveis', 'proteinas', 'carnes', 'hortifruti', 'verduras', 'padaria'],
        triggerWords: ['carne', 'acougue', 'açougue', 'feira', 'hortifruti', 'fruta', 'legume', 'verdura', 'padaria', 'pao', 'leite', 'queijo', 'frango', 'peixe'],
      },
      {
        targetSubgroupCode: '1.1', // Estrutural Habitacional
        targetKeywords: ['estrutural habitacional', 'condominio', 'aluguel', 'taxa de associacao'],
        triggerWords: ['aluguel', 'condominio', 'condomínio', 'taxa de bairro', 'moradia', 'locacao'],
      },
      {
        targetSubgroupCode: '1.2', // Financiamento Imobiliário
        targetKeywords: ['financiamento imobiliario', 'amortizacao', 'parcela do imovel'],
        triggerWords: ['financiamento caixa', 'prestacao da casa', 'parcela apto', 'amortizacao', 'credito imobiliario'],
      },
      {
        targetSubgroupCode: '1.3', // Concessionárias e Utilidades
        targetKeywords: ['concessionarias utilidades', 'energia eletrica', 'agua esgoto', 'gas canalizado botijao'],
        triggerWords: ['luz', 'energia', 'enel', 'cpfl', 'light', 'cemig', 'copel', 'agua', 'água', 'sabesp', 'sanepar', 'gas', 'gás', 'botijao', 'conta de luz', 'conta de agua'],
      },
      {
        targetSubgroupCode: '1.4', // Telecomunicação Residencial
        targetKeywords: ['telecomunicacao residencial', 'internet banda larga', 'tv por assinatura', 'lixo'],
        triggerWords: ['internet', 'fibra', 'wifi', 'banda larga', 'claro net', 'vivo fibra', 'taxa de lixo'],
      },
      {
        targetSubgroupCode: '3.1', // Consumo dos Veículos
        targetKeywords: ['consumo dos veiculos', 'abastecimento combustivel', 'etanol gasolina diesel', 'lavagens estacionamentos'],
        triggerWords: ['combustivel', 'combustível', 'gasolina', 'etanol', 'alcool', 'diesel', 'posto', 'abastecer', 'abastecimento', 'lavagem', 'estacionamento', 'ipiranga', 'shell', 'br'],
      },
      {
        targetSubgroupCode: '3.4', // Deslocamento Alternativo
        targetKeywords: ['deslocamento alternativo', 'uber', '99', 'pedagio', 'transporte interurbano'],
        triggerWords: ['uber', '99', '99pop', 'taxi', 'táxi', 'corrida', 'pedagio', 'pedágio', 'onibus', 'metro', 'passagem'],
      },
      {
        targetSubgroupCode: '4.2', // Medicamentos e Farmácia
        targetKeywords: ['medicamentos farmacia', 'remedios de uso continuo', 'analgesicos suplementacao'],
        triggerWords: ['farmacia', 'farmácia', 'drogaria', 'drogasil', 'droga raia', 'pague menos', 'remedio', 'remédio', 'medicamento', 'dipirona', 'vitamina', 'suplemento'],
      },
      {
        targetSubgroupCode: '4.1', // Planos de Saúde
        targetKeywords: ['planos de saude', 'assistencia medica odontologica'],
        triggerWords: ['plano de saude', 'unimed', 'bradesco saude', 'sulamerica', 'amil', 'notredame', 'convenio'],
      },
      {
        targetSubgroupCode: '4.4', // Autocuidado Físico
        targetKeywords: ['autocuidado fisico', 'academia pilates natacao assessorias'],
        triggerWords: ['academia', 'smartfit', 'bluefit', 'pilates', 'natacao', 'personal', 'crossfit', 'musculacao'],
      },
      {
        targetSubgroupCode: '7.2', // Assinaturas e Digitais
        targetKeywords: ['assinaturas digitais', 'streaming', 'nuvem telefonia celular'],
        triggerWords: ['netflix', 'spotify', 'prime', 'amazon prime', 'disney', 'youtube premium', 'icloud', 'google one', 'celular', 'tim', 'vivo controle', 'claro movel'],
      },
      {
        targetSubgroupCode: '6.3', // Vestuário e Calçados
        targetKeywords: ['vestuario calcados', 'roupas', 'pecas basicas'],
        triggerWords: ['roupa', 'roupas', 'camisa', 'calca', 'calça', 'vestido', 'sapato', 'tenis', 'tênis', 'zara', 'renner', 'riachuelo', 'c&a'],
      },
      {
        targetSubgroupCode: '0.1', // Salários e Remunerações
        targetKeywords: ['salarios remuneracoes', 'pro labore adiantamentos bonificacoes'],
        triggerWords: ['salario', 'salário', 'holerite', 'pro labore', 'pró-labore', 'adiantamento', 'quinzena', 'bonus', 'comissao', 'vale'],
      },
      {
        targetSubgroupCode: '0.2', // Outras Entradas
        targetKeywords: ['outras entradas', 'rendimentos aplicacoes alugueis restituicao ir'],
        triggerWords: ['freela', 'freelancer', 'rendimento', 'dividendos', 'aluguel recebido', 'restituicao', 'venda', 'reembolso'],
      },
    ]

    for (const cat of categories) {
      if (cat.type !== parseResult.type) {
        continue
      }

      let score = 0
      const isSubgroup = Boolean(cat.group_level2)
      const catNameNorm = cleanNorm(cat.name)
      const catGroup1Norm = cleanNorm(cat.group_level1)
      const catGroup2Norm = cleanNorm(cat.group_level2)
      const catDescNorm = cleanNorm(cat.description)

      // 1. Análise detalhada da DESCRIÇÃO DA UTILIZAÇÃO do Subgrupo (onde reside o significado real do plano de contas)
      for (const w of textWords) {
        if (catDescNorm && catDescNorm.includes(w)) {
          score += 35
        }
        if (catNameNorm && catNameNorm.includes(w)) {
          score += 40
        }
        if (catGroup2Norm && catGroup2Norm.includes(w)) {
          score += 30
        }
        if (catGroup1Norm && catGroup1Norm.includes(w)) {
          score += 15
        }

        // Proximidade por radical/raiz da palavra (ex: "almoc" casa com "almoço" e "almoços", "refei" com "refeições")
        if (w.length >= 4) {
          const root = w.slice(0, Math.min(w.length - 1, 5))
          if (catDescNorm && catDescNorm.includes(root)) score += 15
          if (catNameNorm && catNameNorm.includes(root)) score += 20
        }
      }

      // 2. Análise por conceitos semânticos mapeados
      for (const concept of semanticConcepts) {
        const matchesCode = concept.targetSubgroupCode && cat.code === concept.targetSubgroupCode
        const matchesTargetWords = concept.targetKeywords.some(
          (tk) => catNameNorm.includes(tk) || catDescNorm.includes(tk) || catGroup2Norm.includes(tk),
        )

        if (matchesCode || matchesTargetWords) {
          for (const tw of concept.triggerWords) {
            if (normalizedText.includes(tw)) {
              score += isSubgroup ? 60 : 25
            }
          }
        }
      }

      // Bônus prioritário para Subgrupos específicos (garante que o subgrupo venha sempre preenchido!)
      if (isSubgroup && score > 0) {
        score += 60
      }

      if (score > maxScore) {
        maxScore = score
        bestCategory = cat
      }
    }

    // Se o selecionado for um Grupo Puro, busca o subgrupo mais provável filho deste grupo
    if (bestCategory && !bestCategory.group_level2) {
      const childSubgroups = categories.filter(
        (c) =>
          c.type === parseResult.type &&
          Boolean(c.group_level2) &&
          (c.group_level1 === bestCategory?.group_level1 ||
            (c.group_code && bestCategory?.group_code && c.group_code === bestCategory.group_code) ||
            (c.code && bestCategory?.group_code && c.code.startsWith(bestCategory.group_code.replace('.0', '.')))),
      )
      if (childSubgroups.length > 0) {
        // Encontra o subgrupo filho com melhor descrição
        let bestChild = childSubgroups[0]
        let bestChildScore = 0
        for (const child of childSubgroups) {
          const childDesc = cleanNorm(child.description)
          const childName = cleanNorm(child.name)
          let cScore = 0
          for (const w of textWords) {
            if (childDesc.includes(w)) cScore += 30
            if (childName.includes(w)) cScore += 35
          }
          if (cScore > bestChildScore) {
            bestChildScore = cScore
            bestChild = child
          }
        }
        bestCategory = bestChild
      } else {
        // Fallback: se o grupo pai não tem filhos diretos, seleciona o primeiro subgrupo ativo compatível
        const anyActiveSub = categories.find(
          (c) => c.type === parseResult.type && Boolean(c.group_level2) && (c.status ?? 'active') === 'active',
        )
        if (anyActiveSub) bestCategory = anyActiveSub
      }
    }

    // Se nenhuma categoria combinou, escolhe o primeiro subgrupo ativo compatível
    if (!bestCategory && categories.length > 0) {
      bestCategory =
        categories.find((c) => c.type === parseResult.type && Boolean(c.group_level2) && (c.status ?? 'active') === 'active') ||
        categories.find((c) => c.type === parseResult.type && Boolean(c.group_level2)) ||
        categories[0]
    }

    // =========================================================================
    // ENTENDIMENTO AVANÇADO DA CONTA (com proximidade e flexibilidade de nomes)
    // =========================================================================
    let matchedAccount: AccountRecord | null = null

    // 1. Se o parser já encontrou por palavras exatas
    if (parseResult.accountId) {
      matchedAccount = accounts.find((a) => a.id === parseResult.accountId) || null
    }

    // 2. Pontuação inteligente para cada conta cadastrada com base na frase falada
    if (!matchedAccount && accounts.length > 0) {
      const isCreditMentioned =
        normalizedText.includes('credito') ||
        normalizedText.includes('cartao') ||
        normalizedText.includes('fatura') ||
        normalizedText.includes('parcelado') ||
        normalizedText.includes('vezes')

      const isCheckingMentioned =
        normalizedText.includes('debito') ||
        normalizedText.includes('corrente') ||
        normalizedText.includes('pix') ||
        normalizedText.includes('transferencia') ||
        normalizedText.includes('ted')

      let bestAccScore = 0
      let bestAccCandidate: AccountRecord | null = null

      for (const acc of accounts) {
        if ((acc.status ?? 'active') !== 'active') continue

        let accScore = 0
        const accNameNorm = cleanNorm(acc.name)
        const nameParts = accNameNorm.split(' ').filter((p) => p.length >= 2)

        // Verifica correspondência das palavras do nome da conta na frase
        for (const part of nameParts) {
          if (normalizedText.includes(part)) {
            accScore += part.length >= 4 ? 40 : 20
          }
        }

        // Bônus pelo tipo indicado na frase
        if (isCreditMentioned && acc.type === 'credit_card') accScore += 35
        if (isCheckingMentioned && acc.type === 'checking') accScore += 35

        if (accScore > bestAccScore) {
          bestAccScore = accScore
          bestAccCandidate = acc
        }
      }

      if (bestAccScore > 0 && bestAccCandidate) {
        matchedAccount = bestAccCandidate
      }

      // 3. Fallbacks por tipo caso nenhuma conta tenha pontuado por nome
      if (!matchedAccount && isCreditMentioned) {
        matchedAccount =
          accounts.find((a) => a.type === 'credit_card' && (a.status ?? 'active') === 'active') ||
          accounts.find((a) => a.type === 'credit_card') ||
          null
      }

      if (!matchedAccount) {
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
   * Gera uma recomendação de orçamento interativa baseada na realidade do usuário (aluguel, filhos, dívidas, metas)
   */
  async generateSmartBudget(
    customMonthlyIncome?: number,
    profile?: Partial<UserBudgetProfile>,
  ): Promise<{
    estimatedIncome: number
    recommendations: BudgetRecommendation[]
    methodology: string
    profileReason: string
    macroDistribution: {
      needsPercent: number
      wantsPercent: number
      savingsPercent: number
      needsAmount: number
      wantsAmount: number
      savingsAmount: number
    }
  }> {
    const transactions = await transactionsService.getAll()
    const categories = await categoriesService.getAll()
    const currentBudgets = await budgetsService.getAll()

    // 1. Determina a renda base
    let estimatedIncome = profile?.monthlyIncome || customMonthlyIncome || 0
    if (!estimatedIncome) {
      const now = new Date()
      const curMonth = now.toISOString().slice(0, 7)
      const currentMonthIncomes = transactions
        .filter((t) => t.type === 'income' && (t.date || '').startsWith(curMonth))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

      if (currentMonthIncomes > 0) {
        estimatedIncome = currentMonthIncomes
      } else {
        const allIncomes = transactions
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
        estimatedIncome = allIncomes > 0 ? Math.round(allIncomes) : 4000
      }
    }

    // 2. Avalia a realidade do usuário
    const housingType = profile?.housingType || 'rent'
    const rentAmount = profile?.rentAmount || (housingType === 'rent' ? Math.round(estimatedIncome * 0.25) : 0)
    const hasChildren = profile?.hasChildren ?? false
    const childrenCount = profile?.childrenCount ?? (hasChildren ? 1 : 0)
    const transportType = profile?.transportType || 'car'
    const hasHighDebts = profile?.hasHighDebts ?? false
    const primaryGoal = profile?.primaryGoal || 'balanced'

    // 3. Moldagem inteligente dos percentuais Macro
    let needsPct = 50
    let wantsPct = 30
    let savingsPct = 20
    let profileReason = 'Modelo equilibrado padrão 50/30/20.'

    if (profile?.macroNeedsPercent !== undefined && profile?.macroWantsPercent !== undefined && profile?.macroSavingsPercent !== undefined) {
      // Usuário moldou manualmente os percentuais
      needsPct = profile.macroNeedsPercent
      wantsPct = profile.macroWantsPercent
      savingsPct = profile.macroSavingsPercent
      profileReason = `Modelo customizado por você: ${needsPct}% Essenciais / ${wantsPct}% Estilo de Vida / ${savingsPct}% Futuro.`
    } else {
      // IA sugere automaticamente com base na realidade:
      if (hasChildren && (housingType === 'rent' || housingType === 'mortgage')) {
        needsPct = 60
        wantsPct = 25
        savingsPct = 15
        profileReason = `Como você possui ${childrenCount > 1 ? childrenCount + ' filhos' : 'filho(a)'} e despesas com moradia (${housingType === 'rent' ? 'aluguel' : 'financiamento'}), o modelo 60/25/15 evita sufocar seu custo fixo essencial.`
      } else if (hasHighDebts) {
        needsPct = 50
        wantsPct = 20
        savingsPct = 30
        profileReason = 'Com dívidas ativas para amortizar, aumentamos o Futuro/Quitação para 30% da renda para estancar os juros com urgência.'
      } else if (housingType === 'own_free' || housingType === 'family') {
        needsPct = 40
        wantsPct = 30
        savingsPct = 30
        profileReason = `Por não ter custo de aluguel (${housingType === 'own_free' ? 'casa própria quitada' : 'mora com família'}), liberamos 30% da sua renda diretamente para investimentos e liberdade financeira.`
      } else if (primaryGoal === 'invest_wealth') {
        needsPct = 45
        wantsPct = 25
        savingsPct = 30
        profileReason = 'Meta de acelerar investimentos: modelo agressivo 45/25/30 priorizando sua independência financeira.'
      }
    }

    const needsBudget = Math.round(estimatedIncome * (needsPct / 100))
    const wantsBudget = Math.round(estimatedIncome * (wantsPct / 100))
    const savingsBudget = Math.round(estimatedIncome * (savingsPct / 100))

    const getExistingBudgetForGroup = (groupName: string) => {
      const found = currentBudgets.find((b) => b.category_group === groupName)
      return found ? Number(found.limit_amount) || 0 : 0
    }

    // 4. Monta as recomendações por categoria detalhada
    const recommendations: BudgetRecommendation[] = []

    // A. Habitação & Moradia
    const housingAmount = rentAmount > 0 
      ? Math.max(rentAmount, Math.round(estimatedIncome * 0.2)) 
      : (housingType === 'family' || housingType === 'own_free' ? Math.round(estimatedIncome * 0.08) : Math.round(estimatedIncome * 0.25))
    const housingPct = Math.round((housingAmount / estimatedIncome) * 100)
    recommendations.push({
      id: 'rec-habitacao',
      groupName: 'Habitação & Moradia',
      macroGroup: 'needs',
      recommendedPercent: housingPct,
      recommendedAmount: housingAmount,
      customAmount: housingAmount,
      enabled: true,
      currentBudgetAmount: getExistingBudgetForGroup('Habitação & Moradia') || getExistingBudgetForGroup('Habitação'),
      targetType: 'group',
      categoryIds: categories.filter((c) => (c.group_level2 || '').includes('Habitação')).map((c) => c.id),
      reason: rentAmount > 0 
        ? `Aluguel/parcela informado de R$ ${rentAmount.toLocaleString('pt-BR')} mais condomínio, luz, água e IPTU.`
        : housingType === 'own_free' 
        ? 'Casa própria quitada: apenas condomínio, IPTU e manutenções periódicas.' 
        : 'Aluguel, contas de consumo (luz, água, gás) e condomínio.',
      warningPercent: 75,
      dangerPercent: 90,
    })

    // B. Alimentação & Mercado
    const foodPct = hasChildren ? (childrenCount > 1 ? 20 : 18) : 14
    const foodAmount = Math.round(estimatedIncome * (foodPct / 100))
    recommendations.push({
      id: 'rec-alimentacao',
      groupName: 'Alimentação & Mercado',
      macroGroup: 'needs',
      recommendedPercent: foodPct,
      recommendedAmount: foodAmount,
      customAmount: foodAmount,
      enabled: true,
      currentBudgetAmount: getExistingBudgetForGroup('Alimentação & Mercado') || getExistingBudgetForGroup('Alimentação'),
      targetType: 'group',
      categoryIds: categories.filter((c) => (c.group_level2 || '').includes('Alimentação')).map((c) => c.id),
      reason: hasChildren
        ? `Supermercado essencial, feira e açougue dimensionados para família com ${childrenCount} dependente(s).`
        : 'Supermercado essencial, feira do mês, padaria e açougue.',
      warningPercent: 75,
      dangerPercent: 90,
    })

    // C. Transporte & Mobilidade
    const transPct = transportType === 'car' ? 12 : transportType === 'rideshare' ? 10 : 7
    const transAmount = Math.round(estimatedIncome * (transPct / 100))
    recommendations.push({
      id: 'rec-transporte',
      groupName: 'Transporte & Mobilidade',
      macroGroup: 'needs',
      recommendedPercent: transPct,
      recommendedAmount: transAmount,
      customAmount: transAmount,
      enabled: true,
      currentBudgetAmount: getExistingBudgetForGroup('Transporte & Mobilidade') || getExistingBudgetForGroup('Transporte'),
      targetType: 'group',
      categoryIds: categories.filter((c) => (c.group_level2 || '').includes('Transporte') || (c.group_level2 || '').includes('Mobilidade')).map((c) => c.id),
      reason: transportType === 'car' 
        ? 'Combustível, IPVA, seguro e manutenção preventiva do veículo.' 
        : transportType === 'rideshare' 
        ? 'Aplicativos de transporte (Uber/99) e viagens do dia a dia.' 
        : 'Passagens de metrô, ônibus, trem e recargas de transporte.',
      warningPercent: 75,
      dangerPercent: 90,
    })

    // D. Dependentes, Filhos & Saúde (se tiver filhos)
    if (hasChildren) {
      const childPct = 8
      const childAmount = Math.round(estimatedIncome * (childPct / 100))
      recommendations.push({
        id: 'rec-filhos',
        groupName: 'Educação & Dependentes',
        macroGroup: 'needs',
        recommendedPercent: childPct,
        recommendedAmount: childAmount,
        customAmount: childAmount,
        enabled: true,
        currentBudgetAmount: getExistingBudgetForGroup('Educação') || getExistingBudgetForGroup('Dependentes'),
        targetType: 'group',
        categoryIds: categories.filter((c) => (c.group_level2 || '').includes('Educação') || (c.group_level2 || '').includes('Filhos')).map((c) => c.id),
        reason: 'Mensalidades escolares, cursos, materiais didáticos e cuidados com filhos.',
        warningPercent: 75,
        dangerPercent: 90,
      })
    }

    // E. Saúde & Farmácia
    const healthPct = 6
    const healthAmount = Math.round(estimatedIncome * (healthPct / 100))
    recommendations.push({
      id: 'rec-saude',
      groupName: 'Saúde & Farmácia',
      macroGroup: 'needs',
      recommendedPercent: healthPct,
      recommendedAmount: healthAmount,
      customAmount: healthAmount,
      enabled: true,
      currentBudgetAmount: getExistingBudgetForGroup('Saúde') || getExistingBudgetForGroup('Cuidados Pessoais'),
      targetType: 'group',
      categoryIds: categories.filter((c) => (c.group_level2 || '').includes('Saúde') || (c.group_level2 || '').includes('Farmácia')).map((c) => c.id),
      reason: 'Plano de saúde, farmácia, consultas médicas e cuidados preventivos.',
      warningPercent: 75,
      dangerPercent: 90,
    })

    // F. Lazer & Estilo de Vida
    const leisurePct = Math.max(10, wantsPct - 5)
    const leisureAmount = Math.round(estimatedIncome * (leisurePct / 100))
    recommendations.push({
      id: 'rec-lazer',
      groupName: 'Lazer, Restaurantes & Estilo de Vida',
      macroGroup: 'wants',
      recommendedPercent: leisurePct,
      recommendedAmount: leisureAmount,
      customAmount: leisureAmount,
      enabled: true,
      currentBudgetAmount: getExistingBudgetForGroup('Lazer & Alimentação') || getExistingBudgetForGroup('Lazer'),
      targetType: 'group',
      categoryIds: categories.filter((c) => (c.group_level1 || '').includes('Estilo de Vida') || (c.group_level2 || '').includes('Lazer')).map((c) => c.id),
      reason: 'Restaurantes, deliverys (iFood), passeios de fim de semana e compras pessoais.',
      warningPercent: 75,
      dangerPercent: 90,
    })

    // G. Assinaturas & Conectividade
    const subPct = Math.min(5, Math.max(3, wantsPct - leisurePct))
    const subAmount = Math.round(estimatedIncome * (subPct / 100))
    recommendations.push({
      id: 'rec-assinaturas',
      groupName: 'Assinaturas & Conectividade',
      macroGroup: 'wants',
      recommendedPercent: subPct,
      recommendedAmount: subAmount,
      customAmount: subAmount,
      enabled: true,
      currentBudgetAmount: getExistingBudgetForGroup('Comunicação') || getExistingBudgetForGroup('Assinaturas'),
      targetType: 'group',
      categoryIds: categories.filter((c) => (c.group_level2 || '').includes('Comunicação') || (c.group_level2 || '').includes('Assinaturas')).map((c) => c.id),
      reason: 'Internet residencial, plano de celular e serviços de streaming (Netflix, Spotify, etc.).',
      warningPercent: 75,
      dangerPercent: 90,
    })

    // H. Futuro: Dívidas ou Investimentos
    if (hasHighDebts) {
      const debtAmount = Math.round(estimatedIncome * (savingsPct / 100))
      recommendations.push({
        id: 'rec-dividas',
        groupName: 'Quitação Acelerada de Dívidas',
        macroGroup: 'savings',
        recommendedPercent: savingsPct,
        recommendedAmount: debtAmount,
        customAmount: debtAmount,
        enabled: true,
        currentBudgetAmount: getExistingBudgetForGroup('Dívidas') || getExistingBudgetForGroup('Empréstimos'),
        targetType: 'group',
        categoryIds: categories.filter((c) => (c.group_level1 || '').includes('Dívidas')).map((c) => c.id),
        reason: 'Amortização extra de dívidas de alta taxa pelo método Avalanche para eliminar juros.',
        warningPercent: 75,
        dangerPercent: 90,
      })
    } else {
      recommendations.push({
        id: 'rec-investimentos',
        groupName: 'Investimentos & Reserva de Emergência',
        macroGroup: 'savings',
        recommendedPercent: savingsPct,
        recommendedAmount: savingsBudget,
        customAmount: savingsBudget,
        enabled: true,
        currentBudgetAmount: getExistingBudgetForGroup('Investimentos') || getExistingBudgetForGroup('Metas'),
        targetType: 'group',
        categoryIds: categories.filter((c) => (c.group_level1 || '').includes('Investimentos')).map((c) => c.id),
        reason: 'Aporte mensal para construção da reserva de emergência e independência financeira.',
        warningPercent: 75,
        dangerPercent: 90,
      })
    }

    return {
      estimatedIncome,
      recommendations,
      methodology: `Modelo ${needsPct}/${wantsPct}/${savingsPct} (${needsPct}% Essenciais, ${wantsPct}% Estilo de Vida, ${savingsPct}% Futuro)`,
      profileReason,
      macroDistribution: {
        needsPercent: needsPct,
        wantsPercent: wantsPct,
        savingsPercent: savingsPct,
        needsAmount: needsBudget,
        wantsAmount: wantsBudget,
        savingsAmount: savingsBudget,
      },
    }
  },

  /**
   * Aplica em lote uma lista de recomendações de orçamento diretamente no sistema local,
   * respeitando as seleções e valores customizados pelo usuário.
   */
  async applyBudgetRecommendations(
    recommendations: BudgetRecommendation[],
    targetMonth: string,
  ): Promise<number> {
    let appliedCount = 0

    for (const rec of recommendations) {
      // Ignora se o usuário desmarcou esta categoria
      if (rec.enabled === false) continue

      const amountToSave = Number(rec.customAmount ?? rec.recommendedAmount) || 0
      if (amountToSave <= 0) continue

      await budgetsService.upsert(
        targetMonth,
        rec.groupName,
        amountToSave,
        rec.warningPercent ?? 75,
        rec.dangerPercent ?? 90,
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

    // 3. Perguntas sobre orçamento, aluguel, filhos e regra 50/30/20
    if (
      qNorm.includes('orcamento') ||
      qNorm.includes('50 30 20') ||
      qNorm.includes('divisao') ||
      qNorm.includes('aluguel') ||
      qNorm.includes('filho') ||
      qNorm.includes('dividir') ||
      qNorm.includes('ganho')
    ) {
      const hasRent = qNorm.includes('aluguel')
      const hasKids = qNorm.includes('filho') || qNorm.includes('filhos') || qNorm.includes('crianca')
      const incomeMatch = question.match(/\b(\d{1,3}(?:[.,]\d{3})*|\d+)\b/g)
      
      let contextTip = ''
      if (hasRent && hasKids) {
        contextTip = '\n\n👨‍👩‍👦 **Dica Especial para sua Realidade (Aluguel + Filhos):** O modelo clássico 50/30/20 costuma sufocar famílias com aluguel e filhos. Recomendamos o modelo **60/25/15** (60% Essenciais, 25% Estilo de Vida e 15% Futuro) para manter as contas folgadas.'
      } else if (hasRent) {
        contextTip = '\n\n🏠 **Dica para Aluguel:** Seu custo total de moradia (aluguel + condomínio + IPTU + contas) não deve ultrapassar 30% da sua renda líquida.'
      } else if (hasKids) {
        contextTip = '\n\n👶 **Dica para Dependentes:** Gastos com escola e alimentação exigem maior folga nos custos essenciais (55% a 60% da renda).'
      }

      return `📊 **Como moldar seu Orçamento de forma Realista:**\n\n• **Custos Essenciais:** Moradia, alimentação, educação, saúde e transporte.\n• **Estilo de Vida:** Restaurantes, passeios, compras e lazer.\n• **Futuro & Metas:** Reserva de emergência, quitação de dívidas e investimentos.${contextTip}\n\n👉 *Na aba **Orçamento Interativo** do Copiloto, você pode responder ao assistente (informando se paga aluguel, se tem filhos e quanto ganha), moldar os percentuais e escolher exatamente onde aplicar no seu aplicativo!*`
    }

    // 4. Pergunta sobre saúde financeira / situação atual
    if (qNorm.includes('como estao minhas financas') || qNorm.includes('saldo') || qNorm.includes('situacao') || qNorm.includes('resumo')) {
      return `📈 **Raio-X das suas Finanças este Mês:**\n\n• **Entradas:** R$ ${diagnostic.totalIncomeMonth.toFixed(2)}\n• **Saídas:** R$ ${diagnostic.totalExpenseMonth.toFixed(2)}\n• **Resultado do Mês:** R$ ${diagnostic.balanceMonth.toFixed(2)} (${diagnostic.balanceMonth >= 0 ? '🟢 Positivo' : '🔴 Atenção: Gastos superaram a renda'})\n• **Taxa de Poupança:** ${diagnostic.savingsRate}%\n\n${diagnostic.actionableTips[0] || 'Continue acompanhando seus números para manter o controle total!'}`
    }

    // Resposta padrão inteligente
    return `Olá! Sou seu **Copiloto Financeiro Inteligente** do Gestio Finanças.\n\nPosso te ajudar em três áreas essenciais:\n1. ✍️ **Lançamento Rápido:** Digite coisas como *"Gastei 45 no almoço hoje"* e eu crio o registro pronto.\n2. 🎯 **Orçamento Automático:** Calculo o teto ideal para cada área da sua vida usando a regra 50/30/20.\n3. 💡 **Consultoria de Gastos & Dívidas:** Analiso seus números reais para indicar onde economizar e acelerar seus sonhos.\n\nComo posso te ajudar hoje?`
  },
}
