import fs from 'fs'
import path from 'path'
import { pb } from '../src/lib/pocketbase/client'

async function generateCompleteJson() {
  const schemaPath = path.resolve(process.cwd(), 'src/lib/pocketbase/schema.json')
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'))

  const collections: Record<string, any[]> = {}
  for (const col of schema.collections.map((c: any) => c.name)) {
    const records = typeof (pb as any).getCollectionRecords === 'function'
      ? (pb as any).getCollectionRecords(col)
      : []
    collections[col] = records || []
  }

  const nowIso = new Date().toISOString()

  const completeAppJson = {
    metadata: {
      app: 'GestioFinancasPro',
      name: 'Gestio Finanças Pro — Sistema PWA Offline-First',
      version: '0.0.66',
      schemaVersion: 1,
      exportedAt: nowIso,
      architecture: {
        client: 'React 19 + TypeScript + Vite + Tailwind CSS + Shadcn UI',
        storageEngine: 'IndexedDB (GestioFinancas_DB_v1) + localStorage (preferências visuais)',
        cryptography: 'AES-GCM (256-bit) + PBKDF2 (SHA-256, 100.000 iterações)',
        executionModel: '100% Offline-First / Zero-Knowledge (Client-Side Only)',
        multiFormatParsers: ['OFX (Bancos Brasileiros)', 'Excel (.xlsx, .xls)', 'CSV (UTF-8, Latin1)', 'PDF Textual'],
      },
      counts: Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, v.length])),
    },
    databaseSchema: schema,
    initialData: collections,
    backupFormat: {
      formatDescription: 'Formato compatível com restauração atômica no cofre local do Gestio Finanças',
      metadata: {
        app: 'GestioFinancasPro',
        version: '0.0.66',
        schemaVersion: 1,
        createdAt: nowIso,
        deviceInfo: 'Gestio Finanças Standalone Export',
        isEncrypted: false,
        counts: Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, v.length])),
      },
      data: collections,
    },
  }

  const outputDir = process.cwd()
  const outputPath = path.resolve(outputDir, 'Gestio_Financas_Completo.json')
  const publicPath = path.resolve(outputDir, 'public/Gestio_Financas_Completo.json')
  const distPath = path.resolve(outputDir, 'dist/Gestio_Financas_Completo.json')
  const artifactsDir = 'C:\\Users\\Rogerio Coimbra\\.gemini\\antigravity\\brain\\751a8d2f-5908-46dc-b0d8-98d98e26dd50'
  const artifactPath = path.resolve(artifactsDir, 'Gestio_Financas_Completo.json')

  const jsonString = JSON.stringify(completeAppJson, null, 2)
  fs.writeFileSync(outputPath, jsonString, 'utf-8')
  fs.writeFileSync(publicPath, jsonString, 'utf-8')

  if (fs.existsSync(path.resolve(outputDir, 'dist'))) {
    fs.writeFileSync(distPath, jsonString, 'utf-8')
  }

  if (fs.existsSync(artifactsDir)) {
    fs.writeFileSync(artifactPath, jsonString, 'utf-8')
  }

  console.log('✅ Arquivo JSON completo gerado com sucesso!')
  console.log('Tamanho:', (jsonString.length / 1024).toFixed(2), 'KB')
  console.log('Total de coleções:', Object.keys(collections).length)
  for (const [k, v] of Object.entries(collections)) {
    console.log(`  - ${k}: ${v.length} registros`)
  }
}

generateCompleteJson().catch((err) => {
  console.error('Erro ao gerar JSON:', err)
  process.exit(1)
})
