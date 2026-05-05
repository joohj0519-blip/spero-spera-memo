import type { Memo } from '../types'
import { deleteMemo, listMemos, saveMemo } from '../db'

const CLIENT_ID =
  '852366236574-nf6qen06k2jki5dklpbpggcgslv77u1n.apps.googleusercontent.com'
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata'
const FILE_NAME = 'spero-spera.json'

interface TokenResponse {
  access_token: string
  expires_in: number
  error?: string
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

function waitForGlobals(): Promise<void> {
  return new Promise((resolve, reject) => {
    let tries = 0
    const tick = () => {
      if (window.gapi && window.google?.accounts?.oauth2) {
        resolve()
      } else if (++tries > 100) {
        reject(new Error('Google API 라이브러리 로딩 실패'))
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
  })()
  return initPromise
}

export function isSignedIn(): boolean {
  return !!accessToken && Date.now() < tokenExpiry
}

export async function signIn(): Promise<void> {
  await ensureInit()
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error('init 안됨'))
    tokenClient.callback = (resp) => {
      if (resp.error) {
        reject(new Error(resp.error))
        return
      }
      accessToken = resp.access_token
      tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000
      window.gapi.client.setToken({ access_token: accessToken })
      resolve()
    }
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
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
  window.gapi?.client?.setToken(null)
}

async function findFileId(): Promise<string | null> {
  const res = await window.gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    q: `name='${FILE_NAME}'`,
    fields: 'files(id)',
  })
  return res.result.files?.[0]?.id ?? null
}

interface RemotePayload {
  memos: Memo[]
  tombstones?: Record<string, number> // id -> deletedAt timestamp
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

const TOMBSTONE_KEY = 'spero:tombstones'

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
  total: number
}

export async function syncNow(): Promise<SyncResult> {
  const local = await listMemos()
  const localTombstones = loadTombstones()
  const remote = await pullFromDrive()

  const result: SyncResult = { added: 0, updated: 0, removed: 0, total: 0 }
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

  // Apply tombstones
  for (const [id, deletedAt] of Object.entries(tombstones)) {
    const m = merged.get(id)
    if (m && m.updatedAt < deletedAt) {
      merged.delete(id)
      result.removed++
    }
  }

  // Save merged memos to local
  const remoteIds = new Set(remote?.memos.map((m) => m.id) ?? [])
  const localIds = new Set(local.map((m) => m.id))
  for (const m of merged.values()) {
    if (!localIds.has(m.id) || m.updatedAt > (local.find((x) => x.id === m.id)?.updatedAt ?? 0)) {
      await saveMemo(m)
    }
  }
  // Remove memos that are tombstoned locally
  for (const id of Object.keys(tombstones)) {
    if (localIds.has(id) && !merged.has(id)) {
      await deleteMemo(id)
    }
    if (!remoteIds.has(id) && !merged.has(id)) {
      // already gone everywhere; clean tombstone after 30 days
      if (Date.now() - tombstones[id] > 30 * 24 * 3600 * 1000) {
        delete tombstones[id]
      }
    }
  }
  saveTombstones(tombstones)

  result.total = merged.size
  await pushToDrive({
    memos: Array.from(merged.values()),
    tombstones,
    updatedAt: Date.now(),
  })

  localStorage.setItem('spero:lastSync', String(Date.now()))
  return result
}

export function getLastSync(): number | null {
  const v = localStorage.getItem('spero:lastSync')
  return v ? Number(v) : null
}
