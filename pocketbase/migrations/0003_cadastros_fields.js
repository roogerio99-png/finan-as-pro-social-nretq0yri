// 0003 — Cadastros: saldo atual em contas + papel na família em usuários
// Campos novos para o módulo de cadastros mestre.
migrate(
  (app) => {
    // 1. accounts.current_balance (saldo atual, mantém o histórico via initial_balance)
    const accounts = app.findCollectionByNameOrId('accounts')
    if (!accounts.fields.getByName('current_balance')) {
      accounts.fields.add(new NumberField({ name: 'current_balance' }))
    }
    app.save(accounts)

    // 2. users.family_role (papel do usuário no lar: admin = responsável, member = membro)
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('family_role')) {
      users.fields.add(
        new SelectField({
          name: 'family_role',
          values: ['admin', 'member'],
          maxSelect: 1,
        }),
      )
    }
    app.save(users)
  },
  (app) => {
    const accounts = app.findCollectionByNameOrId('accounts')
    if (accounts.fields.getByName('current_balance')) {
      accounts.fields.removeByName('current_balance')
    }
    app.save(accounts)

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users.fields.getByName('family_role')) {
      users.fields.removeByName('family_role')
    }
    app.save(users)
  },
)
