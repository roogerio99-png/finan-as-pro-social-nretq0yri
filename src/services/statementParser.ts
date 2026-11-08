import pb from '@/lib/pocketbase/client'
import * as XLSX from 'xlsx'
import { TransactionType } from '@/types/finance'

export interface ParsedStatementTransaction {
  date: string // YYYY-MM-DD
  desc: string
  amount: number
  type: TransactionType
  direction?: 'in' | 'out'
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
 * Ex: "15.450,15", "-15.000,00", "R$ 1.400,00", "-11.11", 15450.15, -15000
 */
function parseFlexibleAmount(raw: any): number {
  if (typeof raw === 'number') return raw
  if (!raw) return 0
  let clean = String(raw).replace(/R\$/g, '').replace(/\s+/g, '').replace(/[()]/g, '').trim()
  const isNegative =
    clean.includes('-') ||
    String(raw).includes('(-)') ||
    String(raw).toLowerCase().includes('saída') ||
    String(raw).toLowerCase().includes('saida') ||
    String(raw).toLowerCase().includes('debito') ||
    String(raw).toLowerCase().includes('débito')

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
 * Normaliza datas nos formatos DD/MM/AAAA, DD-MM-AAAA, AAAA-MM-DD ou serial do Excel para YYYY-MM-DD
 */
function normalizeDate(raw: any): string {
  if (typeof raw === 'number') {
    // Número de data serial do Excel (ex: 45566 -> 2024-10-01)
    const dateObj = new Date(Math.round((raw - 25569) * 86400 * 1000))
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().slice(0, 10)
    }
  }
  const clean = String(raw || '').trim().replace(/['"]/g, '')
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
 * Normaliza células de cabeçalho para comparação flexível
 */
function normalizeHeaderCell(cell: any): string {
  return String(cell || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
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

/**
 * Motor central de parsing de dados tabulares (compartilhado entre Excel e CSV)
 */
function parseTableRows(rows: any[][], formatHint: 'Excel' | 'CSV' = 'CSV'): ParseResult {
  if (!rows || rows.length === 0) {
    return { ok: false, totalIncome: 0, totalExpense: 0, transactions: [], count: 0 }
  }

  let headerRowIndex = -1
  let dateIdx = -1
  let valueIdx = -1
  let descIdx = -1
  let detailsIdx = -1
  let idIdx = -1
  let typeIdx = -1

  for (let r = 0; r < Math.min(rows.length, 25); r++) {
    const row = rows[r]
    if (!Array.isArray(row)) continue
    const normRow = row.map(normalizeHeaderCell)
    const dIdx = normRow.findIndex((c) => c.includes('data') || c.includes('date'))
    const vIdx = normRow.findIndex((c) => c.includes('valor') || c.includes('amount') || c.includes('value') || c.includes('val'))
    const dsIdx = normRow.findIndex(
      (c) =>
        c.includes('lancamento') ||
        c.includes('lanamento') ||
        c.includes('descri') ||
        c.includes('historico'),
    )

    if (dIdx !== -1 && (vIdx !== -1 || dsIdx !== -1)) {
      headerRowIndex = r
      dateIdx = dIdx
      valueIdx = vIdx
      descIdx = dsIdx !== -1 ? dsIdx : normRow.findIndex((c) => c.includes('detalhe'))
      detailsIdx = normRow.findIndex((c) => c.includes('detalhe') && c !== normRow[descIdx])
      idIdx = normRow.findIndex((c) => c.includes('identificador') || c.includes('documento') || c.includes('id'))
      typeIdx = normRow.findIndex((c) => c.includes('tipo'))
      break
    }
  }

  // Fallback se não encontrar cabeçalho explícito: assume coluna 0 data, coluna 1 descrição, coluna 2 ou 4 valor
  if (headerRowIndex === -1) {
    headerRowIndex = 0
    dateIdx = 0
    descIdx = 1
    valueIdx = rows[0] && rows[0].length >= 5 ? 4 : 2
  }

  const normHeader = (rows[headerRowIndex] || []).map(normalizeHeaderCell)
  const isBancoDoBrasil =
    normHeader.some((h) => h.includes('lancamento') || h.includes('lanamento') || /lan.*amento/.test(h)) ||
    (normHeader.some((h) => h.includes('detalhe')) && normHeader.some((h) => h.includes('tipo')))
  const isNubank =
    normHeader.some((h) => h.includes('identificador')) &&
    normHeader.some((h) => h.includes('valor')) &&
    normHeader.some((h) => h.includes('data'))
  const isMercadoPago =
    normHeader.some((h) => h.includes('operacao') || h.includes('cofrinho') || h.includes('mercadopago'))

  let bank = 'Extrato Bancário'
  let badge = `Extrato (${formatHint})`
  const document_type: 'invoice' | 'statement' = 'statement'

  if (isBancoDoBrasil) {
    bank = 'Banco do Brasil'
    badge = `Extrato Banco do Brasil (${formatHint})`
  } else if (isNubank) {
    bank = 'Nubank'
    badge = `Extrato Nubank (${formatHint})`
  } else if (isMercadoPago) {
    bank = 'Mercado Pago'
    badge = `Extrato Mercado Pago (${formatHint})`
  }

  const transactions: ParsedStatementTransaction[] = []
  let totalIncome = 0
  let totalExpense = 0

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r]
    if (!Array.isArray(row) || row.length < 2) continue

    const title = String(row[descIdx !== -1 ? descIdx : 1] || '').trim()
    if (!title) continue

    // Ignora linhas de saldo e fechamento
    if (
      /^saldo/i.test(title) ||
      /^s\s*a\s*l\s*d\s*o/i.test(title) ||
      title.toLowerCase() === 'saldo anterior' ||
      title.toLowerCase() === 'saldo do dia'
    ) {
      continue
    }

    const date = normalizeDate(row[dateIdx !== -1 ? dateIdx : 0])
    const details = detailsIdx !== -1 && row[detailsIdx] ? String(row[detailsIdx]).trim() : ''
    const desc = details ? `${title} - ${details}` : title

    const rawAmt = parseFlexibleAmount(row[valueIdx !== -1 ? valueIdx : 4])
    const tipo = typeIdx !== -1 ? String(row[typeIdx]).trim().toLowerCase() : ''

    // Regra estrita de Débito vs Crédito (Entrada vs Saída)
    let isExpense = false
    if (
      tipo.includes('entrada') ||
      tipo.includes('credito') ||
      tipo.includes('crédito') ||
      tipo === 'c' ||
      tipo === 'deposito'
    ) {
      isExpense = false
    } else if (
      tipo.includes('saida') ||
      tipo.includes('saída') ||
      tipo.includes('debito') ||
      tipo.includes('débito') ||
      tipo === 'd'
    ) {
      isExpense = true
    } else {
      isExpense = rawAmt < 0
    }

    const amount = Math.abs(rawAmt)
    if (amount === 0) continue

    const fitId = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : undefined
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

  const dates = transactions.map((t) => t.date).sort()
  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

  return {
    ok: transactions.length > 0,
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
}

export const statementParserService = {
  /**
   * Identifica a extensão do arquivo
   */
  detectFileType(filename: string): 'ofx' | 'csv' | 'excel' | 'pdf' | 'unknown' {
    const lower = filename.toLowerCase()
    if (lower.endsWith('.ofx')) return 'ofx'
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'excel'
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
   * Parser inteligente de planilhas Excel (.xlsx, .xls)
   * Suporta arquivos exportados de bancos e operadoras de cartão.
   */
  parseExcel(data: ArrayBuffer | Uint8Array): ParseResult {
    try {
      const wb = XLSX.read(data, { type: 'array' })
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        return {
          ok: false,
          totalIncome: 0,
          totalExpense: 0,
          transactions: [],
          count: 0,
        }
      }
      const firstSheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1 })
      return parseTableRows(rows, 'Excel')
    } catch (err: any) {
      console.error('[statementParser] Erro ao processar planilha Excel:', err)
      return {
        ok: false,
        totalIncome: 0,
        totalExpense: 0,
        transactions: [],
        count: 0,
      }
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

    const rows = rawLines.map((line) => parseCsvLine(line, delimiter))
    return parseTableRows(rows, 'CSV')
  },

  /**
   * Parser nativo e inteligente de extratos e faturas em PDF (Nubank, BB, Mercado Pago e outros).
   * Processa 100% no cliente sem depender de backend.
   */
  async parsePdfClient(buffer: ArrayBuffer | Uint8Array): Promise<ParseResult> {
    const pdfjs = await import('pdfjs-dist')
    if (typeof window !== 'undefined' && pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
      try {
        const workerModule = await import('pdfjs-dist/build/pdf.worker.mjs?url')
        pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default
      } catch {
        // Fallback fake worker
      }
    }

    const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    const doc = await pdfjs.getDocument({ data }).promise

    const allLines: string[] = []
    let fullHeader = ''

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const content = await page.getTextContent()
      const linesMap = new Map<number, { str: string; x: number }[]>()
      for (const item of content.items as any[]) {
        if (!item.str || !item.str.trim()) continue
        const y = Math.round(item.transform[5] / 4) * 4
        if (!linesMap.has(y)) linesMap.set(y, [])
        linesMap.get(y)!.push({ str: item.str, x: item.transform[4] })
      }
      const sortedY = [...linesMap.keys()].sort((a, b) => b - a)
      for (const y of sortedY) {
        const lineItems = linesMap.get(y)!.sort((a, b) => a.x - b.x)
        const lineText = lineItems.map((i) => i.str).join(' ').trim()
        if (lineText) {
          allLines.push(lineText)
          if (p <= 2) fullHeader += ' ' + lineText
        }
      }
    }

    const MONTH_MAP: Record<string, string> = {
      JAN: '01', FEV: '02', MAR: '03', ABR: '04', MAI: '05', JUN: '06',
      JUL: '07', AGO: '08', SET: '09', OUT: '10', NOV: '11', DEZ: '12',
    }

    let bank: string | undefined = undefined
    let document_type: 'statement' | 'invoice' = 'statement'
    let year = new Date().getFullYear()

    const yearMatch = fullHeader.match(/20\d{2}/)
    if (yearMatch) year = parseInt(yearMatch[0], 10)

    const isNubank = /nubank/i.test(fullHeader) || /nutag/i.test(allLines.join(' '))
    const isBB = /banco do brasil|agência:\s*\d{3,4}-\d/i.test(fullHeader) || allLines.some((l) => /extrato de conta corrente/i.test(l))
    const isMP = /mercado\s*pago|mercadolivre/i.test(fullHeader)

    if (isNubank) {
      bank = 'Nubank'
      document_type = 'invoice'
    } else if (isBB) {
      bank = 'Banco do Brasil'
      document_type = 'statement'
    } else if (isMP) {
      bank = 'Mercado Pago'
      document_type = allLines.some((l) => /detalhes de consumo|movimentações na fatura/i.test(l)) ? 'invoice' : 'statement'
    }

    const transactions: ParsedStatementTransaction[] = []

    for (const line of allLines) {
      const lower = line.toLowerCase()
      if (
        lower.includes('saldo anterior') ||
        lower.includes('saldo do dia') ||
        lower.includes('s a l d o') ||
        lower.includes('saldo inicial') ||
        lower.includes('saldo final') ||
        lower.includes('limite cheque') ||
        lower.includes('custo efetivo') ||
        lower.includes('total a pagar') ||
        lower.includes('pagamento mínimo')
      ) {
        continue
      }

      // 1. Banco do Brasil Extrato
      const bbMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(?:(?:\d+)\s+)?(?:(?:\d+)\s+)?(.+?)\s+([\d.,]+)\s*\(([+-])\)$/)
      if (bbMatch) {
        bank = bank || 'Banco do Brasil'
        document_type = 'statement'
        const [, dStr, desc, valStr, sign] = bbMatch
        const [day, mon, yr] = dStr.split('/')
        const amt = parseFloat(valStr.replace(/\./g, '').replace(',', '.'))
        if (amt > 0) {
          const inst = extractInstallments(desc)
          transactions.push({
            date: `${yr}-${mon}-${day}`,
            desc: desc.trim(),
            amount: amt,
            type: sign === '+' ? 'income' : 'expense',
            installments_total: inst.total,
            installment_index: inst.index,
          })
          continue
        }
      }

      // 2. Nubank Fatura
      const nuMatch = line.match(/^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(?:••••\s*\d{4}\s+)?(?:Transação de\s+)?(.+?)\s+([−-]?\s*R\$\s*[\d.,]+)$/i)
      if (nuMatch) {
        bank = bank || 'Nubank'
        document_type = 'invoice'
        const [, day, monStr, desc, valStr] = nuMatch
        const mon = MONTH_MAP[monStr.toUpperCase()]
        const cleanVal = valStr.replace(/R\$/g, '').replace(/\s+/g, '').replace(/\./g, '').replace(',', '.')
        const isNeg = cleanVal.startsWith('−') || cleanVal.startsWith('-')
        const amt = Math.abs(parseFloat(cleanVal.replace(/[−-]/g, '')))
        if (amt > 0) {
          const inst = extractInstallments(desc)
          transactions.push({
            date: `${year}-${mon}-${day}`,
            desc: desc.trim(),
            amount: amt,
            type: isNeg ? 'income' : 'expense',
            installments_total: inst.total,
            installment_index: inst.index,
          })
          continue
        }
      }

      // 3. Mercado Pago Fatura
      const mpFatMatch = line.match(/^(\d{2}\/\d{2})\s+(.+?)\s+R\$\s*([\d.,]+)$/i)
      if (mpFatMatch) {
        bank = bank || 'Mercado Pago'
        document_type = 'invoice'
        const [, dm, desc, valStr] = mpFatMatch
        const [day, mon] = dm.split('/')
        const amt = parseFloat(valStr.replace(/\./g, '').replace(',', '.'))
        if (amt > 0 && !desc.toLowerCase().includes('pagamento da fatura')) {
          const inst = extractInstallments(desc)
          transactions.push({
            date: `${year}-${mon}-${day}`,
            desc: desc.trim(),
            amount: amt,
            type: 'expense',
            installments_total: inst.total,
            installment_index: inst.index,
          })
          continue
        }
      }

      // 4. Mercado Pago Conta
      const mpContaMatch = line.match(/^(\d{2}-\d{2}-\d{4})\s+(.+?)\s+(?:\d{10,14}\s+)?R\$\s*([−-]?[\d.,]+)(?:\s+R\$\s*[\d.,]+)?$/i)
      if (mpContaMatch) {
        bank = bank || 'Mercado Pago'
        document_type = 'statement'
        const [, dStr, desc, valStr] = mpContaMatch
        const [day, mon, yr] = dStr.split('-')
        const cleanVal = valStr.replace(/\./g, '').replace(',', '.')
        const num = parseFloat(cleanVal)
        if (Math.abs(num) > 0) {
          transactions.push({
            date: `${yr}-${mon}-${day}`,
            desc: desc.trim(),
            amount: Math.abs(num),
            type: num >= 0 ? 'income' : 'expense',
          })
          continue
        }
      }

      // 5. Linha genérica com Data e Valor
      const genMatch = line.match(/(\d{2}[/-]\d{2}(?:[/-]\d{2,4})?)\s+(.+?)\s+([−-]?\s*(?:R\$\s*)?[\d.]+,\d{2})/i)
      if (genMatch && !line.toLowerCase().includes('saldo')) {
        const [, rawD, rawDesc, rawV] = genMatch
        const amt = parseFlexibleAmount(rawV)
        if (amt !== 0) {
          const normD = normalizeDate(rawD)
          const inst = extractInstallments(rawDesc)
          transactions.push({
            date: normD,
            desc: rawDesc.trim(),
            amount: Math.abs(amt),
            type: amt >= 0 ? 'income' : 'expense',
            installments_total: inst.total,
            installment_index: inst.index,
          })
        }
      }
    }

    let totalIncome = 0
    let totalExpense = 0
    let startDate: string | undefined = undefined
    let endDate: string | undefined = undefined

    for (const t of transactions) {
      if (t.type === 'expense') totalExpense += t.amount
      else totalIncome += t.amount
      if (!startDate || t.date < startDate) startDate = t.date
      if (!endDate || t.date > endDate) endDate = t.date
    }

    const badge = `${document_type === 'invoice' ? 'Fatura' : 'Extrato'} ${bank || 'PDF'}`

    return {
      ok: transactions.length > 0,
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
   * Envia o extrato em PDF para processamento nativo offline (cliente)
   * e caso necessário recorre ao backend Skip Cloud.
   */
  async parsePdf(file: File | ArrayBuffer | Uint8Array): Promise<ParseResult> {
    try {
      let arrayBuffer: ArrayBuffer
      if (file instanceof File) {
        arrayBuffer = await file.arrayBuffer()
      } else if (file instanceof Uint8Array) {
        arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
      } else {
        arrayBuffer = file
      }

      const clientResult = await this.parsePdfClient(arrayBuffer)
      if (clientResult && clientResult.count > 0) {
        return clientResult
      }
    } catch (clientErr) {
      console.warn('[statementParser] Client PDF parser falhou ou fallback necessário:', clientErr)
    }

    // Se for objeto File e houver URL de backend PocketBase, tenta rota remota
    if (file instanceof File && pb.baseUrl) {
      const formData = new FormData()
      formData.append('file', file)

      let response: Response | null = null
      try {
        response = await fetch(`${pb.baseUrl}/backend/v1/statements/parse-pdf`, {
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

      if (response.ok && data?.transactions && Array.isArray(data.transactions)) {
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
      }
    }

    throw new Error('Não foi possível extrair lançamentos do arquivo PDF. Verifique se o arquivo possui texto selecionável ou exporte em OFX/CSV no seu banco.')
  },
}
