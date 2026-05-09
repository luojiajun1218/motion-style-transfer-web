import { FormEvent, useState } from 'react'
import { createTemporaryLoginSession } from '../utils/temporaryAuth'
import './LoginPage.css'

interface LoginPageProps {
  onLogin: (session: { email: string; token: string }) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleTemporaryLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      onLogin(createTemporaryLoginSession(account, password))
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="login-kicker">BVH Workspace</span>
          <h1 id="login-title">Motion Style Transfer</h1>
          <p>Use any account and password to enter the motion processing workspace.</p>
        </div>

        <form className="login-form" onSubmit={handleTemporaryLogin}>
          <label className="login-label" htmlFor="account">Account</label>
          <input
            id="account"
            className="login-input"
            type="text"
            value={account}
            onChange={event => setAccount(event.target.value)}
            autoComplete="username"
            placeholder="demo"
            required
          />

          <label className="login-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="login-input"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Any password"
            required
          />

          {error && <p className="login-error">{error}</p>}

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entering' : 'Enter workspace'}
          </button>
        </form>
      </section>
    </main>
  )
}
