import preact from '@preact/preset-vite'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import monkey, { util } from 'vite-plugin-monkey'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    UnoCSS(),
    preact(),
    monkey({
      entry: 'src/main.tsx',
      userscript: {
        name: 'B站独轮车 + 自动跟车 / Bilibili Live Auto Follow',
        namespace: 'https://github.com/aijc123/bilibili-live-wheel-auto-follow',
        description:
          '给 B 站/哔哩哔哩直播间用的弹幕助手：支持独轮车循环发送、自动跟车、Chatterbox Chat、粉丝牌禁言巡检、同传、烂梗库、弹幕替换和 AI 规避。',
        author: 'aijc123',
        license: 'AGPL-3.0',
        icon: 'https://www.bilibili.com/favicon.ico',
        homepageURL: 'https://github.com/aijc123/bilibili-live-wheel-auto-follow',
        supportURL: 'https://github.com/aijc123/bilibili-live-wheel-auto-follow/issues',
        match: ['*://live.bilibili.com/*'],
        connect: ['bilibili-guard-room.vercel.app', 'localhost'],
        'run-at': 'document-start',
      },
      build: {
        metaFileName: true,
        externalGlobals: {
          '@soniox/speech-to-text-web': [
            'SonioxSpeechToTextWeb',
            (version: string) =>
              `https://unpkg.com/@soniox/speech-to-text-web@${version}/dist/speech-to-text-web.umd.cjs`,
          ].concat(util.dataUrl(';window.SonioxSpeechToTextWeb=window["speech-to-text-web"];')),
        },
      },
    }),
  ],
})
