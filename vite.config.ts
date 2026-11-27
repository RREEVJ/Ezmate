import { copyFileSync, mkdirSync } from 'node:fs';
import { defineConfig } from 'vite';

// copy engine from node_modules into public/ so it's served as-is
function stockfish() {
  return {
    name: 'copy-stockfish',
    buildStart() {
      mkdirSync('public/stockfish', { recursive: true });
      for (const ext of ['js', 'wasm']) {
        const file = `stockfish-19-lite-single.${ext}`;
        copyFileSync(`node_modules/stockfish/bin/${file}`, `public/stockfish/${file}`);
      }
      copyFileSync('node_modules/stockfish/Copying.txt', 'public/stockfish/Copying.txt');
    },
  };
}

export default defineConfig({
  plugins: [stockfish()],
  server: { port: 5173, strictPort: true },
});
