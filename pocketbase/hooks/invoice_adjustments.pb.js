/// <reference path="../pb_data/types.d.ts" />

// Auditoria da fatura de cartão: excluir título (adia para a fatura seguinte)
// e alterar valor (recalcula a fatura atual e as próximas).
//
// POST /backend/v1/invoice-item-exclude
//   { invoice_id, transaction_id, installment_index, notes }
//   → registra o ajuste 'exclude' e re-concilia a fatura atual e a seguinte.
//
// POST /backend/v1/invoice-item-value
//   { invoice_id, transaction_id, installment_index, value, notes }
//   → registra o ajuste 'set_value' e re-concilia a fatura atual e as
//     subsequentes que tenham parcelas da compra.
//
// GET /backend/v1/invoice-adjustments?invoice_id=...
//   → lista os ajustes registrados para a fatura ou cartão.
//
// Regra do PocketBase pb_hooks: nenhuma declaração de nível superior além de routerAdd.
// Todos os helpers ficam dentro do callback da rota.

// ---------------------------------------------------------------------------
// POST /backend/v1/invoice-item-exclude — excluir título da fatura
// (o título passa a vencer na fatura do mês seguinte)
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/invoice-item-exclude',
  (e) => {
    const round2 = (n) => Math.round(n * 100) / 100
    const isYYYYMM = (s) => typeof s === 'string' && /^\d{4}-\d{2}$/.test(s)

    const shiftMonth = (month, n) => {
      const [y, m] = month.split('-').map(Number)
      const total = y * 12 + (m - 1) + n
      const ny = Math.floor(total / 12)
      const nm = (total % 12) + 1
      return `${ny}-${String(nm).padStart(2, '0')}`
    }

    const monthOfIndex = (year, monthIndex) => {
      const ny = Math.floor(monthIndex / 12) + year
      const nm = (monthIndex % 12) + 1
      return `${ny}-${String(nm).padStart(2, '0')}`
    }

    // Concilia a fatura formal (cartão, mês): coleta as parcelas que vencem no
    // mês, aplica os ajustes abertos e grava total + itens.
    const concileInvoice = (app, auth, card, referenceMonth) => {
      if (!isYYYYMM(referenceMonth)) return null

      const closingDay = card.getInt('closing_day') || 0
      const dueDay = card.getInt('due_day') || 0

      const candidates = app.findRecordsByFilter(
        'transactions',
        `account_id = '${card.id}' && type = 'expense'`,
        'date',
        500,
        0,
      )

      const items = []
      const transactionIds = []
      let total = 0

      for (const tx of candidates) {
        const txId = tx.getString('id')
        const installments = Math.max(1, Math.floor(tx.getInt('installments_total') || 1))
        const startDate = tx.getString('date')
        const txAmount = tx.getFloat('amount')
        const perInst = Math.floor((txAmount / installments) * 100) / 100

        let startMonth = startDate.slice(0, 7)
        if (closingDay && dueDay) {
          const [y, m, d] = startDate.split('-').map(Number)
          let month = m - 1
          if (d > closingDay) month += 1
          if (dueDay < closingDay) month += 1
          startMonth = monthOfIndex(y, month)
        }

        // Calcula os valores de cada parcela levando em conta possíveis ajustes de valor (set_value)
        // com rateio proporcional da diferença nas parcelas futuras restantes
        const installmentValues = []
        for (let i = 0; i < installments; i++) {
          const base =
            i === installments - 1 ? round2(txAmount - perInst * (installments - 1)) : perInst
          installmentValues.push(base)
        }

        const valAdjustments = app.findRecordsByFilter(
          'invoice_adjustments',
          `transaction_id = '${txId}' && action = 'set_value' && resolved = false`,
          'installment_index,created',
          50,
          0,
        )

        const adjNotesByInst = {}
        for (const va of valAdjustments) {
          const adjIdx = va.getInt('installment_index') // 1-based (ou 0 para compra à vista)
          const newV = va.getFloat('amount')
          const iZero = installments > 1 ? Math.max(0, adjIdx - 1) : 0
          if (iZero < installmentValues.length) {
            const oldV = installmentValues[iZero]
            const diff = round2(newV - oldV)
            installmentValues[iZero] = newV
            adjNotesByInst[adjIdx] = `Valor ajustado para R$ ${newV.toFixed(2)}`

            const remaining = installments - 1 - iZero
            if (remaining > 0 && Math.abs(diff) > 0.001) {
              const share = Math.floor((diff / remaining) * 100) / 100
              for (let k = iZero + 1; k < installments; k++) {
                if (k === installments - 1) {
                  const alreadyDistributed = round2(share * (remaining - 1))
                  const lastShare = round2(diff - alreadyDistributed)
                  installmentValues[k] = round2(installmentValues[k] - lastShare)
                } else {
                  installmentValues[k] = round2(installmentValues[k] - share)
                }
                const k1 = k + 1
                adjNotesByInst[k1] =
                  `Parcela recalculada após ajuste (R$ ${installmentValues[k].toFixed(2)})`
              }
            }
          }
        }

        for (let i = 0; i < installments; i++) {
          const instMonth = installments > 1 ? shiftMonth(startMonth, i) : startMonth
          const idx1 = installments > 1 ? i + 1 : 0
          const computedVal = installmentValues[i]
          if (!(computedVal > 0)) continue

          const pushItem = (val, adjNote) => {
            const itemObj = {
              transaction_id: txId,
              index: idx1,
              value: val,
              description: tx.getString('description'),
              date: startDate,
              installments_total: installments,
            }
            if (adjNote) {
              itemObj.adjustment_note = adjNote
            }
            items.push(itemObj)
            transactionIds.push(txId)
            total += val
          }

          // Ajustes do título (exclusão com adiamento)
          const excl = app.findRecordsByFilter(
            'invoice_adjustments',
            `transaction_id = '${txId}' && installment_index = ${idx1} && action = 'exclude' && resolved = false`,
            '-created',
            1,
            0,
          )

          if (excl.length > 0) {
            const a = excl[0]
            const adjMonth = a.getString('invoice_month')
            const deferMonth = a.getString('defer_month')
            // Se esta é a fatura de onde foi excluído, pula
            if (referenceMonth >= adjMonth && referenceMonth !== deferMonth) {
              continue
            }
            // Se esta é a fatura para onde foi adiado, adiciona
            if (referenceMonth === deferMonth && referenceMonth > adjMonth) {
              const v = a.getFloat('amount') || computedVal
              pushItem(v, `Adiado da fatura ${adjMonth}`)
              continue
            }
          }

          // Se a parcela original cai no mês da fatura
          if (instMonth === referenceMonth) {
            const note = adjNotesByInst[idx1] || null
            pushItem(computedVal, note)
          }
        }
      }

      total = round2(total)

      const existing = app.findRecordsByFilter(
        'invoices',
        `card_account_id = '${card.id}' && reference_month = '${referenceMonth}'`,
        'created',
        1,
        0,
      )

      let invoice = null
      if (existing.length > 0) {
        invoice = existing[0]
        if (invoice.getString('status') === 'paid') return invoice
        invoice.set('total_amount', total)
        invoice.set('transactions', transactionIds)
        invoice.set('items', JSON.stringify(items))
        app.save(invoice)
      } else if (items.length > 0) {
        const col = app.findCollectionByNameOrId('invoices')
        invoice = new Record(col)
        invoice.set('user_id', auth.id)
        const familyId = card.getString('family_id') || auth.getString('family_id')
        if (familyId) invoice.set('family_id', familyId)
        invoice.set('card_account_id', card.id)
        invoice.set('reference_month', referenceMonth)
        invoice.set('total_amount', total)
        invoice.set('status', 'open')
        invoice.set('transactions', transactionIds)
        invoice.set('items', JSON.stringify(items))
        app.save(invoice)
      }

      return invoice
    }

    let payload = null
    e.app.runInTransaction((app) => {
      const body = e.requestInfo().body || {}
      const invoiceId = body.invoice_id
      const transactionId = body.transaction_id
      const installmentIndex = Math.max(0, Math.floor(Number(body.installment_index) || 0))
      const notes = typeof body.notes === 'string' ? body.notes : ''

      if (!invoiceId) throw new BadRequestError('Fatura não informada.')

      const invoice = app.findRecordById('invoices', invoiceId)
      const userFamily = e.auth.getString('family_id')
      const invFamily = invoice.getString('family_id')
      const belongs =
        invoice.getString('user_id') === e.auth.id ||
        (userFamily && invFamily && userFamily === invFamily)
      if (!belongs) throw new ForbiddenError('Essa fatura não pertence a você.')
      if (invoice.getString('status') === 'paid') {
        throw new BadRequestError('Essa fatura já está paga — desfaça o pagamento para auditar.')
      }

      if (!transactionId) throw new BadRequestError('Título não informado.')
      let tx
      try {
        tx = app.findRecordById('transactions', transactionId)
      } catch (_) {
        throw new BadRequestError('Lançamento não encontrado.')
      }
      if (tx.getString('type') !== 'expense') {
        throw new BadRequestError('O título precisa ser uma compra no cartão.')
      }
      if (tx.getString('account_id') !== invoice.getString('card_account_id')) {
        throw new BadRequestError('O lançamento não pertence a este cartão.')
      }
      const txFamily = tx.getString('family_id')
      const txBelongs =
        tx.getString('user_id') === e.auth.id || (userFamily && txFamily && userFamily === txFamily)
      if (!txBelongs) throw new ForbiddenError('Esse lançamento não pertence a você.')

      const card = app.findRecordById('accounts', invoice.getString('card_account_id'))
      const installments = Math.max(1, Math.floor(tx.getInt('installments_total') || 1))

      if (installments > 1) {
        if (installmentIndex < 1 || installmentIndex > installments) {
          throw new BadRequestError('Parcela fora do intervalo da compra.')
        }
      }

      const refMonth = invoice.getString('reference_month')
      const txAmount = tx.getFloat('amount')
      const perInst = Math.floor((txAmount / installments) * 100) / 100
      const idx = installments > 1 ? installmentIndex - 1 : 0
      const itemValue =
        installments > 1 && idx === installments - 1
          ? round2(txAmount - perInst * (installments - 1))
          : installments > 1
            ? perInst
            : txAmount
      if (!(itemValue > 0)) throw new BadRequestError('Valor do título inválido.')

      // O título some da fatura atual e passa a vencer na fatura seguinte.
      const [yy, mm] = refMonth.split('-').map(Number)
      const t = yy * 12 + (mm - 1) + 1
      const deferMonth = `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`

      // Desativa ajustes anteriores abertos para esta mesma compra/parcela
      const older = app.findRecordsByFilter(
        'invoice_adjustments',
        `transaction_id = '${tx.id}' && installment_index = ${installmentIndex} && resolved = false`,
        '-created',
        50,
        0,
      )
      for (const a of older) {
        a.set('resolved', true)
        app.save(a)
      }

      const col = app.findCollectionByNameOrId('invoice_adjustments')
      const adj = new Record(col)
      adj.set('user_id', e.auth.id)
      const familyId = invoice.getString('family_id') || userFamily
      if (familyId) adj.set('family_id', familyId)
      adj.set('transaction_id', tx.id)
      adj.set('installment_index', installmentIndex)
      adj.set('action', 'exclude')
      adj.set('amount', itemValue)
      adj.set('invoice_month', refMonth)
      adj.set('defer_month', deferMonth)
      adj.set('invoice_id', invoice.id)
      if (notes) adj.set('notes', notes)
      adj.set('resolved', false)
      app.save(adj)

      // Re-concilia a fatura atual
      const updated = concileInvoice(app, e.auth, card, refMonth)
      const items = updated ? JSON.parse(updated.getString('items') || '[]') : []

      // A fatura do mês seguinte também é re-conciliada (título entra lá)
      const nextInvoice = concileInvoice(app, e.auth, card, deferMonth)
      const nextItems = nextInvoice ? JSON.parse(nextInvoice.getString('items') || '[]') : []

      payload = {
        invoice_id: invoice.id,
        reference_month: refMonth,
        total_amount: updated ? updated.getFloat('total_amount') : 0,
        items_count: items.length,
        items: items,
        deferred_month: deferMonth,
        next_invoice: nextInvoice
          ? {
              id: nextInvoice.id,
              reference_month: deferMonth,
              total_amount: nextInvoice.getFloat('total_amount'),
              items_count: nextItems.length,
            }
          : null,
      }
    })

    return e.json(200, payload)
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/invoice-item-value — alterar o valor de um título
// (recalcula a fatura atual; parcelas futuras da compra seguem o novo valor)
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/invoice-item-value',
  (e) => {
    const round2 = (n) => Math.round(n * 100) / 100
    const isYYYYMM = (s) => typeof s === 'string' && /^\d{4}-\d{2}$/.test(s)

    const shiftMonth = (month, n) => {
      const [y, m] = month.split('-').map(Number)
      const total = y * 12 + (m - 1) + n
      const ny = Math.floor(total / 12)
      const nm = (total % 12) + 1
      return `${ny}-${String(nm).padStart(2, '0')}`
    }

    const monthOfIndex = (year, monthIndex) => {
      const ny = Math.floor(monthIndex / 12) + year
      const nm = (monthIndex % 12) + 1
      return `${ny}-${String(nm).padStart(2, '0')}`
    }

    const concileInvoice = (app, auth, card, referenceMonth) => {
      if (!isYYYYMM(referenceMonth)) return null

      const closingDay = card.getInt('closing_day') || 0
      const dueDay = card.getInt('due_day') || 0

      const candidates = app.findRecordsByFilter(
        'transactions',
        `account_id = '${card.id}' && type = 'expense'`,
        'date',
        500,
        0,
      )

      const items = []
      const transactionIds = []
      let total = 0

      for (const tx of candidates) {
        const txId = tx.getString('id')
        const installments = Math.max(1, Math.floor(tx.getInt('installments_total') || 1))
        const startDate = tx.getString('date')
        const txAmount = tx.getFloat('amount')
        const perInst = Math.floor((txAmount / installments) * 100) / 100

        let startMonth = startDate.slice(0, 7)
        if (closingDay && dueDay) {
          const [y, m, d] = startDate.split('-').map(Number)
          let month = m - 1
          if (d > closingDay) month += 1
          if (dueDay < closingDay) month += 1
          startMonth = monthOfIndex(y, month)
        }

        // Calcula os valores de cada parcela levando em conta possíveis ajustes de valor (set_value)
        // com rateio proporcional da diferença nas parcelas futuras restantes
        const installmentValues = []
        for (let i = 0; i < installments; i++) {
          const base =
            i === installments - 1 ? round2(txAmount - perInst * (installments - 1)) : perInst
          installmentValues.push(base)
        }

        const valAdjustments = app.findRecordsByFilter(
          'invoice_adjustments',
          `transaction_id = '${txId}' && action = 'set_value' && resolved = false`,
          'installment_index,created',
          50,
          0,
        )

        const adjNotesByInst = {}
        for (const va of valAdjustments) {
          const adjIdx = va.getInt('installment_index') // 1-based (ou 0 para compra à vista)
          const newV = va.getFloat('amount')
          const iZero = installments > 1 ? Math.max(0, adjIdx - 1) : 0
          if (iZero < installmentValues.length) {
            const oldV = installmentValues[iZero]
            const diff = round2(newV - oldV)
            installmentValues[iZero] = newV
            adjNotesByInst[adjIdx] = `Valor ajustado para R$ ${newV.toFixed(2)}`

            const remaining = installments - 1 - iZero
            if (remaining > 0 && Math.abs(diff) > 0.001) {
              const share = Math.floor((diff / remaining) * 100) / 100
              for (let k = iZero + 1; k < installments; k++) {
                if (k === installments - 1) {
                  const alreadyDistributed = round2(share * (remaining - 1))
                  const lastShare = round2(diff - alreadyDistributed)
                  installmentValues[k] = round2(installmentValues[k] - lastShare)
                } else {
                  installmentValues[k] = round2(installmentValues[k] - share)
                }
                const k1 = k + 1
                adjNotesByInst[k1] =
                  `Parcela recalculada após ajuste (R$ ${installmentValues[k].toFixed(2)})`
              }
            }
          }
        }

        for (let i = 0; i < installments; i++) {
          const instMonth = installments > 1 ? shiftMonth(startMonth, i) : startMonth
          const idx1 = installments > 1 ? i + 1 : 0
          const computedVal = installmentValues[i]
          if (!(computedVal > 0)) continue

          const pushItem = (val, adjNote) => {
            const itemObj = {
              transaction_id: txId,
              index: idx1,
              value: val,
              description: tx.getString('description'),
              date: startDate,
              installments_total: installments,
            }
            if (adjNote) {
              itemObj.adjustment_note = adjNote
            }
            items.push(itemObj)
            transactionIds.push(txId)
            total += val
          }

          const excl = app.findRecordsByFilter(
            'invoice_adjustments',
            `transaction_id = '${txId}' && installment_index = ${idx1} && action = 'exclude' && resolved = false`,
            '-created',
            1,
            0,
          )
          if (excl.length > 0) {
            const a = excl[0]
            const adjMonth = a.getString('invoice_month')
            const deferMonth = a.getString('defer_month')
            if (referenceMonth >= adjMonth && referenceMonth !== deferMonth) {
              continue
            }
            if (referenceMonth === deferMonth && referenceMonth > adjMonth) {
              const v = a.getFloat('amount') || computedVal
              pushItem(v, `Adiado da fatura ${adjMonth}`)
              continue
            }
          }

          if (instMonth === referenceMonth) {
            const note = adjNotesByInst[idx1] || null
            pushItem(computedVal, note)
          }
        }
      }

      total = round2(total)

      const existing = app.findRecordsByFilter(
        'invoices',
        `card_account_id = '${card.id}' && reference_month = '${referenceMonth}'`,
        'created',
        1,
        0,
      )

      let invoice = null
      if (existing.length > 0) {
        invoice = existing[0]
        if (invoice.getString('status') === 'paid') return invoice
        invoice.set('total_amount', total)
        invoice.set('transactions', transactionIds)
        invoice.set('items', JSON.stringify(items))
        app.save(invoice)
      } else if (items.length > 0) {
        const col = app.findCollectionByNameOrId('invoices')
        invoice = new Record(col)
        invoice.set('user_id', auth.id)
        const familyId = card.getString('family_id') || auth.getString('family_id')
        if (familyId) invoice.set('family_id', familyId)
        invoice.set('card_account_id', card.id)
        invoice.set('reference_month', referenceMonth)
        invoice.set('total_amount', total)
        invoice.set('status', 'open')
        invoice.set('transactions', transactionIds)
        invoice.set('items', JSON.stringify(items))
        app.save(invoice)
      }

      return invoice
    }

    let payload = null
    e.app.runInTransaction((app) => {
      const body = e.requestInfo().body || {}
      const invoiceId = body.invoice_id
      const transactionId = body.transaction_id
      const installmentIndex = Math.max(0, Math.floor(Number(body.installment_index) || 0))
      const value = round2(Number(body.value) || 0)
      const notes = typeof body.notes === 'string' ? body.notes : ''

      if (!invoiceId) throw new BadRequestError('Fatura não informada.')
      if (!(value > 0)) throw new BadRequestError('Informe um valor maior que zero.')

      const invoice = app.findRecordById('invoices', invoiceId)
      const userFamily = e.auth.getString('family_id')
      const invFamily = invoice.getString('family_id')
      const belongs =
        invoice.getString('user_id') === e.auth.id ||
        (userFamily && invFamily && userFamily === invFamily)
      if (!belongs) throw new ForbiddenError('Essa fatura não pertence a você.')
      if (invoice.getString('status') === 'paid') {
        throw new BadRequestError('Essa fatura já está paga — desfaça o pagamento para auditar.')
      }

      if (!transactionId) throw new BadRequestError('Título não informado.')
      let tx
      try {
        tx = app.findRecordById('transactions', transactionId)
      } catch (_) {
        throw new BadRequestError('Lançamento não encontrado.')
      }
      if (tx.getString('type') !== 'expense') {
        throw new BadRequestError('O título precisa ser uma compra no cartão.')
      }
      if (tx.getString('account_id') !== invoice.getString('card_account_id')) {
        throw new BadRequestError('O lançamento não pertence a este cartão.')
      }
      const txFamily = tx.getString('family_id')
      const txBelongs =
        tx.getString('user_id') === e.auth.id || (userFamily && txFamily && userFamily === txFamily)
      if (!txBelongs) throw new ForbiddenError('Esse lançamento não pertence a você.')

      const card = app.findRecordById('accounts', invoice.getString('card_account_id'))
      const closingDay = card.getInt('closing_day') || 0
      const dueDay = card.getInt('due_day') || 0
      const installments = Math.max(1, Math.floor(tx.getInt('installments_total') || 1))

      if (installments > 1) {
        if (installmentIndex < 1 || installmentIndex > installments) {
          throw new BadRequestError('Parcela fora do intervalo da compra.')
        }
      }

      const refMonth = invoice.getString('reference_month')

      // Ajustes anteriores do mesmo título são desativados
      const older = app.findRecordsByFilter(
        'invoice_adjustments',
        `transaction_id = '${tx.id}' && installment_index = ${installmentIndex} && resolved = false`,
        '-created',
        50,
        0,
      )
      for (const a of older) {
        a.set('resolved', true)
        app.save(a)
      }

      const col = app.findCollectionByNameOrId('invoice_adjustments')
      const adj = new Record(col)
      adj.set('user_id', e.auth.id)
      const familyId = invoice.getString('family_id') || userFamily
      if (familyId) adj.set('family_id', familyId)
      adj.set('transaction_id', tx.id)
      adj.set('installment_index', installmentIndex)
      adj.set('action', 'set_value')
      adj.set('amount', value)
      adj.set('invoice_month', refMonth)
      adj.set('invoice_id', invoice.id)
      if (notes) adj.set('notes', notes)
      adj.set('resolved', false)
      app.save(adj)

      // Re-concilia a fatura atual
      const updated = concileInvoice(app, e.auth, card, refMonth)

      // Re-concilia as próximas faturas da compra
      const affected = []
      if (installments > 1) {
        const startDate = tx.getString('date')
        let startMonth = startDate.slice(0, 7)
        if (closingDay && dueDay) {
          const [y, m, d] = startDate.split('-').map(Number)
          let month = m - 1
          if (d > closingDay) month += 1
          if (dueDay < closingDay) month += 1
          startMonth = monthOfIndex(y, month)
        }
        for (let k = 1; k < installments; k++) {
          const m2 = shiftMonth(startMonth, k)
          if (m2 <= refMonth) continue
          const inv2 = concileInvoice(app, e.auth, card, m2)
          if (inv2) {
            affected.push({
              reference_month: m2,
              total_amount: inv2.getFloat('total_amount'),
            })
          }
        }
      }

      const items = updated ? JSON.parse(updated.getString('items') || '[]') : []
      payload = {
        invoice_id: invoice.id,
        reference_month: refMonth,
        total_amount: updated ? updated.getFloat('total_amount') : 0,
        items_count: items.length,
        items: items,
        next_invoices: affected,
      }
    })

    return e.json(200, payload)
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// GET /backend/v1/invoice-adjustments — listar ajustes de uma fatura
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/invoice-adjustments',
  (e) => {
    const invoiceId = e.request.url.query().get('invoice_id')
    if (!invoiceId) throw new BadRequestError('invoice_id é obrigatório.')

    const invoice = e.app.findRecordById('invoices', invoiceId)
    const userFamily = e.auth.getString('family_id')
    const invFamily = invoice.getString('family_id')
    const belongs =
      invoice.getString('user_id') === e.auth.id ||
      (userFamily && invFamily && userFamily === invFamily)
    if (!belongs) throw new ForbiddenError('Essa fatura não pertence a você.')

    const adjustments = e.app.findRecordsByFilter(
      'invoice_adjustments',
      `invoice_id = '${invoiceId}' || (defer_month = '${invoice.getString('reference_month')}' && resolved = false)`,
      '-created',
      100,
      0,
    )

    const list = adjustments.map((a) => ({
      id: a.id,
      transaction_id: a.getString('transaction_id'),
      installment_index: a.getInt('installment_index'),
      action: a.getString('action'),
      amount: a.getFloat('amount'),
      invoice_month: a.getString('invoice_month'),
      defer_month: a.getString('defer_month'),
      notes: a.getString('notes'),
      resolved: a.getBool('resolved'),
      created: a.getString('created'),
    }))

    return e.json(200, list)
  },
  $apis.requireAuth(),
)
