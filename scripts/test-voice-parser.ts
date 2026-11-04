// Verificação manual do parser de voz: npx tsx scripts/test-voice-parser.ts
import { parseVoiceTransaction } from '../src/services/voiceParser'

const accounts = [
  { id: 'a1', name: 'Nubank', type: 'bank' },
  { id: 'a2', name: 'Cartão Ultravioleta', type: 'credit_card' },
  { id: 'a3', name: 'Cartão Nubank', type: 'credit_card' },
  { id: 'a4', name: 'Itaú Corrente', type: 'bank' },
] as any

const cases: Array<[string, Record<string, unknown>]> = [
  [
    'crie uma despesa mercado de valor 250 reais na data 5 de novembro pago pela conta Nubank',
    { type: 'expense', amount: 250, accountId: 'a1', dateFound: true },
  ],
  [
    'paguei 89 reais de internet pelo cartão Ultravioleta hoje',
    { type: 'expense', amount: 89, accountId: 'a2', dateFound: true },
  ],
  [
    'recebi salário de 3.500,00 na conta Itaú',
    { type: 'income', amount: 3500, accountId: 'a4' },
  ],
  [
    'gastei 1.000,00 com mercado ontem',
    { type: 'expense', amount: 1000, dateFound: true },
  ],
  [
    'crie uma despesa farmácia de 45,90 em 3 vezes no cartão Nubank',
    { type: 'expense', amount: 45.9, installments: 3, accountId: 'a3' },
  ],
]

let failed = 0
for (const [text, expected] of cases) {
  const r = parseVoiceTransaction(text, accounts)
  const problems: string[] = []
  for (const [k, v] of Object.entries(expected)) {
    const got =
      k === 'dateFound'
        ? r.date !== null
        : k === 'accountFound'
          ? r.fields.account.found
          : (r as unknown as Record<string, unknown>)[k]
    if (got !== v) problems.push(`${k}: esperado ${String(v)}, obtido ${String(got)}`)
  }
  console.log(`\n"${text}"`)
  console.log(
    JSON.stringify({
      type: r.type,
      description: r.description,
      amount: r.amount,
      date: r.date,
      accountId: r.accountId,
      installments: r.installments,
      accountQuery: r.accountQuery,
    }),
  )
  console.log(
    'hints:',
    Object.values(r.fields)
      .filter((f) => !f.found && f.message)
      .map((f) => f.message),
  )
  if (problems.length) {
    failed++
    console.log('FALHOU:', problems.join('; '))
  } else {
    console.log('OK')
  }
}
process.exit(failed ? 1 : 0)
