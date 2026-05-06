import type { Memo } from '../types'
import { deleteMemo, listMemos, saveMemo } from '../db'

const CLIENT_ID =
  '852366236574-nv11al8k63tl6t9vpm0ka59hc6ch3k8d.apps.googleusercontent.com'
const SCOPES = 'openid email https://www.googleapis.com/auth/drive.appdata'
const FILE_NAME = 'spero-spera.json'

const TOKEN_KEY = 'spero:googleToken'
const USER_KEY = 'spero:googleUser'
const TOMBSTONE_KEY = 'spero:tombstones'
const LAST_SYNC_KEY = 'spero:lastSync'
const LAST_ERROR_KEY = 'spero:lastSyncError'
const REMOTE_FILE_KEY = 'spero:remoteFileId'

interface TokenResponse {
  access_token: string
  expires_in: number
  error?: string
  error_description?: string
}

interface TokenClient {
  callback: (resp: TokenResponse) => void
  requestAccessToken: (opts?: { prompt?: string }) => void
}

interface GoogleApi {
  client: {
    init: (config: { discoveryDocs: string[] }) => Promise<void>
    setToken: (token: { access_token: string } | null) => void
    request: (opts: {
      path: string
      method?: string
      params?: Record<string, string>
      headers?: Record<string, string>
      body?: string
    }) => Promise<{ result: unknown; body: string }>
    drive: {
      files: {
        list: (opts: {
          spaces?: string
          q?: string
          fields?: string
        }) => Promise<{ result: { files?: Array<{ id: string }> } }>
        get: (opts: { fileId: string; alt: string }) => Promise<{ body: string }>
      }
    }
  }
  load: (api: string, cb: () => void) => void
}

declare global {
  interface Window {
    gapi: GoogleApi
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string
            scope: string
            callback: (resp: TokenResponse) => void
          }) => TokenClient
          revoke: (token: string, done: () => void) => void
        }
      }
    }
  }
}

let tokenClient: TokenClient | null = null
let accessToken: string | null = null
let tokenExpiry = 0
let initPromise: Promise<void> | null = null

interface StoredToken {
  access_token: string
  expiry: number
}

function loadStoredToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const t = JSON.parse(raw) as StoredToken
    if (t.access_token && t.expiry && t.expiry > Date.now() + 30_000) return t
  } catch { /* ignore */ }
  return null
}

function saveStoredToken(t: StoredToken) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
}

function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export interface UserInfo {
  email?: string
  name?: string
  picture?: string
}

export function getStoredUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as UserInfo) : null
  } catch {
    return null
  }
}

function saveStoredUser(u: UserInfo) {
  localStorage.setItem(USER_KEY, JSON.stringify(u))
}

function clearStoredUser() {
  localStorage.removeItem(USER_KEY)
}

export async function fetchUserInfo(): Promise<UserInfo | null> {
  if (!accessToken) return null
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { email?: string; name?: string; picture?: string }
    const info: UserInfo = { email: data.email, name: data.name, picture: data.picture }
    saveStoredUser(info)
    return info
  } catch {
    return null
  }
}

function waitForGlobals(): Promise<void> {
  return new Promise((resolve, reject) => {
    let tries = 0
    const tick = () => {
      if (window.gapi && window.google?.accounts?.oauth2) {
        resolve()
      } else if (++tries > 100) {
        reject(new Error('Google API 라이브러리 로딩 실패 (네트워크/광고차단 확인)'))
      } else {
        setTimeout(tick, 100)
      }
    }
    tick()
  })
}

export async function ensureInit(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    await waitForGlobals()
    await new Promise<void>((resolve) => window.gapi.load('client', resolve))
    await window.gapi.client.init({
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    })
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: () => {},
    })
    // 저장된 토큰 복구
    const stored = loadStoredToken()
    if (stored) {
      accessToken = stored.access_token
      tokenExpiry = stored.expiry
      window.gapi.client.setToken({ access_token: accessToken })
    }
  })()
  return initPromise
}

export function isSignedIn(): boolean {
  return !!accessToken && Date.now() < tokenExpiry
}

function requestToken(prompt: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error('init 안됨'))
    tokenClient.callback = (resp) => {
      if (resp.error) {
        reject(new Error(resp.error_description || resp.error))
        return
      }
      accessToken = resp.access_token
      tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000
      saveStoredToken({ access_token: accessToken, expiry: tokenExpiry })
      window.gapi.client.setToken({ access_token: accessToken })
      void fetchUserInfo()
      resolve()
    }
    tokenClient.requestAccessToken({ prompt })
  })
}

/** 사용자에게 로그인을 요청 (필요 시 동의창). */
export async function signIn(): Promise<void> {
  await ensureInit()
  return requestToken('')
}

/** 백그라운드 토큰 갱신 — 사용자 동작 없이 시도. 실패하면 거짓 반환. */
export async function trySilentRefresh(): Promise<boolean> {
  await ensureInit()
  try {
    await requestToken('none')
    return true
  } catch {
    return false
  }
}

