import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Puerto propio para no chocar con service workers de otros proyectos que usaron localhost:5173
  server: { port: 5180 },
  preview: { port: 5181 },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
} as any)
