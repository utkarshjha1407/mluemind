/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        line: 'var(--border)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        accent: 'var(--accent)',
        'accent-weak': 'var(--accent-weak)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        serif: ['"Fraunces Variable"', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      borderColor: { DEFAULT: 'var(--border)' },
      borderRadius: { sm: '6px', DEFAULT: '8px', md: '8px', lg: '12px', xl: '16px', '2xl': '20px' },
      maxWidth: { content: '1180px' },
      letterSpacing: { tightest: '-0.03em' },
      boxShadow: {
        soft: '0 14px 40px -12px rgba(40,32,24,0.12)',
        lift: '0 1px 0 0 rgba(40,32,24,0.04), 0 18px 50px -16px rgba(40,32,24,0.14)',
      },
    },
  },
  plugins: [],
}
