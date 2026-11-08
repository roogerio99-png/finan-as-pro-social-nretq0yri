import fs from 'fs'

let code = fs.readFileSync('src/services/copilotService.ts', 'utf8')

// 1. Atualizar interfaces
const oldInterface = `export interface BudgetRecommendation {
  groupName: string
  recommendedPercent: number
  recommendedAmount: number
  currentBudgetAmount: number
  targetType: 'group' | 'subgroup'
  categoryIds: string[]
  reason: string
}`

const newInterface = `export interface UserBudgetProfile {
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
}`

code = code.replace(oldInterface, newInterface)

// 2. Localizar generateSmartBudget e applyBudgetRecommendations
const startBudgetIdx = code.indexOf('  /**\n   * Gera uma recomendação de orçamento baseada na Regra 50/30/20 e receitas do usuário\n   */')
const endBudgetTarget = '    return appliedCount\n  },'
const endBudgetIdx = code.indexOf(endBudgetTarget, startBudgetIdx) + endBudgetTarget.length

const newBudgetSection = `  /**
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
      profileReason = \`Modelo customizado por você: \${needsPct}% Essenciais / \${wantsPct}% Estilo de Vida / \${savingsPct}% Futuro.\`
    } else {
      // IA sugere automaticamente com base na realidade:
      if (hasChildren && (housingType === 'rent' || housingType === 'mortgage')) {
        needsPct = 60
        wantsPct = 25
        savingsPct = 15
        profileReason = \`Como você possui \${childrenCount > 1 ? childrenCount + ' filhos' : 'filho(a)'} e despesas com moradia (\${housingType === 'rent' ? 'aluguel' : 'financiamento'}), o modelo 60/25/15 evita sufocar seu custo fixo essencial.\`
      } else if (hasHighDebts) {
        needsPct = 50
        wantsPct = 20
        savingsPct = 30
        profileReason = 'Com dívidas ativas para amortizar, aumentamos o Futuro/Quitação para 30% da renda para estancar os juros com urgência.'
      } else if (housingType === 'own_free' || housingType === 'family') {
        needsPct = 40
        wantsPct = 30
        savingsPct = 30
        profileReason = \`Por não ter custo de aluguel (\${housingType === 'own_free' ? 'casa própria quitada' : 'mora com família'}), liberamos 30% da sua renda diretamente para investimentos e liberdade financeira.\`
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
        ? \`Aluguel/parcela informado de R$ \${rentAmount.toLocaleString('pt-BR')} mais condomínio, luz, água e IPTU.\`
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
        ? \`Supermercado essencial, feira e açougue dimensionados para família com \${childrenCount} dependente(s).\`
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
      methodology: \`Modelo \${needsPct}/\${wantsPct}/\${savingsPct} (\${needsPct}% Essenciais, \${wantsPct}% Estilo de Vida, \${savingsPct}% Futuro)\`,
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
  },`

code = code.slice(0, startBudgetIdx) + newBudgetSection + code.slice(endBudgetIdx)

// 5. Atualizar askCopilot para responder a perguntas contextuais sobre aluguel e filhos
const oldAsk = `    // 3. Perguntas sobre orçamento e regra 50/30/20
    if (qNorm.includes('orcamento') || qNorm.includes('50 30 20') || qNorm.includes('divisao') || qNorm.includes('meta')) {
      return \`📊 **Como aplicar a Regra 50/30/20 na sua rotina:**\\n\\n• **50% — Necessidades Básicas:** Aluguel, contas de consumo (água, luz, gás), mercado e transporte para o trabalho.\\n• **30% — Estilo de Vida:** Restaurantes, saídas, lazer, compras pessoais e hobbies.\\n• **20% — Futuro e Segurança:** Quitação rápida de dívidas e aplicação em renda fixa para sua reserva.\\n\\n👉 *Você pode usar a aba "Orçamento Inteligente" aqui no Copiloto para que eu calcule e aplique automaticamente esses tetos em todas as suas categorias!*\`
    }`

const newAsk = `    // 3. Perguntas sobre orçamento, aluguel, filhos e regra 50/30/20
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
      const incomeMatch = question.match(/\\b(\\d{1,3}(?:[.,]\\d{3})*|\\d+)\\b/g)
      
      let contextTip = ''
      if (hasRent && hasKids) {
        contextTip = '\\n\\n👨‍👩‍👦 **Dica Especial para sua Realidade (Aluguel + Filhos):** O modelo clássico 50/30/20 costuma sufocar famílias com aluguel e filhos. Recomendamos o modelo **60/25/15** (60% Essenciais, 25% Estilo de Vida e 15% Futuro) para manter as contas folgadas.'
      } else if (hasRent) {
        contextTip = '\\n\\n🏠 **Dica para Aluguel:** Seu custo total de moradia (aluguel + condomínio + IPTU + contas) não deve ultrapassar 30% da sua renda líquida.'
      } else if (hasKids) {
        contextTip = '\\n\\n👶 **Dica para Dependentes:** Gastos com escola e alimentação exigem maior folga nos custos essenciais (55% a 60% da renda).'
      }

      return \`📊 **Como moldar seu Orçamento de forma Realista:**\\n\\n• **Custos Essenciais:** Moradia, alimentação, educação, saúde e transporte.\\n• **Estilo de Vida:** Restaurantes, passeios, compras e lazer.\\n• **Futuro & Metas:** Reserva de emergência, quitação de dívidas e investimentos.\${contextTip}\\n\\n👉 *Na aba **Orçamento Interativo** do Copiloto, você pode responder ao assistente (informando se paga aluguel, se tem filhos e quanto ganha), moldar os percentuais e escolher exatamente onde aplicar no seu aplicativo!*\`
    }`

code = code.replace(oldAsk, newAsk)

fs.writeFileSync('src/services/copilotService.ts', code)
console.log('copilotService updated successfully!')
