// Plano de contas profissional estilo ERP: adiciona à coleção categories
// - group_code: código do GRUPO (nível 1), ex. "1.0", "10.0"
// - code: código do SUBGRUPO (nível 2), ex. "1.3"
// - description: descrição do gasto do grupo/subgrupo
// Campos são todos opcionais e o down remove exatamente o que o up adicionou.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('categories')
    if (!col.fields.getByName('group_code')) {
      col.fields.add(new TextField({ name: 'group_code', max: 10 }))
    }
    if (!col.fields.getByName('code')) {
      col.fields.add(new TextField({ name: 'code', max: 10 }))
    }
    if (!col.fields.getByName('description')) {
      col.fields.add(new TextField({ name: 'description', max: 500 }))
    }
    if (!col.fields.getByName('is_seed')) {
      col.fields.add(new BoolField({ name: 'is_seed' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('categories')
    ;['group_code', 'code', 'description', 'is_seed'].forEach((f) => {
      const field = col.fields.getByName(f)
      if (field) col.fields.removeByName(f)
    })
    app.save(col)
  },
)
