// 0016 — Investimentos (renda variável)
// - investment_operations: operações de compra e venda (ticker, data, quantidade, preço, taxas,
//   classe do ativo e marcação de day trade).
// - investment_quotes: cotação atual informada manualmente por ticker (opcional).
// Isolamento por família, com as mesmas regras das coleções financeiras (migração 0010).

migrate(
  (app) => {
    const families = app.findCollectionByNameOrId('families')

    const isolationRule =
      "@request.auth.id != '' && (family_id.members ?= @request.auth.id || family_id.created_by = @request.auth.id || (@request.auth.family_id != '' && family_id = @request.auth.family_id) || (family_id = '' && user_id = @request.auth.id))"

    const createRule =
      "@request.auth.id != '' && (user_id = '' || user_id = @request.auth.id || (@collection.families.members ?= @request.auth.id && @collection.families.members ?= user_id) || family_id.members ?= @request.auth.id || (@request.auth.family_id != '' && family_id = @request.auth.family_id))"

    const operations = new Collection({
      name: 'investment_operations',
      type: 'base',
      listRule: isolationRule,
      viewRule: isolationRule,
      createRule: createRule,
      updateRule: isolationRule,
      deleteRule: isolationRule,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'family_id',
          type: 'relation',
          collectionId: families.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'ticker', type: 'text', required: true, max: 12 },
        { name: 'op_type', type: 'select', required: true, values: ['buy', 'sell'], maxSelect: 1 },
        { name: 'quantity', type: 'number', required: false, min: 0 },
        { name: 'unit_price', type: 'number', required: false, min: 0 },
        { name: 'op_date', type: 'date', required: true },
        { name: 'fees', type: 'number', min: 0 },
        {
          name: 'asset_class',
          type: 'select',
          required: true,
          values: ['stock', 'fii', 'etf', 'crypto', 'other'],
          maxSelect: 1,
        },
        { name: 'day_trade', type: 'bool' },
        { name: 'notes', type: 'text', max: 500 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(operations)

    const quotes = new Collection({
      name: 'investment_quotes',
      type: 'base',
      listRule: isolationRule,
      viewRule: isolationRule,
      createRule: createRule,
      updateRule: isolationRule,
      deleteRule: isolationRule,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'family_id',
          type: 'relation',
          collectionId: families.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'ticker', type: 'text', required: true, max: 12 },
        { name: 'price', type: 'number', required: false, min: 0 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(quotes)
  },
  (app) => {
    for (const name of ['investment_quotes', 'investment_operations']) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {}
    }
  },
)
