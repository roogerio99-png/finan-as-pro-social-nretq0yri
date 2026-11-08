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

const nuContent = fs.readFileSync('scratch/nu.csv', 'utf8')
const lines = nuContent.split(/\r?\n/).filter((l) => l.trim().length > 0)
console.log('Linha 0 NU.CSV:', lines[0])
const headerCells = parseCsvLine(lines[0], ',')
console.log('Header cells:', headerCells)
const normHeader = headerCells.map(normalizeHeaderCell)
console.log('Normalized header cells:', normHeader)

const dIdx = normHeader.findIndex((c) => c.includes('data') || c.includes('date'))
const vIdx = normHeader.findIndex(
  (c) =>
    c.includes('valor') ||
    c.includes('amount') ||
    c.includes('value') ||
    c.includes('val'),
)
const dsIdx = normHeader.findIndex(
  (c) =>
    c.includes('lancamento') ||
    c.includes('lanamento') ||
    c.includes('descri') ||
    c.includes('historico'),
)

console.log('dIdx:', dIdx, 'vIdx:', vIdx, 'dsIdx:', dsIdx)
