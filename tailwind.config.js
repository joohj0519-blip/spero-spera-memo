/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', '"Noto Sans KR"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        // 프레임 둥글기 ~5% 톤으로 다운
        'xl': '0.625rem',   // 10px (was 12px)
        '2xl': '0.875rem',  // 14px (was 16px)
        '3xl': '1.125rem',  // 18px (was 24px)
      },
      colors: {
        // ── Vintage Earthy 팔레트 (디자인톤 #2 / cindyroamingdesigns) ──
        // 중립(텍스트·테두리) — 따뜻한 에스프레소~아이보리. 기존 slate 계열을 대체.
        ink: {
          100: '#ECE5DA',
          200: '#DED4C6',
          300: '#C7B8A7',
          400: '#A89684',
          500: '#897564', // Feathers 톤의 따뜻한 뮤트 그레이
          600: '#6A584A',
          700: '#4A3A30',
          800: '#33271F',
          900: '#241B16', // Velvet Night 의 웜 버전
        },
        // note(메모) — Sagebound / Deep Olive
        note: {
          50: '#F3F2EA',
          100: '#E6E3D1',
          200: '#D0CBAC',
          300: '#B4AE84',
          400: '#9A9268',
          500: '#7B745B', // Sagebound #7B745B
          600: '#5E5844',
          700: '#433F2A', // Deep Olive #433F2A
        },
        // checklist(체크리스트) — Rose Bare / Burgundy
        check: {
          50: '#F7EDEB',
          100: '#EFD9D5',
          200: '#DDB5AD',
          300: '#C8988E',
          400: '#B3837A',
          500: '#9B756E', // Rose Bare #9B756E
          600: '#6E423D',
          700: '#422020', // Burgundy #422020
          900: '#2A1212',
        },
        // todo(할 일) — Honey Gold
        todo: {
          50: '#F8F1E2',
          100: '#EFE0C1',
          200: '#E1C792',
          300: '#CDAB6B',
          400: '#B08F55',
          500: '#947B50', // Honey Gold #947B50
          600: '#74623F',
          700: '#574830',
          900: '#352B1C',
        },
        // 포인트(고정·알림 배너) — 살짝 밝은 허니/앰버
        gold: {
          50: '#FBF3E1',
          100: '#F5E7C4',
          200: '#EBD49B',
          300: '#DDBC6E',
          500: '#B5883C',
          600: '#946D2E',
          700: '#735324',
          900: '#46330F',
        },
      },
      boxShadow: {
        // 그림자도 차가운 슬레이트 대신 따뜻한 브라운 톤으로
        card: '0 6px 22px -10px rgba(54, 38, 30, 0.28), 0 2px 6px -2px rgba(54, 38, 30, 0.12)',
        soft: '0 2px 10px -3px rgba(54, 38, 30, 0.14)',
      },
      backgroundImage: {
        'warm-fade': 'linear-gradient(180deg, #F4F1EA 0%, #EFEADF 50%, #E3DBCE 100%)',
      },
    },
  },
  plugins: [],
}
