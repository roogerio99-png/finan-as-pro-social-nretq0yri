import pb from '@/lib/pocketbase/client'

export interface ParsedStatementTransaction {
  date: string // YYYY-MM-DD
  desc: string
  amount: number
  type: 'income' | 'expense'
  installments_total?: number
  installment_index?: number
}

export interface ParsePdfResult {
  ok: boolean
  document_type?: 'invoice' | 'statement'
  bank?: string
  badge?: string // Ex: "Fatura Nubank", "Extrato Banco do Brasil"
  transactions: ParsedStatementTransaction[]
  count: number
}

export const statementParserService = {
  /**
   * Envia o extrato em PDF para o backend Skip Cloud, que converte com
   * $documents.toMarkdown e aplica o parser genérico multi-banco.
   */
  async parsePdf(file: File): Promise<ParsePdfResult> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${pb.baseUrl}/backend/v1/statements/parse-pdf`, {
      method: 'POST',
      headers: {
        ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
      },
      body: formData,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        (response.status === 401
          ? 'Sessão expirada. Faça login novamente para importar extratos.'
          : 'Não foi possível ler o arquivo PDF do extrato.')
      throw new Error(message)
    }

    if (!data?.transactions || !Array.isArray(data.transactions)) {
      throw new Error('Formato de resposta inesperado do servidor.')
    }

    return data as ParsePdfResult
  },

  /**
   * Parse local de arquivos texto/CSV/TSV como fallback caso o usuário prefira.
   */
  parseCsv(text: string): ParsedStatementTransaction[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    const parsed: ParsedStatementTransaction[] = []
    const currMonth = new Date().toISOString().slice(0, 7)

    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase()
      if (i === 0 && (lower.includes('data') || lower.includes('date'))) continue

      const parts = lines[i].split(/[;,]/)
      if (parts.length >= 2) {
        let rawDate = parts[0]?.trim() || `${currMonth}-01`
        // Normaliza dd/mm/aaaa para aaaa-mm-dd se necessário
        const m = rawDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
        if (m) {
          rawDate = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
        }

        const desc = parts[1]?.trim() || 'Lançamento Importado'
        const rawAmount = parts[2]
          ? parseFloat(parts[2].replace(/[R$\s]/g, '').replace(',', '.'))
          : 50
        const amount = isNaN(rawAmount) ? 50 : Math.abs(rawAmount)
        const type = (parts[2] && parts[2].includes('-')) || rawAmount < 0 ? 'expense' : 'income'

        parsed.push({ date: rawDate, desc, amount, type })
      }
    }
    return parsed
  },
}
