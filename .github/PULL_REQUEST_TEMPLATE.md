<!--
感谢贡献。提交前请确认：

1. 本地跑过 `bun run check`（== CI 跑的那一套：biome ci + 客户端测试 + 服务端测试 + 版本一致性 + 构建 + artifact 校验 + bundle 预算）
2. 改了 UI 的话，至少在 Chromium 系（Chrome / Edge）的真实 B站直播间里试过一遍
3. 改了 server/ 的话，本地 wrangler dev 至少能正常起来
4. 不要顺手做无关 refactor — 一次 PR 一件事，更好 review
-->

## 这次改了什么

<!-- 一两句话讲清楚做了什么 + 为什么 -->

## 涉及范围

<!-- 勾上相关项 -->

- [ ] 独轮车 / 自动跟车 / 智能辅助驾驶（发送相关）
- [ ] Chatterbox Chat / 自定义聊天 DOM
- [ ] 粉丝牌巡检 / Guard Room
- [ ] 烂梗库 / meme 后端
- [ ] 替换规则 / AI evasion / Shadow ban
- [ ] 语音输入 STT
- [ ] 设置 UI / 备份恢复
- [ ] server/ 后端 (chatterbox-cloud)
- [ ] CI / 工程化（不改业务）
- [ ] 文档

## 验证

<!-- 你怎么确认它能工作？跑了哪些测试？人工在哪个直播间测过？ -->

- [ ] `bun run check` 通过
- [ ] （如有 UI 改动）在 B站直播间真实环境验证过

## Breaking changes / 迁移注意

<!-- 改了持久化 GM key？删除/改名了 export？请在这里写清楚。否则留空。 -->

无

## 相关 issue / 上下文

<!-- 关联 issue / 讨论；如果是回应用户反馈，贴下截图或链接 -->
