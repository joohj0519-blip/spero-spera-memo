import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { listMemos } from '../db'
import { onMemosChanged } from '../lib/sync'
import type { Memo, MemoType } from '../types'

const dateLine = format(new Date(), 'yyyy.MM.dd · eee', { locale: ko })

const actionMeta: Record<MemoType, { emoji: string; label: string; desc: string; iconBg: string }> = {
  note: {
    emoji: '📝',
    label: '메모 작성',
    desc: '자유롭게 적어두기',
    iconBg: 'bg-emerald-100',
  },
  checklist: {
    emoji: '✅',
    label: '체크리스트',
    desc: '항목별로 정리하기',
    iconBg: 'bg-rose-100',
  },
  todo: {
    emoji: '🎯',
    label: '할 일 추가',
    desc: '오늘의 미션',
    iconBg: 'bg-sky-100',
  },
}

export default function Home() {
  const [memos, setMemos] = useState<Memo[]>([])

  useEffect(() => {
    const reload = () => { void listMemos().then(setMemos) }
    reload()
    return onMemosChanged(reload)
  }, [])

  const todoOpen = memos.filter((m) => m.type === 'todo' && !m.done).length
  const isEmpty = memos.length === 0

  return (
    <div className="flex-1 flex flex-col min-h-full">
      {/* ──── Cover (top ~1/2) ──── */}
      <section className="flex-1 flex flex-col px-6 pt-10 pb-4 relative overflow-hidden">
        <div className="text-[12px] tracking-[0.18em] text-ink-500 font-medium relative z-20">
          {dateLine}
        </div>

        {/* Title — 디스크 바로 아래에 'S' 가 오도록 (손→디스크→S 세로 정렬) */}
        <div className="absolute left-[calc(36%-60px)] bottom-[calc(16%-20px)] text-left z-10 whitespace-nowrap">
          <h1 className="font-semibold text-ink-900 leading-none tracking-tight text-[53px]">
            SPERO SPERA<span className="text-amber-500">.</span>
          </h1>
          <p className="mt-3 text-[14px] text-ink-500 tracking-wide text-right">
            <span className="italic">dum spiro, spero</span>
            <span className="mx-1.5 text-ink-300">·</span>
            <span>숨쉬는 한, 희망한다</span>
          </p>
        </div>

        {/* Character — 좌측 바닥, 작게(75%) 해서 날짜 안 가리도록 */}
        <img
          src={`${import.meta.env.BASE_URL}img/character.png`}
          alt=""
          aria-hidden="true"
          className="absolute select-none pointer-events-none z-30"
          style={{
            left: '-12px',
            bottom: 0,
            height: '75%',
            maxHeight: 460,
          }}
          draggable={false}
        />
      </section>

      {/* ──── Actions (bottom ~1/2) ──── */}
      <section className="shrink-0 px-5 pb-8">
        <p className="px-1 mb-3 text-xs text-ink-500">
          {isEmpty ? (
            '오늘부터 시작하기 좋아요'
          ) : (
            <>
              <b className="text-ink-900 font-semibold">{memos.length}</b>
              <span className="mx-1">개의 메모</span>
              {todoOpen > 0 && (
                <>
                  <span className="mx-2 text-ink-300">·</span>
                  <span>오늘 할 일 </span>
                  <b className="text-ink-900 font-semibold">{todoOpen}</b>
                </>
              )}
            </>
          )}
        </p>
        <div className="space-y-2">
          {(Object.keys(actionMeta) as MemoType[]).map((t) => (
            <ActionRow key={t} type={t} />
          ))}
        </div>
      </section>
    </div>
  )
}

function ActionRow({ type }: { type: MemoType }) {
  const m = actionMeta[type]
  return (
    <Link
      to={`/new?type=${type}`}
      className="group flex items-center gap-4 rounded-xl bg-white/90 border border-slate-200/80 shadow-soft hover:shadow-card active:scale-[0.995] transition-all px-4 py-3.5"
    >
      <div
        className={[
          'shrink-0 w-12 h-12 rounded-xl grid place-items-center text-2xl',
          m.iconBg,
        ].join(' ')}
      >
        <span aria-hidden>{m.emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink-900">{m.label}</p>
        <p className="text-xs text-ink-500 mt-0.5">{m.desc}</p>
      </div>
      <span className="text-ink-400 group-hover:text-ink-900 group-hover:translate-x-0.5 transition-all text-xl leading-none">
        ›
      </span>
    </Link>
  )
}
