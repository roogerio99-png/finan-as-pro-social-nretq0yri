import { AccountRecord } from '@/types/finance'

/**
 * Interpretação de comandos de voz em português (pt-BR) para preencher o
 * formulário de lançamentos. Não usa nenhum serviço externo: é apenas
 * processamento de texto local sobre a transcrição da Web Speech API.
 * Nenhum dado é inventado: campos não reconhecidos voltam vazios com dica.
 *
 * A fala é livre e desordenada: valor, data, conta, tipo e descrição podem
 * aparecer em qualquer posição e são extraídos por padrões, não por posição.
 * Exemplos aceitos:
 *  - "ontem paguei duzentos reais de mercado no Nubank"
 *  - "gastei 89,90 de internet pelo cartão Ultravioleta hoje"
 *  - "mil e duzentos de aluguel dia 5"
 *  - "recebi dois mil do freelance dia quinze de outubro na conta BB"
 *  - "comprei sofá de 1.500 em 10 vezes no cartão"
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
    // Pontuação fora de números vira espaço ("então," → "entao"); "1.250,90" intacto.
    .replace(/(?<!\d)[.,;!?]|[;!?](?!\d)/g, ' ')
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
].join('|')

/**
 * Sequência de palavras-número ligadas por "e" (ou espaço), ex.:
 * "duzentos e cinquenta", "mil e duzentos", "dois mil e quinhentos".
 */
const NUMBER_WORDS_PATTERN = `(?:${NUM_WORD_ALT})(?:(?:\\s+e\\s+|\\s+)(?:${NUM_WORD_ALT}))*`

/** Converte palavras-número ("duzentos e cinquenta", "mil e duzentos") em valor. */
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
 * Apelidos parciais casam ("ultravioleta" → "Cartão Ultravioleta").
 * Em empate entre contas parecidas NÃO adivinha: devolve null (o usuário escolhe).
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
  let tie = false
  for (const acc of pool) {
    let score = similarity(nq, normalizeText(acc.name))
    if (kind === 'card' && acc.type === 'credit_card') score += 0.15
    if (kind === 'account' && acc.type !== 'credit_card') score += 0.1
    if (score > bestScore + 0.001) {
      bestScore = score
      best = acc
      tie = false
    } else if (score >= 0.34 && Math.abs(score - bestScore) <= 0.001) {
      tie = true
    }
  }
  if (tie) return null
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

/** Preenchimentos e gírias de fala solta — removidos antes de interpretar. */
const FILLERS = new Set([
  'entao',
  'ai',
  'assim',
  'tipo',
  'to',
  'tou',
  'estou',
  'tava',
  'estava',
  'quero',
  'queria',
  'faz',
  'favor',
  'porfavor',
  'beleza',
  'belezinha',
  'blz',
  'ne',
  'opa',
  'ola',
  'oi',
  'tudo',
  'bem',
  'bom',
  'bora',
  'vamos',
  'vamo',
  'cara',
  'mano',
  'poxa',
  'puxa',
  'certo',
  'certinho',
  'ok',
  'okay',
  'hmm',
  'ahn',
  'ham',
  'eh',
  'tah',
  'ta',
  'sera',
  'gente',
  'meudeus',
  'porfavorzinho',
])

const MONTH_NAMES = Object.keys(MONTHS)

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
  'pix',
  'passado',
  'ultimo',
  'centavos',
  'centavo',
  'virgula',
  ...Object.keys(UNITS),
  ...Object.keys(TENS),
  ...Object.keys(HUNDREDS),
  'mil',
  'milhao',
  'milhoes',
  ...MONTH_NAMES,
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
  'pix',
  ...MONTH_NAMES,
])

/** Conectivos residuais que não entram na descrição (fica só o assunto). */
const DESC_CONNECTIVES = new Set([
  'de',
  'do',
  'da',
  'dos',
  'das',
  'na',
  'no',
  'em',
  'valor',
  'pago',
  'paga',
  'pelo',
  'pela',
  'com',
  'por',
  'que',
  'para',
  'e',
  'a',
  'o',
  'os',
  'as',
  'um',
  'uma',
  'uns',
  'umas',
  'meio',
  'foi',
  'sendo',
  'reais',
  'real',
])

/** Remove preenchimentos e ruído de fala solta ("então", "aí", "tô", "né"...). */
const stripFillers = (text: string): string =>
  text
    .split(' ')
    .filter((w) => w.length > 0 && !FILLERS.has(w))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

const ANO_PASSADO_RE = /\b(?:no\s+)?(?:ano\s+passado|ultimo\s+ano)\b/

/**
 * Interpreta a transcrição da fala e devolve o que foi reconhecido.
 * Ordem de consumo: preenchimentos → parcelas → data → valor → conta →
 * tipo → descrição, para que um trecho extraído num campo não vire outro.
 */
