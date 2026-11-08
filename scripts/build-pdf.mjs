import { build } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  console.log('Compilando gerador de PDF...')
  await build({
    configFile: path.resolve(__dirname, '../vite.config.ts'),
    build: {
      ssr: path.resolve(__dirname, 'generate-docs-pdf.ts'),
      outDir: path.resolve(__dirname, 'dist-pdf'),
      rollupOptions: {
        output: {
          entryFileNames: 'pdf-generator.mjs',
          format: 'esm',
        },
      },
      emptyOutDir: true,
      minify: false,
    },
  })

  console.log('Executando geração do documento técnico PDF...')
  await import('./dist-pdf/pdf-generator.mjs')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
