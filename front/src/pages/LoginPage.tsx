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
      setError(loginError instanceof Error ? loginError.message : '登录失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="login-kicker">BVH 动作工作台</span>
          <h1 id="login-title">动作风格迁移</h1>
          <p>输入账号和密码，即可进入动作风格迁移。</p>
        </div>

        <form className="login-form" onSubmit={handleTemporaryLogin}>
          <label className="login-label" htmlFor="account">账号</label>
          <input
            id="account"
            className="login-input"
            type="text"
            value={account}
            onChange={event => setAccount(event.target.value)}
            autoComplete="username"
            placeholder="请输入账号"
            required
          />

          <label className="login-label" htmlFor="password">密码</label>
          <input
            id="password"
            className="login-input"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="请输入密码"
            required
          />

          {error && <p className="login-error">{error}</p>}

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '正在进入' : '进入工作区'}
          </button>
        </form>
      </section>
    </main>
  )
}
