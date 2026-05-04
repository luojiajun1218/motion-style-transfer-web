// Debug logger that sends logs to vite terminal instead of browser console
const DEBUG = true

export function debugLog(component: string, message: string, data?: any) {
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