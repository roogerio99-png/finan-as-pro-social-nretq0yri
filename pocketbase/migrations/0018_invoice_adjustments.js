// 0018 — Auditoria da fatura: ajustes de título (exclusão e valor).
//
// A fatura emitida pelo banco pode divergir da regra do aplicativo: um
// lançamento pode ter caído fora do fechamento, o valor pode divergir, pode
// haver tarifa extra etc. Esta coleção guarda o AJUSTE de cada título
// (compra/parcela) da fatura, sem alterar a transação original:
//
//   • action 'exclude'   — o título sai da fatura de `invoice_month` e passa a
//                          vencer na fatura do mês seguinte (defer_month).
//   • action 'set_value' — redefine o valor que o título assume na fatura de
//                          `invoice_month` (e nas subsequentes, pois o valor
//                          base da compra é redefinido).
//
// `amount` guarda o valor final do título (em set_value, o novo valor por
// parcela; em exclude, o valor original do título — informativo).
// Regra: uma compra só pode ter um ajuste aberto por parcela — índice único
// (transaction_id, installment_index, resolved). Um novo ajuste sobre o mesmo
// título substitui o anterior (o hook marca o antigo como resolved=true).
migrate(
  (app) => {
    // Se a coleção já existe (replay em cópia do projeto), sai sem duplicar.
    try {
      app.findCollectionByNameOrId('invoice_adjustments')
      return
    } catch (_) {}

    const usersId = '_pb_users_auth_'
    const familiesId = app.findCollectionByNameOrId('families').id
    const transactionsId = app.findCollectionByNameOrId('transactions').id
    const invoicesId = app.findCollectionByNameOrId('invoices').id

    const col = new Collection({
      name: 'invoice_adjustments',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (family_id.members ?= @request.auth.id || family_id.created_by = @request.auth.id || (@request.auth.family_id != '' && family_id = @request.auth.family_id) || (family_id = '' && user_id = @request.auth.id))",
      viewRule:
        "@request.auth.id != '' && (family_id.members ?= @request.auth.id || family_id.created_by = @request.auth.id || (@request.auth.family_id != '' && family_id = @request.auth.family_id) || (family_id = '' && user_id = @request.auth.id))",
      createRule:
        "@request.auth.id != '' && (user_id = '' || user_id = @request.auth.id || (@collection.families.members ?= @request.auth.id && @collection.families.members ?= user_id) || family_id.members ?= @request.auth.id || (@request.auth.family_id != '' && family_id = @request.auth.family_id))",
      updateRule:
        "@request.auth.id != '' && (family_id.members ?= @request.auth.id || family_id.created_by = @request.auth.id || (@request.auth.family_id != '' && family_id = @request.auth.family_id) || (family_id = '' && user_id = @request.auth.id))",
      deleteRule:
        "@request.auth.id != '' && (family_id.members ?= @request.auth.id || family_id.created_by = @request.auth.id || (@request.auth.family_id != '' && family_id = @request.auth.family_id) || (family_id = '' && user_id = @request.auth.id))",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'family_id', type: 'relation', collectionId: familiesId, maxSelect: 1 },
        // Compra (transação) ajustada.
        {
          name: 'transaction_id',
          type: 'relation',
          required: true,
          collectionId: transactionsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        // Parcela ajustada (0 = à vista).
        { name: 'installment_index', type: 'number', onlyInt: true },
        // 'exclude' — adia a parcela para a fatura seguinte (defer_month);
        // 'set_value' — redefine o valor da parcela nesta e nas próximas faturas.
        {
          name: 'action',
          type: 'select',
          required: true,
          values: ['exclude', 'set_value'],
          maxSelect: 1,
        },
        // Valor efetivo do título após o ajuste (novo valor em set_value;
        // valor original em exclude — informativo).
        { name: 'amount', type: 'number' },
        // Fatura em que o ajuste foi aplicado (a que o usuário auditava).
        { name: 'invoice_month', type: 'text', required: true },
        // Fatura para onde o título foi adiado (action = exclude).
        { name: 'defer_month', type: 'text' },
        // Fatura formal (registro invoices) onde o ajuste foi feito.
        {
          name: 'invoice_id',
          type: 'relation',
          collectionId: invoicesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        // Ajuste suplantado por um ajuste mais novo do mesmo título.
        { name: 'resolved', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_invoice_adj_tx ON invoice_adjustments (transaction_id, installment_index, resolved)',
        'CREATE INDEX idx_invoice_adj_family ON invoice_adjustments (family_id)',
      ],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('invoice_adjustments'))
    } catch (_) {}
  },
)
