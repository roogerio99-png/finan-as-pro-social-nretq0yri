// 0010 — Isolamento entre famílias em todas as coleções financeiras
// Garante o campo family_id em categories, budgets, debts, dreams, depara_rules e users,
// realiza backfill para vincular todos os registros existentes ao núcleo familiar correspondente,
// e restringe as regras de API (list, view, create, update, delete) ao escopo da família.

migrate(
  (app) => {
    const familiesCol = app.findCollectionByNameOrId('families')

    // 1. Adiciona family_id às coleções que ainda não possuem
    const collectionsToEnsureFamily = [
      '_pb_users_auth_',
      'categories',
      'budgets',
      'debts',
      'dreams',
      'depara_rules',
    ]

    for (const colName of collectionsToEnsureFamily) {
      try {
        const col = app.findCollectionByNameOrId(colName)
        if (!col.fields.getByName('family_id')) {
          col.fields.add(
            new RelationField({
              name: 'family_id',
              collectionId: familiesCol.id,
              cascadeDelete: false,
              maxSelect: 1,
              required: false,
            }),
          )
          app.save(col)
        }
      } catch (err) {
        console.log(`[0010] Aviso ao adicionar family_id em ${colName}:`, err)
      }
    }

    // 2. Backfill: identificar famílias e vincular usuários e registros financeiros
    let defaultFamilyId = ''
    try {
      const allFamilies = app.findRecordsByFilter('families', 'id != ""', 'created', 10, 0)
      if (allFamilies.length > 0) {
        defaultFamilyId = allFamilies[0].id
      }
    } catch (_) {}

    // Backfill em users
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const allUsers = app.findRecordsByFilter(usersCol, 'id != ""', 'created', 100, 0)
      for (const u of allUsers) {
        let famId = u.getString('family_id')
        if (!famId) {
          try {
            const fams = app.findRecordsByFilter(
              'families',
              `created_by = '${u.id}' || members ~ '${u.id}'`,
              'created',
              1,
              0,
            )
            if (fams.length > 0) {
              famId = fams[0].id
            } else if (defaultFamilyId) {
              famId = defaultFamilyId
              // Adiciona aos membros da família padrão
              const defFam = app.findRecordById('families', defaultFamilyId)
              const currentMembers = defFam.get('members') || []
              if (!currentMembers.includes(u.id)) {
                defFam.set('members', [...currentMembers, u.id])
                app.save(defFam)
              }
            }
            if (famId) {
              u.set('family_id', famId)
              app.save(u)
            }
          } catch (e) {
            console.log(`[0010] Erro ao atualizar family_id do usuario ${u.id}:`, e)
          }
        }
      }
    } catch (e) {
      console.log('[0010] Erro no backfill de users:', e)
    }

    // Mapeamento auxiliar de user_id -> family_id
    const userFamilyMap = {}
    try {
      const allUsers = app.findRecordsByFilter('_pb_users_auth_', 'id != ""', 'created', 200, 0)
      for (const u of allUsers) {
        userFamilyMap[u.id] = u.getString('family_id') || defaultFamilyId
      }
    } catch (_) {}

    // Backfill em coleções financeiras
    const financialCollections = [
      'accounts',
      'transactions',
      'categories',
      'budgets',
      'debts',
      'dreams',
      'depara_rules',
      'payments',
      'invoices',
    ]

    for (const colName of financialCollections) {
      try {
        const col = app.findCollectionByNameOrId(colName)
        const records = app.findRecordsByFilter(col, 'id != ""', 'created', 1000, 0)
        for (const rec of records) {
          if (!rec.getString('family_id')) {
            const uid = rec.getString('user_id')
            const famId = (uid && userFamilyMap[uid]) || defaultFamilyId
            if (famId) {
              rec.set('family_id', famId)
              app.save(rec)
            }
          }
        }
      } catch (err) {
        console.log(`[0010] Erro no backfill da colecao ${colName}:`, err)
      }
    }

    // 3. Regras de isolamento para as coleções financeiras
    const isolationRule =
      "@request.auth.id != '' && (family_id.members ?= @request.auth.id || family_id.created_by = @request.auth.id || (@request.auth.family_id != '' && family_id = @request.auth.family_id) || (family_id = '' && user_id = @request.auth.id))"

    const createRule =
      "@request.auth.id != '' && (user_id = '' || user_id = @request.auth.id || (@collection.families.members ?= @request.auth.id && @collection.families.members ?= user_id) || family_id.members ?= @request.auth.id || (@request.auth.family_id != '' && family_id = @request.auth.family_id))"

    for (const colName of financialCollections) {
      try {
        const col = app.findCollectionByNameOrId(colName)
        col.listRule = isolationRule
        col.viewRule = isolationRule
        col.createRule = createRule
        col.updateRule = isolationRule
        col.deleteRule = isolationRule
        app.save(col)
      } catch (err) {
        console.log(`[0010] Erro ao aplicar regras em ${colName}:`, err)
      }
    }

    // 4. Regras da coleção families
    try {
      const famCol = app.findCollectionByNameOrId('families')
      famCol.listRule =
        "@request.auth.id != '' && (created_by = @request.auth.id || members ?= @request.auth.id)"
      famCol.viewRule =
        "@request.auth.id != '' && (created_by = @request.auth.id || members ?= @request.auth.id)"
      famCol.createRule = "@request.auth.id != ''"
      famCol.updateRule =
        "@request.auth.id != '' && (created_by = @request.auth.id || members ?= @request.auth.id)"
      famCol.deleteRule = "@request.auth.id != '' && created_by = @request.auth.id"
      app.save(famCol)
    } catch (err) {
      console.log('[0010] Erro ao atualizar regras de families:', err)
    }
  },
  (app) => {
    // Reversão básica para regras abertas
    const financialCollections = [
      'accounts',
      'transactions',
      'categories',
      'budgets',
      'debts',
      'dreams',
      'depara_rules',
      'payments',
      'invoices',
    ]

    for (const colName of financialCollections) {
      try {
        const col = app.findCollectionByNameOrId(colName)
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id != ''"
        col.deleteRule = "@request.auth.id != ''"
        app.save(col)
      } catch (_) {}
    }
  },
)
