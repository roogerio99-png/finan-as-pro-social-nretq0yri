import pb from '@/lib/pocketbase/client'

export interface ParsedStatementTransaction {
  date: string // YYYY-MM-DD
  desc: string
  amount: number
  type: 'income' | 'expense'
  fitId?: string
  installments_total?: number
  installment_index?: number
  card_holder?: string
  raw_memo?: string
}

export interface ParseResult {
  ok: boolean
  document_type?: 'invoice' | 'statement'
  bank?: string
  acctId?: string
  branchId?: string
  badge?: string // Ex: "Extrato Nubank", "Extrato Banco do Brasil", "Fatura Mercado Pago"
  startDate?: string
  endDate?: string
  totalIncome: number
  totalExpense: number
  transactions: ParsedStatementTransaction[]
  count: number
}

export type ParsePdfResult = ParseResult

/**
 * Utilitário para parsear linha de CSV respeitando aspas duplas
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Converte valores em formato brasileiro ou internacional para número
 * Ex: "15.450,15", "-15.000,00", "R$ 1.400,00", "-11.11", "R$ -323,52"
 */
function parseFlexibleAmount(raw: string): number {
  if (!raw) return 0
  let clean = raw.replace(/R\$/g, '').replace(/\s+/g, '').replace(/[()]/g, '').trim()
  const isNegative =
    clean.includes('-') ||
    raw.includes('(-)') ||
    raw.toLowerCase().includes('saída') ||
    raw.toLowerCase().includes('saida') ||
    raw.toLowerCase().includes('debito') ||
    raw.toLowerCase().includes('débito')

  clean = clean.replace(/-/g, '').replace(/\+/g, '').trim()

  if (clean.includes(',') && clean.includes('.')) {
    // Ex: 15.450,15 -> 15450.15
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes(',')) {
    // Ex: 15450,15 -> 15450.15
    clean = clean.replace(',', '.')
  }

  const val = parseFloat(clean)
  if (isNaN(val)) return 0
  return isNegative ? -Math.abs(val) : Math.abs(val)
}

/**
 * Normaliza datas nos formatos DD/MM/AAAA, DD-MM-AAAA, AAAA-MM-DD para YYYY-MM-DD
 */
