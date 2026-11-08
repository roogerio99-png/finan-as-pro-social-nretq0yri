import fs from 'fs'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

async function extractPdfText(path) {
  const data = new Uint8Array(fs.readFileSync(path))
  const loadingTask = pdfjsLib.getDocument({ data })
  const pdf = await loadingTask.promise
  console.log(`PDF ${path}: total pages = ${pdf.numPages}`)
  let fullText = ''
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item) => item.str).join(' ')
    fullText += pageText + '\n'
  }
  return fullText
}

console.log('--- TESTANDO BB.PDF ---')
extractPdfText('scratch/bb.pdf').then((txt) => {
  console.log('Texto extraído BB.PDF (primeiros 500 chars):')
  console.log(txt.slice(0, 500))
}).catch((err) => {
  console.error('Erro BB.PDF:', err)
})
