// 0015 — Correções da auditoria (idempotente; no-op em base vazia).
//
// a) Cron de demonstração `seed_nov2026_invoice`: nenhum job está registrado
//    no backend e o hook responsável foi neutralizado — aqui apenas registramos
//    que não há nada a remover.
// b) Fatura de novembro (cartão Ultravioleta, Aberta, R$ 89,80) com item órfão:
//    remove os itens cuja transação não existe mais, recalcula o total a partir
//    dos itens restantes e, se não sobrar item, deixa a fatura vazia (total 0)
//    com observação — nada é apagado.
// c) Categorias antigas fora do plano canônico 0.0–10.0 (0014): INATIVADAS
//    (status = 'inactive') — inclusive as sem family_id. Nada é excluído.
// d) Metas orçamentárias que apontam para subgrupos inexistentes: remapeadas
//    para o subgrupo equivalente do plano novo, preservando tetos/limites.
// e) users.createRule fechado (não-público): cadastro anônimo desativado;
//    criação de membro continua sendo feita logado (gerente via /cadastros).
//    Login, OAuth e requestPasswordReset não passam por createRule — intactos.
// f) Usuários fantasma (sem family_id e não verificados): marcados como
//    'blocked' no novo campo status — sem apagar. O dono real da família
//    (verificado, com família) não é tocado.

const CANONICAL_CODES = [
  '0.0',
  '0.1',
  '0.2',
  '1.0',
  '1.1',
  '1.2',
  '1.3',
  '1.4',
  '1.5',
  '1.6',
  '2.0',
  '2.1',
  '2.2',
  '2.3',
  '3.0',
  '3.1',
  '3.2',
  '3.3',
  '3.4',
  '4.0',
  '4.1',
  '4.2',
  '4.3',
  '4.4',
  '5.0',
  '5.1',
  '5.2',
  '5.3',
  '5.4',
  '6.0',
  '6.1',
  '6.2',
  '6.3',
  '6.4',
  '7.0',
  '7.1',
  '7.2',
  '7.3',
  '7.4',
  '8.0',
  '8.1',
  '8.2',
  '9.0',
  '9.1',
  '9.2',
  '9.3',
  '9.4',
  '9.5',
  '9.6',
  '9.7',
  '9.8',
  '10.0',
  '10.1',
  '10.2',
  '10.3',
]

// Meta antiga -> código do subgrupo canônico equivalente (0014).
const BUDGET_REMAP = [
  { old: 'Habitação', code: '1.1' }, // Estrutural Habitacional
  { old: 'Lazer & Alimentação', code: '7.1' }, // Gastronomia Social
  { old: 'Transporte', code: '3.1' }, // Consumo dos Veículos
  { old: 'Comunicação', code: '1.4' }, // Telecomunicação Residencial
]

