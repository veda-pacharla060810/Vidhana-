import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes every asset path relative, so the same build works on
// GitHub Pages (served from /repo-name/) and on Netlify (served from /).
export default defineConfig({
  plugins: [react()],
  base: './',
});
