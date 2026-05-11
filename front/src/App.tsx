import { useEffect, useState } from 'react'
import Home from './pages/Home'
import LoginPage from './pages/LoginPage'
import { getAuthSession, logoutAuthSession, setApiAuthToken } from './services/api'
import { isTemporaryLoginToken, parseTemporaryLoginToken } from './utils/temporaryAuth'

const AUTH_TOKEN_KEY = 'most-auth-token'

interface AuthState {
  email: string
  token: string
}

function App() {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      setIsCheckingSession(false)
      return
    }

    const temporarySession = parseTemporaryLoginToken(token)
    if (temporarySession) {
      setAuth(temporarySession)
      setApiAuthToken(temporarySession.token)
      setIsCheckingSession(false)
      return
    }

    getAuthSession(token)
      .then(session => {
        setAuth({ email: session.email, token: session.token })
        setApiAuthToken(session.token)
      })
      .catch(() => {
        window.localStorage.removeItem(AUTH_TOKEN_KEY)
        setApiAuthToken(null)
      })
      .finally(() => {
        setIsCheckingSession(false)
      })
  }, [])

  const handleLogin = (session: AuthState) => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, session.token)
    setApiAuthToken(session.token)
    setAuth(session)
  }

  const handleLogout = () => {
    if (auth?.token && !isTemporaryLoginToken(auth.token)) {
      void logoutAuthSession(auth.token)
    }
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    setApiAuthToken(null)
    setAuth(null)
  }

  if (isCheckingSession) {
    return (
      <div className="auth-loading">
        <span>正在检查会话</span>
      </div>
    )
  }

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <Home userEmail={auth.email} onLogout={handleLogout} />
}

export default App
