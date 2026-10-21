import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base: the site works under https://<owner>.github.io/<repo>/ and from site/dist.
export default defineConfig({
  base: './',
  plugins: [react()],
});
