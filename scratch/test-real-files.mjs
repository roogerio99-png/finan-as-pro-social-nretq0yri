import fs from 'fs'
import { statementParserService } from '../src/services/statementParser.ts'

console.log('--- 1. TESTE NU.OFX ---')
if (fs.existsSync('scratch/nu.ofx')) {
  const text = fs.readFileSync('scratch/nu.ofx', 'utf8')
  const res = statementParserService.parseOfx(text)
  console.log('nu.ofx count:', res.count, 'income:', res.totalIncome, 'expense:', res.totalExpense, 'badge:', res.badge)
}

console.log('\n--- 2. TESTE NU.CSV (UTF8) ---')
if (fs.existsSync('scratch/nu.csv')) {
  const text = fs.readFileSync('scratch/nu.csv', 'utf8')
  const res = statementParserService.parseCsv(text)
  console.log('nu.csv count:', res.count, 'income:', res.totalIncome, 'expense:', res.totalExpense, 'badge:', res.badge)
  if (res.count === 0) {
    console.log('Primeiras linhas do nu.csv:')
    console.log(text.split('\n').slice(0, 5))
  }
}

console.log('\n--- 3. TESTE NU.CSV (LATIN1) ---')
if (fs.existsSync('scratch/nu.csv')) {
  const text = fs.readFileSync('scratch/nu.csv', 'latin1')
  const res = statementParserService.parseCsv(text)
  console.log('nu.csv (latin1) count:', res.count, 'income:', res.totalIncome, 'expense:', res.totalExpense, 'badge:', res.badge)
}

console.log('\n--- 4. TESTE BB.CSV ---')
if (fs.existsSync('c:/Users/Rogerio Coimbra/Downloads/Extrato conta corrente - 102026.csv')) {
  const text = fs.readFileSync('c:/Users/Rogerio Coimbra/Downloads/Extrato conta corrente - 102026.csv', 'utf8')
  const res = statementParserService.parseCsv(text)
  console.log('bb.csv count:', res.count, 'income:', res.totalIncome, 'expense:', res.totalExpense, 'badge:', res.badge)
}
