import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Compilando e empacotando suite de testes com Vite...');
  await build({
    configFile: path.resolve(__dirname, '../vite.config.ts'),
    build: {
      ssr: path.resolve(__dirname, 'test-suite.ts'),
      outDir: path.resolve(__dirname, 'dist'),
      rollupOptions: {
        output: {
          entryFileNames: 'test-runner.mjs',
          format: 'esm'
        }
      },
      emptyOutDir: true,
      minify: false
    }
  });

  console.log('\nExecutando bateria de testes...\n');
  await import('./dist/test-runner.mjs');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
