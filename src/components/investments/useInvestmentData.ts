import { useCallback, useEffect, useState } from 'react'
import {
  investmentsService,
  type InvestmentOperation,
  type InvestmentQuote,
} from '@/services/investments'

export function useInvestmentData() {
  const [operations, setOperations] = useState<InvestmentOperation[]>([])
  const [quotes, setQuotes] = useState<InvestmentQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const [ops, qs] = await Promise.all([
        investmentsService.listOperations(),
        investmentsService.listQuotes(),
      ])
      setOperations(ops)
      setQuotes(qs)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os investimentos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { operations, quotes, loading, error, reload }
}
