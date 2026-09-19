import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// GitHub Pages serves the app under the repository sub-path; keep it in sync
// with the repository name when deploying.
const repoName = 'farmacias-guardia-cadiz'
const base = process.env.VITE_BASE ?? `/${repoName}/`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base,
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
