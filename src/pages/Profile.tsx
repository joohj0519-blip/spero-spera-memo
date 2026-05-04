import { useEffect, useState } from 'react'
import { listMemos } from '../db'
import type { Memo } from '../types'
import { MEMO_TYPE_META } from '../types'
import { TopBar } from '../components/TopBar'

export default function Profile() {
  const [memos, setMemos] = useState<Memo[]>([])
  useEffect(() => {
    void listMemos().then(setMemos)
  }, [])

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

      <section className="px-5">
        <div className="rounded-2xl bg-white shadow-soft border border-white/80 p-5">
          <p className="text-sm text-ink-500">총 메모</p>
          <p className="text-3xl font-bold text-ink-900">{memos.length}</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {(Object.keys(counts) as Array<keyof typeof counts>).map((k) => (
              <div key={k} className="rounded-xl bg-ink-900/[0.03] p-3">
                <p className="text-xs text-ink-500">{MEMO_TYPE_META[k].label}</p>
                <p className="text-xl font-bold text-ink-900">{counts[k]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-2xl bg-white shadow-soft border border-white/80 p-5">
          <p className="text-sm text-ink-500">첨부파일</p>
          <p className="text-2xl font-bold text-ink-900">
            {totalAttachments}<span className="text-base text-ink-500 font-medium ml-1">개</span>
          </p>
          <p className="mt-1 text-xs text-ink-400">
            로컬 저장 용량 약 {formatBytes(totalBytes)}
          </p>
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-2xl bg-white shadow-soft border border-white/80 p-5 space-y-3">
          <h3 className="font-semibold text-ink-900">데이터</h3>
          <button
            onClick={exportJson}
            className="w-full px-4 py-3 rounded-xl bg-ink-900 text-white font-medium"
          >
            JSON 으로 내보내기
          </button>
          <p className="text-xs text-ink-500 leading-relaxed">
            현재는 이 기기 브라우저(IndexedDB) 에만 저장됩니다.<br />
            추후 Google Drive 동기화가 추가되면 여러 기기에서 같은 메모를 볼 수 있어요.
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
