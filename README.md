# B站独轮车 + 自动跟车

[![CI](https://github.com/aijc123/bilibili-live-wheel-auto-follow/actions/workflows/ci.yml/badge.svg)](https://github.com/aijc123/bilibili-live-wheel-auto-follow/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/aijc123/bilibili-live-wheel-auto-follow/branch/master/graph/badge.svg)](https://codecov.io/gh/aijc123/bilibili-live-wheel-auto-follow)

一个给 B 站/哔哩哔哩直播间使用的弹幕助手 userscript。它从 [LAPLACE Chatterbox](https://github.com/laplace-live/chatterbox) fork 而来，保留并扩展了独轮车、同传、烂梗库、弹幕替换、AI 规避等能力，同时加入自动跟车、粉丝牌禁言巡检和可接管右侧评论区的 Chatterbox Chat。

项目链接：

- 官网：[aijc123.github.io/bilibili-live-wheel-auto-follow](https://aijc123.github.io/bilibili-live-wheel-auto-follow/)
- 安装：[Greasy Fork 脚本页](https://greasyfork.org/zh-CN/scripts/574939-b%E7%AB%99%E7%8B%AC%E8%BD%AE%E8%BD%A6-%E8%87%AA%E5%8A%A8%E8%B7%9F%E8%BD%A6)
- 源码：[GitHub](https://github.com/aijc123/bilibili-live-wheel-auto-follow)
- 反馈：[GitHub Issues](https://github.com/aijc123/bilibili-live-wheel-auto-follow/issues)

常见搜索词：B站独轮车、B站自动跟车、哔哩哔哩直播弹幕助手、Bilibili Live Auto Follow、Tampermonkey bilibili live userscript、Chatterbox Chat。

## 项目做什么

安装后，B 站直播间页面右下角会出现 `弹幕助手` 按钮。它主要解决直播间里的高频弹幕操作：

- 提前准备多句弹幕，让脚本按节奏循环发送。
- 观察直播间里被多人重复发送的弹幕，在满足阈值和冷却后自动跟一句。
- 用 Chatterbox Chat 接管右侧评论区，显示更清爽的弹幕、礼物、醒目留言和进场事件。
- 一键巡检当前账号粉丝牌关联直播间的禁言、屏蔽、风控、主播注销等状态。
- 维护云端、本地全局和当前房间替换规则，减少重复手改弹幕。
- 检测疑似影子屏蔽后给出候选改写，默认不会自动重发。
- 使用同传、翻译和烂梗库辅助直播间互动。

这是民间自用/自制插件，不是 B 站官方功能。使用自动发送、自动跟车、+1、自动重发等功能时，建议控制频率，避免打扰主播和其他观众。

## 安装步骤

1. 先安装一个用户脚本管理器：

   - [Tampermonkey](https://www.tampermonkey.net/)
   - [Violentmonkey](https://violentmonkey.github.io/)

2. 打开 [Greasy Fork 脚本页](https://greasyfork.org/zh-CN/scripts/574939-b%E7%AB%99%E7%8B%AC%E8%BD%AE%E8%BD%A6-%E8%87%AA%E5%8A%A8%E8%B7%9F%E8%BD%A6)。

3. 点击安装，并在脚本管理器弹出的页面里确认。

4. 打开任意 B 站直播间：

   ```text
   https://live.bilibili.com/
   ```

5. 点击页面右下角的 `弹幕助手` 按钮，按需开启发送、自动跟车、Chatterbox Chat、巡检或其他功能。

本地构建安装：

```bash
bun install
bun run build
```

然后用脚本管理器安装 `dist/bilibili-live-wheel-auto-follow.user.js`。

## 主要功能

### 独轮车循环发送

- 支持多套弹幕模板，每行一句自动循环发送。
- 支持固定间隔、随机间隔、随机颜色和随机字符。
- 超过字数会自动拆分，减少单条过长导致的发送失败。
- 可记住当前直播间的开关状态，适合常驻房间使用。

### 自动跟车

- 自动观察直播间弹幕，识别短时间内被多人重复发送的内容。
- 命中阈值后自动跟上一句，并带冷却时间，避免过度刷屏。
- 提供 `稳一点`、`正常`、`热闹` 三档预设，也可以展开高级参数微调。
- 面板会显示当前状态、候选弹幕和上次跟车内容。
- 可在 B 站弹幕菜单里把用户加入融入黑名单，自动跟车会忽略这些用户。
- 发送前会识别平台锁定的表情，权限不足时直接阻止并提示原因。

### Chatterbox Chat 评论区

- 可接管 B 站直播间右侧评论区和发送框。
- 支持直连 B 站直播 WebSocket 获取弹幕、礼物、醒目留言、舰队、进场、关注、点赞、分享等事件，并保留 DOM 兜底解析。
- 消息旁支持偷弹幕、+1、复制，可设置发送前确认，减少误触。
- 内置搜索、筛选、清屏、未读提示、性能调试信息和消息数量上限。
- 支持多套显示风格和自定义 CSS。

### 粉丝牌禁言巡检

- 一键读取当前账号粉丝牌关联的直播间，不发送弹幕。
- 按限制、无法确认、主播已注销、正常自动分类和排序。
- 支持点击统计项筛选异常、限制、未知、主播注销、正常或全部结果。
- 支持复制巡检结果，便于保存或反馈问题。
- 可选同步到独立项目“直播间保安室”，只上传巡检摘要，不上传 cookie、csrf、localStorage 或完整接口响应。
- 自动保留上一次巡检结果，刷新页面后也能继续查看。

### 替换规则、AI 规避和影子屏蔽处理

- 在插件面板或 Chatterbox Chat 输入框里直接发弹幕，支持 Enter 发送。
- 支持云端替换规则、本地全局替换规则和当前房间替换规则。
- 可测试替换词是否仍会触发屏蔽，方便维护房间专属规则。
- 默认“只给候选”模式下，检测到疑似影子屏蔽后只展示候选改写，不自动发送。
- 可选“自动重发”模式：需要同时开启 AI 规避，脚本才会尝试 AI 改写并重发。

### 同传、翻译和烂梗库

- 接入 Soniox 语音识别，支持识别后自动发送弹幕。
- 支持实时翻译结果发送。
- 可拉取烂梗列表，搜索、复制和发送常用梗。
- 支持根据直播间弹幕自动挖掘待贡献梗。

### 小面板 UI

- 面板宽度适合 B 站直播间右侧区域，最多占屏幕高度一半。
- 内容多时在面板内部滚动；折叠功能区后高度会自动变短。
- 设置页支持关键词搜索，能快速过滤表情、保安室、CSS、备份等配置分组。
- 首次打开面板会显示轻量引导，可一键套用新手配置。

## 权限说明

当前脚本元信息里会请求这些权限：

- `@match *://live.bilibili.com/*`：只在 B 站直播间页面运行。
- `@require https://unpkg.com/@soniox/speech-to-text-web...`：加载 Soniox 浏览器端语音识别客户端，用于同传/语音识别功能。
- `@connect`：脚本会请求脚本管理器允许它访问以下域，每一项都对应一个具体功能；脚本管理器在首次访问每个新域时仍会单独弹窗确认：
  - `bilibili-guard-room.vercel.app`：可选的“直播间保安室”同步接口。
  - `localhost`：本地开发和自托管后端测试。
  - `sbhzm.cn`：烂梗库专属梗源（社区自建库）。
  - `chatterbox-cloud.aijc-eric.workers.dev`：本仓库 `server/` 自建后端，聚合 LAPLACE+SBHZM+社区贡献的梗库；可在设置里通过 `cbBackendUrlOverride` 指向自有部署。
  - `api.anthropic.com`、`api.openai.com`：智能辅助驾驶（LLM 改写/AI 规避）默认 provider，仅在你填入 API key 并启用相关功能时调用。
  - `*`：兜底项，让你能填入 OpenAI 兼容的自定义 base URL（DeepSeek、Moonshot、OpenRouter、Ollama、小米 mimo 等）。脚本管理器仍会在首次访问每个新域时单独弹窗确认，这是这些自定义 LLM 调用的最后一道闸门。
- `GM_addStyle`：向页面注入弹幕助手和 Chatterbox Chat 的隔离样式。
- `GM_getValue`、`GM_setValue`、`GM_deleteValue`：在脚本管理器本地存储设置、模板、替换规则、观察记录和上次巡检结果。
- `GM_info`：读取脚本版本等元信息。
- `unsafeWindow`：在必要时与 B 站页面上下文交互，读取页面状态或桥接页面行为。
- `@run-at document-start`：尽早启动，方便准备样式隔离、UI 挂载和聊天适配。

## 隐私和数据流说明

大部分数据只保存在你的浏览器里，由脚本管理器本地存储：

- 弹幕模板和发送设置。
- 自动跟车配置。
- 本地全局规则和房间规则。
- Chatterbox Chat 主题、自定义 CSS 和偏好。
- 粉丝牌巡检缓存。
- 影子屏蔽观察记录和候选改写。

可能发生的网络数据流：

- B 站接口和 WebSocket：用于读取直播间事件、发送弹幕、获取当前账号相关粉丝牌房间信息、判断房间状态。这些请求使用你浏览器当前的 B 站登录会话。
- Soniox：仅在启用并使用同传/语音识别时涉及音频识别能力。
- 直播间保安室：完全可选。开启后只同步巡检摘要或选定规则，不应上传 cookie、csrf、localStorage 或完整 B 站接口响应。
- 烂梗库梗源（`sbhzm.cn` 社区库 / `chatterbox-cloud.aijc-eric.workers.dev` 自建聚合后端）：仅在打开烂梗库或社区贡献时拉取梗列表；可在设置里改成自部署地址或关闭该功能。
- LLM 智能辅助驾驶（`api.anthropic.com`、`api.openai.com`，以及任何你自填的 OpenAI 兼容 base URL）：仅在你填入 API key 并主动开启 AI 规避/改写时才会调用，prompt 内容只包含当前要改写的弹幕和必要上下文。
- GitHub Pages / Greasy Fork：用于托管官网、发布产物和安装页面。
- unpkg：用于加载 Soniox 浏览器端客户端。

不要在 issue、截图或导出的配置里公开 cookie、csrf token、账号密钥、localStorage dump、私人房间规则或私有同步地址。

## 常见问题和排障

- 看不到 `弹幕助手` 按钮：确认脚本已安装并启用，然后刷新 `https://live.bilibili.com/...` 直播间页面。
- 安装后没有更新：到 Tampermonkey/Violentmonkey 管理面板里手动检查更新，或从 Greasy Fork 重新安装。
- 弹幕发送失败：确认已登录 B 站、直播间允许发弹幕、账号状态正常、消息没有过长、没有使用无权限表情，也没有被风控或屏蔽。
- 自动跟车不触发：检查预设、阈值、冷却时间、唯一用户判断和融入黑名单；也可能是直播间没有达到重复条件。
- Chatterbox Chat 没内容：刷新页面，确认直播间确实有弹幕流；临时关闭自定义 CSS，排除样式把内容隐藏的情况。
- 粉丝牌巡检结果显示未知：可能是登录状态、接口限流、主播注销、网络错误或 B 站接口变动；稍后重试。
- 同传/语音识别不可用：检查浏览器麦克风权限、网络是否能访问 unpkg 和 Soniox 相关资源。
- 影子屏蔽候选没有自动发出：这是默认“只给候选”模式的正常行为。需要自动重发时，要明确开启“自动重发”模式和 AI 规避。

## 支持的浏览器和脚本管理器

构建产物以 `ES2022` 为目标（见 `tsconfig.app.json`），需要支持 `Promise.any`、私有类字段、可选链、空值合并等特性。下列组合是项目主线测试覆盖的范围：

- **桌面 Chrome/Edge ≥ 105** + Tampermonkey ≥ 4.18 / Violentmonkey ≥ 2.18：基线，所有功能可用。
- **桌面 Firefox ≥ 110** + Violentmonkey ≥ 2.18：可用，部分 `-webkit-*` 视觉效果会优雅降级（如背景模糊）。
- **桌面 Safari ≥ 15.1** + Tampermonkey：可用，但 B 站对 Safari 的支持本身有限，建议优先 Chrome/Firefox。
- **桌面 Chrome/Edge < 105**、**Firefox < 110**、**Safari < 15.1**、**任何 IE**、**移动端浏览器**：未测试，可能能跑也可能直接抛错。脚本里多处依赖 `AbortSignal` 监听器、`MutationObserver`、现代 CSS（`color-mix`、`backdrop-filter`），都需要相对新的引擎。

## 已知限制

- B 站页面结构、接口、风控策略和 WebSocket 数据格式可能随时变化。
- 高流量直播间里，DOM 兜底解析可能漏掉部分事件，广播验证也可能因为延迟出现误判。
- 自动发送、自动跟车和自动重发都可能被 B 站限流、屏蔽或风控。
- 影子屏蔽检测是启发式判断，不能百分百区分网络延迟、房间行为和真实屏蔽。
- 替换规则和 AI 规避不能保证每条弹幕都能通过审核。
- 同传准确率受麦克风质量、浏览器支持和 Soniox 服务可用性影响。
- 主要测试路径是桌面浏览器加 Tampermonkey/Violentmonkey，移动端和小众脚本管理器不保证体验一致。脚本会在检测到移动端 UA 时自动收起入口按钮并在控制台留一行警告，但不会拦截手动启用。

## 如何反馈 bug

请到 [GitHub Issues](https://github.com/aijc123/bilibili-live-wheel-auto-follow/issues) 反馈。

建议包含：

- 已安装脚本版本。
- 浏览器名称和版本。
- 脚本管理器名称和版本。
- 直播间 URL 或房间号，如果方便公开。
- 你原本预期发生什么。
- 实际发生了什么。
- 稳定复现步骤。
- 控制台报错、截图或相关日志。
- 关闭自定义 CSS 并刷新后是否仍然复现。

不要提交 cookie、csrf token、账号密钥、localStorage dump、私人规则导出或其他敏感信息。

## 更多文档

- [使用指南](docs/user-guide.md)
- [分支保护说明](docs/branch-protection.md)

## 开发

```bash
bun install
bun run dev
bun run build
```

常用检查：

```bash
bun test
bun run release:check
```

## 发版

```bash
bun run release:patch
```

也支持：

```bash
bun run release:minor
bun run release:major
```

发布脚本会运行检查、构建、提交 `Release x.y.z`、创建 tag、推送、创建 GitHub Release、部署 GitHub Pages，并等待线上 userscript 的 `@version` 更新。

## License

AGPL-3.0
