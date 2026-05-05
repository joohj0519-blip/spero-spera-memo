import { useEffect, useState } from 'react'
import { listMemos } from '../db'
import type { Memo } from '../types'
import { MEMO_TYPE_META } from '../types'
import { TopBar } from '../components/TopBar'
import { useInstallPrompt, useStandalone } from '../hooks/usePwa'
import {
  ensureInit,
  getLastSync,
  isSignedIn,
  signIn,
  signOut,
  syncNow,
  type SyncResult,
} from '../lib/drive'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function Profile() {
  const [memos, setMemos] = useState<Memo[]>([])
  const isStandalone = useStandalone()
  const { canInstall, installed, install } = useInstallPrompt()
  const [drive, setDrive] = useState<{
    ready: boolean
    signedIn: boolean
    syncing: boolean
    error?: string
    lastSync: number | null
    lastResult?: SyncResult
  }>({ ready: false, signedIn: false, syncing: false, lastSync: null })

  useEffect(() => {
    void listMemos().then(setMemos)
  }, [])

  useEffect(() => {
    void ensureInit()
      .then(() => setDrive((s) => ({ ...s, ready: true, signedIn: isSignedIn(), lastSync: getLastSync() })))
      .catch((e) => setDrive((s) => ({ ...s, error: String(e?.message ?? e) })))
  }, [])

  const reload = async () => {
    setMemos(await listMemos())
  }

  const handleSignIn = async () => {
    setDrive((s) => ({ ...s, error: undefined }))
    try {
      await signIn()
      setDrive((s) => ({ ...s, signedIn: true }))
    } catch (e: unknown) {
      setDrive((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }))
    }
  }

  const handleSync = async () => {
    setDrive((s) => ({ ...s, syncing: true, error: undefined }))
    try {
      const result = await syncNow()
      await reload()
      setDrive((s) => ({
        ...s,
        syncing: false,
        lastSync: getLastSync(),
        lastResult: result,
      }))
    } catch (e: unknown) {
      setDrive((s) => ({
        ...s,
        syncing: false,
        error: e instanceof Error ? e.message : String(e),
      }))
    }
  }

  const handleSignOut = () => {
    signOut()
    setDrive((s) => ({ ...s, signedIn: false, lastResult: undefined }))
  }

  const counts = {
    note: memos.filter((m) => m.type === 'note').length,
    checklist: memos.filter((m) => m.type === 'checklist').length,
    todo: memos.filter((m) => m.type === 'todo').length,
  }
  const totalAttachments = memos.reduce((acc, m) => acc + m.attachments.length, 0)
  const totalBytes = memos.reduce(
    (acc, m) => acc + m.attachments.reduce((a, x) => a + x.size, 0),
    0,
  )

  const exportJson = () => {
    const data = JSON.stringify(memos, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spero-spera-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="pb-32">
      <TopBar title="spero spera" subtitle="dum spiro, spero · 숨쉬는 한, 희망한다" />

      {/* 앱 설치 안내: PC에서 별도 창으로 띄워 다른 작업과 같이 쓰기 */}
      {!isStandalone && (
        <section className="px-5">
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-sky-100 border border-slate-200/80 shadow-soft p-5">
            <p className="text-xs font-semibold text-blue-700 mb-1">PC 데스크톱 앱처럼 사용하기</p>
            <h3 className="text-base font-semibold text-ink-900">앱으로 설치</h3>
            <p className="mt-1 text-sm text-ink-700 leading-relaxed">
              브라우저 창이 아닌 <b>별도의 작은 창</b>으로 떠서 다른 작업과 함께 쓸 수 있어요.
              화면 한쪽에 두고 메모만 띄워두기 좋아요.
            </p>
            {installed ? (
              <p className="mt-3 text-sm text-note-600 font-semibold">설치 완료 — 시작 메뉴에서 열어보세요.</p>
            ) : canInstall ? (
              <button
                onClick={() => void install()}
                className="mt-3 w-full px-4 py-3 rounded-xl bg-ink-900 text-white font-medium"
              >
                바로 설치하기
              </button>
            ) : (
              <details className="mt-3 text-sm text-ink-700">
                <summary className="cursor-pointer font-medium">수동 설치 방법 보기</summary>
                <ul className="mt-2 space-y-1.5 pl-4 list-disc text-ink-700">
                  <li><b>Chrome / Edge (PC)</b>: 주소창 오른쪽 끝의 <b>설치</b> 아이콘 클릭, 또는 메뉴 → "앱 설치"</li>
                  <li><b>Safari (iPhone)</b>: 공유 → "홈 화면에 추가"</li>
                  <li><b>Chrome (Android)</b>: 메뉴 → "앱 설치" / "홈 화면에 추가"</li>
                </ul>
                <p className="mt-2 text-xs text-ink-500">
                  ※ 빌드 후 https 또는 GitHub Pages 에 배포된 환경에서 더 잘 동작해요.
                </p>
              </details>
            )}
          </div>
        </section>
      )}


      <section className="px-5">
        <div className="rounded-xl bg-white shadow-soft border border-slate-200/80 p-5">
          <p className="text-sm text-ink-500">총 메모</p>
          <p className="text-3xl font-semibold text-ink-900">{memos.length}</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {(Object.keys(counts) as Array<keyof typeof counts>).map((k) => (
              <div key={k} className="rounded-xl bg-ink-900/[0.03] p-3">
                <p className="text-xs text-ink-500">{MEMO_TYPE_META[k].label}</p>
                <p className="text-xl font-semibold text-ink-900">{counts[k]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-xl bg-white shadow-soft border border-slate-200/80 p-5">
          <p className="text-sm text-ink-500">첨부파일</p>
          <p className="text-2xl font-semibold text-ink-900">
            {totalAttachments}<span className="text-base text-ink-500 font-medium ml-1">개</span>
          </p>
          <p className="mt-1 text-xs text-ink-400">
            로컬 저장 용량 약 {formatBytes(totalBytes)}
          </p>
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-xl bg-white shadow-soft border border-slate-200/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink-900">Google Drive 동기화</h3>
            {drive.signedIn && (
              <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                연결됨
              </span>
            )}
          </div>
          <p className="text-xs text-ink-500 leading-relaxed">
            본인 Drive 의 <b>앱 전용 폴더</b>에 메모가 저장돼요. 일반 Drive 에선 안 보이고
            이 앱만 접근 가능합니다. 노트북·휴대폰 어디서든 같은 계정으로 로그인하면 같은 메모를 봐요.
          </p>

          {!drive.ready ? (
            <p className="text-xs text-ink-400">Google API 로딩 중…</p>
          ) : !drive.signedIn ? (
            <button
              onClick={() => void handleSignIn()}
              className="w-full px-4 py-3 rounded-xl bg-ink-900 text-white font-medium"
            >
              Google 계정으로 연결
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => void handleSync()}
                disabled={drive.syncing}
                className="w-full px-4 py-3 rounded-xl bg-ink-900 text-white font-medium disabled:opacity-60"
              >
                {drive.syncing ? '동기화 중…' : '지금 동기화'}
              </button>
              <div className="flex items-center justify-between text-[11px] text-ink-500">
                <span>
                  {drive.lastSync
                    ? `마지막 동기화: ${format(new Date(drive.lastSync), 'M월 d일 HH:mm', { locale: ko })}`
                    : '아직 동기화 안 됨'}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-ink-500 hover:text-rose-600"
                >
                  연결 해제
                </button>
              </div>
              {drive.lastResult && (
                <p className="text-[11px] text-ink-500">
                  결과: 추가 {drive.lastResult.added} · 수정 {drive.lastResult.updated} ·
                  삭제 {drive.lastResult.removed} · 총 {drive.lastResult.total}
                </p>
              )}
            </div>
          )}

          {drive.error && (
            <p className="text-xs text-rose-600 mt-2">⚠ {drive.error}</p>
          )}
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-xl bg-white shadow-soft border border-slate-200/80 p-5 space-y-3">
          <h3 className="font-semibold text-ink-900">로컬 백업</h3>
          <button
            onClick={exportJson}
            className="w-full px-4 py-3 rounded-xl bg-white text-ink-900 font-medium border border-slate-200/80"
          >
            JSON 으로 내보내기
          </button>
          <p className="text-xs text-ink-500 leading-relaxed">
            모든 메모를 한 파일로 다운로드해서 따로 보관할 수 있어요.
          </p>
        </div>
      </section>
    </div>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
