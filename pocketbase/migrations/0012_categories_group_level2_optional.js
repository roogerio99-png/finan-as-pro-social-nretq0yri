// 0012 — Correção do bug "não ta deixando criar novas categorias"
// Desde a migração 0001 o campo group_level2 é obrigatório na coleção
// categories. A tela de Cadastros → Categorias cria um NOVO GRUPO enviando
// group_level2 vazio (um grupo recém-criado ainda não tem subgrupo), e o
// PocketBase recusa o POST com erro de validação "Cannot be blank" (400) —
// ou seja, criar grupo novo nunca funcionou no banco.
// Tornando o campo opcional, o grupo novo é criado e continua aparecendo
// como categoria direta nos lançamentos (buildTree já trata group_level2
// vazio como nó do próprio grupo). Nenhuma regra de API é alterada:
// o isolamento por família da migração 0010 permanece intacto.
migrate(
  (app) => {
    const categories = app.findCollectionByNameOrId('categories')
    const field = categories.fields.getByName('group_level2')
    if (field && field.required) {
      field.required = false
      app.save(categories)
    }
  },
  (app) => {
    // Reversão: volta a exigir group_level2 (estado anterior).
    const categories = app.findCollectionByNameOrId('categories')
    const field = categories.fields.getByName('group_level2')
    if (field && !field.required) {
      field.required = true
      app.save(categories)
    }
  },
)
