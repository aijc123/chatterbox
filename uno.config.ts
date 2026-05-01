import { defineConfig, presetWind4 } from 'unocss'

export default defineConfig({
  presets: [
    presetWind4({
      prefix: 'lc-',
      variablePrefix: 'lc-',
      preflights: {
        reset: false,
        theme: 'on-demand',
        property: false,
      },
    }),
  ],
  theme: {
    colors: {
      ga1: 'var(--Ga1, #f5f5f5)',
      ga1s: 'var(--Ga1_s, rgba(0,0,0,.04))',
      ga2: 'var(--Ga2, #eee)',
      ga3: 'var(--Ga3, #ddd)',
      ga4: 'var(--Ga4, #999)',
      bg1: 'var(--bg1, #fff)',
      bg2: 'var(--bg2, #f5f5f5)',
      brand: '#007aff',
      danger: '#ff3b30',
      success: '#34c759',
    },
  },
  preflights: [
    {
      getCSS: () => `
        #laplace-chatterbox-toggle,
        #laplace-chatterbox-dialog {
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
          font-size: 12px;
          letter-spacing: 0;
        }
      `,
    },
  ],
  content: {
    pipeline: {
      include: [/\.[jt]sx?($|\?)/],
    },
  },
})
