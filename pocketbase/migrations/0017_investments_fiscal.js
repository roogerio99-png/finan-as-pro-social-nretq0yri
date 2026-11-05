migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('investment_operations')

    // 'provento' passa a ser um tipo de operação (dividendo, JCP, bonificação).
    const opType = col.fields.getByName('op_type')
    if (opType && opType.values.indexOf('provento') === -1) {
      opType.values.push('provento')
    }

    if (!col.fields.getByName('provent_type')) {
      col.fields.add(
        new SelectField({
          name: 'provent_type',
          values: ['dividendo', 'jcp', 'bonificacao'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('cnpj')) {
      col.fields.add(new TextField({ name: 'cnpj', max: 20 }))
    }

    if (!col.fields.getByName('irrf')) {
      col.fields.add(new NumberField({ name: 'irrf' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('investment_operations')

    const opType = col.fields.getByName('op_type')
    if (opType) {
      opType.values = opType.values.filter((v) => v !== 'provento')
    }
    for (const name of ['provent_type', 'cnpj', 'irrf']) {
      const field = col.fields.getByName(name)
      if (field) col.fields.removeByName(name)
    }

    app.save(col)
  },
)
