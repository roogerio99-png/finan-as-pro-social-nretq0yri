// Melhora o aprendizado do De-Para (categorização automática):
// - usage_count: quantas vezes a regra já confirmou uma sugestão (regras mais
//   usadas ganham prioridade quando duas apontam para categorias diferentes).
// - last_used: data da última aplicação da regra.
// - Índice único em (user_id, pattern) + deduplicação prévia de regras antigas,
//   garantindo que o incremento de uso seja consistente.
// - Backfill: o pattern de regras antigas já é normalizado (trim/uppercase) —
//   nada a corrigir nos dados, apenas deduplicamos pares iguais.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('depara_rules')

    if (!col.fields.getByName('usage_count')) {
      col.fields.add(new NumberField({ name: 'usage_count', onlyInt: true, min: 0, max: 1000000 }))
    }
    if (!col.fields.getByName('last_used')) {
      col.fields.add(new DateField({ name: 'last_used' }))
    }

    // Deduplica pares (user_id, pattern) idênticos — mantém o mais antigo.
    app
      .db()
      .newQuery(
        `DELETE FROM depara_rules WHERE id NOT IN (
          SELECT MIN(id) FROM depara_rules GROUP BY user_id, pattern
        )`,
      )
      .execute()

    col.addIndex('idx_depara_user_pattern', true, 'user_id', 'pattern')
    col.addIndex('idx_depara_usage', false, 'usage_count', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('depara_rules')
    col.removeIndex('idx_depara_user_pattern')
    col.removeIndex('idx_depara_usage')
    app.save(col)
  },
)
