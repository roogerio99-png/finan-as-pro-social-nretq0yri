import fs from 'fs'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

async function extractPdfText(buffer) {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
  const pdf = await loadingTask.promise
  let fullText = ''
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item) => item.str).join(' ')
    fullText += pageText + '\n'
  }
  return fullText
}

function parseFlexibleAmount(raw) {
  if (typeof raw === 'number') return raw
  if (!raw) return 0
  let clean = String(raw).replace(/R\$/g, '').replace(/\s+/g, '').replace(/[()]/g, '').trim()
  const isNegative =
    clean.includes('-') ||
    String(raw).includes('(-)') ||
    String(raw).toLowerCase().includes('saída') ||
    String(raw).toLowerCase().includes('saida')

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

function parseNubankPdfText(text) {
  const transactions = []
  const monthMap = {
    jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
    jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12'
  }

  // Regex para blocos Nubank:
  // "01 OUT 2026   Total de saídas   - 11,11  Transferência enviada pelo Pix   WESLLEY MIRANDA DA TRINDADE (Transferência enviada) 11,11"
  // ou "03 OUT 2026   Total de entradas   + 15.000,00  Transferência recebida pelo Pix..."
  const lines = text.split(/\n/)
  
  // Vamos analisar por regex sobre todo o texto
  // Data: (\d{2})\s+([A-Z]{3})\s+(\d{4})
  const txRegex = /(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})\s+Total de (saídas|entradas)\s+([+-]?\s*[\d.,]+)\s+([\s\S]*?)(?=(?:\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+\d{4}\s+Total de)|$)/gi

  let match
  let totalIncome = 0
  let totalExpense = 0

  while ((match = txRegex.exec(text)) !== null) {
    const day = match[1]
    const mStr = match[2].toLowerCase()
    const year = match[3]
    const mNum = monthMap[mStr] || '10'
    const date = `${year}-${mNum}-${day}`
    const isOut = match[4].toLowerCase().includes('saída')
    const totalAmount = parseFlexibleAmount(match[5])
    const body = match[6].trim()

    // O corpo pode conter múltiplas transações no mesmo dia ou uma transação
    // Ex: "Transferência enviada pelo Pix   WESLLEY... 11,11"
    const amount = Math.abs(totalAmount)
    const isExpense = isOut || totalAmount < 0

    // Limpa a descrição removendo valores repetidos no final
    let cleanDesc = body.replace(/\s+[\d.,]+$/, '').replace(/\s+/g, ' ').trim()
    if (!cleanDesc) cleanDesc = `Movimentação ${date}`

    if (amount > 0) {
      if (isExpense) totalExpense += amount
      else totalIncome += amount

      transactions.push({
        date,
        desc: cleanDesc,
        amount,
        type: isExpense ? 'expense' : 'income',
        raw_memo: cleanDesc
      })
    }
  }

  return {
    ok: transactions.length > 0,
    bank: 'Nubank',
    badge: 'Extrato Nubank (PDF)',
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    transactions,
    count: transactions.length
  }
}

function parseBbPdfText(text) {
  const transactions = []
  // Regex Banco do Brasil:
  // "01/10/2026   15.450,15 (+) 14134   557897 Recebimento de Proventos 39.496.730/0001-60 AGRICONNECTION IMPO"
  // "05/10/2026   15.000,00 (-) 13105   100501   Pix Open Finance Envio 03/10 09:04 Rogerio C S Cirilo"
  const regex = /(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)\s+(\(\+\)|\(\-\))\s*(?:\d+)?\s*(?:(\d{4,}))?\s*([^\d\n\r][^\n\r]*)/g

  let match
  let totalIncome = 0
  let totalExpense = 0

  while ((match = regex.exec(text)) !== null) {
    const rawDate = match[1]
    const dmy = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    const date = `${dmy[3]}-${dmy[2]}-${dmy[1]}`
    const rawAmt = parseFlexibleAmount(match[2])
    const signal = match[3]
    const isExpense = signal.includes('-')
    const doc = match[4] || ''
    const rawDesc = match[5].trim()

    // Ignora saldos
    if (/^saldo/i.test(rawDesc) || /^s\s*a\s*l\s*d\s*o/i.test(rawDesc)) continue

    const amount = Math.abs(rawAmt)
    if (amount === 0) continue

    const desc = rawDesc.replace(/\s+/g, ' ')

    if (isExpense) totalExpense += amount
    else totalIncome += amount

    transactions.push({
      date,
      desc,
      amount,
      type: isExpense ? 'expense' : 'income',
      fitId: doc || undefined,
      raw_memo: desc
    })
  }

  return {
    ok: transactions.length > 0,
    bank: 'Banco do Brasil',
    badge: 'Extrato Banco do Brasil (PDF)',
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    transactions,
    count: transactions.length
  }
}

async function main() {
  const nuBuf = fs.readFileSync('scratch/nu.pdf')
  const nuText = await extractPdfText(nuBuf)
  const nuRes = parseNubankPdfText(nuText)
  console.log('--- NUBANK PDF PARSED ---')
  console.log('Count:', nuRes.count, 'Total Income:', nuRes.totalIncome, 'Total Expense:', nuRes.totalExpense)
  console.log('Primeiras transações Nubank:', nuRes.transactions.slice(0, 3))

  const bbBuf = fs.readFileSync('scratch/bb.pdf')
  const bbText = await extractPdfText(bbBuf)
  const bbRes = parseBbPdfText(bbText)
  console.log('\n--- BANCO DO BRASIL PDF PARSED ---')
  console.log('Count:', bbRes.count, 'Total Income:', bbRes.totalIncome, 'Total Expense:', bbRes.totalExpense)
  console.log('Transações Banco do Brasil:', bbRes.transactions)
}

main().catch(console.error)
