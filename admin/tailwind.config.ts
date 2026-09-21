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
        page: '#E6E6E3',
        canvas: '#F1F1EF',
        surface: '#FFFFFF',
        sunken: '#F5F5F3',
        scrim: 'rgba(20,22,26,0.34)',
        // Ink
        ink: {
          primary: '#17181B',
          secondary: '#4A4D52',
          tertiary: '#8E9297',
          onInk: '#FFFFFF',
        },
        // Flat color aliases for direct usage (text-on-ink, bg-ink-primary, etc.)
        'ink-primary': '#17181B',
        'ink-secondary': '#4A4D52',
        'ink-tertiary': '#8E9297',
        'on-ink': '#FFFFFF',
        // Line
        line: {
          primary: '#E7E7E4',
          secondary: '#D9D9D5',
        },
        'line-primary': '#E7E7E4',
        'line-secondary': '#D9D9D5',
        // Semantic States
        state: {
          pending: {
            fill: '#EFEFEC',
            on: '#5B5E63',
            wash: '#F3F3F0',
            deep: '#5B5E63',
          },
          secure: {
            fill: '#1FC16B',
            on: '#17181B',
            wash: '#E8F8F0',
            deep: '#127A45',
          },
          done: {
            fill: '#17181B',
            on: '#FFFFFF',
            wash: '#EFEFEC',
            deep: '#17181B',
          },
          caution: {
            fill: '#F5B02E',
            on: '#2A1F05',
            wash: '#FDF3E1',
            deep: '#8A5A00',
          },
          danger: {
            fill: '#EF4444',
            on: '#17181B',
            wash: '#FDECEC',
            deep: '#A62020',
          },
        },
        // Flat state color aliases
        'state-pending-fill': '#EFEFEC',
        'state-pending-on': '#5B5E63',
        'state-pending-wash': '#F3F3F0',
        'state-pending-deep': '#5B5E63',
        'state-secure-fill': '#1FC16B',
        'state-secure-on': '#17181B',
        'state-secure-wash': '#E8F8F0',
        'state-secure-deep': '#127A45',
        'state-done-fill': '#17181B',
        'state-done-on': '#FFFFFF',
        'state-done-wash': '#EFEFEC',
        'state-done-deep': '#17181B',
        'state-caution-fill': '#F5B02E',
        'state-caution-on': '#2A1F05',
        'state-caution-wash': '#FDF3E1',
        'state-caution-deep': '#8A5A00',
        'state-danger-fill': '#EF4444',
        'state-danger-on': '#17181B',
        'state-danger-wash': '#FDECEC',
        'state-danger-deep': '#A62020',
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
        'elev': '0 8px 24px rgba(20,22,26,0.08), 0 2px 6px rgba(20,22,26,0.04)',
        'elev-lift': '0 14px 34px rgba(20,22,26,0.12), 0 3px 8px rgba(20,22,26,0.05)',
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