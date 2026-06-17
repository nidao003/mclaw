/** @type {import('tailwindcss').Config} */

/* ──────────────────────────────────────────────────────────────────────────
 * mclaw SkillHub Web — Tailwind design tokens
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Web follows the public skillhub.cn style: white canvas, black capsule CTAs,
 * blue editorial emphasis, rounded search controls, and list-first skill rows.
 * ────────────────────────────────────────────────────────────────────────── */

module.exports = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/shared/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont',
          '"SF Pro Text"', '"PingFang SC"', '"Helvetica Neue"', 'Arial',
          'sans-serif',
        ],
        display: [
          '"Outfit"', '-apple-system', 'BlinkMacSystemFont',
          '"SF Pro Display"', '"PingFang SC"', 'sans-serif',
        ],
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        mono: [
          '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Monaco',
          'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace',
        ],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        tiny: ['11px', { lineHeight: '16px' }],
        meta: ['13px', { lineHeight: '18px' }],
        subtitle: ['17px', { lineHeight: '24px' }],
        stat: ['40px', { lineHeight: '1' }],
      },
      colors: {
        // shadcn semantic tokens
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // mclaw brand tokens
        brand: {
          DEFAULT: '#EE7C4B',
          hover: '#D95A2B',
        },
        skillhub: {
          blue: '#3957FF',
          ink: '#1C1C1E',
          black: '#202020',
          line: '#E6E9EF',
          soft: '#F6F7FB',
        },
        skill: {
          bg: '#EE7C4B',
          fg: '#D95A2B',
          'fg-dark': '#F5976B',
        },
        surface: {
          modal: 'hsl(var(--surface-modal) / <alpha-value>)',
          input: 'hsl(var(--surface-input) / <alpha-value>)',
          sidebar: 'hsl(var(--surface-sidebar) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--surface-sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          muted: 'hsl(var(--sidebar-foreground-muted))',
          hover: 'hsl(var(--sidebar-hover) / <alpha-value>)',
          active: 'hsl(var(--sidebar-active))',
        },
        usage: {
          input: 'hsl(var(--usage-input) / <alpha-value>)',
          output: 'hsl(var(--usage-output) / <alpha-value>)',
          cache: 'hsl(var(--usage-cache) / <alpha-value>)',
        },
      },
      borderRadius: {
        '4xl': 'calc(var(--radius) * 2.6)',
        '3xl': 'calc(var(--radius) * 2.2)',
        '2xl': 'calc(var(--radius) * 1.8)',
        xl: 'calc(var(--radius) * 1.4)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) * 0.8)',
        sm: 'calc(var(--radius) * 0.6)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
