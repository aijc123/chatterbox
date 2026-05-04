# 使用指南

这份文档面向 B 站直播间用户，说明 B站独轮车 + 自动跟车的用途、安装方式、主要功能、权限、隐私数据流、排障方式、已知限制和 bug 反馈方式。

## 项目做什么

B站独轮车 + 自动跟车是一个运行在 B 站直播间页面的 userscript。安装后，直播间页面会出现 `弹幕助手` 按钮。它可以帮你循环发送预设弹幕、自动跟随直播间里被多人重复发送的弹幕、接管右侧评论区、巡检粉丝牌房间状态、维护替换规则、处理疑似影子屏蔽、使用同传/翻译和烂梗库。

它不是 B 站官方功能。请控制自动发送频率，避免影响直播间秩序。

## 安装步骤

1. 安装脚本管理器：

   - [Tampermonkey](https://www.tampermonkey.net/)
   - [Violentmonkey](https://violentmonkey.github.io/)

2. 打开 [Greasy Fork 脚本页](https://greasyfork.org/zh-CN/scripts/574939-b%E7%AB%99%E7%8B%AC%E8%BD%AE%E8%BD%A6-%E8%87%AA%E5%8A%A8%E8%B7%9F%E8%BD%A6)。

3. 点击安装，并在脚本管理器页面确认。

4. 打开 `https://live.bilibili.com/` 下的任意直播间。

5. 点击 `弹幕助手`，按需开启功能。

本地构建安装：

```bash
bun install
bun run build
```

然后安装 `dist/bilibili-live-wheel-auto-follow.user.js`。

## 主要功能

- 独轮车：多行模板循环发送、随机间隔、随机颜色、随机字符、长弹幕拆分。
- 自动跟车：识别短时间内被多人重复发送的弹幕，并按阈值和冷却自动跟一句。
- Chatterbox Chat：接管右侧评论区，展示弹幕、礼物、醒目留言、舰队、进场、关注、点赞和分享事件。
- 粉丝牌禁言巡检：读取当前账号粉丝牌关联房间，分类展示限制、未知、主播注销和正常状态。
- 替换规则：支持云端、本地全局和当前房间规则。
- 影子屏蔽候选：默认只给候选改写，不自动发送。
- AI 规避：在明确开启自动重发和 AI 规避后，才会尝试改写并重发。
- 智能辅助驾驶（LLM 改写）：可选填入 Anthropic / OpenAI 或 OpenAI 兼容的 base URL（DeepSeek、Moonshot、OpenRouter、Ollama、小米 mimo 等）的 API key，让脚本调用 LLM 帮你改写疑似被屏蔽的弹幕。默认关闭，必须自己填入 API key 才会被使用；prompt 里只会包含当前要改写的弹幕和必要上下文。
- 同传和翻译：通过 Soniox 识别语音，并可发送识别或翻译结果。
- 烂梗库：搜索、复制、发送常用梗，也能从直播间弹幕里挖掘候选；可选向 chatterbox-cloud 自建后端提交贡献。

## 权限说明

- `@match *://live.bilibili.com/*`：只在 B 站直播间运行。
- `@require https://unpkg.com/@soniox/speech-to-text-web...`：加载同传/语音识别所需的 Soniox 浏览器端客户端。
- `@connect`：脚本会请求脚本管理器允许它访问以下域，每一项都对应一个具体功能；脚本管理器在首次访问每个新域时仍会单独弹窗确认：
  - `bilibili-guard-room.vercel.app`：可选的直播间保安室同步。
  - `localhost`：本地开发和自托管后端测试。
  - `sbhzm.cn`：烂梗库专属梗源（社区自建库）。
  - `chatterbox-cloud.aijc-eric.workers.dev`：自建后端，聚合 LAPLACE+SBHZM+社区贡献的梗库；可在设置里改成自部署地址。
  - `api.anthropic.com`、`api.openai.com`：智能辅助驾驶 LLM 默认 provider，仅在你填入 API key 并主动启用 AI 规避/改写时才会调用。
  - `*`：兜底项，让你能填入 OpenAI 兼容的自定义 base URL（DeepSeek、Moonshot、OpenRouter、Ollama、小米 mimo 等）。脚本管理器在首次访问每个新域时仍会单独确认。
- `GM_addStyle`：注入弹幕助手和 Chatterbox Chat 样式。
- `GM_getValue`、`GM_setValue`、`GM_deleteValue`：在本地保存配置、模板、规则和缓存。
- `GM_info`：读取脚本元信息。
- `unsafeWindow`：必要时与 B 站页面上下文交互。
- `@run-at document-start`：尽早启动，保证 UI、样式和聊天适配能及时准备。

## 隐私和数据流说明

默认保存在本地的数据：

- 弹幕模板、发送设置和自动跟车配置。
- 本地替换规则和房间规则。
- Chatterbox Chat 设置和自定义 CSS。
- 粉丝牌巡检缓存。
- 影子屏蔽观察记录和候选改写。

可能访问的外部服务：

- B 站接口和 WebSocket：读取直播间事件、发送弹幕、获取粉丝牌相关房间信息和房间状态。
- Soniox：仅在你启用并使用语音识别时参与。
- 直播间保安室：完全可选，只同步摘要或选定规则，不上传 cookie、csrf、localStorage 或完整接口响应。
- 烂梗库梗源（`sbhzm.cn`、`chatterbox-cloud.aijc-eric.workers.dev`）：仅在打开烂梗库或社区贡献时拉取梗列表，可在设置里改成自部署地址或关闭。
- LLM 智能辅助驾驶（`api.anthropic.com`、`api.openai.com`，以及你自填的 OpenAI 兼容 base URL）：仅在你填入 API key 并主动开启 AI 规避/改写时才会调用。
- GitHub Pages、Greasy Fork、unpkg：用于官网、安装和依赖资源加载。

反馈问题时不要公开 cookie、csrf token、账号密钥、localStorage dump、私人规则或私有同步地址。

## 常见问题和排障

- 看不到按钮：确认脚本启用，刷新 B 站直播间页面。
- 无法更新：在脚本管理器里手动检查更新，或从 Greasy Fork 重新安装。
- 发不出弹幕：检查登录状态、直播间权限、账号状态、弹幕长度、锁定表情权限和风控提示。
- 自动跟车不工作：检查阈值、冷却、唯一用户要求、黑名单和当前直播间弹幕重复情况。
- Chatterbox Chat 空白：刷新页面，确认原生弹幕区有内容，临时关闭自定义 CSS。
- 巡检结果未知：可能是接口限流、网络错误、主播注销或 B 站接口变化，稍后重试。
- 同传不可用：检查麦克风权限、浏览器支持，以及 unpkg/Soniox 资源是否能加载。
- 候选改写不自动发送：默认就是只展示候选。自动重发需要你明确开启对应模式。

## 已知限制

- B 站页面和接口变化可能导致功能失效。
- 高流量直播间可能影响事件解析和广播验证。
- 自动发送可能被 B 站限流或风控。
- 影子屏蔽检测不是绝对准确。
- 替换规则和 AI 规避不能保证绕过所有审核。
- 同传质量受麦克风、浏览器和 Soniox 服务影响。
- 主要测试环境是桌面浏览器加 Tampermonkey/Violentmonkey。

## 如何反馈 bug

请到 [GitHub Issues](https://github.com/aijc123/bilibili-live-wheel-auto-follow/issues) 提交问题。

请尽量提供：

- 脚本版本。
- 浏览器和脚本管理器版本。
- 直播间 URL 或房间号，如果方便公开。
- 复现步骤。
- 预期结果。
- 实际结果。
- 控制台报错、截图或日志。
- 关闭自定义 CSS 并刷新后是否仍复现。

不要提交 cookie、csrf token、账号密钥、localStorage dump、私人规则或其他敏感信息。
