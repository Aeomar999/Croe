import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        page: '#EBEAE5',
        canvas: '#F7F9FC',
        surface: '#FFFFFF',
        sunken: '#F1F5F9',
        scrim: 'rgba(15, 23, 42, 0.42)',
        // Ink
        ink: {
          primary: '#172033',
          secondary: '#475569',
          tertiary: '#718096',
          onInk: '#FFFFFF',
        },
        // Flat color aliases for direct usage (text-on-ink, bg-ink-primary, etc.)
        'ink-primary': '#172033',
        'ink-secondary': '#475569',
        'ink-tertiary': '#718096',
        'on-ink': '#FFFFFF',
        // Line
        line: {
          primary: '#E2E8F0',
          secondary: '#CBD5E1',
        },
        'line-primary': '#E2E8F0',
        'line-secondary': '#CBD5E1',
        // Semantic States
        state: {
          pending: {
            fill: '#EFEFEC',
            on: '#5B5E63',
            wash: '#F3F3F0',
            deep: '#5B5E63',
          },
          secure: {
            fill: '#2563EB',
            on: '#FFFFFF',
            wash: '#EFF6FF',
            deep: '#1E40AF',
          },
          done: {
            fill: '#172033',
            on: '#FFFFFF',
            wash: '#EFEFEC',
            deep: '#172033',
          },
          caution: {
            fill: '#D39B31',
            on: '#2A1F05',
            wash: '#FFF7E6',
            deep: '#8A5A00',
          },
          danger: {
            fill: '#B7791F',
            on: '#FFFFFF',
            wash: '#FFF7ED',
            deep: '#854D0E',
          },
        },
        // Flat state color aliases
        'state-pending-fill': '#EFEFEC',
        'state-pending-on': '#5B5E63',
        'state-pending-wash': '#F3F3F0',
        'state-pending-deep': '#5B5E63',
        'state-secure-fill': '#2563EB',
        'state-secure-on': '#FFFFFF',
        'state-secure-wash': '#EFF6FF',
        'state-secure-deep': '#1E40AF',
        'state-done-fill': '#172033',
        'state-done-on': '#FFFFFF',
        'state-done-wash': '#EFEFEC',
        'state-done-deep': '#172033',
        'state-caution-fill': '#D39B31',
        'state-caution-on': '#2A1F05',
        'state-caution-wash': '#FFF7E6',
        'state-caution-deep': '#8A5A00',
        'state-danger-fill': '#B7791F',
        'state-danger-on': '#FFFFFF',
        'state-danger-wash': '#FFF7ED',
        'state-danger-deep': '#854D0E',
        // Carrier colours
        carrier: {
          mtn: '#FFCC00',
          telecel: '#E60000',
          at: '#004F9F',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Segoe UI Variable Text', 'Segoe UI', '-apple-system', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['36px', { lineHeight: '40px', fontWeight: '800', letterSpacing: '-0.03em' }],
        'title': ['24px', { lineHeight: '30px', fontWeight: '700', letterSpacing: '-0.022em' }],
        'heading': ['17px', { lineHeight: '22px', fontWeight: '700', letterSpacing: '-0.012em' }],
        'subhead': ['15px', { lineHeight: '20px', fontWeight: '600', letterSpacing: '-0.006em' }],
        'body': ['15px', { lineHeight: '22px', fontWeight: '500' }],
        'label': ['14px', { lineHeight: '18px', fontWeight: '600' }],
        'caption': ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'micro': ['11px', { lineHeight: '14px', fontWeight: '700', letterSpacing: '0.05em' }],
      },
      spacing: {
        's-1': '4px',
        's-2': '8px',
        's-3': '12px',
        's-4': '16px',
        's-5': '20px',
        's-6': '24px',
        's-7': '28px',
        's-8': '32px',
        's-10': '40px',
        's-12': '48px',
        'gutter': '20px',
        'pad-sheet': '20px',
        'gap-section': '24px',
        'gap-row': '12px',
      },
      borderRadius: {
        'r-1': '12px',
        'r-2': '16px',
        'r-3': '20px',
        'r-4': '24px',
        'r-full': '999px',
      },
      boxShadow: {
        'elev': '0 8px 24px rgba(30, 64, 175, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
        'elev-lift': '0 16px 36px rgba(30, 64, 175, 0.11), 0 4px 10px rgba(15, 23, 42, 0.06)',
      },
      transitionDuration: {
        'state': '160ms',
        'layer': '240ms',
      },
      transitionTimingFunction: {
        'ease': 'cubic-bezier(0.2, 0.8, 0.25, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
