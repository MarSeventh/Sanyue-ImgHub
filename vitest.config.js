import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import { vueScriptPlugin } from './test/helpers/vueScriptPlugin';

export default defineConfig({
  plugins: [vueScriptPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.js'],
    setupFiles: ['test/helpers/setupWebStorage.js'],
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
  },
});
