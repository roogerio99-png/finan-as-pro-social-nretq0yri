import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await build({
    configFile: path.resolve(__dirname, '../vite.config.ts'),
    build: {
      ssr: path.resolve(__dirname, 'debug-selects.ts'),
      outDir: path.resolve(__dirname, 'dist-debug'),
      rollupOptions: {
        output: {
          entryFileNames: 'debug.mjs',
          format: 'esm'
        }
      },
      emptyOutDir: true,
      minify: false
    }
  });

  await import('./dist-debug/debug.mjs');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
