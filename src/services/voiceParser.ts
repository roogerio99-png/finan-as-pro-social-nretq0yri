import { AccountRecord } from '@/types/finance'

/**
 * Interpretação de comandos de voz em português (pt-BR) para preencher o
 * formulário de lançamentos. Não usa nenhum serviço externo: é apenas
 * processamento de texto local sobre a transcrição da Web Speech API.
 * Nenhum dado é inventado: campos não reconhecidos voltam vazios com dica.
 */

export type VoiceFieldKey = 'type' | 'description' | 'amount' | 'date' | 'account' | 'installments'

export interface VoiceFieldStatus {
  found: boolean
  message?: string
}

export interface VoiceParseResult {
  transcript: string
  type: 'expense' | 'income'
  typeFound: boolean
  description: string
  amount: number | null
  date: string | null
  installments: number | null
  accountId: string | null
  accountName: string | null
  accountQuery: string
  fields: Record<VoiceFieldKey, VoiceFieldStatus>
}

const normalizeText = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
}

const UNITS: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  catorze: 14,
  quatorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
}

const TENS: Record<string, number> = {
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
}

const HUNDREDS: Record<string, number> = {
  cem: 100,
  cento: 100,
  duzentos: 200,
  duzentas: 200,
  trezentos: 300,
  trezentas: 300,
  quatrocentos: 400,
  quatrocentas: 400,
  quinhentos: 500,
  quinhentas: 500,
  seiscentos: 600,
  seiscentas: 600,
  setecentos: 700,
  setecentas: 700,
  oitocentos: 800,
  oitocentas: 800,
  novecentos: 900,
  novecentas: 900,
}

const NUM_WORD_ALT = [
  ...Object.keys(UNITS),
  ...Object.keys(TENS),
  ...Object.keys(HUNDREDS),
  'mil',
  'milhao',
  'milhoes',
  'e',
].join('|')

/** Converte palavras-número ("duzentos e cinquenta", "mil e quinhentos") em valor. */
const wordToNumber = (phrase: string): number | null => {
  const tokens = normalizeText(phrase).split(' ').filter(Boolean)
  if (tokens.length === 0) return null
  let total = 0
  let current = 0
  let seen = false
  for (const tok of tokens) {
    if (tok === 'e') continue
    if (tok === 'mil') {
      total += (current || 1) * 1000
      current = 0
      seen = true
      continue
    }
    if (tok === 'milhao' || tok === 'milhoes') {
      total += (current || 1) * 1000000
      current = 0
      seen = true
      continue
    }
    const val = UNITS[tok] ?? TENS[tok] ?? HUNDREDS[tok]
    if (val === undefined) return null
    current += val
    seen = true
  }
  return seen ? total + current : null
}

