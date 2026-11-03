migrate(
  (app) => {
    const budgets = app.findCollectionByNameOrId('budgets')

    if (!budgets.fields.getByName('target_type')) {
      budgets.fields.add(
        new SelectField({
          name: 'target_type',
          values: ['group', 'subgroup'],
          maxSelect: 1,
        }),
      )
      app.save(budgets)
    }

    // Preenche registros legados com target_type = 'subgroup' se estiver nulo ou vazio
    try {
      app
        .db()
        .newQuery(
          "UPDATE budgets SET target_type = 'subgroup' WHERE target_type IS NULL OR target_type = ''",
        )
        .execute()
    } catch (err) {
      console.log('Aviso ao atualizar target_type em budgets:', err)
    }
  },
  (app) => {
    const budgets = app.findCollectionByNameOrId('budgets')
    const field = budgets.fields.getByName('target_type')
    if (field) {
      budgets.fields.removeByName('target_type')
      app.save(budgets)
    }
  },
)