export function signOut(): void {
  if (accessToken) {
    try {
      window.google?.accounts?.oauth2?.revoke(accessToken, () => {})
    } catch {
      /* ignore */
    }
  }
  accessToken = null
  tokenExpiry = 0
  clearStoredToken()
  clearStoredUser()
  window.gapi?.client?.setToken(null)
}

async function findFileId(): Promise<string | null> {
  const res = await window.gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    q: `name='${FILE_NAME}'`,
    fields: 'files(id)',
  })
  const id = res.result.files?.[0]?.id ?? null
  if (id) localStorage.setItem(REMOTE_FILE_KEY, id)
  return id
}

export function getRemoteFileId(): string | null {
  return localStorage.getItem(REMOTE_FILE_KEY)
}

interface RemotePayload {
  memos: Memo[]
  tombstones?: Record<string, number>
  updatedAt: number
}

export async function pullFromDrive(): Promise<RemotePayload | null> {
  const id = await findFileId()
  if (!id) return null
  const res = await window.gapi.client.drive.files.get({
    fileId: id,
    alt: 'media',
  })
  try {
    const data = JSON.parse(res.body)
    if (Array.isArray(data)) {
      return { memos: data, tombstones: {}, updatedAt: 0 }
    }
    return data as RemotePayload
  } catch {
    return null
  }
}

export async function pushToDrive(payload: RemotePayload): Promise<void> {
  const content = JSON.stringify(payload)
  const id = await findFileId()
  if (id) {
    await window.gapi.client.request({
      path: `/upload/drive/v3/files/${id}`,
      method: 'PATCH',
      params: { uploadType: 'media' },
      headers: { 'Content-Type': 'application/json' },
      body: content,
    })
    return
  }
  const boundary = '-------SPERO-' + Math.random().toString(36).slice(2)
  const meta = JSON.stringify({
    name: FILE_NAME,
    parents: ['appDataFolder'],
  })
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    meta +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    content +
    `\r\n--${boundary}--`
  await window.gapi.client.request({
    path: '/upload/drive/v3/files',
    method: 'POST',
    params: { uploadType: 'multipart' },
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
}

function loadTombstones(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(TOMBSTONE_KEY) ?? '{}')
  } catch {
    return {}
  }
}
function saveTombstones(t: Record<string, number>) {
  localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(t))
}
export function markDeleted(id: string) {
  const t = loadTombstones()
  t[id] = Date.now()
  saveTombstones(t)
}

export interface SyncResult {
  added: number
  updated: number
  removed: number
  pushed: number
  total: number
  remoteFound: boolean
}

export async function syncNow(): Promise<SyncResult> {
  if (!isSignedIn()) {
    throw new Error('로그인 안됨 — Google 계정으로 먼저 연결하세요')
  }
  try {
    const local = await listMemos()
    const localTombstones = loadTombstones()
    const remote = await pullFromDrive()

    const result: SyncResult = {
      added: 0, updated: 0, removed: 0, pushed: 0, total: 0,
      remoteFound: !!remote,
    }
    const merged = new Map<string, Memo>()
    const tombstones: Record<string, number> = { ...localTombstones, ...(remote?.tombstones ?? {}) }

    for (const m of local) merged.set(m.id, m)
    if (remote) {
      for (const m of remote.memos) {
        const existing = merged.get(m.id)
        if (!existing) {
          merged.set(m.id, m)
          result.added++
        } else if (m.updatedAt > existing.updatedAt) {
          merged.set(m.id, m)
          result.updated++
        }
      }
    }

    for (const [id, deletedAt] of Object.entries(tombstones)) {
      const m = merged.get(id)
      if (m && m.updatedAt < deletedAt) {
        merged.delete(id)
        result.removed++
      }
    }

    const localById = new Map(local.map((m) => [m.id, m]))
    for (const m of merged.values()) {
      const prev = localById.get(m.id)
      if (!prev || m.updatedAt > prev.updatedAt) {
        await saveMemo(m)
      }
    }
    for (const id of Array.from(localById.keys())) {
      if (!merged.has(id) && tombstones[id]) {
        await deleteMemo(id)
      }
    }
    // 30일 지난 tombstone 정리
    const now = Date.now()
    for (const [id, deletedAt] of Object.entries(tombstones)) {
      if (now - deletedAt > 30 * 24 * 3600 * 1000 && !merged.has(id)) {
        delete tombstones[id]
      }
    }
    saveTombstones(tombstones)

    result.total = merged.size
    result.pushed = merged.size
    await pushToDrive({
      memos: Array.from(merged.values()),
      tombstones,
      updatedAt: Date.now(),
    })

    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()))
    localStorage.removeItem(LAST_ERROR_KEY)
    return result
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    localStorage.setItem(LAST_ERROR_KEY, JSON.stringify({ at: Date.now(), msg }))
    throw e
  }
}

export function getLastSync(): number | null {
  const v = localStorage.getItem(LAST_SYNC_KEY)
  return v ? Number(v) : null
}

export function getLastError(): { at: number; msg: string } | null {
  try {
    const raw = localStorage.getItem(LAST_ERROR_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
