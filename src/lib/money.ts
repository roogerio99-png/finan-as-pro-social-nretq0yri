/**
 * Utilitário de Precisão Monetária (Aritmética em Centavos Inteiros)
 * Garante representação exata de valores financeiros, regras determinísticas de arredondamento
 * e divisão exata de parcelas sem sobras ou perdas de centavos.
 */

export const MAX_MONETARY_AMOUNT = 999_999_999.99 // Limite máximo de segurança por operação (~1 bilhão)

/**
 * Converte um valor decimal em reais (R$) para centavos inteiros (ex: 10.55 -> 1055)
 */
export function toCents(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined || amount === '') return 0
  const num = typeof amount === 'number' ? amount : Number(String(amount).replace(',', '.'))
  if (!Number.isFinite(num)) return 0
  return Math.round(num * 100)
}

/**
 * Converte centavos inteiros para valor decimal exato com 2 casas (ex: 1055 -> 10.55)
 */
export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) return 0
  return Math.round(cents) / 100
}

/**
 * Arredonda um número para 2 casas decimais passando por centavos inteiros
 */
export function roundMoney(amount: number): number {
  return fromCents(toCents(amount))
}

/**
 * Soma exata de dois ou mais valores monetários em centavos inteiros
 */
export function sumMoney(
  ...amounts: (number | null | undefined | (number | null | undefined)[])[]
): number {
  let totalCents = 0
  for (const item of amounts) {
    if (Array.isArray(item)) {
      for (const val of item) {
        totalCents += toCents(val)
      }
    } else {
      totalCents += toCents(item)
    }
  }
  return fromCents(totalCents)
}

/**
 * Subtração exata de dois valores monetários em centavos inteiros (a - b)
 */
export function subtractMoney(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b))
}

/**
 * Divide um valor total em N parcelas exatas em centavos inteiros.
 * Eventual resíduo de centavos (ex: R$ 100,00 / 3 = 33,34 + 33,33 + 33,33)
 * é alocado na primeira parcela para que a soma das parcelas seja 100% idêntica ao total.
 */
export function splitInstallmentsExact(totalAmount: number, installmentsCount: number): number[] {
  const count = Math.max(1, Math.min(360, Math.floor(installmentsCount || 1)))
  const totalCents = toCents(totalAmount)
  const baseInstallmentCents = Math.trunc(totalCents / count)
  const remainderCents = totalCents - baseInstallmentCents * count

  const result: number[] = []
  for (let i = 0; i < count; i++) {
    const cents = i === 0 ? baseInstallmentCents + remainderCents : baseInstallmentCents
    result.push(fromCents(cents))
  }
  return result
}
