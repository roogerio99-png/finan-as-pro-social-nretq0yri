/// <reference path="../pb_data/types.d.ts" />

// Faturas de cartão como registro formal + pagamento de fatura via
// movimentação bancária.
//
// POST /backend/v1/invoices — cria/agrupa a fatura do mês de um cartão:
// coleta todas as compras (despesas) do cartão cuja parcela vence naquele
// mês de fechamento, grava o total e a lista de compras/parcelas que a
// compõem. Se a fatura do par (cartão, mês) já existe, atualiza os itens
// e o total (re-conciliação).
//
// POST /backend/v1/invoice-movements — registra o PAGAMENTO DE FATURA como
// movimento bancário (transactions.type = 'invoice_payment'):
//   • NÃO cria lançamento de despesa — o abate da fatura é o próprio
//     movimento, evitando contar a compra duas vezes;
//   • debita o saldo atual (current_balance) da conta pagadora;
//   • grava payments (data + banco) para cada parcela quitada e incrementa
//     installments_paid das compras;
//   • marca a fatura como paga (status 'paid', paid_date e conta pagadora).
//
// DELETE /backend/v1/invoice-movements/{txId} — desfaz: estorna o saldo da
// conta, remove os payments da fatura, decrementa installments_paid e volta
// a fatura para 'open'.
//
// POST /backend/v1/transfers — transferência entre contas (sem receita nem
// despesa; só entra/sai nos saldos das duas contas).
//
// Nota: nenhuma declaração de nível superior é usada dentro dos callbacks —
// a JSVM do PocketBase executa os callbacks em outro escopo.

