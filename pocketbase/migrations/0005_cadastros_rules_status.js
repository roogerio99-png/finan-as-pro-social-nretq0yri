// 0005 — Cadastros: visibilidade de membros do lar + inativação de categorias
// 1) users: o criador do núcleo familiar passa a listar/gerenciar os membros
//    da própria família (necessário para a aba Usuários do módulo Cadastros).
// 2) categories: campo `status` (active | inactive) para permitir inativar
//    grupos, subgrupos e categorias sem apagar o histórico.
migrate(
  (app) => {
    // --- 1. Regras de acesso da coleção users -----------------------------
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // O próprio usuário sempre se vê; membros da família criada por mim também.
    const memberVisible =
      'id = @request.auth.id || (@request.auth.id != "" && @collection.families.created_by ?= @request.auth.id && @collection.families.members ?= id)'

    users.listRule = memberVisible
    users.viewRule = memberVisible

    // Auto-atualização: pode editar o próprio nome, mas nunca escalonar o
    // próprio papel (o criador do núcleo pode, pela regra de gerente abaixo).
    users.updateRule =
      '(id = @request.auth.id && @request.body.family_role:changed = false) || (@request.auth.id != "" && @collection.families.created_by ?= @request.auth.id && @collection.families.members ?= id)'

    // Gerente do núcleo pode administrar dados sensíveis dos membros
    // (e-mail etc.) sem precisar da senha antiga deles.
    users.manageRule =
      '@request.auth.id != "" && @collection.families.created_by ?= @request.auth.id && @collection.families.members ?= id'

    app.save(users)

    // --- 2. categories.status (inativação) --------------------------------
    const categories = app.findCollectionByNameOrId('categories')
    if (!categories.fields.getByName('status')) {
      categories.fields.add(
        new SelectField({
          name: 'status',
          values: ['active', 'inactive'],
          maxSelect: 1,
        }),
      )
    }
    app.save(categories)

    // Backfill idempotente: tudo que não tem status passa a ser ativo.
    app
      .db()
      .newQuery("UPDATE categories SET status = 'active' WHERE status IS NULL OR status = ''")
      .execute()
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.updateRule = 'id = @request.auth.id'
    users.manageRule = null
    app.save(users)

    const categories = app.findCollectionByNameOrId('categories')
    if (categories.fields.getByName('status')) {
      categories.fields.removeByName('status')
    }
    app.save(categories)
  },
)
