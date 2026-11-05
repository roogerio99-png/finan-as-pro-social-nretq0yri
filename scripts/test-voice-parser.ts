// Verificação manual do parser de voz: npx tsx scripts/test-voice-parser.ts
import { parseVoiceTransaction, matchAccountByVoice } from '../src/services/voiceParser'

const accounts = [
  { id: 'a1', name: 'Nubank', type: 'bank' },
  { id: 'a2', name: 'Cartão Ultravioleta', type: 'credit_card' },
  { id: 'a3', name: 'Cartão Nubank', type: 'credit_card' },
  { id: 'a4', name: 'Itaú Corrente', type: 'bank' },
] as any

const today = new Date()
const year = today.getFullYear()

const cases: Array<[string, Record<string, unknown>]> = [
  // Frases antigas (formato fixo) continuam funcionando
  [
    'crie uma despesa mercado de valor 250 reais na data 5 de novembro pago pela conta Nubank',
    { type: 'expense', amount: 250, accountId: 'a1', dateFound: true },
  ],
  [
    'paguei 89 reais de internet pelo cartão Ultravioleta hoje',
    { type: 'expense', amount: 89, accountId: 'a2', dateFound: true },
  ],
  ['recebi salário de 3.500,00 na conta Itaú', { type: 'income', amount: 3500, accountId: 'a4' }],
  ['gastei 1.000,00 com mercado ontem', { type: 'expense', amount: 1000, dateFound: true }],
  [
    'crie uma despesa farmácia de 45,90 em 3 vezes no cartão Nubank',
    { type: 'expense', amount: 45.9, installments: 3, accountId: 'a3' },
  ],
  // Frases do pedido — fala livre e desordenada
  [
    'ontem paguei duzentos reais de mercado no Nubank',
    { type: 'expense', amount: 200, dateFound: true, accountId: 'a1' },
  ],
  [
    'gastei 89,90 de internet pelo cartão Ultravioleta hoje',
    { type: 'expense', amount: 89.9, accountId: 'a2', dateFound: true },
  ],
  ['mil e duzentos de aluguel dia 5', { type: 'expense', amount: 1200, dateFound: true }],
  [
    `recebi dois mil do freelance dia quinze de outubro na conta BB`,
    { type: 'income', amount: 2000, accountId: 'a1', dateFound: true },
  ],
  [
    'comprei sofá de 1.500 em 10 vezes no cartão',
    { type: 'expense', amount: 1500, installments: 10, accountId: 'a2' },
  ],
  // Valores compostos e centavos
  ['duzentos e cinquenta reais e trinta centavos de padaria', { type: 'expense', amount: 250.3 }],
  ['duzentos e cinquenta de farmácia', { type: 'expense', amount: 250 }],
  ['dois mil e quinhentos de reforma', { type: 'expense', amount: 2500 }],
  ['gastei 1250.90 de mercado', { type: 'expense', amount: 1250.9 }],
  ['R$ 2500 de presente', { type: 'expense', amount: 2500 }],
  ['então beleza paguei noventa reais né de aí gasolina', { type: 'expense', amount: 90 }],
  // Datas variadas
  ['anteontem paguei 50 de ônibus', { type: 'expense', amount: 50, dateFound: true }],
  [`paguei 80 de luz primeiro de maio`, { type: 'expense', amount: 80, date: `${year}-05-01` }],
  ['paguei 80 de luz dia 15/10', { type: 'expense', amount: 80, date: `${year}-10-15` }],
  [
    'recebi 500 dia quinze de outubro do ano passado',
    { type: 'income', amount: 500, date: `${year - 1}-10-15` },
  ],
  ['gastei 30 dia 5', { type: 'expense', amount: 30, dateFound: true }],
  // Tipos e gírias
  ['entrou dinheiro 300 do pix', { type: 'income', amount: 300 }],
  ['vendi a bike por 400', { type: 'income', amount: 400 }],
  ['depositaram 250 na conta', { type: 'income', amount: 250 }],
  ['aí tô pagando 60 de stream', { type: 'expense', amount: 60 }],
  // Descrição limpa (sem preenchimentos)
  ['então eu tô querendo anotar que gastei 45 de delivery', { type: 'expense', amount: 45 }],
  // Parcelas em qualquer posição
  ['gastei 1800 de notebook em dez vezes', { type: 'expense', amount: 1800, installments: 10 }],
  ['12 parcelas de 200 do notebook', { type: 'expense', amount: 200, installments: 12 }],
  // Conta apelido parcial + PIX
  ['paguei 100 de luz no pix do Nubank', { type: 'expense', amount: 100, accountId: 'a1' }],
  ['comprei 60 de lanche no cartão ultravioleta', { type: 'expense', amount: 60, accountId: 'a2' }],
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

// Campos não entendidos ficam vazios com dica
{
  const r = parseVoiceTransaction('balacobaco', accounts)
  if (r.fields.amount.found || r.fields.date.found || r.fields.description.found) {
    failed++
    console.log('\nFALHOU: lixo deveria deixar campos vazios', JSON.stringify(r))
  } else {
    console.log('\nOK: lixo deixa campos vazios com dica')
  }
}

// Contas parecidas em conflito não são adivinhadas
{
  const conflict = matchAccountByVoice('cartao nubank', 'card', [
    { id: 'x1', name: 'Cartão Nubank 1', type: 'credit_card' },
    { id: 'x2', name: 'Cartão Nubank 2', type: 'credit_card' },
  ] as any)
  if (conflict !== null) {
    failed++
    console.log('FALHOU: conflito deveria devolver null, retornou', conflict)
  } else {
    console.log('OK: conflito entre contas parecidas devolve null')
  }
}

process.exit(failed ? 1 : 0)