const parseAmountToken = (token: string): number | null => {
  let t = token.trim()
  if (!t) return null
  if (t.includes('.') && t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.')
  } else if (t.includes(',')) {
    t = t.replace(/,/g, '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '')
  }
  const n = parseFloat(t)
  return isFinite(n) && n > 0 ? n : null
}

/** Substitui o trecho casado por espaços (mantém posições) para não re-casar. */
const consume = (text: string, re: RegExp): { value: string | null; text: string } => {
  const m = re.exec(text)
  if (!m) return { value: null, text }
  const masked =
    text.slice(0, m.index) + ' '.repeat(m[0].length) + text.slice(m.index + m[0].length)
  return { value: m[1] ?? m[0], text: masked }
}

const daysInMonth = (year: number, month: number): number => new Date(year, month, 0).getDate()

const buildISODate = (year: number, month: number, day: number): string => {
  const safeDay = Math.min(Math.max(day, 1), daysInMonth(year, month))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(safeDay)}`
}

const similarity = (a: string, b: string): number => {
  if (!a || !b) return 0
  if (b.includes(a) || a.includes(b)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length)
  }
  const ta = a.split(' ').filter((w) => w.length >= 3)
  const tb = b.split(' ').filter((w) => w.length >= 3)
  if (ta.length === 0 || tb.length === 0) return 0
  const inter = ta.filter((w) => tb.some((v) => v.startsWith(w) || w.startsWith(v))).length
  return inter / Math.max(ta.length, tb.length)
}

/**
 * Casa o meio de pagamento dito na fala com as contas reais do usuário.
 * "cartão" prioriza contas tipo cartão de crédito; "conta" prioriza as demais.
 */
export const matchAccountByVoice = (
  query: string,
  kind: 'card' | 'account',
  accounts: AccountRecord[],
): AccountRecord | null => {
  if (accounts.length === 0) return null
  if (!query) {
    if (kind === 'card') {
      const cards = accounts.filter((a) => a.type === 'credit_card')
      return cards.length === 1 ? cards[0] : null
    }
    const nonCards = accounts.filter((a) => a.type !== 'credit_card')
    return nonCards.length === 1 ? nonCards[0] : null
  }

  const nq = normalizeText(query)
  const cards = accounts.filter((a) => a.type === 'credit_card')
  const pool = kind === 'card' && cards.length > 0 ? cards : accounts
  let best: AccountRecord | null = null
  let bestScore = 0
  for (const acc of pool) {
    let score = similarity(nq, normalizeText(acc.name))
    if (kind === 'card' && acc.type === 'credit_card') score += 0.15
    if (kind === 'account' && acc.type !== 'credit_card') score += 0.1
    if (score > bestScore) {
      bestScore = score
      best = acc
    }
  }
  return bestScore >= 0.34 ? best : null
}

const HINTS = {
  type: 'Não entendi se é despesa ou receita pela fala. Confirme o tipo.',
  description: 'Não entendi a descrição pela fala. Preencha manualmente.',
  amount: 'Não entendi o valor pela fala. Preencha manualmente.',
  date: 'Não entendi a data pela fala. Preencha manualmente.',
  accountQuery: (q: string) =>
    `Não encontrei a conta "${q}" no seu cadastro. Selecione manualmente.`,
  accountEmpty: 'Não entendi a conta/meio de pagamento pela fala. Selecione manualmente.',
}

const DESCRIPTION_STOPWORDS = new Set([
  'crie',
  'criar',
  'cria',
  'criado',
  'registre',
  'registrar',
  'registra',
  'registro',
  'lance',
  'lancar',
  'lancamento',
  'lancamentos',
  'novo',
  'nova',
  'quero',
  'fazer',
  'faca',
  'adicione',
  'adicionar',
  'adiciona',
  'uma',
  'um',
  'uns',
  'umas',
  'despesa',
  'despesas',
  'receita',
  'receitas',
  'gastei',
  'gasto',
  'gastos',
  'paguei',
  'pago',
  'paga',
  'pagos',
  'pagas',
  'comprei',
  'compra',
  'recebi',
  'recebimento',
  'recebido',
  'ganhei',
  'ganho',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'no',
  'na',
  'nos',
  'nas',
  'em',
  'com',
  'por',
  'meio',
  'pelo',
  'pela',
  'para',
  'valor',
  'valores',
  'data',
  'conta',
  'contas',
  'cartao',
  'cartoes',
  'credito',
  'debito',
  'hoje',
  'ontem',
  'anteontem',
  'reais',
  'real',
  'vezes',
  'parcela',
  'parcelas',
  'parcelado',
  'dia',
  'mes',
  'ano',
  'que',
  'seja',
  'ser',
  'o',
  'a',
  'os',
  'as',
  'e',
  'nao',
  'foi',
  'vou',
  'sendo',
  'total',
  'x',
])

const ACCOUNT_TAIL_STOPWORDS = new Set([
  'na',
  'no',
  'em',
  'de',
  'do',
  'da',
  'das',
  'dos',
  'pela',
  'pelo',
  'hoje',
  'ontem',
  'anteontem',
  'dia',
  'data',
  'valor',
  'reais',
  'real',
  'com',
  'que',
  'para',
  'e',
  'mes',
  'ano',
  'x',
  'vezes',
  'parcelas',
  'sendo',
  'total',
  'pago',
  'paga',
  'gastei',
  'paguei',
  'recebi',
  'comprei',
])

/**
 * Interpreta a transcrição da fala e devolve o que foi reconhecido.
 * A ordem de consumo importa: parcelas → data → valor → conta → descrição,
 * para que um número extraído num campo não vire valor de outro.
 */
export const parseVoiceTransaction = (
  rawTranscript: string,
  accounts: AccountRecord[],
): VoiceParseResult => {
  const transcript = rawTranscript.trim()
  let text = normalizeText(transcript)
  const today = new Date()
  const currentYear = today.getFullYear()

  // 1. Parcelamento ("em 10 vezes", "10x", "parcelado em 12") — antes do valor
  let installments: number | null = null
  const instDigits = consume(
    text,
    /\b(?:em\s+|parcelado\s+em\s+)?(\d{1,2})\s*(?:x\b|vezes|parcelas)\b/,
  )
  text = instDigits.text
  if (instDigits.value) {
    const n = parseInt(instDigits.value, 10)
    if (n > 1) installments = n
  }
  if (installments === null) {
    const instWords = consume(
      text,
      new RegExp(
        `\\b(?:em\\s+)?((?:${NUM_WORD_ALT})(?:\\s+(?:${NUM_WORD_ALT}))*)\\s*(?:vezes|parcelas)\\b`,
      ),
    )
    text = instWords.text
    if (instWords.value) {
      const n = wordToNumber(instWords.value)
      if (n && n > 1 && n <= 48) installments = n
    }
  }

  // 2. Data ("hoje", "ontem", "dia 5", "5 de novembro", "05/11", "05/11/2026")
  let date: string | null = null
  const fixed = consume(text, /\b(anteontem|ontem|hoje)\b/)
  text = fixed.text
  if (fixed.value) {
    const d = new Date()
    if (fixed.value === 'ontem') d.setDate(d.getDate() - 1)
    if (fixed.value === 'anteontem') d.setDate(d.getDate() - 2)
    date = buildISODate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  }
  if (!date) {
    const monthAlt = Object.keys(MONTHS).join('|')
    const dayAlt = `(\\d{1,2}|primeiro|(?:${NUM_WORD_ALT})(?:\\s+(?:${NUM_WORD_ALT}))*)`
    const dayRe = new RegExp(`\\b(?:dia\\s+)?(${dayAlt})\\s+de\\s+(${monthAlt})\\b`)
    const dm = dayRe.exec(text)
    if (dm) {
      text = consume(text, dayRe).text
      const dayPart = dm[1]
      const monthName = dm[2]
      const dayNum =
        dayPart === 'primeiro'
          ? 1
          : /^\d+$/.test(dayPart)
            ? parseInt(dayPart, 10)
            : wordToNumber(dayPart)
      if (dayNum) date = buildISODate(currentYear, MONTHS[monthName], dayNum)
    }
  }
  if (!date) {
    const numRe = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/
    const reNum = numRe.exec(text)
    if (reNum) {
      text = consume(text, numRe).text
      const day = parseInt(reNum[1], 10)
      const month = parseInt(reNum[2], 10)
      const year = reNum[3] ? parseInt(reNum[3], 10) : currentYear
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        date = buildISODate(year, month, day)
      }
    }
  }
  if (!date) {
    const dayOnly = consume(text, /\bdia\s+(\d{1,2}|primeiro)\b/)
    text = dayOnly.text
    if (dayOnly.value) {
      const day = dayOnly.value === 'primeiro' ? 1 : parseInt(dayOnly.value, 10)
      if (day >= 1 && day <= 31) date = buildISODate(currentYear, today.getMonth() + 1, day)
    }
  }

  // 3. Valor ("250 reais", "R$ 250", "1.000,00", "duzentos e cinquenta reais")
  let amount: number | null = null
  const wordAmount = consume(
    text,
    new RegExp(`\\b((?:${NUM_WORD_ALT})(?:\\s+(?:${NUM_WORD_ALT}))*)\\s*(?:reais|real)\\b`),
  )
  text = wordAmount.text
  if (wordAmount.value) {
    const n = wordToNumber(wordAmount.value)
    if (n && n > 0) amount = n
  }
  if (amount === null) {
    const r$ = consume(text, /(?:r\$|rs)\s*([\d.,]+)\b/)
    text = r$.text
    if (r$.value) amount = parseAmountToken(r$.value)
  }
  if (amount === null) {
    const realSuffix = consume(text, /\b([\d.,]+)\s*(?:reais|real)\b/)
    text = realSuffix.text
    if (realSuffix.value) amount = parseAmountToken(realSuffix.value)
  }
  if (amount === null) {
    const valorPrefix = consume(text, /\bvalor\s+(?:de\s+)?([\d.,]+)\b/)
    text = valorPrefix.text
    if (valorPrefix.value) amount = parseAmountToken(valorPrefix.value)
  }
  if (amount === null) {
    const bare = consume(text, /\b(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{1,2}|\d+\.\d{1,2}|\d+)\b/)
    text = bare.text
    if (bare.value) amount = parseAmountToken(bare.value)
  }

  // 4. Conta / meio de pagamento ("pago por meio da conta Nubank", "no cartão Ultravioleta")
  let accountQuery = ''
  let accountKind: 'card' | 'account' = 'account'
  // "no cartão", "pela conta", "no cartão de crédito" sem nome — a conta é
  // casada contra as contas reais do usuário pelo nome.
  const accRe =
    /\b(?:por\s+meio\s+d[oa]|pel[oa]|no|na|em|com|usando)\s+(?:meu|minha\s+)?(conta|cartao)(?:\s+de\s+(?:credito|debito))?\s+(?:d[oa]\s+|de\s+)?([a-z0-9]+(?:\s+[a-z0-9]+){0,3})/
  const accFull = accRe.exec(text)
  if (accFull) {
    text = consume(text, accRe).text
    accountKind = accFull[1] === 'cartao' ? 'card' : 'account'
    let words = accFull[2].split(' ')
    while (words.length > 0 && ACCOUNT_TAIL_STOPWORDS.has(words[words.length - 1])) {
      words = words.slice(0, -1)
    }
    accountQuery = words.join(' ').trim()
  } else {
    // Fala sem a palavra "conta"/"cartão" — tenta casar o resto da frase com
    // o nome de alguma conta real (ex.: "pago pelo Nubank hoje").
    const looseRe =
      /\b(?:pel[oa]|no|na|em|com|usando)\s+(?:meu|minha\s+)?([a-z][a-z0-9]*(?:\s+[a-z0-9]+){0,2})/
    const loose = looseRe.exec(text)
    if (loose) {
      let words = loose[1].split(' ')
      while (words.length > 0 && ACCOUNT_TAIL_STOPWORDS.has(words[words.length - 1])) {
        words = words.slice(0, -1)
      }
      const cand = words.join(' ').trim()
      if (
        cand &&
        accounts.some((a) => similarity(normalizeText(cand), normalizeText(a.name)) >= 0.5)
      ) {
        accountQuery = cand
        accountKind = 'account'
        text = consume(text, looseRe).text
      }
    }
  }
  const matchedAccount = matchAccountByVoice(accountQuery, accountKind, accounts)

  // 5. Tipo (despesa vs receita)
  const expenseIdx = text.search(
    /\b(despesa|gastei|gasto|paguei|pago|paga|comprei|compra|debito|saiu)\b/,
  )
  const incomeIdx = text.search(
    /\b(receita|recebi|recebimento|recebido|ganhei|ganho|salario|entrada)\b/,
  )
  let type: 'expense' | 'income' = 'expense'
  let typeFound = false
  if (expenseIdx >= 0 && (incomeIdx < 0 || expenseIdx < incomeIdx)) {
    type = 'expense'
    typeFound = true
  } else if (incomeIdx >= 0) {
    type = 'income'
    typeFound = true
  }

  // 6. Descrição: sobram os tokens que não fazem parte da estrutura do comando
  const descWords = text
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !/^\d+[.,]?\d*$/.test(w) && !DESCRIPTION_STOPWORDS.has(w))
  const description = descWords.length
    ? descWords.join(' ').charAt(0).toUpperCase() + descWords.join(' ').slice(1)
    : ''

  return {
    transcript,
    type,
    typeFound,
    description,
    amount,
    date,
    installments,
    accountId: matchedAccount ? matchedAccount.id : null,
    accountName: matchedAccount ? matchedAccount.name : null,
    accountQuery,
    fields: {
      type: { found: typeFound, message: typeFound ? undefined : HINTS.type },
      description: {
        found: description.length > 0,
        message: description ? undefined : HINTS.description,
      },
      amount: { found: amount !== null, message: amount !== null ? undefined : HINTS.amount },
      date: { found: date !== null, message: date !== null ? undefined : HINTS.date },
      account: {
        found: !!matchedAccount,
        message: matchedAccount
          ? undefined
          : accountQuery
            ? HINTS.accountQuery(accountQuery)
            : HINTS.accountEmpty,
      },
      installments: { found: installments !== null },
    },
  }
}
