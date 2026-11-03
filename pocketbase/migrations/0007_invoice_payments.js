// 0007 — Pagamento de parcelas de fatura (fluxo de caixa).
// Registra QUAIS parcelas de compras parceladas já foram pagas, com a data do
// pagamento e a conta/banco pagador — sem alterar a transação original da compra.
// A coleção `payments` guarda um registro por parcela quitada (ou pela marcação
// em grupo da fatura do mês, que cria um registro por parcela).
migrate(
  (app) => {
    try {
      app.findCollectionByNameOrId('payments')
      return // já existe — migração idempotente
    } catch (_) {}

    const transactionsId = app.findCollectionByNameOrId('transactions').id
    const accountsId = app.findCollectionByNameOrId('accounts').id
    const familiesId = app.findCollectionByNameOrId('families').id

    const collection = new Collection({
      name: 'payments',
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
          maxSelect: 1,
        },
        { name: 'family_id', type: 'relation', collectionId: familiesId, maxSelect: 1 },
        // Compra parcelada à qual a parcela quitada pertence.
        {
          name: 'source_transaction_id',
          type: 'relation',
          required: true,
          collectionId: transactionsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        // Conta/banco por onde o dinheiro saiu (nunca cartão de crédito).
        { name: 'payment_account_id', type: 'relation', collectionId: accountsId, maxSelect: 1 },
        // Cartão cuja fatura foi paga (para agrupar a marcação por fatura).
        { name: 'card_account_id', type: 'relation', collectionId: accountsId, maxSelect: 1 },
        // Parcela quitada (1-based). Nulo/0 = pagamento avulso sem parcela.
        { name: 'installment_index', type: 'number', onlyInt: true, min: 1, max: 48 },
        { name: 'amount', type: 'number', required: false, min: 0 },
        // Mês de desembolso (fatura) que o pagamento quita — YYYY-MM.
        { name: 'cash_month', type: 'text', required: true },
        // Data informada pelo usuário para o pagamento — YYYY-MM-DD.
        { name: 'paid_date', type: 'text', required: true, pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_payments_source ON payments (source_transaction_id)',
        'CREATE INDEX idx_payments_cash_month ON payments (cash_month)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('payments')
      app.delete(collection)
    } catch (_) {}
  },
)
