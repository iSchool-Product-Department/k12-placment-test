import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' so the build works from any folder (artifact, Netlify, S3, a sub-path).
// The Supabase service key reaches only the local dev server (npm run dev), never a build.
export default defineConfig(({ command, mode }) => ({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { allowedHosts: ['.trycloudflare.com'] }, // quick tunnels to the dev server
  define: { __ADMIN_KEY__: JSON.stringify(command === 'serve' ? loadEnv(mode, process.cwd(), '').SUPABASE_SERVICE_KEY || null : null) },
}))
