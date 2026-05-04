# spero spera · 메모

> _dum spiro, spero_ — 숨쉬는 한, 희망한다.

가벼운 메모 / 체크리스트 / 할 일 웹앱. 노트북·데스크톱·모바일에서 동일한 화면을 사용할 수 있는 반응형 PWA-ready 구조.

## 기능

- **3가지 메모 유형** — 메모(자유 텍스트), 체크리스트(여러 항목), 할 일(완료 토글)
- **파일 첨부** — 이미지/문서를 메모에 붙임 (개당 5MB, 로컬 IndexedDB 저장)
- **날짜 지정** — 마감/일정 날짜 선택, 캘린더 뷰에서 한 번에 확인
- **고정 / 검색 / 필터** — 자주 보는 메모 상단 고정, 키워드 검색, 유형별 필터
- **JSON 백업** — 프로필 화면에서 전체 데이터 내보내기

## 데이터 저장

- **현재**: 브라우저 IndexedDB (`idb-keyval`). 기기/브라우저 한정.
- **예정**: Google Drive `appDataFolder` 동기화 → 노트북·모바일·웹 어디서나 동일한 데이터.

## 데이터 스키마

```ts
type MemoType = 'note' | 'checklist' | 'todo'

interface Memo {
  id: string
  type: MemoType
  title: string
  body: string
  items: { id: string; text: string; checked: boolean }[]
  dueDate?: string             // 'YYYY-MM-DD'
  attachments: {
    id: string; name: string; mime: string; size: number; dataUrl: string
  }[]
  pinned: boolean
  done?: boolean               // todo 전용
  createdAt: number
  updatedAt: number
}
```

## 개발

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 산출
npm run preview  # 빌드 결과 로컬 미리보기
```

## GitHub Pages 배포

1. GitHub 에서 새 리포지터리 생성 (예: `spero-spera-memo`)
2. 로컬에서 push:
   ```bash
   git init
   git add .
   git commit -m "init: spero spera memo"
   git branch -M main
   git remote add origin https://github.com/<USER>/<REPO>.git
   git push -u origin main
   ```
3. GitHub 리포지터리 → **Settings → Pages → Build and deployment → Source: GitHub Actions**
4. `main` 브랜치에 push 하면 `.github/workflows/deploy.yml` 이 자동으로 빌드·배포
5. 몇 분 뒤 `https://<USER>.github.io/<REPO>/` 에서 접속

워크플로우는 리포 이름을 자동으로 `VITE_BASE` 로 사용하므로 별도 설정이 필요 없다. 사용자/조직 사이트(`<USER>.github.io`)에 배포하려면 `VITE_BASE` 를 `/` 로 변경.

## 스택

- Vite 8 + React 19 + TypeScript 6
- Tailwind CSS 3
- React Router 7
- idb-keyval (IndexedDB)
- date-fns 4
