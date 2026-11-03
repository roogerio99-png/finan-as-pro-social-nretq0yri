// Adiciona campos de parcelamento às transações (despesas em cartão de crédito).
// installments_total: em quantas parcelas a compra foi feita (vazio/0 = à vista).
// installments_paid: quantas parcelas já foram pagas (informativo).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')

    if (!col.fields.getByName('installments_total')) {
      col.fields.add(
        new NumberField({ name: 'installments_total', onlyInt: true, min: 0, max: 48 }),
      )
    }
    if (!col.fields.getByName('installments_paid')) {
      col.fields.add(new NumberField({ name: 'installments_paid', onlyInt: true, min: 0, max: 48 }))
    }

    // Acelera a busca por janela de meses no regime de caixa.
    col.addIndex('idx_transactions_cash_month', false, 'cash_month', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')
    col.removeIndex('idx_transactions_cash_month')
    app.save(col)
  },
)
