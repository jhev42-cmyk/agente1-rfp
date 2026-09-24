import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1F3864',
        blue: '#2E5395',
        'blue-light': '#D9E2F3',
      }
    },
  },
  plugins: [],
}
export default config