migrate(
  (app) => {
    // ---- (a) cron de demonstração --------------------------------------
    console.log(
      '[0015] (a) cron seed_nov2026_invoice: nenhum job cron registrado neste backend — nada a remover (hook já neutralizado).',
    )

    // ---- (b) fatura com item órfão -------------------------------------
    const txById = {}
    try {
      const txs = app.findRecordsByFilter('transactions', 'id != ""', '', 1000, 0)
      for (const t of txs) txById[t.id] = true
    } catch (e) {
      console.log('[0015] (b) avo ao listar transactions:', e)
    }

    let orphanItems = 0
    let invoicesFixed = 0
    try {
      const invoices = app.findRecordsByFilter('invoices', 'id != ""', '', 500, 0)
      for (const inv of invoices) {
        let items
        try {
          items = JSON.parse(inv.getString('items') || '[]') || []
        } catch (_) {
          items = []
        }
        if (!Array.isArray(items)) continue

        const kept = items.filter((it) => it && it.transaction_id && txById[it.transaction_id])
        if (kept.length === items.length) continue

        orphanItems += items.length - kept.length
        inv.set('items', JSON.stringify(kept))
        inv.set(
          'transactions',
          kept.map((it) => it.transaction_id),
        )
        let total = 0
        for (const it of kept) total += Number(it.value) || 0
        inv.set('total_amount', Math.round(total * 100) / 100)
        if (kept.length === 0) {
          const prevNote = inv.getString('notes') || ''
          const stamp =
            '[0015] Itens órfãos removidos na auditoria (transação de origem inexistente); fatura zerada.'
          inv.set(
            'notes',
            prevNote.includes(stamp) ? prevNote : `${prevNote}${prevNote ? ' ' : ''}${stamp}`,
          )
        }
        app.save(inv)
        invoicesFixed++
        console.log(
          `[0015] (b) fatura ${inv.id}: ${items.length - kept.length} item(ns) órfão(s) removido(s), total recalculado para ${total.toFixed(2)}.`,
        )
      }
    } catch (e) {
      console.log('[0015] (b) avo ao processar invoices:', e)
    }
    if (invoicesFixed === 0) console.log('[0015] (b) nenhuma fatura com item órfão — nada a fazer.')

    // ---- (c) inativar categorias fora do plano canônico -----------------
    let categoriesInactive = 0
    try {
      const cats = app.findRecordsByFilter('categories', `status != 'inactive'`, '', 1000, 0)
      for (const cat of cats) {
        const isSeed = cat.getBool('is_seed')
        const groupCode = cat.getString('group_code')
        const code = cat.getString('code')
        const inCanonical =
          isSeed ||
          (CANONICAL_CODES.includes(groupCode) && (code === '' || CANONICAL_CODES.includes(code)))
        if (inCanonical) continue
        cat.set('status', 'inactive')
        app.save(cat)
        categoriesInactive++
      }
    } catch (e) {
      console.log('[0015] (c) avo ao inativar categorias antigas:', e)
    }
    console.log(
      `[0015] (c) categorias antigas inativadas: ${categoriesInactive} (nenhuma excluída).`,
    )

    // ---- (d) remapear metas orçamentárias -------------------------------
    let budgetsRemapped = 0
    try {
      const families = app.findRecordsByFilter('families', 'id != ""', '', 100, 0)
      for (const family of families) {
        const familyId = family.id
        for (const remap of BUDGET_REMAP) {
          const budgets = app.findRecordsByFilter(
            'budgets',
            `category_group = '${remap.old}' && family_id = '${familyId}'`,
            '',
            100,
            0,
          )
          if (budgets.length === 0) continue
          // Subgrupo canônico equivalente (semeado pela 0014 nesta família).
          const subs = app.findRecordsByFilter(
            'categories',
            `code = '${remap.code}' && is_seed = true && family_id = '${familyId}'`,
            '',
            1,
            0,
          )
          if (subs.length === 0) {
            console.log(
              `[0015] (d) subgrupo ${remap.code} não encontrado na família ${familyId} — meta "${remap.old}" preservada como está (teto intacto).`,
            )
            continue
          }
          const newName = subs[0].getString('name')
          for (const b of budgets) {
            b.set('category_group', newName)
            app.save(b)
            budgetsRemapped++
            console.log(
              `[0015] (d) meta ${b.id} remapeada: "${remap.old}" -> "${newName}" (teto ${b.getFloat('limit_amount')} preservado).`,
            )
          }
        }
      }
    } catch (e) {
      console.log('[0015] (d) avo ao remapear metas:', e)
    }
    if (budgetsRemapped === 0) console.log('[0015] (d) nenhuma meta a remapear — nada a fazer.')

    // ---- (e) fechar users.createRule -----------------------------------
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      // Cadastro público fechado; membros são criados logados pelo gerente.
      // Login (auth), OAuth e request-password-reset NÃO passam por createRule.
      usersCol.createRule = "@request.auth.id != ''"
      // Blindagem: o próprio usuário não pode religar o próprio status.
      usersCol.updateRule =
        "(id = @request.auth.id && @request.body.family_role:changed = false && @request.body.status:changed = false) || (@request.auth.id != '' && @collection.families.created_by ?= @request.auth.id && @collection.families.members ?= id)"
      app.save(usersCol)
      console.log(
        '[0015] (e) users.createRule fechado (auth obrigatória); update autosserviço impedido de alterar status.',
      )
    } catch (e) {
      console.log('[0015] (e) avo ao ajustar regras de users:', e)
    }

    // ---- (f) bloquear usuários fantasma ---------------------------------
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (!usersCol.fields.getByName('status')) {
        usersCol.fields.add(
          new SelectField({
            name: 'status',
            values: ['active', 'blocked'],
            maxSelect: 1,
            required: false,
          }),
        )
        app.save(usersCol)
        console.log('[0015] (f) campo status (active/blocked) adicionado a users.')
      }
      const ghosts = app.findRecordsByFilter(
        '_pb_users_auth_',
        `family_id = '' && verified = false && status != 'blocked'`,
        'created',
        100,
        0,
      )
      let blocked = 0
      for (const u of ghosts) {
        u.set('status', 'blocked')
        app.save(u)
        blocked++
        console.log(
          `[0015] (f) usuário fantasma bloqueado: ${u.getString('name')} (${u.id}) — sem família e não verificado; nada apagado.`,
        )
      }
      console.log(
        `[0015] (f) usuários fantasma bloqueados: ${blocked}. O dono da família (verificado, com family_id) não foi tocado.`,
      )
    } catch (e) {
      console.log('[0015] (f) avo ao bloquear usuários fantasma:', e)
    }
  },
  (app) => {
    // Reversão mínima: reabre o cadastro público e desbloqueia os fantasmas.
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      usersCol.createRule = ''
      usersCol.updateRule =
        "(id = @request.auth.id && @request.body.family_role:changed = false) || (@request.auth.id != '' && @collection.families.created_by ?= @request.auth.id && @collection.families.members ?= id)"
      app.save(usersCol)
      const ghosts = app.findRecordsByFilter(
        '_pb_users_auth_',
        `status = 'blocked'`,
        'created',
        100,
        0,
      )
      for (const u of ghosts) {
        u.set('status', 'active')
        app.save(u)
      }
    } catch (_) {}
  },
)
