// ==UserScript==
// @name         B站独轮车 + 自动跟车 / Bilibili Live Auto Follow
// @namespace    https://github.com/aijc123/bilibili-live-wheel-auto-follow
// @version      2.8.8
// @author       aijc123
// @description  给 B 站/哔哩哔哩直播间用的弹幕助手：支持独轮车循环发送、自动跟车、粉丝牌禁言巡检、常规发送、同传、烂梗库和弹幕替换规则。
// @license      AGPL-3.0
// @icon         https://www.bilibili.com/favicon.ico
// @homepage     https://github.com/aijc123/bilibili-live-wheel-auto-follow
// @homepageURL  https://github.com/aijc123/bilibili-live-wheel-auto-follow
// @source       https://github.com/aijc123/bilibili-live-wheel-auto-follow.git
// @supportURL   https://github.com/aijc123/bilibili-live-wheel-auto-follow/issues
// @match        *://live.bilibili.com/*
// @require      https://unpkg.com/@soniox/speech-to-text-web@1.4.0/dist/speech-to-text-web.umd.cjs
// @require      data:application/javascript,%3Bwindow.SonioxSpeechToTextWeb%3Dwindow%5B%22speech-to-text-web%22%5D%3B
// @connect      bilibili-guard-room.vercel.app
// @connect      localhost
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_info
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==