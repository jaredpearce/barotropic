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
        // Design-token-backed semantic colors.
        background: 'var(--color-background)',
        surface: 'var(--color-surface-primary)',
        foreground: 'var(--color-text-primary)',
        muted: 'var(--color-text-secondary)',
        border: 'var(--color-border)',
        accent: 'var(--color-accent-emerald)',
        'accent-subtle': 'var(--color-surface-secondary)',
        // Preserve the existing weather vocabulary while routing it through tokens.
        sky: {
          50: 'var(--color-surface-secondary)',
          100: 'color-mix(in oklch, var(--color-accent-emerald) 15%, var(--color-background))',
          200: 'var(--color-border)',
          300: 'color-mix(in oklch, var(--color-accent-emerald) 45%, var(--color-surface-primary))',
          500: 'var(--color-accent-emerald)',
          600: 'var(--color-accent-emerald)',
          700: 'color-mix(in oklch, var(--color-accent-emerald) 80%, var(--color-text-primary))',
          900: 'var(--color-text-primary)',
        },
      },
      fontFamily: {
        sans: ['var(--font-family-body)'],
        mono: ['var(--font-family-code)'],
      },
      fontSize: {
        base: 'var(--font-size-step-1)',
        lg: 'var(--font-size-step-2)',
        xl: 'var(--font-size-step-3)',
        '2xl': 'var(--font-size-step-4)',
        '3xl': 'var(--font-size-step-5)',
        '4xl': 'var(--font-size-step-6)',
      },
      spacing: {
        token1: 'var(--space-scale-1)',
        token2: 'var(--space-scale-2)',
        token3: 'var(--space-scale-3)',
        token4: 'var(--space-scale-4)',
        token5: 'var(--space-scale-5)',
      },
      boxShadow: {
        DEFAULT: 'var(--effect-small)',
        small: 'var(--effect-small)',
        medium: 'var(--effect-medium)',
      },
    },
  },
  plugins: [],
};

export default config;
