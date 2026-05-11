import { createTemporaryLoginSession, parseTemporaryLoginToken } from '../src/utils/temporaryAuth'

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
  }
}

const session = createTemporaryLoginSession('  demo-user  ', '  password  ', () => 12345)

assertEqual(session.email, 'demo-user', 'temporary login trims the account name')
assertEqual(session.token, 'temporary-login:demo-user:12345', 'temporary login creates a restorable token')

const restored = parseTemporaryLoginToken(session.token)
assertEqual(restored?.email, 'demo-user', 'temporary token restores the account name')
assertEqual(restored?.token, session.token, 'temporary token keeps the original token')

try {
  createTemporaryLoginSession('', 'password')
  throw new Error('expected empty account to be rejected')
} catch (error) {
  assertEqual(error instanceof Error ? error.message : '', '请输入账号和密码', 'empty account is rejected')
}

try {
  createTemporaryLoginSession('demo-user', '')
  throw new Error('expected empty password to be rejected')
} catch (error) {
  assertEqual(error instanceof Error ? error.message : '', '请输入账号和密码', 'empty password is rejected')
}
