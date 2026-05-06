import {
  ensureInit,
  isSignedIn,
  syncNow,
  trySilentRefresh,
  type SyncResult,
} from './drive'

type Status = 'idle' | 'syncing' | 'error' | 'offline'

interface SyncState {
  status: Status
  lastResult?: SyncResult
  lastError?: string
  lastAt?: number
}

let state: SyncState = { status: 'idle' }
const stateListeners = new Set<(s: SyncState) => void>()
const memoListeners = new Set<() => void>()

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  stateListeners.forEach((cb) => { try { cb(state) } catch { /* ignore */ } })
}

export function getSyncState(): SyncState {
  return state
}

export function onSyncState(cb: (s: SyncState) => void): () => void {
  stateListeners.add(cb)
  cb(state)
  return () => { stateListeners.delete(cb) }
}

/** 메모가 외부 동기화로 변경됐을 때 페이지가 다시 로드하도록 알림. */
export function onMemosChanged(cb: () => void): () => void {
  memoListeners.add(cb)
  return () => { memoListeners.delete(cb) }
}

function notifyMemos() {
  memoListeners.forEach((cb) => { try { cb() } catch { /* ignore */ } })
}

let inFlight: Promise<void> | null = null

async function runSync(reason: string): Promise<void> {
  if (inFlight) return inFlight
  if (!navigator.onLine) {
    setState({ status: 'offline' })
    return
  }
  inFlight = (async () => {
    setState({ status: 'syncing' })
    try {
      await ensureInit()
      if (!isSignedIn()) {
        // 저장된 토큰이 만료됐을 수 있음 — 조용히 재시도
        const ok = await trySilentRefresh()
        if (!ok) {
          setState({ status: 'idle' })
          return
        }
      }
      const result = await syncNow()
      setState({
        status: 'idle',
        lastResult: result,
        lastError: undefined,
        lastAt: Date.now(),
      })
      if (result.added > 0 || result.updated > 0 || result.removed > 0) {
        notifyMemos()
      }
      void reason
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setState({ status: 'error', lastError: msg, lastAt: Date.now() })
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

let pushTimer: number | null = null

/** 메모 저장/삭제 후 호출. 짧은 디바운스 후 push. */
export function requestPush() {
  if (pushTimer) window.clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => {
    pushTimer = null
    void runSync('push')
  }, 1500)
}

/** 앱 시작 시, 또는 포그라운드 복귀/온라인 복귀 시 즉시 동기화. */
export async function syncImmediately(reason = 'manual'): Promise<void> {
  if (pushTimer) {
    window.clearTimeout(pushTimer)
    pushTimer = null
  }
  await runSync(reason)
}

let triggersInstalled = false

export function setupSyncTriggers() {
  if (triggersInstalled) return
  triggersInstalled = true

  // 부팅 시 1회
  void syncImmediately('boot')

  // 포커스 / 가시성 복귀 — 모바일에서 앱 다시 띄울 때
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void syncImmediately('visible')
    }
  })
  window.addEventListener('focus', () => { void syncImmediately('focus') })
  window.addEventListener('online', () => { void syncImmediately('online') })

  // 5분마다 주기적 백그라운드 동기화
  window.setInterval(() => { void syncImmediately('interval') }, 5 * 60 * 1000)
}
