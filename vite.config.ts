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
        connect: [
          'bilibili-guard-room.vercel.app',
          'localhost',
          // 烂梗库专属梗源（灰泽满直播间等社区自建库）
          'sbhzm.cn',
          // chatterbox-cloud 自建后端（聚合 LAPLACE+SBHZM+社区贡献，硬审核）
          // 默认部署在 *.workers.dev；本地开发时 cbBackendUrlOverride 走上面的 localhost。
          'chatterbox-cloud.aijc-eric.workers.dev',
          // live-meme-radar 传感器后端（跨房间 meme 聚类 + trending rank）。
          // Week 8 起 auto-blend 通过 /radar/cluster-rank 软门查询；Week 9-10 起
          // 可选地把本房间聚合 sample POST 到 /radar/report。两条路径默认 false。
          'live-meme-radar.aijc-eric.workers.dev',
          // 智能辅助驾驶 LLM 默认 provider
          'api.anthropic.com',
          'api.openai.com',
          // OpenAI 兼容自定义 base URL（DeepSeek/Moonshot/OpenRouter/Ollama/小米 mimo 等）。
          // 之前我们没有兜底 → TM 直接以 "domain is not a part of the @connect list"
          // 拒绝，连权限弹窗都不会出。加 '*' 后 TM 仍会在首次访问每个新域时弹一次
          // 用户确认（这是用户授权 LLM 的最后一道闸门），但不会再无声拒绝。
          '*',
        ],
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
