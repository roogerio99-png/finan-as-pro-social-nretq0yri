// 0008 — Fatura formal (invoices) + tipos de movimento bancário.
//
// 1) Nova coleção `invoices`: a fatura do cartão como REGISTRO — cartão,
//    mês de referência (fechamento/vencimento), valor total, lista das
//    compras/parcelas que a compõem (json `items` + relação `transactions`)
//    e status aberta/paga com data e conta pagadora.
// 2) `transactions.type` ganha as quatro situações próprias do movimento
//    bancário: despesa, receita, transferência entre contas e pagamento de
//    fatura (`invoice_payment`). Novos campos: `transfer_account_id`
//    (conta de destino da transferência) e `invoice_id` (fatura quitada).
// 3) `payments` ganha `invoice_id` para amarrar as parcelas quitadas à
//    fatura formal.
migrate(
  (app) => {
    // --- 1) coleção invoices (idempotente) ---------------------------------
    let invoicesId = ''
    try {
      invoicesId = app.findCollectionByNameOrId('invoices').id
    } catch (_) {
      const accountsId = app.findCollectionByNameOrId('accounts').id
      const familiesId = app.findCollectionByNameOrId('families').id
      const transactionsId = app.findCollectionByNameOrId('transactions').id

      const invoices = new Collection({
        name: 'invoices',
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
          { name: 'family_id', type: 'relation', collectionId: familiesId, maxSelect: 1 },
          // Cartão ao qual a fatura pertence.
          {
            name: 'card_account_id',
            type: 'relation',
            required: true,
            collectionId: accountsId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          // Mês de fechamento/vencimento da fatura — YYYY-MM.
          { name: 'reference_month', type: 'text', required: true },
          { name: 'total_amount', type: 'number', required: false, min: 0 },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['open', 'paid'],
            maxSelect: 1,
          },
          // Preenchidos quando a fatura é paga (data + banco pagador).
          { name: 'paid_date', type: 'text' },
          { name: 'payment_account_id', type: 'relation', collectionId: accountsId, maxSelect: 1 },
          // Compras/parcelas que compõem a fatura.
          {
            name: 'transactions',
            type: 'relation',
            collectionId: transactionsId,
            cascadeDelete: false,
            maxSelect: 200,
          },
          // Detalhe: [{transaction_id, index, value, description}]
          { name: 'items', type: 'json' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_invoices_card_month ON invoices (card_account_id, reference_month)',
        ],
      })
      app.save(invoices)
      invoicesId = invoices.id
    }

    // --- 2) transactions: tipos de movimento + novos campos -----------------
    const transactions = app.findCollectionByNameOrId('transactions')
    const typeField = transactions.fields.getByName('type')
    typeField.values = ['income', 'expense', 'transfer', 'invoice_payment']

    if (!transactions.fields.getByName('transfer_account_id')) {
      transactions.fields.add(
        new RelationField({
          name: 'transfer_account_id',
          collectionId: app.findCollectionByNameOrId('accounts').id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    if (!transactions.fields.getByName('invoice_id')) {
      transactions.fields.add(
        new RelationField({
          name: 'invoice_id',
          collectionId: invoicesId,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    app.save(transactions)

    // --- 3) payments: vínculo com a fatura formal ---------------------------
    const payments = app.findCollectionByNameOrId('payments')
    if (!payments.fields.getByName('invoice_id')) {
      payments.fields.add(
        new RelationField({
          name: 'invoice_id',
          collectionId: invoicesId,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      app.save(payments)
    }
  },
  (app) => {
    try {
      const transactions = app.findCollectionByNameOrId('transactions')
      try {
        transactions.fields.remove('transfer_account_id')
      } catch (_) {}
      try {
        transactions.fields.remove('invoice_id')
      } catch (_) {}
      const typeField = transactions.fields.getByName('type')
      typeField.values = ['income', 'expense', 'transfer']
      app.save(transactions)
    } catch (_) {}
    try {
      const payments = app.findCollectionByNameOrId('payments')
      payments.fields.remove('invoice_id')
      app.save(payments)
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('invoices'))
    } catch (_) {}
  },
)
