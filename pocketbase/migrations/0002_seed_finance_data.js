migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Garantir usuário padrão
    let defaultUser
    try {
      defaultUser = app.findAuthRecordByEmail('_pb_users_auth_', 'roogerio99@gmail.com')
      if (defaultUser.get('name') === 'Rogério Silva') {
        defaultUser.set('name', 'Rogério Coimbra')
        app.save(defaultUser)
      }
    } catch (_) {
      defaultUser = new Record(users)
      defaultUser.setEmail('roogerio99@gmail.com')
      defaultUser.setPassword('Skip@Pass')
      defaultUser.setVerified(true)
      defaultUser.set('name', 'Rogério Coimbra')
      app.save(defaultUser)
    }

    const userId = defaultUser.id

    // 2. Família
    const families = app.findCollectionByNameOrId('families')
    let family
    try {
      family = app.findFirstRecordByData('families', 'name', 'Família Coimbra')
    } catch (_) {
      try {
        family = app.findFirstRecordByData('families', 'name', 'Família Silva')
        family.set('name', 'Família Coimbra')
        app.save(family)
      } catch (__) {
        family = new Record(families)
        family.set('name', 'Família Coimbra')
        family.set('created_by', userId)
        family.set('members', [userId])
        app.save(family)
      }
    }

    // 3. Contas e Cartões
    const accounts = app.findCollectionByNameOrId('accounts')
    const seededAccounts = [
      {
        name: 'Nubank Conta Corrente',
        type: 'checking',
        initial_balance: 3250.0,
        color: '#820AD1',
        status: 'active',
      },
      {
        name: 'Cartão Nubank Ultravioleta',
        type: 'credit_card',
        initial_balance: 0,
        credit_limit: 8500.0,
        closing_day: 25,
        due_day: 5,
        color: '#4c1d95',
        status: 'active',
      },
      {
        name: 'Itaú Reserva de Emergência',
        type: 'savings',
        initial_balance: 12400.0,
        color: '#EC7000',
        status: 'active',
      },
      {
        name: 'Carteira Dinheiro',
        type: 'cash',
        initial_balance: 280.0,
        color: '#16A34A',
        status: 'active',
      },
    ]

    const accountMap = {}
    for (const acc of seededAccounts) {
      let rec
      try {
        rec = app.findFirstRecordByData('accounts', 'name', acc.name)
      } catch (_) {
        rec = new Record(accounts)
        rec.set('user_id', userId)
        rec.set('family_id', family.id)
        rec.set('name', acc.name)
        rec.set('type', acc.type)
        rec.set('initial_balance', acc.initial_balance)
        if (acc.credit_limit) rec.set('credit_limit', acc.credit_limit)
        if (acc.closing_day) rec.set('closing_day', acc.closing_day)
        if (acc.due_day) rec.set('due_day', acc.due_day)
        rec.set('color', acc.color)
        rec.set('status', acc.status)
        app.save(rec)
      }
      accountMap[acc.name] = rec.id
    }

    // 4. Categorias (Plano de Contas 3 níveis)
    const categories = app.findCollectionByNameOrId('categories')
    const seededCategories = [
      // Receitas
      {
        name: 'Salário Principal',
        type: 'income',
        group_level1: 'Receitas',
        group_level2: 'Renda Ativa',
        subgroup_level3: 'Salário CLT',
        icon: 'Briefcase',
        color: '#16A34A',
      },
      {
        name: 'Rendimentos e Dividendos',
        type: 'income',
        group_level1: 'Receitas',
        group_level2: 'Renda Passiva',
        subgroup_level3: 'Investimentos',
        icon: 'TrendingUp',
        color: '#059669',
      },
      {
        name: 'Freela & Extras',
        type: 'income',
        group_level1: 'Receitas',
        group_level2: 'Renda Extra',
        subgroup_level3: 'Serviços',
        icon: 'PlusCircle',
        color: '#10B981',
      },

      // Despesas: Custos Fixos
      {
        name: 'Aluguel & Condomínio',
        type: 'expense',
        group_level1: 'Custos Fixos',
        group_level2: 'Habitação',
        subgroup_level3: 'Moradia',
        icon: 'Home',
        color: '#2563EB',
      },
      {
        name: 'Energia, Água & Gás',
        type: 'expense',
        group_level1: 'Custos Fixos',
        group_level2: 'Habitação',
        subgroup_level3: 'Utilidades',
        icon: 'Zap',
        color: '#3B82F6',
      },
      {
        name: 'Supermercado Mensal',
        type: 'expense',
        group_level1: 'Custos Fixos',
        group_level2: 'Alimentação',
        subgroup_level3: 'Feira e Mercado',
        icon: 'ShoppingCart',
        color: '#0284C7',
      },
      {
        name: 'Plano de Saúde',
        type: 'expense',
        group_level1: 'Custos Fixos',
        group_level2: 'Saúde',
        subgroup_level3: 'Convênio',
        icon: 'HeartPulse',
        color: '#0EA5E9',
      },
      {
        name: 'Internet e Celular',
        type: 'expense',
        group_level1: 'Custos Fixos',
        group_level2: 'Comunicação',
        subgroup_level3: 'Telecom',
        icon: 'Wifi',
        color: '#06B6D4',
      },

      // Despesas: Estilo de Vida
      {
        name: 'Restaurantes e Delivery',
        type: 'expense',
        group_level1: 'Estilo de Vida',
        group_level2: 'Lazer & Alimentação',
        subgroup_level3: 'Ifood & Jantares',
        icon: 'Utensils',
        color: '#F59E0B',
      },
      {
        name: 'Streaming & Assinaturas',
        type: 'expense',
        group_level1: 'Estilo de Vida',
        group_level2: 'Lazer',
        subgroup_level3: 'Netflix/Spotify',
        icon: 'Tv',
        color: '#D97706',
      },
      {
        name: 'Combustível e Uber',
        type: 'expense',
        group_level1: 'Estilo de Vida',
        group_level2: 'Transporte',
        subgroup_level3: 'Locomoção',
        icon: 'Car',
        color: '#B45309',
      },
      {
        name: 'Vestuário e Compras',
        type: 'expense',
        group_level1: 'Estilo de Vida',
        group_level2: 'Pessoal',
        subgroup_level3: 'Roupas',
        icon: 'ShoppingBag',
        color: '#EA580C',
      },

      // Despesas: Investimentos e Sonhos
      {
        name: 'Aporte Reserva de Emergência',
        type: 'expense',
        group_level1: 'Investimentos e Sonhos',
        group_level2: 'Segurança',
        subgroup_level3: 'Tesouro Selic',
        icon: 'ShieldCheck',
        color: '#8B5CF6',
      },
      {
        name: 'Aporte Viagem de Férias',
        type: 'expense',
        group_level1: 'Investimentos e Sonhos',
        group_level2: 'Metas',
        subgroup_level3: 'Eurotrip 2026',
        icon: 'Plane',
        color: '#7C3AED',
      },

      // Despesas: Dívidas
      {
        name: 'Parcela Renegociação Empréstimo',
        type: 'expense',
        group_level1: 'Dívidas',
        group_level2: 'Bancário',
        subgroup_level3: 'Empréstimo Pessoal',
        icon: 'CreditCard',
        color: '#DC2626',
      },
    ]

    const categoryMap = {}
    for (const cat of seededCategories) {
      let rec
      try {
        rec = app.findFirstRecordByData('categories', 'name', cat.name)
      } catch (_) {
        rec = new Record(categories)
        rec.set('user_id', userId)
        rec.set('name', cat.name)
        rec.set('type', cat.type)
        rec.set('group_level1', cat.group_level1)
        rec.set('group_level2', cat.group_level2)
        rec.set('subgroup_level3', cat.subgroup_level3)
        rec.set('icon', cat.icon)
        rec.set('color', cat.color)
        app.save(rec)
      }
      categoryMap[cat.name] = rec.id
    }

    // 5. Transações de exemplo (Competência vs Caixa!)
    const now = new Date()
    const currentYearMonth = now.toISOString().slice(0, 7) // Ex: 2025-05 ou 2025-xx
    const prevYearMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .slice(0, 7)
    const nextYearMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 7)

    const transactions = app.findCollectionByNameOrId('transactions')
    const checkingId = accountMap['Nubank Conta Corrente']
    const creditCardId = accountMap['Cartão Nubank Ultravioleta']

    const sampleTransactions = [
      // Receitas
      {
        description: 'Salário Mensal Empresa Tech',
        amount: 6800.0,
        type: 'income',
        account_id: checkingId,
        category_id: categoryMap['Salário Principal'],
        date: `${currentYearMonth}-05`,
        competence_month: currentYearMonth,
        cash_month: currentYearMonth,
        is_reconciled: true,
      },
      {
        description: 'Consultoria UI/UX Freela',
        amount: 1400.0,
        type: 'income',
        account_id: checkingId,
        category_id: categoryMap['Freela & Extras'],
        date: `${currentYearMonth}-12`,
        competence_month: currentYearMonth,
        cash_month: currentYearMonth,
        is_reconciled: true,
      },
      // Despesas Débito/Conta (Competência = Caixa)
      {
        description: 'Aluguel do Apartamento',
        amount: 2100.0,
        type: 'expense',
        account_id: checkingId,
        category_id: categoryMap['Aluguel & Condomínio'],
        date: `${currentYearMonth}-10`,
        competence_month: currentYearMonth,
        cash_month: currentYearMonth,
        is_reconciled: true,
      },
      {
        description: 'Condomínio e Fundo de Reserva',
        amount: 480.0,
        type: 'expense',
        account_id: checkingId,
        category_id: categoryMap['Aluguel & Condomínio'],
        date: `${currentYearMonth}-10`,
        competence_month: currentYearMonth,
        cash_month: currentYearMonth,
        is_reconciled: true,
      },
      {
        description: 'Conta de Energia Enel',
        amount: 195.4,
        type: 'expense',
        account_id: checkingId,
        category_id: categoryMap['Energia, Água & Gás'],
        date: `${currentYearMonth}-15`,
        competence_month: currentYearMonth,
        cash_month: currentYearMonth,
        is_reconciled: true,
      },
      // Despesas Cartão de Crédito (Competência = Mês Atual, Caixa = Próximo Mês de Vencimento!)
      {
        description: 'Supermercado Pão de Açúcar',
        amount: 620.5,
        type: 'expense',
        account_id: creditCardId,
        category_id: categoryMap['Supermercado Mensal'],
        date: `${currentYearMonth}-14`,
        competence_month: currentYearMonth,
        cash_month: nextYearMonth,
        is_reconciled: true,
        notes: 'Compra mensal de mantimentos e limpeza',
      },
      {
        description: 'Jantar Restaurante La Pasta',
        amount: 215.0,
        type: 'expense',
        account_id: creditCardId,
        category_id: categoryMap['Restaurantes e Delivery'],
        date: `${currentYearMonth}-18`,
        competence_month: currentYearMonth,
        cash_month: nextYearMonth,
        is_reconciled: true,
      },
      {
        description: 'Assinatura Netflix + Spotify',
        amount: 89.8,
        type: 'expense',
        account_id: creditCardId,
        category_id: categoryMap['Streaming & Assinaturas'],
        date: `${currentYearMonth}-02`,
        competence_month: currentYearMonth,
        cash_month: nextYearMonth,
        is_reconciled: true,
      },
      {
        description: 'Posto Ipiranga Combustível',
        amount: 220.0,
        type: 'expense',
        account_id: creditCardId,
        category_id: categoryMap['Combustível e Uber'],
        date: `${currentYearMonth}-20`,
        competence_month: currentYearMonth,
        cash_month: nextYearMonth,
        is_reconciled: false,
      },
    ]

    for (const tx of sampleTransactions) {
      try {
        app.findFirstRecordByData('transactions', 'description', tx.description)
      } catch (_) {
        const rec = new Record(transactions)
        rec.set('user_id', userId)
        rec.set('family_id', family.id)
        rec.set('account_id', tx.account_id)
        if (tx.category_id) rec.set('category_id', tx.category_id)
        rec.set('description', tx.description)
        rec.set('amount', tx.amount)
        rec.set('type', tx.type)
        rec.set('date', tx.date)
        rec.set('competence_month', tx.competence_month)
        rec.set('cash_month', tx.cash_month)
        rec.set('is_reconciled', tx.is_reconciled || false)
        if (tx.notes) rec.set('notes', tx.notes)
        app.save(rec)
      }
    }

    // 6. Orçamentos Mensais com semáforo
    const budgets = app.findCollectionByNameOrId('budgets')
    const sampleBudgets = [
      {
        category_group: 'Habitação',
        limit_amount: 2800.0,
        warning_threshold: 75,
        danger_threshold: 90,
      },
      {
        category_group: 'Alimentação',
        limit_amount: 1400.0,
        warning_threshold: 75,
        danger_threshold: 90,
      },
      {
        category_group: 'Lazer & Alimentação',
        limit_amount: 600.0,
        warning_threshold: 75,
        danger_threshold: 90,
      },
      {
        category_group: 'Transporte',
        limit_amount: 500.0,
        warning_threshold: 75,
        danger_threshold: 90,
      },
      {
        category_group: 'Comunicação',
        limit_amount: 250.0,
        warning_threshold: 75,
        danger_threshold: 90,
      },
    ]

    for (const b of sampleBudgets) {
      try {
        app.findFirstRecordByFilter(
          'budgets',
          `category_group = '${b.category_group}' && month = '${currentYearMonth}'`,
        )
      } catch (_) {
        const rec = new Record(budgets)
        rec.set('user_id', userId)
        rec.set('month', currentYearMonth)
        rec.set('category_group', b.category_group)
        rec.set('limit_amount', b.limit_amount)
        rec.set('warning_threshold', b.warning_threshold)
        rec.set('danger_threshold', b.danger_threshold)
        app.save(rec)
      }
    }

    // 7. Dívidas (para bola de neve vs avalanche e negociação)
    const debts = app.findCollectionByNameOrId('debts')
    const sampleDebts = [
      {
        creditor: 'Cartão Santander SX (Rotativo)',
        total_debt: 4200.0,
        current_balance: 3850.0,
        interest_rate_monthly: 12.8,
        minimum_payment: 480.0,
        due_day: 15,
        status: 'active',
        notes: 'Fatura parcelada com juros muito altos. Prioridade máxima na avalanche.',
      },
      {
        creditor: 'Empréstimo Pessoal Bradesco',
        total_debt: 8500.0,
        current_balance: 6200.0,
        interest_rate_monthly: 4.2,
        minimum_payment: 320.0,
        due_day: 10,
        status: 'active',
        notes: 'Empréstimo consignado parcelado em 24x.',
      },
      {
        creditor: 'Cheque Especial Caixa',
        total_debt: 1200.0,
        current_balance: 1150.0,
        interest_rate_monthly: 8.0,
        minimum_payment: 250.0,
        due_day: 28,
        status: 'active',
        notes: 'Dívida de menor valor: excelente para quitar rápido na Bola de Neve.',
      },
    ]

    for (const d of sampleDebts) {
      try {
        app.findFirstRecordByData('debts', 'creditor', d.creditor)
      } catch (_) {
        const rec = new Record(debts)
        rec.set('user_id', userId)
        rec.set('creditor', d.creditor)
        rec.set('total_debt', d.total_debt)
        rec.set('current_balance', d.current_balance)
        rec.set('interest_rate_monthly', d.interest_rate_monthly)
        rec.set('minimum_payment', d.minimum_payment)
        rec.set('due_day', d.due_day)
        rec.set('status', d.status)
        rec.set('notes', d.notes)
        app.save(rec)
      }
    }

    // 8. Sonhos e Metas de Longo Prazo
    const dreams = app.findCollectionByNameOrId('dreams')
    const sampleDreams = [
      {
        title: 'Reserva de Emergência (6 Meses)',
        target_amount: 25000.0,
        current_amount: 12400.0,
        target_date: '2025-12-31',
        monthly_contribution: 600.0,
        icon: 'Shield',
        category: 'Segurança',
        status: 'in_progress',
      },
      {
        title: 'Viagem de Férias em Família',
        target_amount: 8000.0,
        current_amount: 3200.0,
        target_date: '2026-03-20',
        monthly_contribution: 400.0,
        icon: 'Plane',
        category: 'Lazer',
        status: 'in_progress',
      },
      {
        title: 'Troca do Carro Familiar',
        target_amount: 35000.0,
        current_amount: 7500.0,
        target_date: '2026-11-30',
        monthly_contribution: 800.0,
        icon: 'Car',
        category: 'Patrimônio',
        status: 'in_progress',
      },
    ]

    for (const dr of sampleDreams) {
      try {
        app.findFirstRecordByData('dreams', 'title', dr.title)
      } catch (_) {
        const rec = new Record(dreams)
        rec.set('user_id', userId)
        rec.set('title', dr.title)
        rec.set('target_amount', dr.target_amount)
        rec.set('current_amount', dr.current_amount)
        rec.set('target_date', dr.target_date)
        rec.set('monthly_contribution', dr.monthly_contribution)
        rec.set('icon', dr.icon)
        rec.set('category', dr.category)
        rec.set('status', dr.status)
        app.save(rec)
      }
    }

    // 9. Regras de De-Para (Conciliação inteligente)
    const deparaRules = app.findCollectionByNameOrId('depara_rules')
    const sampleRules = [
      { pattern: 'IFOOD', category_name: 'Restaurantes e Delivery' },
      { pattern: 'UBER', category_name: 'Combustível e Uber' },
      { pattern: 'POSTO', category_name: 'Combustível e Uber' },
      { pattern: 'PAO DE ACUCAR', category_name: 'Supermercado Mensal' },
      { pattern: 'CARREFOUR', category_name: 'Supermercado Mensal' },
      { pattern: 'NETFLIX', category_name: 'Streaming & Assinaturas' },
      { pattern: 'SPOTIFY', category_name: 'Streaming & Assinaturas' },
      { pattern: 'ENEL', category_name: 'Energia, Água & Gás' },
      { pattern: 'SABESP', category_name: 'Energia, Água & Gás' },
    ]

    for (const r of sampleRules) {
      const catId = categoryMap[r.category_name]
      if (catId) {
        try {
          app.findFirstRecordByData('depara_rules', 'pattern', r.pattern)
        } catch (_) {
          const rec = new Record(deparaRules)
          rec.set('user_id', userId)
          rec.set('pattern', r.pattern)
          rec.set('category_id', catId)
          rec.set('confidence', 95)
          app.save(rec)
        }
      }
    }
  },
  (app) => {
    // rollback opcional
  },
)
