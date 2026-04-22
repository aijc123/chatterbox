# B站独轮车 + 自动跟车

一个给 B 站/哔哩哔哩直播间用的民间弹幕助手 userscript，可以通过 Tampermonkey、Violentmonkey 或 Greasy Fork 安装。主打两件事：

- **独轮车**：提前写好几句弹幕，按间隔自动循环发送。
- **自动跟车**：看到直播间里很多人在刷同一句话时，自动跟上一句。
- **粉丝牌禁言巡检**：一键检查所有粉丝牌直播间，按限制、无法确认、主播注销、正常分类展示。

项目基于 [LAPLACE Chatterbox](https://github.com/laplace-live/chatterbox) fork 修改，保留原项目的同传、烂梗库、弹幕替换、AI 规避等能力，并在自动跟车、粉丝牌禁言巡检和小面板 UI 上做了自己的调整。

项目链接：

- GitHub：[aijc123/bilibili-live-wheel-auto-follow](https://github.com/aijc123/bilibili-live-wheel-auto-follow)
- Greasy Fork：[B站独轮车 + 自动跟车](https://greasyfork.org/zh-CN/scripts/574939-b%E7%AB%99%E7%8B%AC%E8%BD%AE%E8%BD%A6-%E8%87%AA%E5%8A%A8%E8%B7%9F%E8%BD%A6)

常见搜索词：B站独轮车、B站自动跟车、哔哩哔哩直播弹幕助手、Bilibili Live auto follow、Tampermonkey bilibili live userscript。

## 功能

### 独轮车

- 支持多套弹幕模板。
- 每行一句，自动按间隔发送。
- 超过字数会自动拆分。
- 可选随机颜色、随机间隔、随机字符。
- 可记住当前直播间的开关状态。

### 自动跟车

- 自动观察直播间弹幕。
- 当同一句话在短时间内被多人重复发送时，自动跟上一句。
- 提供三个预设：
  - **稳一点**：更克制，适合挂机。
  - **正常**：推荐默认值。
  - **热闹**：跟得更快，适合弹幕很活跃的时候。
- 面板会显示当前状态、候选弹幕和上次跟车内容。
- 支持高级参数，例如观察窗口、触发条数、冷却时间、是否需要多人都在刷。

### 粉丝牌禁言巡检

- 一键读取当前账号所有粉丝牌关联的直播间，不发送弹幕。
- 按限制、无法确认、主播已注销、正常自动分类和排序。
- 支持只显示异常结果，方便快速定位被禁言、房间屏蔽、账号风控等信号。
- 支持复制巡检结果，便于保存或反馈问题。
- 自动保留上一次巡检结果，刷新页面后也能继续查看。

### 常规发送

- 在插件面板里直接发弹幕。
- 支持 Enter 发送。
- 可选 AI 规避：发送失败时尝试检测敏感词并替换后重试。

### 同传

- 接入 Soniox 语音识别。
- 支持识别后自动发送弹幕。
- 支持实时翻译结果发送。

### 烂梗库

- 拉取烂梗列表，方便搜索、复制和发送。
- 支持根据直播间弹幕自动挖掘待贡献梗。

### 小面板 UI

- 面板宽度适合 B 站直播间右侧区域。
- 最多占屏幕高度一半，内容多时在面板内部滚动。
- 折叠某个功能区后，面板高度会自动变短。
- 按钮、输入框、开关、页签风格统一，更适合长期挂在直播间里。

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

脚本管理器会弹出安装页面，确认安装即可。

如果你的构建产物文件名不同，就打开 `dist/` 目录里以 `.user.js` 结尾的那个文件。

### 使用

1. 安装脚本后，打开 B 站直播间：

   ```text
   https://live.bilibili.com/
   ```

2. 页面右下角会出现 `弹幕助手` 按钮。
3. 点开后可以使用：
   - 发送
   - 同传
   - 设置
   - 关于

## 开发

```bash
bun install
bun run dev
bun run build
```

常用检查：

```bash
bun run test:auto-blend
bun run verify:auto-blend-ui
```

`verify:auto-blend-ui` 会启动浏览器访问 B 站直播页，注入构建后的脚本，并检查小面板是否过宽、过高或出现文字裁切。

## 仓库命名建议

如果要把 fork 改成自己的项目名，推荐仓库名：

```text
bilibili-live-wheel-auto-follow
```

中文展示名可以用：

```text
B站独轮车 + 自动跟车
```

GitHub 仓库可以在 `Settings -> General -> Repository name` 里改名。改名后，记得同步更新本地 remote：

```bash
git remote set-url origin https://github.com/aijc123/bilibili-live-wheel-auto-follow.git
```

## 说明

这是民间自用/自制插件，不是 B 站官方功能。使用自动发送、自动跟车等功能时，建议控制频率，避免打扰主播和其他观众。

本项目基于 [laplace-live/chatterbox](https://github.com/laplace-live/chatterbox) 修改，遵循原项目许可证。

## License

AGPL-3.0
