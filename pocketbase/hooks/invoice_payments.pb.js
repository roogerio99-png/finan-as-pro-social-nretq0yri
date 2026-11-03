/// <reference path="../pb_data/types.d.ts" />

// Pagamento de parcelas de fatura de cartão (fluxo de caixa do Painel).
//
// POST /backend/v1/invoice-payments — marca uma parcela de uma compra parcelada como
// paga: grava data + conta/banco pagador, debita o valor do saldo atual da conta
// e incrementa `installments_paid` da compra — tudo numa única transação.
//
// DELETE /backend/v1/invoice-payments/{id} — desfaz o pagamento: estorna o saldo da
// conta, decrementa `installments_paid` e apaga o registro.
//
// Acesso: exige login ($apis.requireAuth) e todas as operações conferem que os
// registros manipulados pertencem ao usuário autenticado.
//
// Nota: nenhuma declaração de nível superior é usada dentro dos callbacks —
// a JSVM do PocketBase executa os callbacks em outro escopo.

// ---------------------------------------------------------------------------
// POST /backend/v1/invoice-payments
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/invoice-payments',
  (e) => {
    const round2 = (n) => Math.round(n * 100) / 100
    const isYYYYMM = (s) => typeof s === 'string' && /^\d{4}-\d{2}$/.test(s)
    const isYYYYMMDD = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

    const body = e.requestInfo().body || {}

    const sourceId = body.source_transaction_id
    const installmentIndex = Math.floor(Number(body.installment_index) || 0)
    const cashMonth = body.cash_month
    const paidDate = body.paid_date
    const paymentAccountId = body.payment_account_id
    const cardAccountId = body.card_account_id
    const notes = typeof body.notes === 'string' ? body.notes : ''

    if (!sourceId) throw new BadRequestError('Compra (parcelada) não informada.')
    if (installmentIndex < 1) throw new BadRequestError('Parcela inválida.')
    if (!isYYYYMM(cashMonth)) throw new BadRequestError('Mês da fatura inválido.')
    if (!isYYYYMMDD(paidDate)) throw new BadRequestError('Data do pagamento inválida.')
    if (!paymentAccountId) throw new BadRequestError('Conta/banco pagador não informado.')

    const amount = round2(Number(body.amount))
    if (!(amount > 0)) throw new BadRequestError('Valor da parcela inválido.')

    const result = e.app.runInTransaction((txApp) => {
      const tx = txApp.findRecordById('transactions', sourceId)

      // O pagamento só vale para despesas parceladas.
      if (tx.getString('type') !== 'expense') {
        throw new BadRequestError('Somente despesas podem ter parcela paga.')
      }
      const total = Math.floor(tx.getInt('installments_total') || 0)
      if (total < 2) {
        throw new BadRequestError('Somente compras parceladas têm parcelas para quitar.')
      }
      if (installmentIndex > total) {
        throw new BadRequestError('Parcela não existe nessa compra.')
      }

      // Dono da transação deve ser o usuário autenticado.
      if (tx.getString('user_id') !== e.auth.id) {
        throw new ForbiddenError('Essa compra não pertence a você.')
      }

      // Uma parcela só pode ser paga uma vez.
      const existing = txApp.findRecordsByFilter(
        'payments',
        `source_transaction_id = '${sourceId}' && installment_index = ${installmentIndex}`,
        'created',
        1,
        0,
      ).length
      if (existing > 0) {
        throw new BadRequestError('Essa parcela já está marcada como paga.')
      }

      // Conta pagadora: precisa existir, ser ativa e NÃO ser cartão.
      const account = txApp.findRecordById('accounts', paymentAccountId)
      if (account.getString('type') === 'credit_card') {
        throw new BadRequestError('O pagamento precisa sair de uma conta, não de um cartão.')
      }
      if (account.getString('status') === 'archived') {
        throw new BadRequestError('A conta escolhida está arquivada.')
      }
      if (account.getString('user_id') !== e.auth.id) {
        throw new ForbiddenError('Essa conta não pertence a você.')
      }

      // Cartão cuja fatura está sendo paga (para agrupar a marcação).
      let cardId = tx.getString('account_id')
      if (cardAccountId && cardAccountId !== cardId) {
        const card = txApp.findRecordById('accounts', cardAccountId)
        if (card.getString('user_id') !== e.auth.id) {
          throw new ForbiddenError('Esse cartão não pertence a você.')
        }
        cardId = card.id
      }

      const familyId = tx.getString('family_id')

      // 1) cria o registro do pagamento
      const payCol = txApp.findCollectionByNameOrId('payments')
      const payment = new Record(payCol)
      payment.set('user_id', e.auth.id)
      if (familyId) payment.set('family_id', familyId)
      payment.set('source_transaction_id', tx.id)
      payment.set('payment_account_id', account.id)
      payment.set('card_account_id', cardId)
      payment.set('installment_index', installmentIndex)
      payment.set('amount', amount)
      payment.set('cash_month', cashMonth)
      payment.set('paid_date', paidDate)
      payment.set('notes', notes)
      txApp.save(payment)

      // 2) debita o saldo atual da conta pagadora
      account.set('current_balance', round2(account.getFloat('current_balance') - amount))
      txApp.save(account)

      // 3) incrementa installments_paid da compra
      const paidNow = Math.min(total, (tx.getInt('installments_paid') || 0) + 1)
      tx.set('installments_paid', paidNow)
      txApp.save(tx)

      return payment
    })

    return e.json(200, {
      id: result.id,
      amount: result.getFloat('amount'),
      cash_month: result.getString('cash_month'),
      paid_date: result.getString('paid_date'),
      installment_index: result.getInt('installment_index'),
      payment_account_id: result.getString('payment_account_id'),
      card_account_id: result.getString('card_account_id'),
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// DELETE /backend/v1/invoice-payments/{id}
// ---------------------------------------------------------------------------
routerAdd(
  'DELETE',
  '/backend/v1/invoice-payments/{id}',
  (e) => {
    const round2 = (n) => Math.round(n * 100) / 100
    const id = e.request.pathValue('id')
    if (!id) throw new BadRequestError('Pagamento não informado.')

    e.app.runInTransaction((txApp) => {
      const payment = txApp.findRecordById('payments', id)
      if (payment.getString('user_id') !== e.auth.id) {
        throw new ForbiddenError('Esse pagamento não pertence a você.')
      }

      const account = txApp.findRecordById('accounts', payment.getString('payment_account_id'))
      const amount = payment.getFloat('amount')
      account.set('current_balance', round2(account.getFloat('current_balance') + amount))
      txApp.save(account)

      // Decrementa installments_paid da compra.
      const tx = txApp.findRecordById('transactions', payment.getString('source_transaction_id'))
      const paid = Math.max(0, (tx.getInt('installments_paid') || 0) - 1)
      tx.set('installments_paid', paid)
      txApp.save(tx)

      txApp.delete(payment)
    })

    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)
