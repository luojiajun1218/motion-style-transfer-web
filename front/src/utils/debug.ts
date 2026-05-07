// Debug logger that sends logs to vite terminal instead of browser console
// Vite 环境变量，生产环境自动为 false
const DEBUG = true  // 开发时可改为 false

export function debugLog(component: string, message: string, data?: unknown) {
  if (!DEBUG) return

  const payload = {
    component,
    message: data ? `${message} ${JSON.stringify(data)}` : message
  }

  fetch('/__debug_log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {}) // Silent fail
}