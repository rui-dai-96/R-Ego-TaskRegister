import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules\/(react|react-dom|react-router)/, priority: 30 },
            { name: 'supabase-vendor', test: /node_modules\/@supabase/, priority: 20 },
            { name: 'forms-vendor', test: /node_modules\/(react-hook-form|zod|@hookform)/, priority: 10 },
          ],
        },
      },
    },
  },
})
