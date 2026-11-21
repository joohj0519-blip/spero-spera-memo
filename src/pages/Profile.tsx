import { useEffect, useState } from 'react'
import { listMemos, listVisibleMemos } from '../db'
import type { Memo } from '../types'
import { TYPE_THEME, FACE, CHAR } from '../lib/theme'
import { Brand, FolderStack, Sheet } from '../components/Folder'
import { AppIcon, BellIcon, DownloadIcon, GridIcon, SyncIcon } from '../components/Icons'
import { cleanGroupName, collectGroups, removeGroup, renameGroup } from '../lib/groups'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { useInstallPrompt, useStandalone } from '../hooks/usePwa'
import {
  ensureInit,
  fetchUserInfo,
  getLastError,
  getLastSync,
  getRemoteFileId,
  getStoredUser,
  isSignedIn,
  signIn,
  signOut,
  type UserInfo,
} from '../lib/drive'
import { onMemosChanged, onSyncState, syncImmediately } from '../lib/sync'
import { notificationPermission, requestNotificationPermission } from '../lib/reminders'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function Profile() {
  const [memos, setMemos] = useState<Memo[]>([])
  const isStandalone = useStandalone()
  const { canInstall, installed, install } = useInstallPrompt()
  const [drive, setDrive] = useState<{
    ready: boolean
    signedIn: boolean
    user: UserInfo | null
    initError?: string
    signInError?: string
  }>({ ready: false, signedIn: false, user: getStoredUser() })

  const [sync, setSync] = useState(() => ({
    status: 'idle' as 'idle' | 'syncing' | 'error' | 'offline',
    lastError: getLastError()?.msg,
    lastAt: getLastSync() ?? undefined,
  }))

  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(
    () => notificationPermission(),
  )

  useEffect(() => {
    const reload = () => { void listVisibleMemos().then(setMemos) }
    reload()
    return onMemosChanged(reload)
  }, [])

  useEffect(() => {
    void ensureInit()
      .then(async () => {
        const signed = isSignedIn()
        let user = getStoredUser()
        if (signed && !user) user = await fetchUserInfo()
        setDrive((s) => ({ ...s, ready: true, signedIn: signed, user }))
      })
      .catch((e) => setDrive((s) => ({ ...s, initError: String(e?.message ?? e) })))
  }, [])

  useEffect(() => {
    return onSyncState((s) => {
      setSync({ status: s.status, lastError: s.lastError, lastAt: s.lastAt ?? getLastSync() ?? undefined })
      // 동기화 후 로그인 상태가 바뀌었을 수 있음
      setDrive((d) => ({ ...d, signedIn: isSignedIn() }))
    })
  }, [])

  const handleSignIn = async () => {
    setDrive((s) => ({ ...s, signInError: undefined }))
    try {
      await signIn()
      const user = await fetchUserInfo()
      setDrive((s) => ({ ...s, signedIn: true, user }))
      await syncImmediately('after-signin')
    } catch (e: unknown) {
      setDrive((s) => ({ ...s, signInError: e instanceof Error ? e.message : String(e) }))
    }
  }

  const handleSync = async () => {
    await syncImmediately('manual')
  }

  const handleSignOut = () => {
    signOut()
    setDrive((s) => ({ ...s, signedIn: false, user: null }))
  }

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission()
    setNotifPerm(result)
  }

  const counts = {
    note: memos.filter((m) => m.type === 'note').length,
    checklist: memos.filter((m) => m.type === 'checklist').length,
    todo: memos.filter((m) => m.type === 'todo').length,
    event: memos.filter((m) => m.type === 'event').length,
  }
  const totalAttachments = memos.reduce((acc, m) => acc + m.attachments.length, 0)
  const totalBytes = memos.reduce(
    (acc, m) => acc + m.attachments.reduce((a, x) => a + x.size, 0),
    0,
  )

  const exportJson = async () => {
    const all = await listMemos() // 백업에는 대시보드 설정까지 전부 포함
    const data = JSON.stringify(all, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spero-spera-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const groups = collectGroups(memos)
  const handleRenameGroup = async (name: string) => {
    const next = cleanGroupName(window.prompt(`'${name}' 그룹의 새 이름을 적어 주세요.`, name) ?? '')
    if (!next || next === name) return
    await renameGroup(name, next)
  }
  const handleRemoveGroup = async (name: string, count: number) => {
    // 그룹만 떼어 내고 메모는 그대로 둔다는 점을 분명히 알려 준다
    if (!window.confirm(`'${name}' 그룹을 지울까요?\n메모 ${count}개에서 이 그룹 표시만 떼어 내고, 메모는 지우지 않아요.`)) return
    await removeGroup(name)
  }

  const remoteFileId = getRemoteFileId()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const OK = 'bg-sage-tint text-sage-ink'
  const OFF = 'bg-sand-tint text-char-soft'
  const WARN = 'bg-terra-tint text-terra-ink'
  const PRIMARY = 'mt-2.5 w-full h-11 rounded-[10px] bg-char text-paper text-[13.5px] font-bold disabled:opacity-60'
  const OUTLINE = 'mt-2.5 w-full h-11 rounded-[10px] border-[1.5px] border-char text-char text-[13.5px] font-bold'

  return (
    <Sheet
      header={
        <div className="px-5 pt-[30px] flex flex-col gap-[3px]">
          <Brand />
          <h1 className="m-0 text-[26px] leading-[1.1] font-extrabold">
            프로필 <span className="text-[13px] font-semibold text-char-mute">dum spiro, spero</span>
          </h1>
        </div>
      }
      stack={
        <FolderStack
          label="설정"
          folders={[{ id: 'settings', label: '설정', color: FACE, fg: CHAR, x: 14 }]}
          activeId="settings"
          tabWidth={50}
          frontStrip={6}
        />
      }
    >
      <div className="px-4 pt-2 pb-5 flex flex-col gap-2">
        {/* 요약 띠 */}
        <div className="grid grid-cols-2 h-[58px] rounded-xl bg-char">
          <div className="flex flex-col items-center justify-center gap-0.5">
            <div className="text-[17px] font-bold leading-none text-paper tabular-nums">{memos.length}</div>
            <div className="text-[10.5px] text-[#D9CDB9]">총 메모</div>
          </div>
          <div className="flex flex-col items-center justify-center gap-0.5 border-l border-char-soft">
            <div className="text-[17px] font-bold leading-none text-paper tabular-nums">
              {totalAttachments}개 · {formatBytes(totalBytes)}
            </div>
            <div className="text-[10.5px] text-[#D9CDB9]">첨부파일</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(counts) as Array<keyof typeof counts>).map((k) => (
            <div key={k} className="h-[52px] rounded-[10px] bg-sheet border border-line flex items-center gap-1.5 px-2">
              <span aria-hidden className="w-1.5 h-7 shrink-0 rounded-full" style={{ background: TYPE_THEME[k].bg }} />
              <span className="flex flex-col min-w-0">
                <span className="text-[11px] text-char-mute truncate">{TYPE_THEME[k].label}</span>
                <span className="text-[15px] font-bold leading-tight tabular-nums">{counts[k]}</span>
              </span>
            </div>
          ))}
        </div>

        {/* 그룹 관리 */}
        <Card Icon={GridIcon} title="그룹" status={<Chip cls={OFF}>{groups.length}개</Chip>}>
          {groups.length === 0 ? (
            <p className="mt-2 mb-0 text-xs leading-[1.55] text-char-soft">
              아직 그룹이 없어요. 메모를 쓸 때 <b>그룹</b> 칸에 이름을 적으면 만들어져요.
            </p>
          ) : (
            <ul className="mt-2 mb-0 p-0 list-none flex flex-col">
              {groups.map((g) => (
                <li key={g.name} className="flex items-center gap-2 h-11 border-b border-rule last:border-b-0">
                  <span className="flex-1 min-w-0 truncate text-[13.5px] font-semibold">#{g.name}</span>
                  <span className="shrink-0 text-[11.5px] text-char-mute tabular-nums">{g.count}개</span>
                  <button type="button" onClick={() => void handleRenameGroup(g.name)} className="shrink-0 h-9 px-2.5 rounded-lg border border-line text-xs font-semibold">
                    이름 변경
                  </button>
                  <button type="button" onClick={() => void handleRemoveGroup(g.name, g.count)} className="shrink-0 h-9 px-2.5 rounded-lg border border-terra/40 text-terra-dark text-xs font-semibold">
                    지우기
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Google Drive 동기화 */}
        <Card
          Icon={SyncIcon}
          title="Google Drive 동기화"
          status={
            drive.signedIn
              ? <Chip cls={OK}>{sync.status === 'syncing' ? '동기화 중…' : '연결됨 · 자동'}</Chip>
              : <Chip cls={OFF}>미연결</Chip>
          }
        >
          <p className="mt-2 mb-0 text-xs leading-[1.55] text-char-soft">
            본인 Drive 의 <b>앱 전용 폴더</b>에 메모가 저장돼요. 노트북·휴대폰 어디서든 <b>같은 계정</b>으로 로그인하면
            메모 저장·앱 시작·5분 간격 등 자동으로 동기화됩니다.
          </p>

          {!drive.ready ? (
            <p className="mt-2 mb-0 text-xs text-char-mute">Google API 로딩 중…</p>
          ) : !drive.signedIn ? (
            <button type="button" onClick={() => void handleSignIn()} className={PRIMARY}>
              Google 계정으로 연결
            </button>
          ) : (
            <>
              {drive.user?.email && (
                <div className="mt-2.5 flex items-center gap-2 px-3 h-10 rounded-[10px] bg-sand-tint text-xs">
                  {drive.user.picture && (
                    <img src={drive.user.picture} alt="" className="w-6 h-6 rounded-full" />
                  )}
                  <span className="flex-1 truncate">
                    <b>{drive.user.email}</b>
                    {drive.user.name && <span className="text-char-soft"> · {drive.user.name}</span>}
                  </span>
                </div>
              )}
              <button type="button" onClick={() => void handleSync()} disabled={sync.status === 'syncing'} className={PRIMARY}>
                {sync.status === 'syncing' ? '동기화 중…' : '지금 동기화'}
              </button>
              <div className="mt-2 flex items-center justify-between text-[11px] text-char-mute">
                <span>
                  {sync.lastAt
                    ? `마지막 동기화: ${format(new Date(sync.lastAt), 'M월 d일 HH:mm:ss', { locale: ko })}`
                    : '아직 동기화 안 됨'}
                </span>
                <button type="button" onClick={handleSignOut} className="py-1.5 underline hover:text-terra-dark">
                  연결 해제
                </button>
              </div>
            </>
          )}

          {sync.lastError && (
            <div className="mt-2 text-xs text-terra-ink bg-terra-tint rounded-lg p-2">
              <p className="m-0 font-bold">마지막 동기화 오류</p>
              <p className="mt-1 mb-0 break-words">{sync.lastError}</p>
            </div>
          )}
          {drive.signInError && (
            <p className="mt-2 mb-0 text-xs text-terra-dark">로그인 오류: {drive.signInError}</p>
          )}
          {drive.initError && (
            <p className="mt-2 mb-0 text-xs text-terra-dark">초기화 오류: {drive.initError}</p>
          )}

          {/* 진단 — 두 기기에서 비교해보면 동기화 안 되는 원인 파악 가능 */}
          <details className="text-[11px] text-char-mute mt-2">
            <summary className="cursor-pointer py-1">동기화 진단 정보</summary>
            <dl className="mt-1 mb-0 grid grid-cols-[80px_1fr] gap-y-1">
              <dt>앱 주소</dt>
              <dd className="m-0 text-char-soft break-all">{origin}</dd>
              <dt>계정</dt>
              <dd className="m-0 text-char-soft break-all">{drive.user?.email ?? '(미로그인)'}</dd>
              <dt>Drive 파일 ID</dt>
              <dd className="m-0 text-char-soft break-all">{remoteFileId ?? '(아직 없음)'}</dd>
              <dt>로컬 메모</dt>
              <dd className="m-0 text-char-soft">{memos.length}개</dd>
              <dt>상태</dt>
              <dd className="m-0 text-char-soft">{sync.status}</dd>
            </dl>
            <p className="mt-2 mb-0 leading-relaxed">
              ※ <b>두 기기에서 같은 계정 / 같은 앱 주소</b>가 아니면 동기화 안 됩니다.
              위 값을 노트북·모바일에서 비교해보세요.
            </p>
          </details>
        </Card>

        {/* 날짜 알림 */}
        <Card
          Icon={BellIcon}
          title="날짜 알림"
          status={
            notifPerm === 'granted' ? <Chip cls={OK}>켜짐</Chip>
              : notifPerm === 'denied' ? <Chip cls={WARN}>차단됨</Chip>
                : notifPerm === 'unsupported' ? <Chip cls={OFF}>지원 안 됨</Chip>
                  : <Chip cls={OFF}>꺼짐</Chip>
          }
        >
          <p className="mt-2 mb-0 text-xs leading-[1.55] text-char-soft">
            할 일·체크리스트에 날짜를 설정하면 그 날짜에 앱 상단 배너로 알려줘요. 확인을 누른 알림은 다시 나오지 않아요.
            아래 권한을 허용하면 앱이 닫혀 있어도 시스템 알림으로 표시됩니다.
          </p>
          {notifPerm === 'default' && (
            <button type="button" onClick={() => void handleEnableNotifications()} className={PRIMARY}>
              시스템 알림 허용
            </button>
          )}
          {notifPerm === 'denied' && (
            <p className="mt-2 mb-0 text-xs text-terra-ink bg-terra-tint rounded-lg p-2">
              브라우저에서 알림이 차단되어 있어요. 주소창의 자물쇠 아이콘 → 알림 권한을 허용으로 바꾸면 다시 사용할 수 있습니다.
            </p>
          )}
          {notifPerm === 'unsupported' && (
            <p className="mt-2 mb-0 text-xs text-char-mute">이 브라우저는 시스템 알림을 지원하지 않아요. 앱 안에서는 그래도 배너로 보여드려요.</p>
          )}
        </Card>

        {/* 앱으로 설치 — 이미 별도 창으로 실행 중이면 숨김 */}
        {!isStandalone && (
          <Card Icon={AppIcon} title="앱으로 설치" status={installed ? <Chip cls={OK}>설치됨</Chip> : null}>
            <p className="mt-2 mb-0 text-xs leading-[1.55] text-char-soft">
              브라우저 창이 아닌 <b>별도의 작은 창</b>으로 떠서 다른 작업과 함께 쓸 수 있어요.
            </p>
            {installed ? (
              <p className="mt-2 mb-0 text-xs font-bold text-sage-ink">설치 완료 — 시작 메뉴에서 열어보세요.</p>
            ) : canInstall ? (
              <button type="button" onClick={() => void install()} className={OUTLINE}>
                바로 설치하기
              </button>
            ) : (
              <details className="mt-2 text-xs text-char-soft">
                <summary className="cursor-pointer py-1 font-semibold">수동 설치 방법 보기</summary>
                <ul className="mt-1 mb-0 space-y-1.5 pl-4 list-disc">
                  <li><b>Chrome / Edge (PC)</b>: 주소창 오른쪽 끝의 <b>설치</b> 아이콘 클릭, 또는 메뉴 → "앱 설치"</li>
                  <li><b>Safari (iPhone)</b>: 공유 → "홈 화면에 추가"</li>
                  <li><b>Chrome (Android)</b>: 메뉴 → "앱 설치" / "홈 화면에 추가"</li>
                </ul>
              </details>
            )}
          </Card>
        )}

        {/* 로컬 백업 */}
        <Card Icon={DownloadIcon} title="로컬 백업" status={null}>
          <p className="mt-2 mb-0 text-xs leading-[1.55] text-char-soft">
            모든 메모를 한 파일로 다운로드해서 따로 보관할 수 있어요.
          </p>
          <button type="button" onClick={exportJson} className={OUTLINE}>
            JSON 으로 내보내기
          </button>
        </Card>
      </div>
    </Sheet>
  )
}

function Chip({ cls, children }: { cls: string; children: ReactNode }) {
  return <span className={['shrink-0 px-[9px] py-[3px] rounded-full text-[10.5px] font-bold', cls].join(' ')}>{children}</span>
}

function Card({
  Icon, title, status, children,
}: {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  status: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-xl bg-sheet border border-line px-3.5 py-3">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="w-8 h-8 shrink-0 rounded-lg bg-sand-tint grid place-items-center">
          <Icon width={17} height={17} />
        </span>
        <h2 className="m-0 flex-1 text-[14.5px] font-bold">{title}</h2>
        {status}
      </div>
      {children}
    </section>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
