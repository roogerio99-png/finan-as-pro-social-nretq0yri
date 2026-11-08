/**
 * Módulo de Matemática Financeira e Conversão de Entradas para Simulações
 * Suporta formatos numéricos brasileiros (ex: 1.000,00 ou 1000 ou 1.000 ou 1,5%)
 * e cálculos rigorosos de juros simples e compostos.
 */

export type RatePeriod = 'mensal' | 'anual'
export type TimePeriod = 'meses' | 'anos'
export type DepositTiming = 'fim' | 'inicio'

/**
 * Converte qualquer entrada numérica do usuário (pt-BR ou en-US) para número float seguro.
 * Lida com separadores de milhar (ponto) e decimais (vírgula ou ponto).
 * Ex: "1.000" -> 1000, "1.000,00" -> 1000, "10.500,50" -> 10500.5, "1,05" -> 1.05
 */
export const parseFinancialInput = (raw: string | number | null | undefined): number => {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : 0
  if (!raw) return 0
  let s = String(raw).trim().replace(/\s/g, '').replace(/R\$/g, '')
  if (!s) return 0

  // Se tiver vírgula (padrão brasileiro: "1.234,56", "1000,00", "1,5")
  if (s.includes(',')) {
    // Remove os pontos de milhar e troca vírgula por ponto
    s = s.replace(/\./g, '').replace(',', '.')
    const n = parseFloat(s)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }

  // Se não tem vírgula, mas tem ponto (ex: "1.000" ou "10.000" ou "1.000.000" ou "1.5")
  if (s.includes('.')) {
    const parts = s.split('.')
    // Múltiplos pontos: pontos de milhar garantidos (ex: "1.000.000")
    if (parts.length > 2) {
      s = parts.join('')
      const n = parseFloat(s)
      return Number.isFinite(n) && n >= 0 ? n : 0
    }
    // Apenas 1 ponto:
    // Se a parte após o ponto tiver exatamente 3 dígitos (ex: "1.000", "10.000", "50.000"),
    // no contexto financeiro brasileiro trata-se de milhar.
    if (parts[1].length === 3 && parts[0].length >= 1) {
      s = parts.join('')
      const n = parseFloat(s)
      return Number.isFinite(n) && n >= 0 ? n : 0
    }
    // Caso contrário (ex: "1.5" ou "12.75"), trata como decimal
    const n = parseFloat(s)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }

  const n = parseFloat(s)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/**
 * Converte taxa de juros para taxa mensal equivalente (regime composto)
 * i_mensal = (1 + i_anual)^(1/12) - 1
 */
export const monthlyCompoundRate = (ratePercent: number, period: RatePeriod): number => {
  if (ratePercent <= 0) return 0
  return period === 'mensal'
    ? ratePercent / 100
    : Math.pow(1 + ratePercent / 100, 1 / 12) - 1
}

/**
 * Converte taxa de juros para taxa mensal linear (regime simples)
 * i_mensal = i_anual / 12
 */
export const monthlySimpleRate = (ratePercent: number, period: RatePeriod): number => {
  if (ratePercent <= 0) return 0
  return period === 'mensal'
    ? ratePercent / 100
    : ratePercent / 12 / 100
}

/**
 * Calcula o tempo para dobrar o capital pela Regra dos 72 com precisão
 * Retorna os anos e os meses equivalentes.
 */
export const calculateRuleOf72 = (monthlyRate: number): { years: number; months: number } | null => {
  if (monthlyRate <= 0) return null
  // Taxa anual equivalente
  const annualRatePercent = (Math.pow(1 + monthlyRate, 12) - 1) * 100
  if (annualRatePercent <= 0) return null

  // Regra dos 72: 72 / taxa_anual dá o tempo em ANOS
  const years = 72 / annualRatePercent
  const months = years * 12

  return { years, months }
}