// ---------------------------------------------------------------------------
// POST /backend/v1/invoices — criar/atualizar fatura do mês
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/invoices',
  (e) => {
    const round2 = (n) => Math.round(n * 100) / 100
    const isYYYYMM = (s) => typeof s === 'string' && /^\d{4}-\d{2}$/.test(s)
    const monthDistance = (from, to) => {
      const [fy, fm] = from.split('-').map(Number)
      const [ty, tm] = to.split('-').map(Number)
      return (ty - fy) * 12 + (tm - fm)
    }
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

    const body = e.requestInfo().body || {}
    const cardAccountId = body.card_account_id
    const referenceMonth = body.reference_month

    if (!cardAccountId) throw new BadRequestError('Cartão não informado.')
    if (!isYYYYMM(referenceMonth)) throw new BadRequestError('Mês de referência inválido.')

    const card = e.app.findRecordById('accounts', cardAccountId)
    if (card.getString('type') !== 'credit_card') {
      throw new BadRequestError('A fatura pertence a um cartão de crédito.')
    }
    const userFamily = e.auth.getString('family_id')
    const cardFamily = card.getString('family_id')
    const belongsToUserOrFamily =
      card.getString('user_id') === e.auth.id ||
      (userFamily && cardFamily && userFamily === cardFamily)
    if (!belongsToUserOrFamily) {
      throw new ForbiddenError('Esse cartão não pertence à sua família.')
    }

    // Compras do cartão que têm parcela vencendo nesta fatura: despesas
    // (competência da compra) cuja janela de desembolso cobre o mês, mais
    // as à vista com cash_month no mês.
    const candidates = e.app.findRecordsByFilter(
      'transactions',
      `account_id = '${card.id}' && type = 'expense'`,
      'date',
      500,
      0,
    )

    const closingDay = card.getInt('closing_day') || 0
    const dueDay = card.getInt('due_day') || 0

    const items = []
    const transactionIds = []
    let total = 0

    for (const tx of candidates) {
      const installments = Math.max(1, Math.floor(tx.getInt('installments_total') || 1))
      const startDate = tx.getString('date')

      // Primeiro mês de desembolso: mesma regra do frontend
      // (accountsService.calculateCashDueDate) — compra depois do
      // fechamento cai na fatura seguinte.
      let startMonth = startDate.slice(0, 7)
      if (closingDay && dueDay) {
        const [y, m, d] = startDate.split('-').map(Number)
        let month = m - 1
        if (d > closingDay) month += 1
        if (dueDay < closingDay) month += 1
        startMonth = monthOfIndex(y, month)
      }

      for (let i = 0; i < installments; i++) {
        const instMonth = installments > 1 ? shiftMonth(startMonth, i) : startMonth
        if (instMonth !== referenceMonth) continue

        const perInst = Math.floor((tx.getFloat('amount') / installments) * 100) / 100
        const value =
          i === installments - 1
            ? round2(tx.getFloat('amount') - perInst * (installments - 1))
            : perInst
        if (!(value > 0)) continue

        items.push({
          transaction_id: tx.id,
          index: installments > 1 ? i + 1 : 0,
          value: value,
          description: tx.getString('description'),
        })
        transactionIds.push(tx.id)
        total += value
      }
    }

    if (items.length === 0) {
      throw new BadRequestError('Nenhuma compra com parcela vencendo nesta fatura para agrupar.')
    }

    total = round2(total)

    // Fatura existente do par (cartão, mês)? Atualiza itens/total.
    const existing = e.app.findRecordsByFilter(
      'invoices',
      `card_account_id = '${card.id}' && reference_month = '${referenceMonth}'`,
      'created',
      1,
      0,
    )

    let invoice
    if (existing.length > 0) {
      invoice = existing[0]
      if (invoice.getString('status') === 'paid') {
        throw new BadRequestError(
          'Essa fatura já está paga — desfaça o pagamento para re-conciliar.',
        )
      }
      invoice.set('total_amount', total)
      invoice.set('transactions', transactionIds)
      invoice.set('items', JSON.stringify(items))
      e.app.save(invoice)
    } else {
      const col = e.app.findCollectionByNameOrId('invoices')
      invoice = new Record(col)
      invoice.set('user_id', e.auth.id)
      const familyId = card.getString('family_id') || userFamily
      if (familyId) invoice.set('family_id', familyId)
      invoice.set('card_account_id', card.id)
      invoice.set('reference_month', referenceMonth)
      invoice.set('total_amount', total)
      invoice.set('status', 'open')
      invoice.set('transactions', transactionIds)
      invoice.set('items', JSON.stringify(items))
      e.app.save(invoice)
    }

    const result = {
      id: invoice.id,
      reference_month: invoice.getString('reference_month'),
      total_amount: invoice.getFloat('total_amount'),
      status: invoice.getString('status'),
      items_count: items.length,
    }

    return e.json(200, result)
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/invoice-movements — pagar fatura como movimento bancário
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/invoice-movements',
  (e) => {
    const round2 = (n) => Math.round(n * 100) / 100
    const isYYYYMMDD = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
    const cardLabel = (txApp, cardId) => {
      try {
        return txApp.findRecordById('accounts', cardId).getString('name')
      } catch (_) {
        return 'cartão'
      }
    }
    const parseItems = (raw) => {
      try {
        const parsed = JSON.parse(raw || '[]')
        return Array.isArray(parsed) ? parsed : []
      } catch (_) {
        return []
      }
    }

    const body = e.requestInfo().body || {}
    const invoiceId = body.invoice_id
    const paymentAccountId = body.payment_account_id
    const paidDate = body.paid_date
    const amount = round2(Number(body.amount) || 0)
    const notes = typeof body.notes === 'string' ? body.notes : ''

    if (!invoiceId) throw new BadRequestError('Fatura não informada.')
    if (!paymentAccountId) throw new BadRequestError('Conta/banco pagador não informado.')
    if (!isYYYYMMDD(paidDate)) throw new BadRequestError('Data do pagamento inválida.')

    let movementResult = null
    e.app.runInTransaction((txApp) => {
      const invoice = txApp.findRecordById('invoices', invoiceId)
      const userFamily = e.auth.getString('family_id')
      const invFamily = invoice.getString('family_id')
      const belongsToUserOrFamily =
        invoice.getString('user_id') === e.auth.id ||
        (userFamily && invFamily && userFamily === invFamily)
      if (!belongsToUserOrFamily) {
        throw new ForbiddenError('Essa fatura não pertence a você.')
      }
      if (invoice.getString('status') === 'paid') {
        throw new BadRequestError('Essa fatura já está paga.')
      }

      const account = txApp.findRecordById('accounts', paymentAccountId)
      if (account.getString('type') === 'credit_card') {
        throw new BadRequestError('O pagamento precisa sair de uma conta, não de um cartão.')
      }
      if (account.getString('status') === 'archived') {
        throw new BadRequestError('A conta escolhida está arquivada.')
      }
      const accFamily = account.getString('family_id')
      const accBelongs =
        account.getString('user_id') === e.auth.id ||
        (userFamily && accFamily && userFamily === accFamily)
      if (!accBelongs) {
        throw new ForbiddenError('Essa conta não pertence a você.')
      }

      const cardId = invoice.getString('card_account_id')
      const refMonth = invoice.getString('reference_month')
      const familyId = invoice.getString('family_id') || userFamily

      // Valor pago: o informado (permite pagamento parcial) ou o total em aberto.
      let payAmount = amount
      if (!(payAmount > 0)) {
        payAmount = round2(invoice.getFloat('total_amount'))
      }

      // O pagamento de fatura é um MOVIMENTO bancário próprio
      // (transactions.type = 'invoice_payment') — NÃO é despesa: não entra em
      // orçamento, termômetros nem indicadores (a compra já foi contada).
      const txCol = txApp.findCollectionByNameOrId('transactions')
      const movement = new Record(txCol)
      movement.set('user_id', e.auth.id)
      if (familyId) movement.set('family_id', familyId)
      movement.set('account_id', account.id)
      movement.set('description', `Pagamento fatura ${refMonth} — ${cardLabel(txApp, cardId)}`)
      movement.set('amount', payAmount)
      movement.set('type', 'invoice_payment')
      movement.set('date', paidDate)
      movement.set('competence_month', paidDate.slice(0, 7))
      movement.set('cash_month', paidDate.slice(0, 7))
      movement.set('invoice_id', invoice.id)
      movement.set('is_reconciled', true)
      if (notes) movement.set('notes', notes)
      txApp.save(movement)

      // Debita o saldo atual da conta pagadora (saída de caixa).
      account.set('current_balance', round2(account.getFloat('current_balance') - payAmount))
      txApp.save(account)

      // Marca as parcelas da fatura como pagas (payments + installments_paid).
      const items = parseItems(invoice.getString('items'))
      const payCol = txApp.findCollectionByNameOrId('payments')
      for (const item of items) {
        const already = txApp.findRecordsByFilter(
          'payments',
          `source_transaction_id = '${item.transaction_id}' && installment_index = ${item.index || 0}`,
          'created',
          1,
          0,
        )
        if (already.length > 0) continue

        const payment = new Record(payCol)
        payment.set('user_id', e.auth.id)
        if (familyId) payment.set('family_id', familyId)
        payment.set('source_transaction_id', item.transaction_id)
        payment.set('payment_account_id', account.id)
        payment.set('card_account_id', cardId)
        payment.set('invoice_id', invoice.id)
        if (item.index > 0) payment.set('installment_index', item.index)
        payment.set('amount', item.value)
        payment.set('cash_month', refMonth)
        payment.set('paid_date', paidDate)
        payment.set('notes', notes)
        txApp.save(payment)

        // Incrementa installments_paid da compra (sem alterar a compra em si).
        try {
          const purchase = txApp.findRecordById('transactions', item.transaction_id)
          const totalInst = Math.floor(purchase.getInt('installments_total') || 0)
          if (totalInst > 1) {
            purchase.set(
              'installments_paid',
              Math.min(totalInst, (purchase.getInt('installments_paid') || 0) + 1),
            )
            txApp.save(purchase)
          }
        } catch (_) {}
      }

      // Fatura fica paga: status + data + banco pagador.
      invoice.set('status', 'paid')
      invoice.set('paid_date', paidDate)
      invoice.set('payment_account_id', account.id)
      txApp.save(invoice)

      movementResult = {
        movement_id: movement.id,
        invoice_id: invoice.id,
        amount: payAmount,
        paid_date: paidDate,
        payment_account_id: account.id,
      }
    })

    return e.json(200, movementResult)
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// DELETE /backend/v1/invoice-movements/{movementId} — desfazer pagamento
// ---------------------------------------------------------------------------
routerAdd(
  'DELETE',
  '/backend/v1/invoice-movements/{movementId}',
  (e) => {
    const round2 = (n) => Math.round(n * 100) / 100
    const parseItems = (raw) => {
      try {
        const parsed = JSON.parse(raw || '[]')
        return Array.isArray(parsed) ? parsed : []
      } catch (_) {
        return []
      }
    }

    e.app.runInTransaction((txApp) => {
      const movementId = e.request.pathValue('movementId')
      const movement = txApp.findRecordById('transactions', movementId)
      if (movement.getString('type') !== 'invoice_payment') {
        throw new BadRequestError('Esse movimento não é um pagamento de fatura.')
      }
      if (movement.getString('user_id') !== e.auth.id) {
        throw new ForbiddenError('Esse movimento não pertence a você.')
      }

      const invoiceId = movement.getString('invoice_id')
      const amount = movement.getFloat('amount')

      // Estorna o saldo da conta pagadora.
      try {
        const account = txApp.findRecordById('accounts', movement.getString('account_id'))
        account.set('current_balance', round2(account.getFloat('current_balance') + amount))
        txApp.save(account)
      } catch (_) {}

      // Remove os payments gerados e decrementa installments_paid das compras.
      try {
        const invoice = txApp.findRecordById('invoices', invoiceId)
        const items = parseItems(invoice.getString('items'))
        for (const item of items) {
          const found = txApp.findRecordsByFilter(
            'payments',
            `source_transaction_id = '${item.transaction_id}' && installment_index = ${item.index || 0}`,
            'created',
            10,
            0,
          )
          for (const p of found) {
            try {
              const purchase = txApp.findRecordById('transactions', item.transaction_id)
              const paid = Math.max(0, (purchase.getInt('installments_paid') || 0) - 1)
              purchase.set('installments_paid', paid)
              txApp.save(purchase)
            } catch (_) {}
            txApp.delete(p)
          }
        }
        invoice.set('status', 'open')
        invoice.set('paid_date', '')
        invoice.set('payment_account_id', '')
        txApp.save(invoice)
      } catch (_) {}

      txApp.delete(movement)
    })

    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// POST /backend/v1/transfers — transferência entre contas
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/transfers',
  (e) => {
    const round2 = (n) => Math.round(n * 100) / 100
    const isYYYYMMDD = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

    const body = e.requestInfo().body || {}
    const sourceAccountId = body.source_account_id
    const targetAccountId = body.target_account_id
    const date = body.date
    const description = typeof body.description === 'string' ? body.description : ''
    const notes = typeof body.notes === 'string' ? body.notes : ''

    if (!sourceAccountId || !targetAccountId) {
      throw new BadRequestError('Informe a conta de origem e a de destino.')
    }
    if (sourceAccountId === targetAccountId) {
      throw new BadRequestError('A conta de destino deve ser diferente da de origem.')
    }
    if (!isYYYYMMDD(date)) throw new BadRequestError('Data inválida.')

    const amount = round2(Number(body.amount))
    if (!(amount > 0)) throw new BadRequestError('Valor da transferência inválido.')

    let transferResult = null
    e.app.runInTransaction((txApp) => {
      const source = txApp.findRecordById('accounts', sourceAccountId)
      const target = txApp.findRecordById('accounts', targetAccountId)
      const userFamily = e.auth.getString('family_id')
      const srcFamily = source.getString('family_id')
      const tgtFamily = target.getString('family_id')

      const srcBelongs =
        source.getString('user_id') === e.auth.id ||
        (userFamily && srcFamily && userFamily === srcFamily)
      const tgtBelongs =
        target.getString('user_id') === e.auth.id ||
        (userFamily && tgtFamily && userFamily === tgtFamily)

      if (!srcBelongs) {
        throw new ForbiddenError('A conta de origem não pertence a você.')
      }
      if (!tgtBelongs) {
        throw new ForbiddenError('A conta de destino não pertence a você.')
      }
      if (
        source.getString('type') === 'credit_card' ||
        target.getString('type') === 'credit_card'
      ) {
        throw new BadRequestError('Transferência entre contas não envolve cartão de crédito.')
      }

      const col = txApp.findCollectionByNameOrId('transactions')
      const movement = new Record(col)
      movement.set('user_id', e.auth.id)
      if (userFamily) movement.set('family_id', userFamily)
      movement.set('account_id', source.id)
      movement.set('transfer_account_id', target.id)
      movement.set('description', description || `Transferência para ${target.getString('name')}`)
      movement.set('amount', amount)
      movement.set('type', 'transfer')
      movement.set('date', date)
      movement.set('competence_month', date.slice(0, 7))
      movement.set('cash_month', date.slice(0, 7))
      movement.set('is_reconciled', true)
      if (notes) movement.set('notes', notes)
      txApp.save(movement)

      // Sai de uma conta e entra na outra — sem receita nem despesa.
      source.set('current_balance', round2(source.getFloat('current_balance') - amount))
      target.set('current_balance', round2(target.getFloat('current_balance') + amount))
      txApp.save(source)
      txApp.save(target)

      transferResult = { id: movement.id, amount: amount }
    })

    return e.json(200, transferResult)
  },
  $apis.requireAuth(),
)
