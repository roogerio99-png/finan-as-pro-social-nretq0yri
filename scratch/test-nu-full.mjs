import fs from 'fs'

function normalizeHeaderCell(cell) {
  return String(cell || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function parseCsvLine(line, delimiter) {
  const result = []
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

function parseFlexibleAmount(raw) {
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
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.')
  }

  const val = parseFloat(clean)
  if (isNaN(val)) return 0
  return isNegative ? -Math.abs(val) : Math.abs(val)
}

function normalizeDate(raw) {
  if (typeof raw === 'number') {
    const dateObj = new Date(Math.round((raw - 25569) * 86400 * 1000))
    if (!isNaN(dateObj.getTime())) return dateObj.toISOString().slice(0, 10)
  }
  const clean = String(raw || '').trim().replace(/['"]/g, '')
  const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  }
  const ymd = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`
  }
  return clean
}

const content = fs.readFileSync('scratch/nu.csv', 'utf8')
const rawLines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
const rows = rawLines.map((l) => parseCsvLine(l, ','))

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

console.log('headerRowIndex:', headerRowIndex, 'dateIdx:', dateIdx, 'valueIdx:', valueIdx, 'descIdx:', descIdx, 'idIdx:', idIdx)

const transactions = []
let totalIncome = 0
let totalExpense = 0

for (let r = headerRowIndex + 1; r < rows.length; r++) {
  const row = rows[r]
  if (!Array.isArray(row) || row.length < 2) continue

  const title = String(row[descIdx !== -1 ? descIdx : 1] || '').trim()
  if (!title) continue

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

  if (isExpense) totalExpense += amount
  else totalIncome += amount

  transactions.push({
    date,
    desc,
    amount,
    type: isExpense ? 'expense' : 'income',
    fitId,
  })
}

console.log('Total de transações extraídas no NU.CSV:', transactions.length)
console.log('Total Income:', totalIncome, 'Total Expense:', totalExpense)
console.log('Primeira transação:', transactions[0])
console.log('Segunda transação:', transactions[1])
