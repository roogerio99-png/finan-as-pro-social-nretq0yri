// 0004 — Cadastros: semente de papel na família (idempotente)
// Marca o usuário semente como "admin" (Responsável) para o módulo de cadastros.
migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'roogerio99@gmail.com')
      if (user.getString('family_role') === '') {
        user.set('family_role', 'admin')
        app.save(user)
      }
    } catch (_) {
      // usuário semente não existe neste copy do projeto — nada a fazer
    }

    // Preenche saldo atual = saldo inicial nas contas ainda sem valor.
    app
      .db()
      .newQuery(
        'UPDATE accounts SET current_balance = initial_balance WHERE current_balance IS NULL OR current_balance = 0',
      )
      .execute()
  },
  (app) => {},
)