export const parseVoiceTransaction = (
  rawTranscript: string,
  accounts: AccountRecord[],
): VoiceParseResult => {
  const transcript = rawTranscript.trim()
  let text = stripFillers(normalizeText(transcript))
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1

  // 1. Parcelamento ("em 10 vezes", "10x", "10 parcelas", "em dez vezes") — antes do valor
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
      new RegExp(`\\b(?:em\\s+)?((?:${NUMBER_WORDS_PATTERN}))\\s*(?:vezes|parcelas)\\b`),
    )
    text = instWords.text
    if (instWords.value) {
      const n = wordToNumber(instWords.value)
      if (n && n > 1 && n <= 48) installments = n
    }
  }

  // 2. Data — "hoje", "ontem", "anteontem", "dia 5", "primeiro de maio",
  //    "5 de novembro", "15/10", "15 de outubro", "… do ano passado"
  let date: string | null = null
  const anoPassado = ANO_PASSADO_RE.test(text)
  text = consume(text, ANO_PASSADO_RE).text
  const yearFor = (): number => (anoPassado ? currentYear - 1 : currentYear)

  const fixed = consume(text, /\b(anteontem|ontem|hoje)\b/)
  text = fixed.text
  if (fixed.value) {
    const d = new Date()
    if (fixed.value === 'ontem') d.setDate(d.getDate() - 1)
    if (fixed.value === 'anteontem') d.setDate(d.getDate() - 2)
    date = buildISODate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  }
  if (!date) {
    const dayAlt = `(\\d{1,2}|primeiro|(?:${NUMBER_WORDS_PATTERN}))`
    const dayRe = new RegExp(`\\b(?:dia\\s+)?(${dayAlt})\\s+de\\s+(${MONTH_NAMES.join('|')})\\b`)
    const dm = dayRe.exec(text)
    const dayNum = dm
      ? dm[1] === 'primeiro'
        ? 1
        : /^\d+$/.test(dm[1])
          ? parseInt(dm[1], 10)
          : wordToNumber(dm[1])
      : null
    if (dm && dayNum && dayNum >= 1 && dayNum <= 31) {
      text = consume(text, dayRe).text
      date = buildISODate(yearFor(), MONTHS[dm[2]], dayNum)
    }
  }
  if (!date) {
    const numRe = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/
    const reNum = numRe.exec(text)
    if (reNum) {
      const day = parseInt(reNum[1], 10)
      const month = parseInt(reNum[2], 10)
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        text = consume(text, numRe).text
        const y = reNum[3] ? parseInt(reNum[3], 10) : yearFor()
        date = buildISODate(y, month, day)
      }
    }
  }
  if (!date) {
    const dayOnly = consume(text, /\bdia\s+(\d{1,2}|primeiro)\b/)
    text = dayOnly.text
    if (dayOnly.value) {
      const day = dayOnly.value === 'primeiro' ? 1 : parseInt(dayOnly.value, 10)
      if (day >= 1 && day <= 31) date = buildISODate(yearFor(), currentMonth, day)
    }
  }

  // 3. Valor — por extenso composto, com centavos e formatos numéricos.
  //    A data já saiu antes, então "dia 5" nunca é confundido com valor.
  let amount: number | null = null
  let cents = 0

  // 3a. "duzentos e cinquenta reais e trinta centavos" / "… reais com 30 centavos"
  //      (o conector pode sumir na pontuação da transcrição: "reais, trinta centavos")
  const reaisCentsRe = new RegExp(
    `\\b((?:${NUMBER_WORDS_PATTERN}))\\s*(?:reais|real)\\s*(?:e|com|virgula)?\\s*((?:${NUMBER_WORDS_PATTERN})|\\d{1,2})\\s*centavos\\b`,
  )
  const rc = reaisCentsRe.exec(text)
  if (rc) {
    text = consume(text, reaisCentsRe).text
    const n = wordToNumber(rc[1])
    const c = /^\d+$/.test(rc[2]) ? parseInt(rc[2], 10) : wordToNumber(rc[2])
    if (n && n > 0) {
      amount = n
      cents = c && c >= 0 && c < 100 ? c : 0
    }
  }
  // 3b. "duzentos reais", "duzentos e cinquenta reais", "dois mil reais"
  if (amount === null) {
    const wordAmount = consume(
      text,
      new RegExp(`\\b((?:${NUMBER_WORDS_PATTERN}))\\s*(?:reais|real)\\b`),
    )
    text = wordAmount.text
    if (wordAmount.value) {
      const n = wordToNumber(wordAmount.value)
      if (n && n > 0) amount = n
    }
  }
  // 3c. centavos por extenso depois do valor: "… reais e trinta centavos"
  if (amount !== null && cents === 0) {
    const centsWords = consume(
      text,
      new RegExp(`\\b(?:e|com|virgula)?\\s*((?:${NUMBER_WORDS_PATTERN}))\\s*centavos\\b`),
    )
    text = centsWords.text
    if (centsWords.value) {
      const c = wordToNumber(centsWords.value)
      if (c !== null && c >= 0 && c < 100) cents = c
    }
  }
  // 3d. "vírgula noventa" / "vírgula 90" — centavos ditos após vírgula
  if (amount !== null && cents === 0) {
    const centsComma = consume(
      text,
      new RegExp(`\\b(?:virgula)\\s+((?:${NUMBER_WORDS_PATTERN})|\\d{1,2})\\b`),
    )
    text = centsComma.text
    if (centsComma.value) {
      const c = /^\d+$/.test(centsComma.value)
        ? parseInt(centsComma.value, 10)
        : wordToNumber(centsComma.value)
      if (c !== null && c >= 0 && c < 100) cents = c
    }
  }
  // 3e. "R$ 2500", "R$1.250,90"
  if (amount === null) {
    const r$ = consume(text, /(?:r\$|rs)\s*([\d.,]+)\b/)
    text = r$.text
    if (r$.value) amount = parseAmountToken(r$.value)
  }
  // 3f. "1.250,90 reais", "250 reais", "89,90 reais"
  if (amount === null) {
    const realSuffix = consume(text, /\b([\d.,]+)\s*(?:reais|real)\b/)
    text = realSuffix.text
    if (realSuffix.value) amount = parseAmountToken(realSuffix.value)
  }
  // 3g. "valor de 250" / "valor 250"
  if (amount === null) {
    const valorPrefix = consume(text, /\bvalor\s+(?:de\s+)?([\d.,]+)\b/)
    text = valorPrefix.text
    if (valorPrefix.value) amount = parseAmountToken(valorPrefix.value)
  }
  // 3h. número com separador explícito: "1.250,90", "89,90", "1250.90", "1.500"
  if (amount === null) {
    const bare = consume(
      text,
      /\b(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{1,2}|\d+\.\d{1,2}|\d{1,3}(?:\.\d{3})+)\b/,
    )
    text = bare.text
    if (bare.value) amount = parseAmountToken(bare.value)
  }
  // 3i. por extenso sem "reais": "mil e duzentos de aluguel", "recebi dois mil do freelance"
  if (amount === null) {
    const wordBare = consume(text, new RegExp(`\\b((?:${NUMBER_WORDS_PATTERN}))\\b`))
    text = wordBare.text
    if (wordBare.value) {
      const n = wordToNumber(wordBare.value)
      if (n && n >= 2) amount = n
    }
  }
  // 3j. inteiro solto ("gastei 80 de água") — por último, após data/parcelas saírem
  if (amount === null) {
    const plain = consume(text, /\b(\d+)\b/)
    text = plain.text
    if (plain.value) amount = parseAmountToken(plain.value)
  }
  if (amount !== null) {
    amount = Math.round((amount + cents / 100) * 100) / 100
  }

  // 4. Conta / meio de pagamento ("no Nubank", "na Caixa", "pelo cartão",
  //    "no cartão X", "pela conta Y", "no PIX do Nubank")
  let accountQuery = ''
  let accountKind: 'card' | 'account' = 'account'
  // 4a. Com a palavra "conta"/"cartão"/"PIX" explícita — pega até 4 palavras do nome.
  const accRe =
    /\b(?:por\s+meio\s+d[oa]|pel[oa]|no|na|em|com|usando)\s+(?:meu|minha\s+)?(conta|cartao|pix)\b(?:\s+d[oe]\s+(?:credito|debito))?(?:\s+d[oa]\s+|\s+de\s+)?\s*([a-z0-9]+(?:\s+[a-z0-9]+){0,3})/
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
    // 4b. Sem nome: "no cartão", "pela conta", "no PIX" — tipo definido, nome vazio.
    const bareKindRe = /\b(?:pel[oa]|no|na|em|com|usando)\s+(?:meu|minha\s+)?(conta|cartao|pix)\b/
    const bareKind = bareKindRe.exec(text)
    if (bareKind) {
      text = consume(text, bareKindRe).text
      accountKind = bareKind[1] === 'cartao' ? 'card' : 'account'
      accountQuery = ''
    } else {
      // 4c. Só o nome: "no Nubank", "na Caixa", "pelo Nubank" — só se casar
      //     claramente com alguma conta real do cadastro.
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
  }
  const matchedAccount = matchAccountByVoice(accountQuery, accountKind, accounts)

  // 5. Tipo (despesa vs receita) — mais verbos e gírias.
  const expenseIdx = text.search(
    /\b(despesa|gasto|gastos|gastei|paguei|pagou|pago|paga|pagos|pagas|comprei|compra|debito|debitou|saiu)\b/,
  )
  const incomeIdx = text.search(
    /\b(receita|recebi|recebimento|recebido|ganhei|ganho|salario|entrada|entrou|vendi|venda|deposito|depositou|depositaram)\b/,
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

  // 6. Descrição: sobram os tokens que não fazem parte da estrutura do comando.
  const descWords = text
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !/^\d+([.,]\d+)?$/.test(w) && !DESCRIPTION_STOPWORDS.has(w))
    .filter((w) => !DESC_CONNECTIVES.has(w))
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
