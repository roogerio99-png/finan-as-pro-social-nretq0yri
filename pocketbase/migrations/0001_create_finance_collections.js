migrate(
  (app) => {
    // 1. families (para modo família e compartilhamento)
    const families = new Collection({
      name: 'families',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'created_by',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'members',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 10,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(families)

    // 2. accounts (contas bancárias e cartões de crédito)
    const accounts = new Collection({
      name: 'accounts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'family_id',
          type: 'relation',
          collectionId: families.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['checking', 'savings', 'credit_card', 'investment', 'cash'],
          maxSelect: 1,
        },
        { name: 'initial_balance', type: 'number' },
        { name: 'credit_limit', type: 'number' },
        { name: 'closing_day', type: 'number' },
        { name: 'due_day', type: 'number' },
        { name: 'color', type: 'text' },
        { name: 'status', type: 'select', values: ['active', 'archived'], maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(accounts)

    // 3. categories (plano de contas em três níveis)
    const categories = new Collection({
      name: 'categories',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['income', 'expense'],
          maxSelect: 1,
        },
        { name: 'group_level1', type: 'text', required: true }, // Ex: Custos Fixos, Estilo de Vida, Investimentos e Sonhos, Dívidas, Receitas
        { name: 'group_level2', type: 'text', required: true }, // Ex: Habitação, Transporte, Alimentação, Lazer...
        { name: 'subgroup_level3', type: 'text' }, // Ex: Aluguel, Supermercado, Combustível...
        { name: 'icon', type: 'text' },
        { name: 'color', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(categories)

    // 4. transactions (lançamentos de receitas e despesas com regime de competência e caixa)
    const transactions = new Collection({
      name: 'transactions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'family_id',
          type: 'relation',
          collectionId: families.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'account_id',
          type: 'relation',
          required: true,
          collectionId: accounts.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'category_id',
          type: 'relation',
          collectionId: categories.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'amount', type: 'number', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['income', 'expense', 'transfer'],
          maxSelect: 1,
        },
        { name: 'date', type: 'text', required: true }, // YYYY-MM-DD
        { name: 'competence_month', type: 'text', required: true }, // YYYY-MM
        { name: 'cash_month', type: 'text', required: true }, // YYYY-MM (mês de efetivo desembolso/pagamento fatura)
        { name: 'is_reconciled', type: 'bool' },
        { name: 'import_batch_id', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(transactions)

    // 5. budgets (metas orçamentárias por subgrupo e mês com semáfora)
    const budgets = new Collection({
      name: 'budgets',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'month', type: 'text', required: true }, // YYYY-MM
        { name: 'category_group', type: 'text', required: true }, // ou group_level2 / subgroup
        { name: 'limit_amount', type: 'number', required: true },
        { name: 'warning_threshold', type: 'number' }, // padrão 75 (%)
        { name: 'danger_threshold', type: 'number' }, // padrão 90 (%)
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(budgets)

    // 6. debts (dívidas para simulação bola de neve vs avalanche e negociação)
    const debts = new Collection({
      name: 'debts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'creditor', type: 'text', required: true },
        { name: 'total_debt', type: 'number', required: true },
        { name: 'current_balance', type: 'number', required: true },
        { name: 'interest_rate_monthly', type: 'number', required: true }, // % ao mês
        { name: 'minimum_payment', type: 'number', required: true },
        { name: 'due_day', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['active', 'renegotiating', 'paid'],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(debts)

    // 7. dreams (metas e sonhos de longo prazo com tradutor comportamental)
    const dreams = new Collection({
      name: 'dreams',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'target_amount', type: 'number', required: true },
        { name: 'current_amount', type: 'number', required: true },
        { name: 'target_date', type: 'text', required: true }, // YYYY-MM-DD
        { name: 'monthly_contribution', type: 'number' },
        { name: 'icon', type: 'text' },
        { name: 'category', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['in_progress', 'achieved', 'paused'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(dreams)

    // 8. depara_rules (regras de classificação automática para extratos importados)
    const deparaRules = new Collection({
      name: 'depara_rules',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'pattern', type: 'text', required: true }, // termo no histórico do extrato
        {
          name: 'category_id',
          type: 'relation',
          required: true,
          collectionId: categories.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'confidence', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(deparaRules)
  },
  (app) => {
    const colNames = [
      'depara_rules',
      'dreams',
      'debts',
      'budgets',
      'transactions',
      'categories',
      'accounts',
      'families',
    ]
    for (const name of colNames) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
