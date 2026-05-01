# B站独轮车 + 自动跟车

一个给 B 站/哔哩哔哩直播间用的弹幕助手 userscript，可以通过 Greasy Fork、Tampermonkey 或 Violentmonkey 安装。它从 [LAPLACE Chatterbox](https://github.com/laplace-live/chatterbox) fork 而来，保留独轮车、同传、烂梗库、弹幕替换、AI 规避等能力，并更改自动跟车功能，继续加上粉丝牌禁言巡检和可接管右侧评论区的 Chatterbox Chat。

项目链接：

- GitHub：[aijc123/bilibili-live-wheel-auto-follow](https://github.com/aijc123/bilibili-live-wheel-auto-follow)
- Greasy Fork：[B站独轮车 + 自动跟车](https://greasyfork.org/zh-CN/scripts/574939-b%E7%AB%99%E7%8B%AC%E8%BD%AE%E8%BD%A6-%E8%87%AA%E5%8A%A8%E8%B7%9F%E8%BD%A6)

常见搜索词：B站独轮车、B站自动跟车、哔哩哔哩直播弹幕助手、Bilibili Live auto follow、Tampermonkey bilibili live userscript、Chatterbox Chat。

## 适合谁

- 想提前准备多句弹幕，让脚本按节奏循环发送的人。
- 想在直播间刷屏气氛起来时自动跟一句，但又希望有冷却和触发阈值的人。
- 想快速排查自己粉丝牌房间里是否存在禁言、屏蔽、风控或主播注销状态的人。
- 想把 B 站右侧评论区换成更清爽的气泡流，并保留偷弹幕、+1、复制和自定义 CSS 的人。

## 功能

### 独轮车

- 支持多套弹幕模板，每行一句自动循环发送。
- 支持固定间隔、随机间隔、随机颜色和随机字符。
- 超过字数会自动拆分，避免一条弹幕太长直接失败。
- 可记住当前直播间的开关状态，适合常驻房间使用。

### 自动跟车

- 自动观察直播间弹幕，识别短时间内被多人重复发送的内容。
- 命中阈值后自动跟上一句，带冷却时间，避免过度刷屏。
- 提供「稳一点」「正常」「热闹」三档预设，也可以展开高级参数微调观察窗口、触发条数、冷却时间和多人判断。
- 面板会显示当前状态、候选弹幕和上次跟车内容，方便知道脚本为什么跟或为什么没跟。
- 可在 B 站弹幕菜单里把用户加入「融入黑名单」，自动跟车会忽略这些用户的弹幕，避免被固定刷屏账号带偏。
- 发送前会识别平台锁定的表情，权限不足时直接阻止并提示原因，避免无意义重试。

### Chatterbox Chat 评论区

- 可接管 B 站直播间右侧评论区和发送框，显示 iMessage 风格聊天气泡。
- 支持直连 B 站直播 WebSocket 获取弹幕、礼物、醒目留言、舰队、进场、关注、点赞、分享等事件，并保留 DOM 兜底解析。
- 支持 iMessage Dark、iMessage Light、Compact Bubble 和「奶绿 iMessage」自定义 CSS 预设。
- 消息旁支持偷弹幕、+1、复制；可设置发送前确认，减少误触。
- 内置搜索、筛选、清屏、未读提示、性能调试信息和消息数量上限，长时间挂着也更稳。
- 高峰期渲染会合并到同一个 RAF 帧，原生 DOM 兜底扫描也会批处理，减少弹幕刷屏时掉帧。
- Custom Chat 的样式、虚拟列表计算、原生 DOM 适配和交互基础件已拆成独立模块，后续扩展更容易定位。

### 粉丝牌禁言巡检

- 一键读取当前账号所有粉丝牌关联的直播间，不发送弹幕。
- 按限制、无法确认、主播已注销、正常自动分类和排序。
- 支持点击统计项筛选异常、限制、未知、主播注销、正常或全部结果。
- 支持复制巡检结果，便于保存或反馈问题。
- 可选同步到独立项目「直播间保安室」，只上传巡检摘要，不上传 cookie、csrf、localStorage 或完整接口响应。
- 自动保留上一次巡检结果，刷新页面后也能继续查看。

### 常规发送、替换和 AI 规避

- 在插件面板或 Chatterbox Chat 输入框里直接发弹幕，支持 Enter 发送。
- 支持云端替换规则、本地全局替换规则和当前房间替换规则。
- 可测试替换词是否仍会触发屏蔽，方便维护房间专属规则。
- 可选 AI 规避：发送失败时尝试检测敏感词并替换后重试。

### 同传和烂梗库

- 接入 Soniox 语音识别，支持识别后自动发送弹幕。
- 支持实时翻译结果发送。
- 可拉取烂梗列表，搜索、复制和发送常用梗。
- 支持根据直播间弹幕自动挖掘待贡献梗。

### 小面板 UI

- 面板宽度适合 B 站直播间右侧区域，最多占屏幕高度一半。
- 内容多时在面板内部滚动；折叠功能区后高度会自动变短。
- 按钮、输入框、开关、页签风格统一，更适合长期挂在直播间里。
- 设置页支持关键词搜索，能快速过滤表情、保安室、CSS、备份等配置分组。
- 首次打开面板会显示轻量引导，可一键套用“正常预设 + 试运行”的新手配置。
- 面板样式逐步迁入带 `lc-` 前缀的 UnoCSS 隔离层，减少对 B 站页面样式的影响。

## 安装

需要先安装一个用户脚本管理器：

- [Tampermonkey](https://www.tampermonkey.net/)
- [Violentmonkey](https://violentmonkey.github.io/)

### 从 Greasy Fork 安装

打开 [Greasy Fork 脚本页](https://greasyfork.org/zh-CN/scripts/574939-b%E7%AB%99%E7%8B%AC%E8%BD%AE%E8%BD%A6-%E8%87%AA%E5%8A%A8%E8%B7%9F%E8%BD%A6)，点击安装即可。

### 本地安装当前版本

先构建：

```bash
bun install
bun run build
```

然后用浏览器打开：

```text
dist/bilibili-live-wheel-auto-follow.user.js
```

脚本管理器会弹出安装页面，确认安装即可。如果构建产物文件名不同，就打开 `dist/` 目录里以 `.user.js` 结尾的那个文件。

## 使用

1. 安装脚本后，打开 B 站直播间：

   ```text
   https://live.bilibili.com/
   ```

2. 页面右下角会出现 `弹幕助手` 按钮。
3. 点开后可以使用 `发送`、`同传`、`设置` 和 `关于` 四个页签。
4. 如果想接管右侧评论区，到 `设置 -> Chatterbox Chat` 开启 `接管 B 站评论区（Chatterbox Chat）`。

## 开发

```bash
bun install
bun run dev
bun run build
```

常用检查：

```bash
bun test
bun run test:auto-blend
bun run verify:auto-blend-ui
```

`verify:auto-blend-ui` 会启动浏览器访问 B 站直播页，注入构建后的脚本，并检查小面板是否过宽、过高或出现文字裁切。

## 发版

现在可以一条命令全自动发版：

```bash
bun run release:patch
```

也支持：

```bash
bun run release:minor
bun run release:major
```

这条命令会自动完成这些步骤：

- 把 `package.json` 版本号升到下一个补丁版、次版本或主版本。
- 读取 `GREASYFORK_RELEASE_NOTES.md` 里的“当前发布说明”，同步生成新的版本小节。
- 运行 `bun x biome ci .`、`bun test`、`bun run build`。
- 自动 `git add -A`、提交 `Release x.y.z`、创建 `vX.Y.Z` tag 并推送到 `origin/master`。
- 自动创建或更新 GitHub Release。
- 自动触发 GitHub Pages 部署，并轮询线上 userscript 地址，确认 `@version` 已更新。

如果你想直接指定版本号，也可以：

```bash
bun run release -- --version 2.9.0
```

发版前只需要先把 `GREASYFORK_RELEASE_NOTES.md` 里的“当前发布说明”改成这次版本要写给用户看的内容；剩下流程不用再手动敲。

## 说明

这是民间自用/自制插件，不是 B 站官方功能。使用自动发送、自动跟车、+1 等功能时，建议控制频率，避免打扰主播和其他观众。

本项目基于 [laplace-live/chatterbox](https://github.com/laplace-live/chatterbox) 修改，遵循原项目许可证。

## License

AGPL-3.0
