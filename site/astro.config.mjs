import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  vite: { resolve: { conditions: ['worker', 'browser', 'module', 'development|production'] } },
  devToolbar: { enabled: false },
});
