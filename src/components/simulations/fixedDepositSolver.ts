// Calculadora do Cidadão (Banco Central, CALFW02): aplicação com depósitos regulares.
// Convenção do BC: o depósito é realizado no INÍCIO do mês (anuidade antecipada), então
// o saldo cresce mês a mês como saldo = (saldo + D) · (1 + i), o que dá
// M = D · [((1 + i)^t − 1) / i] · (1 + i).

export type FixedDepositField = 'months' | 'rate' | 'deposit' | 'final'

export type FixedDepositForm = Record<FixedDepositField, string>

export const FIXED_DEPOSIT_FIELDS: FixedDepositField[] = ['months', 'rate', 'deposit', 'final']

export const FIXED_DEPOSIT_LABELS: Record<FixedDepositField, string> = {
  months: 'Número de meses',
  rate: 'Taxa de juros mensal (%)',
  deposit: 'Valor do depósito regular',
  final: 'Valor obtido ao final',
}

export type FixedDepositOutcome =
  | { ok: true; field: FixedDepositField; value: number }
  | { ok: false; message: string }

const fail = (message: string): FixedDepositOutcome => ({ ok: false, message })

// null = campo vazio; NaN = texto que não é número
export const parseInput = (raw: string): number | null => {
  const s = raw.trim().replace(/\s/g, '')
  if (s === '') return null
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  return Number(normalized)
}

// Fator da anuidade antecipada: [((1 + i)^t − 1) / i] · (1 + i)
const dueFactor = (i: number, t: number): number => {
  if (i === 0) return t
  return ((Math.pow(1 + i, t) - 1) / i) * (1 + i)
}

// Valor final M dado depósito D, taxa i (decimal) e tempo t (meses)
const finalValue = (deposit: number, i: number, t: number): number => deposit * dueFactor(i, t)

// Busca binária da taxa (decimal) que faz o valor final bater com o alvo.
// Espelha a metodologia do BC: aproximação com margem de erro sobre o valor final
// inferior a 0,000001. Retorna null quando a taxa necessária sai da janela.
const solveRate = (
  deposit: number,
  months: number,
  target: number,
): { rate: number } | { error: string } => {
  const atZero = deposit * months // taxa zero: sem rendimento, M = D · t
  if (Math.abs(target - atZero) <= 1e-6 * Math.max(1, Math.abs(target))) return { rate: 0 }
  if (target < atZero) {
    return {
      error:
        'Esses valores não são compatíveis: com depósitos regulares e rendimento a partir de zero, o valor final não fica abaixo do total depositado (D · t).',
    }
  }
  let lo = 1e-9 // ~0,0000001% a.m.
  let hi = 1 // 100% a.m.
  if (finalValue(deposit, hi, months) < target) {
    return { error: 'A taxa de juros necessária para esses valores excede 100% ao mês.' }
  }
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2
    if (finalValue(deposit, mid, months) < target) lo = mid
    else hi = mid
    if (hi - lo < 1e-12) break
  }
  return { rate: (lo + hi) / 2 }
}

export function solveFixedDeposit(form: FixedDepositForm): FixedDepositOutcome {
  const values: Partial<Record<FixedDepositField, number>> = {}
  const empty: FixedDepositField[] = []

  for (const key of FIXED_DEPOSIT_FIELDS) {
    const parsed = parseInput(form[key])
    if (parsed === null) {
      empty.push(key)
      continue
    }
    if (!Number.isFinite(parsed)) {
      return fail(`Informe um número válido em "${FIXED_DEPOSIT_LABELS[key]}".`)
    }
    values[key] = parsed
  }

  if (empty.length === 0) {
    return fail('Os quatro campos estão preenchidos. Deixe apenas um campo vazio para calcular.')
  }
  if (empty.length > 1) {
    return fail(
      `Preencha três dos quatro campos e deixe apenas um vazio. Hoje há ${empty.length} campos vazios: informe exatamente três dados.`,
    )
  }

  const target = empty[0]
  const v = values as Record<FixedDepositField, number>

  if (target !== 'months' && v.months <= 0)
    return fail('O número de meses deve ser maior que zero.')
  if (target !== 'deposit' && v.deposit <= 0)
    return fail('O valor do depósito regular deve ser maior que zero.')
  if (target !== 'final' && v.final <= 0)
    return fail('O valor obtido ao final deve ser maior que zero.')
  if (target !== 'rate' && v.rate < 0) return fail('A taxa de juros mensal não pode ser negativa.')
  if (target !== 'rate' && v.rate >= 100)
    return fail('A taxa de juros mensal deve ser menor que 100% ao mês.')

  let value: number
  switch (target) {
    case 'final':
      value = finalValue(v.deposit, v.rate / 100, v.months)
      break
    case 'deposit': {
      const i = v.rate / 100
      const denominator = (1 + i) * (Math.pow(1 + i, v.months) - 1)
      if (i === 0) {
        value = v.final / v.months
      } else {
        if (!Number.isFinite(denominator) || denominator <= 0) {
          return fail('Não foi possível calcular com esses valores. Revise os dados informados.')
        }
        value = (v.final * i) / denominator
      }
      break
    }
    case 'months': {
      const i = v.rate / 100
      if (i === 0) {
        value = v.final / v.deposit
        break
      }
      // t = ln(M · i / (D · (1 + i)) + 1) / ln(1 + i)
      const t = Math.log((v.final * i) / (v.deposit * (1 + i)) + 1) / Math.log(1 + i)
      if (!Number.isFinite(t) || t <= 0) {
        return fail(
          'Esses valores não são compatíveis: com essa taxa e esse depósito, o valor final não é alcançado.',
        )
      }
      value = t
      break
    }
    case 'rate': {
      const solved = solveRate(v.deposit, v.months, v.final)
      if ('error' in solved) return fail(solved.error)
      value = solved.rate * 100
      break
    }
  }

  if (!Number.isFinite(value) || value < 0) {
    return fail('Não foi possível calcular com esses valores. Revise os dados informados.')
  }
  return { ok: true, field: target, value }
}

// Evolução mês a mês do saldo (depósito no início do mês: saldo = (saldo + D) · (1 + i)),
// para o gráfico — só quando D, i e t são conhecidos.
export function depositSeries(deposit: number, ratePct: number, months: number) {
  const i = ratePct / 100
  const points: { mes: number; montante: number; investido: number }[] = [
    { mes: 0, montante: 0, investido: 0 },
  ]
  let balance = 0
  const total = Math.min(Math.max(Math.ceil(months), 0), 600)
  for (let k = 1; k <= total; k++) {
    balance = (balance + deposit) * (1 + i)
    points.push({ mes: k, montante: balance, investido: deposit * k })
  }
  return points
}
