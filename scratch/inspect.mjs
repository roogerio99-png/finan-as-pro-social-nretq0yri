import fs from 'fs'

const buf = fs.readFileSync('c:/Users/Rogerio Coimbra/Downloads/Extrato conta corrente - 102026.csv')
const utf8Text = buf.toString('utf8')

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
  if (!raw) return 0
  let clean = String(raw).trim().replace(/R\$\s*/gi, '').replace(/\s+/g, '')
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.')
    } else {
      clean = clean.replace(/,/g, '')
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.')
  }
  const val = parseFloat(clean)
  return isNaN(val) ? 0 : val
}

function normalizeDate(raw) {
  if (!raw) return new Date().toISOString().slice(0, 10)
  const clean = String(raw).trim().replace(/['"]/g, '')
  const partsDmy = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (partsDmy) {
    const d = partsDmy[1].padStart(2, '0')
    const m = partsDmy[2].padStart(2, '0')
    let y = partsDmy[3]
    if (y.length === 2) y = `20${y}`
    return `${y}-${m}-${d}`
  }
  return clean
}

const rawLines = utf8Text.split(/\r?\n/).filter((l) => l.trim().length > 0)
const delimiter = ','
const header = parseCsvLine(rawLines[0], delimiter).map((h) =>
  h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(),
)

const dateIdx = header.findIndex((h) => h.includes('data') || h.includes('date'))
const valueIdx = header.findIndex((h) => h.includes('valor') || h.includes('amount') || h.includes('value'))
const descIdx = header.findIndex((h) => h.includes('descri') || h.includes('historico') || h.includes('lancamento'))
const detailsIdx = header.findIndex((h) => h.includes('detalhes'))
const idIdx = header.findIndex((h) => h.includes('identificador') || h.includes('documento') || h.includes('id'))
const typeIdx = header.findIndex((h) => h.includes('tipo'))

const transactions = []
for (let i = 1; i < rawLines.length; i++) {
  const parts = parseCsvLine(rawLines[i], delimiter)
  if (parts.length < 2) continue

  const rawDate = dateIdx !== -1 ? parts[dateIdx] : parts[0]
  const date = normalizeDate(rawDate)

  let desc = descIdx !== -1 ? parts[descIdx] : parts[1] || 'Lançamento Importado'
  if (detailsIdx !== -1 && parts[detailsIdx]) {
    desc += ` - ${parts[detailsIdx]}`
  }

  if (/^saldo/i.test(desc) || /^s\s*a\s*l\s*d\s*o/i.test(desc)) continue

  const valStr = valueIdx !== -1 ? parts[valueIdx] : parts[2] || '0'
  const rawAmt = parseFlexibleAmount(valStr)
  console.log(`Linha ${i}: desc=${desc}, valStr=${valStr}, rawAmt=${rawAmt}`)
  const isExpense = rawAmt < 0 || (typeIdx !== -1 && parts[typeIdx].toLowerCase().includes('deb'))
  const amount = Math.abs(rawAmt)
  if (amount === 0) continue

  transactions.push({ date, desc, amount, type: isExpense ? 'expense' : 'income' })
}

console.log('Total transações no else genérico:', transactions.length)
