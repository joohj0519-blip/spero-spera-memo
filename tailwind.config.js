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
        ink: {
          900: '#0f172a',
          700: '#334155',
          500: '#64748b',
          400: '#94a3b8',
        },
        note: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
        },
        check: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#f43f5e',
          600: '#e11d48',
        },
        todo: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
        },
      },
      boxShadow: {
        card: '0 4px 20px -8px rgba(15, 23, 42, 0.12), 0 2px 6px -2px rgba(15, 23, 42, 0.06)',
        soft: '0 2px 8px -2px rgba(15, 23, 42, 0.08)',
      },
      backgroundImage: {
        'sky-fade': 'linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 50%, #ffffff 100%)',
      },
    },
  },
  plugins: [],
}
