export interface TemporaryAuthSession {
  email: string
  token: string
}

const TEMPORARY_LOGIN_PREFIX = 'temporary-login:'

export function createTemporaryLoginSession(
  account: string,
  password: string,
  now: () => number = Date.now
): TemporaryAuthSession {
  const normalizedAccount = account.trim()
  if (!normalizedAccount || !password.trim()) {
    throw new Error('Enter an account and password')
  }

  return {
    email: normalizedAccount,
    token: `${TEMPORARY_LOGIN_PREFIX}${encodeURIComponent(normalizedAccount)}:${now()}`
  }
}

export function parseTemporaryLoginToken(token: string | null): TemporaryAuthSession | null {
  if (!token?.startsWith(TEMPORARY_LOGIN_PREFIX)) {
    return null
  }

  const tokenBody = token.slice(TEMPORARY_LOGIN_PREFIX.length)
  const encodedAccount = tokenBody.split(':')[0]
  if (!encodedAccount) return null

  return {
    email: decodeURIComponent(encodedAccount),
    token
  }
}

export function isTemporaryLoginToken(token: string | null | undefined): boolean {
  return Boolean(token?.startsWith(TEMPORARY_LOGIN_PREFIX))
}
