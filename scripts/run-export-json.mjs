import { build } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  await build({
    configFile: path.resolve(__dirname, '../vite.config.ts'),
    build: {
      ssr: path.resolve(__dirname, 'export-complete-json.ts'),
      outDir: path.resolve(__dirname, 'dist-export'),
      rollupOptions: {
        output: {
          entryFileNames: 'export-runner.mjs',
          format: 'esm',
        },
      },
      emptyOutDir: true,
      minify: false,
    },
  })

  await import('./dist-export/export-runner.mjs')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
