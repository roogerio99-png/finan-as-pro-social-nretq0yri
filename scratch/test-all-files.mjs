import fs from 'fs'
import { statementParserService } from '../src/services/statementParser.ts'

const files = [
  'c:/Users/Rogerio Coimbra/Downloads/Extrato conta corrente - 102026.csv',
  'c:/Users/Rogerio Coimbra/Downloads/NU_66296839_01OUT2026_31OUT2026.ofx',
  'C:/Users/Rogerio Coimbra/.gemini/antigravity/brain/751a8d2f-5908-46dc-b0d8-98d98e26dd50/.user_uploaded/media_1794107474411_555c31a2.xlsx',
  'C:/Users/Rogerio Coimbra/.gemini/antigravity/brain/751a8d2f-5908-46dc-b0d8-98d98e26dd50/.user_uploaded/media_1794107474411_654a06d8.pdf',
  'C:/Users/Rogerio Coimbra/.gemini/antigravity/brain/751a8d2f-5908-46dc-b0d8-98d98e26dd50/.user_uploaded/media_1794107474412_56a9f076.pdf',
  'C:/Users/Rogerio Coimbra/.gemini/antigravity/brain/751a8d2f-5908-46dc-b0d8-98d98e26dd50/.user_uploaded/media_1794107474404_adcf2ec6.pdf',
  'C:/Users/Rogerio Coimbra/.gemini/antigravity/brain/751a8d2f-5908-46dc-b0d8-98d98e26dd50/.user_uploaded/media_1794107474412_d075c26f.pdf'
]

for (const f of files) {
  console.log('\n=======================================')
  console.log('Testando arquivo:', f)
  if (!fs.existsSync(f)) {
    console.log('ARQUIVO NÃO EXISTE!')
    continue
  }
  const type = statementParserService.detectFileType(f)
  console.log('Tipo detectado por extensão:', type)

  if (type === 'ofx') {
    const text = fs.readFileSync(f, 'utf8')
    const res = statementParserService.parseOfx(text)
    console.log('OFX Result count:', res.count, 'badge:', res.badge)
  } else if (type === 'csv') {
    // Testa com leitura utf8 (o que o browser faz por padrão)
    const buf = fs.readFileSync(f)
    const utf8Text = buf.toString('utf8')
    const resUtf8 = statementParserService.parseCsv(utf8Text)
    console.log('CSV UTF-8 count:', resUtf8.count, 'badge:', resUtf8.badge)

    const latin1Text = buf.toString('latin1')
    const resLatin1 = statementParserService.parseCsv(latin1Text)
    console.log('CSV Latin1 count:', resLatin1.count, 'badge:', resLatin1.badge)
  } else if (f.endsWith('.xlsx')) {
    console.log('Arquivo XLSX detectado! Tamanho:', fs.statSync(f).size)
  }
}
