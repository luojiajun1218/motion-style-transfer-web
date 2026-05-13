import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Debug log plugin - forwards browser logs to terminal
function debugLogPlugin() {
  return {
    name: 'debug-log',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/__debug_log' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => body += chunk)
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              console.log(`[FRONTEND] ${data.component}:`, data.message)
              res.statusCode = 200
              res.end('ok')
            } catch (e) {
              res.statusCode = 400
              res.end('bad')
            }
          })
        } else {
          next()
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), debugLogPlugin()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          three: ['three', '@react-three/fiber', '@react-three/drei', 'three-stdlib']
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true
      }
    }
  }
})
