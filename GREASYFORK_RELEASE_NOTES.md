# Greasy Fork Release Notes

## 2.8.0

- Chatterbox Chat 强化右侧评论区接管布局，补充更多原生评论容器隐藏选择器。
- 新增评论区事件过滤条，可快速显示/隐藏弹幕、礼物、SC、进场、通知。
- 新增 WS 状态显示，能看到直连弹幕源是否连接、关闭或异常。
- 新增主题预设：Laplace Dark、Light、Compact。

## 2.7.0

- Chatterbox Chat 支持直连 B 站直播 WebSocket，使用 `@laplace.live/ws/client` 自动重连。
- 新增礼物、醒目留言、进场、通知等事件分层渲染，并保留 DOM 弹幕兜底。
- 新增用户头像显示，使用 Bilibili Avatar as a Service 代理头像。
- 搜索支持 `kind:` 和 `source:` 条件，例如 `kind:gift`、`kind:superchat`、`source:ws`。

## 2.6.0

- 新增 Chatterbox Chat 自定义评论区，可接管 B 站直播间原评论列表和发送框。
- 自定义评论区支持发送弹幕、暂停滚动、清屏、偷弹幕、+1、复制。
- 支持隐藏 B 站原评论区，并保留设置开关用于随时回退。
- 支持粘贴自定义 CSS 覆盖 Chatterbox Chat 样式，方便套用自己的评论区主题。

## 2.5.11

- 优化直播间聊天消息旁的 `偷` / `+1` 操作按钮：改为短小悬浮层，不再撑长弹幕行。
- 新弹幕出现时按钮会短暂露出，之后自动收起；鼠标悬停到评论上仍可再次显示。
- `偷弹幕` 现在会同时填入弹幕助手发送框，并自动复制到剪贴板。

发布前检查：

- `bun run build`
