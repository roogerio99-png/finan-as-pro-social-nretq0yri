import { parseFinancialInput } from './simulationMath'

// Calculadora do Cidadão (Banco Central, CALFW05): valor futuro de um capital.
// Fórmula dos juros compostos M = C · (1 + i)^t. Preenche-se três campos e o quarto é calculado.

export type FutureValueField = 'months' | 'rate' | 'capital' | 'final'

export type FutureValueForm = Record<FutureValueField, string>

export const FUTURE_VALUE_FIELDS: FutureValueField[] = ['months', 'rate', 'capital', 'final']

export const FUTURE_VALUE_LABELS: Record<FutureValueField, string> = {
  months: 'Número de meses',
  rate: 'Taxa de juros mensal (%)',
  capital: 'Capital atual',
  final: 'Valor obtido ao final',
}

export type SolveOutcome =
  | { ok: true; field: FutureValueField; value: number }
  | { ok: false; message: string }

const fail = (message: string): SolveOutcome => ({ ok: false, message })

// null = campo vazio; NaN = texto que não é número
export const parseInput = (raw: string): number | null => {
  const s = raw.trim().replace(/\s/g, '').replace(/R\$/g, '')
  if (s === '') return null
  const n = parseFinancialInput(s)
  return Number.isFinite(n) ? n : NaN
}

export function solveFutureValue(form: FutureValueForm): SolveOutcome {
  const values: Partial<Record<FutureValueField, number>> = {}
  const empty: FutureValueField[] = []

  for (const key of FUTURE_VALUE_FIELDS) {
    const parsed = parseInput(form[key])
    if (parsed === null) {
      empty.push(key)
      continue
    }
    if (!Number.isFinite(parsed)) {
      return fail(`Informe um número válido em "${FUTURE_VALUE_LABELS[key]}".`)
    }
    values[key] = parsed
  }

  if (empty.length === 0) {
    return fail('Os quatro campos estão preenchidos. Deixe apenas um campo vazio para calcular.')
  }
  if (empty.length > 1) {
    return fail(
      `Preencha três dos quatro campos e deixe apenas um vazio. Hoje há ${empty.length} campos vazios.`,
    )
  }

  const target = empty[0]
  const v = values as Record<FutureValueField, number>

  if (target !== 'months' && v.months <= 0)
    return fail('O número de meses deve ser maior que zero.')
  if (target !== 'capital' && v.capital <= 0)
    return fail('O capital atual deve ser maior que zero.')
  if (target !== 'final' && v.final <= 0)
    return fail('O valor obtido ao final deve ser maior que zero.')
  if (target !== 'rate' && v.rate <= -100) {
    return fail('A taxa de juros mensal deve ser maior que −100%.')
  }

  let value: number
  switch (target) {
    case 'final':
      value = v.capital * Math.pow(1 + v.rate / 100, v.months)
      break
    case 'capital':
      value = v.final / Math.pow(1 + v.rate / 100, v.months)
      break
    case 'rate':
      // i = (M/C)^(1/t) − 1, em percentual
      value = (Math.pow(v.final / v.capital, 1 / v.months) - 1) * 100
      break
    case 'months': {
      if (v.rate === 0) {
        return fail(
          'Com taxa zero o capital não cresce, então não é possível calcular o número de meses.',
        )
      }
      // t = ln(M/C) / ln(1 + i)
      const t = Math.log(v.final / v.capital) / Math.log(1 + v.rate / 100)
      if (!Number.isFinite(t) || t <= 0) {
        return fail(
          'Esses valores não são compatíveis: com essa taxa, o valor final não é alcançado a partir do capital informado.',
        )
      }
      value = t
      break
    }
  }

  if (!Number.isFinite(value)) {
    return fail('Não foi possível calcular com esses valores. Revise os dados informados.')
  }
  return { ok: true, field: target, value }
}

// Evolução mês a mês do montante, para o gráfico (só com C, i e t conhecidos)
export function growthSeries(capital: number, ratePct: number, months: number) {
  const i = ratePct / 100
  const points: { mes: number; montante: number }[] = []
  const total = Math.min(Math.max(Math.ceil(months), 0), 600)
  for (let k = 0; k <= total; k++) {
    points.push({ mes: k, montante: capital * Math.pow(1 + i, k) })
  }
  return points
}