function normalizeDate(raw: string): string {
  const clean = raw.trim()
  // DD/MM/AAAA ou DD-MM-AAAA
  const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  }
  // AAAA-MM-DD
  const ymd = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`
  }
  // YYYYMMDD (OFX)
  const ofxDate = clean.match(/^(\d{4})(\d{2})(\d{2})/)
  if (ofxDate) {
    return `${ofxDate[1]}-${ofxDate[2]}-${ofxDate[3]}`
  }
  return new Date().toISOString().slice(0, 10)
}

/**
 * Extrai parcelamento da descrição
 * Suporta: "Parcela 2 de 15", "Parcela 4/6", "02/10", etc.
 */
function extractInstallments(text: string): { total?: number; index?: number } {
  // Ex: "Parcela 2 de 15"
  const mDe = text.match(/parcela\s+(\d+)\s+de\s+(\d+)/i)
  if (mDe) {
    return { index: parseInt(mDe[1], 10), total: parseInt(mDe[2], 10) }
  }
  // Ex: "Parcela 4/6"
  const mBarra = text.match(/parcela\s+(\d+)\/(\d+)/i)
  if (mBarra) {
    return { index: parseInt(mBarra[1], 10), total: parseInt(mBarra[2], 10) }
  }
  // Ex: "Compra Smartphone 03/10"
  const mFinal = text.match(/\b(\d{1,2})\/(\d{1,2})\b/)
  if (mFinal) {
    const idx = parseInt(mFinal[1], 10)
    const tot = parseInt(mFinal[2], 10)
    if (idx > 0 && tot >= idx && tot <= 48) {
      return { index: idx, total: tot }
    }
  }
  return {}
}

export const statementParserService = {
  /**
   * Identifica a extensão do arquivo
   */
  detectFileType(filename: string): 'ofx' | 'csv' | 'pdf' | 'unknown' {
    const lower = filename.toLowerCase()
    if (lower.endsWith('.ofx')) return 'ofx'
    if (lower.endsWith('.csv') || lower.endsWith('.txt') || lower.endsWith('.tsv')) return 'csv'
    if (lower.endsWith('.pdf')) return 'pdf'
    return 'unknown'
  },

  /**
   * Parser local e seguro de arquivos OFX (Open Financial Exchange)
   * Suporta extratos bancários (STMTTRNRS) e faturas de cartão (CCSTMTTRNRS).
   */
  parseOfx(text: string): ParseResult {
    const orgMatch = text.match(/<ORG>([^<\r\n]+)/i)
    const bankIdMatch = text.match(/<BANKID>([^<\r\n]+)/i)
    const branchIdMatch = text.match(/<BRANCHID>([^<\r\n]+)/i)
    const acctIdMatch = text.match(/<ACCTID>([^<\r\n]+)/i)

    const org = orgMatch ? orgMatch[1].trim() : ''
    const bankId = bankIdMatch ? bankIdMatch[1].trim() : ''
    const branchId = branchIdMatch ? branchIdMatch[1].trim() : ''
    const acctId = acctIdMatch ? acctIdMatch[1].trim() : ''

    const isCreditCard = text.includes('<CCSTMTTRNRS>') || text.includes('<CCSTMTRS>')
    const document_type: 'invoice' | 'statement' = isCreditCard ? 'invoice' : 'statement'

    // Identificação amigável do banco
    let bank = org
    if (!bank) {
      if (bankId === '0260' || bankId === '260') bank = 'Nubank'
      else if (bankId === '0001' || bankId === '1') bank = 'Banco do Brasil'
      else if (bankId === '0033' || bankId === '33') bank = 'Santander'
      else if (bankId === '0341' || bankId === '341') bank = 'Itaú'
      else if (bankId === '0237' || bankId === '237') bank = 'Bradesco'
      else if (bankId === '0077' || bankId === '77') bank = 'Inter'
      else if (bankId === '0336' || bankId === '336') bank = 'C6 Bank'
      else if (bankId === '0323' || bankId === '323') bank = 'Mercado Pago'
      else bank = 'Extrato Bancário'
    } else if (org.toUpperCase().includes('NU PAGAMENTOS') || org.toUpperCase().includes('NUBANK')) {
      bank = 'Nubank'
    } else if (org.toUpperCase().includes('BANCO DO BRASIL') || org.toUpperCase().includes('BCO DO BRASIL')) {
      bank = 'Banco do Brasil'
    }

    const badge = `${isCreditCard ? 'Fatura' : 'Extrato'} ${bank}${acctId ? ` - Conta ${acctId}` : ''}`

    // Regex flexível para capturar blocos <STMTTRN> com ou sem fechamento </STMTTRN> (OFX SGML / XML)
    const trnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>|<\/CCBANKTRANLIST>)|$)/gi
    const transactions: ParsedStatementTransaction[] = []
    let totalIncome = 0
    let totalExpense = 0
    let match: RegExpExecArray | null

    while ((match = trnRegex.exec(text)) !== null) {
      const block = match[1]
      if (!block || !block.trim()) continue

      const dtMatch = block.match(/<DTPOSTED>(\d{8})/i)
      const amtMatch = block.match(/<TRNAMT>([+-]?[\d.]+)/i)
      const fitidMatch = block.match(/<FITID>([^<\r\n]+)/i)
      const memoMatch = block.match(/<MEMO>([^<\r\n]+)/i)
      const trnTypeMatch = block.match(/<TRNTYPE>([^<\r\n]+)/i)

      if (dtMatch && amtMatch) {
        const rawDate = dtMatch[1]
        const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        const rawAmt = parseFloat(amtMatch[1])
        const trnType = trnTypeMatch ? trnTypeMatch[1].trim().toUpperCase() : ''
        const isExpense = rawAmt < 0 || trnType === 'DEBIT'
        const amount = Math.abs(rawAmt)
        const desc = memoMatch ? memoMatch[1].trim() : 'Lançamento OFX'
        const fitId = fitidMatch ? fitidMatch[1].trim() : undefined

        const inst = extractInstallments(desc)

        if (isExpense) {
          totalExpense += amount
        } else {
          totalIncome += amount
        }

        transactions.push({
          date,
          desc,
          amount,
          type: isExpense ? 'expense' : 'income',
          fitId,
          installments_total: inst.total,
          installment_index: inst.index,
          raw_memo: desc,
        })
      }
    }

    const dates = transactions.map((t) => t.date).sort()
    const startDate = dates[0]
    const endDate = dates[dates.length - 1]

    return {
      ok: true,
      document_type,
      bank,
      acctId,
      branchId,
      badge,
      startDate,
      endDate,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      transactions,
      count: transactions.length,
    }
  },

  /**
   * Parser inteligente de arquivos CSV de extratos e faturas.
   * Auto-detecta os formatos de Nubank, Banco do Brasil, Mercado Pago e outros bancos.
   */
  parseCsv(text: string): ParseResult {
    const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (rawLines.length === 0) {
      return {
        ok: false,
        totalIncome: 0,
        totalExpense: 0,
        transactions: [],
        count: 0,
      }
    }

    // Auto-detecção de delimitador (, ou ; ou \t)
    const sample = rawLines.slice(0, 5).join('\n')
    const countComma = (sample.match(/,/g) || []).length
    const countSemi = (sample.match(/;/g) || []).length
    const countTab = (sample.match(/\t/g) || []).length
    let delimiter = ','
    if (countSemi > countComma && countSemi > countTab) delimiter = ';'
    else if (countTab > countComma && countTab > countSemi) delimiter = '\t'

    const header = parseCsvLine(rawLines[0], delimiter).map((h) =>
      h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(),
    )

    let bank = 'Extrato Bancário'
    let badge = 'Arquivo CSV'
    let document_type: 'invoice' | 'statement' = 'statement'

    // 1. Detecção do formato Nubank CSV
    // Cabeçalho: Data, Valor, Identificador, Descrição
    const isNubank =
      header.includes('identificador') &&
      header.includes('valor') &&
      header.includes('data') &&
      header.some((h) => h.includes('descri'))

    // 2. Detecção do formato Banco do Brasil CSV
    // Cabeçalho: Data, Lançamento, Detalhes, N° documento, Valor, Tipo Lançamento
    const isBancoDoBrasil =
      header.includes('lancamento') ||
      (header.includes('detalhes') && header.includes('tipo lancamento'))

    // 3. Detecção do formato Mercado Pago CSV / Extrato
    // Cabeçalho: Data, Descrição, ID da operação, Valor, Saldo
    const isMercadoPago =
      header.includes('id da operacao') ||
      header.some((h) => h.includes('operacao') || h.includes('cofrinho'))

    if (isNubank) {
      bank = 'Nubank'
      badge = 'Extrato Nubank (CSV)'
    } else if (isBancoDoBrasil) {
      bank = 'Banco do Brasil'
      badge = 'Extrato Banco do Brasil (CSV)'
    } else if (isMercadoPago) {
      bank = 'Mercado Pago'
      badge = 'Extrato Mercado Pago (CSV)'
    }

    const transactions: ParsedStatementTransaction[] = []
    let totalIncome = 0
    let totalExpense = 0

    // Mapeamento dinâmico de índices de colunas
    const dateIdx = header.findIndex((h) => h.includes('data') || h.includes('date'))
    const valueIdx = header.findIndex((h) => h.includes('valor') || h.includes('amount') || h.includes('value'))
    const descIdx = header.findIndex((h) => h.includes('descri') || h.includes('historico') || h.includes('lancamento'))
    const detailsIdx = header.findIndex((h) => h.includes('detalhes'))
    const idIdx = header.findIndex((h) => h.includes('identificador') || h.includes('documento') || h.includes('id'))
    const typeIdx = header.findIndex((h) => h.includes('tipo'))

    for (let i = 1; i < rawLines.length; i++) {
      const parts = parseCsvLine(rawLines[i], delimiter)
      if (parts.length < 2) continue

      if (isBancoDoBrasil) {
        // Regra especial BB: ignora linhas de conferência de saldo
        const title = (parts[descIdx !== -1 ? descIdx : 1] || '').trim()
        if (
          !title ||
          /^saldo/i.test(title) ||
          /^s\s*a\s*l\s*d\s*o/i.test(title) ||
          title.toLowerCase() === 'saldo anterior'
        ) {
          continue
        }

        const date = normalizeDate(parts[dateIdx !== -1 ? dateIdx : 0])
        const details = detailsIdx !== -1 && parts[detailsIdx] ? parts[detailsIdx].trim() : ''
        const desc = details ? `${title} - ${details}` : title
        const rawAmt = parseFlexibleAmount(parts[valueIdx !== -1 ? valueIdx : 4])
        const tipo = typeIdx !== -1 ? parts[typeIdx].toLowerCase() : ''
        const isExpense = tipo.includes('saida') || tipo.includes('saída') || rawAmt < 0
        const amount = Math.abs(rawAmt)
        const fitId = idIdx !== -1 && parts[idIdx] ? parts[idIdx].trim() : undefined

        const inst = extractInstallments(desc)

        if (isExpense) totalExpense += amount
        else totalIncome += amount

        transactions.push({
          date,
          desc,
          amount,
          type: isExpense ? 'expense' : 'income',
          fitId,
          installments_total: inst.total,
          installment_index: inst.index,
          raw_memo: desc,
        })
      } else if (isNubank) {
        // Regra especial Nubank CSV: Data, Valor, Identificador, Descrição
        const date = normalizeDate(parts[0])
        const rawAmt = parseFloat(parts[1])
        if (isNaN(rawAmt)) continue

        const isExpense = rawAmt < 0
        const amount = Math.abs(rawAmt)
        const fitId = parts[2]?.trim()
        const desc = parts[3]?.trim() || 'Lançamento Nubank'

        const inst = extractInstallments(desc)

        if (isExpense) totalExpense += amount
        else totalIncome += amount

        transactions.push({
          date,
          desc,
          amount,
          type: isExpense ? 'expense' : 'income',
          fitId,
          installments_total: inst.total,
          installment_index: inst.index,
          raw_memo: desc,
        })
      } else if (isMercadoPago) {
        // Regra especial Mercado Pago: Data, Descrição, ID, Valor
        const date = normalizeDate(parts[0])
        const desc = parts[1]?.trim() || 'Lançamento Mercado Pago'
        const fitId = parts[2]?.trim()
        const rawAmt = parseFlexibleAmount(parts[3])
        const isExpense = rawAmt < 0
        const amount = Math.abs(rawAmt)

        const inst = extractInstallments(desc)

        if (isExpense) totalExpense += amount
        else totalIncome += amount

        transactions.push({
          date,
          desc,
          amount,
          type: isExpense ? 'expense' : 'income',
          fitId,
          installments_total: inst.total,
          installment_index: inst.index,
          raw_memo: desc,
        })
      } else {
        // Parser Genérico inteligente
        const rawDate = dateIdx !== -1 ? parts[dateIdx] : parts[0]
        const date = normalizeDate(rawDate)

        let desc = descIdx !== -1 ? parts[descIdx] : parts[1] || 'Lançamento Importado'
        if (detailsIdx !== -1 && parts[detailsIdx]) {
          desc += ` - ${parts[detailsIdx]}`
        }

        // Ignora linhas de saldo em extratos genéricos
        if (/^saldo/i.test(desc) || /^s\s*a\s*l\s*d\s*o/i.test(desc)) continue

        const valStr = valueIdx !== -1 ? parts[valueIdx] : parts[2] || '0'
        const rawAmt = parseFlexibleAmount(valStr)
        const isExpense = rawAmt < 0 || (typeIdx !== -1 && parts[typeIdx].toLowerCase().includes('deb'))
        const amount = Math.abs(rawAmt)
        if (amount === 0) continue

        const fitId = idIdx !== -1 ? parts[idIdx]?.trim() : undefined
        const inst = extractInstallments(desc)

        if (isExpense) totalExpense += amount
        else totalIncome += amount

        transactions.push({
          date,
          desc,
          amount,
          type: isExpense ? 'expense' : 'income',
          fitId,
          installments_total: inst.total,
          installment_index: inst.index,
          raw_memo: desc,
        })
      }
    }

    const dates = transactions.map((t) => t.date).sort()
    const startDate = dates[0]
    const endDate = dates[dates.length - 1]

    return {
      ok: true,
      document_type,
      bank,
      badge,
      startDate,
      endDate,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      transactions,
      count: transactions.length,
    }
  },

  /**
   * Envia o extrato em PDF para o backend Skip Cloud, que converte com
   * $documents.toMarkdown e aplica o parser genérico multi-banco.
   */
  async parsePdf(file: File): Promise<ParseResult> {
    const formData = new FormData()
    formData.append('file', file)

    let response: Response | null = null
    try {
      response = await fetch(`${pb.baseUrl || ''}/backend/v1/statements/parse-pdf`, {
        method: 'POST',
        headers: {
          ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
        },
        body: formData,
      })
    } catch {
      throw new Error(
        'Serviço de extração de PDF indisponível offline. Você pode exportar seu extrato em formato OFX ou CSV no banco para importar instantaneamente.',
      )
    }

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      if (!pb.baseUrl || response.status === 404) {
        throw new Error(
          'O leitor de PDF requer conexão com o backend. Recomendamos exportar o extrato no app do banco como OFX ou CSV para leitura 100% offline e instantânea.',
        )
      }
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

    const rawTxs: ParsedStatementTransaction[] = data.transactions
    let totalIncome = 0
    let totalExpense = 0
    for (const t of rawTxs) {
      if (t.type === 'expense') totalExpense += t.amount
      else totalIncome += t.amount
    }

    return {
      ok: true,
      document_type: data.document_type || 'statement',
      bank: data.bank,
      badge: data.badge || (data.bank ? `${data.document_type === 'invoice' ? 'Fatura' : 'Extrato'} ${data.bank}` : 'Documento PDF'),
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      transactions: rawTxs,
      count: rawTxs.length,
    }
  },
}
