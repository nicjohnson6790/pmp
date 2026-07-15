import { computed, reactive } from 'vue'
import {
  AuthClient,
  AuthResponse,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
} from './api/generated/api-client'

const storageKey = 'pmp.auth'
const refreshLeadTimeMs = 60_000
let refreshTimeout: number | undefined

type StoredAuth = {
  accessToken: string
  accessTokenExpiresUtc: string
  refreshToken: string
  refreshTokenExpiresUtc: string
  userName: string
  email?: string
}

export const authState = reactive({
  accessToken: '',
  accessTokenExpiresUtc: undefined as Date | undefined,
  refreshToken: '',
  refreshTokenExpiresUtc: undefined as Date | undefined,
  userName: '',
  email: undefined as string | undefined,
  initialized: false,
})

const authClient = new AuthClient()

export const isAuthenticated = computed(() => {
  return !!authState.accessToken && (!authState.accessTokenExpiresUtc || authState.accessTokenExpiresUtc > new Date())
})

export async function initializeAuth() {
  const stored = readStoredAuth()

  if (stored) {
    applyStoredAuth(stored)
    if (!isAuthenticated.value && authState.refreshToken) {
      await refreshAuth().catch(clearAuth)
    } else {
      scheduleRefresh()
    }
  }

  authState.initialized = true
}

export async function login(userName: string, password: string) {
  const result = await authClient.auth_Login(new LoginRequest({ userName, password }))
  applyAuthResult(result)
}

export async function register(userName: string, password: string, email?: string) {
  const result = await authClient.auth_Register(
    new RegisterRequest({
      userName,
      password,
      email: email?.trim() || undefined,
    }),
  )
  applyAuthResult(result)
}

export async function logout() {
  const refreshToken = authState.refreshToken
  clearAuth()

  if (refreshToken) {
    await authClient.auth_Logout(new RefreshTokenRequest({ refreshToken })).catch(() => undefined)
  }
}

export async function refreshAuth() {
  if (!authState.refreshToken) {
    clearAuth()
    return
  }

  const result = await authClient.auth_Refresh(new RefreshTokenRequest({ refreshToken: authState.refreshToken }))
  applyAuthResult(result)
}

export async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  if (!isAuthenticated.value && authState.refreshToken) {
    await refreshAuth()
  }

  const headers = new Headers(init.headers)
  if (authState.accessToken) {
    headers.set('Authorization', `Bearer ${authState.accessToken}`)
  }

  const response = await fetch(input, { ...init, headers })
  if (response.status !== 401 || !authState.refreshToken) {
    return response
  }

  await refreshAuth()
  const retryHeaders = new Headers(init.headers)
  retryHeaders.set('Authorization', `Bearer ${authState.accessToken}`)
  return fetch(input, { ...init, headers: retryHeaders })
}

function applyAuthResult(result: AuthResponse) {
  authState.accessToken = result.accessToken ?? ''
  authState.accessTokenExpiresUtc = result.accessTokenExpiresUtc
  authState.refreshToken = result.refreshToken ?? ''
  authState.refreshTokenExpiresUtc = result.refreshTokenExpiresUtc
  authState.userName = result.userName ?? ''
  authState.email = result.email

  persistAuth()
  scheduleRefresh()
}

function applyStoredAuth(stored: StoredAuth) {
  authState.accessToken = stored.accessToken
  authState.accessTokenExpiresUtc = new Date(stored.accessTokenExpiresUtc)
  authState.refreshToken = stored.refreshToken
  authState.refreshTokenExpiresUtc = new Date(stored.refreshTokenExpiresUtc)
  authState.userName = stored.userName
  authState.email = stored.email
}

function clearAuth() {
  window.clearTimeout(refreshTimeout)
  refreshTimeout = undefined

  authState.accessToken = ''
  authState.accessTokenExpiresUtc = undefined
  authState.refreshToken = ''
  authState.refreshTokenExpiresUtc = undefined
  authState.userName = ''
  authState.email = undefined

  localStorage.removeItem(storageKey)
}

function persistAuth() {
  if (!authState.accessToken || !authState.refreshToken) {
    return
  }

  const stored: StoredAuth = {
    accessToken: authState.accessToken,
    accessTokenExpiresUtc: authState.accessTokenExpiresUtc?.toISOString() ?? '',
    refreshToken: authState.refreshToken,
    refreshTokenExpiresUtc: authState.refreshTokenExpiresUtc?.toISOString() ?? '',
    userName: authState.userName,
    email: authState.email,
  }

  localStorage.setItem(storageKey, JSON.stringify(stored))
}

function readStoredAuth() {
  const stored = localStorage.getItem(storageKey)
  if (!stored) {
    return undefined
  }

  try {
    return JSON.parse(stored) as StoredAuth
  } catch {
    localStorage.removeItem(storageKey)
    return undefined
  }
}

function scheduleRefresh() {
  window.clearTimeout(refreshTimeout)
  refreshTimeout = undefined

  if (!authState.accessTokenExpiresUtc || !authState.refreshToken) {
    return
  }

  const delay = Math.max(authState.accessTokenExpiresUtc.getTime() - Date.now() - refreshLeadTimeMs, 5_000)
  refreshTimeout = window.setTimeout(() => {
    refreshAuth().catch(clearAuth)
  }, delay)
}
