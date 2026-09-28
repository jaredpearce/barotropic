import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design-token-backed semantic colors.
        background: "var(--color-bg-primary)",
        surface: "var(--color-bg-surface)",
        foreground: "var(--color-text-primary)",
        muted: "var(--color-text-secondary)",
        border: "var(--color-border)",
        accent: "var(--color-accent)",
        "accent-subtle": "var(--color-accent-subtle)",
        // Preserve the existing weather vocabulary while routing it through tokens.
        sky: {
          50: "var(--color-accent-subtle)",
          100: "color-mix(in srgb, var(--color-accent) 15%, var(--color-bg-primary))",
          200: "var(--color-border)",
          300: "color-mix(in srgb, var(--color-accent) 45%, var(--color-bg-surface))",
          500: "var(--color-accent)",
          600: "var(--color-accent)",
          700: "color-mix(in srgb, var(--color-accent) 80%, var(--color-text-primary))",
          900: "var(--color-text-primary)",
        },
      },
      fontFamily: {
        sans: ["var(--font_family)"],
      },
      fontSize: {
        base: "var(--font_size_step-1)",
        lg: "var(--font_size_step-2)",
        xl: "var(--font_size_step-3)",
        "2xl": "var(--font_size_step-4)",
        "3xl": "var(--font_size_step-5)",
        "4xl": "var(--font_size_step-6)",
      },
      spacing: {
        token1: "var(--space_scale-1)",
        token2: "var(--space_scale-2)",
        token3: "var(--space_scale-3)",
        token4: "var(--space_scale-4)",
        token5: "var(--space_scale-5)",
      },
    },
  },
  plugins: [],
};

export default config;
