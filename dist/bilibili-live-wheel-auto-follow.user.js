// ==UserScript==
// @name         B站独轮车 + 自动跟车 / Bilibili Live Auto Follow
// @namespace    https://github.com/aijc123/bilibili-live-wheel-auto-follow
// @version      2.10.0
// @author       aijc123
// @description  给 B 站/哔哩哔哩直播间用的弹幕助手：支持独轮车循环发送、自动跟车、Chatterbox Chat、粉丝牌禁言巡检、同传、烂梗库、弹幕替换和 AI 规避。
// @license      AGPL-3.0
// @icon         https://www.bilibili.com/favicon.ico
// @homepage     https://github.com/aijc123/bilibili-live-wheel-auto-follow
// @homepageURL  https://github.com/aijc123/bilibili-live-wheel-auto-follow
// @source       https://github.com/aijc123/bilibili-live-wheel-auto-follow.git
// @supportURL   https://github.com/aijc123/bilibili-live-wheel-auto-follow/issues
// @match        *://live.bilibili.com/*
// @require      https://unpkg.com/@soniox/speech-to-text-web@1.4.0/dist/speech-to-text-web.umd.cjs
// @require      data:application/javascript,%3Bwindow.SonioxSpeechToTextWeb%3Dwindow%5B%22speech-to-text-web%22%5D%3B
// @require      https://cdn.jsdelivr.net/npm/systemjs@6.15.1/dist/system.min.js
// @require      https://cdn.jsdelivr.net/npm/systemjs@6.15.1/dist/extras/named-register.min.js
// @require      data:application/javascript,%3B(typeof%20System!%3D'undefined')%26%26(System%3Dnew%20System.constructor())%3B
// @connect      bilibili-guard-room.vercel.app
// @connect      localhost
// @connect      sbhzm.cn
// @connect      chatterbox-cloud.aijc-eric.workers.dev
// @connect      api.anthropic.com
// @connect      api.openai.com
// @connect      *
// @grant        GM_addElement
// @grant        GM_addStyle
// @grant        GM_addValueChangeListener
// @grant        GM_audio
// @grant        GM_cookie
// @grant        GM_deleteValue
// @grant        GM_deleteValues
// @grant        GM_download
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// @grant        GM_getTab
// @grant        GM_getTabs
// @grant        GM_getValue
// @grant        GM_getValues
// @grant        GM_info
// @grant        GM_listValues
// @grant        GM_log
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @grant        GM_removeValueChangeListener
// @grant        GM_saveTab
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_setValues
// @grant        GM_unregisterMenuCommand
// @grant        GM_webRequest
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

System.addImportMap({ imports: {"@soniox/speech-to-text-web":"user:@soniox/speech-to-text-web"} });
System.set("user:@soniox/speech-to-text-web", (()=>{const _=SonioxSpeechToTextWeb;('default' in _)||(_.default=_);return _})());

System.register("./__entry.js", ['./__monkey.entry-BZv1j5rD.js'], (function (exports, module) {
	'use strict';
	return {
		setters: [null],
		execute: (function () {



		})
	};
}));

System.register("./__monkey.entry-BZv1j5rD.js", ['@soniox/speech-to-text-web'], (function (exports, module) {
  'use strict';
  var SonioxClient;
  return {
    setters: [module => {
      SonioxClient = module.SonioxClient;
    }],
    execute: (function () {

      exports({
        a: appendLog,
        g: gmFetch
      });

      const d$3=new Set;const l$4 = async e=>{d$3.has(e)||(d$3.add(e),(t=>{typeof GM_addStyle=="function"?GM_addStyle(t):(document.head||document.documentElement).appendChild(document.createElement("style")).append(t);})(e));};

      l$4(" :root,:host{--spacing: .25rem}#laplace-chatterbox-toggle,#laplace-chatterbox-dialog{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,SF Pro Text,Segoe UI,sans-serif;font-size:12px;letter-spacing:0}.lc-px-\\[10px\\]{padding-inline:10px}.lc-pb-\\[10px\\]{padding-bottom:10px}.lc-max-h-\\[50vh\\]{max-height:50vh}.lc-max-w-\\[calc\\(100vw_-_16px\\)\\]{max-width:calc(100vw - 16px)}.lc-min-w-0{min-width:calc(var(--spacing) * 0)}.lc-w-\\[320px\\]{width:320px}.lc-block{display:block}.lc-hidden{display:none}.lc-bottom-\\[46px\\]{bottom:46px}.lc-right-2{right:calc(var(--spacing) * 2)}.lc-fixed{position:fixed}.lc-z-\\[2147483647\\]{z-index:2147483647}.lc-overflow-y-auto{overflow-y:auto} ");

      var n$1, l$3, u$3, t$2, i$2, r$2, o$2, e$2, f$2, c$2, s$2, a$2, h$2, p$3, v$2, d$2 = {}, w$3 = [], _$3 = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, g$3 = Array.isArray;
      function m$2(n2, l2) {
        for (var u2 in l2) n2[u2] = l2[u2];
        return n2;
      }
      function b$2(n2) {
        n2 && n2.parentNode && n2.parentNode.removeChild(n2);
      }
      function k$1(l2, u2, t2) {
        var i2, r2, o2, e2 = {};
        for (o2 in u2) "key" == o2 ? i2 = u2[o2] : "ref" == o2 ? r2 = u2[o2] : e2[o2] = u2[o2];
        if (arguments.length > 2 && (e2.children = arguments.length > 3 ? n$1.call(arguments, 2) : t2), "function" == typeof l2 && null != l2.defaultProps) for (o2 in l2.defaultProps) void 0 === e2[o2] && (e2[o2] = l2.defaultProps[o2]);
        return x$2(l2, e2, i2, r2, null);
      }
      function x$2(n2, t2, i2, r2, o2) {
        var e2 = { type: n2, props: t2, key: i2, ref: r2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o2 ? ++u$3 : o2, __i: -1, __u: 0 };
        return null == o2 && null != l$3.vnode && l$3.vnode(e2), e2;
      }
      function S$1(n2) {
        return n2.children;
      }
      function C$1(n2, l2) {
        this.props = n2, this.context = l2;
      }
      function $$1(n2, l2) {
        if (null == l2) return n2.__ ? $$1(n2.__, n2.__i + 1) : null;
        for (var u2; l2 < n2.__k.length; l2++) if (null != (u2 = n2.__k[l2]) && null != u2.__e) return u2.__e;
        return "function" == typeof n2.type ? $$1(n2) : null;
      }
      function I(n2) {
        if (n2.__P && n2.__d) {
          var u2 = n2.__v, t2 = u2.__e, i2 = [], r2 = [], o2 = m$2({}, u2);
          o2.__v = u2.__v + 1, l$3.vnode && l$3.vnode(o2), q$3(n2.__P, o2, u2, n2.__n, n2.__P.namespaceURI, 32 & u2.__u ? [t2] : null, i2, null == t2 ? $$1(u2) : t2, !!(32 & u2.__u), r2), o2.__v = u2.__v, o2.__.__k[o2.__i] = o2, D(i2, o2, r2), u2.__e = u2.__ = null, o2.__e != t2 && P$1(o2);
        }
      }
      function P$1(n2) {
        if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l2) {
          if (null != l2 && null != l2.__e) return n2.__e = n2.__c.base = l2.__e;
        }), P$1(n2);
      }
      function A$1(n2) {
        (!n2.__d && (n2.__d = true) && i$2.push(n2) && !H$1.__r++ || r$2 != l$3.debounceRendering) && ((r$2 = l$3.debounceRendering) || o$2)(H$1);
      }
      function H$1() {
        try {
          for (var n2, l2 = 1; i$2.length; ) i$2.length > l2 && i$2.sort(e$2), n2 = i$2.shift(), l2 = i$2.length, I(n2);
        } finally {
          i$2.length = H$1.__r = 0;
        }
      }
      function L(n2, l2, u2, t2, i2, r2, o2, e2, f2, c2, s2) {
        var a2, h2, p2, v2, y2, _2, g2, m2 = t2 && t2.__k || w$3, b2 = l2.length;
        for (f2 = T$2(u2, l2, m2, f2, b2), a2 = 0; a2 < b2; a2++) null != (p2 = u2.__k[a2]) && (h2 = -1 != p2.__i && m2[p2.__i] || d$2, p2.__i = a2, _2 = q$3(n2, p2, h2, i2, r2, o2, e2, f2, c2, s2), v2 = p2.__e, p2.ref && h2.ref != p2.ref && (h2.ref && J$1(h2.ref, null, p2), s2.push(p2.ref, p2.__c || v2, p2)), null == y2 && null != v2 && (y2 = v2), (g2 = !!(4 & p2.__u)) || h2.__k === p2.__k ? (f2 = j$3(p2, f2, n2, g2), g2 && h2.__e && (h2.__e = null)) : "function" == typeof p2.type && void 0 !== _2 ? f2 = _2 : v2 && (f2 = v2.nextSibling), p2.__u &= -7);
        return u2.__e = y2, f2;
      }
      function T$2(n2, l2, u2, t2, i2) {
        var r2, o2, e2, f2, c2, s2 = u2.length, a2 = s2, h2 = 0;
        for (n2.__k = new Array(i2), r2 = 0; r2 < i2; r2++) null != (o2 = l2[r2]) && "boolean" != typeof o2 && "function" != typeof o2 ? ("string" == typeof o2 || "number" == typeof o2 || "bigint" == typeof o2 || o2.constructor == String ? o2 = n2.__k[r2] = x$2(null, o2, null, null, null) : g$3(o2) ? o2 = n2.__k[r2] = x$2(S$1, { children: o2 }, null, null, null) : void 0 === o2.constructor && o2.__b > 0 ? o2 = n2.__k[r2] = x$2(o2.type, o2.props, o2.key, o2.ref ? o2.ref : null, o2.__v) : n2.__k[r2] = o2, f2 = r2 + h2, o2.__ = n2, o2.__b = n2.__b + 1, e2 = null, -1 != (c2 = o2.__i = O$1(o2, u2, f2, a2)) && (a2--, (e2 = u2[c2]) && (e2.__u |= 2)), null == e2 || null == e2.__v ? (-1 == c2 && (i2 > s2 ? h2-- : i2 < s2 && h2++), "function" != typeof o2.type && (o2.__u |= 4)) : c2 != f2 && (c2 == f2 - 1 ? h2-- : c2 == f2 + 1 ? h2++ : (c2 > f2 ? h2-- : h2++, o2.__u |= 4))) : n2.__k[r2] = null;
        if (a2) for (r2 = 0; r2 < s2; r2++) null != (e2 = u2[r2]) && 0 == (2 & e2.__u) && (e2.__e == t2 && (t2 = $$1(e2)), K$1(e2, e2));
        return t2;
      }
      function j$3(n2, l2, u2, t2) {
        var i2, r2;
        if ("function" == typeof n2.type) {
          for (i2 = n2.__k, r2 = 0; i2 && r2 < i2.length; r2++) i2[r2] && (i2[r2].__ = n2, l2 = j$3(i2[r2], l2, u2, t2));
          return l2;
        }
        n2.__e != l2 && (t2 && (l2 && n2.type && !l2.parentNode && (l2 = $$1(n2)), u2.insertBefore(n2.__e, l2 || null)), l2 = n2.__e);
        do {
          l2 = l2 && l2.nextSibling;
        } while (null != l2 && 8 == l2.nodeType);
        return l2;
      }
      function F$1(n2, l2) {
        return l2 = l2 || [], null == n2 || "boolean" == typeof n2 || (g$3(n2) ? n2.some(function(n3) {
          F$1(n3, l2);
        }) : l2.push(n2)), l2;
      }
      function O$1(n2, l2, u2, t2) {
        var i2, r2, o2, e2 = n2.key, f2 = n2.type, c2 = l2[u2], s2 = null != c2 && 0 == (2 & c2.__u);
        if (null === c2 && null == e2 || s2 && e2 == c2.key && f2 == c2.type) return u2;
        if (t2 > (s2 ? 1 : 0)) {
          for (i2 = u2 - 1, r2 = u2 + 1; i2 >= 0 || r2 < l2.length; ) if (null != (c2 = l2[o2 = i2 >= 0 ? i2-- : r2++]) && 0 == (2 & c2.__u) && e2 == c2.key && f2 == c2.type) return o2;
        }
        return -1;
      }
      function z$1(n2, l2, u2) {
        "-" == l2[0] ? n2.setProperty(l2, null == u2 ? "" : u2) : n2[l2] = null == u2 ? "" : "number" != typeof u2 || _$3.test(l2) ? u2 : u2 + "px";
      }
      function N(n2, l2, u2, t2, i2) {
        var r2, o2;
        n: if ("style" == l2) if ("string" == typeof u2) n2.style.cssText = u2;
        else {
          if ("string" == typeof t2 && (n2.style.cssText = t2 = ""), t2) for (l2 in t2) u2 && l2 in u2 || z$1(n2.style, l2, "");
          if (u2) for (l2 in u2) t2 && u2[l2] == t2[l2] || z$1(n2.style, l2, u2[l2]);
        }
        else if ("o" == l2[0] && "n" == l2[1]) r2 = l2 != (l2 = l2.replace(a$2, "$1")), o2 = l2.toLowerCase(), l2 = o2 in n2 || "onFocusOut" == l2 || "onFocusIn" == l2 ? o2.slice(2) : l2.slice(2), n2.l || (n2.l = {}), n2.l[l2 + r2] = u2, u2 ? t2 ? u2[s$2] = t2[s$2] : (u2[s$2] = h$2, n2.addEventListener(l2, r2 ? v$2 : p$3, r2)) : n2.removeEventListener(l2, r2 ? v$2 : p$3, r2);
        else {
          if ("http://www.w3.org/2000/svg" == i2) l2 = l2.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
          else if ("width" != l2 && "height" != l2 && "href" != l2 && "list" != l2 && "form" != l2 && "tabIndex" != l2 && "download" != l2 && "rowSpan" != l2 && "colSpan" != l2 && "role" != l2 && "popover" != l2 && l2 in n2) try {
            n2[l2] = null == u2 ? "" : u2;
            break n;
          } catch (n3) {
          }
          "function" == typeof u2 || (null == u2 || false === u2 && "-" != l2[4] ? n2.removeAttribute(l2) : n2.setAttribute(l2, "popover" == l2 && 1 == u2 ? "" : u2));
        }
      }
      function V$1(n2) {
        return function(u2) {
          if (this.l) {
            var t2 = this.l[u2.type + n2];
            if (null == u2[c$2]) u2[c$2] = h$2++;
            else if (u2[c$2] < t2[s$2]) return;
            return t2(l$3.event ? l$3.event(u2) : u2);
          }
        };
      }
      function q$3(n2, u2, t2, i2, r2, o2, e2, f2, c2, s2) {
        var a2, h2, p2, v2, y2, d2, _2, k2, x2, M2, $2, I2, P2, A2, H2, T2 = u2.type;
        if (void 0 !== u2.constructor) return null;
        128 & t2.__u && (c2 = !!(32 & t2.__u), o2 = [f2 = u2.__e = t2.__e]), (a2 = l$3.__b) && a2(u2);
        n: if ("function" == typeof T2) try {
          if (k2 = u2.props, x2 = T2.prototype && T2.prototype.render, M2 = (a2 = T2.contextType) && i2[a2.__c], $2 = a2 ? M2 ? M2.props.value : a2.__ : i2, t2.__c ? _2 = (h2 = u2.__c = t2.__c).__ = h2.__E : (x2 ? u2.__c = h2 = new T2(k2, $2) : (u2.__c = h2 = new C$1(k2, $2), h2.constructor = T2, h2.render = Q$1), M2 && M2.sub(h2), h2.state || (h2.state = {}), h2.__n = i2, p2 = h2.__d = true, h2.__h = [], h2._sb = []), x2 && null == h2.__s && (h2.__s = h2.state), x2 && null != T2.getDerivedStateFromProps && (h2.__s == h2.state && (h2.__s = m$2({}, h2.__s)), m$2(h2.__s, T2.getDerivedStateFromProps(k2, h2.__s))), v2 = h2.props, y2 = h2.state, h2.__v = u2, p2) x2 && null == T2.getDerivedStateFromProps && null != h2.componentWillMount && h2.componentWillMount(), x2 && null != h2.componentDidMount && h2.__h.push(h2.componentDidMount);
          else {
            if (x2 && null == T2.getDerivedStateFromProps && k2 !== v2 && null != h2.componentWillReceiveProps && h2.componentWillReceiveProps(k2, $2), u2.__v == t2.__v || !h2.__e && null != h2.shouldComponentUpdate && false === h2.shouldComponentUpdate(k2, h2.__s, $2)) {
              u2.__v != t2.__v && (h2.props = k2, h2.state = h2.__s, h2.__d = false), u2.__e = t2.__e, u2.__k = t2.__k, u2.__k.some(function(n3) {
                n3 && (n3.__ = u2);
              }), w$3.push.apply(h2.__h, h2._sb), h2._sb = [], h2.__h.length && e2.push(h2);
              break n;
            }
            null != h2.componentWillUpdate && h2.componentWillUpdate(k2, h2.__s, $2), x2 && null != h2.componentDidUpdate && h2.__h.push(function() {
              h2.componentDidUpdate(v2, y2, d2);
            });
          }
          if (h2.context = $2, h2.props = k2, h2.__P = n2, h2.__e = false, I2 = l$3.__r, P2 = 0, x2) h2.state = h2.__s, h2.__d = false, I2 && I2(u2), a2 = h2.render(h2.props, h2.state, h2.context), w$3.push.apply(h2.__h, h2._sb), h2._sb = [];
          else do {
            h2.__d = false, I2 && I2(u2), a2 = h2.render(h2.props, h2.state, h2.context), h2.state = h2.__s;
          } while (h2.__d && ++P2 < 25);
          h2.state = h2.__s, null != h2.getChildContext && (i2 = m$2(m$2({}, i2), h2.getChildContext())), x2 && !p2 && null != h2.getSnapshotBeforeUpdate && (d2 = h2.getSnapshotBeforeUpdate(v2, y2)), A2 = null != a2 && a2.type === S$1 && null == a2.key ? E$2(a2.props.children) : a2, f2 = L(n2, g$3(A2) ? A2 : [A2], u2, t2, i2, r2, o2, e2, f2, c2, s2), h2.base = u2.__e, u2.__u &= -161, h2.__h.length && e2.push(h2), _2 && (h2.__E = h2.__ = null);
        } catch (n3) {
          if (u2.__v = null, c2 || null != o2) if (n3.then) {
            for (u2.__u |= c2 ? 160 : 128; f2 && 8 == f2.nodeType && f2.nextSibling; ) f2 = f2.nextSibling;
            o2[o2.indexOf(f2)] = null, u2.__e = f2;
          } else {
            for (H2 = o2.length; H2--; ) b$2(o2[H2]);
            B$2(u2);
          }
          else u2.__e = t2.__e, u2.__k = t2.__k, n3.then || B$2(u2);
          l$3.__e(n3, u2, t2);
        }
        else null == o2 && u2.__v == t2.__v ? (u2.__k = t2.__k, u2.__e = t2.__e) : f2 = u2.__e = G$1(t2.__e, u2, t2, i2, r2, o2, e2, c2, s2);
        return (a2 = l$3.diffed) && a2(u2), 128 & u2.__u ? void 0 : f2;
      }
      function B$2(n2) {
        n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B$2));
      }
      function D(n2, u2, t2) {
        for (var i2 = 0; i2 < t2.length; i2++) J$1(t2[i2], t2[++i2], t2[++i2]);
        l$3.__c && l$3.__c(u2, n2), n2.some(function(u3) {
          try {
            n2 = u3.__h, u3.__h = [], n2.some(function(n3) {
              n3.call(u3);
            });
          } catch (n3) {
            l$3.__e(n3, u3.__v);
          }
        });
      }
      function E$2(n2) {
        return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g$3(n2) ? n2.map(E$2) : m$2({}, n2);
      }
      function G$1(u2, t2, i2, r2, o2, e2, f2, c2, s2) {
        var a2, h2, p2, v2, y2, w2, _2, m2 = i2.props || d$2, k2 = t2.props, x2 = t2.type;
        if ("svg" == x2 ? o2 = "http://www.w3.org/2000/svg" : "math" == x2 ? o2 = "http://www.w3.org/1998/Math/MathML" : o2 || (o2 = "http://www.w3.org/1999/xhtml"), null != e2) {
          for (a2 = 0; a2 < e2.length; a2++) if ((y2 = e2[a2]) && "setAttribute" in y2 == !!x2 && (x2 ? y2.localName == x2 : 3 == y2.nodeType)) {
            u2 = y2, e2[a2] = null;
            break;
          }
        }
        if (null == u2) {
          if (null == x2) return document.createTextNode(k2);
          u2 = document.createElementNS(o2, x2, k2.is && k2), c2 && (l$3.__m && l$3.__m(t2, e2), c2 = false), e2 = null;
        }
        if (null == x2) m2 === k2 || c2 && u2.data == k2 || (u2.data = k2);
        else {
          if (e2 = e2 && n$1.call(u2.childNodes), !c2 && null != e2) for (m2 = {}, a2 = 0; a2 < u2.attributes.length; a2++) m2[(y2 = u2.attributes[a2]).name] = y2.value;
          for (a2 in m2) y2 = m2[a2], "dangerouslySetInnerHTML" == a2 ? p2 = y2 : "children" == a2 || a2 in k2 || "value" == a2 && "defaultValue" in k2 || "checked" == a2 && "defaultChecked" in k2 || N(u2, a2, null, y2, o2);
          for (a2 in k2) y2 = k2[a2], "children" == a2 ? v2 = y2 : "dangerouslySetInnerHTML" == a2 ? h2 = y2 : "value" == a2 ? w2 = y2 : "checked" == a2 ? _2 = y2 : c2 && "function" != typeof y2 || m2[a2] === y2 || N(u2, a2, y2, m2[a2], o2);
          if (h2) c2 || p2 && (h2.__html == p2.__html || h2.__html == u2.innerHTML) || (u2.innerHTML = h2.__html), t2.__k = [];
          else if (p2 && (u2.innerHTML = ""), L("template" == t2.type ? u2.content : u2, g$3(v2) ? v2 : [v2], t2, i2, r2, "foreignObject" == x2 ? "http://www.w3.org/1999/xhtml" : o2, e2, f2, e2 ? e2[0] : i2.__k && $$1(i2, 0), c2, s2), null != e2) for (a2 = e2.length; a2--; ) b$2(e2[a2]);
          c2 || (a2 = "value", "progress" == x2 && null == w2 ? u2.removeAttribute("value") : null != w2 && (w2 !== u2[a2] || "progress" == x2 && !w2 || "option" == x2 && w2 != m2[a2]) && N(u2, a2, w2, m2[a2], o2), a2 = "checked", null != _2 && _2 != u2[a2] && N(u2, a2, _2, m2[a2], o2));
        }
        return u2;
      }
      function J$1(n2, u2, t2) {
        try {
          if ("function" == typeof n2) {
            var i2 = "function" == typeof n2.__u;
            i2 && n2.__u(), i2 && null == u2 || (n2.__u = n2(u2));
          } else n2.current = u2;
        } catch (n3) {
          l$3.__e(n3, t2);
        }
      }
      function K$1(n2, u2, t2) {
        var i2, r2;
        if (l$3.unmount && l$3.unmount(n2), (i2 = n2.ref) && (i2.current && i2.current != n2.__e || J$1(i2, null, u2)), null != (i2 = n2.__c)) {
          if (i2.componentWillUnmount) try {
            i2.componentWillUnmount();
          } catch (n3) {
            l$3.__e(n3, u2);
          }
          i2.base = i2.__P = null;
        }
        if (i2 = n2.__k) for (r2 = 0; r2 < i2.length; r2++) i2[r2] && K$1(i2[r2], u2, t2 || "function" != typeof n2.type);
        t2 || b$2(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
      }
      function Q$1(n2, l2, u2) {
        return this.constructor(n2, u2);
      }
      function R(u2, t2, i2) {
        var r2, o2, e2, f2;
        t2 == document && (t2 = document.documentElement), l$3.__ && l$3.__(u2, t2), o2 = (r2 = false) ? null : t2.__k, e2 = [], f2 = [], q$3(t2, u2 = t2.__k = k$1(S$1, null, [u2]), o2 || d$2, d$2, t2.namespaceURI, o2 ? null : t2.firstChild ? n$1.call(t2.childNodes) : null, e2, o2 ? o2.__e : t2.firstChild, r2, f2), D(e2, u2, f2);
      }
      n$1 = w$3.slice, l$3 = { __e: function(n2, l2, u2, t2) {
        for (var i2, r2, o2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
          if ((r2 = i2.constructor) && null != r2.getDerivedStateFromError && (i2.setState(r2.getDerivedStateFromError(n2)), o2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), o2 = i2.__d), o2) return i2.__E = i2;
        } catch (l3) {
          n2 = l3;
        }
        throw n2;
      } }, u$3 = 0, t$2 = function(n2) {
        return null != n2 && void 0 === n2.constructor;
      }, C$1.prototype.setState = function(n2, l2) {
        var u2;
        u2 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m$2({}, this.state), "function" == typeof n2 && (n2 = n2(m$2({}, u2), this.props)), n2 && m$2(u2, n2), null != n2 && this.__v && (l2 && this._sb.push(l2), A$1(this));
      }, C$1.prototype.forceUpdate = function(n2) {
        this.__v && (this.__e = true, n2 && this.__h.push(n2), A$1(this));
      }, C$1.prototype.render = S$1, i$2 = [], o$2 = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e$2 = function(n2, l2) {
        return n2.__v.__b - l2.__v.__b;
      }, H$1.__r = 0, f$2 = Math.random().toString(8), c$2 = "__d" + f$2, s$2 = "__a" + f$2, a$2 = /(PointerCapture)$|Capture$/i, h$2 = 0, p$3 = V$1(false), v$2 = V$1(true);
      var f$1 = 0;
      function u$2(e2, t2, n2, o2, i2, u2) {
        t2 || (t2 = {});
        var a2, c2, p2 = t2;
        if ("ref" in p2) for (c2 in p2 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p2[c2] = t2[c2];
        var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f$1, __i: -1, __u: 0, __source: i2, __self: u2 };
        if ("function" == typeof e2 && (a2 = e2.defaultProps)) for (c2 in a2) void 0 === p2[c2] && (p2[c2] = a2[c2]);
        return l$3.vnode && l$3.vnode(l2), l2;
      }
      var _GM = (() => typeof GM != "undefined" ? GM : void 0)();
      var _GM_addElement = (() => typeof GM_addElement != "undefined" ? GM_addElement : void 0)();
      var _GM_addStyle = (() => typeof GM_addStyle != "undefined" ? GM_addStyle : void 0)();
      var _GM_addValueChangeListener = (() => typeof GM_addValueChangeListener != "undefined" ? GM_addValueChangeListener : void 0)();
      var _GM_cookie = (() => typeof GM_cookie != "undefined" ? GM_cookie : void 0)();
      var _GM_deleteValue = (() => typeof GM_deleteValue != "undefined" ? GM_deleteValue : void 0)();
      var _GM_deleteValues = (() => typeof GM_deleteValues != "undefined" ? GM_deleteValues : void 0)();
      var _GM_download = (() => typeof GM_download != "undefined" ? GM_download : void 0)();
      var _GM_getResourceText = (() => typeof GM_getResourceText != "undefined" ? GM_getResourceText : void 0)();
      var _GM_getResourceURL = (() => typeof GM_getResourceURL != "undefined" ? GM_getResourceURL : void 0)();
      var _GM_getTab = (() => typeof GM_getTab != "undefined" ? GM_getTab : void 0)();
      var _GM_getTabs = (() => typeof GM_getTabs != "undefined" ? GM_getTabs : void 0)();
      var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
      var _GM_getValues = (() => typeof GM_getValues != "undefined" ? GM_getValues : void 0)();
      var _GM_info = (() => typeof GM_info != "undefined" ? GM_info : void 0)();
      var _GM_listValues = (() => typeof GM_listValues != "undefined" ? GM_listValues : void 0)();
      var _GM_log = (() => typeof GM_log != "undefined" ? GM_log : void 0)();
      var _GM_notification = (() => typeof GM_notification != "undefined" ? GM_notification : void 0)();
      var _GM_openInTab = (() => typeof GM_openInTab != "undefined" ? GM_openInTab : void 0)();
      var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
      var _GM_removeValueChangeListener = (() => typeof GM_removeValueChangeListener != "undefined" ? GM_removeValueChangeListener : void 0)();
      var _GM_saveTab = (() => typeof GM_saveTab != "undefined" ? GM_saveTab : void 0)();
      var _GM_setClipboard = (() => typeof GM_setClipboard != "undefined" ? GM_setClipboard : void 0)();
      var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
      var _GM_setValues = (() => typeof GM_setValues != "undefined" ? GM_setValues : void 0)();
      var _GM_unregisterMenuCommand = (() => typeof GM_unregisterMenuCommand != "undefined" ? GM_unregisterMenuCommand : void 0)();
      var _GM_webRequest = (() => typeof GM_webRequest != "undefined" ? GM_webRequest : void 0)();
      var _GM_xmlhttpRequest = (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();
      var _GM_audio = (() => typeof GM_audio != "undefined" ? GM_audio : void 0)();
      var _unsafeWindow = (() => typeof unsafeWindow != "undefined" ? unsafeWindow : void 0)();
      var _monkeyWindow = (() => window)();
      const client = Object.freeze( Object.defineProperty({
        __proto__: null,
        GM: _GM,
        GM_addElement: _GM_addElement,
        GM_addStyle: _GM_addStyle,
        GM_addValueChangeListener: _GM_addValueChangeListener,
        GM_audio: _GM_audio,
        GM_cookie: _GM_cookie,
        GM_deleteValue: _GM_deleteValue,
        GM_deleteValues: _GM_deleteValues,
        GM_download: _GM_download,
        GM_getResourceText: _GM_getResourceText,
        GM_getResourceURL: _GM_getResourceURL,
        GM_getTab: _GM_getTab,
        GM_getTabs: _GM_getTabs,
        GM_getValue: _GM_getValue,
        GM_getValues: _GM_getValues,
        GM_info: _GM_info,
        GM_listValues: _GM_listValues,
        GM_log: _GM_log,
        GM_notification: _GM_notification,
        GM_openInTab: _GM_openInTab,
        GM_registerMenuCommand: _GM_registerMenuCommand,
        GM_removeValueChangeListener: _GM_removeValueChangeListener,
        GM_saveTab: _GM_saveTab,
        GM_setClipboard: _GM_setClipboard,
        GM_setValue: _GM_setValue,
        GM_setValues: _GM_setValues,
        GM_unregisterMenuCommand: _GM_unregisterMenuCommand,
        GM_webRequest: _GM_webRequest,
        GM_xmlhttpRequest: _GM_xmlhttpRequest,
        monkeyWindow: _monkeyWindow,
        unsafeWindow: _unsafeWindow
      }, Symbol.toStringTag, { value: "Module" }));
      const VERSION = _GM_info.script.version;
      const BASE_URL = exports("B", {
BILIBILI_ROOM_INIT: "https://api.live.bilibili.com/room/v1/Room/room_init",
BILIBILI_ROOM_INIT_ALT: "https://api.live.bilibili.com/room/v1/Room/get_info",
BILIBILI_ROOM_INFO_BY_UID: "https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld",
BILIBILI_MSG_SEND: "https://api.live.bilibili.com/msg/send",
BILIBILI_MSG_CONFIG: "https://api.live.bilibili.com/xlive/web-room/v1/dM/AjaxSetConfig",
BILIBILI_GET_DM_CONFIG: "https://api.live.bilibili.com/xlive/web-room/v1/dM/GetDMConfigByGroup",
BILIBILI_DANMU_INFO: "https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo",
BILIBILI_GET_EMOTICONS: "https://api.live.bilibili.com/xlive/web-ucenter/v2/emoticon/GetEmoticons",
BILIBILI_MEDAL_WALL: "https://api.live.bilibili.com/xlive/web-ucenter/user/MedalWall",
BILIBILI_FOLLOWINGS: "https://api.bilibili.com/x/relation/followings",
BILIBILI_ROOM_USER_INFO: "https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByUser",
BILIBILI_SILENT_USER_LIST: "https://api.live.bilibili.com/xlive/web-ucenter/v1/banned/GetSilentUserList",
        LAPLACE_CHAT_AUDIT: "https://edge-workers.laplace.cn/laplace/chat-audit",
        REMOTE_KEYWORDS: "https://workers.vrp.moe/gh-raw/laplace-live/public/master/artifacts/livesrtream-keywords.json",
        LAPLACE_MEMES: "https://workers.vrp.moe/laplace/memes",
        LAPLACE_MEME_COPY: "https://workers.vrp.moe/laplace/meme-copy",
        BILIBILI_AVATAR: "https://workers.vrp.moe/bilibili/avatar",
        BILIBILI_SUPERCHAT_ORDER: "https://workers.vrp.moe/bilibili/live-create-order",
SBHZM_MEMES: "https://sbhzm.cn/api/public/memes",
SBHZM_MEMES_RANDOM: "https://sbhzm.cn/api/public/memes/random",
SBHZM_TAGS: "https://sbhzm.cn/api/public/tags",
SBHZM_SUBMIT_MEME: "https://sbhzm.cn/api/admin/memes",
SBHZM_SUBMIT_PAGE: "https://sbhzm.cn/submit",
CB_BACKEND: "https://chatterbox-cloud.aijc-eric.workers.dev",
ANTHROPIC_MESSAGES: "https://api.anthropic.com/v1/messages",
OPENAI_CHAT: "https://api.openai.com/v1/chat/completions"
      });
      const CHATTERBOX_SEND_PARAM = "cb_send";
      const CHATTERBOX_SEND_VALUE = "1";
      const CHATTERBOX_SEND_MARKER = `${CHATTERBOX_SEND_PARAM}=${CHATTERBOX_SEND_VALUE}`;
      const ISSUES_URL = "https://github.com/aijc123/bilibili-live-wheel-auto-follow/issues";
      var t$1, r$1, u$1, i$1, o$1 = 0, f = [], c$1 = l$3, e$1 = c$1.__b, a$1 = c$1.__r, v$1 = c$1.diffed, l$2 = c$1.__c, m$1 = c$1.unmount, s$1 = c$1.__;
      function p$2(n2, t2) {
        c$1.__h && c$1.__h(r$1, n2, o$1 || t2), o$1 = 0;
        var u2 = r$1.__H || (r$1.__H = { __: [], __h: [] });
        return n2 >= u2.__.length && u2.__.push({}), u2.__[n2];
      }
      function y$2(n2, u2) {
        var i2 = p$2(t$1++, 3);
        !c$1.__s && C(i2.__H, u2) && (i2.__ = n2, i2.u = u2, r$1.__H.__h.push(i2));
      }
      function _$2(n2, u2) {
        var i2 = p$2(t$1++, 4);
        !c$1.__s && C(i2.__H, u2) && (i2.__ = n2, i2.u = u2, r$1.__h.push(i2));
      }
      function A(n2) {
        return o$1 = 5, T$1(function() {
          return { current: n2 };
        }, []);
      }
      function T$1(n2, r2) {
        var u2 = p$2(t$1++, 7);
        return C(u2.__H, r2) && (u2.__ = n2(), u2.__H = r2, u2.__h = n2), u2.__;
      }
      function q$2(n2, t2) {
        return o$1 = 8, T$1(function() {
          return n2;
        }, t2);
      }
      function j$2() {
        for (var n2; n2 = f.shift(); ) {
          var t2 = n2.__H;
          if (n2.__P && t2) try {
            t2.__h.some(z), t2.__h.some(B$1), t2.__h = [];
          } catch (r2) {
            t2.__h = [], c$1.__e(r2, n2.__v);
          }
        }
      }
      c$1.__b = function(n2) {
        r$1 = null, e$1 && e$1(n2);
      }, c$1.__ = function(n2, t2) {
        n2 && t2.__k && t2.__k.__m && (n2.__m = t2.__k.__m), s$1 && s$1(n2, t2);
      }, c$1.__r = function(n2) {
        a$1 && a$1(n2), t$1 = 0;
        var i2 = (r$1 = n2.__c).__H;
        i2 && (u$1 === r$1 ? (i2.__h = [], r$1.__h = [], i2.__.some(function(n3) {
          n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
        })) : (i2.__h.some(z), i2.__h.some(B$1), i2.__h = [], t$1 = 0)), u$1 = r$1;
      }, c$1.diffed = function(n2) {
        v$1 && v$1(n2);
        var t2 = n2.__c;
        t2 && t2.__H && (t2.__H.__h.length && (1 !== f.push(t2) && i$1 === c$1.requestAnimationFrame || ((i$1 = c$1.requestAnimationFrame) || w$2)(j$2)), t2.__H.__.some(function(n3) {
          n3.u && (n3.__H = n3.u), n3.u = void 0;
        })), u$1 = r$1 = null;
      }, c$1.__c = function(n2, t2) {
        t2.some(function(n3) {
          try {
            n3.__h.some(z), n3.__h = n3.__h.filter(function(n4) {
              return !n4.__ || B$1(n4);
            });
          } catch (r2) {
            t2.some(function(n4) {
              n4.__h && (n4.__h = []);
            }), t2 = [], c$1.__e(r2, n3.__v);
          }
        }), l$2 && l$2(n2, t2);
      }, c$1.unmount = function(n2) {
        m$1 && m$1(n2);
        var t2, r2 = n2.__c;
        r2 && r2.__H && (r2.__H.__.some(function(n3) {
          try {
            z(n3);
          } catch (n4) {
            t2 = n4;
          }
        }), r2.__H = void 0, t2 && c$1.__e(t2, r2.__v));
      };
      var k = "function" == typeof requestAnimationFrame;
      function w$2(n2) {
        var t2, r2 = function() {
          clearTimeout(u2), k && cancelAnimationFrame(t2), setTimeout(n2);
        }, u2 = setTimeout(r2, 35);
        k && (t2 = requestAnimationFrame(r2));
      }
      function z(n2) {
        var t2 = r$1, u2 = n2.__c;
        "function" == typeof u2 && (n2.__c = void 0, u2()), r$1 = t2;
      }
      function B$1(n2) {
        var t2 = r$1;
        n2.__c = n2.__(), r$1 = t2;
      }
      function C(n2, t2) {
        return !n2 || n2.length !== t2.length || t2.some(function(t3, r2) {
          return t3 !== n2[r2];
        });
      }
      var i = Symbol.for("preact-signals");
      function t() {
        if (!(s > 1)) {
          var i2, t2 = false;
          !(function() {
            var i3 = c;
            c = void 0;
            while (void 0 !== i3) {
              if (i3.S.v === i3.v) i3.S.i = i3.i;
              i3 = i3.o;
            }
          })();
          while (void 0 !== h$1) {
            var n2 = h$1;
            h$1 = void 0;
            v++;
            while (void 0 !== n2) {
              var r2 = n2.u;
              n2.u = void 0;
              n2.f &= -3;
              if (!(8 & n2.f) && w$1(n2)) try {
                n2.c();
              } catch (n3) {
                if (!t2) {
                  i2 = n3;
                  t2 = true;
                }
              }
              n2 = r2;
            }
          }
          v = 0;
          s--;
          if (t2) throw i2;
        } else s--;
      }
      function n(i2) {
        if (s > 0) return i2();
        e = ++u;
        s++;
        try {
          return i2();
        } finally {
          t();
        }
      }
      var r = void 0;
      function o(i2) {
        var t2 = r;
        r = void 0;
        try {
          return i2();
        } finally {
          r = t2;
        }
      }
      var h$1 = void 0, s = 0, v = 0, u = 0, e = 0, c = void 0, d$1 = 0;
      function a(i2) {
        if (void 0 !== r) {
          var t2 = i2.n;
          if (void 0 === t2 || t2.t !== r) {
            t2 = { i: 0, S: i2, p: r.s, n: void 0, t: r, e: void 0, x: void 0, r: t2 };
            if (void 0 !== r.s) r.s.n = t2;
            r.s = t2;
            i2.n = t2;
            if (32 & r.f) i2.S(t2);
            return t2;
          } else if (-1 === t2.i) {
            t2.i = 0;
            if (void 0 !== t2.n) {
              t2.n.p = t2.p;
              if (void 0 !== t2.p) t2.p.n = t2.n;
              t2.p = r.s;
              t2.n = void 0;
              r.s.n = t2;
              r.s = t2;
            }
            return t2;
          }
        }
      }
      function l$1(i2, t2) {
        this.v = i2;
        this.i = 0;
        this.n = void 0;
        this.t = void 0;
        this.l = 0;
        this.W = null == t2 ? void 0 : t2.watched;
        this.Z = null == t2 ? void 0 : t2.unwatched;
        this.name = null == t2 ? void 0 : t2.name;
      }
      l$1.prototype.brand = i;
      l$1.prototype.h = function() {
        return true;
      };
      l$1.prototype.S = function(i2) {
        var t2 = this, n2 = this.t;
        if (n2 !== i2 && void 0 === i2.e) {
          i2.x = n2;
          this.t = i2;
          if (void 0 !== n2) n2.e = i2;
          else o(function() {
            var i3;
            null == (i3 = t2.W) || i3.call(t2);
          });
        }
      };
      l$1.prototype.U = function(i2) {
        var t2 = this;
        if (void 0 !== this.t) {
          var n2 = i2.e, r2 = i2.x;
          if (void 0 !== n2) {
            n2.x = r2;
            i2.e = void 0;
          }
          if (void 0 !== r2) {
            r2.e = n2;
            i2.x = void 0;
          }
          if (i2 === this.t) {
            this.t = r2;
            if (void 0 === r2) o(function() {
              var i3;
              null == (i3 = t2.Z) || i3.call(t2);
            });
          }
        }
      };
      l$1.prototype.subscribe = function(i2) {
        var t2 = this;
        return j$1(function() {
          var n2 = t2.value, o2 = r;
          r = void 0;
          try {
            i2(n2);
          } finally {
            r = o2;
          }
        }, { name: "sub" });
      };
      l$1.prototype.valueOf = function() {
        return this.value;
      };
      l$1.prototype.toString = function() {
        return this.value + "";
      };
      l$1.prototype.toJSON = function() {
        return this.value;
      };
      l$1.prototype.peek = function() {
        var i2 = r;
        r = void 0;
        try {
          return this.value;
        } finally {
          r = i2;
        }
      };
      Object.defineProperty(l$1.prototype, "value", { get: function() {
        var i2 = a(this);
        if (void 0 !== i2) i2.i = this.i;
        return this.v;
      }, set: function(i2) {
        if (i2 !== this.v) {
          if (v > 100) throw new Error("Cycle detected");
          !(function(i3) {
            if (0 !== s && 0 === v) {
              if (i3.l !== e) {
                i3.l = e;
                c = { S: i3, v: i3.v, i: i3.i, o: c };
              }
            }
          })(this);
          this.v = i2;
          this.i++;
          d$1++;
          s++;
          try {
            for (var n2 = this.t; void 0 !== n2; n2 = n2.x) n2.t.N();
          } finally {
            t();
          }
        }
      } });
      function y$1(i2, t2) {
        return new l$1(i2, t2);
      }
      function w$1(i2) {
        for (var t2 = i2.s; void 0 !== t2; t2 = t2.n) if (t2.S.i !== t2.i || !t2.S.h() || t2.S.i !== t2.i) return true;
        return false;
      }
      function _$1(i2) {
        for (var t2 = i2.s; void 0 !== t2; t2 = t2.n) {
          var n2 = t2.S.n;
          if (void 0 !== n2) t2.r = n2;
          t2.S.n = t2;
          t2.i = -1;
          if (void 0 === t2.n) {
            i2.s = t2;
            break;
          }
        }
      }
      function b$1(i2) {
        var t2 = i2.s, n2 = void 0;
        while (void 0 !== t2) {
          var r2 = t2.p;
          if (-1 === t2.i) {
            t2.S.U(t2);
            if (void 0 !== r2) r2.n = t2.n;
            if (void 0 !== t2.n) t2.n.p = r2;
          } else n2 = t2;
          t2.S.n = t2.r;
          if (void 0 !== t2.r) t2.r = void 0;
          t2 = r2;
        }
        i2.s = n2;
      }
      function p$1(i2, t2) {
        l$1.call(this, void 0);
        this.x = i2;
        this.s = void 0;
        this.g = d$1 - 1;
        this.f = 4;
        this.W = null == t2 ? void 0 : t2.watched;
        this.Z = null == t2 ? void 0 : t2.unwatched;
        this.name = null == t2 ? void 0 : t2.name;
      }
      p$1.prototype = new l$1();
      p$1.prototype.h = function() {
        this.f &= -3;
        if (1 & this.f) return false;
        if (32 == (36 & this.f)) return true;
        this.f &= -5;
        if (this.g === d$1) return true;
        this.g = d$1;
        this.f |= 1;
        if (this.i > 0 && !w$1(this)) {
          this.f &= -2;
          return true;
        }
        var i2 = r;
        try {
          _$1(this);
          r = this;
          var t2 = this.x();
          if (16 & this.f || this.v !== t2 || 0 === this.i) {
            this.v = t2;
            this.f &= -17;
            this.i++;
          }
        } catch (i3) {
          this.v = i3;
          this.f |= 16;
          this.i++;
        }
        r = i2;
        b$1(this);
        this.f &= -2;
        return true;
      };
      p$1.prototype.S = function(i2) {
        if (void 0 === this.t) {
          this.f |= 36;
          for (var t2 = this.s; void 0 !== t2; t2 = t2.n) t2.S.S(t2);
        }
        l$1.prototype.S.call(this, i2);
      };
      p$1.prototype.U = function(i2) {
        if (void 0 !== this.t) {
          l$1.prototype.U.call(this, i2);
          if (void 0 === this.t) {
            this.f &= -33;
            for (var t2 = this.s; void 0 !== t2; t2 = t2.n) t2.S.U(t2);
          }
        }
      };
      p$1.prototype.N = function() {
        if (!(2 & this.f)) {
          this.f |= 6;
          for (var i2 = this.t; void 0 !== i2; i2 = i2.x) i2.t.N();
        }
      };
      Object.defineProperty(p$1.prototype, "value", { get: function() {
        if (1 & this.f) throw new Error("Cycle detected");
        var i2 = a(this);
        this.h();
        if (void 0 !== i2) i2.i = this.i;
        if (16 & this.f) throw this.v;
        return this.v;
      } });
      function g$2(i2, t2) {
        return new p$1(i2, t2);
      }
      function S(i2) {
        var n2 = i2.m;
        i2.m = void 0;
        if ("function" == typeof n2) {
          s++;
          var o2 = r;
          r = void 0;
          try {
            n2();
          } catch (t2) {
            i2.f &= -2;
            i2.f |= 8;
            m(i2);
            throw t2;
          } finally {
            r = o2;
            t();
          }
        }
      }
      function m(i2) {
        for (var t2 = i2.s; void 0 !== t2; t2 = t2.n) t2.S.U(t2);
        i2.x = void 0;
        i2.s = void 0;
        S(i2);
      }
      function x$1(i2) {
        if (r !== this) throw new Error("Out-of-order effect");
        b$1(this);
        r = i2;
        this.f &= -2;
        if (8 & this.f) m(this);
        t();
      }
      function E$1(i2, t2) {
        this.x = i2;
        this.m = void 0;
        this.s = void 0;
        this.u = void 0;
        this.f = 32;
        this.name = null == t2 ? void 0 : t2.name;
      }
      E$1.prototype.c = function() {
        var i2 = this.S();
        try {
          if (8 & this.f) return;
          if (void 0 === this.x) return;
          var t2 = this.x();
          if ("function" == typeof t2) this.m = t2;
        } finally {
          i2();
        }
      };
      E$1.prototype.S = function() {
        if (1 & this.f) throw new Error("Cycle detected");
        this.f |= 1;
        this.f &= -9;
        S(this);
        _$1(this);
        s++;
        var i2 = r;
        r = this;
        return x$1.bind(this, i2);
      };
      E$1.prototype.N = function() {
        if (!(2 & this.f)) {
          this.f |= 2;
          this.u = h$1;
          h$1 = this;
        }
      };
      E$1.prototype.d = function() {
        this.f |= 8;
        if (!(1 & this.f)) m(this);
      };
      E$1.prototype.dispose = function() {
        this.d();
      };
      function j$1(i2, t2) {
        var n2 = new E$1(i2, t2);
        try {
          n2.c();
        } catch (i3) {
          n2.d();
          throw i3;
        }
        var r2 = n2.d.bind(n2);
        r2[Symbol.dispose] = r2;
        return r2;
      }
      var l, d, h, p = "undefined" != typeof window && !!window.__PREACT_SIGNALS_DEVTOOLS__, _ = [];
      j$1(function() {
        l = this.N;
      })();
      function g$1(i2, r2) {
        l$3[i2] = r2.bind(null, l$3[i2] || function() {
        });
      }
      function b(i2) {
        if (h) {
          var n2 = h;
          h = void 0;
          n2();
        }
        h = i2 && i2.S();
      }
      function y(i2) {
        var n2 = this, t2 = i2.data, e2 = useSignal(t2);
        e2.value = t2;
        var f2 = T$1(function() {
          var i3 = n2, t3 = n2.__v;
          while (t3 = t3.__) if (t3.__c) {
            t3.__c.__$f |= 4;
            break;
          }
          var o2 = g$2(function() {
            var i4 = e2.value.value;
            return 0 === i4 ? 0 : true === i4 ? "" : i4 || "";
          }), f3 = g$2(function() {
            return !Array.isArray(o2.value) && !t$2(o2.value);
          }), a3 = j$1(function() {
            this.N = F;
            if (f3.value) {
              var n3 = o2.value;
              if (i3.__v && i3.__v.__e && 3 === i3.__v.__e.nodeType) i3.__v.__e.data = n3;
            }
          }), v3 = n2.__$u.d;
          n2.__$u.d = function() {
            a3();
            v3.call(this);
          };
          return [f3, o2];
        }, []), a2 = f2[0], v2 = f2[1];
        return a2.value ? v2.peek() : v2.value;
      }
      y.displayName = "ReactiveTextNode";
      Object.defineProperties(l$1.prototype, { constructor: { configurable: true, value: void 0 }, type: { configurable: true, value: y }, props: { configurable: true, get: function() {
        var i2 = this;
        return { data: { get value() {
          return i2.value;
        } } };
      } }, __b: { configurable: true, value: 1 } });
      g$1("__b", function(i2, n2) {
        if ("string" == typeof n2.type) {
          var r2, t2 = n2.props;
          for (var o2 in t2) if ("children" !== o2) {
            var e2 = t2[o2];
            if (e2 instanceof l$1) {
              if (!r2) n2.__np = r2 = {};
              r2[o2] = e2;
              t2[o2] = e2.peek();
            }
          }
        }
        i2(n2);
      });
      g$1("__r", function(i2, n2) {
        i2(n2);
        if (n2.type !== S$1) {
          b();
          var r2, o2 = n2.__c;
          if (o2) {
            o2.__$f &= -2;
            if (void 0 === (r2 = o2.__$u)) o2.__$u = r2 = (function(i3, n3) {
              var r3;
              j$1(function() {
                r3 = this;
              }, { name: n3 });
              r3.c = i3;
              return r3;
            })(function() {
              var i3;
              if (p) null == (i3 = r2.y) || i3.call(r2);
              o2.__$f |= 1;
              o2.setState({});
            }, "function" == typeof n2.type ? n2.type.displayName || n2.type.name : "");
          }
          d = o2;
          b(r2);
        }
      });
      g$1("__e", function(i2, n2, r2, t2) {
        b();
        d = void 0;
        i2(n2, r2, t2);
      });
      g$1("diffed", function(i2, n2) {
        b();
        d = void 0;
        var r2;
        if ("string" == typeof n2.type && (r2 = n2.__e)) {
          var t2 = n2.__np, o2 = n2.props;
          if (t2) {
            var e2 = r2.U;
            if (e2) for (var f2 in e2) {
              var u2 = e2[f2];
              if (void 0 !== u2 && !(f2 in t2)) {
                u2.d();
                e2[f2] = void 0;
              }
            }
            else {
              e2 = {};
              r2.U = e2;
            }
            for (var a2 in t2) {
              var c2 = e2[a2], v2 = t2[a2];
              if (void 0 === c2) {
                c2 = w(r2, a2, v2);
                e2[a2] = c2;
              } else c2.o(v2, o2);
            }
            for (var s2 in t2) o2[s2] = t2[s2];
          }
        }
        i2(n2);
      });
      function w(i2, n2, r2, t2) {
        var o2 = n2 in i2 && void 0 === i2.ownerSVGElement, e2 = y$1(r2), f2 = r2.peek();
        return { o: function(i3, n3) {
          e2.value = i3;
          f2 = i3.peek();
        }, d: j$1(function() {
          this.N = F;
          var r3 = e2.value.value;
          if (f2 !== r3) {
            f2 = void 0;
            if (o2) i2[n2] = r3;
            else if (null != r3 && (false !== r3 || "-" === n2[4])) i2.setAttribute(n2, r3);
            else i2.removeAttribute(n2);
          } else f2 = void 0;
        }) };
      }
      g$1("unmount", function(i2, n2) {
        if ("string" == typeof n2.type) {
          var r2 = n2.__e;
          if (r2) {
            var t2 = r2.U;
            if (t2) {
              r2.U = void 0;
              for (var o2 in t2) {
                var e2 = t2[o2];
                if (e2) e2.d();
              }
            }
          }
          n2.__np = void 0;
        } else {
          var f2 = n2.__c;
          if (f2) {
            var u2 = f2.__$u;
            if (u2) {
              f2.__$u = void 0;
              u2.d();
            }
          }
        }
        i2(n2);
      });
      g$1("__h", function(i2, n2, r2, t2) {
        if (t2 < 3 || 9 === t2) n2.__$f |= 2;
        i2(n2, r2, t2);
      });
      C$1.prototype.shouldComponentUpdate = function(i2, n2) {
        if (this.__R) return true;
        var r2 = this.__$u, t2 = r2 && void 0 !== r2.s;
        for (var o2 in n2) return true;
        if (this.__f || "boolean" == typeof this.u && true === this.u) {
          var e2 = 2 & this.__$f;
          if (!(t2 || e2 || 4 & this.__$f)) return true;
          if (1 & this.__$f) return true;
        } else {
          if (!(t2 || 4 & this.__$f)) return true;
          if (3 & this.__$f) return true;
        }
        for (var f2 in i2) if ("__source" !== f2 && i2[f2] !== this.props[f2]) return true;
        for (var u2 in this.props) if (!(u2 in i2)) return true;
        return false;
      };
      function useSignal(i2, n2) {
        return T$1(function() {
          return y$1(i2, n2);
        }, []);
      }
      function useComputed(i2, n2) {
        var r2 = A(i2);
        r2.current = i2;
        d.__$f |= 4;
        return T$1(function() {
          return g$2(function() {
            return r2.current();
          }, n2);
        }, []);
      }
      var q$1 = function(i2) {
        queueMicrotask(function() {
          queueMicrotask(i2);
        });
      };
      function x() {
        n(function() {
          var i2;
          while (i2 = _.shift()) l.call(i2);
        });
      }
      function F() {
        if (1 === _.push(this)) (l$3.requestAnimationFrame || q$1)(x);
      }
      const registry = new Map();
      const validators = new Map();
      const pendingWrites = new Map();
      const lastPersistedValues = new Map();
      const GM_PERSIST_DEBOUNCE_MS = 150;
      function flushSignalValue(key, value) {
        pendingWrites.delete(key);
        _GM_setValue(key, value);
        lastPersistedValues.set(key, value);
      }
      function schedulePersist(key, value) {
        const previousTimer = pendingWrites.get(key);
        if (previousTimer) clearTimeout(previousTimer);
        pendingWrites.set(
          key,
          setTimeout(() => {
            flushSignalValue(key, value);
          }, GM_PERSIST_DEBOUNCE_MS)
        );
      }
      function flushPendingWrites() {
        for (const [key, timer2] of pendingWrites) {
          clearTimeout(timer2);
          const current = registry.get(key);
          if (current) flushSignalValue(key, current.value);
        }
      }
      if (typeof window !== "undefined") {
        window.addEventListener("beforeunload", flushPendingWrites);
        window.addEventListener("pagehide", flushPendingWrites);
        if (typeof document !== "undefined") {
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") flushPendingWrites();
          });
        }
      }
      function gmSignal(key, defaultValue, options) {
        const stored = _GM_getValue(key, defaultValue);
        const initialValue = options?.validate && stored !== defaultValue && !options.validate(stored) ? defaultValue : stored;
        const s2 = y$1(initialValue);
        registry.set(key, s2);
        lastPersistedValues.set(key, initialValue);
        if (options?.validate) validators.set(key, options.validate);
        let isFirstRun = true;
        j$1(() => {
          const nextValue = s2.value;
          if (isFirstRun) {
            isFirstRun = false;
            return;
          }
          if (Object.is(lastPersistedValues.get(key), nextValue)) return;
          schedulePersist(key, nextValue);
        });
        return s2;
      }
      function numericGmSignal(key, defaultValue, options) {
        const min = options?.min ?? Number.NEGATIVE_INFINITY;
        const max = options?.max ?? Number.POSITIVE_INFINITY;
        const integer = options?.integer === true;
        const validate = (val) => {
          if (typeof val !== "number" || !Number.isFinite(val)) return false;
          if (integer && !Number.isInteger(val)) return false;
          return val >= min && val <= max;
        };
        const s2 = gmSignal(key, defaultValue, { validate });
        const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(s2), "value");
        if (desc?.get && desc.set) {
          const innerGet = desc.get;
          const innerSet = desc.set;
          Object.defineProperty(s2, "value", {
            configurable: true,
            enumerable: desc.enumerable ?? true,
            get() {
              return innerGet.call(this);
            },
            set(next) {
              let coerced;
              if (typeof next !== "number" || !Number.isFinite(next)) {
                console.warn(
                  `[gm-signal] ${key}: rejecting non-finite write (${String(next)}); using default ${defaultValue}`
                );
                coerced = defaultValue;
              } else {
                coerced = next;
                if (coerced < min) {
                  console.warn(`[gm-signal] ${key}: clamping ${coerced} up to min ${min}`);
                  coerced = min;
                } else if (coerced > max) {
                  console.warn(`[gm-signal] ${key}: clamping ${coerced} down to max ${max}`);
                  coerced = max;
                }
                if (integer && !Number.isInteger(coerced)) {
                  const rounded = Math.round(coerced);
                  console.warn(`[gm-signal] ${key}: rounding ${coerced} to integer ${rounded}`);
                  coerced = rounded;
                }
              }
              innerSet.call(this, coerced);
            }
          });
        }
        return s2;
      }
      function isValidImportedValue(key, val) {
        const validator = validators.get(key);
        if (validator) return validator(val);
        const s2 = registry.get(key);
        if (!s2) return false;
        const current = s2.value;
        if (val === null || current === null) return val === null && current === null;
        if (Array.isArray(current)) return Array.isArray(val);
        return typeof val === typeof current;
      }
      function applyImportedSettings(data) {
        let applied2 = 0;
        for (const [key, val] of Object.entries(data)) {
          const s2 = registry.get(key);
          if (!s2) continue;
          if (!isValidImportedValue(key, val)) continue;
          s2.value = val;
          applied2++;
        }
        return applied2;
      }
      function getGraphemes(str) {
        const segmenter = new Intl.Segmenter("zh", { granularity: "grapheme" });
        return Array.from(segmenter.segment(str), ({ segment }) => segment);
      }
      function trimText(text, maxLength2) {
        if (!text) return [text];
        const graphemes = getGraphemes(text);
        if (graphemes.length <= maxLength2) return [text];
        const parts = [];
        let currentPart = [];
        let currentLength = 0;
        for (const char of graphemes) {
          if (currentLength >= maxLength2) {
            parts.push(currentPart.join(""));
            currentPart = [char];
            currentLength = 1;
          } else {
            currentPart.push(char);
            currentLength++;
          }
        }
        if (currentPart.length > 0) {
          parts.push(currentPart.join(""));
        }
        return parts;
      }
      function stripTrailingPunctuation(text) {
        if (!text) return text;
        return text.replace(/[.,!?;:。，、！？；：…]+$/, "");
      }
      const SENTENCE_PUNCT = new Set([".", "?", "!", "。", "？", "！", "…"]);
      const CLAUSE_PUNCT = new Set([",", ";", ":", "、", "，", "；", "："]);
      function splitTextSmart(text, maxLen, opts = {}) {
        if (!text || maxLen <= 0) return [text];
        const graphemes = getGraphemes(text);
        if (graphemes.length <= maxLen) return [text];
        const lookback = opts.lookback ?? Math.max(4, Math.floor(maxLen / 3));
        const minTail = Math.min(maxLen, opts.minTail ?? Math.max(3, Math.floor(maxLen / 8)));
        const isWs = (g2) => g2.length === 1 && /\s/.test(g2);
        const parts = [];
        let i2 = 0;
        while (i2 < graphemes.length) {
          while (i2 < graphemes.length && isWs(graphemes[i2])) i2++;
          if (i2 >= graphemes.length) break;
          const remaining = graphemes.length - i2;
          if (remaining <= maxLen) {
            parts.push(graphemes.slice(i2).join(""));
            break;
          }
          const windowEnd = i2 + maxLen;
          const minBreak = Math.max(i2 + 1, windowEnd - lookback);
          let cut = -1;
          let skipNext = 0;
          for (let j2 = windowEnd - 1; j2 >= minBreak; j2--) {
            if (SENTENCE_PUNCT.has(graphemes[j2])) {
              cut = j2 + 1;
              break;
            }
          }
          if (cut === -1) {
            for (let j2 = windowEnd - 1; j2 >= minBreak; j2--) {
              if (CLAUSE_PUNCT.has(graphemes[j2])) {
                cut = j2 + 1;
                break;
              }
            }
          }
          if (cut === -1) {
            for (let j2 = windowEnd - 1; j2 >= minBreak; j2--) {
              if (isWs(graphemes[j2])) {
                cut = j2;
                skipNext = 1;
                break;
              }
            }
          }
          if (cut === -1) cut = windowEnd;
          parts.push(graphemes.slice(i2, cut).join(""));
          i2 = cut + skipNext;
        }
        if (parts.length >= 2) {
          const lastG = getGraphemes(parts[parts.length - 1]);
          if (lastG.length < minTail) {
            const prevG = getGraphemes(parts[parts.length - 2]);
            const transfer = Math.min(minTail - lastG.length, prevG.length - 1);
            if (transfer > 0) {
              parts[parts.length - 2] = prevG.slice(0, prevG.length - transfer).join("");
              parts[parts.length - 1] = prevG.slice(prevG.length - transfer).join("") + parts[parts.length - 1];
            }
          }
        }
        return parts;
      }
      function extractRoomNumber(url) {
        const urlObj = new URL(url);
        if (urlObj.hostname !== "live.bilibili.com") return void 0;
        const match = urlObj.pathname.match(/^\/(?:blanc\/|h5\/)?(\d+)\/?$/);
        return match ? match[1] : void 0;
      }
      function addRandomCharacter(text) {
        if (!text || text.length === 0) return text;
        const graphemes = getGraphemes(text);
        const randomIndex = Math.floor(Math.random() * (graphemes.length + 1));
        graphemes.splice(randomIndex, 0, "­");
        return graphemes.join("");
      }
      function formatDanmakuError(error) {
        if (!error) return "未知错误";
        if (error === "f" || error.includes("f")) return "f - 包含全局屏蔽词";
        if (error === "k" || error.includes("k")) return "k - 包含房间屏蔽词";
        return error;
      }
      function processMessages(text, maxLength2, addRandomChar = false) {
        return text.split("\n").flatMap((line) => {
          let l2 = line;
          if (addRandomChar && l2?.trim()) {
            l2 = addRandomCharacter(l2);
          }
          return trimText(l2, maxLength2);
        }).filter((line) => line?.trim());
      }
      const maxLogLines = numericGmSignal("maxLogLines", 1e3, { min: 50, max: 1e5, integer: true });
      const debugLogVisible = gmSignal("debugLogVisible", false);
      const logLines = y$1([]);
      const userNotices = y$1([]);
      function showUserNotice(message, tone) {
        const id = Date.now();
        userNotices.value = [...userNotices.value, { id, tone, message }];
        setTimeout(() => {
          userNotices.value = userNotices.value.filter((n2) => n2.id !== id);
        }, 5e3);
      }
      function maybeSurfaceLogMessage(message) {
        if (/^(❌|🔴)/.test(message) || /失败|出错|错误|没发出去|未找到登录信息/.test(message)) {
          showUserNotice(message, "error");
        } else if (/^⚠️/.test(message)) {
          showUserNotice(message, "warning");
        }
      }
      function notifyUser(level, message, detail) {
        const fullMessage = detail ? `${message}：${detail}` : message;
        const prefix = level === "error" ? "❌" : level === "warning" ? "⚠️" : level === "success" ? "✅" : "ℹ️";
        appendLog(`${prefix} ${fullMessage}`);
      }
      function formatTs(now) {
        return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      }
      function pushLine(line) {
        const max = maxLogLines.value;
        const lines = logLines.value;
        logLines.value = lines.length >= max ? [...lines.slice(lines.length - max + 1), line] : [...lines, line];
      }
      function appendLog(arg, label, display) {
        const ts = formatTs( new Date());
        const cancelledReason = arg !== null && typeof arg === "object" && "cancelled" in arg && arg.cancelled ? arg.error === "empty-text" ? "内容为空" : "被手动发送中断" : "";
        const message = typeof arg === "string" ? `${ts} ${arg}` : arg.cancelled ? `${ts} ⏭ ${label}: ${display}（${cancelledReason}）` : arg.success ? `${ts} ✅ ${label}: ${display}` : `${ts} ❌ ${label}: ${display}，原因：${formatDanmakuError(arg.error)}`;
        pushLine(message);
        if (typeof arg === "string") {
          maybeSurfaceLogMessage(arg);
        } else if (!arg.success && !arg.cancelled) {
          showUserNotice(`${label}: ${display}，原因：${formatDanmakuError(arg.error)}`, "error");
        }
      }
      function appendLogQuiet(message) {
        const prefix = debugLogVisible.value ? "🔍 " : "";
        pushLine(`${formatTs( new Date())} ${prefix}${message}`);
      }
      const handlers = new Set();
      const wsStatusHandlers = new Set();
      let currentWsStatus$2 = "off";
      const recentDanmakuHistory = [];
      const RECENT_DANMAKU_HISTORY_MS = 15e3;
      const RECENT_DANMAKU_HISTORY_MAX = 240;
      function subscribeCustomChatEvents(handler) {
        handlers.add(handler);
        return () => handlers.delete(handler);
      }
      function pruneRecentDanmakuHistory(now = Date.now()) {
        while (recentDanmakuHistory.length > 0 && now - recentDanmakuHistory[0].observedAt > RECENT_DANMAKU_HISTORY_MS) {
          recentDanmakuHistory.shift();
        }
        while (recentDanmakuHistory.length > RECENT_DANMAKU_HISTORY_MAX) {
          recentDanmakuHistory.shift();
        }
      }
      function rememberRecentDanmaku(event) {
        if (event.kind !== "danmaku") return;
        if (event.source !== "dom" && event.source !== "ws" && event.source !== "local") return;
        const text = event.text.trim();
        if (!text) return;
        const now = Date.now();
        pruneRecentDanmakuHistory(now);
        recentDanmakuHistory.push({
          text,
          uid: event.uid,
          source: event.source,
          observedAt: now
        });
      }
      function findRecentCustomChatDanmakuSource(text, uid, sinceTs) {
        const target = text.trim();
        if (!target) return null;
        pruneRecentDanmakuHistory();
        for (let i2 = recentDanmakuHistory.length - 1; i2 >= 0; i2--) {
          const event = recentDanmakuHistory[i2];
          if (event.observedAt < sinceTs) break;
          if (event.text !== target) continue;
          if (uid && event.uid && event.uid !== uid) continue;
          return event.source;
        }
        return null;
      }
      function emitLocalDanmakuEcho(text, uid, options) {
        const trimmed = text.trim();
        if (!trimmed) return;
        emitCustomChatEvent({
          id: `local-${uid ?? "anon"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind: "danmaku",
          text: trimmed,
          sendText: trimmed,
          uname: options?.uname?.trim() || "我",
          uid,
          time: chatEventTime(),
          isReply: false,
          source: "local",
          badges: []
        });
      }
      function normalizeEventKind(event) {
        const signal = `${event.kind} ${event.text} ${event.badges.join(" ")} ${event.rawCmd ?? ""}`;
        if (/SUPER_CHAT/i.test(signal)) return "superchat";
        if (/GUARD|舰长|提督|总督|大航海|privilege/i.test(signal)) return "guard";
        if (/红包|RED|ENVELOP/i.test(signal)) return "redpacket";
        if (/天选|LOTTERY|ANCHOR_LOT/i.test(signal)) return "lottery";
        if (/点赞|LIKE/i.test(signal)) return "like";
        if (/分享|SHARE/i.test(signal)) return "share";
        if (/关注|FOLLOW/i.test(signal)) return "follow";
        return event.kind;
      }
      function normalizeCustomChatEvent(event) {
        const kind = normalizeEventKind(event);
        return {
          ...event,
          kind,
          text: event.text.trim(),
          uname: event.uname.trim() || "匿名",
          badges: [...new Set(event.badges.map((item) => item.trim()).filter(Boolean))],
          fields: event.fields?.map((field) => ({
            ...field,
            key: field.key.trim(),
            label: field.label.trim(),
            value: field.value.trim()
          })).filter((field) => field.key && field.label && field.value)
        };
      }
      const prewarmedAvatars = new Set();
      const PREWARM_AVATAR_CAP = 2e3;
      function prewarmAvatar(url) {
        if (!url) return;
        if (prewarmedAvatars.has(url)) return;
        if (prewarmedAvatars.size >= PREWARM_AVATAR_CAP) {
          const oldest = prewarmedAvatars.values().next().value;
          if (oldest) prewarmedAvatars.delete(oldest);
        }
        prewarmedAvatars.add(url);
        const img = new Image();
        img.referrerPolicy = "no-referrer";
        img.decoding = "async";
        img.src = url;
        img.decode().catch(() => {
        });
      }
      function emitCustomChatEvent(event) {
        const normalized = normalizeCustomChatEvent(event);
        prewarmAvatar(normalized.avatarUrl);
        rememberRecentDanmaku(normalized);
        for (const handler of handlers) {
          handler(normalized);
        }
      }
      function subscribeCustomChatWsStatus(handler) {
        wsStatusHandlers.add(handler);
        handler(currentWsStatus$2);
        return () => wsStatusHandlers.delete(handler);
      }
      function emitCustomChatWsStatus(status) {
        currentWsStatus$2 = status;
        for (const handler of wsStatusHandlers) {
          handler(status);
        }
      }
      function chatEventTime(ts = Date.now()) {
        return new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
      }
      const enableMemeContribution = gmSignal("enableMemeContribution", false);
      const memeContributorCandidatesByRoom = gmSignal("memeContributorCandidatesByRoom", {});
      const memeContributorSeenTextsByRoom = gmSignal("memeContributorSeenTextsByRoom", {});
      const cbBackendEnabled = gmSignal("cbBackendEnabled", false);
      const cbBackendUrlOverride = gmSignal("cbBackendUrlOverride", "");
      const cbBackendHealthState = y$1("idle");
      const cbBackendHealthDetail = y$1("");
      const currentMemesList = y$1([]);
      const msgSendInterval = numericGmSignal("msgSendInterval", 1, { min: 0.1, max: 600 });
      const maxLength = numericGmSignal("maxLength", 38, { min: 1, max: 100, integer: true });
      const randomColor = gmSignal("randomColor", false);
      const randomInterval = gmSignal("randomInterval", false);
      const randomChar = gmSignal("randomChar", false);
      const aiEvasion = gmSignal("aiEvasion", false);
      const msgTemplates = gmSignal("MsgTemplates", []);
      const activeTemplateIndex = numericGmSignal("activeTemplateIndex", 0, { min: 0, max: 999, integer: true });
      const persistSendState = gmSignal("persistSendState", {});
      const sendMsg = y$1(false);
      const availableDanmakuColors = y$1(null);
      const fasongText = y$1("");
      const autoBlendWindowSec = numericGmSignal("autoBlendWindowSec", 20, { min: 1, max: 600 });
      const autoBlendThreshold = numericGmSignal("autoBlendThreshold", 4, { min: 1, max: 100, integer: true });
      const autoBlendCooldownSec = numericGmSignal("autoBlendCooldownSec", 35, { min: 1, max: 3600 });
      const autoBlendRoutineIntervalSec = numericGmSignal("autoBlendRoutineIntervalSec", 60, { min: 5, max: 3600 });
      const autoBlendBurstSettleMs = numericGmSignal("autoBlendBurstSettleMs", 1500, { min: 100, max: 6e4 });
      const autoBlendRateLimitWindowMin = numericGmSignal("autoBlendRateLimitWindowMin", 10, { min: 1, max: 1440 });
      const autoBlendRateLimitStopThreshold = numericGmSignal("autoBlendRateLimitStopThreshold", 3, {
        min: 1,
        max: 100,
        integer: true
      });
      const autoBlendPreset = gmSignal("autoBlendPreset", "normal");
      const autoBlendAdvancedOpen = gmSignal("autoBlendAdvancedOpen", false);
      const autoBlendDryRunMigrationKey = "autoBlendDryRunVisibleDefaultMigrated";
      if (!_GM_getValue(autoBlendDryRunMigrationKey, false)) {
        if (_GM_getValue("autoBlendDryRun", false) === true) _GM_setValue("autoBlendDryRun", false);
        _GM_setValue(autoBlendDryRunMigrationKey, true);
      }
      const autoBlendDryRun = gmSignal("autoBlendDryRun", false);
      gmSignal("autoBlendAvoidRisky", true);
      gmSignal("autoBlendBlockedWords", "抽奖\n加群\n私信\n房管\n举报");
      const autoBlendIncludeReply = gmSignal("autoBlendIncludeReply", false);
      const autoBlendUseReplacements = gmSignal("autoBlendUseReplacements", true);
      const autoBlendRequireDistinctUsers = gmSignal("autoBlendRequireDistinctUsers", true);
      const autoBlendMinDistinctUsers = numericGmSignal("autoBlendMinDistinctUsers", 3, {
        min: 1,
        max: 100,
        integer: true
      });
      const autoBlendSendCount = numericGmSignal("autoBlendSendCount", 1, { min: 1, max: 50, integer: true });
      const autoBlendUserBlacklist = gmSignal("autoBlendUserBlacklist", {});
      const autoBlendSendAllTrending = gmSignal("autoBlendSendAllTrending", false);
      const autoBlendEnabled = y$1(false);
      const autoBlendStatusText = y$1("已关闭");
      const autoBlendCandidateText = y$1("暂无");
      const autoBlendLastActionText = y$1("暂无");
      const CUSTOM_CHAT_CSS_MAX_LENGTH = 256 * 1024;
      const IMPORT_RE = /@import[^;]*;?/gi;
      const URL_SCHEME_RE = /url\(\s*(["']?)\s*(javascript:|vbscript:|data:text\/html|data:application\/javascript|data:text\/javascript)[^)]*\)/gi;
      const EXPRESSION_RE = /expression\s*\([^)]*\)/gi;
      const BEHAVIOR_RE = /behavior\s*:[^;]*;?/gi;
      function sanitizeCustomChatCss(input) {
        if (typeof input !== "string" || input.length === 0) {
          return { css: "", truncated: false, removedImports: 0, removedUrlSchemes: 0, removedLegacyHooks: 0 };
        }
        let truncated = false;
        let css = input;
        if (css.length > CUSTOM_CHAT_CSS_MAX_LENGTH) {
          css = css.slice(0, CUSTOM_CHAT_CSS_MAX_LENGTH);
          truncated = true;
        }
        let removedImports = 0;
        css = css.replace(IMPORT_RE, () => {
          removedImports++;
          return "";
        });
        let removedUrlSchemes = 0;
        css = css.replace(URL_SCHEME_RE, () => {
          removedUrlSchemes++;
          return 'url("about:blank")';
        });
        let removedLegacyHooks = 0;
        css = css.replace(EXPRESSION_RE, () => {
          removedLegacyHooks++;
          return "";
        });
        css = css.replace(BEHAVIOR_RE, () => {
          removedLegacyHooks++;
          return "";
        });
        return { css, truncated, removedImports, removedUrlSchemes, removedLegacyHooks };
      }
      const customChatDefaultMigrationKey = "customChatDefaultPresetMigrated";
      if (!_GM_getValue(customChatDefaultMigrationKey, false)) {
        _GM_setValue("customChatEnabled", false);
        _GM_setValue("customChatHideNative", false);
        _GM_setValue("customChatUseWs", true);
        _GM_setValue(customChatDefaultMigrationKey, true);
      }
      const customChatDisableDefaultMigrationKey = "customChatDisabledByDefaultMigrated";
      if (!_GM_getValue(customChatDisableDefaultMigrationKey, false)) {
        _GM_setValue("customChatEnabled", false);
        _GM_setValue(customChatDisableDefaultMigrationKey, true);
      }
      const customChatEnabled = gmSignal("customChatEnabled", false);
      const customChatHideNative = gmSignal("customChatHideNative", false);
      const customChatUseWs = gmSignal("customChatUseWs", true);
      const customChatTheme = gmSignal("customChatTheme", "laplace");
      const customChatShowDanmaku = gmSignal("customChatShowDanmaku", true);
      const customChatShowGift = gmSignal("customChatShowGift", true);
      const customChatShowSuperchat = gmSignal("customChatShowSuperchat", true);
      const customChatShowEnter = gmSignal("customChatShowEnter", true);
      const customChatShowNotice = gmSignal("customChatShowNotice", true);
      const customChatCss = gmSignal("customChatCss", "", {
        validate: (val) => typeof val === "string" && val.length <= CUSTOM_CHAT_CSS_MAX_LENGTH
      });
      const customChatPerfDebug = gmSignal("customChatPerfDebug", false);
      const cachedEmoticonPackages = y$1([]);
      const guardRoomEndpoint = gmSignal("guardRoomEndpoint", "https://bilibili-guard-room.vercel.app");
      const guardRoomSyncKey = gmSignal("guardRoomSyncKey", "");
      const guardRoomWebsiteControlEnabled = gmSignal("guardRoomWebsiteControlEnabled", false);
      const guardRoomHandoffActive = y$1(false);
      const VALID_MODES = ["heuristic", "llm"];
      const isValidMode = (v2) => typeof v2 === "string" && VALID_MODES.includes(v2);
      const HZM_DRIVE_MODE_MIGRATION_KEY = "hzmDriveModeOffSplitMigrated";
      function migrateLegacyHzmDriveMode(io) {
        if (io.get(HZM_DRIVE_MODE_MIGRATION_KEY, false)) return;
        if (io.get("hzmDriveMode", "heuristic") === "off") io.set("hzmDriveMode", "heuristic");
        io.set(HZM_DRIVE_MODE_MIGRATION_KEY, true);
      }
      migrateLegacyHzmDriveMode({ get: _GM_getValue, set: _GM_setValue });
      const hzmDriveMode = gmSignal("hzmDriveMode", "heuristic", { validate: isValidMode });
      const hzmDriveEnabled = y$1(false);
      const hzmDriveStatusText = y$1("已关闭");
      const hzmPanelOpen = gmSignal("hzmPanelOpen", false);
      const hasConfirmedHzmRealFire = gmSignal("hasConfirmedHzmRealFire", false);
      const hzmDryRun = gmSignal("hzmDryRun", true);
      const hzmDriveIntervalSec = gmSignal("hzmDriveIntervalSec", 8);
      const hzmRateLimitPerMin = gmSignal("hzmRateLimitPerMin", 6);
      const hzmLlmRatio = gmSignal("hzmLlmRatio", 3);
      const hzmActivityWindowSec = gmSignal("hzmActivityWindowSec", 45);
      const hzmActivityMinDanmu = gmSignal("hzmActivityMinDanmu", 3);
      const hzmActivityMinDistinctUsers = gmSignal("hzmActivityMinDistinctUsers", 2);
      const hzmStrictHeuristic = gmSignal("hzmStrictHeuristic", true);
      const VALID_PROVIDERS = ["anthropic", "openai", "openai-compat"];
      const isValidProvider = (v2) => typeof v2 === "string" && VALID_PROVIDERS.includes(v2);
      const hzmLlmProvider = gmSignal("hzmLlmProvider", "anthropic", { validate: isValidProvider });
      const hzmLlmApiKeyPersist = gmSignal("hzmLlmApiKeyPersist", true);
      const hzmLlmApiKey = y$1(
        _GM_getValue("hzmLlmApiKeyPersist", true) ? _GM_getValue("hzmLlmApiKey", "") : ""
      );
      let _isFirstPersistEffectRun = true;
      j$1(() => {
        const persist = hzmLlmApiKeyPersist.value;
        const key = hzmLlmApiKey.value;
        if (_isFirstPersistEffectRun) {
          _isFirstPersistEffectRun = false;
          return;
        }
        if (persist) {
          _GM_setValue("hzmLlmApiKey", key);
        } else {
          _GM_deleteValue("hzmLlmApiKey");
        }
      });
      function clearHzmLlmApiKey() {
        hzmLlmApiKey.value = "";
        _GM_deleteValue("hzmLlmApiKey");
      }
      const hzmLlmModel = gmSignal("hzmLlmModel", "claude-haiku-4-5-20251001");
      const hzmLlmBaseURL = gmSignal("hzmLlmBaseURL", "");
      const hzmPauseKeywordsOverride = gmSignal("hzmPauseKeywordsOverride", "");
      const isRecordOfStringArrays = (v2) => typeof v2 === "object" && v2 !== null && Object.values(v2).every((arr) => Array.isArray(arr) && arr.every((s2) => typeof s2 === "string"));
      const hzmSelectedTagsByRoom = gmSignal(
        "hzmSelectedTagsByRoom",
        {},
        {
          validate: isRecordOfStringArrays
        }
      );
      const hzmBlacklistTagsByRoom = gmSignal(
        "hzmBlacklistTagsByRoom",
        {},
        {
          validate: isRecordOfStringArrays
        }
      );
      const hzmRecentSentByRoom = gmSignal(
        "hzmRecentSentByRoom",
        {},
        {
          validate: isRecordOfStringArrays
        }
      );
      const isDailyStats = (v2) => typeof v2 === "object" && v2 !== null && typeof v2.date === "string" && typeof v2.sent === "number" && typeof v2.llmCalls === "number";
      const isRecordOfDailyStats = (v2) => typeof v2 === "object" && v2 !== null && Object.values(v2).every(isDailyStats);
      const hzmDailyStatsByRoom = gmSignal(
        "hzmDailyStatsByRoom",
        {},
        {
          validate: isRecordOfDailyStats
        }
      );
      function getSelectedTags(roomId) {
        if (roomId == null) return [];
        return hzmSelectedTagsByRoom.value[String(roomId)] ?? [];
      }
      function setSelectedTags(roomId, tags) {
        hzmSelectedTagsByRoom.value = {
          ...hzmSelectedTagsByRoom.value,
          [String(roomId)]: tags
        };
      }
      function getBlacklistTags(roomId) {
        if (roomId == null) return [];
        return hzmBlacklistTagsByRoom.value[String(roomId)] ?? [];
      }
      function setBlacklistTags(roomId, tags) {
        hzmBlacklistTagsByRoom.value = {
          ...hzmBlacklistTagsByRoom.value,
          [String(roomId)]: tags
        };
      }
      function getRecentSent(roomId) {
        if (roomId == null) return [];
        return hzmRecentSentByRoom.value[String(roomId)] ?? [];
      }
      function pushRecentSent(roomId, content, max = 5) {
        const key = String(roomId);
        const cur = hzmRecentSentByRoom.value[key] ?? [];
        const next = [...cur.filter((c2) => c2 !== content), content];
        hzmRecentSentByRoom.value = {
          ...hzmRecentSentByRoom.value,
          [key]: next.length > max ? next.slice(-max) : next
        };
      }
      function todayLocal() {
        const d2 = new Date();
        return `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}-${String(d2.getDate()).padStart(2, "0")}`;
      }
      function getDailyStats(roomId) {
        const today = todayLocal();
        if (roomId == null) return { date: today, sent: 0, llmCalls: 0 };
        const key = String(roomId);
        const cur = hzmDailyStatsByRoom.value[key];
        if (!cur || cur.date !== today) {
          return { date: today, sent: 0, llmCalls: 0 };
        }
        return cur;
      }
      function bumpDailySent(roomId, delta = 1) {
        const today = todayLocal();
        const key = String(roomId);
        const cur = hzmDailyStatsByRoom.value[key];
        const next = !cur || cur.date !== today ? { date: today, sent: delta, llmCalls: 0 } : { ...cur, sent: cur.sent + delta };
        hzmDailyStatsByRoom.value = { ...hzmDailyStatsByRoom.value, [key]: next };
      }
      function bumpDailyLlmCalls(roomId, delta = 1) {
        const today = todayLocal();
        const key = String(roomId);
        const cur = hzmDailyStatsByRoom.value[key];
        const next = !cur || cur.date !== today ? { date: today, sent: 0, llmCalls: delta } : { ...cur, llmCalls: cur.llmCalls + delta };
        hzmDailyStatsByRoom.value = { ...hzmDailyStatsByRoom.value, [key]: next };
      }
      (() => {
        const old = _GM_getValue("replacementRules", []);
        if (old.length > 0) {
          const existing = _GM_getValue("localGlobalRules", []);
          if (existing.length === 0) {
            _GM_setValue("localGlobalRules", old);
          }
          _GM_deleteValue("replacementRules");
        }
      })();
      const localGlobalRules = gmSignal("localGlobalRules", []);
      const localRoomRules = gmSignal("localRoomRules", {});
      const remoteKeywords = gmSignal("remoteKeywords", null);
      const remoteKeywordsLastSync = gmSignal("remoteKeywordsLastSync", null);
      const replacementMap = y$1(null);
      const autoLearnShadowRules = gmSignal("autoLearnShadowRules", true);
      const shadowBanMode = gmSignal("shadowBanMode", "suggest");
      const shadowBanObservations = gmSignal("shadowBanObservations", []);
      const sonioxApiKey = gmSignal("sonioxApiKey", "");
      const sonioxLanguageHints = gmSignal("sonioxLanguageHints", ["zh"]);
      const sonioxAutoSend = gmSignal("sonioxAutoSend", true);
      const sonioxMaxLength = gmSignal("sonioxMaxLength", 40);
      const sonioxWrapBrackets = gmSignal("sonioxWrapBrackets", false);
      const sonioxTranslationEnabled = gmSignal("sonioxTranslationEnabled", false);
      const sonioxTranslationTarget = gmSignal("sonioxTranslationTarget", "en");
      const sttRunning = y$1(false);
      const forceScrollDanmaku = gmSignal("forceScrollDanmaku", false);
      const optimizeLayout = gmSignal("optimizeLayout", false);
      const danmakuDirectMode = gmSignal("danmakuDirectMode", true);
      const danmakuDirectConfirm = gmSignal("danmakuDirectConfirm", false);
      const danmakuDirectAlwaysShow = gmSignal("danmakuDirectAlwaysShow", false);
      const activeTab = gmSignal("activeTab", "fasong");
      const logPanelOpen = gmSignal("logPanelOpen", false);
      const logPanelFocusRequest = y$1(0);
      const autoSendPanelOpen = gmSignal("autoSendPanelOpen", true);
      const autoBlendPanelOpen = gmSignal("autoBlendPanelOpen", true);
      const memesPanelOpen = gmSignal("memesPanelOpen", false);
      const dialogOpen = gmSignal("dialogOpen", false);
      const unlockForbidLive = gmSignal("unlockForbidLive", true);
      const hasSeenWelcome = gmSignal("hasSeenWelcome", false);
      const hasConfirmedAutoBlendRealFire = gmSignal("hasConfirmedAutoBlendRealFire", false);
      const lastSeenVersion = gmSignal("lastSeenVersion", "");
      const cachedRoomId = y$1(null);
      const cachedStreamerUid = y$1(null);
      const liveWsStatus = y$1("off");
      subscribeCustomChatWsStatus((status) => {
        liveWsStatus.value = status;
      });
      const memeContributorCandidates = g$2(() => {
        const id = cachedRoomId.value;
        if (id === null) return [];
        return memeContributorCandidatesByRoom.value[String(id)] ?? [];
      });
      g$2(() => {
        const id = cachedRoomId.value;
        if (id === null) return [];
        return memeContributorSeenTextsByRoom.value[String(id)] ?? [];
      });
      let sendStateRestored = false;
      j$1(() => {
        const persist = persistSendState.value;
        const roomId = cachedRoomId.value;
        const sending2 = sendMsg.value;
        if (roomId === null) return;
        const key = String(roomId);
        if (persist[key]) {
          if (!sendStateRestored) {
            sendStateRestored = true;
            const stored2 = _GM_getValue("persistedSendMsg", {});
            if (stored2[key]) {
              sendMsg.value = true;
              appendLog("🔄 已恢复独轮车运行状态");
            }
            return;
          }
          const stored = _GM_getValue("persistedSendMsg", {});
          _GM_setValue("persistedSendMsg", { ...stored, [key]: sending2 });
        } else {
          const stored = _GM_getValue("persistedSendMsg", {});
          if (key in stored) {
            const { [key]: _2, ...rest } = stored;
            _GM_setValue("persistedSendMsg", rest);
          }
        }
      });
      function isEmoticonUnique(msg) {
        return cachedEmoticonPackages.value.some((pkg) => pkg.emoticons.some((e2) => e2.emoticon_unique === msg));
      }
      function findEmoticon(msg) {
        for (const pkg of cachedEmoticonPackages.value) {
          for (const e2 of pkg.emoticons) {
            if (e2.emoticon_unique === msg) return e2;
          }
        }
        return null;
      }
      function isLockedEmoticon(msg) {
        const emoticon = findEmoticon(msg);
        return emoticon !== null && emoticon.perm === 0;
      }
      function getEmoticonLockReason(emo) {
        const reqText = emo?.unlock_show_text?.trim();
        return reqText ? `需要 ${reqText}` : "权限不足";
      }
      function getEmoticonLockMeta(emo) {
        const isLocked = emo?.perm === 0;
        const lockText = emo?.unlock_show_text?.trim() || "";
        const reason = lockText ? `需要 ${lockText}` : "权限不足";
        const badgeColor = emo?.unlock_show_color || "rgba(0,0,0,0.6)";
        const titleSuffix = isLocked ? lockText ? `🔒 该表情需要 ${lockText} 才能发送` : "🔒 该表情已被平台锁定" : "";
        const badgeLabel = lockText || "🔒";
        return { isLocked, lockText, reason, badgeColor, titleSuffix, badgeLabel };
      }
      function formatLockedEmoticonReject(msg, label) {
        const reason = getEmoticonLockReason(findEmoticon(msg));
        return `🔒 ${label}：${msg} 已被平台锁定（${reason}），已阻止发送`;
      }
      async function mapWithConcurrency(items, limit, fn) {
        const results = new Array(items.length);
        let cursor = 0;
        const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
          while (true) {
            const idx = cursor++;
            if (idx >= items.length) return;
            results[idx] = await fn(items[idx]);
          }
        });
        await Promise.all(workers);
        return results;
      }
      const RATE_LIMIT_CODES = new Set([10030, 10031]);
      const MUTED_CODES = new Set([10024, 11004]);
      const BLOCKED_CODES = new Set([11002, 11003]);
      const ACCOUNT_CODES = new Set([-101, -352, 10005, 10006, 10021]);
      function classifyByCode(code) {
        if (code === void 0) return null;
        if (RATE_LIMIT_CODES.has(code)) return "rate-limit";
        if (MUTED_CODES.has(code)) return "muted";
        if (BLOCKED_CODES.has(code)) return "blocked";
        if (ACCOUNT_CODES.has(code)) return "account";
        return null;
      }
      function isRateLimitError(error) {
        if (!error) return false;
        return error.includes("频率") || error.includes("过快") || error.toLowerCase().includes("rate");
      }
      function isInfrastructureError(error) {
        if (!error) return false;
        if (/Failed to fetch/i.test(error)) return true;
        if (/^HTTP\s/i.test(error)) return true;
        if (/无响应$/.test(error)) return true;
        if (/NetworkError|TypeError|AbortError/i.test(error)) return true;
        return false;
      }
      function isMutedError(error) {
        if (!error) return false;
        return error.includes("禁言") || error.includes("被封") || error.toLowerCase().includes("muted");
      }
      function isAccountRestrictedError(error) {
        if (!error) return false;
        const lower = error.toLowerCase();
        return error.includes("账号") || error.includes("账户") || error.includes("风控") || error.includes("封号") || error.includes("封禁") || lower.includes("account") || lower.includes("risk");
      }
      function formatDuration(seconds) {
        const rounded = Math.max(1, Math.ceil(seconds));
        if (rounded < 60) return `${rounded} 秒`;
        const minutes = Math.ceil(rounded / 60);
        if (minutes < 60) return `${minutes} 分钟`;
        const hours = Math.ceil(minutes / 60);
        if (hours < 24) return `${hours} 小时`;
        return `${Math.ceil(hours / 24)} 天`;
      }
      function durationFromString(text) {
        const unitMatch = text.match(/(\d+)\s*(秒|分钟|分|小时|天)/);
        if (unitMatch) {
          const value = Number(unitMatch[1]);
          const unit = unitMatch[2];
          if (unit === "秒") return formatDuration(value);
          if (unit === "分" || unit === "分钟") return formatDuration(value * 60);
          if (unit === "小时") return formatDuration(value * 60 * 60);
          if (unit === "天") return formatDuration(value * 24 * 60 * 60);
        }
        const dateMatch = text.match(/(20\d{2}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)?)/);
        if (!dateMatch) return null;
        const end = new Date(dateMatch[1].replace(/\//g, "-")).getTime();
        if (!Number.isFinite(end) || end <= Date.now()) return null;
        return `${formatDuration((end - Date.now()) / 1e3)}（到 ${dateMatch[1]}）`;
      }
      function durationFromData(data, seen2 = new WeakSet()) {
        if (typeof data === "string") return durationFromString(data);
        if (typeof data !== "object" || data === null) return null;
        if (seen2.has(data)) return null;
        seen2.add(data);
        for (const [key, value] of Object.entries(data)) {
          const lowerKey = key.toLowerCase();
          if (typeof value === "string") {
            const parsed = durationFromString(value);
            if (parsed) return parsed;
          } else if (typeof value === "number" && Number.isFinite(value) && value > 0) {
            if (lowerKey.includes("remain") || lowerKey.includes("left") || lowerKey.includes("duration") || lowerKey.includes("second") || lowerKey.includes("ttl") || key.includes("剩余") || key.includes("时长")) {
              return formatDuration(value);
            }
            if (lowerKey.includes("end") || lowerKey.includes("expire") || lowerKey.includes("until") || key.includes("解除")) {
              const ms = value > 1e10 ? value : value * 1e3;
              if (ms > Date.now()) return `${formatDuration((ms - Date.now()) / 1e3)}（到 ${new Date(ms).toLocaleString()}）`;
            }
          } else {
            const nested = durationFromData(value, seen2);
            if (nested) return nested;
          }
        }
        return null;
      }
      function describeRestrictionDuration(error, data) {
        return durationFromString(error ?? "") ?? durationFromData(data) ?? "接口未返回时长";
      }
      function scanRestrictionSignals(data, source) {
        const signals = [];
        scanNode(data, source, signals, "", new WeakSet());
        return signals;
      }
      function scanNode(data, source, signals, path, seen2) {
        if (typeof data === "string") {
          const kind = classifyText(data);
          if (kind) signals.push({ kind, message: data, duration: describeRestrictionDuration(data, null), source });
          return;
        }
        if (typeof data !== "object" || data === null) return;
        if (seen2.has(data)) return;
        seen2.add(data);
        for (const [key, value] of Object.entries(data)) {
          const lowerKey = key.toLowerCase();
          const currentPath = path ? `${path}.${key}` : key;
          if (typeof value === "boolean" && value) {
            if (lowerKey.includes("silent") || lowerKey.includes("mute") || key.includes("禁言")) {
              signals.push({
                kind: "muted",
                message: currentPath,
                duration: describeRestrictionDuration(void 0, data),
                source
              });
            } else if (lowerKey.includes("forbid") || lowerKey.includes("block") || key.includes("封") || key.includes("黑")) {
              signals.push({
                kind: "blocked",
                message: currentPath,
                duration: describeRestrictionDuration(void 0, data),
                source
              });
            }
          }
          scanNode(value, source, signals, currentPath, seen2);
        }
      }
      function classifyText(text) {
        if (text === "账号已注销" || text.includes("账号已注销")) return "deactivated";
        if (isRateLimitError(text)) return "rate-limit";
        if (isMutedError(text)) return "muted";
        if (isAccountRestrictedError(text)) return "account";
        if (text.includes("拉黑") || text.includes("黑名单") || text.toLowerCase().includes("blacklist")) return "blocked";
        return null;
      }
      function buildReplacementMap() {
        const rid = cachedRoomId.value;
        if (rid === null && replacementMap.value !== null) return;
        const map = new Map();
        const rk = remoteKeywords.value;
        if (rk) {
          const globalKeywords = rk.global?.keywords ?? {};
          for (const [from, to] of Object.entries(globalKeywords)) {
            if (from) map.set(from, to);
          }
          if (rid !== null) {
            const roomData = rk.rooms?.find((r2) => String(r2.room) === String(rid));
            const roomKeywords = roomData?.keywords ?? {};
            for (const [from, to] of Object.entries(roomKeywords)) {
              if (from) map.set(from, to);
            }
          }
        }
        for (const rule of localGlobalRules.value) {
          if (rule.from) map.set(rule.from, rule.to ?? "");
        }
        if (rid !== null) {
          const roomRules = localRoomRules.value[String(rid)] ?? [];
          for (const rule of roomRules) {
            if (rule.from) map.set(rule.from, rule.to ?? "");
          }
        }
        replacementMap.value = map;
      }
      j$1(() => {
        cachedRoomId.value;
        remoteKeywords.value;
        localGlobalRules.value;
        localRoomRules.value;
        buildReplacementMap();
      });
      const REPLACEMENT_MAX_OUTPUT_LENGTH = 4096;
      function applyReplacements(text) {
        if (replacementMap.value === null) {
          buildReplacementMap();
        }
        let result = text;
        for (const [from, to] of (replacementMap.value ?? new Map()).entries()) {
          if (!from) continue;
          result = result.split(from).join(to);
          if (result.length > REPLACEMENT_MAX_OUTPUT_LENGTH) {
            return result.slice(0, REPLACEMENT_MAX_OUTPUT_LENGTH);
          }
        }
        return result;
      }
      function md5(str) {
        function rotateLeft(n2, s2) {
          return n2 << s2 | n2 >>> 32 - s2;
        }
        function addUnsigned(x22, y2) {
          const lsw = (x22 & 65535) + (y2 & 65535);
          const msw = (x22 >> 16) + (y2 >> 16) + (lsw >> 16);
          return msw << 16 | lsw & 65535;
        }
        function cmn(q2, a22, b22, x22, s2, t2) {
          return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a22, q2), addUnsigned(x22, t2)), s2), b22);
        }
        function ff(a22, b22, c22, d22, x22, s2, t2) {
          return cmn(b22 & c22 | ~b22 & d22, a22, b22, x22, s2, t2);
        }
        function gg(a22, b22, c22, d22, x22, s2, t2) {
          return cmn(b22 & d22 | c22 & ~d22, a22, b22, x22, s2, t2);
        }
        function hh(a22, b22, c22, d22, x22, s2, t2) {
          return cmn(b22 ^ c22 ^ d22, a22, b22, x22, s2, t2);
        }
        function ii(a22, b22, c22, d22, x22, s2, t2) {
          return cmn(c22 ^ (b22 | ~d22), a22, b22, x22, s2, t2);
        }
        function w2(arr, idx) {
          return arr[idx] ?? 0;
        }
        function convertToWordArray(s2) {
          const wordArray = [];
          for (let i2 = 0; i2 < s2.length * 8; i2 += 8) {
            const idx = i2 >> 5;
            wordArray[idx] = w2(wordArray, idx) | (s2.charCodeAt(i2 / 8) & 255) << i2 % 32;
          }
          return wordArray;
        }
        function wordToHex(value) {
          let hex = "";
          for (let i2 = 0; i2 < 4; i2++) {
            hex += (value >> i2 * 8 + 4 & 15).toString(16) + (value >> i2 * 8 & 15).toString(16);
          }
          return hex;
        }
        const x2 = convertToWordArray(str);
        let a2 = 1732584193;
        let b2 = 4023233417;
        let c2 = 2562383102;
        let d2 = 271733878;
        const padIdx = str.length >> 2;
        x2[padIdx] = w2(x2, padIdx) | 128 << str.length % 4 * 8;
        x2[(str.length + 8 >> 6 << 4) + 14] = str.length * 8;
        for (let i2 = 0; i2 < x2.length; i2 += 16) {
          const oldA = a2;
          const oldB = b2;
          const oldC = c2;
          const oldD = d2;
          a2 = ff(a2, b2, c2, d2, w2(x2, i2 + 0), 7, 3614090360);
          d2 = ff(d2, a2, b2, c2, w2(x2, i2 + 1), 12, 3905402710);
          c2 = ff(c2, d2, a2, b2, w2(x2, i2 + 2), 17, 606105819);
          b2 = ff(b2, c2, d2, a2, w2(x2, i2 + 3), 22, 3250441966);
          a2 = ff(a2, b2, c2, d2, w2(x2, i2 + 4), 7, 4118548399);
          d2 = ff(d2, a2, b2, c2, w2(x2, i2 + 5), 12, 1200080426);
          c2 = ff(c2, d2, a2, b2, w2(x2, i2 + 6), 17, 2821735955);
          b2 = ff(b2, c2, d2, a2, w2(x2, i2 + 7), 22, 4249261313);
          a2 = ff(a2, b2, c2, d2, w2(x2, i2 + 8), 7, 1770035416);
          d2 = ff(d2, a2, b2, c2, w2(x2, i2 + 9), 12, 2336552879);
          c2 = ff(c2, d2, a2, b2, w2(x2, i2 + 10), 17, 4294925233);
          b2 = ff(b2, c2, d2, a2, w2(x2, i2 + 11), 22, 2304563134);
          a2 = ff(a2, b2, c2, d2, w2(x2, i2 + 12), 7, 1804603682);
          d2 = ff(d2, a2, b2, c2, w2(x2, i2 + 13), 12, 4254626195);
          c2 = ff(c2, d2, a2, b2, w2(x2, i2 + 14), 17, 2792965006);
          b2 = ff(b2, c2, d2, a2, w2(x2, i2 + 15), 22, 1236535329);
          a2 = gg(a2, b2, c2, d2, w2(x2, i2 + 1), 5, 4129170786);
          d2 = gg(d2, a2, b2, c2, w2(x2, i2 + 6), 9, 3225465664);
          c2 = gg(c2, d2, a2, b2, w2(x2, i2 + 11), 14, 643717713);
          b2 = gg(b2, c2, d2, a2, w2(x2, i2 + 0), 20, 3921069994);
          a2 = gg(a2, b2, c2, d2, w2(x2, i2 + 5), 5, 3593408605);
          d2 = gg(d2, a2, b2, c2, w2(x2, i2 + 10), 9, 38016083);
          c2 = gg(c2, d2, a2, b2, w2(x2, i2 + 15), 14, 3634488961);
          b2 = gg(b2, c2, d2, a2, w2(x2, i2 + 4), 20, 3889429448);
          a2 = gg(a2, b2, c2, d2, w2(x2, i2 + 9), 5, 568446438);
          d2 = gg(d2, a2, b2, c2, w2(x2, i2 + 14), 9, 3275163606);
          c2 = gg(c2, d2, a2, b2, w2(x2, i2 + 3), 14, 4107603335);
          b2 = gg(b2, c2, d2, a2, w2(x2, i2 + 8), 20, 1163531501);
          a2 = gg(a2, b2, c2, d2, w2(x2, i2 + 13), 5, 2850285829);
          d2 = gg(d2, a2, b2, c2, w2(x2, i2 + 2), 9, 4243563512);
          c2 = gg(c2, d2, a2, b2, w2(x2, i2 + 7), 14, 1735328473);
          b2 = gg(b2, c2, d2, a2, w2(x2, i2 + 12), 20, 2368359562);
          a2 = hh(a2, b2, c2, d2, w2(x2, i2 + 5), 4, 4294588738);
          d2 = hh(d2, a2, b2, c2, w2(x2, i2 + 8), 11, 2272392833);
          c2 = hh(c2, d2, a2, b2, w2(x2, i2 + 11), 16, 1839030562);
          b2 = hh(b2, c2, d2, a2, w2(x2, i2 + 14), 23, 4259657740);
          a2 = hh(a2, b2, c2, d2, w2(x2, i2 + 1), 4, 2763975236);
          d2 = hh(d2, a2, b2, c2, w2(x2, i2 + 4), 11, 1272893353);
          c2 = hh(c2, d2, a2, b2, w2(x2, i2 + 7), 16, 4139469664);
          b2 = hh(b2, c2, d2, a2, w2(x2, i2 + 10), 23, 3200236656);
          a2 = hh(a2, b2, c2, d2, w2(x2, i2 + 13), 4, 681279174);
          d2 = hh(d2, a2, b2, c2, w2(x2, i2 + 0), 11, 3936430074);
          c2 = hh(c2, d2, a2, b2, w2(x2, i2 + 3), 16, 3572445317);
          b2 = hh(b2, c2, d2, a2, w2(x2, i2 + 6), 23, 76029189);
          a2 = hh(a2, b2, c2, d2, w2(x2, i2 + 9), 4, 3654602809);
          d2 = hh(d2, a2, b2, c2, w2(x2, i2 + 12), 11, 3873151461);
          c2 = hh(c2, d2, a2, b2, w2(x2, i2 + 15), 16, 530742520);
          b2 = hh(b2, c2, d2, a2, w2(x2, i2 + 2), 23, 3299628645);
          a2 = ii(a2, b2, c2, d2, w2(x2, i2 + 0), 6, 4096336452);
          d2 = ii(d2, a2, b2, c2, w2(x2, i2 + 7), 10, 1126891415);
          c2 = ii(c2, d2, a2, b2, w2(x2, i2 + 14), 15, 2878612391);
          b2 = ii(b2, c2, d2, a2, w2(x2, i2 + 5), 21, 4237533241);
          a2 = ii(a2, b2, c2, d2, w2(x2, i2 + 12), 6, 1700485571);
          d2 = ii(d2, a2, b2, c2, w2(x2, i2 + 3), 10, 2399980690);
          c2 = ii(c2, d2, a2, b2, w2(x2, i2 + 10), 15, 4293915773);
          b2 = ii(b2, c2, d2, a2, w2(x2, i2 + 1), 21, 2240044497);
          a2 = ii(a2, b2, c2, d2, w2(x2, i2 + 8), 6, 1873313359);
          d2 = ii(d2, a2, b2, c2, w2(x2, i2 + 15), 10, 4264355552);
          c2 = ii(c2, d2, a2, b2, w2(x2, i2 + 6), 15, 2734768916);
          b2 = ii(b2, c2, d2, a2, w2(x2, i2 + 13), 21, 1309151649);
          a2 = ii(a2, b2, c2, d2, w2(x2, i2 + 4), 6, 4149444226);
          d2 = ii(d2, a2, b2, c2, w2(x2, i2 + 11), 10, 3174756917);
          c2 = ii(c2, d2, a2, b2, w2(x2, i2 + 2), 15, 718787259);
          b2 = ii(b2, c2, d2, a2, w2(x2, i2 + 9), 21, 3951481745);
          a2 = addUnsigned(a2, oldA);
          b2 = addUnsigned(b2, oldB);
          c2 = addUnsigned(c2, oldC);
          d2 = addUnsigned(d2, oldD);
        }
        return wordToHex(a2) + wordToHex(b2) + wordToHex(c2) + wordToHex(d2);
      }
      let cachedWbiKeys = null;
      const wbiDiagnostics = { parseFailures: 0, extractMisses: 0 };
      if (typeof window !== "undefined") {
        window.__chatterboxWbiParseFailures = wbiDiagnostics;
      }
      function setCachedWbiKeys(keys) {
        cachedWbiKeys = keys;
      }
      function extractWbiKeys(data) {
        const imgUrl = data.data?.wbi_img?.img_url;
        const subUrl = data.data?.wbi_img?.sub_url;
        const img_key = imgUrl?.split("/").pop()?.split(".")[0] ?? "";
        const sub_key = subUrl?.split("/").pop()?.split(".")[0] ?? "";
        return img_key && sub_key ? { img_key, sub_key } : null;
      }
      (() => {
        const sentinel = "__chatterboxWbiHijackInstalled";
        const proto = XMLHttpRequest.prototype;
        if (proto[sentinel]) return;
        proto[sentinel] = true;
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url, async, username, password) {
          this._url = typeof url === "string" ? url : url.toString();
          return originalOpen.call(this, method, url, async ?? true, username ?? null, password ?? null);
        };
        XMLHttpRequest.prototype.send = function(body) {
          const url = this._url;
          if (url?.includes("/x/web-interface/nav")) {
            this.addEventListener("load", function() {
              let data = null;
              try {
                data = JSON.parse(this.responseText);
              } catch {
                wbiDiagnostics.parseFailures++;
                cachedWbiKeys = null;
                return;
              }
              const keys = data ? extractWbiKeys(data) : null;
              if (keys) {
                setCachedWbiKeys(keys);
              } else {
                wbiDiagnostics.extractMisses++;
              }
            });
          }
          return originalSend.call(this, body);
        };
      })();
      async function waitForWbiKeys(timeout = 5e3, interval = 100) {
        const startTime = Date.now();
        while (!cachedWbiKeys) {
          if (Date.now() - startTime > timeout) {
            return false;
          }
          await new Promise((r2) => setTimeout(r2, interval));
        }
        return true;
      }
      async function ensureWbiKeys() {
        if (cachedWbiKeys) return cachedWbiKeys;
        if (await waitForWbiKeys(1500)) return cachedWbiKeys;
        try {
          const resp = await fetch("https://api.bilibili.com/x/web-interface/nav", {
            method: "GET",
            credentials: "include"
          });
          if (!resp.ok) return null;
          let data = null;
          try {
            data = await resp.json();
          } catch {
            wbiDiagnostics.parseFailures++;
            return null;
          }
          const keys = data ? extractWbiKeys(data) : null;
          if (keys) {
            setCachedWbiKeys(keys);
          } else {
            wbiDiagnostics.extractMisses++;
          }
        } catch {
        }
        return cachedWbiKeys;
      }
      const mixinKeyEncTab = [
        46,
        47,
        18,
        2,
        53,
        8,
        23,
        32,
        15,
        50,
        10,
        31,
        58,
        3,
        45,
        35,
        27,
        43,
        5,
        49,
        33,
        9,
        42,
        19,
        29,
        28,
        14,
        39,
        12,
        38,
        41,
        13,
        37,
        48,
        7,
        16,
        24,
        55,
        40,
        61,
        26,
        17,
        0,
        1,
        60,
        51,
        30,
        4,
        22,
        25,
        54,
        21,
        56,
        59,
        6,
        63,
        57,
        62,
        11,
        36,
        20,
        34,
        44,
        52
      ];
      function getMixinKey(orig) {
        return mixinKeyEncTab.map((n2) => orig[n2]).join("").slice(0, 32);
      }
      function encodeWbi(params, wbiKeys) {
        const mixin_key = getMixinKey(wbiKeys.img_key + wbiKeys.sub_key);
        const currentTime = Math.round(Date.now() / 1e3);
        const charaFilter = /[!'()*]/g;
        const paramsWithWts = { ...params, wts: currentTime };
        const sortedQuery = Object.keys(paramsWithWts).sort().map((key) => {
          const resolvedValue = paramsWithWts[key]?.toString() ?? "";
          const value = resolvedValue.replace(charaFilter, "");
          return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        }).join("&");
        const wbi_sign = md5(sortedQuery + mixin_key);
        const unsortedQuery = Object.keys(params).map((key) => {
          const resolvedValue = params[key]?.toString() ?? "";
          const value = resolvedValue.replace(charaFilter, "");
          return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        }).join("&");
        return `${unsortedQuery}&w_rid=${wbi_sign}&wts=${currentTime}`;
      }
      const DEFAULT_DANMAKU_COLORS = [
        "0xe33fff",
        "0x54eed8",
        "0x58c1de",
        "0x455ff6",
        "0x975ef9",
        "0xc35986",
        "0xff8c21",
        "0x00fffc",
        "0x7eff00",
        "0xffed4f",
        "0xff9800"
      ];
      const SEND_DANMAKU_TIMEOUT_MS = 12e3;
      function getCookie$1(name) {
        const prefix = `${name}=`;
        return document.cookie.split(";").map((c2) => c2.trim()).find((c2) => c2.startsWith(prefix))?.slice(prefix.length);
      }
      function getSpmPrefix$2() {
        const metaTag = document.querySelector('meta[name="spm_prefix"]');
        return metaTag?.getAttribute("content") ?? "444.8";
      }
      function getCsrfToken() {
        return getCookie$1("bili_jct");
      }
      function getDedeUid() {
        return getCookie$1("DedeUserID");
      }
      function getLiveLocalEchoName() {
        const selectors = [
          ".user-panel-ctnr .user-name",
          ".right-ctnr .userinfo-ctnr .uname",
          ".chat-control-panel-vm .user-name",
          '[class*="user-panel"] [class*="user-name"]',
          '[class*="user-info"] [class*="name"]'
        ];
        for (const selector of selectors) {
          const text = document.querySelector(selector)?.textContent?.trim();
          if (text) return text;
        }
        return "我";
      }
      async function getRoomId(url = window.location.href) {
        const shortUid = safeExtractRoomNumber(url);
        if (!shortUid) {
          throw new Error(
            `无法从当前页面 URL 解析直播间号（URL：${url.slice(0, 80)}）。请在 https://live.bilibili.com/<房间号> 这样的直播间页面打开本脚本。如果你已经在直播间页面但仍报错，可能是 B 站 URL 结构变了，欢迎反馈：${ISSUES_URL}`
          );
        }
        let primaryFailReason = "";
        try {
          const room = await fetch(`${BASE_URL.BILIBILI_ROOM_INIT}?id=${shortUid}`, {
            method: "GET",
            credentials: "include"
          });
          if (room.ok) {
            const roomData = await room.json();
            cachedStreamerUid.value = roomData.data.uid;
            return roomData.data.room_id;
          }
          primaryFailReason = `room_init HTTP ${room.status}`;
        } catch (err) {
          primaryFailReason = `room_init 网络错误：${err instanceof Error ? err.message : String(err)}`;
        }
        let fallbackFailReason = "";
        try {
          const room = await fetch(`${BASE_URL.BILIBILI_ROOM_INIT_ALT}?room_id=${shortUid}`, {
            method: "GET",
            credentials: "include"
          });
          if (room.ok) {
            const json = await room.json();
            if (json.code === 0 && json.data?.room_id) {
              if (json.data.uid) cachedStreamerUid.value = json.data.uid;
              return json.data.room_id;
            }
            fallbackFailReason = `get_info code=${json.code ?? "?"}`;
          } else {
            fallbackFailReason = `get_info HTTP ${room.status}`;
          }
        } catch (err) {
          fallbackFailReason = `get_info 网络错误：${err instanceof Error ? err.message : String(err)}`;
        }
        const directId = toNumber(shortUid);
        if (directId !== null && directId > 0) return directId;
        throw new Error(
          `无法获取真实直播间 ID（URL slug：${shortUid}）。两个回退接口都失败了：${primaryFailReason}；${fallbackFailReason}。常见原因：B 站接口暂时风控或离线、网络异常、或 B 站修改了 API。刷新页面通常能解决；持续出现请反馈：${ISSUES_URL}`
        );
      }
      let cachedRoomSlug = null;
      j$1(() => {
        if (cachedRoomId.value === null) cachedRoomSlug = null;
      });
      async function ensureRoomId() {
        const currentSlug = safeExtractRoomNumber(window.location.href);
        if (cachedRoomId.value !== null && cachedRoomSlug === currentSlug) {
          return cachedRoomId.value;
        }
        cachedRoomId.value = null;
        cachedRoomSlug = currentSlug;
        const roomId = await getRoomId();
        cachedRoomId.value = roomId;
        buildReplacementMap();
        return roomId;
      }
      async function fetchEmoticons(roomId) {
        const resp = await fetch(`${BASE_URL.BILIBILI_GET_EMOTICONS}?platform=pc&room_id=${roomId}`, {
          method: "GET",
          credentials: "include"
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        const json = await resp.json();
        if (json?.code === 0 && json.data?.data) {
          cachedEmoticonPackages.value = json.data.data.filter((pkg) => pkg.pkg_id !== 100);
        }
      }
      function safeExtractRoomNumber(url) {
        try {
          return extractRoomNumber(url) ?? null;
        } catch {
          return null;
        }
      }
      async function fetchRoomLiveStatus(roomId) {
        const response = await fetch(`${BASE_URL.BILIBILI_ROOM_INIT}?id=${roomId}`, {
          method: "GET",
          credentials: "include"
        });
        if (!response.ok) return "unknown";
        const json = await response.json();
        if (json.code !== 0) return "unknown";
        if (json.data?.live_status === 1) return "live";
        if (typeof json.data?.live_status === "number") return "offline";
        return "unknown";
      }
      function toNumber(value) {
        let n2;
        if (typeof value === "number") n2 = value;
        else if (typeof value === "string" && /^\d+$/.test(value)) n2 = Number(value);
        else return null;
        if (!Number.isFinite(n2) || !Number.isInteger(n2)) return null;
        if (n2 < 0 || n2 > Number.MAX_SAFE_INTEGER) return null;
        return n2;
      }
      function firstString(...values) {
        for (const value of values) {
          if (typeof value === "string" && value.trim()) return value.trim();
        }
        return "未知";
      }
      function roomIdFromLiveLink(value) {
        if (typeof value !== "string") return null;
        const match = value.match(/live\.bilibili\.com\/(?:blanc\/)?(\d+)/);
        if (!match) return null;
        return toNumber(match[1]);
      }
      function findMedalEntries(data) {
        if (typeof data !== "object" || data === null) return [];
        const root2 = data;
        const candidates = [root2.list, root2.data];
        for (const candidate of candidates) {
          if (Array.isArray(candidate)) return candidate;
          if (typeof candidate === "object" && candidate !== null) {
            const nested = candidate;
            if (Array.isArray(nested.list)) return nested.list;
          }
        }
        return [];
      }
      function medalEntryToRoom(entry) {
        if (typeof entry !== "object" || entry === null) return null;
        const obj = entry;
        const medal = typeof obj.medal_info === "object" && obj.medal_info !== null ? obj.medal_info : {};
        const anchor = typeof obj.anchor_info === "object" && obj.anchor_info !== null ? obj.anchor_info : {};
        const linkedRoomId = roomIdFromLiveLink(obj.link) ?? roomIdFromLiveLink(medal.link) ?? roomIdFromLiveLink(anchor.link);
        const directRoomId = toNumber(medal.roomid) ?? toNumber(medal.room_id) ?? toNumber(obj.roomid) ?? toNumber(obj.room_id);
        const roomId = directRoomId ?? linkedRoomId;
        const anchorUid = toNumber(medal.target_id) ?? toNumber(anchor.uid) ?? toNumber(obj.target_id);
        if (roomId === null || roomId <= 0) return null;
        return {
          roomId,
          medalName: firstString(medal.medal_name, medal.name, obj.medal_name, obj.medal_name, obj.name),
          anchorName: firstString(
            obj.target_name,
            anchor.uname,
            anchor.name,
            medal.anchor_uname,
            obj.anchor_uname,
            obj.uname
          ),
          anchorUid,
          source: directRoomId !== null ? "medal-room-id" : "medal-link"
        };
      }
      function medalEntryToAnchorFallback(entry) {
        if (typeof entry !== "object" || entry === null) return null;
        const obj = entry;
        const medal = typeof obj.medal_info === "object" && obj.medal_info !== null ? obj.medal_info : {};
        const anchor = typeof obj.anchor_info === "object" && obj.anchor_info !== null ? obj.anchor_info : {};
        const anchorUid = toNumber(medal.target_id) ?? toNumber(anchor.uid) ?? toNumber(obj.target_id);
        if (anchorUid === null || anchorUid <= 0) return null;
        return {
          medalName: firstString(medal.medal_name, medal.name, obj.medal_name, obj.name),
          anchorName: firstString(
            obj.target_name,
            anchor.uname,
            anchor.name,
            medal.anchor_uname,
            obj.anchor_uname,
            obj.uname
          ),
          anchorUid
        };
      }
      const ANCHOR_LOOKUP_TIMEOUT_MS = 8e3;
      const ANCHOR_LOOKUP_CONCURRENCY = 6;
      async function fetchRoomByAnchorUid(anchor) {
        const controller = new AbortController();
        const timer2 = setTimeout(() => controller.abort(), ANCHOR_LOOKUP_TIMEOUT_MS);
        try {
          const resp = await fetch(`${BASE_URL.BILIBILI_ROOM_INFO_BY_UID}?mid=${anchor.anchorUid}`, {
            method: "GET",
            credentials: "include",
            signal: controller.signal
          });
          if (!resp.ok) return null;
          const json = await resp.json();
          if (json.code !== 0) return null;
          const roomId = toNumber(json.data?.roomid) ?? roomIdFromLiveLink(json.data?.link);
          if (roomId === null || roomId <= 0) return null;
          return { ...anchor, roomId, source: "anchor-uid" };
        } catch {
          return null;
        } finally {
          clearTimeout(timer2);
        }
      }
      function followEntryToAnchor(entry) {
        if (typeof entry !== "object" || entry === null) return null;
        const obj = entry;
        const anchorUid = toNumber(obj.mid) ?? toNumber(obj.uid);
        if (anchorUid === null || anchorUid <= 0) return null;
        return {
          anchorUid,
          anchorName: firstString(obj.uname, obj.name, obj.nickname)
        };
      }
      async function fetchFollowingPage(uid, page) {
        const query = new URLSearchParams({
          vmid: uid,
          pn: String(page),
          ps: "50",
          order: "desc",
          order_type: "attention"
        });
        const resp = await fetch(`${BASE_URL.BILIBILI_FOLLOWINGS}?${query.toString()}`, {
          method: "GET",
          credentials: "include"
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        const json = await resp.json();
        if (json.code !== 0) throw new Error(json.message ?? json.msg ?? `code ${json.code}`);
        return (json.data?.list ?? []).map(followEntryToAnchor).filter((entry) => entry !== null);
      }
      async function fetchMedalRooms() {
        const uid = getDedeUid();
        if (!uid) throw new Error("未找到登录 UID，请先登录 Bilibili");
        const resp = await fetch(`${BASE_URL.BILIBILI_MEDAL_WALL}?target_id=${encodeURIComponent(uid)}`, {
          method: "GET",
          credentials: "include"
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        const json = await resp.json();
        if (json.code !== 0) throw new Error(json.message ?? json.msg ?? `code ${json.code}`);
        const entries = findMedalEntries(json.data);
        const rooms = entries.map(medalEntryToRoom).filter((room) => room !== null);
        const unresolvedAnchors = entries.filter((entry) => medalEntryToRoom(entry) === null).map(medalEntryToAnchorFallback).filter((anchor) => anchor !== null);
        const resolved = await mapWithConcurrency(unresolvedAnchors, ANCHOR_LOOKUP_CONCURRENCY, fetchRoomByAnchorUid);
        for (const room of resolved) {
          if (room) rooms.push(room);
        }
        const deduped = new Map();
        for (const room of rooms) deduped.set(room.roomId, room);
        return [...deduped.values()];
      }
      async function fetchFollowingRooms(maxPages = 4) {
        const uid = getDedeUid();
        if (!uid) throw new Error("未找到登录 UID，请先登录 Bilibili");
        const anchors = [];
        for (let page = 1; page <= maxPages; page += 1) {
          const items = await fetchFollowingPage(uid, page);
          anchors.push(...items);
          if (items.length < 50) break;
        }
        const rooms = new Map();
        const resolved = await mapWithConcurrency(
          anchors,
          ANCHOR_LOOKUP_CONCURRENCY,
          (anchor) => fetchRoomByAnchorUid({
            medalName: "",
            anchorName: anchor.anchorName,
            anchorUid: anchor.anchorUid
          }).then((room) => room ? { room, anchor } : null)
        );
        for (const entry of resolved) {
          if (!entry) continue;
          const { room, anchor } = entry;
          rooms.set(room.roomId, {
            roomId: room.roomId,
            anchorName: room.anchorName,
            anchorUid: room.anchorUid ?? anchor.anchorUid
          });
        }
        return [...rooms.values()];
      }
      async function fetchRoomUserInfoSignals(roomId) {
        const resp = await fetch(`${BASE_URL.BILIBILI_ROOM_USER_INFO}?room_id=${roomId}&from=0`, {
          method: "GET",
          credentials: "include"
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        const json = await resp.json();
        if (json.code !== 0) {
          return [
            {
              kind: "unknown",
              message: json.message ?? json.msg ?? `code ${json.code}`,
              duration: describeRestrictionDuration(json.message ?? json.msg, json.data),
              source: "getInfoByUser"
            }
          ];
        }
        return scanRestrictionSignals(json.data, "getInfoByUser");
      }
      async function fetchSilentListSignals(roomId) {
        const uid = getDedeUid();
        if (!uid) return [];
        const url = `${BASE_URL.BILIBILI_SILENT_USER_LIST}?room_id=${roomId}&ps=50&pn=1`;
        const resp = await fetch(url, { method: "GET", credentials: "include" });
        if (!resp.ok) return [];
        const json = await resp.json();
        if (json.code !== 0) return [];
        const text = JSON.stringify(json.data);
        if (!text.includes(uid)) return [];
        return [
          {
            kind: "muted",
            message: "当前账号出现在房间禁言列表中",
            duration: describeRestrictionDuration(void 0, json.data),
            source: "GetSilentUserList"
          }
        ];
      }
      async function checkSelfRoomRestrictions(roomId) {
        const [roomInfoResult, silentListResult] = await Promise.allSettled([
          fetchRoomUserInfoSignals(roomId),
          fetchSilentListSignals(roomId)
        ]);
        const signals = [];
        if (roomInfoResult.status === "fulfilled") signals.push(...roomInfoResult.value);
        if (silentListResult.status === "fulfilled") signals.push(...silentListResult.value);
        return signals.filter((s2) => s2.kind !== "unknown" && s2.kind !== "deactivated");
      }
      async function checkMedalRoomRestriction(room) {
        const checkedAt = Date.now();
        try {
          const [roomInfoSignals, silentListSignals] = await Promise.all([
            fetchRoomUserInfoSignals(room.roomId),
            fetchSilentListSignals(room.roomId)
          ]);
          const allSignals = [...roomInfoSignals, ...silentListSignals];
          const deactivatedSignals = allSignals.filter((signal) => signal.kind === "deactivated");
          const signals = allSignals.filter((signal) => signal.kind !== "unknown" && signal.kind !== "deactivated");
          return {
            room,
            status: signals.length > 0 ? "restricted" : deactivatedSignals.length > 0 ? "deactivated" : "ok",
            signals,
            checkedAt,
            note: signals.length > 0 ? void 0 : deactivatedSignals.length > 0 ? "主播账号已注销，跳过禁言判断" : "接口未发现禁言/封禁信号"
          };
        } catch (err) {
          return {
            room,
            status: "unknown",
            signals: [],
            checkedAt,
            note: err instanceof Error ? err.message : String(err)
          };
        }
      }
      async function sendDanmaku(message, roomId, csrfToken) {
        const emoticon = isEmoticonUnique(message);
        const startedAt = Date.now();
        if (isLockedEmoticon(message)) {
          const reqText = findEmoticon(message)?.unlock_show_text?.trim();
          return {
            success: false,
            message,
            isEmoticon: true,
            startedAt,
            error: reqText ? `表情权限不足，需要 ${reqText}` : "表情权限不足"
          };
        }
        const form = new FormData();
        form.append("bubble", "2");
        form.append("msg", message);
        form.append("color", "16777215");
        form.append("mode", "1");
        form.append("room_type", "0");
        form.append("jumpfrom", "0");
        form.append("reply_mid", "0");
        form.append("reply_attr", "0");
        form.append("replay_dmid", "");
        form.append("statistics", '{"appId":100,"platform":5}');
        form.append("fontsize", "25");
        form.append("rnd", String(Math.floor(Date.now() / 1e3)));
        form.append("roomid", String(roomId));
        form.append("csrf", csrfToken);
        form.append("csrf_token", csrfToken);
        if (emoticon) {
          form.append("dm_type", "1");
          form.append("emoticon_options", "{}");
        }
        try {
          let query = "";
          if (cachedWbiKeys) {
            query = encodeWbi(
              {
                web_location: getSpmPrefix$2()
              },
              cachedWbiKeys
            );
          }
          const url = `${BASE_URL.BILIBILI_MSG_SEND}?${query ? `${query}&` : ""}${CHATTERBOX_SEND_MARKER}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), SEND_DANMAKU_TIMEOUT_MS);
          let resp;
          try {
            resp = await fetch(url, {
              method: "POST",
              credentials: "include",
              body: form,
              signal: controller.signal
            });
          } finally {
            clearTimeout(timeout);
          }
          if (!resp.ok) {
            return {
              success: false,
              message,
              isEmoticon: emoticon,
              startedAt,
              error: `HTTP ${resp.status}`
            };
          }
          const json = await resp.json();
          if (json.code !== 0) {
            return {
              success: false,
              message,
              isEmoticon: emoticon,
              startedAt,
              error: json.message ?? json.msg ?? `code ${json.code}`,
              errorCode: json.code,
              errorData: json.data
            };
          }
          emitLocalDanmakuEcho(message, getDedeUid() ?? null, { uname: getLiveLocalEchoName() });
          return {
            success: true,
            message,
            isEmoticon: emoticon,
            startedAt
          };
        } catch (err) {
          const aborted = err instanceof DOMException && err.name === "AbortError";
          return {
            success: false,
            message,
            isEmoticon: emoticon,
            startedAt,
            error: aborted ? `发送接口 ${Math.round(SEND_DANMAKU_TIMEOUT_MS / 1e3)}s 无响应` : err instanceof Error ? err.message : String(err)
          };
        }
      }
      async function setDanmakuMode(roomId, csrfToken, mode) {
        const form = new FormData();
        form.append("room_id", String(roomId));
        form.append("mode", mode);
        form.append("csrf_token", csrfToken);
        form.append("csrf", csrfToken);
        form.append("visit_id", "");
        try {
          await fetch(BASE_URL.BILIBILI_MSG_CONFIG, { method: "POST", credentials: "include", body: form });
        } catch {
        }
      }
      async function setRandomDanmakuColor(roomId, csrfToken) {
        const colorSet = availableDanmakuColors.value ?? DEFAULT_DANMAKU_COLORS;
        const color = colorSet[Math.floor(Math.random() * colorSet.length)] ?? "0xffffff";
        const form = new FormData();
        form.append("room_id", String(roomId));
        form.append("color", color);
        form.append("csrf_token", csrfToken);
        form.append("csrf", csrfToken);
        form.append("visit_id", "");
        try {
          await fetch(BASE_URL.BILIBILI_MSG_CONFIG, { method: "POST", credentials: "include", body: form });
        } catch {
        }
      }
      const SendPriority = {
        AUTO: 0,
        STT: 1,
        MANUAL: 2
      };
      const HARD_MIN_GAP_MS = 1010;
      const queue = [];
      let processing = false;
      let lastSendCompletedAt = 0;
      let inflight = null;
      function cancelAutoItem(item, error) {
        if (item.cancelled || item.priority !== SendPriority.AUTO) return;
        item.cancelled = true;
        item.resolve({ success: false, cancelled: true, message: item.message, isEmoticon: false, error });
      }
      function insertByPriority(item) {
        let i2 = queue.length;
        while (i2 > 0 && queue[i2 - 1].priority < item.priority) i2--;
        queue.splice(i2, 0, item);
      }
      async function processQueue() {
        if (processing) return;
        processing = true;
        try {
          while (queue.length > 0) {
            while (queue.length > 0 && queue[0].cancelled) queue.shift();
            const item = queue.shift();
            if (!item) break;
            inflight = item;
            if (lastSendCompletedAt > 0) {
              const sinceLast = Date.now() - lastSendCompletedAt;
              if (sinceLast < HARD_MIN_GAP_MS) {
                await new Promise((r2) => setTimeout(r2, HARD_MIN_GAP_MS - sinceLast));
              }
            }
            if (item.cancelled) {
              inflight = null;
              continue;
            }
            inflight = null;
            try {
              const result = await sendDanmaku(item.message, item.roomId, item.csrfToken);
              lastSendCompletedAt = Date.now();
              item.resolve(result);
            } catch (err) {
              lastSendCompletedAt = Date.now();
              item.reject(err);
            }
          }
        } finally {
          processing = false;
        }
      }
      function enqueueDanmaku(message, roomId, csrfToken, priority = SendPriority.AUTO) {
        return new Promise((resolve, reject) => {
          if (message.trim().length === 0) {
            resolve({ success: false, cancelled: true, message, isEmoticon: false, error: "empty-text" });
            return;
          }
          const item = { message, roomId, csrfToken, priority, resolve, reject, cancelled: false };
          insertByPriority(item);
          if (priority === SendPriority.MANUAL) {
            if (inflight !== null) cancelAutoItem(inflight, "preempted");
            for (const q2 of queue) {
              if (q2 !== item) cancelAutoItem(q2, "preempted");
            }
          }
          void processQueue();
        });
      }
      function cancelPendingAuto() {
        if (inflight !== null) cancelAutoItem(inflight, "loop-stopped");
        for (const q2 of queue) cancelAutoItem(q2, "loop-stopped");
      }
      const SENSITIVE_WORD_MAX_LEN = 200;
      const SENSITIVE_WORDS_MAX_COUNT = 64;
      function sanitizeDetectionResult(raw) {
        if (typeof raw !== "object" || raw === null) return { hasSensitiveContent: false };
        const r2 = raw;
        const out = {};
        if (typeof r2.hasSensitiveContent === "boolean") out.hasSensitiveContent = r2.hasSensitiveContent;
        if (typeof r2.severity === "string") out.severity = r2.severity.slice(0, 64);
        if (Array.isArray(r2.sensitiveWords)) {
          const cleaned = [];
          for (const w2 of r2.sensitiveWords) {
            if (cleaned.length >= SENSITIVE_WORDS_MAX_COUNT) break;
            if (typeof w2 !== "string") continue;
            if (w2.length === 0 || w2.length > SENSITIVE_WORD_MAX_LEN) continue;
            cleaned.push(w2);
          }
          out.sensitiveWords = cleaned;
        }
        if (Array.isArray(r2.categories)) {
          out.categories = r2.categories.filter((c2) => typeof c2 === "string").slice(0, 32);
        }
        return out;
      }
      const CIRCUIT_FAIL_THRESHOLD = 3;
      const CIRCUIT_OPEN_DURATION_MS = 6e4;
      let consecutiveFailures = 0;
      let circuitOpenedAt = null;
      const aiEvasionDegraded = y$1(false);
      function isCircuitOpen(now) {
        if (circuitOpenedAt === null) return false;
        return now - circuitOpenedAt < CIRCUIT_OPEN_DURATION_MS;
      }
      function onAuditSuccess() {
        if (consecutiveFailures > 0 || circuitOpenedAt !== null) {
          appendLog("✅ AI 检测服务已恢复");
        }
        consecutiveFailures = 0;
        circuitOpenedAt = null;
        aiEvasionDegraded.value = false;
      }
      function onAuditFailure(reason) {
        consecutiveFailures++;
        if (consecutiveFailures >= CIRCUIT_FAIL_THRESHOLD && circuitOpenedAt === null) {
          circuitOpenedAt = Date.now();
          aiEvasionDegraded.value = true;
          appendLog(
            `⚠️ AI 检测服务连续 ${CIRCUIT_FAIL_THRESHOLD} 次失败,暂停 ${CIRCUIT_OPEN_DURATION_MS / 1e3}s 后重试(${reason})`
          );
        } else {
          appendLog(`⚠️ AI 检测服务出错:${reason}`);
        }
      }
      async function detectSensitiveWords(text) {
        if (isCircuitOpen(Date.now())) {
          return { hasSensitiveContent: false };
        }
        try {
          const resp = await fetch(BASE_URL.LAPLACE_CHAT_AUDIT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              completionMetadata: { input: text }
            })
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = await resp.json();
          const completion = data?.completion;
          onAuditSuccess();
          return sanitizeDetectionResult(completion);
        } catch (err) {
          onAuditFailure(err instanceof Error ? err.message : String(err));
          return { hasSensitiveContent: false };
        }
      }
      function insertInvisibleChars(word) {
        const graphemes = getGraphemes(word);
        return graphemes.join("­");
      }
      function processText(text) {
        return insertInvisibleChars(text);
      }
      function replaceSensitiveWords(text, sensitiveWords) {
        let result = text;
        for (const word of sensitiveWords) {
          if (!word) continue;
          result = result.split(word).join(processText(word));
        }
        return result;
      }
      function isEvadedMessageSendable(evadedMessage) {
        return evadedMessage.trim().length > 0;
      }
      async function requestAiSuggestion(text) {
        if (!aiEvasion.value) return null;
        const trimmed = text.trim();
        if (!trimmed) return null;
        const detection = await detectSensitiveWords(trimmed);
        if (!detection.hasSensitiveContent || !detection.sensitiveWords?.length) return null;
        const evadedMessage = replaceSensitiveWords(trimmed, detection.sensitiveWords);
        if (!isEvadedMessageSendable(evadedMessage)) return null;
        if (evadedMessage === trimmed) return null;
        return { evadedMessage, sensitiveWords: detection.sensitiveWords };
      }
      async function tryAiEvasion(message, roomId, csrfToken, logPrefix) {
        if (!aiEvasion.value) return { success: false };
        appendLog(`🤖 ${logPrefix}AI规避：正在检测敏感词…`);
        const detection = await detectSensitiveWords(message);
        if (detection.hasSensitiveContent && detection.sensitiveWords && detection.sensitiveWords.length > 0) {
          appendLog(`🤖 ${logPrefix}检测到敏感词：${detection.sensitiveWords.join(", ")}，正在尝试规避…`);
          const evadedMessage = replaceSensitiveWords(message, detection.sensitiveWords);
          if (!isEvadedMessageSendable(evadedMessage)) {
            const error = "AI规避后内容为空";
            appendLog(`❌ ${logPrefix}AI规避失败：替换后内容为空，已跳过发送`);
            return { success: false, evadedMessage, error };
          }
          if (isLockedEmoticon(evadedMessage)) {
            const error = "AI规避结果是锁定表情";
            appendLog(formatLockedEmoticonReject(evadedMessage, `${logPrefix}AI规避表情`));
            return { success: false, evadedMessage, error };
          }
          const retryResult = await enqueueDanmaku(evadedMessage, roomId, csrfToken, SendPriority.MANUAL);
          if (retryResult.success) {
            appendLog(`✅ ${logPrefix}AI规避成功: ${evadedMessage}`);
            return { success: true, evadedMessage, sensitiveWords: detection.sensitiveWords };
          }
          appendLog(`❌ ${logPrefix}AI规避失败: ${evadedMessage}，原因：${retryResult.error}`);
          return { success: false, evadedMessage, error: retryResult.error, sensitiveWords: detection.sensitiveWords };
        }
        appendLog(`⚠️ ${logPrefix}无法检测到敏感词，请手动检查`);
        return { success: false };
      }
      const subscriptions = new Set();
      let observer = null;
      let pollTimer = null;
      let healthTimer = null;
      let attached = null;
      let flushTimer$1 = null;
      const pendingNodes = new Set();
      const OBSERVER_DEBOUNCE_MS = 16;
      const USER_SELECTORS = [
        "[data-uname]",
        "[data-uid]",
        ".user-name",
        ".username",
        ".danmaku-item-user",
        ".chat-user-name",
        '[class*="user-name"]',
        '[class*="username"]'
      ];
      const BADGE_SELECTORS = [
        ".fans-medal-item",
        ".fans-medal",
        ".medal-item",
        ".medal-name",
        ".chat-medal",
        ".user-level-icon",
        ".wealth-medal",
        ".guard-icon",
        '[class*="fans-medal"]',
        '[class*="medal"]',
        '[class*="level"]',
        '[class*="guard"]'
      ];
      function isValidDanmakuNode(node) {
        if (!node.classList.contains("chat-item") || !node.classList.contains("danmaku-item")) return false;
        const count = node.classList.length;
        if (count === 2) return true;
        if (node.classList.contains("chat-colorful-bubble") && node.classList.contains("has-bubble") && count === 4)
          return true;
        if (node.classList.contains("has-bubble") && count === 3) return true;
        return false;
      }
      function cleanInlineText(value) {
        return (value ?? "").replace(/\s+/g, " ").trim();
      }
      function isBadNameCandidate(value, text = "") {
        if (!value || value === text || value.length > 36) return true;
        if (/通过活动|查看我的装扮|获得|装扮|荣耀|粉丝牌|用户等级|头像|复制|举报|回复|关闭/.test(value)) return true;
        if (/^[\d\s:：/.-]+$/.test(value)) return true;
        return false;
      }
      function firstUsefulText(el) {
        if (!el) return null;
        const value = el.getAttribute("data-uname") || cleanInlineText(el.textContent);
        return value ? value : null;
      }
      function extractUid(node, userEl) {
        const direct = node.getAttribute("data-uid") || userEl?.getAttribute("data-uid");
        if (direct) return direct;
        const link = node.querySelector('a[href*="space.bilibili.com"], a[href*="uid="]');
        const href = link?.href ?? "";
        return href.match(/space\.bilibili\.com\/(\d+)/)?.[1] ?? href.match(/[?&]uid=(\d+)/)?.[1] ?? null;
      }
      function extractUname(node, userEl, text) {
        const direct = firstUsefulText(userEl);
        if (direct && !isBadNameCandidate(direct, text)) return direct;
        for (const selector of USER_SELECTORS) {
          const value = firstUsefulText(node.querySelector(selector));
          if (value && !isBadNameCandidate(value, text)) return value;
        }
        return null;
      }
      function extractBadges(node, text) {
        const badges = [];
        for (const el of node.querySelectorAll(BADGE_SELECTORS.join(","))) {
          const value = cleanInlineText(
            el.getAttribute("data-title") || el.getAttribute("title") || el.getAttribute("aria-label") || el.textContent
          );
          if (!value || value === text || value.length > 18) continue;
          if (/^(头像|复制|回复|举报|关闭)$/.test(value)) continue;
          if (!badges.includes(value)) badges.push(value);
          if (badges.length >= 5) break;
        }
        return badges;
      }
      function extractAvatar(node) {
        for (const img of node.querySelectorAll("img")) {
          const src = img.currentSrc || img.src || img.getAttribute("data-src") || img.getAttribute("src");
          if (!src) continue;
          const label = `${img.className} ${img.alt}`.toLowerCase();
          if (label.includes("avatar") || label.includes("face") || label.includes("head") || label.includes("头像"))
            return src;
        }
        return void 0;
      }
      function extractDanmakuInfo(node) {
        const text = node.dataset.danmaku;
        const replymid = node.dataset.replymid;
        if (text === void 0 || replymid === void 0) return null;
        const userEl = node.querySelector(USER_SELECTORS.join(","));
        const uid = extractUid(node, userEl);
        return {
          node,
          text,
          uname: extractUname(node, userEl, text),
          uid,
          badges: extractBadges(node, text),
          avatarUrl: extractAvatar(node),
          isReply: replymid !== "0"
        };
      }
      function notifyAttach(container, sub) {
        if (sub.onAttach) {
          try {
            sub.onAttach(container);
          } catch {
          }
        }
        if (sub.emitExisting && sub.onMessage) {
          const onMessage = sub.onMessage;
          for (const node of container.querySelectorAll(".chat-item.danmaku-item")) {
            if (!isValidDanmakuNode(node)) continue;
            const ev = extractDanmakuInfo(node);
            if (!ev) continue;
            try {
              onMessage(ev);
            } catch {
            }
          }
        }
      }
      function startPollTimer() {
        if (pollTimer) return;
        pollTimer = setInterval(() => {
          if (tryAttach() && pollTimer !== null) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
        }, 1e3);
      }
      function tryAttach() {
        const container = document.querySelector(".chat-items");
        if (!container) return false;
        attached = container;
        for (const sub of subscriptions) notifyAttach(container, sub);
        const flushPendingNodes = () => {
          flushTimer$1 = null;
          for (const node of pendingNodes) {
            pendingNodes.delete(node);
            if (!node.isConnected || !isValidDanmakuNode(node)) continue;
            const ev = extractDanmakuInfo(node);
            if (!ev) continue;
            for (const sub of subscriptions) {
              if (!sub.onMessage) continue;
              try {
                sub.onMessage(ev);
              } catch {
              }
            }
          }
        };
        const scheduleFlush = () => {
          if (flushTimer$1) return;
          flushTimer$1 = setTimeout(flushPendingNodes, OBSERVER_DEBOUNCE_MS);
        };
        observer = new MutationObserver((mutations) => {
          for (const m2 of mutations) {
            for (let i2 = 0; i2 < m2.addedNodes.length; i2++) {
              const node = m2.addedNodes[i2];
              if (!(node instanceof HTMLElement)) continue;
              if (!isValidDanmakuNode(node)) continue;
              pendingNodes.add(node);
            }
          }
          if (pendingNodes.size > 0) scheduleFlush();
        });
        observer.observe(container, { childList: true, subtree: false });
        return true;
      }
      function ensureAttached() {
        if (attached && !attached.isConnected) {
          observer?.disconnect();
          observer = null;
          attached = null;
        }
        if (attached || pollTimer) return;
        if (tryAttach()) return;
        startPollTimer();
      }
      function maybeDetach() {
        if (subscriptions.size > 0) return;
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        if (healthTimer) {
          clearInterval(healthTimer);
          healthTimer = null;
        }
        if (flushTimer$1) {
          clearTimeout(flushTimer$1);
          flushTimer$1 = null;
        }
        pendingNodes.clear();
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        attached = null;
      }
      function subscribeDanmaku(sub) {
        subscriptions.add(sub);
        if (attached) {
          notifyAttach(attached, sub);
        } else {
          ensureAttached();
        }
        if (!healthTimer) {
          healthTimer = setInterval(() => {
            if (attached && !attached.isConnected) {
              observer?.disconnect();
              observer = null;
              attached = null;
              if (!tryAttach()) startPollTimer();
            }
          }, 2e3);
        }
        return () => {
          subscriptions.delete(sub);
          maybeDetach();
        };
      }
      var LaplaceRawEvent = class extends Event {
        data;
        constructor(type, data) {
          super(type);
          this.data = data;
        }
      };
      var LaplaceEventTarget = class extends EventTarget {
        dispatchEvent(event) {
          const result = super.dispatchEvent(event);
          super.dispatchEvent(new LaplaceRawEvent("event", event));
          return result;
        }
      };
      const textEncoder = new TextEncoder();
      const textDecoder = new TextDecoder();
      function concatUint8Arrays(arrs) {
        let totalLength = 0;
        for (const arr of arrs) totalLength += arr.length;
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of arrs) {
          result.set(arr, offset);
          offset += arr.length;
        }
        return result;
      }
      const cutBuffer = (buffer) => {
        const bufferPacks = [];
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        let size;
        for (let i2 = 0; i2 < buffer.length; i2 += size) {
          size = view.getInt32(i2);
          bufferPacks.push(buffer.slice(i2, i2 + size));
        }
        return bufferPacks;
      };
      const makeDecoder = ({ inflateAsync: inflateAsync2, brotliDecompressAsync: brotliDecompressAsync2 }) => {
        const decoder = async (buffer) => {
          return (await Promise.all(cutBuffer(buffer).map(async (buf) => {
            const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
            const body = buf.slice(16);
            const protocol = view.getInt16(6);
            const operation = view.getInt32(8);
            let type = "unknow";
            if (operation === 3) type = "heartbeat";
            else if (operation === 5) type = "message";
            else if (operation === 8) type = "welcome";
            let data;
            if (protocol === 0) data = JSON.parse(textDecoder.decode(body));
            if (protocol === 1 && body.length === 4) data = new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(0);
            if (protocol === 2) data = await decoder(await inflateAsync2(body));
            if (protocol === 3) data = await decoder(await brotliDecompressAsync2(body));
            return {
              buf,
              type,
              protocol,
              data
            };
          }))).flatMap((pack) => {
            if (pack.protocol === 2 || pack.protocol === 3) return pack.data;
            return pack;
          });
        };
        return decoder;
      };
      const encoder = (type, body = "") => {
        const encoded = typeof body === "string" ? body : JSON.stringify(body);
        const head = new Uint8Array(16);
        const headView = new DataView(head.buffer, head.byteOffset, head.byteLength);
        const buffer = textEncoder.encode(encoded);
        headView.setInt32(0, buffer.length + head.length);
        headView.setInt16(4, 16);
        headView.setInt16(6, 1);
        if (type === "heartbeat") headView.setInt32(8, 2);
        if (type === "join") headView.setInt32(8, 7);
        headView.setInt32(12, 1);
        return concatUint8Arrays([head, buffer]);
      };
      var Live = class extends LaplaceEventTarget {
roomid;
online;
live;
closed;
timeout;
send;
close;
        constructor(inflates2, roomid, { send, close, protover = 3, key, authBody, uid = 0, buvid }) {
          if (typeof roomid !== "number" || Number.isNaN(roomid)) throw new Error(`roomid ${roomid} must be Number not NaN`);
          super();
          this.roomid = roomid;
          this.online = 0;
          this.live = false;
          this.closed = false;
          this.timeout = setTimeout(() => {
          }, 0);
          this.send = send;
          this.close = () => {
            if (this.closed) return;
            this.closed = true;
            close();
            this.dispatchEvent(new Event("close"));
          };
          const decode = makeDecoder(inflates2);
          this.addEventListener("message", async (e2) => {
            const buffer = e2.data;
            (await decode(buffer)).forEach(({ type, data }) => {
              if (type === "welcome") {
                this.live = true;
                this.dispatchEvent(new Event("live"));
                this.send(encoder("heartbeat"));
              }
              if (type === "heartbeat") {
                this.online = data;
                clearTimeout(this.timeout);
                this.timeout = setTimeout(() => this.heartbeat(), 1e3 * 30);
                this.dispatchEvent(new LaplaceRawEvent("heartbeat", this.online));
              }
              if (type === "message") {
                this.dispatchEvent(new LaplaceRawEvent("msg", data));
                const cmd = data.cmd || data.msg?.cmd;
                if (cmd) this.dispatchEvent(new LaplaceRawEvent(cmd, data));
              }
            });
          });
          this.addEventListener("open", () => {
            if (authBody) this.send(authBody instanceof Uint8Array ? authBody : encoder("join", authBody));
            else {
              const hi = {
                uid,
                roomid,
                protover,
                platform: "web",
                type: 2
              };
              if (key) hi.key = key;
              if (buvid) hi.buvid = buvid;
              const buf = encoder("join", hi);
              this.send(buf);
            }
          });
          this.addEventListener("close", () => {
            clearTimeout(this.timeout);
          });
          this.addEventListener("_error", () => {
            this.close();
            this.dispatchEvent(new Event("error"));
          });
        }
heartbeat() {
          this.send(encoder("heartbeat"));
        }
getOnline() {
          this.heartbeat();
          return new Promise((resolve) => this.addEventListener("heartbeat", (e2) => resolve(e2.data), { once: true }));
        }
      };
      var LiveWSBase = class extends Live {
ws;
        constructor(inflates2, roomid, { address = "wss://broadcastlv.chat.bilibili.com/sub", createWebSocket, ...options } = {}) {
          const ws = createWebSocket ? createWebSocket(address) : new WebSocket(address);
          const send = (data) => {
            if (ws.readyState === 1) ws.send(data);
          };
          const close = () => this.ws.close();
          super(inflates2, roomid, {
            send,
            close,
            ...options
          });
          ws.binaryType = "arraybuffer";
          ws.addEventListener("open", (e2) => this.dispatchEvent(new Event(e2.type)));
          ws.addEventListener("message", (e2) => this.dispatchEvent(new LaplaceRawEvent("message", new Uint8Array(e2.data))));
          ws.addEventListener("close", (e2) => {
            if (!this.closed) this.dispatchEvent(new Event(e2.type));
          });
          ws.addEventListener("error", () => this.dispatchEvent(new Event("_error")));
          this.ws = ws;
        }
      };
      let makeBrotliDecode = () => {
        function InputStream(bytes) {
          this.data = bytes;
          this.offset = 0;
        }
        let MAX_HUFFMAN_TABLE_SIZE = Int32Array.from([
          256,
          402,
          436,
          468,
          500,
          534,
          566,
          598,
          630,
          662,
          694,
          726,
          758,
          790,
          822,
          854,
          886,
          920,
          952,
          984,
          1016,
          1048,
          1080
        ]);
        let CODE_LENGTH_CODE_ORDER = Int32Array.from([
          1,
          2,
          3,
          4,
          0,
          5,
          17,
          6,
          16,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15
        ]);
        let DISTANCE_SHORT_CODE_INDEX_OFFSET = Int32Array.from([
          0,
          3,
          2,
          1,
          0,
          0,
          0,
          0,
          0,
          0,
          3,
          3,
          3,
          3,
          3,
          3
        ]);
        let DISTANCE_SHORT_CODE_VALUE_OFFSET = Int32Array.from([
          0,
          0,
          0,
          0,
          -1,
          1,
          -2,
          2,
          -3,
          3,
          -1,
          1,
          -2,
          2,
          -3,
          3
        ]);
        let FIXED_TABLE = Int32Array.from([
          131072,
          131076,
          131075,
          196610,
          131072,
          131076,
          131075,
          262145,
          131072,
          131076,
          131075,
          196610,
          131072,
          131076,
          131075,
          262149
        ]);
        let BLOCK_LENGTH_OFFSET = Int32Array.from([
          1,
          5,
          9,
          13,
          17,
          25,
          33,
          41,
          49,
          65,
          81,
          97,
          113,
          145,
          177,
          209,
          241,
          305,
          369,
          497,
          753,
          1265,
          2289,
          4337,
          8433,
          16625
        ]);
        let BLOCK_LENGTH_N_BITS = Int32Array.from([
          2,
          2,
          2,
          2,
          3,
          3,
          3,
          3,
          4,
          4,
          4,
          4,
          5,
          5,
          5,
          5,
          6,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          24
        ]);
        let INSERT_LENGTH_N_BITS = Int16Array.from([
          0,
          0,
          0,
          0,
          0,
          0,
          1,
          1,
          2,
          2,
          3,
          3,
          4,
          4,
          5,
          5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          24
        ]);
        let COPY_LENGTH_N_BITS = Int16Array.from([
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          1,
          1,
          2,
          2,
          3,
          3,
          4,
          4,
          5,
          5,
          6,
          7,
          8,
          9,
          10,
          24
        ]);
        let CMD_LOOKUP = new Int16Array(2816);
        unpackCommandLookupTable(CMD_LOOKUP);
        function log2floor(i2) {
          let result = -1;
          let step = 16;
          while (step > 0) {
            if (i2 >>> step != 0) {
              result += step;
              i2 = i2 >>> step;
            }
            step = step >> 1;
          }
          return result + i2;
        }
        function calculateDistanceAlphabetSize(npostfix, ndirect, maxndistbits) {
          return 16 + ndirect + 2 * (maxndistbits << npostfix);
        }
        function calculateDistanceAlphabetLimit(maxDistance, npostfix, ndirect) {
          if (maxDistance < ndirect + (2 << npostfix)) throw "maxDistance is too small";
          let offset = (maxDistance - ndirect >> npostfix) + 4;
          let ndistbits = log2floor(offset) - 1;
          return ((ndistbits - 1 << 1 | offset >> ndistbits & 1) - 1 << npostfix) + (1 << npostfix) + ndirect + 16;
        }
        function unpackCommandLookupTable(cmdLookup) {
          let insertLengthOffsets = new Int16Array(24);
          let copyLengthOffsets = new Int16Array(24);
          copyLengthOffsets[0] = 2;
          for (let i2 = 0; i2 < 23; ++i2) {
            insertLengthOffsets[i2 + 1] = insertLengthOffsets[i2] + (1 << INSERT_LENGTH_N_BITS[i2]);
            copyLengthOffsets[i2 + 1] = copyLengthOffsets[i2] + (1 << COPY_LENGTH_N_BITS[i2]);
          }
          for (let cmdCode = 0; cmdCode < 704; ++cmdCode) {
            let rangeIdx = cmdCode >>> 6;
            let distanceContextOffset = -4;
            if (rangeIdx >= 2) {
              rangeIdx -= 2;
              distanceContextOffset = 0;
            }
            let insertCode = (170064 >>> rangeIdx * 2 & 3) << 3 | cmdCode >>> 3 & 7;
            let copyCode = (156228 >>> rangeIdx * 2 & 3) << 3 | cmdCode & 7;
            let copyLengthOffset = copyLengthOffsets[copyCode];
            let distanceContext = distanceContextOffset + (copyLengthOffset > 4 ? 3 : copyLengthOffset - 2);
            let index = cmdCode * 4;
            cmdLookup[index + 0] = INSERT_LENGTH_N_BITS[insertCode] | COPY_LENGTH_N_BITS[copyCode] << 8;
            cmdLookup[index + 1] = insertLengthOffsets[insertCode];
            cmdLookup[index + 2] = copyLengthOffsets[copyCode];
            cmdLookup[index + 3] = distanceContext;
          }
        }
        function decodeWindowBits(s2) {
          let largeWindowEnabled = s2.isLargeWindow;
          s2.isLargeWindow = 0;
          if (s2.bitOffset >= 16) {
            s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
            s2.bitOffset -= 16;
          }
          if (readFewBits(s2, 1) == 0) return 16;
          let n2 = readFewBits(s2, 3);
          if (n2 != 0) return 17 + n2;
          n2 = readFewBits(s2, 3);
          if (n2 != 0) if (n2 == 1) {
            if (largeWindowEnabled == 0) return -1;
            s2.isLargeWindow = 1;
            if (readFewBits(s2, 1) == 1) return -1;
            n2 = readFewBits(s2, 6);
            if (n2 < 10 || n2 > 30) return -1;
            return n2;
          } else return 8 + n2;
          return 17;
        }
        function attachDictionaryChunk(s2, data2) {
          if (s2.runningState != 1) throw "State MUST be freshly initialized";
          if (s2.cdNumChunks == 0) {
            s2.cdChunks = new Array(16);
            s2.cdChunkOffsets = new Int32Array(16);
            s2.cdBlockBits = -1;
          }
          if (s2.cdNumChunks == 15) throw "Too many dictionary chunks";
          s2.cdChunks[s2.cdNumChunks] = data2;
          s2.cdNumChunks++;
          s2.cdTotalSize += data2.length;
          s2.cdChunkOffsets[s2.cdNumChunks] = s2.cdTotalSize;
        }
        function initState(s2, input) {
          if (s2.runningState != 0) throw "State MUST be uninitialized";
          s2.blockTrees = new Int32Array(3091);
          s2.blockTrees[0] = 7;
          s2.distRbIdx = 3;
          let maxDistanceAlphabetLimit = calculateDistanceAlphabetLimit(2147483644, 3, 120);
          s2.distExtraBits = new Int8Array(maxDistanceAlphabetLimit);
          s2.distOffset = new Int32Array(maxDistanceAlphabetLimit);
          s2.input = input;
          initBitReader(s2);
          s2.runningState = 1;
        }
        function close(s2) {
          if (s2.runningState == 0) throw "State MUST be initialized";
          if (s2.runningState == 11) return;
          s2.runningState = 11;
          if (s2.input != null) {
            closeInput(s2.input);
            s2.input = null;
          }
        }
        function decodeVarLenUnsignedByte(s2) {
          if (s2.bitOffset >= 16) {
            s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
            s2.bitOffset -= 16;
          }
          if (readFewBits(s2, 1) != 0) {
            let n2 = readFewBits(s2, 3);
            if (n2 == 0) return 1;
            else return readFewBits(s2, n2) + (1 << n2);
          }
          return 0;
        }
        function decodeMetaBlockLength(s2) {
          if (s2.bitOffset >= 16) {
            s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
            s2.bitOffset -= 16;
          }
          s2.inputEnd = readFewBits(s2, 1);
          s2.metaBlockLength = 0;
          s2.isUncompressed = 0;
          s2.isMetadata = 0;
          if (s2.inputEnd != 0 && readFewBits(s2, 1) != 0) return;
          let sizeNibbles = readFewBits(s2, 2) + 4;
          if (sizeNibbles == 7) {
            s2.isMetadata = 1;
            if (readFewBits(s2, 1) != 0) throw "Corrupted reserved bit";
            let sizeBytes = readFewBits(s2, 2);
            if (sizeBytes == 0) return;
            for (let i2 = 0; i2 < sizeBytes; i2++) {
              if (s2.bitOffset >= 16) {
                s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
                s2.bitOffset -= 16;
              }
              let bits = readFewBits(s2, 8);
              if (bits == 0 && i2 + 1 == sizeBytes && sizeBytes > 1) throw "Exuberant nibble";
              s2.metaBlockLength |= bits << i2 * 8;
            }
          } else for (let i2 = 0; i2 < sizeNibbles; i2++) {
            if (s2.bitOffset >= 16) {
              s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
              s2.bitOffset -= 16;
            }
            let bits = readFewBits(s2, 4);
            if (bits == 0 && i2 + 1 == sizeNibbles && sizeNibbles > 4) throw "Exuberant nibble";
            s2.metaBlockLength |= bits << i2 * 4;
          }
          s2.metaBlockLength++;
          if (s2.inputEnd == 0) s2.isUncompressed = readFewBits(s2, 1);
        }
        function readSymbol(tableGroup, tableIdx, s2) {
          let offset = tableGroup[tableIdx];
          let val = s2.accumulator32 >>> s2.bitOffset;
          offset += val & 255;
          let bits = tableGroup[offset] >> 16;
          let sym = tableGroup[offset] & 65535;
          if (bits <= 8) {
            s2.bitOffset += bits;
            return sym;
          }
          offset += sym;
          let mask = (1 << bits) - 1;
          offset += (val & mask) >>> 8;
          s2.bitOffset += (tableGroup[offset] >> 16) + 8;
          return tableGroup[offset] & 65535;
        }
        function readBlockLength(tableGroup, tableIdx, s2) {
          if (s2.bitOffset >= 16) {
            s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
            s2.bitOffset -= 16;
          }
          let code = readSymbol(tableGroup, tableIdx, s2);
          let n2 = BLOCK_LENGTH_N_BITS[code];
          if (s2.bitOffset >= 16) {
            s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
            s2.bitOffset -= 16;
          }
          return BLOCK_LENGTH_OFFSET[code] + (n2 <= 16 ? readFewBits(s2, n2) : readManyBits(s2, n2));
        }
        function moveToFront(v2, index) {
          let value = v2[index];
          for (; index > 0; index--) v2[index] = v2[index - 1];
          v2[0] = value;
        }
        function inverseMoveToFrontTransform(v2, vLen) {
          let mtf = new Int32Array(256);
          for (let i2 = 0; i2 < 256; i2++) mtf[i2] = i2;
          for (let i2 = 0; i2 < vLen; i2++) {
            let index = v2[i2] & 255;
            v2[i2] = mtf[index];
            if (index != 0) moveToFront(mtf, index);
          }
        }
        function readHuffmanCodeLengths(codeLengthCodeLengths, numSymbols, codeLengths, s2) {
          let symbol = 0;
          let prevCodeLen = 8;
          let repeat = 0;
          let repeatCodeLen = 0;
          let space = 32768;
          let table = new Int32Array(33);
          buildHuffmanTable(table, table.length - 1, 5, codeLengthCodeLengths, 18);
          while (symbol < numSymbols && space > 0) {
            if (s2.halfOffset > 2030) doReadMoreInput(s2);
            if (s2.bitOffset >= 16) {
              s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
              s2.bitOffset -= 16;
            }
            let p2 = s2.accumulator32 >>> s2.bitOffset & 31;
            s2.bitOffset += table[p2] >> 16;
            let codeLen = table[p2] & 65535;
            if (codeLen < 16) {
              repeat = 0;
              codeLengths[symbol++] = codeLen;
              if (codeLen != 0) {
                prevCodeLen = codeLen;
                space -= 32768 >> codeLen;
              }
            } else {
              let extraBits = codeLen - 14;
              let newLen = 0;
              if (codeLen == 16) newLen = prevCodeLen;
              if (repeatCodeLen != newLen) {
                repeat = 0;
                repeatCodeLen = newLen;
              }
              let oldRepeat = repeat;
              if (repeat > 0) {
                repeat -= 2;
                repeat <<= extraBits;
              }
              if (s2.bitOffset >= 16) {
                s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
                s2.bitOffset -= 16;
              }
              repeat += readFewBits(s2, extraBits) + 3;
              let repeatDelta = repeat - oldRepeat;
              if (symbol + repeatDelta > numSymbols) throw "symbol + repeatDelta > numSymbols";
              for (let i2 = 0; i2 < repeatDelta; i2++) codeLengths[symbol++] = repeatCodeLen;
              if (repeatCodeLen != 0) space -= repeatDelta << 15 - repeatCodeLen;
            }
          }
          if (space != 0) throw "Unused space";
          codeLengths.fill(0, symbol, numSymbols);
        }
        function checkDupes(symbols, length) {
          for (let i2 = 0; i2 < length - 1; ++i2) for (let j2 = i2 + 1; j2 < length; ++j2) if (symbols[i2] == symbols[j2]) throw "Duplicate simple Huffman code symbol";
        }
        function readSimpleHuffmanCode(alphabetSizeMax, alphabetSizeLimit, tableGroup, tableIdx, s2) {
          let codeLengths = new Int32Array(alphabetSizeLimit);
          let symbols = new Int32Array(4);
          let maxBits = 1 + log2floor(alphabetSizeMax - 1);
          let numSymbols = readFewBits(s2, 2) + 1;
          for (let i2 = 0; i2 < numSymbols; i2++) {
            if (s2.bitOffset >= 16) {
              s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
              s2.bitOffset -= 16;
            }
            let symbol = readFewBits(s2, maxBits);
            if (symbol >= alphabetSizeLimit) throw "Can't readHuffmanCode";
            symbols[i2] = symbol;
          }
          checkDupes(symbols, numSymbols);
          let histogramId = numSymbols;
          if (numSymbols == 4) histogramId += readFewBits(s2, 1);
          switch (histogramId) {
            case 1:
              codeLengths[symbols[0]] = 1;
              break;
            case 2:
              codeLengths[symbols[0]] = 1;
              codeLengths[symbols[1]] = 1;
              break;
            case 3:
              codeLengths[symbols[0]] = 1;
              codeLengths[symbols[1]] = 2;
              codeLengths[symbols[2]] = 2;
              break;
            case 4:
              codeLengths[symbols[0]] = 2;
              codeLengths[symbols[1]] = 2;
              codeLengths[symbols[2]] = 2;
              codeLengths[symbols[3]] = 2;
              break;
            case 5:
              codeLengths[symbols[0]] = 1;
              codeLengths[symbols[1]] = 2;
              codeLengths[symbols[2]] = 3;
              codeLengths[symbols[3]] = 3;
              break;
          }
          return buildHuffmanTable(tableGroup, tableIdx, 8, codeLengths, alphabetSizeLimit);
        }
        function readComplexHuffmanCode(alphabetSizeLimit, skip, tableGroup, tableIdx, s2) {
          let codeLengths = new Int32Array(alphabetSizeLimit);
          let codeLengthCodeLengths = new Int32Array(18);
          let space = 32;
          let numCodes = 0;
          for (let i2 = skip; i2 < 18 && space > 0; i2++) {
            let codeLenIdx = CODE_LENGTH_CODE_ORDER[i2];
            if (s2.bitOffset >= 16) {
              s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
              s2.bitOffset -= 16;
            }
            let p2 = s2.accumulator32 >>> s2.bitOffset & 15;
            s2.bitOffset += FIXED_TABLE[p2] >> 16;
            let v2 = FIXED_TABLE[p2] & 65535;
            codeLengthCodeLengths[codeLenIdx] = v2;
            if (v2 != 0) {
              space -= 32 >> v2;
              numCodes++;
            }
          }
          if (space != 0 && numCodes != 1) throw "Corrupted Huffman code histogram";
          readHuffmanCodeLengths(codeLengthCodeLengths, alphabetSizeLimit, codeLengths, s2);
          return buildHuffmanTable(tableGroup, tableIdx, 8, codeLengths, alphabetSizeLimit);
        }
        function readHuffmanCode(alphabetSizeMax, alphabetSizeLimit, tableGroup, tableIdx, s2) {
          if (s2.halfOffset > 2030) doReadMoreInput(s2);
          if (s2.bitOffset >= 16) {
            s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
            s2.bitOffset -= 16;
          }
          let simpleCodeOrSkip = readFewBits(s2, 2);
          if (simpleCodeOrSkip == 1) return readSimpleHuffmanCode(alphabetSizeMax, alphabetSizeLimit, tableGroup, tableIdx, s2);
          else return readComplexHuffmanCode(alphabetSizeLimit, simpleCodeOrSkip, tableGroup, tableIdx, s2);
        }
        function decodeContextMap(contextMapSize, contextMap, s2) {
          if (s2.halfOffset > 2030) doReadMoreInput(s2);
          let numTrees = decodeVarLenUnsignedByte(s2) + 1;
          if (numTrees == 1) {
            contextMap.fill(0, 0, contextMapSize);
            return numTrees;
          }
          if (s2.bitOffset >= 16) {
            s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
            s2.bitOffset -= 16;
          }
          let useRleForZeros = readFewBits(s2, 1);
          let maxRunLengthPrefix = 0;
          if (useRleForZeros != 0) maxRunLengthPrefix = readFewBits(s2, 4) + 1;
          let alphabetSize = numTrees + maxRunLengthPrefix;
          let tableSize = MAX_HUFFMAN_TABLE_SIZE[alphabetSize + 31 >> 5];
          let table = new Int32Array(tableSize + 1);
          let tableIdx = table.length - 1;
          readHuffmanCode(alphabetSize, alphabetSize, table, tableIdx, s2);
          for (let i2 = 0; i2 < contextMapSize; ) {
            if (s2.halfOffset > 2030) doReadMoreInput(s2);
            if (s2.bitOffset >= 16) {
              s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
              s2.bitOffset -= 16;
            }
            let code = readSymbol(table, tableIdx, s2);
            if (code == 0) {
              contextMap[i2] = 0;
              i2++;
            } else if (code <= maxRunLengthPrefix) {
              if (s2.bitOffset >= 16) {
                s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
                s2.bitOffset -= 16;
              }
              let reps = (1 << code) + readFewBits(s2, code);
              while (reps != 0) {
                if (i2 >= contextMapSize) throw "Corrupted context map";
                contextMap[i2] = 0;
                i2++;
                reps--;
              }
            } else {
              contextMap[i2] = code - maxRunLengthPrefix;
              i2++;
            }
          }
          if (s2.bitOffset >= 16) {
            s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
            s2.bitOffset -= 16;
          }
          if (readFewBits(s2, 1) == 1) inverseMoveToFrontTransform(contextMap, contextMapSize);
          return numTrees;
        }
        function decodeBlockTypeAndLength(s2, treeType, numBlockTypes) {
          let ringBuffers = s2.rings;
          let offset = 4 + treeType * 2;
          if (s2.bitOffset >= 16) {
            s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
            s2.bitOffset -= 16;
          }
          let blockType = readSymbol(s2.blockTrees, 2 * treeType, s2);
          let result = readBlockLength(s2.blockTrees, 2 * treeType + 1, s2);
          if (blockType == 1) blockType = ringBuffers[offset + 1] + 1;
          else if (blockType == 0) blockType = ringBuffers[offset];
          else blockType -= 2;
          if (blockType >= numBlockTypes) blockType -= numBlockTypes;
          ringBuffers[offset] = ringBuffers[offset + 1];
          ringBuffers[offset + 1] = blockType;
          return result;
        }
        function decodeLiteralBlockSwitch(s2) {
          s2.literalBlockLength = decodeBlockTypeAndLength(s2, 0, s2.numLiteralBlockTypes);
          let literalBlockType = s2.rings[5];
          s2.contextMapSlice = literalBlockType << 6;
          s2.literalTreeIdx = s2.contextMap[s2.contextMapSlice] & 255;
          s2.contextLookupOffset1 = s2.contextModes[literalBlockType] << 9;
          s2.contextLookupOffset2 = s2.contextLookupOffset1 + 256;
        }
        function decodeCommandBlockSwitch(s2) {
          s2.commandBlockLength = decodeBlockTypeAndLength(s2, 1, s2.numCommandBlockTypes);
          s2.commandTreeIdx = s2.rings[7];
        }
        function decodeDistanceBlockSwitch(s2) {
          s2.distanceBlockLength = decodeBlockTypeAndLength(s2, 2, s2.numDistanceBlockTypes);
          s2.distContextMapSlice = s2.rings[9] << 2;
        }
        function maybeReallocateRingBuffer(s2) {
          let newSize = s2.maxRingBufferSize;
          if (newSize > s2.expectedTotalSize) {
            let minimalNewSize = s2.expectedTotalSize;
            while (newSize >> 1 > minimalNewSize) newSize >>= 1;
            if (s2.inputEnd == 0 && newSize < 16384 && s2.maxRingBufferSize >= 16384) newSize = 16384;
          }
          if (newSize <= s2.ringBufferSize) return;
          let ringBufferSizeWithSlack = newSize + 37;
          let newBuffer = new Int8Array(ringBufferSizeWithSlack);
          if (s2.ringBuffer.length != 0) newBuffer.set(s2.ringBuffer.subarray(0, 0 + s2.ringBufferSize), 0);
          s2.ringBuffer = newBuffer;
          s2.ringBufferSize = newSize;
        }
        function readNextMetablockHeader(s2) {
          if (s2.inputEnd != 0) {
            s2.nextRunningState = 10;
            s2.runningState = 12;
            return;
          }
          s2.literalTreeGroup = new Int32Array(0);
          s2.commandTreeGroup = new Int32Array(0);
          s2.distanceTreeGroup = new Int32Array(0);
          if (s2.halfOffset > 2030) doReadMoreInput(s2);
          decodeMetaBlockLength(s2);
          if (s2.metaBlockLength == 0 && s2.isMetadata == 0) return;
          if (s2.isUncompressed != 0 || s2.isMetadata != 0) {
            jumpToByteBoundary(s2);
            s2.runningState = s2.isMetadata != 0 ? 5 : 6;
          } else s2.runningState = 3;
          if (s2.isMetadata != 0) return;
          s2.expectedTotalSize += s2.metaBlockLength;
          if (s2.expectedTotalSize > 1 << 30) s2.expectedTotalSize = 1 << 30;
          if (s2.ringBufferSize < s2.maxRingBufferSize) maybeReallocateRingBuffer(s2);
        }
        function readMetablockPartition(s2, treeType, numBlockTypes) {
          let offset = s2.blockTrees[2 * treeType];
          if (numBlockTypes <= 1) {
            s2.blockTrees[2 * treeType + 1] = offset;
            s2.blockTrees[2 * treeType + 2] = offset;
            return 1 << 28;
          }
          let blockTypeAlphabetSize = numBlockTypes + 2;
          offset += readHuffmanCode(blockTypeAlphabetSize, blockTypeAlphabetSize, s2.blockTrees, 2 * treeType, s2);
          s2.blockTrees[2 * treeType + 1] = offset;
          let blockLengthAlphabetSize = 26;
          offset += readHuffmanCode(blockLengthAlphabetSize, blockLengthAlphabetSize, s2.blockTrees, 2 * treeType + 1, s2);
          s2.blockTrees[2 * treeType + 2] = offset;
          return readBlockLength(s2.blockTrees, 2 * treeType + 1, s2);
        }
        function calculateDistanceLut(s2, alphabetSizeLimit) {
          let distExtraBits = s2.distExtraBits;
          let distOffset = s2.distOffset;
          let npostfix = s2.distancePostfixBits;
          let ndirect = s2.numDirectDistanceCodes;
          let postfix = 1 << npostfix;
          let bits = 1;
          let half = 0;
          let i2 = 16;
          for (let j2 = 0; j2 < ndirect; ++j2) {
            distExtraBits[i2] = 0;
            distOffset[i2] = j2 + 1;
            ++i2;
          }
          while (i2 < alphabetSizeLimit) {
            let base = ndirect + ((2 + half << bits) - 4 << npostfix) + 1;
            for (let j2 = 0; j2 < postfix; ++j2) {
              distExtraBits[i2] = bits;
              distOffset[i2] = base + j2;
              ++i2;
            }
            bits = bits + half;
            half = half ^ 1;
          }
        }
        function readMetablockHuffmanCodesAndContextMaps(s2) {
          s2.numLiteralBlockTypes = decodeVarLenUnsignedByte(s2) + 1;
          s2.literalBlockLength = readMetablockPartition(s2, 0, s2.numLiteralBlockTypes);
          s2.numCommandBlockTypes = decodeVarLenUnsignedByte(s2) + 1;
          s2.commandBlockLength = readMetablockPartition(s2, 1, s2.numCommandBlockTypes);
          s2.numDistanceBlockTypes = decodeVarLenUnsignedByte(s2) + 1;
          s2.distanceBlockLength = readMetablockPartition(s2, 2, s2.numDistanceBlockTypes);
          if (s2.halfOffset > 2030) doReadMoreInput(s2);
          if (s2.bitOffset >= 16) {
            s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
            s2.bitOffset -= 16;
          }
          s2.distancePostfixBits = readFewBits(s2, 2);
          s2.numDirectDistanceCodes = readFewBits(s2, 4) << s2.distancePostfixBits;
          s2.contextModes = new Int8Array(s2.numLiteralBlockTypes);
          for (let i2 = 0; i2 < s2.numLiteralBlockTypes; ) {
            let limit = min(i2 + 96, s2.numLiteralBlockTypes);
            for (; i2 < limit; ++i2) {
              if (s2.bitOffset >= 16) {
                s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
                s2.bitOffset -= 16;
              }
              s2.contextModes[i2] = readFewBits(s2, 2);
            }
            if (s2.halfOffset > 2030) doReadMoreInput(s2);
          }
          s2.contextMap = new Int8Array(s2.numLiteralBlockTypes << 6);
          let numLiteralTrees = decodeContextMap(s2.numLiteralBlockTypes << 6, s2.contextMap, s2);
          s2.trivialLiteralContext = 1;
          for (let j2 = 0; j2 < s2.numLiteralBlockTypes << 6; j2++) if (s2.contextMap[j2] != j2 >> 6) {
            s2.trivialLiteralContext = 0;
            break;
          }
          s2.distContextMap = new Int8Array(s2.numDistanceBlockTypes << 2);
          let numDistTrees = decodeContextMap(s2.numDistanceBlockTypes << 2, s2.distContextMap, s2);
          s2.literalTreeGroup = decodeHuffmanTreeGroup(256, 256, numLiteralTrees, s2);
          s2.commandTreeGroup = decodeHuffmanTreeGroup(704, 704, s2.numCommandBlockTypes, s2);
          let distanceAlphabetSizeMax = calculateDistanceAlphabetSize(s2.distancePostfixBits, s2.numDirectDistanceCodes, 24);
          let distanceAlphabetSizeLimit = distanceAlphabetSizeMax;
          if (s2.isLargeWindow == 1) {
            distanceAlphabetSizeMax = calculateDistanceAlphabetSize(s2.distancePostfixBits, s2.numDirectDistanceCodes, 62);
            distanceAlphabetSizeLimit = calculateDistanceAlphabetLimit(2147483644, s2.distancePostfixBits, s2.numDirectDistanceCodes);
          }
          s2.distanceTreeGroup = decodeHuffmanTreeGroup(distanceAlphabetSizeMax, distanceAlphabetSizeLimit, numDistTrees, s2);
          calculateDistanceLut(s2, distanceAlphabetSizeLimit);
          s2.contextMapSlice = 0;
          s2.distContextMapSlice = 0;
          s2.contextLookupOffset1 = s2.contextModes[0] * 512;
          s2.contextLookupOffset2 = s2.contextLookupOffset1 + 256;
          s2.literalTreeIdx = 0;
          s2.commandTreeIdx = 0;
          s2.rings[4] = 1;
          s2.rings[5] = 0;
          s2.rings[6] = 1;
          s2.rings[7] = 0;
          s2.rings[8] = 1;
          s2.rings[9] = 0;
        }
        function copyUncompressedData(s2) {
          let ringBuffer = s2.ringBuffer;
          if (s2.metaBlockLength <= 0) {
            reload(s2);
            s2.runningState = 2;
            return;
          }
          let chunkLength = min(s2.ringBufferSize - s2.pos, s2.metaBlockLength);
          copyRawBytes(s2, ringBuffer, s2.pos, chunkLength);
          s2.metaBlockLength -= chunkLength;
          s2.pos += chunkLength;
          if (s2.pos == s2.ringBufferSize) {
            s2.nextRunningState = 6;
            s2.runningState = 12;
            return;
          }
          reload(s2);
          s2.runningState = 2;
        }
        function writeRingBuffer(s2) {
          let toWrite = min(s2.outputLength - s2.outputUsed, s2.ringBufferBytesReady - s2.ringBufferBytesWritten);
          if (toWrite != 0) {
            s2.output.set(s2.ringBuffer.subarray(s2.ringBufferBytesWritten, s2.ringBufferBytesWritten + toWrite), s2.outputOffset + s2.outputUsed);
            s2.outputUsed += toWrite;
            s2.ringBufferBytesWritten += toWrite;
          }
          if (s2.outputUsed < s2.outputLength) return 1;
          else return 0;
        }
        function decodeHuffmanTreeGroup(alphabetSizeMax, alphabetSizeLimit, n2, s2) {
          let maxTableSize = MAX_HUFFMAN_TABLE_SIZE[alphabetSizeLimit + 31 >> 5];
          let group = new Int32Array(n2 + n2 * maxTableSize);
          let next = n2;
          for (let i2 = 0; i2 < n2; ++i2) {
            group[i2] = next;
            next += readHuffmanCode(alphabetSizeMax, alphabetSizeLimit, group, i2, s2);
          }
          return group;
        }
        function calculateFence(s2) {
          let result = s2.ringBufferSize;
          if (s2.isEager != 0) result = min(result, s2.ringBufferBytesWritten + s2.outputLength - s2.outputUsed);
          return result;
        }
        function doUseDictionary(s2, fence) {
          if (s2.distance > 2147483644) throw "Invalid backward reference";
          let address = s2.distance - s2.maxDistance - 1 - s2.cdTotalSize;
          if (address < 0) {
            initializeCompoundDictionaryCopy(s2, -address - 1, s2.copyLength);
            s2.runningState = 14;
          } else {
            let dictionaryData = data;
            let wordLength = s2.copyLength;
            if (wordLength > 31) throw "Invalid backward reference";
            let shift = sizeBits[wordLength];
            if (shift == 0) throw "Invalid backward reference";
            let offset = offsets[wordLength];
            let wordIdx = address & (1 << shift) - 1;
            let transformIdx = address >>> shift;
            offset += wordIdx * wordLength;
            let transforms = RFC_TRANSFORMS;
            if (transformIdx >= transforms.numTransforms) throw "Invalid backward reference";
            let len = transformDictionaryWord(s2.ringBuffer, s2.pos, dictionaryData, offset, wordLength, transforms, transformIdx);
            s2.pos += len;
            s2.metaBlockLength -= len;
            if (s2.pos >= fence) {
              s2.nextRunningState = 4;
              s2.runningState = 12;
              return;
            }
            s2.runningState = 4;
          }
        }
        function initializeCompoundDictionary(s2) {
          s2.cdBlockMap = new Int8Array(256);
          let blockBits = 8;
          while (s2.cdTotalSize - 1 >>> blockBits != 0) blockBits++;
          blockBits -= 8;
          s2.cdBlockBits = blockBits;
          let cursor = 0;
          let index = 0;
          while (cursor < s2.cdTotalSize) {
            while (s2.cdChunkOffsets[index + 1] < cursor) index++;
            s2.cdBlockMap[cursor >>> blockBits] = index;
            cursor += 1 << blockBits;
          }
        }
        function initializeCompoundDictionaryCopy(s2, address, length) {
          if (s2.cdBlockBits == -1) initializeCompoundDictionary(s2);
          let index = s2.cdBlockMap[address >>> s2.cdBlockBits];
          while (address >= s2.cdChunkOffsets[index + 1]) index++;
          if (s2.cdTotalSize > address + length) throw "Invalid backward reference";
          s2.distRbIdx = s2.distRbIdx + 1 & 3;
          s2.rings[s2.distRbIdx] = s2.distance;
          s2.metaBlockLength -= length;
          s2.cdBrIndex = index;
          s2.cdBrOffset = address - s2.cdChunkOffsets[index];
          s2.cdBrLength = length;
          s2.cdBrCopied = 0;
        }
        function copyFromCompoundDictionary(s2, fence) {
          let pos = s2.pos;
          let origPos = pos;
          while (s2.cdBrLength != s2.cdBrCopied) {
            let space = fence - pos;
            let remChunkLength = s2.cdChunkOffsets[s2.cdBrIndex + 1] - s2.cdChunkOffsets[s2.cdBrIndex] - s2.cdBrOffset;
            let length = s2.cdBrLength - s2.cdBrCopied;
            if (length > remChunkLength) length = remChunkLength;
            if (length > space) length = space;
            copyBytes(s2.ringBuffer, pos, s2.cdChunks[s2.cdBrIndex], s2.cdBrOffset, s2.cdBrOffset + length);
            pos += length;
            s2.cdBrOffset += length;
            s2.cdBrCopied += length;
            if (length == remChunkLength) {
              s2.cdBrIndex++;
              s2.cdBrOffset = 0;
            }
            if (pos >= fence) break;
          }
          return pos - origPos;
        }
        function decompress(s2) {
          if (s2.runningState == 0) throw "Can't decompress until initialized";
          if (s2.runningState == 11) throw "Can't decompress after close";
          if (s2.runningState == 1) {
            let windowBits = decodeWindowBits(s2);
            if (windowBits == -1) throw "Invalid 'windowBits' code";
            s2.maxRingBufferSize = 1 << windowBits;
            s2.maxBackwardDistance = s2.maxRingBufferSize - 16;
            s2.runningState = 2;
          }
          let fence = calculateFence(s2);
          let ringBufferMask = s2.ringBufferSize - 1;
          let ringBuffer = s2.ringBuffer;
          while (s2.runningState != 10) switch (s2.runningState) {
            case 2:
              if (s2.metaBlockLength < 0) throw "Invalid metablock length";
              readNextMetablockHeader(s2);
              fence = calculateFence(s2);
              ringBufferMask = s2.ringBufferSize - 1;
              ringBuffer = s2.ringBuffer;
              continue;
            case 3:
              readMetablockHuffmanCodesAndContextMaps(s2);
              s2.runningState = 4;
            case 4:
              if (s2.metaBlockLength <= 0) {
                s2.runningState = 2;
                continue;
              }
              if (s2.halfOffset > 2030) doReadMoreInput(s2);
              if (s2.commandBlockLength == 0) decodeCommandBlockSwitch(s2);
              s2.commandBlockLength--;
              if (s2.bitOffset >= 16) {
                s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
                s2.bitOffset -= 16;
              }
              let cmdCode = readSymbol(s2.commandTreeGroup, s2.commandTreeIdx, s2) << 2;
              let insertAndCopyExtraBits = CMD_LOOKUP[cmdCode];
              let insertLengthOffset = CMD_LOOKUP[cmdCode + 1];
              let copyLengthOffset = CMD_LOOKUP[cmdCode + 2];
              s2.distanceCode = CMD_LOOKUP[cmdCode + 3];
              if (s2.bitOffset >= 16) {
                s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
                s2.bitOffset -= 16;
              }
              let insertLengthExtraBits = insertAndCopyExtraBits & 255;
              s2.insertLength = insertLengthOffset + (insertLengthExtraBits <= 16 ? readFewBits(s2, insertLengthExtraBits) : readManyBits(s2, insertLengthExtraBits));
              if (s2.bitOffset >= 16) {
                s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
                s2.bitOffset -= 16;
              }
              let copyLengthExtraBits = insertAndCopyExtraBits >> 8;
              s2.copyLength = copyLengthOffset + (copyLengthExtraBits <= 16 ? readFewBits(s2, copyLengthExtraBits) : readManyBits(s2, copyLengthExtraBits));
              s2.j = 0;
              s2.runningState = 7;
            case 7:
              if (s2.trivialLiteralContext != 0) while (s2.j < s2.insertLength) {
                if (s2.halfOffset > 2030) doReadMoreInput(s2);
                if (s2.literalBlockLength == 0) decodeLiteralBlockSwitch(s2);
                s2.literalBlockLength--;
                if (s2.bitOffset >= 16) {
                  s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
                  s2.bitOffset -= 16;
                }
                ringBuffer[s2.pos] = readSymbol(s2.literalTreeGroup, s2.literalTreeIdx, s2);
                s2.pos++;
                s2.j++;
                if (s2.pos >= fence) {
                  s2.nextRunningState = 7;
                  s2.runningState = 12;
                  break;
                }
              }
              else {
                let prevByte1 = ringBuffer[s2.pos - 1 & ringBufferMask] & 255;
                let prevByte2 = ringBuffer[s2.pos - 2 & ringBufferMask] & 255;
                while (s2.j < s2.insertLength) {
                  if (s2.halfOffset > 2030) doReadMoreInput(s2);
                  if (s2.literalBlockLength == 0) decodeLiteralBlockSwitch(s2);
                  let literalContext = LOOKUP[s2.contextLookupOffset1 + prevByte1] | LOOKUP[s2.contextLookupOffset2 + prevByte2];
                  let literalTreeIdx = s2.contextMap[s2.contextMapSlice + literalContext] & 255;
                  s2.literalBlockLength--;
                  prevByte2 = prevByte1;
                  if (s2.bitOffset >= 16) {
                    s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
                    s2.bitOffset -= 16;
                  }
                  prevByte1 = readSymbol(s2.literalTreeGroup, literalTreeIdx, s2);
                  ringBuffer[s2.pos] = prevByte1;
                  s2.pos++;
                  s2.j++;
                  if (s2.pos >= fence) {
                    s2.nextRunningState = 7;
                    s2.runningState = 12;
                    break;
                  }
                }
              }
              if (s2.runningState != 7) continue;
              s2.metaBlockLength -= s2.insertLength;
              if (s2.metaBlockLength <= 0) {
                s2.runningState = 4;
                continue;
              }
              let distanceCode = s2.distanceCode;
              if (distanceCode < 0) s2.distance = s2.rings[s2.distRbIdx];
              else {
                if (s2.halfOffset > 2030) doReadMoreInput(s2);
                if (s2.distanceBlockLength == 0) decodeDistanceBlockSwitch(s2);
                s2.distanceBlockLength--;
                if (s2.bitOffset >= 16) {
                  s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
                  s2.bitOffset -= 16;
                }
                let distTreeIdx = s2.distContextMap[s2.distContextMapSlice + distanceCode] & 255;
                distanceCode = readSymbol(s2.distanceTreeGroup, distTreeIdx, s2);
                if (distanceCode < 16) {
                  let index = s2.distRbIdx + DISTANCE_SHORT_CODE_INDEX_OFFSET[distanceCode] & 3;
                  s2.distance = s2.rings[index] + DISTANCE_SHORT_CODE_VALUE_OFFSET[distanceCode];
                  if (s2.distance < 0) throw "Negative distance";
                } else {
                  let extraBits = s2.distExtraBits[distanceCode];
                  let bits;
                  if (s2.bitOffset + extraBits <= 32) bits = readFewBits(s2, extraBits);
                  else {
                    if (s2.bitOffset >= 16) {
                      s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
                      s2.bitOffset -= 16;
                    }
                    bits = extraBits <= 16 ? readFewBits(s2, extraBits) : readManyBits(s2, extraBits);
                  }
                  s2.distance = s2.distOffset[distanceCode] + (bits << s2.distancePostfixBits);
                }
              }
              if (s2.maxDistance != s2.maxBackwardDistance && s2.pos < s2.maxBackwardDistance) s2.maxDistance = s2.pos;
              else s2.maxDistance = s2.maxBackwardDistance;
              if (s2.distance > s2.maxDistance) {
                s2.runningState = 9;
                continue;
              }
              if (distanceCode > 0) {
                s2.distRbIdx = s2.distRbIdx + 1 & 3;
                s2.rings[s2.distRbIdx] = s2.distance;
              }
              if (s2.copyLength > s2.metaBlockLength) throw "Invalid backward reference";
              s2.j = 0;
              s2.runningState = 8;
            case 8:
              let src = s2.pos - s2.distance & ringBufferMask;
              let dst = s2.pos;
              let copyLength = s2.copyLength - s2.j;
              let srcEnd = src + copyLength;
              let dstEnd = dst + copyLength;
              if (srcEnd < ringBufferMask && dstEnd < ringBufferMask) {
                if (copyLength < 12 || srcEnd > dst && dstEnd > src) for (let k2 = 0; k2 < copyLength; k2 += 4) {
                  ringBuffer[dst++] = ringBuffer[src++];
                  ringBuffer[dst++] = ringBuffer[src++];
                  ringBuffer[dst++] = ringBuffer[src++];
                  ringBuffer[dst++] = ringBuffer[src++];
                }
                else ringBuffer.copyWithin(dst, src, srcEnd);
                s2.j += copyLength;
                s2.metaBlockLength -= copyLength;
                s2.pos += copyLength;
              } else for (; s2.j < s2.copyLength; ) {
                ringBuffer[s2.pos] = ringBuffer[s2.pos - s2.distance & ringBufferMask];
                s2.metaBlockLength--;
                s2.pos++;
                s2.j++;
                if (s2.pos >= fence) {
                  s2.nextRunningState = 8;
                  s2.runningState = 12;
                  break;
                }
              }
              if (s2.runningState == 8) s2.runningState = 4;
              continue;
            case 9:
              doUseDictionary(s2, fence);
              continue;
            case 14:
              s2.pos += copyFromCompoundDictionary(s2, fence);
              if (s2.pos >= fence) {
                s2.nextRunningState = 14;
                s2.runningState = 12;
                return;
              }
              s2.runningState = 4;
              continue;
            case 5:
              while (s2.metaBlockLength > 0) {
                if (s2.halfOffset > 2030) doReadMoreInput(s2);
                if (s2.bitOffset >= 16) {
                  s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
                  s2.bitOffset -= 16;
                }
                readFewBits(s2, 8);
                s2.metaBlockLength--;
              }
              s2.runningState = 2;
              continue;
            case 6:
              copyUncompressedData(s2);
              continue;
            case 12:
              s2.ringBufferBytesReady = min(s2.pos, s2.ringBufferSize);
              s2.runningState = 13;
            case 13:
              if (writeRingBuffer(s2) == 0) return;
              if (s2.pos >= s2.maxBackwardDistance) s2.maxDistance = s2.maxBackwardDistance;
              if (s2.pos >= s2.ringBufferSize) {
                if (s2.pos > s2.ringBufferSize) ringBuffer.copyWithin(0, s2.ringBufferSize, s2.pos);
                s2.pos &= ringBufferMask;
                s2.ringBufferBytesWritten = 0;
              }
              s2.runningState = s2.nextRunningState;
              continue;
            default:
              throw "Unexpected state " + s2.runningState;
          }
          if (s2.runningState == 10) {
            if (s2.metaBlockLength < 0) throw "Invalid metablock length";
            jumpToByteBoundary(s2);
            checkHealth(s2, 1);
          }
        }
        function Transforms(numTransforms, prefixSuffixLen, prefixSuffixCount) {
          this.numTransforms = 0;
          this.triplets = new Int32Array(0);
          this.prefixSuffixStorage = new Int8Array(0);
          this.prefixSuffixHeads = new Int32Array(0);
          this.params = new Int16Array(0);
          this.numTransforms = numTransforms;
          this.triplets = new Int32Array(numTransforms * 3);
          this.params = new Int16Array(numTransforms);
          this.prefixSuffixStorage = new Int8Array(prefixSuffixLen);
          this.prefixSuffixHeads = new Int32Array(prefixSuffixCount + 1);
        }
        let RFC_TRANSFORMS = new Transforms(121, 167, 50);
        function unpackTransforms(prefixSuffix, prefixSuffixHeads, transforms, prefixSuffixSrc, transformsSrc) {
          let n2 = prefixSuffixSrc.length;
          let index = 1;
          let j2 = 0;
          for (let i2 = 0; i2 < n2; ++i2) {
            let c2 = prefixSuffixSrc.charCodeAt(i2);
            if (c2 == 35) prefixSuffixHeads[index++] = j2;
            else prefixSuffix[j2++] = c2;
          }
          for (let i2 = 0; i2 < 363; ++i2) transforms[i2] = transformsSrc.charCodeAt(i2) - 32;
        }
        unpackTransforms(RFC_TRANSFORMS.prefixSuffixStorage, RFC_TRANSFORMS.prefixSuffixHeads, RFC_TRANSFORMS.triplets, `# #s #, #e #.# the #.com/#Â # of # and # in # to #"#">#
#]# for # a # that #. # with #'# from # by #. The # on # as # is #ing #
	#:#ed #(# at #ly #="# of the #. This #,# not #er #al #='#ful #ive #less #est #ize #ous #`, `     !! ! ,  *!  &!  " !  ) *   * -  ! # !  #!*!  +  ,$ !  -  %  .  / #   0  1 .  "   2  3!*   4%  ! # /   5  6  7  8 0  1 &   $   9 +   :  ;  < '  !=  >  ?! 4  @ 4  2  &   A *# (   B  C& ) %  ) !*# *-% A +! *.  D! %'  & E *6  F  G% ! *A *%  H! D  I!+!  J!+   K +- *4! A  L!*4  M  N +6  O!*% +.! K *G  P +%(  ! G *D +D  Q +# *K!*G!+D!+# +G +A +4!+% +K!+4!*D!+K!*K`);
        function transformDictionaryWord(dst, dstOffset, src, srcOffset, len, transforms, transformIndex) {
          let offset = dstOffset;
          let triplets = transforms.triplets;
          let prefixSuffixStorage = transforms.prefixSuffixStorage;
          let prefixSuffixHeads = transforms.prefixSuffixHeads;
          let transformOffset = 3 * transformIndex;
          let prefixIdx = triplets[transformOffset];
          let transformType = triplets[transformOffset + 1];
          let suffixIdx = triplets[transformOffset + 2];
          let prefix = prefixSuffixHeads[prefixIdx];
          let prefixEnd = prefixSuffixHeads[prefixIdx + 1];
          let suffix = prefixSuffixHeads[suffixIdx];
          let suffixEnd = prefixSuffixHeads[suffixIdx + 1];
          let omitFirst = transformType - 11;
          let omitLast = transformType - 0;
          if (omitFirst < 1 || omitFirst > 9) omitFirst = 0;
          if (omitLast < 1 || omitLast > 9) omitLast = 0;
          while (prefix != prefixEnd) dst[offset++] = prefixSuffixStorage[prefix++];
          if (omitFirst > len) omitFirst = len;
          srcOffset += omitFirst;
          len -= omitFirst;
          len -= omitLast;
          let i2 = len;
          while (i2 > 0) {
            dst[offset++] = src[srcOffset++];
            i2--;
          }
          if (transformType == 10 || transformType == 11) {
            let uppercaseOffset = offset - len;
            if (transformType == 10) len = 1;
            while (len > 0) {
              let c0 = dst[uppercaseOffset] & 255;
              if (c0 < 192) {
                if (c0 >= 97 && c0 <= 122) dst[uppercaseOffset] ^= 32;
                uppercaseOffset += 1;
                len -= 1;
              } else if (c0 < 224) {
                dst[uppercaseOffset + 1] ^= 32;
                uppercaseOffset += 2;
                len -= 2;
              } else {
                dst[uppercaseOffset + 2] ^= 5;
                uppercaseOffset += 3;
                len -= 3;
              }
            }
          } else if (transformType == 21 || transformType == 22) {
            let shiftOffset = offset - len;
            let param = transforms.params[transformIndex];
            let scalar = (param & 32767) + (16777216 - (param & 32768));
            while (len > 0) {
              let step = 1;
              let c0 = dst[shiftOffset] & 255;
              if (c0 < 128) {
                scalar += c0;
                dst[shiftOffset] = scalar & 127;
              } else if (c0 < 192) ;
              else if (c0 < 224) if (len >= 2) {
                let c1 = dst[shiftOffset + 1];
                scalar += c1 & 63 | (c0 & 31) << 6;
                dst[shiftOffset] = 192 | scalar >> 6 & 31;
                dst[shiftOffset + 1] = c1 & 192 | scalar & 63;
                step = 2;
              } else step = len;
              else if (c0 < 240) if (len >= 3) {
                let c1 = dst[shiftOffset + 1];
                let c2 = dst[shiftOffset + 2];
                scalar += c2 & 63 | (c1 & 63) << 6 | (c0 & 15) << 12;
                dst[shiftOffset] = 224 | scalar >> 12 & 15;
                dst[shiftOffset + 1] = c1 & 192 | scalar >> 6 & 63;
                dst[shiftOffset + 2] = c2 & 192 | scalar & 63;
                step = 3;
              } else step = len;
              else if (c0 < 248) if (len >= 4) {
                let c1 = dst[shiftOffset + 1];
                let c2 = dst[shiftOffset + 2];
                let c3 = dst[shiftOffset + 3];
                scalar += c3 & 63 | (c2 & 63) << 6 | (c1 & 63) << 12 | (c0 & 7) << 18;
                dst[shiftOffset] = 240 | scalar >> 18 & 7;
                dst[shiftOffset + 1] = c1 & 192 | scalar >> 12 & 63;
                dst[shiftOffset + 2] = c2 & 192 | scalar >> 6 & 63;
                dst[shiftOffset + 3] = c3 & 192 | scalar & 63;
                step = 4;
              } else step = len;
              shiftOffset += step;
              len -= step;
              if (transformType == 21) len = 0;
            }
          }
          while (suffix != suffixEnd) dst[offset++] = prefixSuffixStorage[suffix++];
          return offset - dstOffset;
        }
        function getNextKey(key, len) {
          let step = 1 << len - 1;
          while ((key & step) != 0) step >>= 1;
          return (key & step - 1) + step;
        }
        function replicateValue(table, offset, step, end, item) {
          do {
            end -= step;
            table[offset + end] = item;
          } while (end > 0);
        }
        function nextTableBitSize(count, len, rootBits) {
          let left = 1 << len - rootBits;
          while (len < 15) {
            left -= count[len];
            if (left <= 0) break;
            len++;
            left <<= 1;
          }
          return len - rootBits;
        }
        function buildHuffmanTable(tableGroup, tableIdx, rootBits, codeLengths, codeLengthsSize) {
          let tableOffset = tableGroup[tableIdx];
          let key;
          let sorted = new Int32Array(codeLengthsSize);
          let count = new Int32Array(16);
          let offset = new Int32Array(16);
          let symbol;
          for (symbol = 0; symbol < codeLengthsSize; symbol++) count[codeLengths[symbol]]++;
          offset[1] = 0;
          for (let len = 1; len < 15; len++) offset[len + 1] = offset[len] + count[len];
          for (symbol = 0; symbol < codeLengthsSize; symbol++) if (codeLengths[symbol] != 0) sorted[offset[codeLengths[symbol]]++] = symbol;
          let tableBits = rootBits;
          let tableSize = 1 << tableBits;
          let totalSize = tableSize;
          if (offset[15] == 1) {
            for (key = 0; key < totalSize; key++) tableGroup[tableOffset + key] = sorted[0];
            return totalSize;
          }
          key = 0;
          symbol = 0;
          for (let len = 1, step = 2; len <= rootBits; len++, step <<= 1) for (; count[len] > 0; count[len]--) {
            replicateValue(tableGroup, tableOffset + key, step, tableSize, len << 16 | sorted[symbol++]);
            key = getNextKey(key, len);
          }
          let mask = totalSize - 1;
          let low = -1;
          let currentOffset = tableOffset;
          for (let len = rootBits + 1, step = 2; len <= 15; len++, step <<= 1) for (; count[len] > 0; count[len]--) {
            if ((key & mask) != low) {
              currentOffset += tableSize;
              tableBits = nextTableBitSize(count, len, rootBits);
              tableSize = 1 << tableBits;
              totalSize += tableSize;
              low = key & mask;
              tableGroup[tableOffset + low] = tableBits + rootBits << 16 | currentOffset - tableOffset - low;
            }
            replicateValue(tableGroup, currentOffset + (key >> rootBits), step, tableSize, len - rootBits << 16 | sorted[symbol++]);
            key = getNextKey(key, len);
          }
          return totalSize;
        }
        function doReadMoreInput(s2) {
          if (s2.endOfStreamReached != 0) {
            if (halfAvailable(s2) >= -2) return;
            throw "No more input";
          }
          let readOffset = s2.halfOffset << 1;
          let bytesInBuffer = 4096 - readOffset;
          s2.byteBuffer.copyWithin(0, readOffset, 4096);
          s2.halfOffset = 0;
          while (bytesInBuffer < 4096) {
            let spaceLeft = 4096 - bytesInBuffer;
            let len = readInput(s2.input, s2.byteBuffer, bytesInBuffer, spaceLeft);
            if (len <= 0) {
              s2.endOfStreamReached = 1;
              s2.tailBytes = bytesInBuffer;
              bytesInBuffer += 1;
              break;
            }
            bytesInBuffer += len;
          }
          bytesToNibbles(s2, bytesInBuffer);
        }
        function checkHealth(s2, endOfStream) {
          if (s2.endOfStreamReached == 0) return;
          let byteOffset = (s2.halfOffset << 1) + (s2.bitOffset + 7 >> 3) - 4;
          if (byteOffset > s2.tailBytes) throw "Read after end";
          if (endOfStream != 0 && byteOffset != s2.tailBytes) throw "Unused bytes after end";
        }
        function readFewBits(s2, n2) {
          let val = s2.accumulator32 >>> s2.bitOffset & (1 << n2) - 1;
          s2.bitOffset += n2;
          return val;
        }
        function readManyBits(s2, n2) {
          let low = readFewBits(s2, 16);
          s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
          s2.bitOffset -= 16;
          return low | readFewBits(s2, n2 - 16) << 16;
        }
        function initBitReader(s2) {
          s2.byteBuffer = new Int8Array(4160);
          s2.accumulator32 = 0;
          s2.shortBuffer = new Int16Array(2080);
          s2.bitOffset = 32;
          s2.halfOffset = 2048;
          s2.endOfStreamReached = 0;
          prepare(s2);
        }
        function prepare(s2) {
          if (s2.halfOffset > 2030) doReadMoreInput(s2);
          checkHealth(s2, 0);
          s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
          s2.bitOffset -= 16;
          s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
          s2.bitOffset -= 16;
        }
        function reload(s2) {
          if (s2.bitOffset == 32) prepare(s2);
        }
        function jumpToByteBoundary(s2) {
          let padding = 32 - s2.bitOffset & 7;
          if (padding != 0) {
            if (readFewBits(s2, padding) != 0) throw "Corrupted padding bits";
          }
        }
        function halfAvailable(s2) {
          let limit = 2048;
          if (s2.endOfStreamReached != 0) limit = s2.tailBytes + 1 >> 1;
          return limit - s2.halfOffset;
        }
        function copyRawBytes(s2, data2, offset, length) {
          if ((s2.bitOffset & 7) != 0) throw "Unaligned copyBytes";
          while (s2.bitOffset != 32 && length != 0) {
            data2[offset++] = s2.accumulator32 >>> s2.bitOffset;
            s2.bitOffset += 8;
            length--;
          }
          if (length == 0) return;
          let copyNibbles = min(halfAvailable(s2), length >> 1);
          if (copyNibbles > 0) {
            let readOffset = s2.halfOffset << 1;
            let delta = copyNibbles << 1;
            data2.set(s2.byteBuffer.subarray(readOffset, readOffset + delta), offset);
            offset += delta;
            length -= delta;
            s2.halfOffset += copyNibbles;
          }
          if (length == 0) return;
          if (halfAvailable(s2) > 0) {
            if (s2.bitOffset >= 16) {
              s2.accumulator32 = s2.shortBuffer[s2.halfOffset++] << 16 | s2.accumulator32 >>> 16;
              s2.bitOffset -= 16;
            }
            while (length != 0) {
              data2[offset++] = s2.accumulator32 >>> s2.bitOffset;
              s2.bitOffset += 8;
              length--;
            }
            checkHealth(s2, 0);
            return;
          }
          while (length > 0) {
            let len = readInput(s2.input, data2, offset, length);
            if (len == -1) throw "Unexpected end of input";
            offset += len;
            length -= len;
          }
        }
        function bytesToNibbles(s2, byteLen) {
          let byteBuffer = s2.byteBuffer;
          let halfLen = byteLen >> 1;
          let shortBuffer = s2.shortBuffer;
          for (let i2 = 0; i2 < halfLen; ++i2) shortBuffer[i2] = byteBuffer[i2 * 2] & 255 | (byteBuffer[i2 * 2 + 1] & 255) << 8;
        }
        let LOOKUP = new Int32Array(2048);
        function unpackLookupTable(lookup, map, rle) {
          for (let i2 = 0; i2 < 256; ++i2) {
            lookup[i2] = i2 & 63;
            lookup[512 + i2] = i2 >> 2;
            lookup[1792 + i2] = 2 + (i2 >> 6);
          }
          for (let i2 = 0; i2 < 128; ++i2) lookup[1024 + i2] = 4 * (map.charCodeAt(i2) - 32);
          for (let i2 = 0; i2 < 64; ++i2) {
            lookup[1152 + i2] = i2 & 1;
            lookup[1216 + i2] = 2 + (i2 & 1);
          }
          let offset = 1280;
          for (let k2 = 0; k2 < 19; ++k2) {
            let value = k2 & 3;
            let rep = rle.charCodeAt(k2) - 32;
            for (let i2 = 0; i2 < rep; ++i2) lookup[offset++] = value;
          }
          for (let i2 = 0; i2 < 16; ++i2) {
            lookup[1792 + i2] = 1;
            lookup[2032 + i2] = 6;
          }
          lookup[1792] = 0;
          lookup[2047] = 7;
          for (let i2 = 0; i2 < 256; ++i2) lookup[1536 + i2] = lookup[1792 + i2] << 3;
        }
        unpackLookupTable(LOOKUP, `         !!  !                  "#$##%#$&'##(#)#++++++++++((&*'##,---,---,-----,-----,-----&#'###.///.///./////./////./////&#'# `, "A/*  ':  & : $   @");
        function State() {
          this.ringBuffer = new Int8Array(0);
          this.contextModes = new Int8Array(0);
          this.contextMap = new Int8Array(0);
          this.distContextMap = new Int8Array(0);
          this.distExtraBits = new Int8Array(0);
          this.output = new Int8Array(0);
          this.byteBuffer = new Int8Array(0);
          this.shortBuffer = new Int16Array(0);
          this.intBuffer = new Int32Array(0);
          this.rings = new Int32Array(0);
          this.blockTrees = new Int32Array(0);
          this.literalTreeGroup = new Int32Array(0);
          this.commandTreeGroup = new Int32Array(0);
          this.distanceTreeGroup = new Int32Array(0);
          this.distOffset = new Int32Array(0);
          this.runningState = 0;
          this.nextRunningState = 0;
          this.accumulator32 = 0;
          this.bitOffset = 0;
          this.halfOffset = 0;
          this.tailBytes = 0;
          this.endOfStreamReached = 0;
          this.metaBlockLength = 0;
          this.inputEnd = 0;
          this.isUncompressed = 0;
          this.isMetadata = 0;
          this.literalBlockLength = 0;
          this.numLiteralBlockTypes = 0;
          this.commandBlockLength = 0;
          this.numCommandBlockTypes = 0;
          this.distanceBlockLength = 0;
          this.numDistanceBlockTypes = 0;
          this.pos = 0;
          this.maxDistance = 0;
          this.distRbIdx = 0;
          this.trivialLiteralContext = 0;
          this.literalTreeIdx = 0;
          this.commandTreeIdx = 0;
          this.j = 0;
          this.insertLength = 0;
          this.contextMapSlice = 0;
          this.distContextMapSlice = 0;
          this.contextLookupOffset1 = 0;
          this.contextLookupOffset2 = 0;
          this.distanceCode = 0;
          this.numDirectDistanceCodes = 0;
          this.distancePostfixBits = 0;
          this.distance = 0;
          this.copyLength = 0;
          this.maxBackwardDistance = 0;
          this.maxRingBufferSize = 0;
          this.ringBufferSize = 0;
          this.expectedTotalSize = 0;
          this.outputOffset = 0;
          this.outputLength = 0;
          this.outputUsed = 0;
          this.ringBufferBytesWritten = 0;
          this.ringBufferBytesReady = 0;
          this.isEager = 0;
          this.isLargeWindow = 0;
          this.cdNumChunks = 0;
          this.cdTotalSize = 0;
          this.cdBrIndex = 0;
          this.cdBrOffset = 0;
          this.cdBrLength = 0;
          this.cdBrCopied = 0;
          this.cdChunks = new Array(0);
          this.cdChunkOffsets = new Int32Array(0);
          this.cdBlockBits = 0;
          this.cdBlockMap = new Int8Array(0);
          this.input = null;
          this.ringBuffer = new Int8Array(0);
          this.rings = new Int32Array(10);
          this.rings[0] = 16;
          this.rings[1] = 15;
          this.rings[2] = 11;
          this.rings[3] = 4;
        }
        let data = null;
        let offsets = new Int32Array(32);
        let sizeBits = new Int32Array(32);
        function setData(newData, newSizeBits) {
          if (newSizeBits.length > 31) throw "sizeBits length must be at most 31";
          for (let i2 = 0; i2 < 4; ++i2) if (newSizeBits[i2] != 0) throw "first 4 must be 0";
          let dictionaryOffsets = offsets;
          let dictionarySizeBits = sizeBits;
          dictionarySizeBits.set(newSizeBits.subarray(0, 0 + newSizeBits.length), 0);
          let pos = 0;
          let limit = newData.length;
          for (let i2 = 0; i2 < newSizeBits.length; ++i2) {
            dictionaryOffsets[i2] = pos;
            let bits = dictionarySizeBits[i2];
            if (bits != 0) {
              if (bits >= 31) throw "newSizeBits values must be less than 31";
              pos += i2 << bits;
              if (pos <= 0 || pos > limit) throw "newSizeBits is inconsistent: overflow";
            }
          }
          for (let i2 = newSizeBits.length; i2 < 32; ++i2) dictionaryOffsets[i2] = pos;
          if (pos != limit) throw "newSizeBits is inconsistent: underflow";
          data = newData;
        }
        function unpackDictionaryData(dictionary, data0, data1, skipFlip, sizeBits2, sizeBitsData) {
          let dict = toUsAsciiBytes(data0 + data1);
          if (dict.length != dictionary.length) throw "Corrupted brotli dictionary";
          let offset = 0;
          let n2 = skipFlip.length;
          for (let i2 = 0; i2 < n2; i2 += 2) {
            let skip = skipFlip.charCodeAt(i2) - 36;
            let flip = skipFlip.charCodeAt(i2 + 1) - 36;
            for (let j2 = 0; j2 < skip; ++j2) {
              dict[offset] ^= 3;
              offset++;
            }
            for (let j2 = 0; j2 < flip; ++j2) {
              dict[offset] ^= 236;
              offset++;
            }
          }
          for (let i2 = 0; i2 < sizeBitsData.length; ++i2) sizeBits2[i2] = sizeBitsData.charCodeAt(i2) - 65;
          dictionary.set(dict);
        }
        {
          let dictionaryData = new Int8Array(122784);
          let dictionarySizeBits = new Int32Array(25);
          unpackDictionaryData(dictionaryData, 'wjnfgltmojefofewab`h`lgfgbwbpkltlmozpjwf`jwzlsfmivpwojhfeqfftlqhwf{wzfbqlufqalgzolufelqnallhsobzojufojmfkfosklnfpjgfnlqftlqgolmdwkfnujftejmgsbdfgbzpevookfbgwfqnfb`kbqfbeqlnwqvfnbqhbaofvslmkjdkgbwfobmgmftpfufmmf{w`bpfalwkslpwvpfgnbgfkbmgkfqftkbwmbnfOjmhaoldpjyfabpfkfognbhfnbjmvpfq$*#(klogfmgptjwkMftpqfbgtfqfpjdmwbhfkbufdbnfpffm`boosbwktfoosovpnfmvejonsbqwiljmwkjpojpwdllgmffgtbzptfpwilapnjmgboploldlqj`kvpfpobpwwfbnbqnzellghjmdtjoofbpwtbqgafpwejqfSbdfhmltbtbz-smdnlufwkbmolbgdjufpfoemlwfnv`keffgnbmzql`hj`lmlm`follhkjgfgjfgKlnfqvofklpwbib{jmel`ovaobtpofppkboeplnfpv`kylmf233&lmfp`bqfWjnfqb`faovfelvqtffheb`fklsfdbufkbqgolpwtkfmsbqhhfswsbpppkjsqllnKWNOsobmWzsfglmfpbufhffseobdojmhplogejufwllhqbwfwltmivnswkvpgbqh`bqgejofefbqpwbzhjoowkbweboobvwlfufq-`lnwbohpklsulwfgffsnlgfqfpwwvqmalqmabmgefooqlpfvqo+phjmqlof`lnfb`wpbdfpnffwdlog-isdjwfnubqzefowwkfmpfmggqlsUjft`lsz2-3!?,b=pwlsfopfojfpwlvqsb`h-djesbpw`pp<dqbznfbm%dw8qjgfpklwobwfpbjgqlbgubq#effoilkmqj`hslqwebpw$VB.gfbg?,a=sllqajoowzsfV-P-tllgnvpw1s{8JmelqbmhtjgftbmwtbooofbgX3^8sbvotbufpvqf\'+$ tbjwnbppbqnpdlfpdbjmobmdsbjg"..#ol`hvmjwqllwtbohejqntjef{no!plmdwfpw13s{hjmgqltpwlloelmwnbjopbefpwbqnbsp`lqfqbjmeoltabazpsbmpbzp7s{85s{8bqwpellwqfbotjhjkfbwpwfswqjslqd,obhftfbhwlogElqn`bpwebmpabmhufqzqvmpivozwbph2s{8dlbodqftpoltfgdfjg>!pfwp6s{8-ip<73s{je#+pllmpfbwmlmfwvafyfqlpfmwqffgeb`wjmwldjewkbqn2;s{`bnfkjooalogyllnuljgfbpzqjmdejoosfbhjmjw`lpw0s{8ib`hwbdpajwpqloofgjwhmftmfbq?"..dqltIPLMgvwzMbnfpbofzlv#olwpsbjmibyy`logfzfpejpkttt-qjphwbapsqfu23s{qjpf16s{Aovfgjmd033/abooelqgfbqmtjogal{-ebjqob`hufqpsbjqivmfwf`kje+"sj`hfujo\'+! tbqnolqgglfpsvoo/333jgfbgqbtkvdfpslwevmgavqmkqfe`foohfzpwj`hklvqolppevfo21s{pvjwgfboQPP!bdfgdqfzDFW!fbpfbjnpdjqobjgp;s{8mbuzdqjgwjsp :::tbqpobgz`bqp*8#~sks<kfoowbootklnyk9	),	#233kboo-		B4s{8svpk`kbw3s{8`qft),?,kbpk46s{eobwqbqf#%%#wfoo`bnslmwlobjgnjppphjswfmwejmfnbofdfwpsolw733/		`lloeffw-sks?aq=fqj`nlpwdvjgafoogfp`kbjqnbwkbwln,jnd% ;1ov`h`fmw3338wjmzdlmfkwnopfoogqvdEQFFmlgfmj`h<jg>olpfmvooubpwtjmgQPP#tfbqqfozaffmpbnfgvhfmbpb`bsftjpkdvoeW109kjwppolwdbwfhj`haovqwkfz26s{$$*8*8!=npjftjmpajqgplqwafwbpffhW2;9lqgpwqffnboo53s{ebqnlupalzpX3^-$*8!SLPWafbqhjgp*8~~nbqzwfmg+VH*rvbgyk9\n.pjy....sqls$*8ojewW2:9uj`fbmgzgfaw=QPPsllomf`haoltW259gllqfuboW249ofwpebjolqbosloomlub`lopdfmf#lxplewqlnfwjooqlpp?k0=slvqebgfsjmh?wq=njmj*"+njmfyk9abqpkfbq33*8njoh#..=jqlmeqfggjphtfmwpljosvwp,ip,klozW119JPAMW139bgbnpffp?k1=iplm$/#$`lmwW129#QPPollsbpjbnllm?,s=plvoOJMFelqw`bqwW279?k2=;3s{"..?:s{8W379njhf975Ymj`fjm`kZlqhqj`fyk9\b$**8svqfnbdfsbqbwlmfalmg904Y\\le\\$^*8333/yk9\vwbmhzbqgaltoavpk965YIbub03s{	~	&@0&907YifeeF[SJ`bpkujpbdloepmltyk9rvfq-`pppj`hnfbwnjm-ajmggfookjqfsj`pqfmw905YKWWS.132elwltloeFMG#{al{967YALGZgj`h8	~	f{jw906Yubqpafbw$~*8gjfw:::8bmmf~~?,Xj^-Obmdhn.^tjqfwlzpbggppfbobof{8	\n~f`klmjmf-lqd336*wlmziftppbmgofdpqlle333*#133tjmfdfbqgldpallwdbqz`vwpwzofwfnswjlm-{no`l`hdbmd\'+$-63s{Sk-Gnjp`bobmolbmgfphnjofqzbmvmj{gjp`*8~	gvpw`ojs*-		43s{.133GUGp4^=?wbsfgfnlj((*tbdffvqlskjolswpklofEBRpbpjm.15WobapsfwpVQO#avoh`llh8~	KFBGX3^*baaqivbm+2:;ofpkwtjm?,j=plmzdvzpev`hsjsf.	"331*mgltX2^8X^8	Old#pbow	\n\nabmdwqjnabwk*x	33s{	~*8hl9\0effpbg=p9,,#X^8wloosovd+*x	x	#-ip$133sgvboalbw-ISD*8	~rvlw*8		$*8		~1327132613251324132;132:13131312131113101317131613151314131;131:130313021301130013071306130513041320132113221323133:133;133413351336133713301331133213332:::2::;2::42::52::62::72::02::12::22::32:;:2:;;2:;42:;52:;62:;72:;02:;12:;22:;32:4:2:4;2:442:452:462:472:402:412:422:432:5:2:5;2:542:552:562:572:502:512:522:532:6:2:6;2:642:652:662:672:602:612:622:632333231720:73333::::`lnln/Mpfpwffpwbsfqlwlglkb`f`bgbb/]lajfmg/Abbp/Aujgb`bpllwqlelqlplollwqb`vbogjilpjgldqbmwjslwfnbgfafbodlrv/Efpwlmbgbwqfpsl`l`bpbabilwlgbpjmlbdvbsvfpvmlpbmwfgj`fovjpfoobnbzlylmbbnlqsjpllaqb`oj`foolgjlpklqb`bpj<[<\\<Q<\\<R<P=l<\\=l=o=n<\\<Q<Y<S<R<R=n<T<[<Q<R<X<R=n<R<Z<Y<R<Q<T=i<q<\\<Y<Y<]=g<P=g<~=g=m<R<^=g<^<R<q<R<R<]<s<R<W<T<Q<T<L<H<q<Y<p=g=n=g<r<Q<T<P<X<\\<{<\\<x<\\<q=o<r<]=n<Y<t<[<Y<U<Q=o<P<P<N=g=o<Z5m5f4O5j5i4K5i4U5o5h4O5d4]4C5f4K5m5e5k5d5h5i5h5o4K5d5h5k4D4_4K5h4I5j5k5f4O5f5n4C5k5h4G5i4D5k5h5d5h5f4D5h4K5f4D5o4X5f4K5i4O5i5j4F4D5f5h5j4A4D5k5i5i4X5d4Xejqpwujgflojdkwtlqognfgjbtkjwf`olpfaob`hqjdkwpnbooallhpsob`fnvpj`ejfoglqgfqsljmwubovfofufowbaofalbqgklvpfdqlvstlqhpzfbqppwbwfwlgbztbwfqpwbqwpwzofgfbwksltfqsklmfmjdkwfqqlqjmsvwbalvwwfqnpwjwofwllopfufmwol`bowjnfpobqdftlqgpdbnfppklqwpsb`fel`vp`ofbqnlgfoaol`hdvjgfqbgjlpkbqftlnfmbdbjmnlmfzjnbdfmbnfpzlvmdojmfpobwfq`lolqdqffmeqlmw%bns8tbw`kelq`fsqj`fqvofpafdjmbewfqujpjwjppvfbqfbpafoltjmgf{wlwboklvqpobafosqjmwsqfppavjowojmhppsffgpwvgzwqbgfelvmgpfmpfvmgfqpkltmelqnpqbmdfbggfgpwjoonlufgwbhfmbalufeobpkej{fglewfmlwkfqujftp`kf`hofdboqjufqjwfnprvj`hpkbsfkvnbmf{jpwdljmdnlujfwkjqgabpj`sfb`fpwbdftjgwkoldjmjgfbptqlwfsbdfpvpfqpgqjufpwlqfaqfbhplvwkulj`fpjwfpnlmwktkfqfavjogtkj`kfbqwkelqvnwkqffpslqwsbqwz@oj`holtfqojufp`obppobzfqfmwqzpwlqzvpbdfplvmg`lvqwzlvq#ajqwkslsvswzsfpbssozJnbdfafjmdvssfqmlwfpfufqzpkltpnfbmpf{wqbnbw`kwqb`hhmltmfbqozafdbmpvsfqsbsfqmlqwkofbqmdjufmmbnfgfmgfgWfqnpsbqwpDqlvsaqbmgvpjmdtlnbmebopfqfbgzbvgjlwbhfptkjof-`ln,ojufg`bpfpgbjoz`kjogdqfbwivgdfwklpfvmjwpmfufqaqlbg`lbpw`lufqbssofejofp`z`ofp`fmfsobmp`oj`htqjwfrvffmsjf`ffnbjoeqbnflogfqsklwlojnjw`b`kf`jujop`boffmwfqwkfnfwkfqfwlv`kalvmgqlzbobphfgtklofpjm`fpwl`h#mbnfebjwkkfbqwfnswzleefqp`lsfltmfgnjdkwboavnwkjmhaollgbqqbznbilqwqvpw`bmlmvmjlm`lvmwubojgpwlmfPwzofOldjmkbsszl``vqofew9eqfpkrvjwfejonpdqbgfmffgpvqabmejdkwabpjpklufqbvwl8qlvwf-kwnonj{fgejmboZlvq#pojgfwlsj`aqltmbolmfgqbtmpsojwqfb`kQjdkwgbwfpnbq`krvlwfdllgpOjmhpglvawbpzm`wkvnaboolt`kjfezlvwkmlufo23s{8pfqufvmwjokbmgp@kf`hPsb`frvfqzibnfpfrvbowtj`f3/333Pwbqwsbmfoplmdpqlvmgfjdkwpkjewtlqwkslpwpofbgptffhpbuljgwkfpfnjofpsobmfpnbqwboskbsobmwnbqhpqbwfpsobzp`objnpbofpwf{wppwbqptqlmd?,k0=wkjmd-lqd,nvowjkfbqgSltfqpwbmgwlhfmplojg+wkjpaqjmdpkjsppwbeewqjfg`boopevoozeb`wpbdfmwWkjp#,,..=bgnjmfdzswFufmw26s{8Fnbjowqvf!`qlpppsfmwaoldpal{!=mlwfgofbuf`kjmbpjyfpdvfpw?,k7=qlalwkfbuzwqvf/pfufmdqbmg`qjnfpjdmpbtbqfgbm`fskbpf=?"..fm\\VP% 0:8133s{\\mbnfobwjmfmilzbib{-bwjlmpnjwkV-P-#klogpsfwfqjmgjbmbu!=`kbjmp`lqf`lnfpgljmdsqjlqPkbqf2::3pqlnbmojpwpibsbmeboopwqjboltmfqbdqff?,k1=bavpfbofqwlsfqb!.,,T`bqgpkjoopwfbnpSklwlwqvwk`ofbm-sks<pbjmwnfwboolvjpnfbmwsqlleaqjfeqlt!=dfmqfwqv`hollhpUbovfEqbnf-mfw,..=	?wqz#x	ubq#nbhfp`lpwpsobjmbgvowrvfpwwqbjmobalqkfosp`bvpfnbdj`nlwlqwkfjq163s{ofbpwpwfsp@lvmw`lvogdobpppjgfpevmgpklwfobtbqgnlvwknlufpsbqjpdjufpgvw`kwf{bpeqvjwmvoo/X^8wls!=	?"..SLPW!l`fbm?aq,=eollqpsfbhgfswk#pjyfabmhp`bw`k`kbqw13s{8bojdmgfboptlvog63s{8vqo>!sbqhpnlvpfNlpw#---?,bnlmdaqbjmalgz#mlmf8abpfg`bqqzgqbewqfefqsbdf\\klnf-nfwfqgfobzgqfbnsqlufiljmw?,wq=gqvdp?"..#bsqjojgfboboofmf{b`welqwk`lgfpoldj`Ujft#pffnpaobmhslqwp#+133pbufg\\ojmhdlbopdqbmwdqffhklnfpqjmdpqbwfg03s{8tklpfsbqpf+*8!#Aol`hojmv{ilmfpsj{fo$*8!=*8je+.ofewgbujgklqpfEl`vpqbjpfal{fpWqb`hfnfmw?,fn=abq!=-pq`>wltfqbow>!`baofkfmqz17s{8pfwvsjwbozpkbqsnjmlqwbpwftbmwpwkjp-qfpfwtkffodjqop,`pp,233&8`ovappwveeajaofulwfp#2333hlqfb~*8	abmgprvfvf>#x~8;3s{8`hjmdx	\n\nbkfbg`ol`hjqjpkojhf#qbwjlpwbwpElqn!zbkll*X3^8Balvwejmgp?,k2=gfavdwbphpVQO#>`foop~*+*821s{8sqjnfwfoopwvqmp3{533-isd!psbjmafb`kwb{fpnj`qlbmdfo..=?,djewppwfuf.ojmhalgz-~*8	\nnlvmw#+2::EBR?,qldfqeqbmh@obpp1;s{8effgp?k2=?p`lwwwfpwp11s{8gqjmh*##oftjppkboo 30:8#elq#olufgtbpwf33s{8ib9npjnlm?elmwqfsoznffwpvmwfq`kfbswjdkwAqbmg*#">#gqfpp`ojspqllnplmhfznlajonbjm-Mbnf#sobwfevmmzwqffp`ln,!2-isdtnlgfsbqbnPWBQWofew#jggfm/#132*8	~	elqn-ujqvp`kbjqwqbmptlqpwSbdfpjwjlmsbw`k?"..	l.`b`ejqnpwlvqp/333#bpjbmj((*xbglaf$*X3^jg>23alwk8nfmv#-1-nj-smd!hfujm`lb`k@kjogaqv`f1-isdVQO*(-isdpvjwfpoj`fkbqqz213!#ptffwwq=	mbnf>gjfdlsbdf#ptjpp..=		 eee8!=Old-`ln!wqfbwpkffw*#%%#27s{8poffsmwfmwejofgib9ojg>!`Mbnf!tlqpfpklwp.al{.gfowb	%ow8afbqp97;Y?gbwb.qvqbo?,b=#psfmgabhfqpklsp>#!!8sks!=`wjlm20s{8aqjbmkfoolpjyf>l>&1E#iljmnbzaf?jnd#jnd!=/#eipjnd!#!*X3^NWlsAWzsf!mftozGbmph`yf`kwqbjohmltp?,k6=ebr!=yk.`m23*8	.2!*8wzsf>aovfpwqvozgbujp-ip$8=	?"pwffo#zlv#k1=	elqn#ifpvp233&#nfmv-	\n	tbofpqjphpvnfmwggjmda.ojhwfb`kdje!#ufdbpgbmphffpwjpkrjspvlnjplaqfgfpgffmwqfwlglpsvfgfb/]lpfpw/Mwjfmfkbpwblwqlpsbqwfglmgfmvfulkb`fqelqnbnjpnlnfilqnvmglbrv/Ag/Abpp/_olbzvgbef`kbwlgbpwbmwlnfmlpgbwlplwqbppjwjlnv`klbklqbovdbqnbzlqfpwlpklqbpwfmfqbmwfpelwlpfpwbpsb/Apmvfubpbovgelqlpnfgjlrvjfmnfpfpslgfq`kjofpfq/Muf`fpgf`jqilp/Efpwbqufmwbdqvslkf`klfoolpwfmdlbnjdl`lpbpmjufodfmwfnjpnbbjqfpivojlwfnbpkb`jbebulqivmjlojaqfsvmwlavfmlbvwlqbaqjoavfmbwf{wlnbqylpbafqojpwbovfdl`/_nlfmfqlivfdlsfq/Vkbafqfpwlzmvm`bnvifqubolqevfqbojaqldvpwbjdvboulwlp`bplpdv/Absvfglplnlpbujplvpwfggfafmml`kfavp`bebowbfvqlppfqjfgj`kl`vqpl`obuf`bpbpof/_msobylobqdllaqbpujpwbbslzlivmwlwqbwbujpwl`qfbq`bnslkfnlp`jm`l`bqdlsjplplqgfmkb`fm/Mqfbgjp`lsfgql`fq`bsvfgbsbsfonfmlq/Vwjo`obqlilqdf`boofslmfqwbqgfmbgjfnbq`bpjdvffoobppjdol`l`kfnlwlpnbgqf`obpfqfpwlmj/]lrvfgbsbpbqabm`lkjilpujbifsbaol/Epwfujfmfqfjmlgfibqelmgl`bmbomlqwfofwqb`bvpbwlnbqnbmlpovmfpbvwlpujoobufmglsfpbqwjslpwfmdbnbq`loofubsbgqfvmjglubnlpylmbpbnalpabmgbnbqjbbavplnv`kbpvajqqjlibujujqdqbgl`kj`bboo/Ailufmgj`kbfpwbmwbofppbojqpvfolsfplpejmfpoobnbavp`l/Epwboofdbmfdqlsobybkvnlqsbdbqivmwbglaofjpobpalopbab/]lkbaobov`kb/mqfbgj`fmivdbqmlwbpuboofboo/M`bqdbglolqbabilfpw/Edvpwlnfmwfnbqjlejqnb`lpwlej`kbsobwbkldbqbqwfpofzfpbrvfonvpflabpfpsl`lpnjwbg`jfol`kj`lnjfgldbmbqpbmwlfwbsbgfafpsobzbqfgfppjfwf`lqwf`lqfbgvgbpgfpflujfilgfpfbbdvbp%rvlw8glnbjm`lnnlmpwbwvpfufmwpnbpwfqpzpwfnb`wjlmabmmfqqfnlufp`qloovsgbwfdolabonfgjvnejowfqmvnafq`kbmdfqfpvowsvaoj`p`qffm`kllpfmlqnbowqbufojppvfpplvq`fwbqdfwpsqjmdnlgvofnlajofptjw`ksklwlpalqgfqqfdjlmjwpfoepl`jbob`wjuf`lovnmqf`lqgelooltwjwof=fjwkfqofmdwkebnjozeqjfmgobzlvwbvwklq`qfbwfqfujftpvnnfqpfqufqsobzfgsobzfqf{sbmgsloj`zelqnbwglvaofsljmwppfqjfpsfqplmojujmdgfpjdmnlmwkpelq`fpvmjrvftfjdkwsflsoffmfqdzmbwvqfpfbq`kejdvqfkbujmd`vpwlnleepfwofwwfqtjmgltpvanjwqfmgfqdqlvspvsolbgkfbowknfwklgujgflpp`klloevwvqfpkbgltgfabwfubovfpLaif`wlwkfqpqjdkwpofbdvf`kqlnfpjnsofmlwj`fpkbqfgfmgjmdpfbplmqfslqwlmojmfprvbqfavwwlmjnbdfpfmbaofnlujmdobwfpwtjmwfqEqbm`fsfqjlgpwqlmdqfsfbwOlmglmgfwbjoelqnfggfnbmgpf`vqfsbppfgwlddofsob`fpgfuj`fpwbwj``jwjfppwqfbnzfooltbwwb`hpwqffweojdkwkjggfmjmel!=lsfmfgvpfevouboofz`bvpfpofbgfqpf`qfwpf`lmggbnbdfpslqwpf{`fswqbwjmdpjdmfgwkjmdpfeef`wejfogppwbwfpleej`fujpvbofgjwlqulovnfQfslqwnvpfvnnlujfpsbqfmwb``fppnlpwoznlwkfq!#jg>!nbqhfwdqlvmg`kbm`fpvqufzafelqfpznalonlnfmwpsff`knlwjlmjmpjgfnbwwfq@fmwfqlaif`wf{jpwpnjggofFvqlsfdqltwkofdb`znbmmfqfmlvdk`bqffqbmptfqlqjdjmslqwbo`ojfmwpfof`wqbmgln`olpfgwlsj`p`lnjmdebwkfqlswjlmpjnsozqbjpfgfp`bsf`klpfm`kvq`kgfejmfqfbplm`lqmfqlvwsvwnfnlqzjeqbnfsloj`fnlgfopMvnafqgvqjmdleefqppwzofphjoofgojpwfg`boofgpjoufqnbqdjmgfofwfafwwfqaqltpfojnjwpDolabopjmdoftjgdfw`fmwfqavgdfwmltqbs`qfgjw`objnpfmdjmfpbefwz`klj`fpsjqjw.pwzofpsqfbgnbhjmdmffgfgqvppjbsofbpff{wfmwP`qjswaqlhfmbooltp`kbqdfgjujgfeb`wlqnfnafq.abpfgwkflqz`lmejdbqlvmgtlqhfgkfosfg@kvq`kjnsb`wpklvogbotbzpoldl!#alwwlnojpw!=*xubq#sqfej{lqbmdfKfbgfq-svpk+`lvsofdbqgfmaqjgdfobvm`kQfujftwbhjmdujpjlmojwwofgbwjmdAvwwlmafbvwzwkfnfpelqdlwPfbq`kbm`klqbonlpwolbgfg@kbmdfqfwvqmpwqjmdqfolbgNlajofjm`lnfpvssozPlvq`flqgfqpujftfg%maps8`lvqpfBalvw#jpobmg?kwno#`llhjfmbnf>!bnbylmnlgfqmbguj`fjm?,b=9#Wkf#gjboldklvpfpAFDJM#Nf{j`lpwbqwp`fmwqfkfjdkwbggjmdJpobmgbppfwpFnsjqfP`kllofeelqwgjqf`wmfbqoznbmvboPfof`w-		Lmfiljmfgnfmv!=SkjojsbtbqgpkbmgofjnslqwLeej`fqfdbqgphjoopmbwjlmPslqwpgfdqfftffhoz#+f-d-afkjmggl`wlqolddfgvmjwfg?,a=?,afdjmpsobmwpbppjpwbqwjpwjppvfg033s{`bmbgbbdfm`zp`kfnfqfnbjmAqbyjopbnsofoldl!=afzlmg.p`bofb``fswpfqufgnbqjmfEllwfq`bnfqb?,k2=	\\elqn!ofbufppwqfpp!#,=	-dje!#lmolbgolbgfqL{elqgpjpwfqpvqujuojpwfmefnbofGfpjdmpjyf>!bssfbowf{w!=ofufopwkbmhpkjdkfqelq`fgbmjnbobmzlmfBeqj`bbdqffgqf`fmwSflsof?aq#,=tlmgfqsqj`fpwvqmfg#x~8nbjm!=jmojmfpvmgbztqbs!=ebjofg`fmpvpnjmvwfafb`lmrvlwfp263s{fpwbwfqfnlwffnbjo!ojmhfgqjdkw8pjdmboelqnbo2-kwnopjdmvssqjm`feolbw9-smd!#elqvn-B``fppsbsfqpplvmgpf{wfmgKfjdkwpojgfqVWE.;!%bns8#Afelqf-#TjwkpwvgjlltmfqpnbmbdfsqlejwiRvfqzbmmvbosbqbnpalvdkwebnlvpdlldofolmdfqj((*#xjpqbfopbzjmdgf`jgfklnf!=kfbgfqfmpvqfaqbm`ksjf`fpaol`h8pwbwfgwls!=?qb`jmdqfpjyf..%dw8sb`jwzpf{vboavqfbv-isd!#23/333lawbjmwjwofpbnlvmw/#Jm`-`lnfgznfmv!#ozqj`pwlgbz-jmgffg`lvmwz\\oldl-EbnjozollhfgNbqhfwopf#jeSobzfqwvqhfz*8ubq#elqfpwdjujmdfqqlqpGlnbjm~fopfxjmpfqwAold?,ellwfqoldjm-ebpwfqbdfmwp?algz#23s{#3sqbdnbeqjgbzivmjlqgloobqsob`fg`lufqpsovdjm6/333#sbdf!=alpwlm-wfpw+bubwbqwfpwfg\\`lvmwelqvnpp`kfnbjmgf{/ejoofgpkbqfpqfbgfqbofqw+bssfbqPvanjwojmf!=algz!=	)#WkfWklvdkpffjmdifqpfzMftp?,ufqjezf{sfqwjmivqztjgwk>@llhjfPWBQW#b`qlpp\\jnbdfwkqfbgmbwjufsl`hfwal{!=	Pzpwfn#Gbujg`bm`fqwbaofpsqlufgBsqjo#qfboozgqjufqjwfn!=nlqf!=albqgp`lolqp`bnsvpejqpw##X^8nfgjb-dvjwbqejmjpktjgwk9pkltfgLwkfq#-sks!#bppvnfobzfqptjoplmpwlqfpqfojfeptfgfm@vpwlnfbpjoz#zlvq#Pwqjmd		Tkjowbzolq`ofbq9qfplqweqfm`kwklvdk!*#(#!?algz=avzjmdaqbmgpNfnafqmbnf!=lssjmdpf`wlq6s{8!=upsb`fslpwfqnbilq#`leeffnbqwjmnbwvqfkbssfm?,mbu=hbmpbpojmh!=Jnbdfp>ebopftkjof#kpsb`f3%bns8#		Jm##sltfqSlophj.`lolqilqgbmAlwwlnPwbqw#.`lvmw1-kwnomftp!=32-isdLmojmf.qjdkwnjoofqpfmjlqJPAM#33/333#dvjgfpubovf*f`wjlmqfsbjq-{no!##qjdkwp-kwno.aol`hqfdF{s9klufqtjwkjmujqdjmsklmfp?,wq=vpjmd#	\nubq#=$*8	\n?,wg=	?,wq=	abkbpbaqbpjodbofdlnbdzbqslophjpqsphj4]4C5d\bTA\nzk\vBl\bQ\vUmGx\bSM\nmC\bTA	wQ\nd}\bW@\bTl\bTF	i@	cT\vBM\v|jBV	qw	cC\bWI\npa	fM\n{Z{X\bTF\bVV\bVK	mkF	[]\bPm\bTv\nsI\vpg	[I\bQpmx\v_W\n^M\npe\vQ}\vGu\nel\npeChBV\bTA	So\nzk\vGL\vxD\nd[JzMY\bQpli\nfl\npC{BNt\vwT	i_\bTgQQ\n|p\vXN\bQS\vxDQC\bWZ	pD\vVS\bTWNtYh\nzuKjN}	wr	Ha\n_D	j`\vQ}\vWp\nxZ{c	ji	BU\nbDa|	Tn	pV\nZd\nmC\vEV{X	c}	To\bWl\bUd	IQ	cg\vxs\nXW	wR\vek	c}	]y	Jn\nrp\neg\npV\nz\\{W\npl\nz\\\nzU	Pc	`{\bV@\nc|\bRw	i_\bVb\nwX	HvSu\bTF\v_W\vWs\vsIm\nTT\ndc	US	}f	iZ\bWz	c}MD	Be	iD\v@@\bTl\bPv	}tSwM`\vnU	kW\ved\nqo\vxY	A|\bTz\vy`BRBM	iaXU\nyun^	fL	iI\nXW	fD\bWz\bW@	yj	m	av	BN\vb\\	pD\bTf\nY[	Jn\bQy	[^\vWc\vyuDlCJ\vWj\vHR	`V\vuW	Qy\np@\vGuplJm\bW[\nLP\nxC\n`m	wQuiR\nbI	wQ	BZ	WVBR\npg	cgtiCW\n_y	Rg\bQa\vQB\vWc\nYble\ngESu\nL[	Q	ea	dj\v]W\nb~M`	wL\bTV\bVH\nt\npl	|bs_\bU|\bTaoQlvSkM`\bTv\vK}\nfl	cCoQBR	Hk	|d\bQp	HK	BZ\vHR\bPv\vLx\vEZ\bT\bTv	iDoDMU\vwBSuk`St\ntC	Pl	Kg\noi	jY\vxYh}\nzk\bWZ	m\ve`	TB	fE\nzk	`zYh\nV|	HK	AJ	AJ\bUL	p\\	ql\nYcKd\nfyYh	[I\vDgJm\n]n\nlb\bUd\n{Z	lu	fsoQ\bTWJm\vwB	eaYhBC	sb	Tn\nzU\n_y\vxY	Q]\ngwmt	O\\\ntb\bWW\bQy	mI	V[\ny\\\naB\vRb	wQ\n]QQJ\bWg\vWa\bQj\ntC\bVH\nYm\vxs\bVK\nel\bWI\vxYCq\ntR\vHV\bTl\bVw	ay\bQa\bVV	}t	dj\nr|	p\\	wR\n{i\nTT	[I	i[	AJ\vxs\v_W	d{\vQ}	cg	Tz	A|	Cj\vLmN}m\nbK	dZ	p\\	`V	sV\np@	iD	wQ\vQ}\bTfkaJm\v@@\bV`	zp\n@NSw	iI	cg\noiSu\bVwloCy	c}\vb\\	sUBA\bWI\bTf\nxS	Vp\nd|\bTV\vbC	NoJu\nTC	|`\n{Z	D]\bU|	c}lm\bTl	Bv	Pl	c}\bQp	m\nLk	kj\n@NSbKO	j_	p\\\nzU\bTl\bTg\bWI	cfXO\bWW\ndzli	BN\nd[\bWOMD\vKC	dj	I_\bVV\ny\\\vLmxl	xB	kV\vb\\\vJW\vVS	Vx\vxD	d{MD\bTa	|`\vPzR}\vWsBM\nsICN\bTaJm\npe	i_\npV\nrh	Rd	Hv\n~A\nxR\vWh\vWk\nxS\vAz\vwX\nbIoQ	fw\nqI\nV|\nunz\vpg	d\\\voA{D	i_xB\bT	`Vqr	TTg]CA\vuR	VJ	T`\npw\vRb	I_\nCxRo\vsICjKh	Bv	WVBBoD{D\nhcKm\v^R	QE\n{I\np@\nc|Gt	c}Dl\nzUqN	sVk}	Hh\v|j\nqou|	Q]\vekZM`St\npe	dj\bVG\veE	m\vWc|I\n[W	fL\bT	BZSu\vKaCqNtY[\nqI\bTv	fM	i@	}fB\\	Qy\vBl\bWgXDkc\vx[\bVV	Q]	a	Py\vxD\nfI	}foD	dj	SGls	~DCN\n{Z	\\v\n_D\nhc\vx_C[	AJ\nLM	VxCI	bj	c^	cF\ntCSx	wrXA\bU\\	|a\vK\\\bTV\bVj\nd|	fsCX\ntb\bRw	Vx	AE	A|\bTNt\vDg	Vc\bTld@\npo	M	cF\npe	iZ	Bo\bSq\nfHl`\bTx\bWf	HE\vF{	cO	fD\nlm\vfZ\nlm\veU	dGBH\bTV	SiMW\nwX\nz\\	\\cCX\nd}	l}\bQp\bTV	F~\bQ	`i\ng@nO\bUd\bTl\nL[	wQ	ji\ntC	|J\nLU\naB\vxYKj	AJuN	i[\npeSk\vDg\vx]\bVb\bVV\nea	kV\nqI\bTaSk\nAO	pD\ntb\nts\nyi\bVg	i_\v_W\nLkNt	yj	fMR	iI\bTl\vwX	sV\vMl\nyu	AJ\bVjKO	WV\vA}\vW\nrp	iD\v|olv\vsIBM	d~	CU\bVbeV\npC\vwT	j`	c}\vxs\vps\vvh	WV\vGg\vAe\vVK\v]W	rg\vWcF`	Br\vb\\	dZ\bQp\nqIkF\nLk\vAR\bWI\bTg	bs	dw\n{L\n_y	iZ\bTA	lg\bVV\bTl	dk\n`k	a{	i_{Awj	wN\v@@\bTe	i_\n_D	wL\nAH\viK\vek\n[]	p_	yj\bTv	US	[r\n{I\npsGt\vVK\nplS}\vWP	|dMD\vHV\bTR}M`\bTV\bVHlvCh\bW[Ke	R{\v^R	ab	BZ	VA	B`\nd|\nhsKe	BeOi	R{	d\\nB\bWZ	dZ	VJOs	muQ\vhZQ@QQ\nfI\bW[B\\li\nzU\nMdM`\nxS\bVV\n\\}\vxD	m\bTpIS\nc|	kVi~	V{\vhZ	|b\bWt\n@R\voA\vnU\bWI	ea	B`	iD	c}	TzBR\vQBNj	CP	[I\bTv	`WuN\vpg\vpg\vWc	iT	bs	wL	U_	c\\	|h\vKa	Nr	fL\nq|\nzu\nz\\	Nr\bUg	|bm`\bTv\nyd\nrp\bWf	UXBV\nzk\nd}	wQ	}fCe\ved\bTW\bSB\nxU	cn\bTb\ne	a\\	SG\bU|\npV\nN\\Kn\vnU	At	pD\v^R\vIrb[	R{	dE\vxD\vWK\vWA\bQL\bW@Su\bUd\nDM	PcCADloQ	Hswiub\na\bQpOb\nLP\bTlY[\vK}	AJ\bQn^\vsA\bSM\nqM\bWZ\n^W\vz{S|	fD\bVK\bTv\bPvBB	CPdF	id\vxsmx\vws	cC\ntC	ycM`\vW\nrh\bQp\vxD\\o\nsI_k\nzukF	fDXsXO	jp\bTvBS{B	Br\nzQ\nbI	c{BDBVnO\bTF	caJd	fL	PV	I_\nlK`o	wX\npa	gu\bP}{^\bWf\n{I	BN\npaKl\vpg	cn	fL\vvhCq\bTl\vnU\bSqCm	wR\bUJ\npe\nyd\nYgCy\vKW	fD\neaoQ	j_	BvnM\vID\bTa\nzApl\n]n\bTa	R{	fr\n_y\bUg{Xkk\vxD|Ixl\nfyCe\vwB\nLk\vd]\noi\n}h	Q]\npe\bVwHkOQ\nzk	AJ\npV\bPv\ny\\	A{Oi\bSBXA\veE	jp\nq}	iDqN\v^R	m	iZ	Br\bVg\noi\n\\X	U_\nc|\vHV\bTf	Tn\\N\\N\nuBlv\nyu	Td\bTf\bPL\v]W	dG\nA`\nw^\ngI\npe	dw\nz\\ia\bWZ	cFJm\n{Z\bWO_kDfRR	d\\\bVV\vxsBNtilm	Td	]y\vHV	So\v|jXX	A|\vZ^\vGu\bTWM`kF\vhZ\vVK	dG\vBl	ay\nxUqEnO\bVw\nqICX\ne	Pl\bWO\vLm	dLuHCm	dTfn\vwBka\vnU\n@M\nyT	Hv	\\}Kh	d~Yhk}\neR	d\\\bWI	|b	HK	iD\bTWMY\npl\bQ_	wr\vAx	HE\bTg\bSqvp\vb\\\bWO\nOl\nsI\nfy\vID	\\c\n{Z\n^~\npe\nAO	TT\vxvk_\bWO\v|j\vwB	Qy	i@	Pl	Ha	dZk}ra	UT\vJc\ved\np@	QN\nd|	kj	HkM`\noi	wr	d\\\nlq\no_\nlb\nL[	acBBBHCm\npl	IQ\bVK\vxs\n`e\viK\npaOi	US\bTp	fD\nPGkkXA\nz\\\neg\vWh	wRqN\nqS	cnlo\nxS\n^W	BU\nt	HE	p\\	fF	fw\bVV\bW@	ak\vVKls	VJ\bVV\veE\\o\nyX\nYmM`lL\nd|\nzk	A{sE	wQXT\nt	Pl	]y\vwT{pMD\vb\\	Q]Kj	Jn\nAH\vRb	BU	HK	\\c\nfIm\nqM\n@R	So\noiBT	Hv\n_yKh	BZ	]i\bUJ	V{Sr\nbI\vGg	a_\bTR\nfI\nfl	[K	IIS|\vuW	iI\bWI\nqI\v|jBV\bVg\bWZkF\vx]\bTA	ab	fr	i@	Jd	Jd\vps\nAO\bTaxu	iD\nzk	|d	|`\bW[	lP	dG\bVV\vw}\vqO	i[\bQ\bTz\vVF	wNts	dw\bTv\neS\ngi	NryS\npe\bVV\bSq\n`m	yj	BZ\vWX\bSB	c\\\nUR	[J	c_nM\bWQ\vAx\nMd	Brui\vxY\bSM\vWc\v|j\vxs	}Q	BO\bPL\bWW	fM\nAO	Pc\veUe^\bTg\nqI	ac\bPv	cFoQ	Q\vhZka\nz\\	iK	BU\n`k	CPS|M`\n{I	S{_O	BZZiSk	ps	p\\\nYu\n]s\nxC\bWt\nbD	kV\vGuyS\nqA	[r\neKM`	dZlL\bUg\bTl\nbD	US\vb\\	pV\nccS\\	ct	`z\bPL\vWs\nA`\neg\bSquECR\vDg	`W\vz{\vWcSkSk	bW\bUg	ea\nxZ	iI	UX	VJ\nqn	S{\vRb\bTQ\nplGt\vuWuj\npF\nqI	fL	[I	iaXO\nyu\vDg\ved	q{VG\bQka	Vj	kV	xB\nd|\np@	QN	Pc	ps]j	kV	oU\bTp\nzUnB\vB]	a{\bV@\n]nm`	cz	R{m`\bQa\vwT\bSMMYqN	dj~s\vQ}MY\vMB	Bv	wR\bRg\vQ}	ql\vKC\nrmxuCC\vwB\vvh	BqXq\npV	i_ObuE\nbd\nqo\v{i\nC~	BL\veEuH\bVjEyGz\vzR\v{i	cf\n{Z\n]nXA\vGu\vnU	hS\vGI\nCc	HE\bTA	HBBHCj\nCc\bTF	HE\nXI	A{\bQ	c\\\vmO\vWX\nfH\np@MY\bTF\nlK	Bt\nzU	TTKm\vwT\npV\ndt\vyI	Vx	Q	Rg	Td\nzU\bRS\nLM	wAnM	Tn\ndS	]g\nLc\vwB	}t	[I	CPkX\vFm\vhZm	i[\np@\vQ}\vW	|d\nMO\nMd	f_	fD	cJ	Hz\vRb	io	PyY[\nxU	ct\v@@	ww\bPvBMFF\ntbv|\vKm	Bq	BqKh`o\nZdXU	i]	|`	StB\\\bQ\v_W	TJ\nqI	|a	A{\vuPMD	Pl\nxR	fL\vws	c{	d\\\bV`\neg	HKkc\nd|\bVV\ny\\kc	i]\bVG	`V	ss	I_	AE	bs	du\nel	pD\vW\nqslv\bSMZi\vVKia\vQB	Q\n{Z\bPt\vKl\nlK\nhs\ndS\bVKmf\nd^	kV	cO\nc|\bVH	\\]\bTv\bSq	mI\vDg	VJ	cn\ny\\\bVg\bTv\nyX\bTF	]]\bTp\noi\nhs\veU\nBf	djMr\n|p	\\g	]r\bVb{D\nd[XN	fM	O\\s_	cf	iZXN\vWc	qv\n`m	U^oD\nd|\vGg	dE\vwflou}\nd|oQ	`iOi\vxD\ndZ\nCxYw\nzk\ntb\ngw	yj	B`\nyX\vps\ntC\vpP\vqw\bPu\bPX	Dm\npwNj	ss	aG\vxs\bPt\noLGz	Ok	i@	i]eC	IQ	ii	dj\v@J	|duh\bWZ\veU\vnU\bTa	cCg]\nzkYh\bVK\nLU\np@\ntb\ntR	Cj\vNP	i@\bP{\n\\}\n{c\nwX	fL\bVG	c{	|`	AJ	|C	fDln	|d	bs\nqI{B\vAx\np@\nzk\vRbOs\vWSe^\vD_	Bv\vWd\bVb\vxs\veE\bRw\n]n\n|p\vg|	fwkc\bTIka\n\\TSp	ju\vps\npeu|\vGr\bVe	CU]MXU\vxD\bTa	IQ\vWq	CU	am	dj\bSoSw\vnUCh	Q]s_\bPt	fS\bTa	\\}\n@OYc	UZ\bTx\npe\vnU\nzU	|}	iD\nz\\\bSM\vxDBR\nzQ	QN]MYh\nLP\vFm\vLXvc\vqlka	HK\bVb\ntC\nCy\bTv\nuVoQ	`z	[I	B`\vRb	yj	sb\vWs\bTl	kV\ved\nelL\vxN	m\nJn	jY\vxD\bVb\bSq\vyu	wL\vXL\bTA	pg	At	nDXX	wR\npl\nhwyS\nps	cO\bW[\v|jXN	sV	p\\	Be\nb~\nAJ\n]ek`qN	dw	WV	HE\vEVJz	id	B`	zhE]	fD\bTgqN\bTa	jaCv\bSM\nhc\bUet_	ieg]	wQ\nPn\bVB	jw\bVg\vbE	BZ\vRH\bP{	jp\n\\}	a_	cC	|a\vD]	BZ	i[	fD\vxW\no_	d\\\n_D\ntb	\\c	AJ\nlKoQlo\vLx\vM@\bWZKn\vpg\nTi\nIv\n|r\v@}JzLmWhk}ln\vxD\n]sgc\vps	Br\bTW\vBMtZ\nBYDW	jf\vSWC}\nqo	dE	mv	IQ\bPP\bUblvBC\nzQ	[I\vgl\nig\bUsBT\vbC\bSq	sU	iW\nJn	SY	HK	rg\npV\vID\v|jKO	`S	|a`vbmglfmujbqnbgqjgavp`bqjmj`jlwjfnslslqrvf`vfmwbfpwbglsvfgfmivfdlp`lmwqbfpw/Mmmlnaqfwjfmfmsfqejonbmfqbbnjdlp`jvgbg`fmwqlbvmrvfsvfgfpgfmwqlsqjnfqsqf`jlpfd/Vmavfmlpuloufqsvmwlppfnbmbkba/Abbdlpwlmvfulpvmjglp`bqolpfrvjslmj/]lpnv`klpbodvmb`lqqfljnbdfmsbqwjqbqqjabnbq/Abklnaqffnsoflufqgbg`bnajlnv`kbpevfqlmsbpbglo/Amfbsbqf`fmvfubp`vqplpfpwbabrvjfqlojaqlp`vbmwlb``fplnjdvfoubqjlp`vbwqlwjfmfpdqvslppfq/Mmfvqlsbnfgjlpeqfmwfb`fq`bgfn/Mplefqwb`l`kfpnlgfoljwbojbofwqbpbod/Vm`lnsqb`vbofpf{jpwf`vfqslpjfmglsqfmpboofdbqujbifpgjmfqlnvq`jbslgq/Msvfpwlgjbqjlsvfaolrvjfqfnbmvfosqlsjl`qjpjp`jfqwlpfdvqlnvfqwfevfmwf`fqqbqdqbmgffef`wlsbqwfpnfgjgbsqlsjbleqf`fwjfqqbf.nbjoubqjbpelqnbpevwvqllaifwlpfdvjqqjfpdlmlqnbpnjpnlp/Vmj`l`bnjmlpjwjlpqby/_mgfajglsqvfabwlofglwfm/Abifp/Vpfpsfql`l`jmblqjdfmwjfmgb`jfmwl`/Mgjykbaobqpfq/Abobwjmbevfqybfpwjoldvfqqbfmwqbq/E{jwlo/_sfybdfmgbu/Agflfujwbqsbdjmbnfwqlpibujfqsbgqfpe/M`jo`bafyb/Mqfbppbojgbfmu/Alibs/_mbavplpajfmfpwf{wlpoofubqsvfgbmevfqwf`ln/Vm`obpfpkvnbmlwfmjglajoablvmjgbgfpw/Mpfgjwbq`qfbgl<X<W=c=k=n<R<V<\\<V<T<W<T=a=n<R<^=m<Y<Y<_<R<S=l<T=n<\\<V<Y=e<Y=o<Z<Y<v<\\<V<]<Y<[<]=g<W<R<Q<T<~=m<Y<S<R<X<A=n<R=n<R<P=k<Y<P<Q<Y=n<W<Y=n=l<\\<[<R<Q<\\<_<X<Y<P<Q<Y<x<W=c<s=l<T<Q<\\=m<Q<T=i=n<Y<P<V=n<R<_<R<X<^<R=n=n<\\<P<M<D<|<P<\\=c<K=n<R<^<\\=m<^<\\<P<Y<P=o<N<\\<V<X<^<\\<Q<\\<P=a=n<T=a=n=o<~<\\<P=n<Y=i<S=l<R=n=o=n<Q<\\<X<X<Q=c<~<R=n=n=l<T<Q<Y<U<~<\\=m<Q<T<P=m<\\<P=n<R=n=l=o<]<r<Q<T<P<T=l<Q<Y<Y<r<r<r<W<T=j=a=n<\\<r<Q<\\<Q<Y<P<X<R<P<P<R<U<X<^<Y<R<Q<R=m=o<X\fHy\fIk\fHU\fId\fHy\fIl\fHT\fIk\fHy\fHR\fHy\fIg\fHx\fH\\\fHF\fH\\\fHD\fIk\fHc\fHy\fHy\fHS\fHA\fIl\fHk\fHT\fHy\fH\\\fHH\fIg\fHU\fIg\fHj\fHF\fHU\fIl\fHC\fHU\fHC\fHR\fHH\fHy\fHI\fHRibdqbm\fHj\fHp\fHp\fIg\fHi\fH@\fHJ\fIg\fH{\fHd\fHp\fHR\fH{\fHc\fHU\fHB\fHk\fHD\fHY\fHU\fHC\fIk\fHI\fIk\fHI\fIl\fHt\fH\\\fHp\fH@\fHJ\fIl\fHy\fHd\fHp\fIl\fHY\fIk\fHD\fHd\fHD\fHc\fHU\fH\\\fHe\fHT\fHB\fIk\fHy\fHB\fHY\fIg\fH^\fIk\fHT\fH@\fHB\fHd\fHJ\fIk\fH\fH\\\fHj\fHB\fH@\fHT\fHA\fH\\\fH@\fHD\fHv\fH^\fHB\fHD\fHj\fH{\fHT\fIl\fH^\fIl4U5h5e4I5h5e5k4\\4K4N4B4]4U4C4C4K5h5e5k4\\5k4Y5d4]4V5f4]5o4K5j5d5h4K4D5f5j4U4]4Z4\\5h5o5k5j4K5f5d5i5n4K5h4U5h5f4K5j4K5h5o5j4A4F5e5n4D5h5d4A4E4K4B4]5m5n4[4U4D4C4]5o5j4I4\\4K5o5i4K4K4A4C4I5h4K5m5f5k4D4U4Z5o5f5m4D4A4G5d5i5j5d5k5d4O5j4K4@4C4K5h5k4K4_5h5i4U5j4C5h5f4_4U4D4]4Y5h5e5i5j4\\4D5k4K4O5j5k5i4G5h5o5j4F4K5h4K4A5f4G5i4Y4]4X4]4A4A5d5h5d5m5f4K4\\4K5h5o5h5i4]4E4K5j4F4K5h5m4O4D5d4B4K4Y4O5j4F4K5j5k4K5h5f4U4Z5d5d5n4C4K4D5j4B5f4]4D5j4F5h5o5i4X4K4M5d5k5f4K4D5d5n4Y4Y5d5i4K4]5n5i4O4A4C5j4A5j4U4C5i4]4O5f4K4A4E5o4F4D4C5d5j5f4@4D5i5j5k4F4A4F4@5k4E4_5j4E5f4F5i5o4]4E4V4^4E5j5m4_4D5f4F5h5h5k5h5j4K4F5h5o5n5h4D5h5i4K4U5j5k4O5d5h4X5f4M5j5d4]4O5i4K5m5f5o4D5o5h4\\4K4F4]4F4D4D4O5j5k5i4_4K5j5o4D5f4U5m5n4C4A4_5j5h5k5i4X4U4]4O5k5h4X5k4]5n4[4]4[5h4Dsqlejofpfquj`fgfebvowkjnpfoegfwbjop`lmwfmwpvsslqwpwbqwfgnfppbdfpv``fppebpkjlm?wjwof=`lvmwqzb``lvmw`qfbwfgpwlqjfpqfpvowpqvmmjmdsql`fpptqjwjmdlaif`wpujpjaoftfo`lnfbqwj`ofvmhmltmmfwtlqh`lnsbmzgzmbnj`aqltpfqsqjub`zsqlaofnPfquj`fqfpsf`wgjpsobzqfrvfpwqfpfquftfapjwfkjpwlqzeqjfmgplswjlmptlqhjmdufqpjlmnjoojlm`kbmmfotjmglt-bggqfppujpjwfgtfbwkfq`lqqf`wsqlgv`wfgjqf`welqtbqgzlv#`bmqfnlufgpvaif`w`lmwqlobq`kjuf`vqqfmwqfbgjmdojaqbqzojnjwfgnbmbdfqevqwkfqpvnnbqznb`kjmfnjmvwfpsqjubwf`lmwf{wsqldqbnpl`jfwzmvnafqptqjwwfmfmbaofgwqjddfqplvq`fpolbgjmdfofnfmwsbqwmfqejmboozsfqef`wnfbmjmdpzpwfnphffsjmd`vowvqf%rvlw8/ilvqmbosqlif`wpvqeb`fp%rvlw8f{sjqfpqfujftpabobm`fFmdojpk@lmwfmwwkqlvdkSofbpf#lsjmjlm`lmwb`wbufqbdfsqjnbqzujoobdfPsbmjpkdboofqzgf`ojmfnffwjmdnjppjlmslsvobqrvbojwznfbpvqfdfmfqbopsf`jfppfppjlmpf`wjlmtqjwfqp`lvmwfqjmjwjboqfslqwpejdvqfpnfnafqpklogjmdgjpsvwffbqojfqf{sqfppgjdjwbosj`wvqfBmlwkfqnbqqjfgwqbeej`ofbgjmd`kbmdfg`fmwqbouj`wlqzjnbdfp,qfbplmppwvgjfpefbwvqfojpwjmdnvpw#afp`kllopUfqpjlmvpvboozfsjplgfsobzjmddqltjmdlaujlvplufqobzsqfpfmwb`wjlmp?,vo=	tqbssfqboqfbgz`fqwbjmqfbojwzpwlqbdfbmlwkfqgfphwlsleefqfgsbwwfqmvmvpvboGjdjwbo`bsjwboTfapjwfebjovqf`lmmf`wqfgv`fgBmgqljggf`bgfpqfdvobq#%bns8#bmjnbopqfofbpfBvwlnbwdfwwjmdnfwklgpmlwkjmdSlsvobq`bswjlmofwwfqp`bswvqfp`jfm`foj`fmpf`kbmdfpFmdobmg>2%bns8Kjpwlqz#>#mft#@fmwqbovsgbwfgPsf`jboMfwtlqhqfrvjqf`lnnfmwtbqmjmd@loofdfwlloabqqfnbjmpaf`bvpffof`wfgGfvwp`kejmbm`ftlqhfqprvj`hozafwtffmf{b`wozpfwwjmdgjpfbpfPl`jfwztfbslmpf{kjajw%ow8"..@lmwqlo`obppfp`lufqfglvwojmfbwwb`hpgfuj`fp+tjmgltsvqslpfwjwof>!Nlajof#hjoojmdpkltjmdJwbojbmgqlssfgkfbujozfeef`wp.2$^*8	`lmejqn@vqqfmwbgubm`fpkbqjmdlsfmjmdgqbtjmdajoojlmlqgfqfgDfqnbmzqfobwfg?,elqn=jm`ovgftkfwkfqgfejmfgP`jfm`f`bwboldBqwj`ofavwwlmpobqdfpwvmjelqnilvqmfzpjgfabq@kj`bdlklojgbzDfmfqbosbppbdf/%rvlw8bmjnbwfeffojmdbqqjufgsbppjmdmbwvqboqlvdkoz-		Wkf#avw#mlwgfmpjwzAqjwbjm@kjmfpfob`h#lewqjavwfJqfobmg!#gbwb.eb`wlqpqf`fjufwkbw#jpOjaqbqzkvpabmgjm#eb`wbeebjqp@kbqofpqbgj`boaqlvdkwejmgjmdobmgjmd9obmd>!qfwvqm#ofbgfqpsobmmfgsqfnjvnsb`hbdfBnfqj`bFgjwjlm^%rvlw8Nfppbdfmffg#wlubovf>!`lnsof{ollhjmdpwbwjlmafojfufpnboofq.nlajofqf`lqgptbmw#wlhjmg#leEjqfel{zlv#bqfpjnjobqpwvgjfgnb{jnvnkfbgjmdqbsjgoz`ojnbwfhjmdglnfnfqdfgbnlvmwpelvmgfgsjlmffqelqnvobgzmbpwzklt#wl#Pvsslqwqfufmvff`lmlnzQfpvowpaqlwkfqplogjfqobqdfoz`boojmd-%rvlw8B``lvmwFgtbqg#pfdnfmwQlafqw#feelqwpSb`jej`ofbqmfgvs#tjwkkfjdkw9tf#kbufBmdfofpmbwjlmp\\pfbq`kbssojfgb`rvjqfnbppjufdqbmwfg9#ebopfwqfbwfgajddfpwafmfejwgqjujmdPwvgjfpnjmjnvnsfqkbspnlqmjmdpfoojmdjp#vpfgqfufqpfubqjbmw#qlof>!njppjmdb`kjfufsqlnlwfpwvgfmwplnflmff{wqfnfqfpwlqfalwwln9fuloufgboo#wkfpjwfnbsfmdojpktbz#wl##Bvdvpwpznalop@lnsbmznbwwfqpnvpj`bobdbjmpwpfqujmd~*+*8	sbznfmwwqlvaof`lm`fsw`lnsbqfsbqfmwpsobzfqpqfdjlmpnlmjwlq#$$Wkf#tjmmjmdf{solqfbgbswfgDboofqzsqlgv`fbajojwzfmkbm`f`bqffqp*-#Wkf#`loof`wPfbq`k#bm`jfmwf{jpwfgellwfq#kbmgofqsqjmwfg`lmplofFbpwfqmf{slqwptjmgltp@kbmmfojoofdbomfvwqbopvddfpw\\kfbgfqpjdmjmd-kwno!=pfwwofgtfpwfqm`bvpjmd.tfahjw`objnfgIvpwj`f`kbswfquj`wjnpWklnbp#nlyjoobsqlnjpfsbqwjfpfgjwjlmlvwpjgf9ebopf/kvmgqfgLoznsj`\\avwwlmbvwklqpqfb`kfg`kqlmj`gfnbmgppf`lmgpsqlwf`wbglswfgsqfsbqfmfjwkfqdqfbwozdqfbwfqlufqboojnsqluf`lnnbmgpsf`jbopfbq`k-tlqpkjsevmgjmdwklvdkwkjdkfpwjmpwfbgvwjojwzrvbqwfq@vowvqfwfpwjmd`ofbqozf{slpfgAqltpfqojafqbo~#`bw`kSqlif`wf{bnsofkjgf+*8EolqjgbbmptfqpbooltfgFnsfqlqgfefmpfpfqjlvpeqffglnPfufqbo.avwwlmEvqwkfqlvw#le#">#mvoowqbjmfgGfmnbqhuljg+3*,boo-ipsqfufmwQfrvfpwPwfskfm		Tkfm#lapfquf?,k1=	Nlgfqm#sqlujgf!#bow>!alqgfqp-		Elq#		Nbmz#bqwjpwpsltfqfgsfqelqnej`wjlmwzsf#lenfgj`bowj`hfwplsslpfg@lvm`jotjwmfppivpwj`fDflqdf#Afodjvn---?,b=wtjwwfqmlwbaoztbjwjmdtbqebqf#Lwkfq#qbmhjmdskqbpfpnfmwjlmpvqujufp`klobq?,s=	#@lvmwqzjdmlqfgolpp#leivpw#bpDflqdjbpwqbmdf?kfbg=?pwlssfg2$^*8	jpobmgpmlwbaofalqgfq9ojpw#le`bqqjfg233/333?,k0=	#pfufqboaf`lnfppfof`w#tfggjmd33-kwnonlmbq`klee#wkfwfb`kfqkjdkoz#ajloldzojef#lelq#fufmqjpf#le%qbrvl8sovplmfkvmwjmd+wklvdkGlvdobpiljmjmd`jq`ofpElq#wkfBm`jfmwUjfwmbnufkj`ofpv`k#bp`qzpwboubovf#>Tjmgltpfmilzfgb#pnboobppvnfg?b#jg>!elqfjdm#Boo#qjklt#wkfGjpsobzqfwjqfgkltfufqkjggfm8abwwofppffhjmd`bajmfwtbp#mlwollh#bw`lmgv`wdfw#wkfIbmvbqzkbssfmpwvqmjmdb9klufqLmojmf#Eqfm`k#ob`hjmdwzsj`bof{wqb`wfmfnjfpfufm#jedfmfqbwgf`jgfgbqf#mlw,pfbq`kafojfep.jnbdf9ol`bwfgpwbwj`-oldjm!=`lmufqwujlofmwfmwfqfgejqpw!=`jq`vjwEjmobmg`kfnjpwpkf#tbp23s{8!=bp#pv`kgjujgfg?,psbm=tjoo#afojmf#leb#dqfbwnzpwfqz,jmgf{-eboojmdgvf#wl#qbjotbz`loofdfnlmpwfqgfp`fmwjw#tjwkmv`ofbqIftjpk#sqlwfpwAqjwjpkeoltfqpsqfgj`wqfelqnpavwwlm#tkl#tbpof`wvqfjmpwbmwpvj`jgfdfmfqj`sfqjlgpnbqhfwpPl`jbo#ejpkjmd`lnajmfdqbskj`tjmmfqp?aq#,=?az#wkf#MbwvqboSqjub`z`llhjfplvw`lnfqfploufPtfgjpkaqjfeozSfqpjbmpl#nv`k@fmwvqzgfsj`wp`lovnmpklvpjmdp`qjswpmf{w#wlafbqjmdnbssjmdqfujpfgiRvfqz+.tjgwk9wjwof!=wllowjsPf`wjlmgfpjdmpWvqhjpkzlvmdfq-nbw`k+~*+*8		avqmjmdlsfqbwfgfdqffpplvq`f>Qj`kbqg`olpfozsobpwj`fmwqjfp?,wq=	`lolq9 vo#jg>!slppfppqloojmdskzpj`pebjojmdf{f`vwf`lmwfpwojmh#wlGfebvow?aq#,=	9#wqvf/`kbqwfqwlvqjpn`obppj`sql`ffgf{sobjm?,k2=	lmojmf-<{no#ufkfosjmdgjbnlmgvpf#wkfbjqojmffmg#..=*-bwwq+qfbgfqpklpwjmd eeeeeeqfbojyfUjm`fmwpjdmbop#pq`>!,Sqlgv`wgfpsjwfgjufqpfwfoojmdSvaoj`#kfog#jmIlpfsk#wkfbwqfbeef`wp?pwzof=b#obqdfglfpm$wobwfq/#Fofnfmwebuj`lm`qfbwlqKvmdbqzBjqslqwpff#wkfpl#wkbwNj`kbfoPzpwfnpSqldqbnp/#bmg##tjgwk>f%rvlw8wqbgjmdofew!=	sfqplmpDlogfm#Beebjqpdqbnnbqelqnjmdgfpwqlzjgfb#le`bpf#lelogfpw#wkjp#jp-pq`#>#`bqwllmqfdjpwq@lnnlmpNvpojnpTkbw#jpjm#nbmznbqhjmdqfufbopJmgffg/frvbooz,pklt\\blvwgllqfp`bsf+Bvpwqjbdfmfwj`pzpwfn/Jm#wkf#pjwwjmdKf#boplJpobmgpB`bgfnz	\n\n?"..Gbmjfo#ajmgjmdaol`h!=jnslpfgvwjojyfBaqbkbn+f{`fswxtjgwk9svwwjmd*-kwno+#X^8	GBWBX#)hjw`kfmnlvmwfgb`wvbo#gjbof`wnbjmoz#\\aobmh$jmpwboof{sfqwpje+wzsfJw#bopl%`lsz8#!=Wfqnpalqm#jmLswjlmpfbpwfqmwbohjmd`lm`fqmdbjmfg#lmdljmdivpwjez`qjwj`peb`wlqzjwp#ltmbppbvowjmujwfgobpwjmdkjp#ltmkqfe>!,!#qfo>!gfufols`lm`fqwgjbdqbngloobqp`ovpwfqsks<jg>bo`lklo*8~*+*8vpjmd#b=?psbm=ufppfopqfujuboBggqfppbnbwfvqbmgqljgboofdfgjoomfpptbohjmd`fmwfqprvbojeznbw`kfpvmjejfgf{wjm`wGfefmpfgjfg#jm	\n?"..#`vpwlnpojmhjmdOjwwof#Allh#lefufmjmdnjm-ip<bqf#wkfhlmwbhwwlgbz$p-kwno!#wbqdfw>tfbqjmdBoo#Qjd8	~*+*8qbjpjmd#Bopl/#`qv`jbobalvw!=gf`obqf..=	?p`ejqfel{bp#nv`kbssojfpjmgf{/#p/#avw#wzsf#>#		?"..wltbqgpQf`lqgpSqjubwfElqfjdmSqfnjfq`klj`fpUjqwvboqfwvqmp@lnnfmwSltfqfgjmojmf8slufqwz`kbnafqOjujmd#ulovnfpBmwklmzoldjm!#QfobwfgF`lmlnzqfb`kfp`vwwjmddqbujwzojef#jm@kbswfq.pkbgltMlwbaof?,wg=	#qfwvqmpwbgjvntjgdfwpubqzjmdwqbufopkfog#aztkl#bqftlqh#jmeb`vowzbmdvobqtkl#kbgbjqslqwwltm#le		Plnf#$`oj`h$`kbqdfphfztlqgjw#tjoo`jwz#le+wkjp*8Bmgqft#vmjrvf#`kf`hfglq#nlqf033s{8#qfwvqm8qpjlm>!sovdjmptjwkjm#kfqpfoePwbwjlmEfgfqboufmwvqfsvaojpkpfmw#wlwfmpjlmb`wqfpp`lnf#wlejmdfqpGvhf#lesflsof/f{soljwtkbw#jpkbqnlmzb#nbilq!9!kwwsjm#kjp#nfmv!=	nlmwkozleej`fq`lvm`jodbjmjmdfufm#jmPvnnbqzgbwf#leolzbowzejwmfppbmg#tbpfnsfqlqpvsqfnfPf`lmg#kfbqjmdQvppjbmolmdfpwBoafqwbobwfqbopfw#le#pnboo!=-bssfmggl#tjwkefgfqboabmh#leafmfbwkGfpsjwf@bsjwbodqlvmgp*/#bmg#sfq`fmwjw#eqln`olpjmd`lmwbjmJmpwfbgejewffmbp#tfoo-zbkll-qfpslmgejdkwfqlap`vqfqfeof`wlqdbmj`>#Nbwk-fgjwjmdlmojmf#sbggjmdb#tkloflmfqqlqzfbq#lefmg#le#abqqjfqtkfm#jwkfbgfq#klnf#leqfpvnfgqfmbnfgpwqlmd=kfbwjmdqfwbjmp`olvgeqtbz#le#Nbq`k#2hmltjmdjm#sbqwAfwtffmofpplmp`olpfpwujqwvboojmhp!=`qlppfgFMG#..=ebnlvp#btbqgfgOj`fmpfKfbowk#ebjqoz#tfbowkznjmjnboBeqj`bm`lnsfwfobafo!=pjmdjmdebqnfqpAqbpjo*gjp`vppqfsob`fDqfdlqzelmw#`lsvqpvfgbssfbqpnbhf#vsqlvmgfgalwk#leaol`hfgpbt#wkfleej`fp`lolvqpje+gl`vtkfm#kffmelq`fsvpk+evBvdvpw#VWE.;!=Ebmwbpzjm#nlpwjmivqfgVpvboozebqnjmd`olpvqflaif`w#gfefm`fvpf#le#Nfgj`bo?algz=	fujgfmwaf#vpfghfz@lgfpj{wffmJpobnj` 333333fmwjqf#tjgfoz#b`wjuf#+wzsflelmf#`bm`lolq#>psfbhfqf{wfmgpSkzpj`pwfqqbjm?walgz=evmfqboujftjmdnjggof#`qj`hfwsqlskfwpkjewfggl`wlqpQvppfoo#wbqdfw`lnsb`wbodfaqbpl`jbo.avoh#lenbm#bmg?,wg=	#kf#ofew*-ubo+*ebopf*8oldj`boabmhjmdklnf#wlmbnjmd#Bqjylmb`qfgjwp*8	~*8	elvmgfqjm#wvqm@loojmpafelqf#Avw#wkf`kbqdfgWjwof!=@bswbjmpsfoofgdlggfppWbd#..=Bggjmd9avw#tbpQf`fmw#sbwjfmwab`h#jm>ebopf%Ojm`lomtf#hmlt@lvmwfqIvgbjpnp`qjsw#bowfqfg$^*8	##kbp#wkfvm`ofbqFufmw$/alwk#jmmlw#boo		?"..#sob`jmdkbqg#wl#`fmwfqplqw#le`ojfmwppwqffwpAfqmbqgbppfqwpwfmg#wlebmwbpzgltm#jmkbqalvqEqffglniftfoqz,balvw--pfbq`kofdfmgpjp#nbgfnlgfqm#lmoz#lmlmoz#wljnbdf!#ojmfbq#sbjmwfqbmg#mlwqbqfoz#b`qlmzngfojufqpklqwfq33%bns8bp#nbmztjgwk>!,)#?"X@wjwof#>le#wkf#oltfpw#sj`hfg#fp`bsfgvpfp#lesflsofp#Svaoj`Nbwwkftwb`wj`pgbnbdfgtbz#elqobtp#lefbpz#wl#tjmgltpwqlmd##pjnsof~`bw`k+pfufmwkjmelal{tfmw#wlsbjmwfg`jwjyfmJ#glm$wqfwqfbw-#Plnf#tt-!*8	alnajmdnbjowl9nbgf#jm-#Nbmz#`bqqjfpx~8tjtlqh#lepzmlmzngfefbwpebulqfglswj`bosbdfWqbvmofpp#pfmgjmdofew!=?`lnP`lqBoo#wkfiRvfqz-wlvqjpw@obppj`ebopf!#Tjokfonpvavqapdfmvjmfajpklsp-psojw+dolabo#elooltpalgz#lemlnjmbo@lmwb`wpf`vobqofew#wl`kjfeoz.kjggfm.abmmfq?,oj=		-#Tkfm#jm#alwkgjpnjppF{solqfbotbzp#ujb#wkfpsb/]lotfoebqfqvojmd#bqqbmdf`bswbjmkjp#plmqvof#lekf#wllhjwpfoe/>3%bns8+`boofgpbnsofpwl#nbhf`ln,sbdNbqwjm#Hfmmfgzb``fswpevoo#lekbmgofgAfpjgfp,,..=?,baof#wlwbqdfwpfppfm`fkjn#wl#jwp#az#`lnnlm-njmfqbowl#wbhftbzp#wlp-lqd,obgujpfgsfmbowzpjnsof9je#wkfzOfwwfqpb#pklqwKfqafqwpwqjhfp#dqlvsp-ofmdwkeojdkwplufqobspoltoz#ofppfq#pl`jbo#?,s=	\n\njw#jmwlqbmhfg#qbwf#levo=	##bwwfnswsbjq#lenbhf#jwHlmwbhwBmwlmjlkbujmd#qbwjmdp#b`wjufpwqfbnpwqbssfg!*-`pp+klpwjofofbg#wlojwwof#dqlvsp/Sj`wvqf..=		#qltp>!#laif`wjmufqpf?ellwfq@vpwlnU=?_,p`qploujmd@kbnafqpobufqztlvmgfgtkfqfbp">#$vmgelq#boosbqwoz#.qjdkw9Bqbajbmab`hfg#`fmwvqzvmjw#lenlajof.Fvqlsf/jp#klnfqjph#legfpjqfg@ojmwlm`lpw#lebdf#le#af`lnf#mlmf#les%rvlw8Njggof#fbg$*X3@qjwj`ppwvgjlp=%`lsz8dqlvs!=bppfnaonbhjmd#sqfppfgtjgdfw-sp9!#<#qfavjowaz#plnfElqnfq#fgjwlqpgfobzfg@bmlmj`kbg#wkfsvpkjmd`obpp>!avw#bqfsbqwjboAbazolmalwwln#`bqqjfq@lnnbmgjwp#vpfBp#tjwk`lvqpfpb#wkjqggfmlwfpbopl#jmKlvpwlm13s{8!=b``vpfgglvaof#dlbo#leEbnlvp#*-ajmg+sqjfpwp#Lmojmfjm#Ivozpw#(#!d`lmpvowgf`jnbokfosevoqfujufgjp#ufqzq$($jswolpjmd#efnbofpjp#boplpwqjmdpgbzp#lebqqjuboevwvqf#?laif`welq`jmdPwqjmd+!#,=	\n\nkfqf#jpfm`lgfg-##Wkf#aboollmglmf#az,`lnnlmad`lolqobt#le#Jmgjbmbbuljgfgavw#wkf1s{#0s{irvfqz-bewfq#bsloj`z-nfm#bmgellwfq.>#wqvf8elq#vpfp`qffm-Jmgjbm#jnbdf#>ebnjoz/kwws9,,#%maps8gqjufqpfwfqmbopbnf#bpmlwj`fgujftfqp~*+*8	#jp#nlqfpfbplmpelqnfq#wkf#mftjp#ivpw`lmpfmw#Pfbq`ktbp#wkftkz#wkfpkjssfgaq=?aq=tjgwk9#kfjdkw>nbgf#le`vjpjmfjp#wkbwb#ufqz#Bgnjqbo#ej{fg8mlqnbo#NjppjlmSqfpp/#lmwbqjl`kbqpfwwqz#wl#jmubgfg>!wqvf!psb`jmdjp#nlpwb#nlqf#wlwboozeboo#le~*8	##jnnfmpfwjnf#jmpfw#lvwpbwjpezwl#ejmggltm#wlolw#le#Sobzfqpjm#Ivmfrvbmwvnmlw#wkfwjnf#wlgjpwbmwEjmmjpkpq`#>#+pjmdof#kfos#leDfqnbm#obt#bmgobafofgelqfpwp`llhjmdpsb`f!=kfbgfq.tfoo#bpPwbmofzaqjgdfp,dolabo@qlbwjb#Balvw#X3^8	##jw/#bmgdqlvsfgafjmd#b*xwkqltkf#nbgfojdkwfqfwkj`boEEEEEE!alwwln!ojhf#b#fnsolzpojuf#jmbp#pffmsqjmwfqnlpw#leva.ojmhqfif`wpbmg#vpfjnbdf!=pv``ffgeffgjmdMv`ofbqjmelqnbwl#kfosTlnfm$pMfjwkfqNf{j`bmsqlwfjm?wbaof#az#nbmzkfbowkzobtpvjwgfujpfg-svpk+xpfoofqppjnsoz#Wkqlvdk-`llhjf#Jnbdf+logfq!=vp-ip!=#Pjm`f#vmjufqpobqdfq#lsfm#wl"..#fmgojfp#jm$^*8	##nbqhfwtkl#jp#+!GLN@lnbmbdfglmf#elqwzsfle#Hjmdglnsqlejwpsqlslpfwl#pklt`fmwfq8nbgf#jwgqfppfgtfqf#jmnj{wvqfsqf`jpfbqjpjmdpq`#>#$nbhf#b#pf`vqfgAbswjpwulwjmd#	\n\nubq#Nbq`k#1dqft#vs@ojnbwf-qfnlufphjoofgtbz#wkf?,kfbg=eb`f#leb`wjmd#qjdkw!=wl#tlqhqfgv`fpkbp#kbgfqf`wfgpklt+*8b`wjlm>allh#lebm#bqfb>>#!kww?kfbgfq	?kwno=`lmelqneb`jmd#`llhjf-qfoz#lmklpwfg#-`vpwlnkf#tfmwavw#elqpsqfbg#Ebnjoz#b#nfbmplvw#wkfelqvnp-ellwbdf!=Nlajo@ofnfmwp!#jg>!bp#kjdkjmwfmpf..=?"..efnbof#jp#pffmjnsojfgpfw#wkfb#pwbwfbmg#kjpebpwfpwafpjgfpavwwlm\\alvmgfg!=?jnd#Jmelal{fufmwp/b#zlvmdbmg#bqfMbwjuf#`kfbsfqWjnflvwbmg#kbpfmdjmfptlm#wkf+nlpwozqjdkw9#ejmg#b#.alwwlnSqjm`f#bqfb#lenlqf#lepfbq`k\\mbwvqf/ofdboozsfqjlg/obmg#lelq#tjwkjmgv`fgsqlujmdnjppjofol`boozBdbjmpwwkf#tbzh%rvlw8s{8!=	svpkfg#babmglmmvnfqbo@fqwbjmJm#wkjpnlqf#jmlq#plnfmbnf#jpbmg/#jm`qltmfgJPAM#3.`qfbwfpL`wlafqnbz#mlw`fmwfq#obwf#jmGfefm`ffmb`wfgtjpk#wlaqlbgoz`llojmdlmolbg>jw-#Wkfqf`lufqNfnafqpkfjdkw#bppvnfp?kwno=	sflsof-jm#lmf#>tjmgltellwfq\\b#dllg#qfhobnblwkfqp/wl#wkjp\\`llhjfsbmfo!=Olmglm/gfejmfp`qvpkfgabswjpn`lbpwbopwbwvp#wjwof!#nluf#wlolpw#jmafwwfq#jnsojfpqjuboqzpfqufqp#PzpwfnSfqkbspfp#bmg#`lmwfmgeoltjmdobpwfg#qjpf#jmDfmfpjpujft#leqjpjmd#pffn#wlavw#jm#ab`hjmdkf#tjoodjufm#bdjujmd#`jwjfp-eolt#le#Obwfq#boo#avwKjdktbzlmoz#azpjdm#lekf#glfpgjeefqpabwwfqz%bns8obpjmdofpwkqfbwpjmwfdfqwbhf#lmqfevpfg`boofg#>VP%bnsPff#wkfmbwjufpaz#wkjppzpwfn-kfbg#le9klufq/ofpajbmpvqmbnfbmg#boo`lnnlm,kfbgfq\\\\sbqbnpKbqubqg,sj{fo-qfnlubopl#olmdqlof#leiljmwozphzp`qbVmj`lgfaq#,=	Bwobmwbmv`ofvp@lvmwz/svqfoz#`lvmw!=fbpjoz#avjog#blm`oj`hb#djufmsljmwfqk%rvlw8fufmwp#fopf#x	gjwjlmpmlt#wkf/#tjwk#nbm#tkllqd,Tfalmf#bmg`buboqzKf#gjfgpfbwwof33/333#xtjmgltkbuf#wlje+tjmgbmg#jwpplofoz#n%rvlw8qfmftfgGfwqljwbnlmdpwfjwkfq#wkfn#jmPfmbwlqVp?,b=?Hjmd#leEqbm`jp.sqlgv`kf#vpfgbqw#bmgkjn#bmgvpfg#azp`lqjmdbw#klnfwl#kbufqfobwfpjajojwzeb`wjlmAveebolojmh!=?tkbw#kfeqff#wl@jwz#le`lnf#jmpf`wlqp`lvmwfglmf#gbzmfqulvpprvbqf#~8je+dljm#tkbwjnd!#bojp#lmozpfbq`k,wvfpgbzollpfozPlolnlmpf{vbo#.#?b#kqnfgjvn!GL#MLW#Eqbm`f/tjwk#b#tbq#bmgpf`lmg#wbhf#b#=			nbqhfw-kjdktbzglmf#jm`wjujwz!obpw!=laojdfgqjpf#wl!vmgfejnbgf#wl#Fbqoz#sqbjpfgjm#jwp#elq#kjpbwkofwfIvsjwfqZbkll"#wfqnfg#pl#nbmzqfbooz#p-#Wkf#b#tlnbm<ubovf>gjqf`w#qjdkw!#aj`z`ofb`jmd>!gbz#bmgpwbwjmdQbwkfq/kjdkfq#Leej`f#bqf#mltwjnfp/#tkfm#b#sbz#elqlm#wkjp.ojmh!=8alqgfqbqlvmg#bmmvbo#wkf#Mftsvw#wkf-`ln!#wbhjm#wlb#aqjfe+jm#wkfdqlvsp-8#tjgwkfmyznfppjnsof#jm#obwfxqfwvqmwkfqbszb#sljmwabmmjmdjmhp!=	+*8!#qfb#sob`f_v330@bbalvw#bwq=	\n\n``lvmw#djufp#b?P@QJSWQbjotbzwkfnfp,wlloal{AzJg+!{kvnbmp/tbw`kfpjm#plnf#je#+tj`lnjmd#elqnbwp#Vmgfq#avw#kbpkbmgfg#nbgf#azwkbm#jmefbq#legfmlwfg,jeqbnfofew#jmulowbdfjm#fb`kb%rvlw8abpf#leJm#nbmzvmgfqdlqfdjnfpb`wjlm#?,s=	?vpwlnUb8%dw8?,jnslqwplq#wkbwnlpwoz#%bns8qf#pjyf>!?,b=?,kb#`obppsbppjufKlpw#>#TkfwkfqefqwjofUbqjlvp>X^8+ev`bnfqbp,=?,wg=b`wp#bpJm#plnf=		?"lqdbmjp#?aq#,=Afjijmd`bwbo/Lgfvwp`kfvqlsfvfvphbqbdbfjodfpufmphbfpsb/]bnfmpbifvpvbqjlwqbabiln/E{j`ls/Mdjmbpjfnsqfpjpwfnbl`wvaqfgvqbmwfb/]bgjqfnsqfpbnlnfmwlmvfpwqlsqjnfqbwqbu/Epdqb`jbpmvfpwqbsql`fplfpwbglp`bojgbgsfqplmbm/Vnfqlb`vfqgln/Vpj`bnjfnaqllefqwbpbodvmlpsb/Apfpfifnsolgfqf`klbgfn/Mpsqjubglbdqfdbqfmob`fpslpjaofklwfofppfujoobsqjnfql/Vowjnlfufmwlpbq`kjul`vowvqbnvifqfpfmwqbgbbmvm`jlfnabqdlnfq`bgldqbmgfpfpwvgjlnfilqfpefaqfqlgjpf/]lwvqjpnl`/_gjdlslqwbgbfpsb`jlebnjojbbmwlmjlsfqnjwfdvbqgbqbodvmbpsqf`jlpbodvjfmpfmwjglujpjwbpw/Awvol`lml`fqpfdvmgl`lmpfileqbm`jbnjmvwlppfdvmgbwfmfnlpfef`wlpn/Mobdbpfpj/_mqfujpwbdqbmbgb`lnsqbqjmdqfpldbq`/Abb``j/_mf`vbglqrvjfmfpjm`ovplgfafq/Mnbwfqjbklnaqfpnvfpwqbslgq/Abnb/]bmb/Vowjnbfpwbnlplej`jbowbnajfmmjmd/Vmpbovglpslgfnlpnfilqbqslpjwjlmavpjmfppklnfsbdfpf`vqjwzobmdvbdfpwbmgbqg`bnsbjdmefbwvqfp`bwfdlqzf{wfqmbo`kjogqfmqfpfqufgqfpfbq`kf{`kbmdfebulqjwfwfnsobwfnjojwbqzjmgvpwqzpfquj`fpnbwfqjbosqlgv`wpy.jmgf{9`lnnfmwpplewtbqf`lnsofwf`bofmgbqsobwelqnbqwj`ofpqfrvjqfgnlufnfmwrvfpwjlmavjogjmdslojwj`pslppjaofqfojdjlmskzpj`boeffgab`hqfdjpwfqsj`wvqfpgjpbaofgsqlwl`lobvgjfm`fpfwwjmdpb`wjujwzfofnfmwpofbqmjmdbmzwkjmdbapwqb`wsqldqfpplufqujftnbdbyjmff`lmlnj`wqbjmjmdsqfppvqfubqjlvp#?pwqlmd=sqlsfqwzpklssjmdwldfwkfqbgubm`fgafkbujlqgltmolbgefbwvqfgellwaboopfof`wfgObmdvbdfgjpwbm`fqfnfnafqwqb`hjmdsbpptlqgnlgjejfgpwvgfmwpgjqf`wozejdkwjmdmlqwkfqmgbwbabpfefpwjuboaqfbhjmdol`bwjlmjmwfqmfwgqlsgltmsqb`wj`ffujgfm`fevm`wjlmnbqqjbdfqfpslmpfsqlaofnpmfdbwjufsqldqbnpbmbozpjpqfofbpfgabmmfq!=svq`kbpfsloj`jfpqfdjlmbo`qfbwjufbqdvnfmwallhnbqhqfefqqfq`kfnj`bogjujpjlm`booab`hpfsbqbwfsqlif`wp`lmeoj`wkbqgtbqfjmwfqfpwgfojufqznlvmwbjmlawbjmfg>#ebopf8elq+ubq#b``fswfg`bsb`jwz`lnsvwfqjgfmwjwzbjq`qbewfnsolzfgsqlslpfgglnfpwj`jm`ovgfpsqlujgfgklpsjwboufqwj`bo`loobspfbssqlb`ksbqwmfqpoldl!=?bgbvdkwfqbvwklq!#`vowvqboebnjojfp,jnbdfp,bppfnaozsltfqevowfb`kjmdejmjpkfggjpwqj`w`qjwj`bo`dj.ajm,svqslpfpqfrvjqfpfof`wjlmaf`lnjmdsqlujgfpb`bgfnj`f{fq`jpfb`wvbooznfgj`jmf`lmpwbmwb``jgfmwNbdbyjmfgl`vnfmwpwbqwjmdalwwln!=lapfqufg9#%rvlw8f{wfmgfgsqfujlvpPlewtbqf`vpwlnfqgf`jpjlmpwqfmdwkgfwbjofgpojdkwozsobmmjmdwf{wbqfb`vqqfm`zfufqzlmfpwqbjdkwwqbmpefqslpjwjufsqlgv`fgkfqjwbdfpkjssjmdbaplovwfqf`fjufgqfofubmwavwwlm!#ujlofm`fbmztkfqfafmfejwpobvm`kfgqf`fmwozboojbm`felooltfgnvowjsofavoofwjmjm`ovgfgl``vqqfgjmwfqmbo\'+wkjp*-qfsvaoj`=?wq=?wg`lmdqfppqf`lqgfgvowjnbwfplovwjlm?vo#jg>!gjp`lufqKlnf?,b=tfapjwfpmfwtlqhpbowklvdkfmwjqfoznfnlqjbonfppbdfp`lmwjmvfb`wjuf!=plnftkbwuj`wlqjbTfpwfqm##wjwof>!Ol`bwjlm`lmwqb`wujpjwlqpGltmolbgtjwklvw#qjdkw!=	nfbpvqfptjgwk#>#ubqjbaofjmuloufgujqdjmjbmlqnboozkbssfmfgb``lvmwppwbmgjmdmbwjlmboQfdjpwfqsqfsbqfg`lmwqlopb``vqbwfajqwkgbzpwqbwfdzleej`jbodqbskj`p`qjnjmboslppjaoz`lmpvnfqSfqplmbopsfbhjmdubojgbwfb`kjfufg-isd!#,=nb`kjmfp?,k1=	##hfztlqgpeqjfmgozaqlwkfqp`lnajmfglqjdjmbo`lnslpfgf{sf`wfgbgfrvbwfsbhjpwbmeloolt!#ubovbaof?,obafo=qfobwjufaqjmdjmdjm`qfbpfdlufqmlqsovdjmp,Ojpw#le#Kfbgfq!=!#mbnf>!#+%rvlw8dqbgvbwf?,kfbg=	`lnnfq`fnbobzpjbgjqf`wlqnbjmwbjm8kfjdkw9p`kfgvof`kbmdjmdab`h#wl#`bwkloj`sbwwfqmp`lolq9# dqfbwfpwpvssojfpqfojbaof?,vo=	\n\n?pfof`w#`jwjyfmp`olwkjmdtbw`kjmd?oj#jg>!psf`jej``bqqzjmdpfmwfm`f?`fmwfq=`lmwqbpwwkjmhjmd`bw`k+f*plvwkfqmNj`kbfo#nfq`kbmw`bqlvpfosbggjmd9jmwfqjlq-psojw+!ojybwjlmL`wlafq#*xqfwvqmjnsqlufg..%dw8		`lufqbdf`kbjqnbm-smd!#,=pvaif`wpQj`kbqg#tkbwfufqsqlabaozqf`lufqzabpfabooivgdnfmw`lmmf`w--`pp!#,=#tfapjwfqfslqwfggfebvow!,=?,b=	fof`wqj`p`lwobmg`qfbwjlmrvbmwjwz-#JPAM#3gjg#mlw#jmpwbm`f.pfbq`k.!#obmd>!psfbhfqp@lnsvwfq`lmwbjmpbq`kjufpnjmjpwfqqfb`wjlmgjp`lvmwJwbojbml`qjwfqjbpwqlmdoz9#$kwws9$p`qjsw$`lufqjmdleefqjmdbssfbqfgAqjwjpk#jgfmwjezEb`fallhmvnfqlvpufkj`ofp`lm`fqmpBnfqj`bmkbmgojmdgju#jg>!Tjoojbn#sqlujgfq\\`lmwfmwb``vqb`zpf`wjlm#bmgfqplmeof{jaof@bwfdlqzobtqfm`f?p`qjsw=obzlvw>!bssqlufg#nb{jnvnkfbgfq!=?,wbaof=Pfquj`fpkbnjowlm`vqqfmw#`bmbgjbm`kbmmfop,wkfnfp,,bqwj`oflswjlmboslqwvdboubovf>!!jmwfqubotjqfofppfmwjwofgbdfm`jfpPfbq`k!#nfbpvqfgwklvpbmgpsfmgjmd%kfoojs8mft#Gbwf!#pjyf>!sbdfMbnfnjggof!#!#,=?,b=kjggfm!=pfrvfm`fsfqplmbolufqeoltlsjmjlmpjoojmljpojmhp!=	\n?wjwof=ufqpjlmppbwvqgbzwfqnjmbojwfnsqlsfmdjmffqpf`wjlmpgfpjdmfqsqlslpbo>!ebopf!Fpsb/]loqfofbpfppvanjw!#fq%rvlw8bggjwjlmpznswlnplqjfmwfgqfplvq`fqjdkw!=?sofbpvqfpwbwjlmpkjpwlqz-ofbujmd##alqgfq>`lmwfmwp`fmwfq!=-		Plnf#gjqf`wfgpvjwbaofavodbqjb-pklt+*8gfpjdmfgDfmfqbo#`lm`fswpF{bnsofptjoojbnpLqjdjmbo!=?psbm=pfbq`k!=lsfqbwlqqfrvfpwpb#%rvlw8booltjmdGl`vnfmwqfujpjlm-#		Wkf#zlvqpfoe@lmwb`w#nj`kjdbmFmdojpk#`lovnajbsqjlqjwzsqjmwjmdgqjmhjmdeb`jojwzqfwvqmfg@lmwfmw#leej`fqpQvppjbm#dfmfqbwf.;;6:.2!jmgj`bwfebnjojbq#rvbojwznbqdjm93#`lmwfmwujftslqw`lmwb`wp.wjwof!=slqwbaof-ofmdwk#fojdjaofjmuloufpbwobmwj`lmolbg>!gfebvow-pvssojfgsbznfmwpdolppbqz		Bewfq#dvjgbm`f?,wg=?wgfm`lgjmdnjggof!=`bnf#wl#gjpsobzpp`lwwjpkilmbwkbmnbilqjwztjgdfwp-`ojmj`bowkbjobmgwfb`kfqp?kfbg=	\nbeef`wfgpvsslqwpsljmwfq8wlPwqjmd?,pnboo=lhobklnbtjoo#af#jmufpwlq3!#bow>!klojgbzpQfplvq`foj`fmpfg#+tkj`k#-#Bewfq#`lmpjgfqujpjwjmdf{solqfqsqjnbqz#pfbq`k!#bmgqljg!rvj`hoz#nffwjmdpfpwjnbwf8qfwvqm#8`lolq9 #kfjdkw>bssqlubo/#%rvlw8#`kf`hfg-njm-ip!nbdmfwj`=?,b=?,kelqf`bpw-#Tkjof#wkvqpgbzgufqwjpf%fb`vwf8kbp@obppfubovbwflqgfqjmdf{jpwjmdsbwjfmwp#Lmojmf#`lolqbglLswjlmp!`bnsafoo?"..#fmg?,psbm=??aq#,=	\\slsvspp`jfm`fp/%rvlw8#rvbojwz#Tjmgltp#bppjdmfgkfjdkw9#?a#`obppof%rvlw8#ubovf>!#@lnsbmzf{bnsofp?jeqbnf#afojfufpsqfpfmwpnbqpkboosbqw#le#sqlsfqoz*-		Wkf#wb{lmlnznv`k#le#?,psbm=	!#gbwb.pqwvdv/Fpp`qlooWl#sqlif`w?kfbg=	bwwlqmfzfnskbpjppslmplqpebm`zal{tlqog$p#tjogojef`kf`hfg>pfppjlmpsqldqbnns{8elmw.#Sqlif`wilvqmbopafojfufgub`bwjlmwklnsplmojdkwjmdbmg#wkf#psf`jbo#alqgfq>3`kf`hjmd?,walgz=?avwwlm#@lnsofwf`ofbqej{	?kfbg=	bqwj`of#?pf`wjlmejmgjmdpqlof#jm#slsvobq##L`wlafqtfapjwf#f{slpvqfvpfg#wl##`kbmdfplsfqbwfg`oj`hjmdfmwfqjmd`lnnbmgpjmelqnfg#mvnafqp##?,gju=`qfbwjmdlmPvanjwnbqzobmg`loofdfpbmbozwj`ojpwjmdp`lmwb`w-olddfgJmbgujplqzpjaojmdp`lmwfmw!p%rvlw8*p-#Wkjp#sb`hbdfp`kf`hal{pvddfpwpsqfdmbmwwlnlqqltpsb`jmd>j`lm-smdibsbmfpf`lgfabpfavwwlm!=dbnaojmdpv`k#bp#/#tkjof#?,psbm=#njpplvqjpslqwjmdwls92s{#-?,psbm=wfmpjlmptjgwk>!1obyzolbgmlufnafqvpfg#jm#kfjdkw>!`qjsw!=	%maps8?,?wq=?wg#kfjdkw91,sqlgv`w`lvmwqz#jm`ovgf#ellwfq!#%ow8"..#wjwof!=?,irvfqz-?,elqn=	+\vBl\bQ*+\vUmGx*kqubwphjjwbojbmlqln/Nm(ow/Pqh/Kf4K4]4C5dwbnaj/Emmlwj`jbpnfmpbifpsfqplmbpgfqf`klpmb`jlmbopfquj`jl`lmwb`wlvpvbqjlpsqldqbnbdlajfqmlfnsqfpbpbmvm`jlpubofm`jb`lolnajbgfpsv/Epgfslqwfpsqlzf`wlsqlgv`wls/Vaoj`lmlplwqlpkjpwlqjbsqfpfmwfnjoolmfpnfgjbmwfsqfdvmwbbmwfqjlqqf`vqplpsqlaofnbpbmwjbdlmvfpwqlplsjmj/_mjnsqjnjqnjfmwqbpbn/Eqj`bufmgfglqpl`jfgbgqfpsf`wlqfbojybqqfdjpwqlsbobaqbpjmwfq/Epfmwlm`fpfpsf`jbonjfnaqlpqfbojgbg`/_qglabybqbdlybs/Mdjmbppl`jbofpaolrvfbqdfpwj/_mborvjofqpjpwfnbp`jfm`jbp`lnsofwlufqpj/_m`lnsofwbfpwvgjlps/Vaoj`blaifwjulboj`bmwfavp`bglq`bmwjgbgfmwqbgbpb``jlmfpbq`kjulppvsfqjlqnbzlq/Abbofnbmjbevm`j/_m/Vowjnlpkb`jfmglbrvfoolpfgj`j/_mefqmbmglbnajfmwfeb`fallhmvfpwqbp`ojfmwfpsql`fplpabpwbmwfsqfpfmwbqfslqwbq`lmdqfplsvaoj`bq`lnfq`jl`lmwqbwli/_ufmfpgjpwqjwlw/E`mj`b`lmivmwlfmfqd/Abwqbabibqbpwvqjbpqf`jfmwfvwjojybqalofw/Ampboubglq`lqqf`wbwqbabilpsqjnfqlpmfdl`jlpojafqwbggfwboofpsbmwboobsq/_{jnlbonfq/Abbmjnbofprvj/Emfp`lqby/_mpf``j/_mavp`bmglls`jlmfpf{wfqjlq`lm`fswlwlgbu/Abdbofq/Abfp`qjajqnfgj`jmboj`fm`jb`lmpvowbbpsf`wlp`q/Awj`bg/_obqfpivpwj`jbgfafq/Mmsfq/Alglmf`fpjwbnbmwfmfqsfrvf/]lqf`jajgbwqjavmbowfmfqjef`bm`j/_m`bmbqjbpgfp`bqdbgjufqplpnboolq`bqfrvjfqfw/E`mj`lgfafq/Abujujfmgbejmbmybpbgfobmwfevm`jlmb`lmpfilpgje/A`jo`jvgbgfpbmwjdvbpbubmybgbw/Eqnjmlvmjgbgfpp/Mm`kfy`bnsb/]bplewlmj`qfujpwbp`lmwjfmfpf`wlqfpnlnfmwlpeb`vowbg`q/Egjwlgjufqpbppvsvfpwleb`wlqfppfdvmglpsfrvf/]b<_<R<X<\\<Y=m<W<T<Y=m=n=`<]=g<W<R<]=g=n=`=a=n<R<P<y=m<W<T=n<R<_<R<P<Y<Q=c<^=m<Y=i=a=n<R<U<X<\\<Z<Y<]=g<W<T<_<R<X=o<X<Y<Q=`=a=n<R=n<]=g<W<\\=m<Y<]=c<R<X<T<Q=m<Y<]<Y<Q<\\<X<R=m<\\<U=n=h<R=n<R<Q<Y<_<R=m<^<R<T=m<^<R<U<T<_=l=g=n<R<Z<Y<^=m<Y<P=m<^<R=b<W<T=d=`=a=n<T=i<S<R<V<\\<X<Q<Y<U<X<R<P<\\<P<T=l<\\<W<T<]<R=n<Y<P=o=i<R=n=c<X<^=o=i=m<Y=n<T<W=b<X<T<X<Y<W<R<P<T=l<Y=n<Y<]=c=m<^<R<Y<^<T<X<Y=k<Y<_<R=a=n<T<P=m=k<Y=n=n<Y<P=g=j<Y<Q=g=m=n<\\<W<^<Y<X=`=n<Y<P<Y<^<R<X=g=n<Y<]<Y<^=g=d<Y<Q<\\<P<T=n<T<S<\\=n<R<P=o<S=l<\\<^<W<T=j<\\<R<X<Q<\\<_<R<X=g<[<Q<\\=b<P<R<_=o<X=l=o<_<^=m<Y<U<T<X<Y=n<V<T<Q<R<R<X<Q<R<X<Y<W<\\<X<Y<W<Y=m=l<R<V<T=b<Q=c<^<Y=m=`<y=m=n=`=l<\\<[<\\<Q<\\=d<T4K5h5h5k4K5h4F5f4@5i5f4U4B4K4Y4E4K5h4\\5f4U5h5f5k4@4C5f4C4K5h4N5j4K5h4]4C4F4A5o5i4Y5m4A4E5o4K5j4F4K5h5h5f5f5o5d5j4X4D5o4E5m5f5k4K4D5j4K4F4A5d4K4M4O5o4G4]4B5h4K5h4K5h4A4D4C5h5f5h4C4]5d4_4K4Z4V4[4F5o5d5j5k5j4K5o4_4K4A4E5j4K4C5f4K5h4[4D4U5h5f5o4X5o4]4K5f5i5o5j5i5j5k4K4X4]5o4E4]4J5f4_5j4X5f4[5i4K4\\4K4K5h5m5j4X4D4K4D4F4U4D4]4]4A5i4E5o4K5m4E5f5n5d5h5i4]5o4^5o5h5i4E4O4A5i4C5n5h4D5f5f4U5j5f4Y5d4]4E4[4]5f5n4X4K4]5o4@5d4K5h4O4B4]5e5i4U5j4K4K4D4A4G4U4]5d4Z4D4X5o5h5i4_4@5h4D5j4K5j4B4K5h4C5o4F4K4D5o5h5f4E4D4C5d5j4O5f4Z4K5f5d4@4C5m4]5f5n5o4F4D4F4O5m4Z5h5i4[4D4B4K5o4G4]4D4K4]5o4K5m4Z5h4K4A5h5e5j5m4_5k4O5f4K5i4]4C5d4C4O5j5k4K4C5f5j4K4K5h4K5j5i4U4]4Z4F4U5h5i4C4K4B5h5i5i5o5j\x07\x07\x07\x07\0\x07\x07\0\v\n	\b\r\f\f\r\b	\n\v\x1B\x1B\0\v\v\v\v\0\x07qfplvq`fp`lvmwqjfprvfpwjlmpfrvjsnfmw`lnnvmjwzbubjobaofkjdkojdkwGWG,{kwnonbqhfwjmdhmltofgdfplnfwkjmd`lmwbjmfqgjqf`wjlmpvap`qjafbgufqwjpf`kbqb`wfq!#ubovf>!?,pfof`w=Bvpwqbojb!#`obpp>!pjwvbwjlmbvwklqjwzelooltjmdsqjnbqjozlsfqbwjlm`kboofmdfgfufolsfgbmlmznlvpevm`wjlm#evm`wjlmp`lnsbmjfppwqv`wvqfbdqffnfmw!#wjwof>!slwfmwjbofgv`bwjlmbqdvnfmwppf`lmgbqz`lszqjdkwobmdvbdfpf{`ovpjuf`lmgjwjlm?,elqn=	pwbwfnfmwbwwfmwjlmAjldqbskz~#fopf#x	plovwjlmptkfm#wkf#Bmbozwj`pwfnsobwfpgbmdfqlvppbwfoojwfgl`vnfmwpsvaojpkfqjnslqwbmwsqlwlwzsfjmeovfm`f%qbrvl8?,feef`wjufdfmfqboozwqbmpelqnafbvwjevowqbmpslqwlqdbmjyfgsvaojpkfgsqlnjmfmwvmwjo#wkfwkvnambjoMbwjlmbo#-el`vp+*8lufq#wkf#njdqbwjlmbmmlvm`fgellwfq!=	f{`fswjlmofpp#wkbmf{sfmpjufelqnbwjlmeqbnftlqhwfqqjwlqzmgj`bwjlm`vqqfmwoz`obppMbnf`qjwj`jpnwqbgjwjlmfopftkfqfBof{bmgfqbssljmwfgnbwfqjbopaqlbg`bpwnfmwjlmfgbeejojbwf?,lswjlm=wqfbwnfmwgjeefqfmw,gfebvow-Sqfpjgfmwlm`oj`h>!ajldqbskzlwkfqtjpfsfqnbmfmwEqbm/KbjpKlooztllgf{sbmpjlmpwbmgbqgp?,pwzof=	qfgv`wjlmGf`fnafq#sqfefqqfg@bnaqjgdflsslmfmwpAvpjmfpp#`lmevpjlm=	?wjwof=sqfpfmwfgf{sobjmfgglfp#mlw#tlqogtjgfjmwfqeb`fslpjwjlmpmftpsbsfq?,wbaof=	nlvmwbjmpojhf#wkf#fppfmwjboejmbm`jbopfof`wjlmb`wjlm>!,babmglmfgFgv`bwjlmsbqpfJmw+pwbajojwzvmbaof#wl?,wjwof=	qfobwjlmpMlwf#wkbwfeej`jfmwsfqelqnfgwtl#zfbqpPjm`f#wkfwkfqfelqftqbssfq!=bowfqmbwfjm`qfbpfgAbwwof#lesfq`fjufgwqzjmd#wlmf`fppbqzslqwqbzfgfof`wjlmpFojybafwk?,jeqbnf=gjp`lufqzjmpvqbm`fp-ofmdwk8ofdfmgbqzDfldqbskz`bmgjgbwf`lqslqbwfplnfwjnfppfquj`fp-jmkfqjwfg?,pwqlmd=@lnnvmjwzqfojdjlvpol`bwjlmp@lnnjwwffavjogjmdpwkf#tlqogml#olmdfqafdjmmjmdqfefqfm`f`bmmlw#afeqfrvfm`zwzsj`boozjmwl#wkf#qfobwjuf8qf`lqgjmdsqfpjgfmwjmjwjboozwf`kmjrvfwkf#lwkfqjw#`bm#aff{jpwfm`fvmgfqojmfwkjp#wjnfwfofsklmfjwfnp`lsfsqb`wj`fpbgubmwbdf*8qfwvqm#Elq#lwkfqsqlujgjmdgfnl`qb`zalwk#wkf#f{wfmpjufpveefqjmdpvsslqwfg`lnsvwfqp#evm`wjlmsqb`wj`bopbjg#wkbwjw#nbz#afFmdojpk?,eqln#wkf#p`kfgvofggltmolbgp?,obafo=	pvpsf`wfgnbqdjm9#3psjqjwvbo?,kfbg=		nj`qlplewdqbgvboozgjp`vppfgkf#af`bnff{f`vwjufirvfqz-ipklvpfklog`lmejqnfgsvq`kbpfgojwfqboozgfpwqlzfgvs#wl#wkfubqjbwjlmqfnbjmjmdjw#jp#mlw`fmwvqjfpIbsbmfpf#bnlmd#wkf`lnsofwfgbodlqjwknjmwfqfpwpqfafoojlmvmgfejmfgfm`lvqbdfqfpjybaofjmuloujmdpfmpjwjufvmjufqpbosqlujpjlm+bowklvdkefbwvqjmd`lmgv`wfg*/#tkj`k#`lmwjmvfg.kfbgfq!=Efaqvbqz#mvnfqlvp#lufqeolt9`lnslmfmweqbdnfmwpf{`foofmw`lopsbm>!wf`kmj`bomfbq#wkf#Bgubm`fg#plvq`f#lef{sqfppfgKlmd#Hlmd#Eb`fallhnvowjsof#nf`kbmjpnfofubwjlmleefmpjuf?,elqn=	\npslmplqfggl`vnfmw-lq#%rvlw8wkfqf#bqfwklpf#tklnlufnfmwpsql`fppfpgjeej`vowpvanjwwfgqf`lnnfmg`lmujm`fgsqlnlwjmd!#tjgwk>!-qfsob`f+`obppj`bo`lbojwjlmkjp#ejqpwgf`jpjlmpbppjpwbmwjmgj`bwfgfulovwjlm.tqbssfq!fmlvdk#wlbolmd#wkfgfojufqfg..=	?"..Bnfqj`bm#sqlwf`wfgMlufnafq#?,pwzof=?evqmjwvqfJmwfqmfw##lmaovq>!pvpsfmgfgqf`jsjfmwabpfg#lm#Nlqflufq/balojpkfg`loof`wfgtfqf#nbgffnlwjlmbofnfqdfm`zmbqqbwjufbgul`bwfps{8alqgfq`lnnjwwfggjq>!owq!fnsolzffpqfpfbq`k-#pfof`wfgpv``fpplq`vpwlnfqpgjpsobzfgPfswfnafqbgg@obpp+Eb`fallh#pvddfpwfgbmg#obwfqlsfqbwjmdfobalqbwfPlnfwjnfpJmpwjwvwf`fqwbjmozjmpwboofgelooltfqpIfqvpbofnwkfz#kbuf`lnsvwjmddfmfqbwfgsqlujm`fpdvbqbmwffbqajwqbqzqf`ldmjyftbmwfg#wls{8tjgwk9wkflqz#leafkbujlvqTkjof#wkffpwjnbwfgafdbm#wl#jw#af`bnfnbdmjwvgfnvpw#kbufnlqf#wkbmGjqf`wlqzf{wfmpjlmpf`qfwbqzmbwvqboozl``vqqjmdubqjbaofpdjufm#wkfsobwelqn-?,obafo=?ebjofg#wl`lnslvmgphjmgp#le#pl`jfwjfpbolmdpjgf#..%dw8		plvwktfpwwkf#qjdkwqbgjbwjlmnbz#kbuf#vmfp`bsf+pslhfm#jm!#kqfe>!,sqldqbnnflmoz#wkf#`lnf#eqlngjqf`wlqzavqjfg#jmb#pjnjobqwkfz#tfqf?,elmw=?,Mlqtfdjbmpsf`jejfgsqlgv`jmdsbppfmdfq+mft#Gbwfwfnslqbqzej`wjlmboBewfq#wkffrvbwjlmpgltmolbg-qfdvobqozgfufolsfqbaluf#wkfojmhfg#wlskfmlnfmbsfqjlg#lewllowjs!=pvapwbm`fbvwlnbwj`bpsf`w#leBnlmd#wkf`lmmf`wfgfpwjnbwfpBjq#Elq`fpzpwfn#lelaif`wjufjnnfgjbwfnbhjmd#jwsbjmwjmdp`lmrvfqfgbqf#pwjoosql`fgvqfdqltwk#lekfbgfg#azFvqlsfbm#gjujpjlmpnlof`vofpeqbm`kjpfjmwfmwjlmbwwqb`wfg`kjogkllgbopl#vpfggfgj`bwfgpjmdbslqfgfdqff#leebwkfq#le`lmeoj`wp?,b=?,s=	`bnf#eqlntfqf#vpfgmlwf#wkbwqf`fjujmdF{f`vwjuffufm#nlqfb``fpp#wl`lnnbmgfqSlojwj`bonvpj`jbmpgfoj`jlvpsqjplmfqpbgufmw#leVWE.;!#,=?"X@GBWBX!=@lmwb`wPlvwkfqm#ad`lolq>!pfqjfp#le-#Jw#tbp#jm#Fvqlsfsfqnjwwfgubojgbwf-bssfbqjmdleej`jboppfqjlvpoz.obmdvbdfjmjwjbwfgf{wfmgjmdolmd.wfqnjmeobwjlmpv`k#wkbwdfw@llhjfnbqhfg#az?,avwwlm=jnsofnfmwavw#jw#jpjm`qfbpfpgltm#wkf#qfrvjqjmdgfsfmgfmw..=	?"..#jmwfqujftTjwk#wkf#`lsjfp#le`lmpfmpvptbp#avjowUfmfyvfob+elqnfqozwkf#pwbwfsfqplmmfopwqbwfdj`ebulvq#lejmufmwjlmTjhjsfgjb`lmwjmfmwujqwvbooztkj`k#tbpsqjm`jsof@lnsofwf#jgfmwj`bopklt#wkbwsqjnjwjufbtbz#eqlnnlof`vobqsqf`jpfozgjpploufgVmgfq#wkfufqpjlm>!=%maps8?,Jw#jp#wkf#Wkjp#jp#tjoo#kbuflqdbmjpnpplnf#wjnfEqjfgqj`ktbp#ejqpwwkf#lmoz#eb`w#wkbwelqn#jg>!sqf`fgjmdWf`kmj`boskzpj`jpwl``vqp#jmmbujdbwlqpf`wjlm!=psbm#jg>!plvdkw#wlafolt#wkfpvqujujmd~?,pwzof=kjp#gfbwkbp#jm#wkf`bvpfg#azsbqwjboozf{jpwjmd#vpjmd#wkftbp#djufmb#ojpw#leofufop#lemlwjlm#leLeej`jbo#gjpnjppfgp`jfmwjpwqfpfnaofpgvsoj`bwff{solpjufqf`lufqfgboo#lwkfqdboofqjfpxsbggjmd9sflsof#leqfdjlm#lebggqfppfpbppl`jbwfjnd#bow>!jm#nlgfqmpklvog#afnfwklg#leqfslqwjmdwjnfpwbnsmffgfg#wlwkf#Dqfbwqfdbqgjmdpffnfg#wlujftfg#bpjnsb`w#lmjgfb#wkbwwkf#Tlqogkfjdkw#lef{sbmgjmdWkfpf#bqf`vqqfmw!=`bqfevooznbjmwbjmp`kbqdf#le@obppj`bobggqfppfgsqfgj`wfgltmfqpkjs?gju#jg>!qjdkw!=	qfpjgfm`fofbuf#wkf`lmwfmw!=bqf#lewfm##~*+*8	sqlabaoz#Sqlefpplq.avwwlm!#qfpslmgfgpbzp#wkbwkbg#wl#afsob`fg#jmKvmdbqjbmpwbwvp#lepfqufp#bpVmjufqpbof{f`vwjlmbddqfdbwfelq#tkj`kjmef`wjlmbdqffg#wlkltfufq/#slsvobq!=sob`fg#lm`lmpwqv`wfof`wlqbopznalo#lejm`ovgjmdqfwvqm#wlbq`kjwf`w@kqjpwjbmsqfujlvp#ojujmd#jmfbpjfq#wlsqlefpplq	%ow8"..#feef`w#lebmbozwj`ptbp#wbhfmtkfqf#wkfwllh#lufqafojfe#jmBeqjhbbmpbp#ebq#bpsqfufmwfgtlqh#tjwkb#psf`jbo?ejfogpfw@kqjpwnbpQfwqjfufg		Jm#wkf#ab`h#jmwlmlqwkfbpwnbdbyjmfp=?pwqlmd=`lnnjwwffdlufqmjmddqlvsp#lepwlqfg#jmfpwbaojpkb#dfmfqbojwp#ejqpwwkfjq#ltmslsvobwfgbm#laif`w@bqjaafbmboolt#wkfgjpwqj`wptjp`lmpjmol`bwjlm-8#tjgwk9#jmkbajwfgPl`jbojpwIbmvbqz#2?,ellwfq=pjnjobqoz`klj`f#lewkf#pbnf#psf`jej`#avpjmfpp#Wkf#ejqpw-ofmdwk8#gfpjqf#wlgfbo#tjwkpjm`f#wkfvpfqBdfmw`lm`fjufgjmgf{-sksbp#%rvlw8fmdbdf#jmqf`fmwoz/eft#zfbqptfqf#bopl	?kfbg=	?fgjwfg#azbqf#hmltm`jwjfp#jmb``fpphfz`lmgfnmfgbopl#kbufpfquj`fp/ebnjoz#leP`kllo#le`lmufqwfgmbwvqf#le#obmdvbdfnjmjpwfqp?,laif`w=wkfqf#jp#b#slsvobqpfrvfm`fpbgul`bwfgWkfz#tfqfbmz#lwkfqol`bwjlm>fmwfq#wkfnv`k#nlqfqfeof`wfgtbp#mbnfglqjdjmbo#b#wzsj`botkfm#wkfzfmdjmffqp`lvog#mlwqfpjgfmwptfgmfpgbzwkf#wkjqg#sqlgv`wpIbmvbqz#1tkbw#wkfzb#`fqwbjmqfb`wjlmpsql`fpplqbewfq#kjpwkf#obpw#`lmwbjmfg!=?,gju=	?,b=?,wg=gfsfmg#lmpfbq`k!=	sjf`fp#le`lnsfwjmdQfefqfm`fwfmmfppfftkj`k#kbp#ufqpjlm>?,psbm=#??,kfbgfq=djufp#wkfkjpwlqjbmubovf>!!=sbggjmd93ujft#wkbwwldfwkfq/wkf#nlpw#tbp#elvmgpvapfw#lebwwb`h#lm`kjogqfm/sljmwp#lesfqplmbo#slpjwjlm9boofdfgoz@ofufobmgtbp#obwfqbmg#bewfqbqf#djufmtbp#pwjoop`qloojmdgfpjdm#lenbhfp#wkfnv`k#ofppBnfqj`bmp-		Bewfq#/#avw#wkfNvpfvn#leolvjpjbmb+eqln#wkfnjmmfplwbsbqwj`ofpb#sql`fppGlnjmj`bmulovnf#leqfwvqmjmdgfefmpjuf33s{qjdknbgf#eqlnnlvpflufq!#pwzof>!pwbwfp#le+tkj`k#jp`lmwjmvfpEqbm`jp`lavjogjmd#tjwklvw#btjwk#plnftkl#tlvogb#elqn#leb#sbqw#leafelqf#jwhmltm#bp##Pfquj`fpol`bwjlm#bmg#lewfmnfbpvqjmdbmg#jw#jpsbsfqab`hubovfp#le	?wjwof=>#tjmglt-gfwfqnjmffq%rvlw8#sobzfg#azbmg#fbqoz?,`fmwfq=eqln#wkjpwkf#wkqffsltfq#bmgle#%rvlw8jmmfqKWNO?b#kqfe>!z9jmojmf8@kvq`k#lewkf#fufmwufqz#kjdkleej`jbo#.kfjdkw9#`lmwfmw>!,`dj.ajm,wl#`qfbwfbeqjhbbmpfpsfqbmwleqbm/Kbjpobwujf)Mvojfwvuj)_(`f)Mwjmb(af)Mwjmb\fUh\fT{\fTN\n{I\np@Fr\vBl\bQ	A{\vUmGx	A{ypYA\0zX\bTV\bWl\bUdBM\vB{\npV\v@xB\\\np@DbGz	al\npa	fM	uD\bV~mx\vQ}\ndS	p\\\bVK\bS]\bU|oD	kV\ved\vHR\nb~M`\nJpoD|Q\nLPSw\bTl\nAI\nxC\bWt	BqF`Cm\vLm	Kx	}t\bPv\ny\\\naB	V\nZdXUli	fr	i@	BHBDBV	`V\n[]	p_	Tn\n~A\nxR	uD	`{\bV@	Tn	HK	AJ\vxsZf\nqIZf\vBM\v|j	}t\bSM\nmC\vQ}pfquj`jlpbqw/A`volbqdfmwjmbabq`folmb`vborvjfqsvaoj`bglsqlgv`wlpslo/Awj`bqfpsvfpwbtjhjsfgjbpjdvjfmwfa/Vprvfgb`lnvmjgbgpfdvqjgbgsqjm`jsbosqfdvmwbp`lmwfmjglqfpslmgfqufmfyvfobsqlaofnbpgj`jfnaqfqfob`j/_mmlujfnaqfpjnjobqfpsqlzf`wlpsqldqbnbpjmpwjwvwlb`wjujgbgfm`vfmwqbf`lmln/Abjn/Mdfmfp`lmwb`wbqgfp`bqdbqmf`fpbqjlbwfm`j/_mwfo/Eelml`lnjpj/_m`bm`jlmfp`bsb`jgbgfm`lmwqbqbm/Mojpjpebulqjwlpw/Eqnjmlpsqlujm`jbfwjrvfwbpfofnfmwlpevm`jlmfpqfpvowbgl`bq/M`wfqsqlsjfgbgsqjm`jsjlmf`fpjgbgnvmj`jsbo`qfb`j/_mgfp`bqdbpsqfpfm`jb`lnfq`jbolsjmjlmfpfifq`j`jlfgjwlqjbopbobnbm`bdlmy/Mofygl`vnfmwlsfo/A`vobqf`jfmwfpdfmfqbofpwbqqbdlmbsq/M`wj`bmlufgbgfpsqlsvfpwbsb`jfmwfpw/E`mj`bplaifwjulp`lmwb`wlp\fHB\fIk\fHn\fH^\fHS\fHc\fHU\fId\fHn\fH{\fHC\fHR\fHT\fHR\fHI\fHc\fHY\fHn\fH\\\fHU\fIk\fHy\fIg\fHd\fHy\fIm\fHw\fH\\\fHU\fHR\fH@\fHR\fHJ\fHy\fHU\fHR\fHT\fHA\fIl\fHU\fIm\fHc\fH\\\fHU\fIl\fHB\fId\fHn\fHJ\fHS\fHD\fH@\fHR\fHHgjsolgl`p\fHT\fHB\fHC\fH\\\fIn\fHF\fHD\fHR\fHB\fHF\fHH\fHR\fHG\fHS\fH\\\fHx\fHT\fHH\fHH\fH\\\fHU\fH^\fIg\fH{\fHU\fIm\fHj\fH@\fHR\fH\\\fHJ\fIk\fHZ\fHU\fIm\fHd\fHz\fIk\fH^\fHC\fHJ\fHS\fHy\fHR\fHB\fHY\fIk\fH@\fHH\fIl\fHD\fH@\fIl\fHv\fHB\fI`\fHH\fHT\fHR\fH^\fH^\fIk\fHz\fHp\fIe\fH@\fHB\fHJ\fHJ\fHH\fHI\fHR\fHD\fHU\fIl\fHZ\fHU\fH\\\fHi\fH^\fH{\fHy\fHA\fIl\fHD\fH{\fH\\\fHF\fHR\fHT\fH\\\fHR\fHH\fHy\fHS\fHc\fHe\fHT\fIk\fH{\fHC\fIl\fHU\fIn\fHm\fHj\fH{\fIk\fHs\fIl\fHB\fHz\fIg\fHp\fHy\fHR\fH\\\fHi\fHA\fIl\fH{\fHC\fIk\fHH\fIm\fHB\fHY\fIg\fHs\fHJ\fIk\fHn\fHi\fH{\fH\\\fH|\fHT\fIk\fHB\fIk\fH^\fH^\fH{\fHR\fHU\fHR\fH^\fHf\fHF\fH\\\fHv\fHR\fH\\\fH|\fHT\fHR\fHJ\fIk\fH\\\fHp\fHS\fHT\fHJ\fHS\fH^\fH@\fHn\fHJ\fH@\fHD\fHR\fHU\fIn\fHn\fH^\fHR\fHz\fHp\fIl\fHH\fH@\fHs\fHD\fHB\fHS\fH^\fHk\fHT\fIk\fHj\fHD\fIk\fHD\fHC\fHR\fHy\fIm\fH^\fH^\fIe\fH{\fHA\fHR\fH{\fH\\\fIk\fH^\fHp\fH{\fHU\fH\\\fHR\fHB\fH^\fH{\fIk\fHF\fIk\fHp\fHU\fHR\fHI\fHk\fHT\fIl\fHT\fHU\fIl\fHy\fH^\fHR\fHL\fIl\fHy\fHU\fHR\fHm\fHJ\fIn\fH\\\fHH\fHU\fHH\fHT\fHR\fHH\fHC\fHR\fHJ\fHj\fHC\fHR\fHF\fHR\fHy\fHy\fI`\fHD\fHZ\fHR\fHB\fHJ\fIk\fHz\fHC\fHU\fIl\fH\\\fHR\fHC\fHz\fIm\fHJ\fH^\fH{\fIl`bwfdlqjfpf{sfqjfm`f?,wjwof=	@lszqjdkw#ibubp`qjsw`lmgjwjlmpfufqzwkjmd?s#`obpp>!wf`kmloldzab`hdqlvmg?b#`obpp>!nbmbdfnfmw%`lsz8#132ibubP`qjsw`kbqb`wfqpaqfbg`qvnawkfnpfoufpklqjylmwbodlufqmnfmw@bojelqmjbb`wjujwjfpgjp`lufqfgMbujdbwjlmwqbmpjwjlm`lmmf`wjlmmbujdbwjlmbssfbqbm`f?,wjwof=?n`kf`hal{!#wf`kmjrvfpsqlwf`wjlmbssbqfmwozbp#tfoo#bpvmw$/#$VB.qfplovwjlmlsfqbwjlmpwfofujpjlmwqbmpobwfgTbpkjmdwlmmbujdbwlq-#>#tjmglt-jnsqfppjlm%ow8aq%dw8ojwfqbwvqfslsvobwjlmad`lolq>! fpsf`jbooz#`lmwfmw>!sqlgv`wjlmmftpofwwfqsqlsfqwjfpgfejmjwjlmofbgfqpkjsWf`kmloldzSbqojbnfmw`lnsbqjplmvo#`obpp>!-jmgf{Le+!`lm`ovpjlmgjp`vppjlm`lnslmfmwpajloldj`boQfulovwjlm\\`lmwbjmfqvmgfqpwllgmlp`qjsw=?sfqnjppjlmfb`k#lwkfqbwnlpskfqf#lmel`vp>!?elqn#jg>!sql`fppjmdwkjp-ubovfdfmfqbwjlm@lmefqfm`fpvapfrvfmwtfoo.hmltmubqjbwjlmpqfsvwbwjlmskfmlnfmlmgjp`jsojmfoldl-smd!#+gl`vnfmw/alvmgbqjfpf{sqfppjlmpfwwofnfmwAb`hdqlvmglvw#le#wkffmwfqsqjpf+!kwwsp9!#vmfp`bsf+!sbpptlqg!#gfnl`qbwj`?b#kqfe>!,tqbssfq!=	nfnafqpkjsojmdvjpwj`s{8sbggjmdskjolplskzbppjpwbm`fvmjufqpjwzeb`jojwjfpqf`ldmjyfgsqfefqfm`fje#+wzsflenbjmwbjmfgul`bavobqzkzslwkfpjp-pvanjw+*8%bns8maps8bmmlwbwjlmafkjmg#wkfElvmgbwjlmsvaojpkfq!bppvnswjlmjmwqlgv`fg`lqqvswjlmp`jfmwjpwpf{soj`jwozjmpwfbg#legjnfmpjlmp#lm@oj`h>!`lmpjgfqfggfsbqwnfmwl``vsbwjlmpllm#bewfqjmufpwnfmwsqlmlvm`fgjgfmwjejfgf{sfqjnfmwNbmbdfnfmwdfldqbskj`!#kfjdkw>!ojmh#qfo>!-qfsob`f+,gfsqfppjlm`lmefqfm`fsvmjpknfmwfojnjmbwfgqfpjpwbm`fbgbswbwjlmlsslpjwjlmtfoo#hmltmpvssofnfmwgfwfqnjmfgk2#`obpp>!3s{8nbqdjmnf`kbmj`bopwbwjpwj`p`fofaqbwfgDlufqmnfmw		Gvqjmd#wgfufolsfqpbqwjej`jbofrvjubofmwlqjdjmbwfg@lnnjppjlmbwwb`knfmw?psbm#jg>!wkfqf#tfqfMfgfqobmgpafzlmg#wkfqfdjpwfqfgilvqmbojpweqfrvfmwozboo#le#wkfobmd>!fm!#?,pwzof=	baplovwf8#pvsslqwjmdf{wqfnfoz#nbjmpwqfbn?,pwqlmd=#slsvobqjwzfnsolznfmw?,wbaof=	#`lopsbm>!?,elqn=	##`lmufqpjlmbalvw#wkf#?,s=?,gju=jmwfdqbwfg!#obmd>!fmSlqwvdvfpfpvapwjwvwfjmgjujgvbojnslppjaofnvowjnfgjbbonlpw#boos{#plojg# bsbqw#eqlnpvaif`w#wljm#Fmdojpk`qjwj`jyfgf{`fsw#elqdvjgfojmfplqjdjmboozqfnbqhbaofwkf#pf`lmgk1#`obpp>!?b#wjwof>!+jm`ovgjmdsbqbnfwfqpsqlkjajwfg>#!kwws9,,gj`wjlmbqzsfq`fswjlmqfulovwjlmelvmgbwjlms{8kfjdkw9pv``fppevopvsslqwfqpnjoofmmjvnkjp#ebwkfqwkf#%rvlw8ml.qfsfbw8`lnnfq`jbojmgvpwqjbofm`lvqbdfgbnlvmw#le#vmleej`jbofeej`jfm`zQfefqfm`fp`llqgjmbwfgjp`objnfqf{sfgjwjlmgfufolsjmd`bo`vobwfgpjnsojejfgofdjwjnbwfpvapwqjmd+3!#`obpp>!`lnsofwfozjoovpwqbwfejuf#zfbqpjmpwqvnfmwSvaojpkjmd2!#`obpp>!spz`kloldz`lmejgfm`fmvnafq#le#bapfm`f#leel`vpfg#lmiljmfg#wkfpwqv`wvqfpsqfujlvpoz=?,jeqbnf=lm`f#bdbjmavw#qbwkfqjnnjdqbmwple#`lvqpf/b#dqlvs#leOjwfqbwvqfVmojhf#wkf?,b=%maps8	evm`wjlm#jw#tbp#wkf@lmufmwjlmbvwlnlajofSqlwfpwbmwbddqfppjufbewfq#wkf#Pjnjobqoz/!#,=?,gju=`loof`wjlm	evm`wjlmujpjajojwzwkf#vpf#leulovmwffqpbwwqb`wjlmvmgfq#wkf#wkqfbwfmfg)?"X@GBWBXjnslqwbm`fjm#dfmfqbowkf#obwwfq?,elqn=	?,-jmgf{Le+$j#>#38#j#?gjeefqfm`fgfulwfg#wlwqbgjwjlmppfbq`k#elqvowjnbwfozwlvqmbnfmwbwwqjavwfppl.`boofg#~	?,pwzof=fubovbwjlmfnskbpjyfgb``fppjaof?,pf`wjlm=pv``fppjlmbolmd#tjwkNfbmtkjof/jmgvpwqjfp?,b=?aq#,=kbp#af`lnfbpsf`wp#leWfofujpjlmpveej`jfmwabphfwabooalwk#pjgfp`lmwjmvjmdbm#bqwj`of?jnd#bow>!bgufmwvqfpkjp#nlwkfqnbm`kfpwfqsqjm`jsofpsbqwj`vobq`lnnfmwbqzfeef`wp#legf`jgfg#wl!=?pwqlmd=svaojpkfqpIlvqmbo#legjeej`vowzeb`jojwbwfb``fswbaofpwzof-`pp!\nevm`wjlm#jmmlubwjlm=@lszqjdkwpjwvbwjlmptlvog#kbufavpjmfppfpGj`wjlmbqzpwbwfnfmwplewfm#vpfgsfqpjpwfmwjm#Ibmvbqz`lnsqjpjmd?,wjwof=	\ngjsolnbwj``lmwbjmjmdsfqelqnjmdf{wfmpjlmpnbz#mlw#af`lm`fsw#le#lm`oj`h>!Jw#jp#boplejmbm`jbo#nbhjmd#wkfOv{fnalvqdbggjwjlmbobqf#`boofgfmdbdfg#jm!p`qjsw!*8avw#jw#tbpfof`wqlmj`lmpvanjw>!	?"..#Fmg#fof`wqj`boleej`jboozpvddfpwjlmwls#le#wkfvmojhf#wkfBvpwqbojbmLqjdjmboozqfefqfm`fp	?,kfbg=	qf`ldmjpfgjmjwjbojyfojnjwfg#wlBof{bmgqjbqfwjqfnfmwBgufmwvqfpelvq#zfbqp		%ow8"..#jm`qfbpjmdgf`lqbwjlmk0#`obpp>!lqjdjmp#lelaojdbwjlmqfdvobwjlm`obppjejfg+evm`wjlm+bgubmwbdfpafjmd#wkf#kjpwlqjbmp?abpf#kqfeqfsfbwfgoztjoojmd#wl`lnsbqbaofgfpjdmbwfgmlnjmbwjlmevm`wjlmbojmpjgf#wkfqfufobwjlmfmg#le#wkfp#elq#wkf#bvwklqjyfgqfevpfg#wlwbhf#sob`fbvwlmlnlvp`lnsqlnjpfslojwj`bo#qfpwbvqbmwwtl#le#wkfEfaqvbqz#1rvbojwz#leptelaif`w-vmgfqpwbmgmfbqoz#bootqjwwfm#azjmwfqujftp!#tjgwk>!2tjwkgqbtboeolbw9ofewjp#vpvbooz`bmgjgbwfpmftpsbsfqpnzpwfqjlvpGfsbqwnfmwafpw#hmltmsbqojbnfmwpvssqfppfg`lmufmjfmwqfnfnafqfggjeefqfmw#pzpwfnbwj`kbp#ofg#wlsqlsbdbmgb`lmwqloofgjmeovfm`fp`fqfnlmjbosql`objnfgSqlwf`wjlmoj#`obpp>!P`jfmwjej``obpp>!ml.wqbgfnbqhpnlqf#wkbm#tjgfpsqfbgOjafqbwjlmwllh#sob`fgbz#le#wkfbp#olmd#bpjnsqjplmfgBggjwjlmbo	?kfbg=	?nObalqbwlqzMlufnafq#1f{`fswjlmpJmgvpwqjboubqjfwz#leeolbw9#ofeGvqjmd#wkfbppfppnfmwkbuf#affm#gfbop#tjwkPwbwjpwj`pl``vqqfm`f,vo=?,gju=`ofbqej{!=wkf#svaoj`nbmz#zfbqptkj`k#tfqflufq#wjnf/pzmlmznlvp`lmwfmw!=	sqfpvnbaozkjp#ebnjozvpfqBdfmw-vmf{sf`wfgjm`ovgjmd#`kboofmdfgb#njmlqjwzvmgfejmfg!afolmdp#wlwbhfm#eqlnjm#L`wlafqslpjwjlm9#pbjg#wl#afqfojdjlvp#Efgfqbwjlm#qltpsbm>!lmoz#b#eftnfbmw#wkbwofg#wl#wkf..=	?gju#?ejfogpfw=Bq`kajpkls#`obpp>!mlafjmd#vpfgbssqlb`kfpsqjujofdfpmlp`qjsw=	qfpvowp#jmnbz#af#wkfFbpwfq#fddnf`kbmjpnpqfbplmbaofSlsvobwjlm@loof`wjlmpfof`wfg!=mlp`qjsw=,jmgf{-sksbqqjubo#le.ippgh$**8nbmbdfg#wljm`lnsofwf`bpvbowjfp`lnsofwjlm@kqjpwjbmpPfswfnafq#bqjwknfwj`sql`fgvqfpnjdkw#kbufSqlgv`wjlmjw#bssfbqpSkjolplskzeqjfmgpkjsofbgjmd#wldjujmd#wkfwltbqg#wkfdvbqbmwffggl`vnfmwfg`lolq9 333ujgfl#dbnf`lnnjppjlmqfeof`wjmd`kbmdf#wkfbppl`jbwfgpbmp.pfqjelmhfzsqfpp8#sbggjmd9Kf#tbp#wkfvmgfqozjmdwzsj`booz#/#bmg#wkf#pq`Fofnfmwpv``fppjufpjm`f#wkf#pklvog#af#mfwtlqhjmdb``lvmwjmdvpf#le#wkfoltfq#wkbmpkltp#wkbw?,psbm=	\n\n`lnsobjmwp`lmwjmvlvprvbmwjwjfpbpwqlmlnfqkf#gjg#mlwgvf#wl#jwpbssojfg#wlbm#bufqbdffeelqwp#wlwkf#evwvqfbwwfnsw#wlWkfqfelqf/`bsbajojwzQfsvaoj`bmtbp#elqnfgFof`wqlmj`hjolnfwfqp`kboofmdfpsvaojpkjmdwkf#elqnfqjmgjdfmlvpgjqf`wjlmppvapjgjbqz`lmpsjqb`zgfwbjop#lebmg#jm#wkfbeelqgbaofpvapwbm`fpqfbplm#elq`lmufmwjlmjwfnwzsf>!baplovwfozpvsslpfgozqfnbjmfg#bbwwqb`wjufwqbufoojmdpfsbqbwfozel`vpfp#lmfofnfmwbqzbssoj`baofelvmg#wkbwpwzofpkffwnbmvp`qjswpwbmgp#elq#ml.qfsfbw+plnfwjnfp@lnnfq`jbojm#Bnfqj`bvmgfqwbhfmrvbqwfq#lebm#f{bnsofsfqplmboozjmgf{-sks<?,avwwlm=	sfq`fmwbdfafpw.hmltm`qfbwjmd#b!#gjq>!owqOjfvwfmbmw	?gju#jg>!wkfz#tlvogbajojwz#lenbgf#vs#lemlwfg#wkbw`ofbq#wkbwbqdvf#wkbwwl#bmlwkfq`kjogqfm$psvqslpf#leelqnvobwfgabpfg#vslmwkf#qfdjlmpvaif`w#lesbppfmdfqpslppfppjlm-		Jm#wkf#Afelqf#wkfbewfqtbqgp`vqqfmwoz#b`qlpp#wkfp`jfmwjej``lnnvmjwz-`bsjwbojpnjm#Dfqnbmzqjdkw.tjmdwkf#pzpwfnPl`jfwz#leslojwj`jbmgjqf`wjlm9tfmw#lm#wlqfnlubo#le#Mft#Zlqh#bsbqwnfmwpjmgj`bwjlmgvqjmd#wkfvmofpp#wkfkjpwlqj`bokbg#affm#bgfejmjwjufjmdqfgjfmwbwwfmgbm`f@fmwfq#elqsqlnjmfm`fqfbgzPwbwfpwqbwfdjfpavw#jm#wkfbp#sbqw#le`lmpwjwvwf`objn#wkbwobalqbwlqz`lnsbwjaofebjovqf#le/#pv`k#bp#afdbm#tjwkvpjmd#wkf#wl#sqlujgfefbwvqf#leeqln#tkj`k,!#`obpp>!dfloldj`bopfufqbo#legfojafqbwfjnslqwbmw#klogp#wkbwjmd%rvlw8#ubojdm>wlswkf#Dfqnbmlvwpjgf#lemfdlwjbwfgkjp#`bqffqpfsbqbwjlmjg>!pfbq`ktbp#`boofgwkf#elvqwkqf`qfbwjlmlwkfq#wkbmsqfufmwjlmtkjof#wkf#fgv`bwjlm/`lmmf`wjmdb``vqbwfoztfqf#avjowtbp#hjoofgbdqffnfmwpnv`k#nlqf#Gvf#wl#wkftjgwk9#233plnf#lwkfqHjmdgln#lewkf#fmwjqfebnlvp#elqwl#`lmmf`wlaif`wjufpwkf#Eqfm`ksflsof#bmgefbwvqfg!=jp#pbjg#wlpwqv`wvqboqfefqfmgvnnlpw#lewfmb#pfsbqbwf.=	?gju#jg#Leej`jbo#tlqogtjgf-bqjb.obafowkf#sobmfwbmg#jw#tbpg!#ubovf>!ollhjmd#bwafmfej`jbobqf#jm#wkfnlmjwlqjmdqfslqwfgozwkf#nlgfqmtlqhjmd#lmbooltfg#wltkfqf#wkf#jmmlubwjuf?,b=?,gju=plvmgwqb`hpfbq`kElqnwfmg#wl#afjmsvw#jg>!lsfmjmd#leqfpwqj`wfgbglswfg#azbggqfppjmdwkfloldjbmnfwklgp#leubqjbmw#le@kqjpwjbm#ufqz#obqdfbvwlnlwjufaz#ebq#wkfqbmdf#eqlnsvqpvjw#leeloolt#wkfaqlvdkw#wljm#Fmdobmgbdqff#wkbwb``vpfg#le`lnfp#eqlnsqfufmwjmdgju#pwzof>kjp#lq#kfqwqfnfmglvpeqffgln#le`lm`fqmjmd3#2fn#2fn8Abphfwaboo,pwzof-`ppbm#fbqojfqfufm#bewfq,!#wjwof>!-`ln,jmgf{wbhjmd#wkfsjwwpavqdk`lmwfmw!=?p`qjsw=+ewvqmfg#lvwkbujmd#wkf?,psbm=	#l``bpjlmboaf`bvpf#jwpwbqwfg#wlskzpj`booz=?,gju=	##`qfbwfg#az@vqqfmwoz/#ad`lolq>!wbajmgf{>!gjpbpwqlvpBmbozwj`p#bopl#kbp#b=?gju#jg>!?,pwzof=	?`boofg#elqpjmdfq#bmg-pq`#>#!,,ujlobwjlmpwkjp#sljmw`lmpwbmwozjp#ol`bwfgqf`lqgjmdpg#eqln#wkfmfgfqobmgpslqwvdv/Fp;N;};D;u;F5m4K4]4_7`gfpbqqlool`lnfmwbqjlfgv`b`j/_mpfswjfnaqfqfdjpwqbglgjqf``j/_mvaj`b`j/_msvaoj`jgbgqfpsvfpwbpqfpvowbglpjnslqwbmwfqfpfqubglpbqw/A`volpgjefqfmwfppjdvjfmwfpqfs/Vaoj`bpjwvb`j/_mnjmjpwfqjlsqjub`jgbggjqf`wlqjlelqnb`j/_mslaob`j/_msqfpjgfmwf`lmw', 'fmjglpb``fplqjlpwf`kmlqbwjsfqplmbofp`bwfdlq/Abfpsf`jbofpgjpslmjaofb`wvbojgbgqfefqfm`jbuboobglojgajaojlwf`bqfob`jlmfp`bofmgbqjlslo/Awj`bpbmwfqjlqfpgl`vnfmwlpmbwvqbofybnbwfqjbofpgjefqfm`jbf`lm/_nj`bwqbmpslqwfqlgq/Advfysbqwj`jsbqfm`vfmwqbmgjp`vpj/_mfpwqv`wvqbevmgb`j/_meqf`vfmwfpsfqnbmfmwfwlwbonfmwf<P<R<Z<Q<R<]=o<X<Y=n<P<R<Z<Y=n<^=l<Y<P=c=n<\\<V<Z<Y=k=n<R<]=g<]<R<W<Y<Y<R=k<Y<Q=`=a=n<R<_<R<V<R<_<X<\\<S<R=m<W<Y<^=m<Y<_<R=m<\\<U=n<Y=k<Y=l<Y<[<P<R<_=o=n=m<\\<U=n<\\<Z<T<[<Q<T<P<Y<Z<X=o<]=o<X=o=n<s<R<T=m<V<[<X<Y=m=`<^<T<X<Y<R=m<^=c<[<T<Q=o<Z<Q<R=m<^<R<Y<U<W=b<X<Y<U<S<R=l<Q<R<P<Q<R<_<R<X<Y=n<Y<U=m<^<R<T=i<S=l<\\<^<\\=n<\\<V<R<U<P<Y=m=n<R<T<P<Y<Y=n<Z<T<[<Q=`<R<X<Q<R<U<W=o=k=d<Y<S<Y=l<Y<X=k<\\=m=n<T=k<\\=m=n=`=l<\\<]<R=n<Q<R<^=g=i<S=l<\\<^<R=m<R<]<R<U<S<R=n<R<P<P<Y<Q<Y<Y=k<T=m<W<Y<Q<R<^=g<Y=o=m<W=o<_<R<V<R<W<R<Q<\\<[<\\<X=n<\\<V<R<Y=n<R<_<X<\\<S<R=k=n<T<s<R=m<W<Y=n<\\<V<T<Y<Q<R<^=g<U=m=n<R<T=n=n<\\<V<T=i=m=l<\\<[=o<M<\\<Q<V=n=h<R=l=o<P<v<R<_<X<\\<V<Q<T<_<T=m<W<R<^<\\<Q<\\=d<Y<U<Q<\\<U=n<T=m<^<R<T<P=m<^=c<[=`<W=b<]<R<U=k<\\=m=n<R=m=l<Y<X<T<v=l<R<P<Y<H<R=l=o<P=l=g<Q<V<Y=m=n<\\<W<T<S<R<T=m<V=n=g=m=c=k<P<Y=m=c=j=j<Y<Q=n=l=n=l=o<X<\\=m<\\<P=g=i=l=g<Q<V<\\<q<R<^=g<U=k<\\=m<R<^<P<Y=m=n<\\=h<T<W=`<P<P<\\=l=n<\\=m=n=l<\\<Q<P<Y=m=n<Y=n<Y<V=m=n<Q<\\=d<T=i<P<T<Q=o=n<T<P<Y<Q<T<T<P<Y=b=n<Q<R<P<Y=l<_<R=l<R<X=m<\\<P<R<P=a=n<R<P=o<V<R<Q=j<Y=m<^<R<Y<P<V<\\<V<R<U<|=l=i<T<^5i5j4F4C5e4I4]4_4K5h4]4_4K5h4E4K5h4U4K5i5o4F4D5k4K4D4]4K5i4@4K5h5f5d5i4K5h4Y5d4]4@4C5f4C4E4K5h4U4Z5d4I4Z4K5m4E4K5h5n4_5i4K5h4U4K4D4F4A5i5f5h5i5h5m4K4F5i5h4F5n5e4F4U4C5f5h4K5h4X4U4]4O4B4D4K4]4F4[5d5f4]4U5h5f5o5i4I4]5m4K5n4[5h4D4K4F4K5h5h4V4E4F4]4F5f4D4K5h5j4K4_4K5h4X5f4B5i5j4F4C5f4K5h4U4]4D4K5h5n4Y4Y4K5m5h4K5i4U5h5f5k4K4F4A4C5f4G4K5h5h5k5i4K5h4U5i5h5i5o4F4D4E5f5i5o5j5o4K5h4[5m5h5m5f4C5f5d4I4C4K4]4E4F4K4]5f4B4K5h4Y4A4E4F4_4@5f5h4K5h5d5n4F4U5j4C5i4K5i4C5f5j4E4F4Y5i5f5i4O4]4X5f5m4K5h4\\5f5j4U4]4D5f4E4D5d4K4D4E4O5h4U4K4D4K5h4_5m4]5i4X4K5o5h4F4U4K5h5e4K5h4O5d5h4K5h4_5j4E4@4K5i4U4E4K5h4Y4A5m4K5h4C5f5j5o5h5i4K4F4K5h4B4K4Y4K5h5i5h5m4O4U4Z4K4M5o4F4K4D4E4K5h4B5f4]4]4_4K4J5h4K5h5n5h4D4K5h4O4C4D5i5n4K4[4U5i4]4K4_5h5i5j4[5n4E4K5h5o4F4D4K5h4]4@5h4K4X4F4]5o4K5h5n4C5i5f4U4[5f5opAzWbdMbnf+-isd!#bow>!2s{#plojg# -dje!#bow>!wqbmpsbqfmwjmelqnbwjlmbssoj`bwjlm!#lm`oj`h>!fpwbaojpkfgbgufqwjpjmd-smd!#bow>!fmujqlmnfmwsfqelqnbm`fbssqlsqjbwf%bns8ngbpk8jnnfgjbwfoz?,pwqlmd=?,qbwkfq#wkbmwfnsfqbwvqfgfufolsnfmw`lnsfwjwjlmsob`fklogfqujpjajojwz9`lszqjdkw!=3!#kfjdkw>!fufm#wklvdkqfsob`fnfmwgfpwjmbwjlm@lqslqbwjlm?vo#`obpp>!Bppl`jbwjlmjmgjujgvbopsfqpsf`wjufpfwWjnflvw+vqo+kwws9,,nbwkfnbwj`pnbqdjm.wls9fufmwvbooz#gfp`qjswjlm*#ml.qfsfbw`loof`wjlmp-ISDwkvnasbqwj`jsbwf,kfbg=?algzeolbw9ofew8?oj#`obpp>!kvmgqfgp#le		Kltfufq/#`lnslpjwjlm`ofbq9alwk8`llsfqbwjlmtjwkjm#wkf#obafo#elq>!alqgfq.wls9Mft#Yfbobmgqf`lnnfmgfgsklwldqbskzjmwfqfpwjmd%ow8pvs%dw8`lmwqlufqpzMfwkfqobmgpbowfqmbwjufnb{ofmdwk>!ptjwyfqobmgGfufolsnfmwfppfmwjbooz		Bowklvdk#?,wf{wbqfb=wkvmgfqajqgqfsqfpfmwfg%bns8mgbpk8psf`vobwjlm`lnnvmjwjfpofdjpobwjlmfof`wqlmj`p	\n?gju#jg>!joovpwqbwfgfmdjmffqjmdwfqqjwlqjfpbvwklqjwjfpgjpwqjavwfg5!#kfjdkw>!pbmp.pfqje8`bsbaof#le#gjpbssfbqfgjmwfqb`wjufollhjmd#elqjw#tlvog#afBedkbmjpwbmtbp#`qfbwfgNbwk-eollq+pvqqlvmgjmd`bm#bopl#aflapfqubwjlmnbjmwfmbm`ffm`lvmwfqfg?k1#`obpp>!nlqf#qf`fmwjw#kbp#affmjmubpjlm#le*-dfwWjnf+*evmgbnfmwboGfpsjwf#wkf!=?gju#jg>!jmpsjqbwjlmf{bnjmbwjlmsqfsbqbwjlmf{sobmbwjlm?jmsvw#jg>!?,b=?,psbm=ufqpjlmp#lejmpwqvnfmwpafelqf#wkf##>#$kwws9,,Gfp`qjswjlmqfobwjufoz#-pvapwqjmd+fb`k#le#wkff{sfqjnfmwpjmeovfmwjbojmwfdqbwjlmnbmz#sflsofgvf#wl#wkf#`lnajmbwjlmgl#mlw#kbufNjggof#Fbpw?mlp`qjsw=?`lszqjdkw!#sfqkbsp#wkfjmpwjwvwjlmjm#Gf`fnafqbqqbmdfnfmwnlpw#ebnlvpsfqplmbojwz`qfbwjlm#leojnjwbwjlmpf{`ovpjufozplufqfjdmwz.`lmwfmw!=	?wg#`obpp>!vmgfqdqlvmgsbqboofo#wlgl`wqjmf#lel``vsjfg#azwfqnjmloldzQfmbjppbm`fb#mvnafq#lepvsslqw#elqf{solqbwjlmqf`ldmjwjlmsqfgf`fpplq?jnd#pq`>!,?k2#`obpp>!svaoj`bwjlmnbz#bopl#afpsf`jbojyfg?,ejfogpfw=sqldqfppjufnjoojlmp#lepwbwfp#wkbwfmelq`fnfmwbqlvmg#wkf#lmf#bmlwkfq-sbqfmwMlgfbdqj`vowvqfBowfqmbwjufqfpfbq`kfqpwltbqgp#wkfNlpw#le#wkfnbmz#lwkfq#+fpsf`jbooz?wg#tjgwk>!8tjgwk9233&jmgfsfmgfmw?k0#`obpp>!#lm`kbmdf>!*-bgg@obpp+jmwfqb`wjlmLmf#le#wkf#gbvdkwfq#leb``fpplqjfpaqbm`kfp#le	?gju#jg>!wkf#obqdfpwgf`obqbwjlmqfdvobwjlmpJmelqnbwjlmwqbmpobwjlmgl`vnfmwbqzjm#lqgfq#wl!=	?kfbg=	?!#kfjdkw>!2b`qlpp#wkf#lqjfmwbwjlm*8?,p`qjsw=jnsofnfmwfg`bm#af#pffmwkfqf#tbp#bgfnlmpwqbwf`lmwbjmfq!=`lmmf`wjlmpwkf#Aqjwjpktbp#tqjwwfm"jnslqwbmw8s{8#nbqdjm.elooltfg#azbajojwz#wl#`lnsoj`bwfggvqjmd#wkf#jnnjdqbwjlmbopl#`boofg?k7#`obpp>!gjpwjm`wjlmqfsob`fg#azdlufqmnfmwpol`bwjlm#lejm#Mlufnafqtkfwkfq#wkf?,s=	?,gju=b`rvjpjwjlm`boofg#wkf#sfqpf`vwjlmgfpjdmbwjlmxelmw.pjyf9bssfbqfg#jmjmufpwjdbwff{sfqjfm`fgnlpw#ojhfoztjgfoz#vpfggjp`vppjlmpsqfpfm`f#le#+gl`vnfmw-f{wfmpjufozJw#kbp#affmjw#glfp#mlw`lmwqbqz#wljmkbajwbmwpjnsqlufnfmwp`klobqpkjs`lmpvnswjlmjmpwqv`wjlmelq#f{bnsoflmf#lq#nlqfs{8#sbggjmdwkf#`vqqfmwb#pfqjfp#lebqf#vpvboozqlof#jm#wkfsqfujlvpoz#gfqjubwjufpfujgfm`f#lef{sfqjfm`fp`lolqp`kfnfpwbwfg#wkbw`fqwjej`bwf?,b=?,gju=	#pfof`wfg>!kjdk#p`klloqfpslmpf#wl`lnelqwbaofbglswjlm#lewkqff#zfbqpwkf#`lvmwqzjm#Efaqvbqzpl#wkbw#wkfsflsof#tkl#sqlujgfg#az?sbqbn#mbnfbeef`wfg#azjm#wfqnp#lebssljmwnfmwJPL.;;6:.2!tbp#alqm#jmkjpwlqj`bo#qfdbqgfg#bpnfbpvqfnfmwjp#abpfg#lm#bmg#lwkfq#9#evm`wjlm+pjdmjej`bmw`fofaqbwjlmwqbmpnjwwfg,ip,irvfqz-jp#hmltm#bpwkflqfwj`bo#wbajmgf{>!jw#`lvog#af?mlp`qjsw=	kbujmd#affm	?kfbg=	?#%rvlw8Wkf#`lnsjobwjlmkf#kbg#affmsqlgv`fg#azskjolplskfq`lmpwqv`wfgjmwfmgfg#wlbnlmd#lwkfq`lnsbqfg#wlwl#pbz#wkbwFmdjmffqjmdb#gjeefqfmwqfefqqfg#wlgjeefqfm`fpafojfe#wkbwsklwldqbskpjgfmwjezjmdKjpwlqz#le#Qfsvaoj`#lemf`fppbqjozsqlabajojwzwf`kmj`boozofbujmd#wkfpsf`wb`vobqeqb`wjlm#lefof`wqj`jwzkfbg#le#wkfqfpwbvqbmwpsbqwmfqpkjsfnskbpjp#lmnlpw#qf`fmwpkbqf#tjwk#pbzjmd#wkbwejoofg#tjwkgfpjdmfg#wljw#jp#lewfm!=?,jeqbnf=bp#elooltp9nfqdfg#tjwkwkqlvdk#wkf`lnnfq`jbo#sljmwfg#lvwlsslqwvmjwzujft#le#wkfqfrvjqfnfmwgjujpjlm#lesqldqbnnjmdkf#qf`fjufgpfwJmwfqubo!=?,psbm=?,jm#Mft#Zlqhbggjwjlmbo#`lnsqfppjlm		?gju#jg>!jm`lqslqbwf8?,p`qjsw=?bwwb`kFufmwaf`bnf#wkf#!#wbqdfw>!\\`bqqjfg#lvwPlnf#le#wkfp`jfm`f#bmgwkf#wjnf#le@lmwbjmfq!=nbjmwbjmjmd@kqjpwlskfqNv`k#le#wkftqjwjmdp#le!#kfjdkw>!1pjyf#le#wkfufqpjlm#le#nj{wvqf#le#afwtffm#wkfF{bnsofp#lefgv`bwjlmbo`lnsfwjwjuf#lmpvanjw>!gjqf`wlq#legjpwjm`wjuf,GWG#[KWNO#qfobwjmd#wlwfmgfm`z#wlsqlujm`f#letkj`k#tlvoggfpsjwf#wkfp`jfmwjej`#ofdjpobwvqf-jmmfqKWNO#boofdbwjlmpBdqj`vowvqftbp#vpfg#jmbssqlb`k#wljmwfoojdfmwzfbqp#obwfq/pbmp.pfqjegfwfqnjmjmdSfqelqnbm`fbssfbqbm`fp/#tkj`k#jp#elvmgbwjlmpbaaqfujbwfgkjdkfq#wkbmp#eqln#wkf#jmgjujgvbo#`lnslpfg#lepvsslpfg#wl`objnp#wkbwbwwqjavwjlmelmw.pjyf92fofnfmwp#leKjpwlqj`bo#kjp#aqlwkfqbw#wkf#wjnfbmmjufqpbqzdlufqmfg#azqfobwfg#wl#vowjnbwfoz#jmmlubwjlmpjw#jp#pwjoo`bm#lmoz#afgfejmjwjlmpwlDNWPwqjmdB#mvnafq#lejnd#`obpp>!Fufmwvbooz/tbp#`kbmdfgl``vqqfg#jmmfjdkalqjmdgjpwjmdvjpktkfm#kf#tbpjmwqlgv`jmdwfqqfpwqjboNbmz#le#wkfbqdvfp#wkbwbm#Bnfqj`bm`lmrvfpw#letjgfpsqfbg#tfqf#hjoofgp`qffm#bmg#Jm#lqgfq#wlf{sf`wfg#wlgfp`fmgbmwpbqf#ol`bwfgofdjpobwjufdfmfqbwjlmp#ab`hdqlvmgnlpw#sflsofzfbqp#bewfqwkfqf#jp#mlwkf#kjdkfpweqfrvfmwoz#wkfz#gl#mlwbqdvfg#wkbwpkltfg#wkbwsqfglnjmbmwwkfloldj`boaz#wkf#wjnf`lmpjgfqjmdpklqw.ojufg?,psbm=?,b=`bm#af#vpfgufqz#ojwwoflmf#le#wkf#kbg#boqfbgzjmwfqsqfwfg`lnnvmj`bwfefbwvqfp#ledlufqmnfmw/?,mlp`qjsw=fmwfqfg#wkf!#kfjdkw>!0Jmgfsfmgfmwslsvobwjlmpobqdf.p`bof-#Bowklvdk#vpfg#jm#wkfgfpwqv`wjlmslppjajojwzpwbqwjmd#jmwtl#lq#nlqff{sqfppjlmppvalqgjmbwfobqdfq#wkbmkjpwlqz#bmg?,lswjlm=	@lmwjmfmwbofojnjmbwjmdtjoo#mlw#afsqb`wj`f#lejm#eqlmw#lepjwf#le#wkffmpvqf#wkbwwl#`qfbwf#bnjppjppjssjslwfmwjboozlvwpwbmgjmdafwwfq#wkbmtkbw#jp#mltpjwvbwfg#jmnfwb#mbnf>!WqbgjwjlmbopvddfpwjlmpWqbmpobwjlmwkf#elqn#lebwnlpskfqj`jgfloldj`bofmwfqsqjpfp`bo`vobwjmdfbpw#le#wkfqfnmbmwp#lesovdjmpsbdf,jmgf{-sks<qfnbjmfg#jmwqbmpelqnfgKf#tbp#bopltbp#boqfbgzpwbwjpwj`bojm#ebulq#leNjmjpwqz#lenlufnfmw#leelqnvobwjlmjp#qfrvjqfg?ojmh#qfo>!Wkjp#jp#wkf#?b#kqfe>!,slsvobqjyfgjmuloufg#jmbqf#vpfg#wlbmg#pfufqbonbgf#az#wkfpffnp#wl#afojhfoz#wkbwSbofpwjmjbmmbnfg#bewfqjw#kbg#affmnlpw#`lnnlmwl#qfefq#wlavw#wkjp#jp`lmpf`vwjufwfnslqbqjozJm#dfmfqbo/`lmufmwjlmpwbhfp#sob`fpvagjujpjlmwfqqjwlqjbolsfqbwjlmbosfqnbmfmwoztbp#obqdfozlvwaqfbh#lejm#wkf#sbpwelooltjmd#b#{nomp9ld>!=?b#`obpp>!`obpp>!wf{w@lmufqpjlm#nbz#af#vpfgnbmveb`wvqfbewfq#afjmd`ofbqej{!=	rvfpwjlm#letbp#fof`wfgwl#af`lnf#baf`bvpf#le#plnf#sflsofjmpsjqfg#azpv``fppevo#b#wjnf#tkfmnlqf#`lnnlmbnlmdpw#wkfbm#leej`jbotjgwk9233&8wf`kmloldz/tbp#bglswfgwl#hffs#wkfpfwwofnfmwpojuf#ajqwkpjmgf{-kwno!@lmmf`wj`vwbppjdmfg#wl%bns8wjnfp8b``lvmw#elqbojdm>qjdkwwkf#`lnsbmzbotbzp#affmqfwvqmfg#wljmuloufnfmwAf`bvpf#wkfwkjp#sfqjlg!#mbnf>!r!#`lmejmfg#wlb#qfpvow#leubovf>!!#,=jp#b`wvboozFmujqlmnfmw	?,kfbg=	@lmufqpfoz/=	?gju#jg>!3!#tjgwk>!2jp#sqlabaozkbuf#af`lnf`lmwqloojmdwkf#sqlaofn`jwjyfmp#leslojwj`jbmpqfb`kfg#wkfbp#fbqoz#bp9mlmf8#lufq?wbaof#`fooubojgjwz#legjqf`woz#wllmnlvpfgltmtkfqf#jw#jptkfm#jw#tbpnfnafqp#le#qfobwjlm#wlb``lnnlgbwfbolmd#tjwk#Jm#wkf#obwfwkf#Fmdojpkgfoj`jlvp!=wkjp#jp#mlwwkf#sqfpfmwje#wkfz#bqfbmg#ejmboozb#nbwwfq#le	\n?,gju=		?,p`qjsw=ebpwfq#wkbmnbilqjwz#lebewfq#tkj`k`lnsbqbwjufwl#nbjmwbjmjnsqluf#wkfbtbqgfg#wkffq!#`obpp>!eqbnfalqgfqqfpwlqbwjlmjm#wkf#pbnfbmbozpjp#lewkfjq#ejqpwGvqjmd#wkf#`lmwjmfmwbopfrvfm`f#leevm`wjlm+*xelmw.pjyf9#tlqh#lm#wkf?,p`qjsw=	?afdjmp#tjwkibubp`qjsw9`lmpwjwvfmwtbp#elvmgfgfrvjojaqjvnbppvnf#wkbwjp#djufm#azmffgp#wl#af`llqgjmbwfpwkf#ubqjlvpbqf#sbqw#lelmoz#jm#wkfpf`wjlmp#lejp#b#`lnnlmwkflqjfp#legjp`lufqjfpbppl`jbwjlmfgdf#le#wkfpwqfmdwk#leslpjwjlm#jmsqfpfmw.gbzvmjufqpboozwl#elqn#wkfavw#jmpwfbg`lqslqbwjlmbwwb`kfg#wljp#`lnnlmozqfbplmp#elq#%rvlw8wkf#`bm#af#nbgftbp#baof#wltkj`k#nfbmpavw#gjg#mlwlmNlvpfLufqbp#slppjaoflsfqbwfg#az`lnjmd#eqlnwkf#sqjnbqzbggjwjlm#leelq#pfufqbowqbmpefqqfgb#sfqjlg#lebqf#baof#wlkltfufq/#jwpklvog#kbufnv`k#obqdfq	\n?,p`qjsw=bglswfg#wkfsqlsfqwz#legjqf`wfg#azfeef`wjufoztbp#aqlvdkw`kjogqfm#leSqldqbnnjmdolmdfq#wkbmnbmvp`qjswptbq#bdbjmpwaz#nfbmp#lebmg#nlpw#lepjnjobq#wl#sqlsqjfwbqzlqjdjmbwjmdsqfpwjdjlvpdqbnnbwj`bof{sfqjfm`f-wl#nbhf#wkfJw#tbp#bopljp#elvmg#jm`lnsfwjwlqpjm#wkf#V-P-qfsob`f#wkfaqlvdkw#wkf`bo`vobwjlmeboo#le#wkfwkf#dfmfqbosqb`wj`boozjm#klmlq#leqfofbpfg#jmqfpjgfmwjbobmg#plnf#lehjmd#le#wkfqfb`wjlm#wl2pw#Fbqo#le`vowvqf#bmgsqjm`jsbooz?,wjwof=	##wkfz#`bm#afab`h#wl#wkfplnf#le#kjpf{slpvqf#wlbqf#pjnjobqelqn#le#wkfbggEbulqjwf`jwjyfmpkjssbqw#jm#wkfsflsof#tjwkjm#sqb`wj`fwl#`lmwjmvf%bns8njmvp8bssqlufg#az#wkf#ejqpw#booltfg#wkfbmg#elq#wkfevm`wjlmjmdsobzjmd#wkfplovwjlm#wlkfjdkw>!3!#jm#kjp#allhnlqf#wkbm#belooltp#wkf`qfbwfg#wkfsqfpfm`f#jm%maps8?,wg=mbwjlmbojpwwkf#jgfb#leb#`kbqb`wfqtfqf#elq`fg#`obpp>!awmgbzp#le#wkfefbwvqfg#jmpkltjmd#wkfjmwfqfpw#jmjm#sob`f#lewvqm#le#wkfwkf#kfbg#leOlqg#le#wkfslojwj`boozkbp#jwp#ltmFgv`bwjlmbobssqlubo#leplnf#le#wkffb`k#lwkfq/afkbujlq#lebmg#af`bvpfbmg#bmlwkfqbssfbqfg#lmqf`lqgfg#jmaob`h%rvlw8nbz#jm`ovgfwkf#tlqog$p`bm#ofbg#wlqfefqp#wl#balqgfq>!3!#dlufqmnfmw#tjmmjmd#wkfqfpvowfg#jm#tkjof#wkf#Tbpkjmdwlm/wkf#pvaif`w`jwz#jm#wkf=?,gju=	\n\nqfeof`w#wkfwl#`lnsofwfaf`bnf#nlqfqbgjlb`wjufqfif`wfg#aztjwklvw#bmzkjp#ebwkfq/tkj`k#`lvog`lsz#le#wkfwl#jmgj`bwfb#slojwj`bob``lvmwp#le`lmpwjwvwfptlqhfg#tjwkfq?,b=?,oj=le#kjp#ojefb``lnsbmjfg`ojfmwTjgwksqfufmw#wkfOfdjpobwjufgjeefqfmwozwldfwkfq#jmkbp#pfufqboelq#bmlwkfqwf{w#le#wkfelvmgfg#wkff#tjwk#wkf#jp#vpfg#elq`kbmdfg#wkfvpvbooz#wkfsob`f#tkfqftkfqfbp#wkf=#?b#kqfe>!!=?b#kqfe>!wkfnpfoufp/bowklvdk#kfwkbw#`bm#afwqbgjwjlmboqlof#le#wkfbp#b#qfpvowqfnluf@kjoggfpjdmfg#aztfpw#le#wkfPlnf#sflsofsqlgv`wjlm/pjgf#le#wkfmftpofwwfqpvpfg#az#wkfgltm#wl#wkfb``fswfg#azojuf#jm#wkfbwwfnswp#wllvwpjgf#wkfeqfrvfm`jfpKltfufq/#jmsqldqbnnfqpbw#ofbpw#jmbssql{jnbwfbowklvdk#jwtbp#sbqw#lebmg#ubqjlvpDlufqmlq#lewkf#bqwj`ofwvqmfg#jmwl=?b#kqfe>!,wkf#f`lmlnzjp#wkf#nlpwnlpw#tjgfoztlvog#obwfqbmg#sfqkbspqjpf#wl#wkfl``vqp#tkfmvmgfq#tkj`k`lmgjwjlmp-wkf#tfpwfqmwkflqz#wkbwjp#sqlgv`fgwkf#`jwz#lejm#tkj`k#kfpffm#jm#wkfwkf#`fmwqboavjogjmd#lenbmz#le#kjpbqfb#le#wkfjp#wkf#lmoznlpw#le#wkfnbmz#le#wkfwkf#TfpwfqmWkfqf#jp#mlf{wfmgfg#wlPwbwjpwj`bo`lopsbm>1#pklqw#pwlqzslppjaof#wlwlsloldj`bo`qjwj`bo#leqfslqwfg#wlb#@kqjpwjbmgf`jpjlm#wljp#frvbo#wlsqlaofnp#leWkjp#`bm#afnfq`kbmgjpfelq#nlpw#leml#fujgfm`ffgjwjlmp#lefofnfmwp#jm%rvlw8-#Wkf`ln,jnbdfp,tkj`k#nbhfpwkf#sql`fppqfnbjmp#wkfojwfqbwvqf/jp#b#nfnafqwkf#slsvobqwkf#bm`jfmwsqlaofnp#jmwjnf#le#wkfgfefbwfg#azalgz#le#wkfb#eft#zfbqpnv`k#le#wkfwkf#tlqh#le@bojelqmjb/pfqufg#bp#bdlufqmnfmw-`lm`fswp#lenlufnfmw#jm\n\n?gju#jg>!jw!#ubovf>!obmdvbdf#lebp#wkfz#bqfsqlgv`fg#jmjp#wkbw#wkff{sobjm#wkfgju=?,gju=	Kltfufq#wkfofbg#wl#wkf\n?b#kqfe>!,tbp#dqbmwfgsflsof#kbuf`lmwjmvbooztbp#pffm#bpbmg#qfobwfgwkf#qlof#lesqlslpfg#azle#wkf#afpwfb`k#lwkfq-@lmpwbmwjmfsflsof#eqlngjbof`wp#lewl#qfujpjlmtbp#qfmbnfgb#plvq`f#lewkf#jmjwjboobvm`kfg#jmsqlujgf#wkfwl#wkf#tfpwtkfqf#wkfqfbmg#pjnjobqafwtffm#wtljp#bopl#wkfFmdojpk#bmg`lmgjwjlmp/wkbw#jw#tbpfmwjwofg#wlwkfnpfoufp-rvbmwjwz#leqbmpsbqfm`zwkf#pbnf#bpwl#iljm#wkf`lvmwqz#bmgwkjp#jp#wkfWkjp#ofg#wlb#pwbwfnfmw`lmwqbpw#wlobpwJmgf{Lewkqlvdk#kjpjp#gfpjdmfgwkf#wfqn#jpjp#sqlujgfgsqlwf`w#wkfmd?,b=?,oj=Wkf#`vqqfmwwkf#pjwf#lepvapwbmwjbof{sfqjfm`f/jm#wkf#Tfpwwkfz#pklvogpolufm(ajmb`lnfmwbqjlpvmjufqpjgbg`lmgj`jlmfpb`wjujgbgfpf{sfqjfm`jbwf`mlold/Absqlgv``j/_msvmwvb`j/_mbsoj`b`j/_m`lmwqbpf/]b`bwfdlq/Abpqfdjpwqbqpfsqlefpjlmbowqbwbnjfmwlqfd/Apwqbwfpf`qfwbq/Absqjm`jsbofpsqlwf``j/_mjnslqwbmwfpjnslqwbm`jbslpjajojgbgjmwfqfpbmwf`qf`jnjfmwlmf`fpjgbgfppvp`qjajqpfbpl`jb`j/_mgjpslmjaofpfubovb`j/_mfpwvgjbmwfpqfpslmpbaofqfplov`j/_mdvbgbobibqbqfdjpwqbglplslqwvmjgbg`lnfq`jbofpelwldqbe/Abbvwlqjgbgfpjmdfmjfq/Abwfofujpj/_m`lnsfwfm`jblsfqb`jlmfpfpwbaof`jglpjnsofnfmwfb`wvbonfmwfmbufdb`j/_m`lmelqnjgbgojmf.kfjdkw9elmw.ebnjoz9!#9#!kwws9,,bssoj`bwjlmpojmh!#kqfe>!psf`jej`booz,,?"X@GBWBX	Lqdbmjybwjlmgjpwqjavwjlm3s{8#kfjdkw9qfobwjlmpkjsgfuj`f.tjgwk?gju#`obpp>!?obafo#elq>!qfdjpwqbwjlm?,mlp`qjsw=	,jmgf{-kwno!tjmglt-lsfm+#"jnslqwbmw8bssoj`bwjlm,jmgfsfmgfm`f,,ttt-dlldoflqdbmjybwjlmbvwl`lnsofwfqfrvjqfnfmwp`lmpfqubwjuf?elqn#mbnf>!jmwfoof`wvbonbqdjm.ofew92;wk#`fmwvqzbm#jnslqwbmwjmpwjwvwjlmpbaaqfujbwjlm?jnd#`obpp>!lqdbmjpbwjlm`jujojybwjlm2:wk#`fmwvqzbq`kjwf`wvqfjm`lqslqbwfg13wk#`fmwvqz.`lmwbjmfq!=nlpw#mlwbaoz,=?,b=?,gju=mlwjej`bwjlm$vmgfejmfg$*Evqwkfqnlqf/afojfuf#wkbwjmmfqKWNO#>#sqjlq#wl#wkfgqbnbwj`boozqfefqqjmd#wlmfdlwjbwjlmpkfbgrvbqwfqpPlvwk#Beqj`bvmpv``fppevoSfmmpzoubmjbBp#b#qfpvow/?kwno#obmd>!%ow8,pvs%dw8gfbojmd#tjwkskjobgfoskjbkjpwlqj`booz*8?,p`qjsw=	sbggjmd.wls9f{sfqjnfmwbodfwBwwqjavwfjmpwqv`wjlmpwf`kmloldjfpsbqw#le#wkf#>evm`wjlm+*xpvap`qjswjlmo-gwg!=	?kwdfldqbskj`bo@lmpwjwvwjlm$/#evm`wjlm+pvsslqwfg#azbdqj`vowvqbo`lmpwqv`wjlmsvaoj`bwjlmpelmw.pjyf9#2b#ubqjfwz#le?gju#pwzof>!Fm`z`olsfgjbjeqbnf#pq`>!gfnlmpwqbwfgb``lnsojpkfgvmjufqpjwjfpGfnldqbskj`p*8?,p`qjsw=?gfgj`bwfg#wlhmltofgdf#lepbwjpeb`wjlmsbqwj`vobqoz?,gju=?,gju=Fmdojpk#+VP*bssfmg@kjog+wqbmpnjppjlmp-#Kltfufq/#jmwfoojdfm`f!#wbajmgf{>!eolbw9qjdkw8@lnnlmtfbowkqbmdjmd#eqlnjm#tkj`k#wkfbw#ofbpw#lmfqfsqlgv`wjlmfm`z`olsfgjb8elmw.pjyf92ivqjpgj`wjlmbw#wkbw#wjnf!=?b#`obpp>!Jm#bggjwjlm/gfp`qjswjlm(`lmufqpbwjlm`lmwb`w#tjwkjp#dfmfqboozq!#`lmwfmw>!qfsqfpfmwjmd%ow8nbwk%dw8sqfpfmwbwjlml``bpjlmbooz?jnd#tjgwk>!mbujdbwjlm!=`lnsfmpbwjlm`kbnsjlmpkjsnfgjb>!boo!#ujlobwjlm#leqfefqfm`f#wlqfwvqm#wqvf8Pwqj`w,,FM!#wqbmpb`wjlmpjmwfqufmwjlmufqjej`bwjlmJmelqnbwjlm#gjeej`vowjfp@kbnsjlmpkjs`bsbajojwjfp?"Xfmgje^..=~	?,p`qjsw=	@kqjpwjbmjwzelq#f{bnsof/Sqlefppjlmboqfpwqj`wjlmppvddfpw#wkbwtbp#qfofbpfg+pv`k#bp#wkfqfnluf@obpp+vmfnsolznfmwwkf#Bnfqj`bmpwqv`wvqf#le,jmgf{-kwno#svaojpkfg#jmpsbm#`obpp>!!=?b#kqfe>!,jmwqlgv`wjlmafolmdjmd#wl`objnfg#wkbw`lmpfrvfm`fp?nfwb#mbnf>!Dvjgf#wl#wkflufqtkfonjmdbdbjmpw#wkf#`lm`fmwqbwfg/	-mlmwlv`k#lapfqubwjlmp?,b=	?,gju=	e#+gl`vnfmw-alqgfq9#2s{#xelmw.pjyf92wqfbwnfmw#le3!#kfjdkw>!2nlgjej`bwjlmJmgfsfmgfm`fgjujgfg#jmwldqfbwfq#wkbmb`kjfufnfmwpfpwbaojpkjmdIbubP`qjsw!#mfufqwkfofpppjdmjej`bm`fAqlbg`bpwjmd=%maps8?,wg=`lmwbjmfq!=	pv`k#bp#wkf#jmeovfm`f#leb#sbqwj`vobqpq`>$kwws9,,mbujdbwjlm!#kboe#le#wkf#pvapwbmwjbo#%maps8?,gju=bgubmwbdf#legjp`lufqz#leevmgbnfmwbo#nfwqlslojwbmwkf#lsslpjwf!#{no9obmd>!gfojafqbwfozbojdm>`fmwfqfulovwjlm#lesqfpfqubwjlmjnsqlufnfmwpafdjmmjmd#jmIfpvp#@kqjpwSvaoj`bwjlmpgjpbdqffnfmwwf{w.bojdm9q/#evm`wjlm+*pjnjobqjwjfpalgz=?,kwno=jp#`vqqfmwozboskbafwj`bojp#plnfwjnfpwzsf>!jnbdf,nbmz#le#wkf#eolt9kjggfm8bubjobaof#jmgfp`qjaf#wkff{jpwfm`f#leboo#lufq#wkfwkf#Jmwfqmfw\n?vo#`obpp>!jmpwboobwjlmmfjdkalqkllgbqnfg#elq`fpqfgv`jmd#wkf`lmwjmvfp#wlMlmfwkfofpp/wfnsfqbwvqfp	\n\n?b#kqfe>!`olpf#wl#wkff{bnsofp#le#jp#balvw#wkf+pff#afolt*-!#jg>!pfbq`ksqlefppjlmbojp#bubjobaofwkf#leej`jbo\n\n?,p`qjsw=		\n\n?gju#jg>!b``fofqbwjlmwkqlvdk#wkf#Kboo#le#Ebnfgfp`qjswjlmpwqbmpobwjlmpjmwfqefqfm`f#wzsf>$wf{w,qf`fmw#zfbqpjm#wkf#tlqogufqz#slsvobqxab`hdqlvmg9wqbgjwjlmbo#plnf#le#wkf#`lmmf`wfg#wlf{soljwbwjlmfnfqdfm`f#le`lmpwjwvwjlmB#Kjpwlqz#lepjdmjej`bmw#nbmveb`wvqfgf{sf`wbwjlmp=?mlp`qjsw=?`bm#af#elvmgaf`bvpf#wkf#kbp#mlw#affmmfjdkalvqjmdtjwklvw#wkf#bggfg#wl#wkf\n?oj#`obpp>!jmpwqvnfmwboPlujfw#Vmjlmb`hmltofgdfgtkj`k#`bm#afmbnf#elq#wkfbwwfmwjlm#wlbwwfnswp#wl#gfufolsnfmwpJm#eb`w/#wkf?oj#`obpp>!bjnsoj`bwjlmppvjwbaof#elqnv`k#le#wkf#`lolmjybwjlmsqfpjgfmwjbo`bm`foAvaaof#Jmelqnbwjlmnlpw#le#wkf#jp#gfp`qjafgqfpw#le#wkf#nlqf#lq#ofppjm#PfswfnafqJmwfoojdfm`fpq`>!kwws9,,s{8#kfjdkw9#bubjobaof#wlnbmveb`wvqfqkvnbm#qjdkwpojmh#kqfe>!,bubjobajojwzsqlslqwjlmbolvwpjgf#wkf#bpwqlmlnj`bokvnbm#afjmdpmbnf#le#wkf#bqf#elvmg#jmbqf#abpfg#lmpnboofq#wkbmb#sfqplm#tklf{sbmpjlm#lebqdvjmd#wkbwmlt#hmltm#bpJm#wkf#fbqozjmwfqnfgjbwfgfqjufg#eqlnP`bmgjmbujbm?,b=?,gju=	`lmpjgfq#wkfbm#fpwjnbwfgwkf#Mbwjlmbo?gju#jg>!sbdqfpvowjmd#jm`lnnjppjlmfgbmboldlvp#wlbqf#qfrvjqfg,vo=	?,gju=	tbp#abpfg#lmbmg#af`bnf#b%maps8%maps8w!#ubovf>!!#tbp#`bswvqfgml#nlqf#wkbmqfpsf`wjufoz`lmwjmvf#wl#=	?kfbg=	?tfqf#`qfbwfgnlqf#dfmfqbojmelqnbwjlm#vpfg#elq#wkfjmgfsfmgfmw#wkf#Jnsfqjbo`lnslmfmw#lewl#wkf#mlqwkjm`ovgf#wkf#@lmpwqv`wjlmpjgf#le#wkf#tlvog#mlw#afelq#jmpwbm`fjmufmwjlm#lenlqf#`lnsof{`loof`wjufozab`hdqlvmg9#wf{w.bojdm9#jwp#lqjdjmbojmwl#b``lvmwwkjp#sql`fppbm#f{wfmpjufkltfufq/#wkfwkfz#bqf#mlwqfif`wfg#wkf`qjwj`jpn#legvqjmd#tkj`ksqlabaoz#wkfwkjp#bqwj`of+evm`wjlm+*xJw#pklvog#afbm#bdqffnfmwb``jgfmwboozgjeefqp#eqlnBq`kjwf`wvqfafwwfq#hmltmbqqbmdfnfmwpjmeovfm`f#lmbwwfmgfg#wkfjgfmwj`bo#wlplvwk#le#wkfsbpp#wkqlvdk{no!#wjwof>!tfjdkw9alog8`qfbwjmd#wkfgjpsobz9mlmfqfsob`fg#wkf?jnd#pq`>!,jkwwsp9,,ttt-Tlqog#Tbq#JJwfpwjnlmjbopelvmg#jm#wkfqfrvjqfg#wl#bmg#wkbw#wkfafwtffm#wkf#tbp#gfpjdmfg`lmpjpwp#le#`lmpjgfqbaozsvaojpkfg#azwkf#obmdvbdf@lmpfqubwjlm`lmpjpwfg#leqfefq#wl#wkfab`h#wl#wkf#`pp!#nfgjb>!Sflsof#eqln#bubjobaof#lmsqlufg#wl#afpvddfpwjlmp!tbp#hmltm#bpubqjfwjfp#leojhfoz#wl#af`lnsqjpfg#lepvsslqw#wkf#kbmgp#le#wkf`lvsofg#tjwk`lmmf`w#bmg#alqgfq9mlmf8sfqelqnbm`fpafelqf#afjmdobwfq#af`bnf`bo`vobwjlmplewfm#`boofgqfpjgfmwp#lenfbmjmd#wkbw=?oj#`obpp>!fujgfm`f#elqf{sobmbwjlmpfmujqlmnfmwp!=?,b=?,gju=tkj`k#booltpJmwqlgv`wjlmgfufolsfg#azb#tjgf#qbmdflm#afkboe#leubojdm>!wls!sqjm`jsof#lebw#wkf#wjnf/?,mlp`qjsw=pbjg#wl#kbufjm#wkf#ejqpwtkjof#lwkfqpkzslwkfwj`boskjolplskfqpsltfq#le#wkf`lmwbjmfg#jmsfqelqnfg#azjmbajojwz#wltfqf#tqjwwfmpsbm#pwzof>!jmsvw#mbnf>!wkf#rvfpwjlmjmwfmgfg#elqqfif`wjlm#lejnsojfp#wkbwjmufmwfg#wkfwkf#pwbmgbqgtbp#sqlabaozojmh#afwtffmsqlefpplq#lejmwfqb`wjlmp`kbmdjmd#wkfJmgjbm#L`fbm#`obpp>!obpwtlqhjmd#tjwk$kwws9,,ttt-zfbqp#afelqfWkjp#tbp#wkfqf`qfbwjlmbofmwfqjmd#wkfnfbpvqfnfmwpbm#f{wqfnfozubovf#le#wkfpwbqw#le#wkf	?,p`qjsw=		bm#feelqw#wljm`qfbpf#wkfwl#wkf#plvwkpsb`jmd>!3!=pveej`jfmwozwkf#Fvqlsfbm`lmufqwfg#wl`ofbqWjnflvwgjg#mlw#kbuf`lmpfrvfmwozelq#wkf#mf{wf{wfmpjlm#lef`lmlnj`#bmgbowklvdk#wkfbqf#sqlgv`fgbmg#tjwk#wkfjmpveej`jfmwdjufm#az#wkfpwbwjmd#wkbwf{sfmgjwvqfp?,psbm=?,b=	wklvdkw#wkbwlm#wkf#abpjp`foosbggjmd>jnbdf#le#wkfqfwvqmjmd#wljmelqnbwjlm/pfsbqbwfg#azbppbppjmbwfgp!#`lmwfmw>!bvwklqjwz#lemlqwktfpwfqm?,gju=	?gju#!=?,gju=	##`lmpvowbwjlm`lnnvmjwz#lewkf#mbwjlmbojw#pklvog#afsbqwj`jsbmwp#bojdm>!ofewwkf#dqfbwfpwpfof`wjlm#lepvsfqmbwvqbogfsfmgfmw#lmjp#nfmwjlmfgbooltjmd#wkftbp#jmufmwfgb``lnsbmzjmdkjp#sfqplmbobubjobaof#bwpwvgz#le#wkflm#wkf#lwkfqf{f`vwjlm#leKvnbm#Qjdkwpwfqnp#le#wkfbppl`jbwjlmpqfpfbq`k#bmgpv``ffgfg#azgfefbwfg#wkfbmg#eqln#wkfavw#wkfz#bqf`lnnbmgfq#lepwbwf#le#wkfzfbqp#le#bdfwkf#pwvgz#le?vo#`obpp>!psob`f#jm#wkftkfqf#kf#tbp?oj#`obpp>!ewkfqf#bqf#mltkj`k#af`bnfkf#svaojpkfgf{sqfppfg#jmwl#tkj`k#wkf`lnnjppjlmfqelmw.tfjdkw9wfqqjwlqz#lef{wfmpjlmp!=Qlnbm#Fnsjqffrvbo#wl#wkfJm#`lmwqbpw/kltfufq/#bmgjp#wzsj`boozbmg#kjp#tjef+bopl#`boofg=?vo#`obpp>!feef`wjufoz#fuloufg#jmwlpffn#wl#kbuftkj`k#jp#wkfwkfqf#tbp#mlbm#f{`foofmwboo#le#wkfpfgfp`qjafg#azJm#sqb`wj`f/aqlbg`bpwjmd`kbqdfg#tjwkqfeof`wfg#jmpvaif`wfg#wlnjojwbqz#bmgwl#wkf#sljmwf`lmlnj`boozpfwWbqdfwjmdbqf#b`wvboozuj`wlqz#lufq+*8?,p`qjsw=`lmwjmvlvpozqfrvjqfg#elqfulovwjlmbqzbm#feef`wjufmlqwk#le#wkf/#tkj`k#tbp#eqlmw#le#wkflq#lwkfqtjpfplnf#elqn#lekbg#mlw#affmdfmfqbwfg#azjmelqnbwjlm-sfqnjwwfg#wljm`ovgfp#wkfgfufolsnfmw/fmwfqfg#jmwlwkf#sqfujlvp`lmpjpwfmwozbqf#hmltm#bpwkf#ejfog#lewkjp#wzsf#ledjufm#wl#wkfwkf#wjwof#le`lmwbjmp#wkfjmpwbm`fp#lejm#wkf#mlqwkgvf#wl#wkfjqbqf#gfpjdmfg`lqslqbwjlmptbp#wkbw#wkflmf#le#wkfpfnlqf#slsvobqpv``ffgfg#jmpvsslqw#eqlnjm#gjeefqfmwglnjmbwfg#azgfpjdmfg#elqltmfqpkjs#lebmg#slppjaozpwbmgbqgjyfgqfpslmpfWf{wtbp#jmwfmgfgqf`fjufg#wkfbppvnfg#wkbwbqfbp#le#wkfsqjnbqjoz#jmwkf#abpjp#lejm#wkf#pfmpfb``lvmwp#elqgfpwqlzfg#azbw#ofbpw#wtltbp#gf`obqfg`lvog#mlw#afPf`qfwbqz#lebssfbq#wl#afnbqdjm.wls92,]_p(_p(\',df*xwkqlt#f~8wkf#pwbqw#lewtl#pfsbqbwfobmdvbdf#bmgtkl#kbg#affmlsfqbwjlm#legfbwk#le#wkfqfbo#mvnafqp\n?ojmh#qfo>!sqlujgfg#wkfwkf#pwlqz#le`lnsfwjwjlmpfmdojpk#+VH*fmdojpk#+VP*<p<R<Q<_<R<W<M=l<S=m<V<T=m=l<S=m<V<T=m=l<S=m<V<R5h4U4]4D5f4E\nAOGx\bTA\nzk\vBl\bQ\bTA\nzk\vUm\bQ\bTA\nzk\npeu|	i@	cT\bVV\n\\}\nxS	VptSk`	[X	[X\vHR\bPv\bTW\bUe\na\bQp\v_W\vWs\nxS\vAz\n_yKhjmelqnb`j/_mkfqqbnjfmwbpfof`wq/_mj`lgfp`qjs`j/_m`obpjej`bglp`lml`jnjfmwlsvaoj`b`j/_mqfob`jlmbgbpjmelqn/Mwj`bqfob`jlmbglpgfsbqwbnfmwlwqbabibglqfpgjqf`wbnfmwfbzvmwbnjfmwlnfq`bglOjaqf`lmw/M`wfmlpkbajwb`jlmfp`vnsojnjfmwlqfpwbvqbmwfpgjpslpj`j/_m`lmpf`vfm`jbfof`wq/_mj`bbsoj`b`jlmfpgfp`lmf`wbgljmpwbob`j/_mqfbojyb`j/_mvwjojyb`j/_mfm`j`olsfgjbfmefqnfgbgfpjmpwqvnfmwlpf{sfqjfm`jbpjmpwjwv`j/_msbqwj`vobqfppva`bwfdlqjb=n<R<W=`<V<R<L<R=m=m<T<T=l<\\<]<R=n=g<]<R<W=`=d<Y<S=l<R=m=n<R<P<R<Z<Y=n<Y<X=l=o<_<T=i=m<W=o=k<\\<Y=m<Y<U=k<\\=m<^=m<Y<_<X<\\<L<R=m=m<T=c<p<R=m<V<^<Y<X=l=o<_<T<Y<_<R=l<R<X<\\<^<R<S=l<R=m<X<\\<Q<Q=g=i<X<R<W<Z<Q=g<T<P<Y<Q<Q<R<p<R=m<V<^=g=l=o<]<W<Y<U<p<R=m<V<^<\\=m=n=l<\\<Q=g<Q<T=k<Y<_<R=l<\\<]<R=n<Y<X<R<W<Z<Y<Q=o=m<W=o<_<T=n<Y<S<Y=l=`<r<X<Q<\\<V<R<S<R=n<R<P=o=l<\\<]<R=n=o<\\<S=l<Y<W=c<^<R<R<]=e<Y<R<X<Q<R<_<R=m<^<R<Y<_<R=m=n<\\=n=`<T<X=l=o<_<R<U=h<R=l=o<P<Y=i<R=l<R=d<R<S=l<R=n<T<^=m=m=g<W<V<\\<V<\\<Z<X=g<U<^<W<\\=m=n<T<_=l=o<S<S=g<^<P<Y=m=n<Y=l<\\<]<R=n<\\=m<V<\\<[<\\<W<S<Y=l<^=g<U<X<Y<W<\\=n=`<X<Y<Q=`<_<T<S<Y=l<T<R<X<]<T<[<Q<Y=m<R=m<Q<R<^<Y<P<R<P<Y<Q=n<V=o<S<T=n=`<X<R<W<Z<Q<\\=l<\\<P<V<\\=i<Q<\\=k<\\<W<R<L<\\<]<R=n<\\<N<R<W=`<V<R=m<R<^=m<Y<P<^=n<R=l<R<U<Q<\\=k<\\<W<\\=m<S<T=m<R<V=m<W=o<Z<]=g=m<T=m=n<Y<P<S<Y=k<\\=n<T<Q<R<^<R<_<R<S<R<P<R=e<T=m<\\<U=n<R<^<S<R=k<Y<P=o<S<R<P<R=e=`<X<R<W<Z<Q<R=m=m=g<W<V<T<]=g=m=n=l<R<X<\\<Q<Q=g<Y<P<Q<R<_<T<Y<S=l<R<Y<V=n<M<Y<U=k<\\=m<P<R<X<Y<W<T=n<\\<V<R<_<R<R<Q<W<\\<U<Q<_<R=l<R<X<Y<^<Y=l=m<T=c=m=n=l<\\<Q<Y=h<T<W=`<P=g=o=l<R<^<Q=c=l<\\<[<Q=g=i<T=m<V<\\=n=`<Q<Y<X<Y<W=b=c<Q<^<\\=l=c<P<Y<Q=`=d<Y<P<Q<R<_<T=i<X<\\<Q<Q<R<U<[<Q<\\=k<T=n<Q<Y<W=`<[=c=h<R=l=o<P<\\<N<Y<S<Y=l=`<P<Y=m=c=j<\\<[<\\=e<T=n=g<w=o=k=d<T<Y\fHD\fHU\fIl\fHn\fHy\fH\\\fHD\fIk\fHi\fHF\fHD\fIk\fHy\fHS\fHC\fHR\fHy\fH\\\fIk\fHn\fHi\fHD\fIa\fHC\fHy\fIa\fHC\fHR\fH{\fHR\fHk\fHM\fH@\fHR\fH\\\fIk\fHy\fHS\fHT\fIl\fHJ\fHS\fHC\fHR\fHF\fHU\fH^\fIk\fHT\fHS\fHn\fHU\fHA\fHR\fH\\\fHH\fHi\fHF\fHD\fIl\fHY\fHR\fH^\fIk\fHT\fIk\fHY\fHR\fHy\fH\\\fHH\fIk\fHB\fIk\fH\\\fIk\fHU\fIg\fHD\fIk\fHT\fHy\fHH\fIk\fH@\fHU\fIm\fHH\fHT\fHR\fHk\fHs\fHU\fIg\fH{\fHR\fHp\fHR\fHD\fIk\fHB\fHS\fHD\fHs\fHy\fH\\\fHH\fHR\fHy\fH\\\fHD\fHR\fHe\fHD\fHy\fIk\fHC\fHU\fHR\fHm\fHT\fH@\fHT\fIk\fHA\fHR\fH[\fHR\fHj\fHF\fHy\fIk\fH^\fHS\fHC\fIk\fHZ\fIm\fH\\\fIn\fHk\fHT\fHy\fIk\fHt\fHn\fHs\fIk\fHB\fIk\fH\\\fIl\fHT\fHy\fHH\fHR\fHB\fIk\fH\\\fHR\fH^\fIk\fHy\fH\\\fHi\fHK\fHS\fHy\fHi\fHF\fHD\fHR\fHT\fHB\fHR\fHp\fHB\fIm\fHq\fIk\fHy\fHR\fH\\\fHO\fHU\fIg\fHH\fHR\fHy\fHM\fHP\fIl\fHC\fHU\fHR\fHn\fHU\fIg\fHs\fH^\fHZ\fH@\fIa\fHJ\fH^\fHS\fHC\fHR\fHp\fIl\fHY\fHD\fHp\fHR\fHH\fHR\fHy\fId\fHT\fIk\fHj\fHF\fHy\fHR\fHY\fHR\fH^\fIl\fHJ\fIk\fHD\fIk\fHF\fIn\fH\\\fIl\fHF\fHR\fHD\fIl\fHe\fHT\fHy\fIk\fHU\fIg\fH{\fIl\fH@\fId\fHL\fHy\fHj\fHF\fHy\fIl\fHY\fH\\\fIa\fH[\fH{\fHR\fHn\fHY\fHj\fHF\fHy\fIg\fHp\fHS\fH^\fHR\fHp\fHR\fHD\fHR\fHT\fHU\fHB\fHH\fHU\fHB\fIk\fHn\fHe\fHD\fHy\fIl\fHC\fHR\fHU\fIn\fHJ\fH\\\fIa\fHp\fHT\fIn\fHv\fIl\fHF\fHT\fHn\fHJ\fHT\fHY\fHR\fH^\fHU\fIg\fHD\fHR\fHU\fIg\fHH\fIl\fHp\fId\fHT\fIk\fHY\fHR\fHF\fHT\fHp\fHD\fHH\fHR\fHD\fIk\fHH\fHR\fHp\fHR\fH\\\fIl\fHt\fHR\fHC\fH^\fHp\fHS\fH^\fIk\fHD\fIl\fHv\fIk\fHp\fHR\fHn\fHv\fHF\fHH\fIa\fH\\\fH{\fIn\fH{\fH^\fHp\fHR\fHH\fIk\fH@\fHR\fHU\fH\\\fHj\fHF\fHD\fIk\fHY\fHR\fHU\fHD\fHk\fHT\fHy\fHR\fHT\fIm\fH@\fHU\fH\\\fHU\fHD\fIk\fHk\fHT\fHT\fIk\fHT\fHU\fHS\fHH\fH@\fHM\fHP\fIk\fHt\fHs\fHD\fHR\fHH\fH^\fHR\fHZ\fHF\fHR\fHn\fHv\fHZ\fIa\fH\\\fIl\fH@\fHM\fHP\fIl\fHU\fIg\fHH\fIk\fHT\fHR\fHd\fHs\fHZ\fHR\fHC\fHJ\fHT\fHy\fHH\fIl\fHp\fHR\fHH\fIl\fHY\fHR\fH^\fHR\fHU\fHp\fHR\fH\\\fHF\fHs\fHD\fHR\fH\\\fHz\fHD\fIk\fHT\fHM\fHP\fHy\fHB\fHS\fH^\fHR\fHe\fHT\fHy\fIl\fHy\fIk\fHY\fH^\fH^\fH{\fHH\fHR\fHz\fHR\fHD\fHR\fHi\fH\\\fIa\fHI\fHp\fHU\fHR\fHn\fHJ\fIk\fHz\fHR\fHF\fHU\fH^\fIl\fHD\fHS\fHC\fHB\fH@\fHS\fHD\fHR\fH@\fId\fHn\fHy\fHy\fHU\fIl\fHn\fHy\fHU\fHD\fHR\fHJ\fIk\fHH\fHR\fHU\fHB\fH^\fIk\fHy\fHR\fHG\fIl\fHp\fH@\fHy\fHS\fHH\fIm\fH\\\fHH\fHB\fHR\fHn\fH{\fHY\fHU\fIl\fHn\fH\\\fIg\fHp\fHP\fHB\fHS\fH^\fIl\fHj\fH\\\fIg\fHF\fHT\fIk\fHD\fHR\fHC\fHR\fHJ\fHY\fH^\fIk\fHD\fIk\fHz\fHR\fHH\fHR\fHy\fH\\\fIl\fH@\fHe\fHD\fHy\fHR\fHp\fHY\fHR\fH@\fHF\fIn\fH\\\fHR\fH@\fHM\fHP\fHR\fHT\fI`\fHJ\fHR\fHZ\fIk\fHC\fH\\\fHy\fHS\fHC\fIk\fHy\fHU\fHR\fHn\fHi\fHy\fHT\fH\\\fH@\fHD\fHR\fHc\fHY\fHU\fHR\fHn\fHT\fIa\fHI\fH^\fHB\fHS\fH^\fIk\fH^\fIk\fHz\fHy\fHY\fHS\fH[\fHC\fHy\fIa\fH\\\fHn\fHT\fHB\fIn\fHU\fHI\fHR\fHD\fHR4F4_4F4[5f4U5i4X4K4]5o4E4D5d4K4_4[4E4K5h4Y5m4A4E5i5d4K4Z5f4U4K5h4B4K4Y4E4K5h5i4^5f4C4K5h4U4K5i4E4K5h5o4K4F4D4K5h4]4C5d4C4D4]5j4K5i4@4K5h4C5d5h4E4K5h4U4K5h5i4K5h5i5d5n4U4K5h4U4]4D5f4K5h4_4]5f4U4K5h4@5d4K5h4K5h4\\5k4K4D4K5h4A5f4K4E4K5h4A5n5d5n4K5h5o4]5f5i4K5h4U4]4K5n5i4A5m5d4T4E4K5h4G4K5j5f5i4X4K5k4C4E4K5h5i4]4O4E4K5h5n4]4N5j4K5h4X4D4K4D4K5h4A5d4K4]4K5h4@4C5f4C4K5h4O4_4]4E4K5h4U5h5d5i5i4@5i5d4U4E4K5h4]4A5i5j4K5h5j5n4K4[5m5h4_4[5f5j4K5h5o5d5f4F4K5h4C5j5f4K4D4]5o4K4F5k4K5h4]5f4K4Z4F4A5f4K4F5f4D4F5d5n5f4F4K5h4O5d5h5e4K5h4D4]5f4C4K5h5o5h4K5i4K5h4]4K4D4[4K5h4X4B4Y5f4_5f4K4]4K4F4K5h4G4K5h4G4K5h4Y5h4K4E4K5h4A4C5f4G4K5h4^5d4K4]4K5h4B5h5f4@4K5h4@5i5f4U4K5h4U4K5i5k4K5h4@5i4K5h4K5h4_4K4U4E5i4X4K5k4C5k4K5h4]4J5f4_4K5h4C4B5d5h4K5h5m5j5f4E4K5h5o4F4K4D4K5h4C5d4]5f4K5h4C4]5d4_4K4_4F4V4]5n4F4Y4K5i5f5i4K5h4D5j4K4F4K5h4U4T5f5ifmwfqwbjmnfmwvmgfqpwbmgjmd#>#evm`wjlm+*-isd!#tjgwk>!`lmejdvqbwjlm-smd!#tjgwk>!?algz#`obpp>!Nbwk-qbmgln+*`lmwfnslqbqz#Vmjwfg#Pwbwfp`jq`vnpwbm`fp-bssfmg@kjog+lqdbmjybwjlmp?psbm#`obpp>!!=?jnd#pq`>!,gjpwjmdvjpkfgwklvpbmgp#le#`lnnvmj`bwjlm`ofbq!=?,gju=jmufpwjdbwjlmebuj`lm-j`l!#nbqdjm.qjdkw9abpfg#lm#wkf#Nbppb`kvpfwwpwbaof#alqgfq>jmwfqmbwjlmbobopl#hmltm#bpsqlmvm`jbwjlmab`hdqlvmg9 esbggjmd.ofew9Elq#f{bnsof/#njp`foobmflvp%ow8,nbwk%dw8spz`kloldj`bojm#sbqwj`vobqfbq`k!#wzsf>!elqn#nfwklg>!bp#lsslpfg#wlPvsqfnf#@lvqwl``bpjlmbooz#Bggjwjlmbooz/Mlqwk#Bnfqj`bs{8ab`hdqlvmglsslqwvmjwjfpFmwfqwbjmnfmw-wlOltfq@bpf+nbmveb`wvqjmdsqlefppjlmbo#`lnajmfg#tjwkElq#jmpwbm`f/`lmpjpwjmd#le!#nb{ofmdwk>!qfwvqm#ebopf8`lmp`jlvpmfppNfgjwfqqbmfbmf{wqblqgjmbqzbppbppjmbwjlmpvapfrvfmwoz#avwwlm#wzsf>!wkf#mvnafq#lewkf#lqjdjmbo#`lnsqfkfmpjufqfefqp#wl#wkf?,vo=	?,gju=	skjolplskj`bool`bwjlm-kqfetbp#svaojpkfgPbm#Eqbm`jp`l+evm`wjlm+*x	?gju#jg>!nbjmplskjpwj`bwfgnbwkfnbwj`bo#,kfbg=	?algzpvddfpwp#wkbwgl`vnfmwbwjlm`lm`fmwqbwjlmqfobwjlmpkjspnbz#kbuf#affm+elq#f{bnsof/Wkjp#bqwj`of#jm#plnf#`bpfpsbqwp#le#wkf#gfejmjwjlm#leDqfbw#Aqjwbjm#`foosbggjmd>frvjubofmw#wlsob`fklogfq>!8#elmw.pjyf9#ivpwjej`bwjlmafojfufg#wkbwpveefqfg#eqlnbwwfnswfg#wl#ofbgfq#le#wkf`qjsw!#pq`>!,+evm`wjlm+*#xbqf#bubjobaof	\n?ojmh#qfo>!#pq`>$kwws9,,jmwfqfpwfg#jm`lmufmwjlmbo#!#bow>!!#,=?,bqf#dfmfqboozkbp#bopl#affmnlpw#slsvobq#`lqqfpslmgjmd`qfgjwfg#tjwkwzof>!alqgfq9?,b=?,psbm=?,-dje!#tjgwk>!?jeqbnf#pq`>!wbaof#`obpp>!jmojmf.aol`h8b``lqgjmd#wl#wldfwkfq#tjwkbssql{jnbwfozsbqojbnfmwbqznlqf#bmg#nlqfgjpsobz9mlmf8wqbgjwjlmboozsqfglnjmbmwoz%maps8%maps8%maps8?,psbm=#`foopsb`jmd>?jmsvw#mbnf>!lq!#`lmwfmw>!`lmwqlufqpjbosqlsfqwz>!ld9,{.pkl`htbuf.gfnlmpwqbwjlmpvqqlvmgfg#azMfufqwkfofpp/tbp#wkf#ejqpw`lmpjgfqbaof#Bowklvdk#wkf#`loobalqbwjlmpklvog#mlw#afsqlslqwjlm#le?psbm#pwzof>!hmltm#bp#wkf#pklqwoz#bewfqelq#jmpwbm`f/gfp`qjafg#bp#,kfbg=	?algz#pwbqwjmd#tjwkjm`qfbpjmdoz#wkf#eb`w#wkbwgjp`vppjlm#lenjggof#le#wkfbm#jmgjujgvbogjeej`vow#wl#sljmw#le#ujftklnlpf{vbojwzb``fswbm`f#le?,psbm=?,gju=nbmveb`wvqfqplqjdjm#le#wkf`lnnlmoz#vpfgjnslqwbm`f#legfmlnjmbwjlmpab`hdqlvmg9# ofmdwk#le#wkfgfwfqnjmbwjlmb#pjdmjej`bmw!#alqgfq>!3!=qfulovwjlmbqzsqjm`jsofp#lejp#`lmpjgfqfgtbp#gfufolsfgJmgl.Fvqlsfbmuvomfqbaof#wlsqlslmfmwp#lebqf#plnfwjnfp`olpfq#wl#wkfMft#Zlqh#@jwz#mbnf>!pfbq`kbwwqjavwfg#wl`lvqpf#le#wkfnbwkfnbwj`jbmaz#wkf#fmg#lebw#wkf#fmg#le!#alqgfq>!3!#wf`kmloldj`bo-qfnluf@obpp+aqbm`k#le#wkffujgfm`f#wkbw"Xfmgje^..=	Jmpwjwvwf#le#jmwl#b#pjmdofqfpsf`wjufoz-bmg#wkfqfelqfsqlsfqwjfp#lejp#ol`bwfg#jmplnf#le#tkj`kWkfqf#jp#bopl`lmwjmvfg#wl#bssfbqbm`f#le#%bns8mgbpk8#gfp`qjafp#wkf`lmpjgfqbwjlmbvwklq#le#wkfjmgfsfmgfmwozfrvjssfg#tjwkglfp#mlw#kbuf?,b=?b#kqfe>!`lmevpfg#tjwk?ojmh#kqfe>!,bw#wkf#bdf#lebssfbq#jm#wkfWkfpf#jm`ovgfqfdbqgofpp#le`lvog#af#vpfg#pwzof>%rvlw8pfufqbo#wjnfpqfsqfpfmw#wkfalgz=	?,kwno=wklvdkw#wl#afslsvobwjlm#leslppjajojwjfpsfq`fmwbdf#leb``fpp#wl#wkfbm#bwwfnsw#wlsqlgv`wjlm#leirvfqz,irvfqzwtl#gjeefqfmwafolmd#wl#wkffpwbaojpknfmwqfsob`jmd#wkfgfp`qjswjlm!#gfwfqnjmf#wkfbubjobaof#elqB``lqgjmd#wl#tjgf#qbmdf#le\n?gju#`obpp>!nlqf#`lnnlmozlqdbmjpbwjlmpevm`wjlmbojwztbp#`lnsofwfg#%bns8ngbpk8#sbqwj`jsbwjlmwkf#`kbqb`wfqbm#bggjwjlmbobssfbqp#wl#afeb`w#wkbw#wkfbm#f{bnsof#lepjdmjej`bmwozlmnlvpflufq>!af`bvpf#wkfz#bpzm`#>#wqvf8sqlaofnp#tjwkpffnp#wl#kbufwkf#qfpvow#le#pq`>!kwws9,,ebnjojbq#tjwkslppfppjlm#leevm`wjlm#+*#xwllh#sob`f#jmbmg#plnfwjnfppvapwbmwjbooz?psbm=?,psbm=jp#lewfm#vpfgjm#bm#bwwfnswdqfbw#gfbo#leFmujqlmnfmwbopv``fppevooz#ujqwvbooz#boo13wk#`fmwvqz/sqlefppjlmbopmf`fppbqz#wl#gfwfqnjmfg#az`lnsbwjajojwzaf`bvpf#jw#jpGj`wjlmbqz#lenlgjej`bwjlmpWkf#elooltjmdnbz#qfefq#wl9@lmpfrvfmwoz/Jmwfqmbwjlmbobowklvdk#plnfwkbw#tlvog#aftlqog$p#ejqpw`obppjejfg#bpalwwln#le#wkf+sbqwj`vobqozbojdm>!ofew!#nlpw#`lnnlmozabpjp#elq#wkfelvmgbwjlm#le`lmwqjavwjlmpslsvobqjwz#le`fmwfq#le#wkfwl#qfgv`f#wkfivqjpgj`wjlmpbssql{jnbwjlm#lmnlvpflvw>!Mft#Wfpwbnfmw`loof`wjlm#le?,psbm=?,b=?,jm#wkf#Vmjwfgejon#gjqf`wlq.pwqj`w-gwg!=kbp#affm#vpfgqfwvqm#wl#wkfbowklvdk#wkjp`kbmdf#jm#wkfpfufqbo#lwkfqavw#wkfqf#bqfvmsqf`fgfmwfgjp#pjnjobq#wlfpsf`jbooz#jmtfjdkw9#alog8jp#`boofg#wkf`lnsvwbwjlmbojmgj`bwf#wkbwqfpwqj`wfg#wl\n?nfwb#mbnf>!bqf#wzsj`booz`lmeoj`w#tjwkKltfufq/#wkf#Bm#f{bnsof#le`lnsbqfg#tjwkrvbmwjwjfp#leqbwkfq#wkbm#b`lmpwfoobwjlmmf`fppbqz#elqqfslqwfg#wkbwpsf`jej`bwjlmslojwj`bo#bmg%maps8%maps8?qfefqfm`fp#wlwkf#pbnf#zfbqDlufqmnfmw#ledfmfqbwjlm#lekbuf#mlw#affmpfufqbo#zfbqp`lnnjwnfmw#wl\n\n?vo#`obpp>!ujpvbojybwjlm2:wk#`fmwvqz/sqb`wjwjlmfqpwkbw#kf#tlvogbmg#`lmwjmvfgl``vsbwjlm#lejp#gfejmfg#bp`fmwqf#le#wkfwkf#bnlvmw#le=?gju#pwzof>!frvjubofmw#legjeefqfmwjbwfaqlvdkw#balvwnbqdjm.ofew9#bvwlnbwj`boozwklvdkw#le#bpPlnf#le#wkfpf	?gju#`obpp>!jmsvw#`obpp>!qfsob`fg#tjwkjp#lmf#le#wkffgv`bwjlm#bmgjmeovfm`fg#azqfsvwbwjlm#bp	?nfwb#mbnf>!b``lnnlgbwjlm?,gju=	?,gju=obqdf#sbqw#leJmpwjwvwf#elqwkf#pl.`boofg#bdbjmpw#wkf#Jm#wkjp#`bpf/tbp#bssljmwfg`objnfg#wl#afKltfufq/#wkjpGfsbqwnfmw#lewkf#qfnbjmjmdfeef`w#lm#wkfsbqwj`vobqoz#gfbo#tjwk#wkf	?gju#pwzof>!bonlpw#botbzpbqf#`vqqfmwozf{sqfppjlm#leskjolplskz#leelq#nlqf#wkbm`jujojybwjlmplm#wkf#jpobmgpfof`wfgJmgf{`bm#qfpvow#jm!#ubovf>!!#,=wkf#pwqv`wvqf#,=?,b=?,gju=Nbmz#le#wkfpf`bvpfg#az#wkfle#wkf#Vmjwfgpsbm#`obpp>!n`bm#af#wqb`fgjp#qfobwfg#wlaf`bnf#lmf#lejp#eqfrvfmwozojujmd#jm#wkfwkflqfwj`boozElooltjmd#wkfQfulovwjlmbqzdlufqmnfmw#jmjp#gfwfqnjmfgwkf#slojwj`bojmwqlgv`fg#jmpveej`jfmw#wlgfp`qjswjlm!=pklqw#pwlqjfppfsbqbwjlm#lebp#wl#tkfwkfqhmltm#elq#jwptbp#jmjwjboozgjpsobz9aol`hjp#bm#f{bnsofwkf#sqjm`jsbo`lmpjpwp#le#bqf`ldmjyfg#bp,algz=?,kwno=b#pvapwbmwjboqf`lmpwqv`wfgkfbg#le#pwbwfqfpjpwbm`f#wlvmgfqdqbgvbwfWkfqf#bqf#wtldqbujwbwjlmbobqf#gfp`qjafgjmwfmwjlmboozpfqufg#bp#wkf`obpp>!kfbgfqlsslpjwjlm#wlevmgbnfmwboozglnjmbwfg#wkfbmg#wkf#lwkfqboojbm`f#tjwktbp#elq`fg#wlqfpsf`wjufoz/bmg#slojwj`bojm#pvsslqw#lesflsof#jm#wkf13wk#`fmwvqz-bmg#svaojpkfgolbg@kbqwafbwwl#vmgfqpwbmgnfnafq#pwbwfpfmujqlmnfmwboejqpw#kboe#le`lvmwqjfp#bmgbq`kjwf`wvqboaf#`lmpjgfqfg`kbqb`wfqjyfg`ofbqJmwfqubobvwklqjwbwjufEfgfqbwjlm#letbp#pv``ffgfgbmg#wkfqf#bqfb#`lmpfrvfm`fwkf#Sqfpjgfmwbopl#jm`ovgfgeqff#plewtbqfpv``fppjlm#legfufolsfg#wkftbp#gfpwqlzfgbtbz#eqln#wkf8	?,p`qjsw=	?bowklvdk#wkfzelooltfg#az#bnlqf#sltfqevoqfpvowfg#jm#bVmjufqpjwz#leKltfufq/#nbmzwkf#sqfpjgfmwKltfufq/#plnfjp#wklvdkw#wlvmwjo#wkf#fmgtbp#bmmlvm`fgbqf#jnslqwbmwbopl#jm`ovgfp=?jmsvw#wzsf>wkf#`fmwfq#le#GL#MLW#BOWFQvpfg#wl#qfefqwkfnfp,<plqw>wkbw#kbg#affmwkf#abpjp#elqkbp#gfufolsfgjm#wkf#pvnnfq`lnsbqbwjufozgfp`qjafg#wkfpv`k#bp#wklpfwkf#qfpvowjmdjp#jnslppjaofubqjlvp#lwkfqPlvwk#Beqj`bmkbuf#wkf#pbnffeef`wjufmfppjm#tkj`k#`bpf8#wf{w.bojdm9pwqv`wvqf#bmg8#ab`hdqlvmg9qfdbqgjmd#wkfpvsslqwfg#wkfjp#bopl#hmltmpwzof>!nbqdjmjm`ovgjmd#wkfabkbpb#Nfobzvmlqph#alhn/Iomlqph#mzmlqphpolufm)M(ajmbjmwfqmb`jlmbo`bojej`b`j/_m`lnvmj`b`j/_m`lmpwqv``j/_m!=?gju#`obpp>!gjpbnajdvbwjlmGlnbjmMbnf$/#$bgnjmjpwqbwjlmpjnvowbmflvpozwqbmpslqwbwjlmJmwfqmbwjlmbo#nbqdjm.alwwln9qfpslmpjajojwz?"Xfmgje^..=	?,=?nfwb#mbnf>!jnsofnfmwbwjlmjmeqbpwqv`wvqfqfsqfpfmwbwjlmalqgfq.alwwln9?,kfbg=	?algz=>kwws&0B&1E&1E?elqn#nfwklg>!nfwklg>!slpw!#,ebuj`lm-j`l!#~*8	?,p`qjsw=	-pfwBwwqjavwf+Bgnjmjpwqbwjlm>#mft#Bqqbz+*8?"Xfmgje^..=	gjpsobz9aol`h8Vmelqwvmbwfoz/!=%maps8?,gju=,ebuj`lm-j`l!=>$pwzofpkffw$#jgfmwjej`bwjlm/#elq#f{bnsof/?oj=?b#kqfe>!,bm#bowfqmbwjufbp#b#qfpvow#lesw!=?,p`qjsw=	wzsf>!pvanjw!#	+evm`wjlm+*#xqf`lnnfmgbwjlmelqn#b`wjlm>!,wqbmpelqnbwjlmqf`lmpwqv`wjlm-pwzof-gjpsobz#B``lqgjmd#wl#kjggfm!#mbnf>!bolmd#tjwk#wkfgl`vnfmw-algz-bssql{jnbwfoz#@lnnvmj`bwjlmpslpw!#b`wjlm>!nfbmjmd#%rvlw8..?"Xfmgje^..=Sqjnf#Njmjpwfq`kbqb`wfqjpwj`?,b=#?b#`obpp>wkf#kjpwlqz#le#lmnlvpflufq>!wkf#dlufqmnfmwkqfe>!kwwsp9,,tbp#lqjdjmbooztbp#jmwqlgv`fg`obppjej`bwjlmqfsqfpfmwbwjufbqf#`lmpjgfqfg?"Xfmgje^..=		gfsfmgp#lm#wkfVmjufqpjwz#le#jm#`lmwqbpw#wl#sob`fklogfq>!jm#wkf#`bpf#lejmwfqmbwjlmbo#`lmpwjwvwjlmbopwzof>!alqgfq.9#evm`wjlm+*#xAf`bvpf#le#wkf.pwqj`w-gwg!=	?wbaof#`obpp>!b``lnsbmjfg#azb``lvmw#le#wkf?p`qjsw#pq`>!,mbwvqf#le#wkf#wkf#sflsof#jm#jm#bggjwjlm#wlp*8#ip-jg#>#jg!#tjgwk>!233&!qfdbqgjmd#wkf#Qlnbm#@bwkloj`bm#jmgfsfmgfmwelooltjmd#wkf#-dje!#tjgwk>!2wkf#elooltjmd#gjp`qjnjmbwjlmbq`kbfloldj`bosqjnf#njmjpwfq-ip!=?,p`qjsw=`lnajmbwjlm#le#nbqdjmtjgwk>!`qfbwfFofnfmw+t-bwwb`kFufmw+?,b=?,wg=?,wq=pq`>!kwwsp9,,bJm#sbqwj`vobq/#bojdm>!ofew!#@yf`k#Qfsvaoj`Vmjwfg#Hjmdgln`lqqfpslmgfm`f`lm`ovgfg#wkbw-kwno!#wjwof>!+evm`wjlm#+*#x`lnfp#eqln#wkfbssoj`bwjlm#le?psbm#`obpp>!pafojfufg#wl#affnfmw+$p`qjsw$?,b=	?,oj=	?ojufqz#gjeefqfmw=?psbm#`obpp>!lswjlm#ubovf>!+bopl#hmltm#bp\n?oj=?b#kqfe>!=?jmsvw#mbnf>!pfsbqbwfg#eqlnqfefqqfg#wl#bp#ubojdm>!wls!=elvmgfq#le#wkfbwwfnswjmd#wl#`bqalm#gjl{jgf		?gju#`obpp>!`obpp>!pfbq`k.,algz=	?,kwno=lsslqwvmjwz#wl`lnnvmj`bwjlmp?,kfbg=	?algz#pwzof>!tjgwk9Wj\rVSmd#Uj\rWkw`kbmdfp#jm#wkfalqgfq.`lolq9 3!#alqgfq>!3!#?,psbm=?,gju=?tbp#gjp`lufqfg!#wzsf>!wf{w!#*8	?,p`qjsw=		Gfsbqwnfmw#le#f``ofpjbpwj`bowkfqf#kbp#affmqfpvowjmd#eqln?,algz=?,kwno=kbp#mfufq#affmwkf#ejqpw#wjnfjm#qfpslmpf#wlbvwlnbwj`booz#?,gju=		?gju#jtbp#`lmpjgfqfgsfq`fmw#le#wkf!#,=?,b=?,gju=`loof`wjlm#le#gfp`fmgfg#eqlnpf`wjlm#le#wkfb``fsw.`kbqpfwwl#af#`lmevpfgnfnafq#le#wkf#sbggjmd.qjdkw9wqbmpobwjlm#lejmwfqsqfwbwjlm#kqfe>$kwws9,,tkfwkfq#lq#mlwWkfqf#bqf#boplwkfqf#bqf#nbmzb#pnboo#mvnafqlwkfq#sbqwp#lejnslppjaof#wl##`obpp>!avwwlmol`bwfg#jm#wkf-#Kltfufq/#wkfbmg#fufmwvboozBw#wkf#fmg#le#af`bvpf#le#jwpqfsqfpfmwp#wkf?elqn#b`wjlm>!#nfwklg>!slpw!jw#jp#slppjaofnlqf#ojhfoz#wlbm#jm`qfbpf#jmkbuf#bopl#affm`lqqfpslmgp#wlbmmlvm`fg#wkbwbojdm>!qjdkw!=nbmz#`lvmwqjfpelq#nbmz#zfbqpfbqojfpw#hmltmaf`bvpf#jw#tbpsw!=?,p`qjsw=#ubojdm>!wls!#jmkbajwbmwp#leelooltjmd#zfbq	?gju#`obpp>!njoojlm#sflsof`lmwqlufqpjbo#`lm`fqmjmd#wkfbqdvf#wkbw#wkfdlufqmnfmw#bmgb#qfefqfm`f#wlwqbmpefqqfg#wlgfp`qjajmd#wkf#pwzof>!`lolq9bowklvdk#wkfqfafpw#hmltm#elqpvanjw!#mbnf>!nvowjsoj`bwjlmnlqf#wkbm#lmf#qf`ldmjwjlm#le@lvm`jo#le#wkffgjwjlm#le#wkf##?nfwb#mbnf>!Fmwfqwbjmnfmw#btbz#eqln#wkf#8nbqdjm.qjdkw9bw#wkf#wjnf#lejmufpwjdbwjlmp`lmmf`wfg#tjwkbmg#nbmz#lwkfqbowklvdk#jw#jpafdjmmjmd#tjwk#?psbm#`obpp>!gfp`fmgbmwp#le?psbm#`obpp>!j#bojdm>!qjdkw!?,kfbg=	?algz#bpsf`wp#le#wkfkbp#pjm`f#affmFvqlsfbm#Vmjlmqfnjmjp`fmw#lenlqf#gjeej`vowUj`f#Sqfpjgfmw`lnslpjwjlm#lesbppfg#wkqlvdknlqf#jnslqwbmwelmw.pjyf922s{f{sobmbwjlm#lewkf#`lm`fsw#letqjwwfm#jm#wkf\n?psbm#`obpp>!jp#lmf#le#wkf#qfpfnaobm`f#wllm#wkf#dqlvmgptkj`k#`lmwbjmpjm`ovgjmd#wkf#gfejmfg#az#wkfsvaoj`bwjlm#lenfbmp#wkbw#wkflvwpjgf#le#wkfpvsslqw#le#wkf?jmsvw#`obpp>!?psbm#`obpp>!w+Nbwk-qbmgln+*nlpw#sqlnjmfmwgfp`qjswjlm#le@lmpwbmwjmlsoftfqf#svaojpkfg?gju#`obpp>!pfbssfbqp#jm#wkf2!#kfjdkw>!2!#nlpw#jnslqwbmwtkj`k#jm`ovgfptkj`k#kbg#affmgfpwqv`wjlm#lewkf#slsvobwjlm	\n?gju#`obpp>!slppjajojwz#leplnfwjnfp#vpfgbssfbq#wl#kbufpv``fpp#le#wkfjmwfmgfg#wl#afsqfpfmw#jm#wkfpwzof>!`ofbq9a	?,p`qjsw=	?tbp#elvmgfg#jmjmwfqujft#tjwk\\jg!#`lmwfmw>!`bsjwbo#le#wkf	?ojmh#qfo>!pqfofbpf#le#wkfsljmw#lvw#wkbw{NOKwwsQfrvfpwbmg#pvapfrvfmwpf`lmg#obqdfpwufqz#jnslqwbmwpsf`jej`bwjlmppvqeb`f#le#wkfbssojfg#wl#wkfelqfjdm#sloj`z\\pfwGlnbjmMbnffpwbaojpkfg#jmjp#afojfufg#wlJm#bggjwjlm#wlnfbmjmd#le#wkfjp#mbnfg#bewfqwl#sqlwf`w#wkfjp#qfsqfpfmwfgGf`obqbwjlm#lenlqf#feej`jfmw@obppjej`bwjlmlwkfq#elqnp#lekf#qfwvqmfg#wl?psbm#`obpp>!`sfqelqnbm`f#le+evm`wjlm+*#xje#bmg#lmoz#jeqfdjlmp#le#wkfofbgjmd#wl#wkfqfobwjlmp#tjwkVmjwfg#Mbwjlmppwzof>!kfjdkw9lwkfq#wkbm#wkfzsf!#`lmwfmw>!Bppl`jbwjlm#le	?,kfbg=	?algzol`bwfg#lm#wkfjp#qfefqqfg#wl+jm`ovgjmd#wkf`lm`fmwqbwjlmpwkf#jmgjujgvbobnlmd#wkf#nlpwwkbm#bmz#lwkfq,=	?ojmh#qfo>!#qfwvqm#ebopf8wkf#svqslpf#lewkf#bajojwz#wl8`lolq9 eee~	-	?psbm#`obpp>!wkf#pvaif`w#legfejmjwjlmp#le=	?ojmh#qfo>!`objn#wkbw#wkfkbuf#gfufolsfg?wbaof#tjgwk>!`fofaqbwjlm#leElooltjmd#wkf#wl#gjpwjmdvjpk?psbm#`obpp>!awbhfp#sob`f#jmvmgfq#wkf#mbnfmlwfg#wkbw#wkf=?"Xfmgje^..=	pwzof>!nbqdjm.jmpwfbg#le#wkfjmwqlgv`fg#wkfwkf#sql`fpp#lejm`qfbpjmd#wkfgjeefqfm`fp#jmfpwjnbwfg#wkbwfpsf`jbooz#wkf,gju=?gju#jg>!tbp#fufmwvboozwkqlvdklvw#kjpwkf#gjeefqfm`fplnfwkjmd#wkbwpsbm=?,psbm=?,pjdmjej`bmwoz#=?,p`qjsw=		fmujqlmnfmwbo#wl#sqfufmw#wkfkbuf#affm#vpfgfpsf`jbooz#elqvmgfqpwbmg#wkfjp#fppfmwjbooztfqf#wkf#ejqpwjp#wkf#obqdfpwkbuf#affm#nbgf!#pq`>!kwws9,,jmwfqsqfwfg#bppf`lmg#kboe#le`qloojmd>!ml!#jp#`lnslpfg#leJJ/#Kloz#Qlnbmjp#f{sf`wfg#wlkbuf#wkfjq#ltmgfejmfg#bp#wkfwqbgjwjlmbooz#kbuf#gjeefqfmwbqf#lewfm#vpfgwl#fmpvqf#wkbwbdqffnfmw#tjwk`lmwbjmjmd#wkfbqf#eqfrvfmwozjmelqnbwjlm#lmf{bnsof#jp#wkfqfpvowjmd#jm#b?,b=?,oj=?,vo=#`obpp>!ellwfqbmg#fpsf`jboozwzsf>!avwwlm!#?,psbm=?,psbm=tkj`k#jm`ovgfg=	?nfwb#mbnf>!`lmpjgfqfg#wkf`bqqjfg#lvw#azKltfufq/#jw#jpaf`bnf#sbqw#lejm#qfobwjlm#wlslsvobq#jm#wkfwkf#`bsjwbo#letbp#leej`jbooztkj`k#kbp#affmwkf#Kjpwlqz#lebowfqmbwjuf#wlgjeefqfmw#eqlnwl#pvsslqw#wkfpvddfpwfg#wkbwjm#wkf#sql`fpp##?gju#`obpp>!wkf#elvmgbwjlmaf`bvpf#le#kjp`lm`fqmfg#tjwkwkf#vmjufqpjwzlsslpfg#wl#wkfwkf#`lmwf{w#le?psbm#`obpp>!swf{w!#mbnf>!r!\n\n?gju#`obpp>!wkf#p`jfmwjej`qfsqfpfmwfg#aznbwkfnbwj`jbmpfof`wfg#az#wkfwkbw#kbuf#affm=?gju#`obpp>!`gju#jg>!kfbgfqjm#sbqwj`vobq/`lmufqwfg#jmwl*8	?,p`qjsw=	?skjolplskj`bo#pqsphlkqubwphjwj\rVSmd#Uj\rWkw<L=o=m=m<V<T<U=l=o=m=m<V<T<Ujmufpwjdb`j/_msbqwj`jsb`j/_m<V<R=n<R=l=g<Y<R<]<W<\\=m=n<T<V<R=n<R=l=g<U=k<Y<W<R<^<Y<V=m<T=m=n<Y<P=g<q<R<^<R=m=n<T<V<R=n<R=l=g=i<R<]<W<\\=m=n=`<^=l<Y<P<Y<Q<T<V<R=n<R=l<\\=c=m<Y<_<R<X<Q=c=m<V<\\=k<\\=n=`<Q<R<^<R=m=n<T<O<V=l<\\<T<Q=g<^<R<S=l<R=m=g<V<R=n<R=l<R<U=m<X<Y<W<\\=n=`<S<R<P<R=e=`=b=m=l<Y<X=m=n<^<R<]=l<\\<[<R<P=m=n<R=l<R<Q=g=o=k<\\=m=n<T<Y=n<Y=k<Y<Q<T<Y<<W<\\<^<Q<\\=c<T=m=n<R=l<T<T=m<T=m=n<Y<P<\\=l<Y=d<Y<Q<T=c<M<V<\\=k<\\=n=`<S<R=a=n<R<P=o=m<W<Y<X=o<Y=n=m<V<\\<[<\\=n=`=n<R<^<\\=l<R<^<V<R<Q<Y=k<Q<R=l<Y=d<Y<Q<T<Y<V<R=n<R=l<R<Y<R=l<_<\\<Q<R<^<V<R=n<R=l<R<P<L<Y<V<W<\\<P<\\4K5h5i5j4F4C5e5i5j4F4C5f4K4F4K5h5i5d4Z5d4U4K5h4D4]4K5i4@4K5h5i5d4K5n4U4K5h4]4_4K4J5h5i4X4K4]5o4K4F4K5h4O4U4Z4K4M4K5h4]5f4K4Z4E4K5h4F4Y5i5f5i4K5h4K4U4Z4K4M4K5h5j4F4K4J4@4K5h4O5h4U4K4D4K5h4F4_4@5f5h4K5h4O5n4_4K5i4K5h4Z4V4[4K4F4K5h5m5f4C5f5d4K5h4F4]4A5f4D4K5h4@4C5f4C4E4K5h4F4U5h5f5i4K5h4O4B4D4K4]4K5h4K5m5h4K5i4K5h4O5m5h4K5i4K5h4F4K4]5f4B4K5h4F5n5j5f4E4K5h4K5h4U4K4D4K5h4B5d4K4[4]4K5h5i4@4F5i4U4K5h4C5f5o5d4]4K5h4_5f4K4A4E4U4D4C4K5h5h5k4K5h4F4]4D5f4E4K5h4]5d4K4D4[4K5h4O4C4D5f4E4K5h4K4B4D4K4]4K5h5i4F4A4C4E4K5h4K4V4K5j5f`vqplq9sljmwfq8?,wjwof=	?nfwb#!#kqfe>!kwws9,,!=?psbm#`obpp>!nfnafqp#le#wkf#tjmglt-ol`bwjlmufqwj`bo.bojdm9,b=##?b#kqfe>!?"gl`wzsf#kwno=nfgjb>!p`qffm!#?lswjlm#ubovf>!ebuj`lm-j`l!#,=	\n\n?gju#`obpp>!`kbqb`wfqjpwj`p!#nfwklg>!dfw!#,algz=	?,kwno=	pklqw`vw#j`lm!#gl`vnfmw-tqjwf+sbggjmd.alwwln9qfsqfpfmwbwjufppvanjw!#ubovf>!bojdm>!`fmwfq!#wkqlvdklvw#wkf#p`jfm`f#ej`wjlm	##?gju#`obpp>!pvanjw!#`obpp>!lmf#le#wkf#nlpw#ubojdm>!wls!=?tbp#fpwbaojpkfg*8	?,p`qjsw=	qfwvqm#ebopf8!=*-pwzof-gjpsobzaf`bvpf#le#wkf#gl`vnfmw-`llhjf?elqn#b`wjlm>!,~algzxnbqdjm938Fm`z`olsfgjb#leufqpjlm#le#wkf#-`qfbwfFofnfmw+mbnf!#`lmwfmw>!?,gju=	?,gju=		bgnjmjpwqbwjuf#?,algz=	?,kwno=kjpwlqz#le#wkf#!=?jmsvw#wzsf>!slqwjlm#le#wkf#bp#sbqw#le#wkf#%maps8?b#kqfe>!lwkfq#`lvmwqjfp!=	?gju#`obpp>!?,psbm=?,psbm=?Jm#lwkfq#tlqgp/gjpsobz9#aol`h8`lmwqlo#le#wkf#jmwqlgv`wjlm#le,=	?nfwb#mbnf>!bp#tfoo#bp#wkf#jm#qf`fmw#zfbqp	\n?gju#`obpp>!?,gju=	\n?,gju=	jmpsjqfg#az#wkfwkf#fmg#le#wkf#`lnsbwjaof#tjwkaf`bnf#hmltm#bp#pwzof>!nbqdjm9-ip!=?,p`qjsw=?#Jmwfqmbwjlmbo#wkfqf#kbuf#affmDfqnbm#obmdvbdf#pwzof>!`lolq9 @lnnvmjpw#Sbqwz`lmpjpwfmw#tjwkalqgfq>!3!#`foo#nbqdjmkfjdkw>!wkf#nbilqjwz#le!#bojdm>!`fmwfqqfobwfg#wl#wkf#nbmz#gjeefqfmw#Lqwklgl{#@kvq`kpjnjobq#wl#wkf#,=	?ojmh#qfo>!ptbp#lmf#le#wkf#vmwjo#kjp#gfbwk~*+*8	?,p`qjsw=lwkfq#obmdvbdfp`lnsbqfg#wl#wkfslqwjlmp#le#wkfwkf#Mfwkfqobmgpwkf#nlpw#`lnnlmab`hdqlvmg9vqo+bqdvfg#wkbw#wkfp`qloojmd>!ml!#jm`ovgfg#jm#wkfMlqwk#Bnfqj`bm#wkf#mbnf#le#wkfjmwfqsqfwbwjlmpwkf#wqbgjwjlmbogfufolsnfmw#le#eqfrvfmwoz#vpfgb#`loof`wjlm#leufqz#pjnjobq#wlpvqqlvmgjmd#wkff{bnsof#le#wkjpbojdm>!`fmwfq!=tlvog#kbuf#affmjnbdf\\`bswjlm#>bwwb`kfg#wl#wkfpvddfpwjmd#wkbwjm#wkf#elqn#le#jmuloufg#jm#wkfjp#gfqjufg#eqlnmbnfg#bewfq#wkfJmwqlgv`wjlm#wlqfpwqj`wjlmp#lm#pwzof>!tjgwk9#`bm#af#vpfg#wl#wkf#`qfbwjlm#lenlpw#jnslqwbmw#jmelqnbwjlm#bmgqfpvowfg#jm#wkf`loobspf#le#wkfWkjp#nfbmp#wkbwfofnfmwp#le#wkftbp#qfsob`fg#azbmbozpjp#le#wkfjmpsjqbwjlm#elqqfdbqgfg#bp#wkfnlpw#pv``fppevohmltm#bp#%rvlw8b#`lnsqfkfmpjufKjpwlqz#le#wkf#tfqf#`lmpjgfqfgqfwvqmfg#wl#wkfbqf#qfefqqfg#wlVmplvq`fg#jnbdf=	\n?gju#`obpp>!`lmpjpwp#le#wkfpwlsSqlsbdbwjlmjmwfqfpw#jm#wkfbubjobajojwz#lebssfbqp#wl#kbuffof`wqlnbdmfwj`fmbaofPfquj`fp+evm`wjlm#le#wkfJw#jp#jnslqwbmw?,p`qjsw=?,gju=evm`wjlm+*xubq#qfobwjuf#wl#wkfbp#b#qfpvow#le#wkf#slpjwjlm#leElq#f{bnsof/#jm#nfwklg>!slpw!#tbp#elooltfg#az%bns8ngbpk8#wkfwkf#bssoj`bwjlmip!=?,p`qjsw=	vo=?,gju=?,gju=bewfq#wkf#gfbwktjwk#qfpsf`w#wlpwzof>!sbggjmd9jp#sbqwj`vobqozgjpsobz9jmojmf8#wzsf>!pvanjw!#jp#gjujgfg#jmwl\bTA\nzk#+\vBl\bQ*qfpslmpbajojgbgbgnjmjpwqb`j/_mjmwfqmb`jlmbofp`lqqfpslmgjfmwf\fHe\fHF\fHC\fIg\fH{\fHF\fIn\fH\\\fIa\fHY\fHU\fHB\fHR\fH\\\fIk\fH^\fIg\fH{\fIg\fHn\fHv\fIm\fHD\fHR\fHY\fH^\fIk\fHy\fHS\fHD\fHT\fH\\\fHy\fHR\fH\\\fHF\fIm\fH^\fHS\fHT\fHz\fIg\fHp\fIk\fHn\fHv\fHR\fHU\fHS\fHc\fHA\fIk\fHp\fIk\fHn\fHZ\fHR\fHB\fHS\fH^\fHU\fHB\fHR\fH\\\fIl\fHp\fHR\fH{\fH\\\fHO\fH@\fHD\fHR\fHD\fIk\fHy\fIm\fHB\fHR\fH\\\fH@\fIa\fH^\fIe\fH{\fHB\fHR\fH^\fHS\fHy\fHB\fHU\fHS\fH^\fHR\fHF\fIo\fH[\fIa\fHL\fH@\fHN\fHP\fHH\fIk\fHA\fHR\fHp\fHF\fHR\fHy\fIa\fH^\fHS\fHy\fHs\fIa\fH\\\fIk\fHD\fHz\fHS\fH^\fHR\fHG\fHJ\fI`\fH\\\fHR\fHD\fHB\fHR\fHB\fH^\fIk\fHB\fHH\fHJ\fHR\fHD\fH@\fHR\fHp\fHR\fH\\\fHY\fHS\fHy\fHR\fHT\fHy\fIa\fHC\fIg\fHn\fHv\fHR\fHU\fHH\fIk\fHF\fHU\fIm\fHm\fHv\fH@\fHH\fHR\fHC\fHR\fHT\fHn\fHY\fHR\fHJ\fHJ\fIk\fHz\fHD\fIk\fHF\fHS\fHw\fH^\fIk\fHY\fHS\fHZ\fIk\fH[\fH\\\fHR\fHp\fIa\fHC\fHe\fHH\fIa\fHH\fH\\\fHB\fIm\fHn\fH@\fHd\fHJ\fIg\fHD\fIg\fHn\fHe\fHF\fHy\fH\\\fHO\fHF\fHN\fHP\fIk\fHn\fHT\fIa\fHI\fHS\fHH\fHG\fHS\fH^\fIa\fHB\fHB\fIm\fHz\fIa\fHC\fHi\fHv\fIa\fHw\fHR\fHw\fIn\fHs\fHH\fIl\fHT\fHn\fH{\fIl\fHH\fHp\fHR\fHc\fH{\fHR\fHY\fHS\fHA\fHR\fH{\fHt\fHO\fIa\fHs\fIk\fHJ\fIn\fHT\fH\\\fIk\fHJ\fHS\fHD\fIg\fHn\fHU\fHH\fIa\fHC\fHR\fHT\fIk\fHy\fIa\fHT\fH{\fHR\fHn\fHK\fIl\fHY\fHS\fHZ\fIa\fHY\fH\\\fHR\fHH\fIk\fHn\fHJ\fId\fHs\fIa\fHT\fHD\fHy\fIa\fHZ\fHR\fHT\fHR\fHB\fHD\fIk\fHi\fHJ\fHR\fH^\fHH\fH@\fHS\fHp\fH^\fIl\fHF\fIm\fH\\\fIn\fH[\fHU\fHS\fHn\fHJ\fIl\fHB\fHS\fHH\fIa\fH\\\fHy\fHY\fHS\fHH\fHR\fH\\\fIm\fHF\fHC\fIk\fHT\fIa\fHI\fHR\fHD\fHy\fH\\\fIg\fHM\fHP\fHB\fIm\fHy\fIa\fHH\fHC\fIg\fHp\fHD\fHR\fHy\fIo\fHF\fHC\fHR\fHF\fIg\fHT\fIa\fHs\fHt\fH\\\fIk\fH^\fIn\fHy\fHR\fH\\\fIa\fHC\fHY\fHS\fHv\fHR\fH\\\fHT\fIn\fHv\fHD\fHR\fHB\fIn\fH^\fIa\fHC\fHJ\fIk\fHz\fIk\fHn\fHU\fHB\fIk\fHZ\fHR\fHT\fIa\fHy\fIn\fH^\fHB\fId\fHn\fHD\fIk\fHH\fId\fHC\fHR\fH\\\fHp\fHS\fHT\fHy\fIkqpp({no!#wjwof>!.wzsf!#`lmwfmw>!wjwof!#`lmwfmw>!bw#wkf#pbnf#wjnf-ip!=?,p`qjsw=	?!#nfwklg>!slpw!#?,psbm=?,b=?,oj=ufqwj`bo.bojdm9w,irvfqz-njm-ip!=-`oj`h+evm`wjlm+#pwzof>!sbggjmd.~*+*8	?,p`qjsw=	?,psbm=?b#kqfe>!?b#kqfe>!kwws9,,*8#qfwvqm#ebopf8wf{w.gf`lqbwjlm9#p`qloojmd>!ml!#alqgfq.`loobspf9bppl`jbwfg#tjwk#Abkbpb#JmglmfpjbFmdojpk#obmdvbdf?wf{w#{no9psb`f>-dje!#alqgfq>!3!?,algz=	?,kwno=	lufqeolt9kjggfm8jnd#pq`>!kwws9,,bggFufmwOjpwfmfqqfpslmpjaof#elq#p-ip!=?,p`qjsw=	,ebuj`lm-j`l!#,=lsfqbwjmd#pzpwfn!#pwzof>!tjgwk92wbqdfw>!\\aobmh!=Pwbwf#Vmjufqpjwzwf{w.bojdm9ofew8	gl`vnfmw-tqjwf+/#jm`ovgjmd#wkf#bqlvmg#wkf#tlqog*8	?,p`qjsw=	?!#pwzof>!kfjdkw98lufqeolt9kjggfmnlqf#jmelqnbwjlmbm#jmwfqmbwjlmbob#nfnafq#le#wkf#lmf#le#wkf#ejqpw`bm#af#elvmg#jm#?,gju=	\n\n?,gju=	gjpsobz9#mlmf8!=!#,=	?ojmh#qfo>!	##+evm`wjlm+*#xwkf#26wk#`fmwvqz-sqfufmwGfebvow+obqdf#mvnafq#le#Azybmwjmf#Fnsjqf-isdwkvnaofewubpw#nbilqjwz#lenbilqjwz#le#wkf##bojdm>!`fmwfq!=Vmjufqpjwz#Sqfppglnjmbwfg#az#wkfPf`lmg#Tlqog#Tbqgjpwqjavwjlm#le#pwzof>!slpjwjlm9wkf#qfpw#le#wkf#`kbqb`wfqjyfg#az#qfo>!mleloolt!=gfqjufp#eqln#wkfqbwkfq#wkbm#wkf#b#`lnajmbwjlm#lepwzof>!tjgwk9233Fmdojpk.psfbhjmd`lnsvwfq#p`jfm`falqgfq>!3!#bow>!wkf#f{jpwfm`f#leGfnl`qbwj`#Sbqwz!#pwzof>!nbqdjm.Elq#wkjp#qfbplm/-ip!=?,p`qjsw=	\npAzWbdMbnf+p*X3^ip!=?,p`qjsw=	?-ip!=?,p`qjsw=	ojmh#qfo>!j`lm!#$#bow>$$#`obpp>$elqnbwjlm#le#wkfufqpjlmp#le#wkf#?,b=?,gju=?,gju=,sbdf=	##?sbdf=	?gju#`obpp>!`lmwaf`bnf#wkf#ejqpwabkbpb#Jmglmfpjbfmdojpk#+pjnsof*"y"W"W"["Q"U"V"@=i=l<^<\\=n=m<V<T<V<R<P<S<\\<Q<T<T=c<^<W=c<Y=n=m=c<x<R<]<\\<^<T=n=`=k<Y<W<R<^<Y<V<\\=l<\\<[<^<T=n<T=c<t<Q=n<Y=l<Q<Y=n<r=n<^<Y=n<T=n=`<Q<\\<S=l<T<P<Y=l<T<Q=n<Y=l<Q<Y=n<V<R=n<R=l<R<_<R=m=n=l<\\<Q<T=j=g<V<\\=k<Y=m=n<^<Y=o=m<W<R<^<T=c=i<S=l<R<]<W<Y<P=g<S<R<W=o=k<T=n=`=c<^<W=c=b=n=m=c<Q<\\<T<]<R<W<Y<Y<V<R<P<S<\\<Q<T=c<^<Q<T<P<\\<Q<T<Y=m=l<Y<X=m=n<^<\\4K5h5i5d4K4Z5f4U4K5h4]4J5f4_5f4E4K5h4K5j4F5n4K5h5i4X4K4]5o4K4F5o4K5h4_5f4K4]4K4F4K5h5i5o4F5d4D4E4K5h4_4U5d4C5f4E4K4A4Y4K4J5f4K4F4K5h4U4K5h5i5f4E4K5h4Y5d4F5f4K4F4K5h4K5j4F4]5j4F4K5h4F4Y4K5i5f5i4K5h4I4_5h4K5i5f4K5h5i4X4K4]5o4E4K5h5i4]4J5f4K4Fqlalwp!#`lmwfmw>!?gju#jg>!ellwfq!=wkf#Vmjwfg#Pwbwfp?jnd#pq`>!kwws9,,-isdqjdkwwkvna-ip!=?,p`qjsw=	?ol`bwjlm-sqlwl`loeqbnfalqgfq>!3!#p!#,=	?nfwb#mbnf>!?,b=?,gju=?,gju=?elmw.tfjdkw9alog8%rvlw8#bmg#%rvlw8gfsfmgjmd#lm#wkf#nbqdjm938sbggjmd9!#qfo>!mleloolt!#Sqfpjgfmw#le#wkf#wtfmwjfwk#`fmwvqzfujpjlm=	##?,sbdfJmwfqmfw#F{solqfqb-bpzm`#>#wqvf8	jmelqnbwjlm#balvw?gju#jg>!kfbgfq!=!#b`wjlm>!kwws9,,?b#kqfe>!kwwsp9,,?gju#jg>!`lmwfmw!?,gju=	?,gju=	?gfqjufg#eqln#wkf#?jnd#pq`>$kwws9,,b``lqgjmd#wl#wkf#	?,algz=	?,kwno=	pwzof>!elmw.pjyf9p`qjsw#obmdvbdf>!Bqjbo/#Kfoufwj`b/?,b=?psbm#`obpp>!?,p`qjsw=?p`qjsw#slojwj`bo#sbqwjfpwg=?,wq=?,wbaof=?kqfe>!kwws9,,ttt-jmwfqsqfwbwjlm#leqfo>!pwzofpkffw!#gl`vnfmw-tqjwf+$?`kbqpfw>!vwe.;!=	afdjmmjmd#le#wkf#qfufbofg#wkbw#wkfwfofujpjlm#pfqjfp!#qfo>!mleloolt!=#wbqdfw>!\\aobmh!=`objnjmd#wkbw#wkfkwws&0B&1E&1Ettt-nbmjefpwbwjlmp#leSqjnf#Njmjpwfq#lejmeovfm`fg#az#wkf`obpp>!`ofbqej{!=,gju=	?,gju=		wkqff.gjnfmpjlmbo@kvq`k#le#Fmdobmgle#Mlqwk#@bqlojmbprvbqf#hjolnfwqfp-bggFufmwOjpwfmfqgjpwjm`w#eqln#wkf`lnnlmoz#hmltm#bpSklmfwj`#Boskbafwgf`obqfg#wkbw#wkf`lmwqloofg#az#wkfAfmibnjm#Eqbmhojmqlof.sobzjmd#dbnfwkf#Vmjufqpjwz#lejm#Tfpwfqm#Fvqlsfsfqplmbo#`lnsvwfqSqlif`w#Dvwfmafqdqfdbqgofpp#le#wkfkbp#affm#sqlslpfgwldfwkfq#tjwk#wkf=?,oj=?oj#`obpp>!jm#plnf#`lvmwqjfpnjm-ip!=?,p`qjsw=le#wkf#slsvobwjlmleej`jbo#obmdvbdf?jnd#pq`>!jnbdfp,jgfmwjejfg#az#wkfmbwvqbo#qfplvq`fp`obppjej`bwjlm#le`bm#af#`lmpjgfqfgrvbmwvn#nf`kbmj`pMfufqwkfofpp/#wkfnjoojlm#zfbqp#bdl?,algz=	?,kwno="y"W"W"["Q"U"V"@	wbhf#bgubmwbdf#lebmg/#b``lqgjmd#wlbwwqjavwfg#wl#wkfNj`qlplew#Tjmgltpwkf#ejqpw#`fmwvqzvmgfq#wkf#`lmwqlogju#`obpp>!kfbgfqpklqwoz#bewfq#wkfmlwbaof#f{`fswjlmwfmp#le#wklvpbmgppfufqbo#gjeefqfmwbqlvmg#wkf#tlqog-qfb`kjmd#njojwbqzjplobwfg#eqln#wkflsslpjwjlm#wl#wkfwkf#Log#WfpwbnfmwBeqj`bm#Bnfqj`bmpjmpfqwfg#jmwl#wkfpfsbqbwf#eqln#wkfnfwqlslojwbm#bqfbnbhfp#jw#slppjaofb`hmltofgdfg#wkbwbqdvbaoz#wkf#nlpwwzsf>!wf{w,`pp!=	wkf#JmwfqmbwjlmboB``lqgjmd#wl#wkf#sf>!wf{w,`pp!#,=	`ljm`jgf#tjwk#wkfwtl.wkjqgp#le#wkfGvqjmd#wkjp#wjnf/gvqjmd#wkf#sfqjlgbmmlvm`fg#wkbw#kfwkf#jmwfqmbwjlmbobmg#nlqf#qf`fmwozafojfufg#wkbw#wkf`lmp`jlvpmfpp#bmgelqnfqoz#hmltm#bppvqqlvmgfg#az#wkfejqpw#bssfbqfg#jml``bpjlmbooz#vpfgslpjwjlm9baplovwf8!#wbqdfw>!\\aobmh!#slpjwjlm9qfobwjuf8wf{w.bojdm9`fmwfq8ib{,ojap,irvfqz,2-ab`hdqlvmg.`lolq9 wzsf>!bssoj`bwjlm,bmdvbdf!#`lmwfmw>!?nfwb#kwws.frvju>!Sqjub`z#Sloj`z?,b=f+!&0@p`qjsw#pq`>$!#wbqdfw>!\\aobmh!=Lm#wkf#lwkfq#kbmg/-isdwkvnaqjdkw1?,gju=?gju#`obpp>!?gju#pwzof>!eolbw9mjmfwffmwk#`fmwvqz?,algz=	?,kwno=	?jnd#pq`>!kwws9,,p8wf{w.bojdm9`fmwfqelmw.tfjdkw9#alog8#B``lqgjmd#wl#wkf#gjeefqfm`f#afwtffm!#eqbnfalqgfq>!3!#!#pwzof>!slpjwjlm9ojmh#kqfe>!kwws9,,kwno7,ollpf-gwg!=	gvqjmd#wkjp#sfqjlg?,wg=?,wq=?,wbaof=`olpfoz#qfobwfg#wlelq#wkf#ejqpw#wjnf8elmw.tfjdkw9alog8jmsvw#wzsf>!wf{w!#?psbm#pwzof>!elmw.lmqfbgzpwbwf`kbmdf\n?gju#`obpp>!`ofbqgl`vnfmw-ol`bwjlm-#Elq#f{bnsof/#wkf#b#tjgf#ubqjfwz#le#?"GL@WZSF#kwno=	?%maps8%maps8%maps8!=?b#kqfe>!kwws9,,pwzof>!eolbw9ofew8`lm`fqmfg#tjwk#wkf>kwws&0B&1E&1Ettt-jm#slsvobq#`vowvqfwzsf>!wf{w,`pp!#,=jw#jp#slppjaof#wl#Kbqubqg#Vmjufqpjwzwzofpkffw!#kqfe>!,wkf#nbjm#`kbqb`wfqL{elqg#Vmjufqpjwz##mbnf>!hfztlqgp!#`pwzof>!wf{w.bojdm9wkf#Vmjwfg#Hjmdglnefgfqbo#dlufqmnfmw?gju#pwzof>!nbqdjm#gfsfmgjmd#lm#wkf#gfp`qjswjlm#le#wkf?gju#`obpp>!kfbgfq-njm-ip!=?,p`qjsw=gfpwqv`wjlm#le#wkfpojdkwoz#gjeefqfmwjm#b``lqgbm`f#tjwkwfof`lnnvmj`bwjlmpjmgj`bwfp#wkbw#wkfpklqwoz#wkfqfbewfqfpsf`jbooz#jm#wkf#Fvqlsfbm#`lvmwqjfpKltfufq/#wkfqf#bqfpq`>!kwws9,,pwbwj`pvddfpwfg#wkbw#wkf!#pq`>!kwws9,,ttt-b#obqdf#mvnafq#le#Wfof`lnnvmj`bwjlmp!#qfo>!mleloolt!#wKloz#Qlnbm#Fnsfqlqbonlpw#f{`ovpjufoz!#alqgfq>!3!#bow>!Pf`qfwbqz#le#Pwbwf`vonjmbwjmd#jm#wkf@JB#Tlqog#Eb`wallhwkf#nlpw#jnslqwbmwbmmjufqpbqz#le#wkfpwzof>!ab`hdqlvmg.?oj=?fn=?b#kqfe>!,wkf#Bwobmwj`#L`fbmpwqj`woz#psfbhjmd/pklqwoz#afelqf#wkfgjeefqfmw#wzsfp#lewkf#Lwwlnbm#Fnsjqf=?jnd#pq`>!kwws9,,Bm#Jmwqlgv`wjlm#wl`lmpfrvfm`f#le#wkfgfsbqwvqf#eqln#wkf@lmefgfqbwf#Pwbwfpjmgjdfmlvp#sflsofpSql`ffgjmdp#le#wkfjmelqnbwjlm#lm#wkfwkflqjfp#kbuf#affmjmuloufnfmw#jm#wkfgjujgfg#jmwl#wkqffbgib`fmw#`lvmwqjfpjp#qfpslmpjaof#elqgjpplovwjlm#le#wkf`loobalqbwjlm#tjwktjgfoz#qfdbqgfg#bpkjp#`lmwfnslqbqjfpelvmgjmd#nfnafq#leGlnjmj`bm#Qfsvaoj`dfmfqbooz#b``fswfgwkf#slppjajojwz#lebqf#bopl#bubjobaofvmgfq#`lmpwqv`wjlmqfpwlqbwjlm#le#wkfwkf#dfmfqbo#svaoj`jp#bonlpw#fmwjqfozsbppfp#wkqlvdk#wkfkbp#affm#pvddfpwfg`lnsvwfq#bmg#ujgflDfqnbmj`#obmdvbdfp#b``lqgjmd#wl#wkf#gjeefqfmw#eqln#wkfpklqwoz#bewfqtbqgpkqfe>!kwwsp9,,ttt-qf`fmw#gfufolsnfmwAlbqg#le#Gjqf`wlqp?gju#`obpp>!pfbq`k#?b#kqfe>!kwws9,,Jm#sbqwj`vobq/#wkfNvowjsof#ellwmlwfplq#lwkfq#pvapwbm`fwklvpbmgp#le#zfbqpwqbmpobwjlm#le#wkf?,gju=	?,gju=		?b#kqfe>!jmgf{-skstbp#fpwbaojpkfg#jmnjm-ip!=?,p`qjsw=	sbqwj`jsbwf#jm#wkfb#pwqlmd#jmeovfm`fpwzof>!nbqdjm.wls9qfsqfpfmwfg#az#wkfdqbgvbwfg#eqln#wkfWqbgjwjlmbooz/#wkfFofnfmw+!p`qjsw!*8Kltfufq/#pjm`f#wkf,gju=	?,gju=	?gju#ofew8#nbqdjm.ofew9sqlwf`wjlm#bdbjmpw38#ufqwj`bo.bojdm9Vmelqwvmbwfoz/#wkfwzsf>!jnbdf,{.j`lm,gju=	?gju#`obpp>!#`obpp>!`ofbqej{!=?gju#`obpp>!ellwfq\n\n?,gju=	\n\n?,gju=	wkf#nlwjlm#sj`wvqf<}=f<W<_<\\=l=m<V<T<]=f<W<_<\\=l=m<V<T<H<Y<X<Y=l<\\=j<T<T<Q<Y=m<V<R<W=`<V<R=m<R<R<]=e<Y<Q<T<Y=m<R<R<]=e<Y<Q<T=c<S=l<R<_=l<\\<P<P=g<r=n<S=l<\\<^<T=n=`<]<Y=m<S<W<\\=n<Q<R<P<\\=n<Y=l<T<\\<W=g<S<R<[<^<R<W=c<Y=n<S<R=m<W<Y<X<Q<T<Y=l<\\<[<W<T=k<Q=g=i<S=l<R<X=o<V=j<T<T<S=l<R<_=l<\\<P<P<\\<S<R<W<Q<R=m=n=`=b<Q<\\=i<R<X<T=n=m=c<T<[<]=l<\\<Q<Q<R<Y<Q<\\=m<Y<W<Y<Q<T=c<T<[<P<Y<Q<Y<Q<T=c<V<\\=n<Y<_<R=l<T<T<|<W<Y<V=m<\\<Q<X=l\fHJ\fIa\fHY\fHR\fH\\\fHR\fHB\fId\fHD\fIm\fHi\fH^\fHF\fIa\fH\\\fHJ\fHR\fHD\fHA\fHR\fH\\\fHH\fIl\fHC\fHi\fHD\fIm\fHJ\fIk\fHZ\fHU\fHS\fHD\fIa\fHJ\fIl\fHk\fHn\fHM\fHS\fHC\fHR\fHJ\fHS\fH^\fIa\fH^\fIl\fHi\fHK\fHS\fHy\fHR\fH\\\fHY\fIl\fHM\fHS\fHC\fIg\fHv\fHS\fHs\fIa\fHL\fIk\fHT\fHB\fHR\fHv\fHR\fH\\\fHp\fHn\fHy\fIa\fHZ\fHD\fHJ\fIm\fHD\fHS\fHC\fHR\fHF\fIa\fH\\\fHC\fIg\fH{\fHi\fHD\fIm\fHT\fHR\fH\\\fH}\fHD\fH^\fHR\fHk\fHD\fHF\fHR\fH\\\fIa\fHs\fIl\fHZ\fH\\\fIa\fHH\fIg\fHn\fH^\fIg\fHy\fHT\fHA\fHR\fHG\fHP\fIa\fH^\fId\fHZ\fHZ\fH\\\fIa\fHH\fIk\fHn\fHF\fIa\fH\\\fHJ\fIk\fHZ\fHF\fIa\fH^\fIk\fHC\fH\\\fHy\fIk\fHn\fHJ\fIa\fH\\\fHT\fIa\fHI\fHS\fHH\fHS\fHe\fHH\fIa\fHF\fHR\fHJ\fHe\fHD\fIa\fHU\fIk\fHn\fHv\fHS\fHs\fIa\fHL\fHR\fHC\fHR\fHH\fIa\fH\\\fHR\fHp\fIa\fHC\fHR\fHJ\fHR\fHF\fIm\fH\\\fHR\fHD\fIk\fHp\fIg\fHM\fHP\fIk\fHn\fHi\fHD\fIm\fHY\fHR\fHJ\fHZ\fIa\fH\\\fIk\fHO\fIl\fHZ\fHS\fHy\fIa\fH[\fHR\fHT\fH\\\fHy\fHR\fH\\\fIl\fHT\fHn\fH{\fIa\fH\\\fHU\fHF\fH\\\fHS\fHO\fHR\fHB\fH@\fIa\fH\\\fHR\fHn\fHM\fH@\fHv\fIa\fHv\fIg\fHn\fHe\fHF\fH^\fH@\fIa\fHK\fHB\fHn\fHH\fIa\fH\\\fIl\fHT\fHn\fHF\fH\\\fIa\fHy\fHe\fHB\fIa\fHB\fIl\fHJ\fHB\fHR\fHK\fIa\fHC\fHB\fHT\fHU\fHR\fHC\fHH\fHR\fHZ\fH@\fIa\fHJ\fIg\fHn\fHB\fIl\fHM\fHS\fHC\fHR\fHj\fHd\fHF\fIl\fHc\fH^\fHB\fIg\fH@\fHR\fHk\fH^\fHT\fHn\fHz\fIa\fHC\fHR\fHj\fHF\fH\\\fIk\fHZ\fHD\fHi\fHD\fIm\fH@\fHn\fHK\fH@\fHR\fHp\fHP\fHR\fH\\\fHD\fHY\fIl\fHD\fHH\fHB\fHF\fIa\fH\\\fHB\fIm\fHz\fHF\fIa\fH\\\fHZ\fIa\fHD\fHF\fH\\\fHS\fHY\fHR\fH\\\fHD\fIm\fHy\fHT\fHR\fHD\fHT\fHB\fH\\\fIa\fHI\fHD\fHj\fHC\fIg\fHp\fHS\fHH\fHT\fIg\fHB\fHY\fHR\fH\\4K5h5i4X4K4]5o4K4F4K5h5i5j4F4C5f4K4F4K5h5o5i4D5f5d4F4]4K5h5i4X4K5k4C4K4F4U4C4C4K5h4^5d4K4]4U4C4C4K5h4]4C5d4C4K5h4I4_5h4K5i5f4E4K5h5m5d4F5d4X5d4D4K5h5i4_4K4D5n4K4F4K5h5i4U5h5d5i4K4F4K5h5i4_5h4_5h4K4F4K5h4@4]4K5m5f5o4_4K5h4K4_5h4K5i5f4E4K5h4K4F4Y4K5h4K4Fhfztlqgp!#`lmwfmw>!t0-lqd,2:::,{kwno!=?b#wbqdfw>!\\aobmh!#wf{w,kwno8#`kbqpfw>!#wbqdfw>!\\aobmh!=?wbaof#`foosbggjmd>!bvwl`lnsofwf>!lee!#wf{w.bojdm9#`fmwfq8wl#obpw#ufqpjlm#az#ab`hdqlvmg.`lolq9# !#kqfe>!kwws9,,ttt-,gju=?,gju=?gju#jg>?b#kqfe>! !#`obpp>!!=?jnd#pq`>!kwws9,,`qjsw!#pq`>!kwws9,,	?p`qjsw#obmdvbdf>!,,FM!#!kwws9,,ttt-tfm`lgfVQJ@lnslmfmw+!#kqfe>!ibubp`qjsw9?gju#`obpp>!`lmwfmwgl`vnfmw-tqjwf+$?p`slpjwjlm9#baplovwf8p`qjsw#pq`>!kwws9,,#pwzof>!nbqdjm.wls9-njm-ip!=?,p`qjsw=	?,gju=	?gju#`obpp>!t0-lqd,2:::,{kwno!#		?,algz=	?,kwno=gjpwjm`wjlm#afwtffm,!#wbqdfw>!\\aobmh!=?ojmh#kqfe>!kwws9,,fm`lgjmd>!vwe.;!<=	t-bggFufmwOjpwfmfq<b`wjlm>!kwws9,,ttt-j`lm!#kqfe>!kwws9,,#pwzof>!ab`hdqlvmg9wzsf>!wf{w,`pp!#,=	nfwb#sqlsfqwz>!ld9w?jmsvw#wzsf>!wf{w!##pwzof>!wf{w.bojdm9wkf#gfufolsnfmw#le#wzofpkffw!#wzsf>!wfkwno8#`kbqpfw>vwe.;jp#`lmpjgfqfg#wl#afwbaof#tjgwk>!233&!#Jm#bggjwjlm#wl#wkf#`lmwqjavwfg#wl#wkf#gjeefqfm`fp#afwtffmgfufolsnfmw#le#wkf#Jw#jp#jnslqwbmw#wl#?,p`qjsw=		?p`qjsw##pwzof>!elmw.pjyf92=?,psbm=?psbm#jg>daOjaqbqz#le#@lmdqfpp?jnd#pq`>!kwws9,,jnFmdojpk#wqbmpobwjlmB`bgfnz#le#P`jfm`fpgju#pwzof>!gjpsobz9`lmpwqv`wjlm#le#wkf-dfwFofnfmwAzJg+jg*jm#`lmivm`wjlm#tjwkFofnfmw+$p`qjsw$*8#?nfwb#sqlsfqwz>!ld9<}=f<W<_<\\=l=m<V<T	#wzsf>!wf{w!#mbnf>!=Sqjub`z#Sloj`z?,b=bgnjmjpwfqfg#az#wkffmbaofPjmdofQfrvfpwpwzof>%rvlw8nbqdjm9?,gju=?,gju=?,gju=?=?jnd#pq`>!kwws9,,j#pwzof>%rvlw8eolbw9qfefqqfg#wl#bp#wkf#wlwbo#slsvobwjlm#lejm#Tbpkjmdwlm/#G-@-#pwzof>!ab`hdqlvmg.bnlmd#lwkfq#wkjmdp/lqdbmjybwjlm#le#wkfsbqwj`jsbwfg#jm#wkfwkf#jmwqlgv`wjlm#lejgfmwjejfg#tjwk#wkfej`wjlmbo#`kbqb`wfq#L{elqg#Vmjufqpjwz#njpvmgfqpwbmgjmd#leWkfqf#bqf/#kltfufq/pwzofpkffw!#kqfe>!,@lovnajb#Vmjufqpjwzf{sbmgfg#wl#jm`ovgfvpvbooz#qfefqqfg#wljmgj`bwjmd#wkbw#wkfkbuf#pvddfpwfg#wkbwbeejojbwfg#tjwk#wkf`lqqfobwjlm#afwtffmmvnafq#le#gjeefqfmw=?,wg=?,wq=?,wbaof=Qfsvaoj`#le#Jqfobmg	?,p`qjsw=	?p`qjsw#vmgfq#wkf#jmeovfm`f`lmwqjavwjlm#wl#wkfLeej`jbo#tfapjwf#lekfbgrvbqwfqp#le#wkf`fmwfqfg#bqlvmg#wkfjnsoj`bwjlmp#le#wkfkbuf#affm#gfufolsfgEfgfqbo#Qfsvaoj`#leaf`bnf#jm`qfbpjmdoz`lmwjmvbwjlm#le#wkfMlwf/#kltfufq/#wkbwpjnjobq#wl#wkbw#le#`bsbajojwjfp#le#wkfb``lqgbm`f#tjwk#wkfsbqwj`jsbmwp#jm#wkfevqwkfq#gfufolsnfmwvmgfq#wkf#gjqf`wjlmjp#lewfm#`lmpjgfqfgkjp#zlvmdfq#aqlwkfq?,wg=?,wq=?,wbaof=?b#kwws.frvju>![.VB.skzpj`bo#sqlsfqwjfple#Aqjwjpk#@lovnajbkbp#affm#`qjwj`jyfg+tjwk#wkf#f{`fswjlmrvfpwjlmp#balvw#wkfsbppjmd#wkqlvdk#wkf3!#`foosbggjmd>!3!#wklvpbmgp#le#sflsofqfgjqf`wp#kfqf-#Elqkbuf#`kjogqfm#vmgfq&0F&0@,p`qjsw&0F!**8?b#kqfe>!kwws9,,ttt-?oj=?b#kqfe>!kwws9,,pjwf\\mbnf!#`lmwfmw>!wf{w.gf`lqbwjlm9mlmfpwzof>!gjpsobz9#mlmf?nfwb#kwws.frvju>![.mft#Gbwf+*-dfwWjnf+*#wzsf>!jnbdf,{.j`lm!?,psbm=?psbm#`obpp>!obmdvbdf>!ibubp`qjswtjmglt-ol`bwjlm-kqfe?b#kqfe>!ibubp`qjsw9..=	?p`qjsw#wzsf>!w?b#kqfe>$kwws9,,ttt-klqw`vw#j`lm!#kqfe>!?,gju=	?gju#`obpp>!?p`qjsw#pq`>!kwws9,,!#qfo>!pwzofpkffw!#w?,gju=	?p`qjsw#wzsf>,b=#?b#kqfe>!kwws9,,#booltWqbmpsbqfm`z>![.VB.@lnsbwjaof!#`lmqfobwjlmpkjs#afwtffm	?,p`qjsw=	?p`qjsw#?,b=?,oj=?,vo=?,gju=bppl`jbwfg#tjwk#wkf#sqldqbnnjmd#obmdvbdf?,b=?b#kqfe>!kwws9,,?,b=?,oj=?oj#`obpp>!elqn#b`wjlm>!kwws9,,?gju#pwzof>!gjpsobz9wzsf>!wf{w!#mbnf>!r!?wbaof#tjgwk>!233&!#ab`hdqlvmg.slpjwjlm9!#alqgfq>!3!#tjgwk>!qfo>!pklqw`vw#j`lm!#k5=?vo=?oj=?b#kqfe>!##?nfwb#kwws.frvju>!`pp!#nfgjb>!p`qffm!#qfpslmpjaof#elq#wkf#!#wzsf>!bssoj`bwjlm,!#pwzof>!ab`hdqlvmg.kwno8#`kbqpfw>vwe.;!#booltwqbmpsbqfm`z>!pwzofpkffw!#wzsf>!wf	?nfwb#kwws.frvju>!=?,psbm=?psbm#`obpp>!3!#`foopsb`jmd>!3!=8	?,p`qjsw=	?p`qjsw#plnfwjnfp#`boofg#wkfglfp#mlw#mf`fppbqjozElq#nlqf#jmelqnbwjlmbw#wkf#afdjmmjmd#le#?"GL@WZSF#kwno=?kwnosbqwj`vobqoz#jm#wkf#wzsf>!kjggfm!#mbnf>!ibubp`qjsw9uljg+3*8!feef`wjufmfpp#le#wkf#bvwl`lnsofwf>!lee!#dfmfqbooz#`lmpjgfqfg=?jmsvw#wzsf>!wf{w!#!=?,p`qjsw=	?p`qjswwkqlvdklvw#wkf#tlqog`lnnlm#njp`lm`fswjlmbppl`jbwjlm#tjwk#wkf?,gju=	?,gju=	?gju#`gvqjmd#kjp#ojefwjnf/`lqqfpslmgjmd#wl#wkfwzsf>!jnbdf,{.j`lm!#bm#jm`qfbpjmd#mvnafqgjsolnbwj`#qfobwjlmpbqf#lewfm#`lmpjgfqfgnfwb#`kbqpfw>!vwe.;!#?jmsvw#wzsf>!wf{w!#f{bnsofp#jm`ovgf#wkf!=?jnd#pq`>!kwws9,,jsbqwj`jsbwjlm#jm#wkfwkf#fpwbaojpknfmw#le	?,gju=	?gju#`obpp>!%bns8maps8%bns8maps8wl#gfwfqnjmf#tkfwkfqrvjwf#gjeefqfmw#eqlnnbqhfg#wkf#afdjmmjmdgjpwbm`f#afwtffm#wkf`lmwqjavwjlmp#wl#wkf`lmeoj`w#afwtffm#wkftjgfoz#`lmpjgfqfg#wltbp#lmf#le#wkf#ejqpwtjwk#ubqzjmd#gfdqffpkbuf#psf`vobwfg#wkbw+gl`vnfmw-dfwFofnfmwsbqwj`jsbwjmd#jm#wkflqjdjmbooz#gfufolsfgfwb#`kbqpfw>!vwe.;!=#wzsf>!wf{w,`pp!#,=	jmwfq`kbmdfbaoz#tjwknlqf#`olpfoz#qfobwfgpl`jbo#bmg#slojwj`bowkbw#tlvog#lwkfqtjpfsfqsfmgj`vobq#wl#wkfpwzof#wzsf>!wf{w,`ppwzsf>!pvanjw!#mbnf>!ebnjojfp#qfpjgjmd#jmgfufolsjmd#`lvmwqjfp`lnsvwfq#sqldqbnnjmdf`lmlnj`#gfufolsnfmwgfwfqnjmbwjlm#le#wkfelq#nlqf#jmelqnbwjlmlm#pfufqbo#l``bpjlmpslqwvdv/Fp#+Fvqlsfv*<O<V=l<\\={<Q=m=`<V<\\=o<V=l<\\={<Q=m=`<V<\\<L<R=m=m<T<U=m<V<R<U<P<\\=n<Y=l<T<\\<W<R<^<T<Q=h<R=l<P<\\=j<T<T=o<S=l<\\<^<W<Y<Q<T=c<Q<Y<R<]=i<R<X<T<P<R<T<Q=h<R=l<P<\\=j<T=c<t<Q=h<R=l<P<\\=j<T=c<L<Y=m<S=o<]<W<T<V<T<V<R<W<T=k<Y=m=n<^<R<T<Q=h<R=l<P<\\=j<T=b=n<Y=l=l<T=n<R=l<T<T<X<R=m=n<\\=n<R=k<Q<R4K5h5i4F5d4K4@4C5d5j4K5h4K4X4F4]4K5o4K4F4K5h4K5n4F4]4K4A4K4Fkwno8#`kbqpfw>VWE.;!#pfwWjnflvw+evm`wjlm+*gjpsobz9jmojmf.aol`h8?jmsvw#wzsf>!pvanjw!#wzsf#>#$wf{w,ibubp`qj?jnd#pq`>!kwws9,,ttt-!#!kwws9,,ttt-t0-lqd,pklqw`vw#j`lm!#kqfe>!!#bvwl`lnsofwf>!lee!#?,b=?,gju=?gju#`obpp>?,b=?,oj=	?oj#`obpp>!`pp!#wzsf>!wf{w,`pp!#?elqn#b`wjlm>!kwws9,,{w,`pp!#kqfe>!kwws9,,ojmh#qfo>!bowfqmbwf!#	?p`qjsw#wzsf>!wf{w,#lm`oj`h>!ibubp`qjsw9+mft#Gbwf*-dfwWjnf+*~kfjdkw>!2!#tjgwk>!2!#Sflsof$p#Qfsvaoj`#le##?b#kqfe>!kwws9,,ttt-wf{w.gf`lqbwjlm9vmgfqwkf#afdjmmjmd#le#wkf#?,gju=	?,gju=	?,gju=	fpwbaojpknfmw#le#wkf#?,gju=?,gju=?,gju=?,g ujftslqwxnjm.kfjdkw9	?p`qjsw#pq`>!kwws9,,lswjlm=?lswjlm#ubovf>lewfm#qfefqqfg#wl#bp#,lswjlm=	?lswjlm#ubov?"GL@WZSF#kwno=	?"..XJmwfqmbwjlmbo#Bjqslqw=	?b#kqfe>!kwws9,,ttt?,b=?b#kqfe>!kwws9,,t\fTL\fT^\fTE\fT^\fUh\fT{\fTN\roI\ro|\roL\ro{\roO\rov\rot\nAOGx\bTA\nzk#+\vUmGx*\fHD\fHS\fH\\\fIa\fHJ\fIk\fHZ\fHM\fHR\fHe\fHD\fH^\fIg\fHM\fHy\fIa\fH[\fIk\fHH\fIa\fH\\\fHp\fHR\fHD\fHy\fHR\fH\\\fIl\fHT\fHn\fH@\fHn\fHK\fHS\fHH\fHT\fIa\fHI\fHR\fHF\fHD\fHR\fHT\fIa\fHY\fIl\fHy\fHR\fH\\\fHT\fHn\fHT\fIa\fHy\fH\\\fHO\fHT\fHR\fHB\fH{\fIa\fH\\\fIl\fHv\fHS\fHs\fIa\fHL\fIg\fHn\fHY\fHS\fHp\fIa\fHr\fHR\fHD\fHi\fHB\fIk\fH\\\fHS\fHy\fHR\fHY\fHS\fHA\fHS\fHD\fIa\fHD\fH{\fHR\fHM\fHS\fHC\fHR\fHm\fHy\fIa\fHC\fIg\fHn\fHy\fHS\fHT\fIm\fH\\\fHy\fIa\fH[\fHR\fHF\fHU\fIm\fHm\fHv\fHH\fIl\fHF\fIa\fH\\\fH@\fHn\fHK\fHD\fHs\fHS\fHF\fIa\fHF\fHO\fIl\fHy\fIa\fH\\\fHS\fHy\fIk\fHs\fHF\fIa\fH\\\fHR\fH\\\fHn\fHA\fHF\fIa\fH\\\fHR\fHF\fIa\fHH\fHB\fHR\fH^\fHS\fHy\fIg\fHn\fH\\\fHG\fHP\fIa\fHH\fHR\fH\\\fHD\fHS\fH\\\fIa\fHB\fHR\fHO\fH^\fHS\fHB\fHS\fHs\fIk\fHMgfp`qjswjlm!#`lmwfmw>!gl`vnfmw-ol`bwjlm-sqlw-dfwFofnfmwpAzWbdMbnf+?"GL@WZSF#kwno=	?kwno#?nfwb#`kbqpfw>!vwe.;!=9vqo!#`lmwfmw>!kwws9,,-`pp!#qfo>!pwzofpkffw!pwzof#wzsf>!wf{w,`pp!=wzsf>!wf{w,`pp!#kqfe>!t0-lqd,2:::,{kwno!#{nowzsf>!wf{w,ibubp`qjsw!#nfwklg>!dfw!#b`wjlm>!ojmh#qfo>!pwzofpkffw!##>#gl`vnfmw-dfwFofnfmwwzsf>!jnbdf,{.j`lm!#,=`foosbggjmd>!3!#`foops-`pp!#wzsf>!wf{w,`pp!#?,b=?,oj=?oj=?b#kqfe>!!#tjgwk>!2!#kfjdkw>!2!!=?b#kqfe>!kwws9,,ttt-pwzof>!gjpsobz9mlmf8!=bowfqmbwf!#wzsf>!bssoj.,,T0@,,GWG#[KWNO#2-3#foopsb`jmd>!3!#`foosbg#wzsf>!kjggfm!#ubovf>!,b=%maps8?psbm#qlof>!p	?jmsvw#wzsf>!kjggfm!#obmdvbdf>!IbubP`qjsw!##gl`vnfmw-dfwFofnfmwpAd>!3!#`foopsb`jmd>!3!#zsf>!wf{w,`pp!#nfgjb>!wzsf>$wf{w,ibubp`qjsw$tjwk#wkf#f{`fswjlm#le#zsf>!wf{w,`pp!#qfo>!pw#kfjdkw>!2!#tjgwk>!2!#>$(fm`lgfVQJ@lnslmfmw+?ojmh#qfo>!bowfqmbwf!#	algz/#wq/#jmsvw/#wf{wnfwb#mbnf>!qlalwp!#`lmnfwklg>!slpw!#b`wjlm>!=	?b#kqfe>!kwws9,,ttt-`pp!#qfo>!pwzofpkffw!#?,gju=?,gju=?gju#`obppobmdvbdf>!ibubp`qjsw!=bqjb.kjggfm>!wqvf!=.[?qjsw!#wzsf>!wf{w,ibubpo>38~*+*8	+evm`wjlm+*xab`hdqlvmg.jnbdf9#vqo+,b=?,oj=?oj=?b#kqfe>!k\n\n?oj=?b#kqfe>!kwws9,,bwlq!#bqjb.kjggfm>!wqv=#?b#kqfe>!kwws9,,ttt-obmdvbdf>!ibubp`qjsw!#,lswjlm=	?lswjlm#ubovf,gju=?,gju=?gju#`obpp>qbwlq!#bqjb.kjggfm>!wqf>+mft#Gbwf*-dfwWjnf+*slqwvdv/Fp#+gl#Aqbpjo*<R=l<_<\\<Q<T<[<\\=j<T<T<^<R<[<P<R<Z<Q<R=m=n=`<R<]=l<\\<[<R<^<\\<Q<T=c=l<Y<_<T=m=n=l<\\=j<T<T<^<R<[<P<R<Z<Q<R=m=n<T<R<]=c<[<\\=n<Y<W=`<Q<\\?"GL@WZSF#kwno#SVAOJ@#!mw.Wzsf!#`lmwfmw>!wf{w,?nfwb#kwws.frvju>!@lmwfqbmpjwjlmbo,,FM!#!kwws9?kwno#{nomp>!kwws9,,ttt.,,T0@,,GWG#[KWNO#2-3#WGWG,{kwno2.wqbmpjwjlmbo,,ttt-t0-lqd,WQ,{kwno2,sf#>#$wf{w,ibubp`qjsw$8?nfwb#mbnf>!gfp`qjswjlmsbqfmwMlgf-jmpfqwAfelqf?jmsvw#wzsf>!kjggfm!#mbip!#wzsf>!wf{w,ibubp`qj+gl`vnfmw*-qfbgz+evm`wjp`qjsw#wzsf>!wf{w,ibubpjnbdf!#`lmwfmw>!kwws9,,VB.@lnsbwjaof!#`lmwfmw>wno8#`kbqpfw>vwe.;!#,=	ojmh#qfo>!pklqw`vw#j`lm?ojmh#qfo>!pwzofpkffw!#?,p`qjsw=	?p`qjsw#wzsf>>#gl`vnfmw-`qfbwfFofnfm?b#wbqdfw>!\\aobmh!#kqfe>#gl`vnfmw-dfwFofnfmwpAjmsvw#wzsf>!wf{w!#mbnf>b-wzsf#>#$wf{w,ibubp`qjmsvw#wzsf>!kjggfm!#mbnfkwno8#`kbqpfw>vwe.;!#,=gwg!=	?kwno#{nomp>!kwws.,,T0@,,GWG#KWNO#7-32#WfmwpAzWbdMbnf+$p`qjsw$*jmsvw#wzsf>!kjggfm!#mbn?p`qjsw#wzsf>!wf{w,ibubp!#pwzof>!gjpsobz9mlmf8!=gl`vnfmw-dfwFofnfmwAzJg+>gl`vnfmw-`qfbwfFofnfmw+$#wzsf>$wf{w,ibubp`qjsw$jmsvw#wzsf>!wf{w!#mbnf>!g-dfwFofnfmwpAzWbdMbnf+pmj`bo!#kqfe>!kwws9,,ttt-@,,GWG#KWNO#7-32#Wqbmpjw?pwzof#wzsf>!wf{w,`pp!=		?pwzof#wzsf>!wf{w,`pp!=jlmbo-gwg!=	?kwno#{nomp>kwws.frvju>!@lmwfmw.Wzsfgjmd>!3!#`foopsb`jmd>!3!kwno8#`kbqpfw>vwe.;!#,=	#pwzof>!gjpsobz9mlmf8!=??oj=?b#kqfe>!kwws9,,ttt-#wzsf>$wf{w,ibubp`qjsw$=<X<Y=c=n<Y<W=`<Q<R=m=n<T=m<R<R=n<^<Y=n=m=n<^<T<T<S=l<R<T<[<^<R<X=m=n<^<\\<]<Y<[<R<S<\\=m<Q<R=m=n<T\fHF\fIm\fHT\fIa\fHH\fHS\fHy\fHR\fHy\fHR\fHn\fH{\fIa\fH\\\fIk\fHT\fHe\fHD\fIa\fHU\fIg\fHn\fHD\fIk\fHY\fHS\fHK\fHR\fHD\fHT\fHA\fHR\fHG\fHS\fHy\fIa\fHT\fHS\fHn\fH{\fHT\fIm\fH\\\fHy\fIa\fH[\fHS\fHH\fHy\fIe\fHF\fIl\fH\\\fHR\fHk\fHs\fHY\fHS\fHp\fIa\fHr\fHR\fHF\fHD\fHy\fHR\fH\\\fIa\fH\\\fHY\fHR\fHd\fHT\fHy\fIa\fH\\\fHS\fHC\fHH\fHR', "۷%ƌ'T%'W%×%O%g%¦&Ɠ%ǥ&>&*&'&^&Ÿా&ƭ&ƒ&)&^&%&'&&P&1&±&3&]&m&u&E&t&C&Ï&V&V&/&>&6&ྲྀ᝼o&p&@&E&M&P&x&@&F&e&Ì&7&:&(&D&0&C&)&.&F&-&1&(&L&F&1ɞ*Ϫ⇳&፲&K&;&)&E&H&P&0&?&9&V&&-&v&a&,&E&)&?&=&'&'&B&മ&ԃ&̖*&*8&%&%&&&%,)&&>&&7&]&F&2&>&J&6&n&2&%&?&&2&6&J&g&-&0&,&*&J&*&O&)&6&(&<&B&N&.&P&@&2&.&W&M&%Լ(,(<&,&Ϛ&ᣇ&-&,(%&(&%&(Ļ0&X&D&&j&'&J&(&.&B&3&Z&R&h&3&E&E&<Æ-͠ỳ&%8?&@&,&Z&@&0&J&,&^&x&_&6&C&6&Cܬ⨥&f&-&-&-&-&,&J&2&8&z&8&C&Y&8&-&d&ṸÌ-&7&1&F&7&t&W&7&I&.&.&^&=ྜ᧓&8(>&/&/&ݻ')'ၥ')'%@/&0&%оী*&*@&CԽהɴ׫4෗ܚӑ6඄&/Ÿ̃Z&*%ɆϿ&Ĵ&1¨ҴŴ", dictionarySizeBits, "AAAAKKLLKKKKKJJIHHIHHGGFF");
          setData(asReadOnlyBuffer(dictionaryData), dictionarySizeBits);
        }
        function min(a2, b2) {
          return a2 <= b2 ? a2 : b2;
        }
        function copyBytes(dst, target, src, start, end) {
          dst.set(src.slice(start, end), target);
        }
        function readInput(src, dst, offset, length) {
          if (src == null) return -1;
          let end = min(src.offset + length, src.data.length);
          let bytesRead = end - src.offset;
          dst.set(src.data.subarray(src.offset, end), offset);
          src.offset += bytesRead;
          return bytesRead;
        }
        function closeInput(src) {
          return 0;
        }
        function asReadOnlyBuffer(src) {
          return src;
        }
        function toUsAsciiBytes(src) {
          let n2 = src.length;
          let result = new Int8Array(n2);
          for (let i2 = 0; i2 < n2; ++i2) result[i2] = src.charCodeAt(i2);
          return result;
        }
        function decode(bytes, options) {
          let s2 = new State();
          initState(s2, new InputStream(bytes));
          if (options) {
            let customDictionary = options["customDictionary"];
            if (customDictionary) attachDictionaryChunk(s2, customDictionary);
          }
          let totalOutput = 0;
          let chunks = [];
          while (true) {
            let chunk = new Int8Array(16384);
            chunks.push(chunk);
            s2.output = chunk;
            s2.outputOffset = 0;
            s2.outputLength = 16384;
            s2.outputUsed = 0;
            decompress(s2);
            totalOutput += s2.outputUsed;
            if (s2.outputUsed < 16384) break;
          }
          close(s2);
          let result = new Int8Array(totalOutput);
          let offset = 0;
          for (let i2 = 0; i2 < chunks.length; ++i2) {
            let chunk = chunks[i2];
            let len = min(totalOutput, offset + 16384) - offset;
            if (len < 16384) result.set(chunk.subarray(0, len), offset);
            else result.set(chunk, offset);
            offset += len;
          }
          return result;
        }
        return decode;
      };
      let BrotliDecode = makeBrotliDecode();
      const inflateAsync = async (d2) => {
        const ds = new DecompressionStream("deflate");
        const writer = ds.writable.getWriter();
        writer.write(d2);
        writer.close();
        return new Uint8Array(await new Response(ds.readable).arrayBuffer());
      };
      const brotliDecompressAsync = (d2) => Uint8Array.from(BrotliDecode(Int8Array.from(d2)));
      const inflates = {
        inflateAsync,
        brotliDecompressAsync
      };
      var LiveWS = class extends LiveWSBase {
        constructor(roomid, opts) {
          super(inflates, roomid, opts);
        }
      };
      function formatMilliyuanAmount(amount, symbol = "¥") {
        if (!amount || !Number.isFinite(amount) || amount <= 0) return "";
        const yuan = amount / 1e3;
        if (yuan < 1) return `${symbol}${(Math.round(yuan * 10) / 10).toFixed(1)}`;
        const rounded = Math.round(yuan * 10) / 10;
        return Number.isInteger(rounded) ? `${symbol}${rounded}` : `${symbol}${rounded.toFixed(1)}`;
      }
      function formatMilliyuanBadgeAmount(amount) {
        const formatted = formatMilliyuanAmount(amount, "");
        return formatted ? `${formatted}元` : "";
      }
      const RECENT_DANMAKU_KEY_SEP = "\0";
      function recentKey(text, uid) {
        return `${uid ?? ""}${RECENT_DANMAKU_KEY_SEP}${text}`;
      }
      function parseAuthUid(uidCookie) {
        if (!uidCookie) return 0;
        const parsed = Number(uidCookie);
        if (!Number.isSafeInteger(parsed) || parsed < 0) return 0;
        return parsed;
      }
      const RECONNECT_BASE_MS = 3e3;
      const RECONNECT_STEP_MS = 2e3;
      const RECONNECT_CAP_MS = 3e4;
      const RECONNECT_JITTER_RATIO = 0.25;
      function computeReconnectDelay(attempt, random = Math.random) {
        const baseDelay = Math.min(RECONNECT_CAP_MS, RECONNECT_BASE_MS + attempt * RECONNECT_STEP_MS);
        const jitter = Math.floor(random() * baseDelay * RECONNECT_JITTER_RATIO);
        return baseDelay + jitter;
      }
      function formatCloseDetail(event) {
        const reason = event.reason ? `, reason=${event.reason}` : "";
        return `code=${event.code}, clean=${event.wasClean}${reason}`;
      }
      function shouldForceImmediateReconnect(input) {
        if (input.visibilityState !== "visible") return false;
        if (!input.started) return false;
        if (input.connectionHealthy) return false;
        return true;
      }
      function getSpmPrefix$1() {
        const metaTag = document.querySelector('meta[name="spm_prefix"]');
        return metaTag?.getAttribute("content") ?? "444.8";
      }
      let liveConnection = null;
      let started = false;
      let consumerCount = 0;
      let reconnectTimer = null;
      let lastStartupFailure = "";
      let lastStartupFailureAt = 0;
      let addressIndex = 0;
      let reconnectAttempt = 0;
      let connectionSerial = 0;
      let lastWsCloseDetail = "";
      let connectionHealthy = false;
      let visibilityRecoveryWired = false;
      const recentDanmaku = new Map();
      const RECENT_DANMAKU_MAX = 500;
      const STARTUP_FAILURE_LOG_INTERVAL = 6e4;
      function asRecord(value) {
        return typeof value === "object" && value !== null ? value : {};
      }
      function asString(value, fallback = "") {
        if (typeof value === "string") return value;
        if (value !== void 0 && value !== null) liveWsCoercionDiagnostics.stringFallbacks++;
        return fallback;
      }
      function asNumber(value, fallback = 0) {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (value !== void 0 && value !== null) liveWsCoercionDiagnostics.numberFallbacks++;
        return fallback;
      }
      const liveWsCoercionDiagnostics = { numberFallbacks: 0, stringFallbacks: 0 };
      if (typeof window !== "undefined") {
        window.__chatterboxLiveWsCoercion = liveWsCoercionDiagnostics;
      }
      function nonEmptyFields(fields) {
        return fields.filter((field) => !!field?.value);
      }
      function yuanFromGiftPrice(price) {
        return formatMilliyuanAmount(asNumber(price));
      }
      function avatarUrl(uid) {
        return uid ? `${BASE_URL.BILIBILI_AVATAR}/${uid}?size=96` : void 0;
      }
      function extractEmoticonImage(info, text) {
        if (!Array.isArray(info)) return void 0;
        const meta = info[0];
        if (!Array.isArray(meta)) return void 0;
        if (meta[12] !== 1) return void 0;
        const opts = asRecord(meta[13]);
        const url = asString(opts.url);
        if (!url) return void 0;
        const alt = asString(opts.emoticon_unique) || asString(opts.emoji) || text || "表情";
        const width = typeof opts.width === "number" && opts.width > 0 ? opts.width : void 0;
        const height = typeof opts.height === "number" && opts.height > 0 ? opts.height : void 0;
        return { url, alt, width, height };
      }
      let recentSweepCounter = 0;
      const RECENT_SWEEP_INTERVAL = 32;
      function cleanupRecent() {
        recentSweepCounter++;
        if (recentDanmaku.size <= RECENT_DANMAKU_MAX && recentSweepCounter < RECENT_SWEEP_INTERVAL) return;
        recentSweepCounter = 0;
        const now = Date.now();
        for (const [key, ts] of recentDanmaku) {
          if (now - ts > 8e3) recentDanmaku.delete(key);
        }
        while (recentDanmaku.size > RECENT_DANMAKU_MAX) {
          const oldest = recentDanmaku.keys().next().value;
          if (oldest === void 0) break;
          recentDanmaku.delete(oldest);
        }
      }
      function hasRecentWsDanmaku(text, uid) {
        cleanupRecent();
        return recentDanmaku.has(recentKey(text, uid));
      }
      function rememberWsDanmaku(text, uid) {
        cleanupRecent();
        recentDanmaku.set(recentKey(text, uid), Date.now());
      }
      function eventId(_cmd, data, fallback) {
        return asString(data.msg_id) || String(data.id ?? data.uid ?? fallback);
      }
      function getCookie(name) {
        const prefix = `${name}=`;
        return document.cookie.split(";").map((c2) => c2.trim()).find((c2) => c2.startsWith(prefix))?.slice(prefix.length);
      }
      function getBuvid() {
        return getCookie("buvid3") ?? getCookie("buvid4") ?? getCookie("buvid_fp");
      }
      async function fetchDanmuInfo(roomId) {
        const wbiKeys = await ensureWbiKeys();
        if (!wbiKeys) throw new Error("WBI keys unavailable");
        const query = encodeWbi(
          {
            id: roomId,
            type: 0,
            web_location: getSpmPrefix$1()
          },
          wbiKeys
        );
        const resp = await fetch(`${BASE_URL.BILIBILI_DANMU_INFO}?${query}`, { credentials: "include" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        const json = await resp.json();
        if (json.code !== 0 || !json.data?.token) {
          const message = json.message ?? json.msg ?? "danmaku server info unavailable";
          throw new Error(json.code === -352 ? `Bilibili rejected getDanmuInfo (-352): ${message}` : message);
        }
        const addresses = [
          ...new Set(
            json.data.host_list?.filter((item) => item.host).map((item) => `wss://${item.host}:${item.wss_port || 443}/sub`) ?? []
          )
        ];
        if (addresses.length === 0) throw new Error("弹幕服务器地址为空");
        return { key: json.data.token, addresses };
      }
      function appendStartupFailure(message) {
        const now = Date.now();
        if (message === lastStartupFailure && now - lastStartupFailureAt < STARTUP_FAILURE_LOG_INTERVAL) return;
        lastStartupFailure = message;
        lastStartupFailureAt = now;
        appendLog(`⚪ Chatterbox Chat WS 暂不可用，DOM 消息源继续兜底：${message}`);
      }
      function emit(event) {
        emitCustomChatEvent(event);
      }
      function bindEvents(roomId, live) {
        live.addEventListener("live", () => {
          emitCustomChatWsStatus("live");
          lastStartupFailure = "";
          lastStartupFailureAt = 0;
          appendLog(`🟢 Chatterbox Chat WS 已连接：${roomId}`);
        });
        live.addEventListener("close", () => {
          emitCustomChatWsStatus("closed");
        });
        live.addEventListener("error", () => {
          emitCustomChatWsStatus("error");
          appendStartupFailure("connection error");
        });
        live.addEventListener("DANMU_MSG", ({ data }) => {
          const info = data.info;
          const text = info[1];
          const user = info[2];
          const badge = info[3];
          const level = info[4];
          const uid = String(user[0]);
          const userLevel = Number(level?.[0] ?? 0);
          if (uid === (getDedeUid() ?? "")) {
            console.log(`[CB][WS-SELF] t=${Date.now()} text="${text}" uid=${uid} room=${roomId}`);
          }
          rememberWsDanmaku(text, uid);
          const badges = [];
          if (badge?.[0]) badges.push(`${badge[1]} ${badge[0]}`);
          if (Number.isFinite(userLevel) && userLevel > 0) badges.push(`LV${userLevel}`);
          if (user[2] === 1) badges.push("房管");
          emit({
            id: data.msg_id ?? `dm-${uid}-${Date.now()}-${Math.random()}`,
            kind: "danmaku",
            text,
            sendText: text,
            uname: user[1] || "匿名",
            uid,
            time: chatEventTime(asNumber(info[0][4], Date.now())),
            isReply: false,
            source: "ws",
            badges,
            avatarUrl: avatarUrl(uid),
            rawCmd: data.cmd,
            emoticonImage: extractEmoticonImage(info, text)
          });
        });
        live.addEventListener("SEND_GIFT", ({ data }) => {
          const gift = data.data;
          const uid = String(gift.uid ?? "");
          const num = Number(gift.num ?? 1);
          emit({
            id: eventId(data.cmd, gift, `gift-${Date.now()}`),
            kind: "gift",
            text: `${gift.action || "投喂"} ${gift.giftName} x${num}`,
            uname: gift.uname || "匿名",
            uid,
            time: chatEventTime(),
            isReply: false,
            source: "ws",
            badges: gift.price > 0 ? [formatMilliyuanBadgeAmount(gift.price)] : [],
            avatarUrl: avatarUrl(uid),
            amount: gift.price,
            fields: nonEmptyFields([
              { key: "gift-name", label: "礼物", value: String(gift.giftName ?? ""), kind: "text" },
              { key: "gift-count", label: "数量", value: `x${num}`, kind: "count" },
              { key: "gift-price", label: "金额", value: yuanFromGiftPrice(gift.price), kind: "money" },
              { key: "gift-action", label: "动作", value: String(gift.action ?? ""), kind: "text" }
            ]),
            rawCmd: data.cmd
          });
        });
        live.addEventListener("SUPER_CHAT_MESSAGE", ({ data }) => {
          const sc = data.data;
          emit({
            id: String(sc.id ?? data.msg_id ?? `sc-${Date.now()}`),
            kind: "superchat",
            text: sc.message,
            sendText: sc.message,
            uname: sc.user_info?.uname || "匿名",
            uid: String(sc.uid ?? ""),
            time: chatEventTime((sc.ts || sc.start_time || Date.now() / 1e3) * 1e3),
            isReply: false,
            source: "ws",
            badges: [`SC ${sc.price}元`],
            avatarUrl: avatarUrl(String(sc.uid ?? "")),
            amount: sc.price,
            fields: nonEmptyFields([
              { key: "sc-price", label: "金额", value: sc.price ? `¥${sc.price}` : "", kind: "money" },
              { key: "sc-duration", label: "时长", value: sc.time ? `${sc.time}s` : "", kind: "duration" },
              { key: "sc-user", label: "用户", value: sc.user_info?.uname || "", kind: "text" }
            ]),
            rawCmd: data.cmd
          });
        });
        live.addEventListener("INTERACT_WORD", ({ data }) => {
          const d2 = data.data;
          if (d2.msg_type !== 1 && d2.msg_type !== 2) return;
          emit({
            id: `interact-${d2.uid}-${d2.trigger_time || Date.now()}`,
            kind: d2.msg_type === 2 ? "follow" : "enter",
            text: d2.msg_type === 2 ? "关注了直播间" : "进入直播间",
            uname: d2.uname || d2.uinfo?.base?.name || "匿名",
            uid: String(d2.uid ?? ""),
            time: chatEventTime((d2.timestamp || Date.now()) * 1e3),
            isReply: false,
            source: "ws",
            badges: d2.privilege_type ? [`舰队 ${d2.privilege_type}`, `GUARD ${d2.privilege_type}`] : [],
            avatarUrl: avatarUrl(String(d2.uid ?? "")),
            rawCmd: data.cmd
          });
        });
        live.addEventListener("GUARD_BUY", ({ data }) => {
          const d2 = data.data;
          const uid = String(d2.uid ?? "");
          const guard = String(d2.guard_level ?? d2.privilege_type ?? "");
          const guardName = guard === "1" ? "总督" : guard === "2" ? "提督" : "舰长";
          const months = asNumber(d2.num);
          emit({
            id: eventId(data.cmd, d2, `guard-${Date.now()}`),
            kind: "guard",
            text: `${d2.username || d2.uname || "用户"} 开通 ${guardName}${months ? ` x${months}` : ""}`,
            uname: d2.username || d2.uname || "匿名",
            uid,
            time: chatEventTime(),
            isReply: false,
            source: "ws",
            badges: guard ? [`GUARD ${guard}`] : [],
            avatarUrl: avatarUrl(uid),
            amount: asNumber(d2.price),
            fields: nonEmptyFields([
              { key: "guard-level", label: "等级", value: guardName, kind: "level" },
              { key: "guard-months", label: "月份", value: months ? `${months}个月` : "", kind: "duration" },
              { key: "guard-price", label: "金额", value: yuanFromGiftPrice(d2.price), kind: "money" }
            ]),
            rawCmd: data.cmd
          });
        });
        live.addEventListener("POPULARITY_RED_POCKET_START", ({ data }) => {
          const d2 = asRecord(data.data);
          emit({
            id: eventId(data.cmd, d2, `redpacket-${Date.now()}`),
            kind: "redpacket",
            text: asString(d2.title || d2.lot_name || d2.sender_name, "直播间红包开启"),
            uname: asString(d2.sender_name || d2.uname, "红包"),
            uid: String(d2.sender_uid ?? d2.uid ?? ""),
            time: chatEventTime(),
            isReply: false,
            source: "ws",
            badges: ["红包"],
            avatarUrl: avatarUrl(String(d2.sender_uid ?? d2.uid ?? "")),
            rawCmd: data.cmd
          });
        });
        live.addEventListener("ANCHOR_LOT_START", ({ data }) => {
          const d2 = asRecord(data.data);
          emit({
            id: eventId(data.cmd, d2, `lottery-${Date.now()}`),
            kind: "lottery",
            text: asString(d2.award_name || d2.require_text || d2.title, "天选时刻开启"),
            uname: "天选时刻",
            uid: null,
            time: chatEventTime(),
            isReply: false,
            source: "ws",
            badges: ["天选"],
            rawCmd: data.cmd
          });
        });
        live.addEventListener("ENTRY_EFFECT", ({ data }) => {
          const d2 = data.data;
          emit({
            id: `entry-${d2.uid}-${d2.id}-${Date.now()}`,
            kind: "enter",
            text: asString(d2.copy_writing_v2 || d2.copy_writing, "进入直播间").replace(/<%|%>/g, ""),
            uname: d2.uinfo?.base?.name || "匿名",
            uid: String(d2.uid ?? ""),
            time: chatEventTime(),
            isReply: false,
            source: "ws",
            badges: d2.privilege_type ? [`舰队 ${d2.privilege_type}`, `GUARD ${d2.privilege_type}`] : [],
            avatarUrl: avatarUrl(String(d2.uid ?? "")),
            rawCmd: data.cmd
          });
        });
        live.addEventListener("COMMON_NOTICE_DANMAKU", ({ data }) => {
          const d2 = asRecord(data);
          emit({
            id: `notice-${Date.now()}-${Math.random()}`,
            kind: "notice",
            text: asString(asRecord(d2.data).content_segments?.toString?.() ?? d2.cmd, "系统通知"),
            uname: "系统",
            uid: null,
            time: chatEventTime(),
            isReply: false,
            source: "ws",
            badges: ["NOTICE"],
            rawCmd: asString(d2.cmd)
          });
        });
      }
      async function connect() {
        if (!started) return;
        reconnectTimer = null;
        const serial = ++connectionSerial;
        try {
          emitCustomChatWsStatus("connecting");
          const roomId = await ensureRoomId();
          const info = await fetchDanmuInfo(roomId);
          if (!started || serial !== connectionSerial) return;
          const address = info.addresses[addressIndex % info.addresses.length];
          addressIndex += 1;
          const uid = parseAuthUid(getDedeUid());
          const buvid = getBuvid();
          const authBody = {
            uid,
            roomid: roomId,
            protover: 3,
            platform: "web",
            type: 2,
            key: info.key,
            clientver: "1.14.3"
          };
          if (buvid) authBody.buvid = buvid;
          const live = new LiveWS(roomId, {
            address,
            authBody,
            createWebSocket: (url) => {
              const ws = new WebSocket(url);
              ws.addEventListener("close", (event) => {
                lastWsCloseDetail = `${url} ${formatCloseDetail(event)}`;
              });
              ws.addEventListener("error", () => {
                lastWsCloseDetail = `${url} WebSocket error`;
              });
              return ws;
            }
          });
          const previous = liveConnection;
          liveConnection = live;
          previous?.close();
          bindEvents(roomId, live);
          live.addEventListener("live", () => {
            reconnectAttempt = 0;
            connectionHealthy = true;
          });
          live.addEventListener("close", () => {
            connectionHealthy = false;
            if (!started || liveConnection !== live) return;
            const suffix = lastWsCloseDetail ? ` (${lastWsCloseDetail})` : "";
            appendStartupFailure(live.live ? `connection closed${suffix}` : `closed before room entered${suffix}`);
            const delay = computeReconnectDelay(reconnectAttempt);
            reconnectAttempt += 1;
            reconnectTimer = setTimeout(() => void connect(), delay);
          });
        } catch (err) {
          emitCustomChatWsStatus("error");
          const message = err instanceof Error ? err.message : String(err);
          appendStartupFailure(message);
          const delay = Math.min(3e4, 3e3 + reconnectAttempt * 2e3);
          reconnectAttempt += 1;
          reconnectTimer = setTimeout(() => void connect(), delay);
        }
      }
      function ensureVisibilityRecoveryWired() {
        if (visibilityRecoveryWired) return;
        if (typeof document === "undefined") return;
        visibilityRecoveryWired = true;
        document.addEventListener("visibilitychange", () => {
          if (!shouldForceImmediateReconnect({
            visibilityState: document.visibilityState,
            started,
            connectionHealthy
          })) {
            return;
          }
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          reconnectAttempt = 0;
          void connect();
        });
      }
      function startLiveWsSource() {
        consumerCount += 1;
        if (started) return;
        started = true;
        ensureVisibilityRecoveryWired();
        emitCustomChatWsStatus("connecting");
        void connect();
      }
      function stopLiveWsSource() {
        consumerCount = Math.max(0, consumerCount - 1);
        if (consumerCount > 0) return;
        started = false;
        connectionSerial += 1;
        connectionHealthy = false;
        emitCustomChatWsStatus("off");
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        liveConnection?.close();
        liveConnection = null;
      }
      const guardRoomLiveDeskSessionId = gmSignal("guardRoomLiveDeskSessionId", "");
      const guardRoomLiveDeskHeartbeatSec = gmSignal("guardRoomLiveDeskHeartbeatSec", 30);
      const guardRoomCurrentRiskLevel = y$1("pass");
      const guardRoomAgentConnected = y$1(false);
      const guardRoomAgentStatusText = y$1("未连接");
      const guardRoomAgentLastSyncAt = y$1(null);
      const guardRoomAgentWatchlistCount = y$1(0);
      const guardRoomAgentLiveCount = y$1(0);
      const guardRoomWatchlistRooms = y$1([]);
      const guardRoomAppliedProfile = y$1(null);
      const warnedSyncFailures = new Set();
      function warnGuardRoomSyncFailureOnce(endpoint, kind, detail) {
        const key = `${endpoint}::${kind}`;
        if (warnedSyncFailures.has(key)) return;
        warnedSyncFailures.add(key);
        notifyUser("warning", `Guard Room ${kind} 同步失败`, detail);
      }
      function describeFetchError(err) {
        if (err instanceof Error) return err.message;
        return String(err);
      }
      function normalizeGuardRoomEndpoint$1(endpoint) {
        const trimmed = endpoint.trim().replace(/\/+$/, "");
        if (!trimmed) return "";
        let parsed;
        try {
          parsed = new URL(trimmed);
        } catch {
          return "";
        }
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
        if (parsed.protocol === "http:") {
          const host = parsed.hostname;
          const bare = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
          const isLoopback = bare === "localhost" || bare === "127.0.0.1" || bare === "::1";
          if (!isLoopback) return "";
        }
        return trimmed;
      }
      function classifyRiskEvent(error, errorData) {
        if (isMutedError(error)) {
          return {
            kind: "muted",
            level: "stop",
            advice: `检测到房间禁言，先停车。禁言时长：${describeRestrictionDuration(error, errorData)}。`
          };
        }
        if (isAccountRestrictedError(error)) {
          return {
            kind: "account_restricted",
            level: "stop",
            advice: `检测到账号级风控，先停发。限制时长：${describeRestrictionDuration(error, errorData)}。`
          };
        }
        if (isRateLimitError(error)) {
          return { kind: "rate_limited", level: "observe", advice: "发送频率过快，先降频或暂停自动跟车。" };
        }
        return { kind: "send_failed", level: "observe", advice: "发送失败，建议看一眼房间状态和替换词。" };
      }
      async function syncGuardRoomRiskEvent(input) {
        const endpoint = normalizeGuardRoomEndpoint$1(guardRoomEndpoint.value);
        const syncKey = guardRoomSyncKey.value.trim();
        if (!endpoint || !syncKey) return;
        guardRoomCurrentRiskLevel.value = input.level;
        const payload = {
          eventId: `risk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          scriptVersion: VERSION,
          occurredAt: ( new Date()).toISOString(),
          ...input,
          reason: input.reason?.slice(0, 500),
          advice: input.advice?.slice(0, 500)
        };
        try {
          const response = await fetch(`${endpoint}/api/risk-events`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-sync-key": syncKey
            },
            body: JSON.stringify(payload)
          });
          if (!response.ok) warnGuardRoomSyncFailureOnce(endpoint, "risk-events", `HTTP ${response.status}`);
        } catch (err) {
          warnGuardRoomSyncFailureOnce(endpoint, "risk-events", describeFetchError(err));
        }
      }
      async function syncGuardRoomLiveDeskHeartbeat(input) {
        const endpoint = normalizeGuardRoomEndpoint$1(guardRoomEndpoint.value);
        const syncKey = guardRoomSyncKey.value.trim();
        if (!endpoint || !syncKey) return;
        try {
          const response = await fetch(`${endpoint}/api/live-desk/heartbeats`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-sync-key": syncKey
            },
            body: JSON.stringify({
              ...input,
              scriptVersion: VERSION,
              candidateText: input.candidateText?.slice(0, 120)
            })
          });
          if (!response.ok) warnGuardRoomSyncFailureOnce(endpoint, "heartbeat", `HTTP ${response.status}`);
        } catch (err) {
          warnGuardRoomSyncFailureOnce(endpoint, "heartbeat", describeFetchError(err));
        }
      }
      async function syncGuardRoomShadowRule(input) {
        const endpoint = normalizeGuardRoomEndpoint$1(guardRoomEndpoint.value);
        const syncKey = guardRoomSyncKey.value.trim();
        if (!endpoint || !syncKey) return;
        try {
          const response = await fetch(`${endpoint}/api/shadow-rules`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-sync-key": syncKey
            },
            body: JSON.stringify({
              kind: "shadow_rule_learned",
              roomId: input.roomId,
              from: input.from,
              to: input.to,
              sourceText: input.sourceText.slice(0, 200),
              occurredAt: ( new Date()).toISOString(),
              scriptVersion: VERSION
            })
          });
          if (!response.ok) warnGuardRoomSyncFailureOnce(endpoint, "shadow-rule", `HTTP ${response.status}`);
        } catch (err) {
          warnGuardRoomSyncFailureOnce(endpoint, "shadow-rule", describeFetchError(err));
        }
      }
      async function syncGuardRoomWatchlist(rooms) {
        const endpoint = normalizeGuardRoomEndpoint$1(guardRoomEndpoint.value);
        const syncKey = guardRoomSyncKey.value.trim();
        if (!endpoint || !syncKey) return;
        await fetch(`${endpoint}/api/watchlists/sync`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-sync-key": syncKey
          },
          body: JSON.stringify({ rooms })
        }).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
        });
      }
      async function fetchGuardRoomControlProfile() {
        const endpoint = normalizeGuardRoomEndpoint$1(guardRoomEndpoint.value);
        const syncKey = guardRoomSyncKey.value.trim();
        if (!endpoint || !syncKey) return null;
        let response = null;
        try {
          response = await fetch(`${endpoint}/api/control-profile/current`, {
            method: "GET",
            headers: {
              "x-sync-key": syncKey
            }
          });
        } catch (err) {
          warnGuardRoomSyncFailureOnce(endpoint, "control-profile", describeFetchError(err));
          return null;
        }
        if (!response.ok) {
          warnGuardRoomSyncFailureOnce(endpoint, "control-profile", `HTTP ${response.status}`);
          return null;
        }
        return await response.json();
      }
      const SHADOW_RULE_PER_ROOM_CAP = 50;
      const SHADOW_RULE_MIN_LEN = 1;
      const SHADOW_RULE_MAX_LEN = 60;
      const OBSERVATION_CAP = 200;
      function isValidSensitiveWord(word) {
        const trimmed = word.trim();
        return trimmed.length >= SHADOW_RULE_MIN_LEN && trimmed.length <= SHADOW_RULE_MAX_LEN && !trimmed.includes("\n");
      }
      function learnShadowRules(input) {
        if (!autoLearnShadowRules.value) return;
        const roomKey = String(input.roomId);
        const currentByRoom = localRoomRules.value;
        const existingRules = currentByRoom[roomKey] ?? [];
        const existingFroms = new Set(existingRules.map((r2) => r2.from).filter((s2) => !!s2));
        const newRules = [];
        const learnedFroms = [];
        for (const raw of input.sensitiveWords) {
          if (!isValidSensitiveWord(raw)) continue;
          const from = raw.trim();
          if (existingFroms.has(from)) continue;
          const to = processText(from);
          if (to === from) continue;
          newRules.push({ from, to });
          existingFroms.add(from);
          learnedFroms.push(from);
        }
        if (newRules.length === 0) return;
        let merged = [...existingRules, ...newRules];
        if (merged.length > SHADOW_RULE_PER_ROOM_CAP) {
          merged = merged.slice(merged.length - SHADOW_RULE_PER_ROOM_CAP);
        }
        localRoomRules.value = { ...currentByRoom, [roomKey]: merged };
        appendLog(`📚 已学到屏蔽词规则（房间 ${input.roomId}）：${learnedFroms.join("、")}`);
        for (const rule of newRules) {
          void syncGuardRoomShadowRule({
            roomId: input.roomId,
            from: rule.from,
            to: rule.to,
            sourceText: input.originalMessage
          });
        }
      }
      function recordShadowBanObservation(input) {
        const text = input.text.trim();
        if (!text) return;
        const list = shadowBanObservations.value;
        const idx = list.findIndex((o2) => o2.text === text && o2.roomId === input.roomId);
        const now = Date.now();
        if (idx >= 0) {
          const updated = [...list];
          const prev = updated[idx];
          updated[idx] = {
            ...prev,
            ts: now,
            count: prev.count + 1,
            evadedAlready: prev.evadedAlready || input.evadedAlready,

candidates: input.candidates ?? prev.candidates
          };
          shadowBanObservations.value = updated;
          return;
        }
        const entry = {
          text,
          roomId: input.roomId,
          ts: now,
          count: 1,
          evadedAlready: input.evadedAlready,
          candidates: input.candidates
        };
        let next = [...list, entry];
        if (next.length > OBSERVATION_CAP) {
          next = next.slice(next.length - OBSERVATION_CAP);
        }
        shadowBanObservations.value = next;
      }
      function clearShadowBanObservations() {
        shadowBanObservations.value = [];
      }
      function removeShadowBanObservation(text, roomId) {
        shadowBanObservations.value = shadowBanObservations.value.filter((o2) => !(o2.text === text && o2.roomId === roomId));
      }
      function promoteObservationToRule(observation, to) {
        const trimmedText = observation.text.trim();
        const trimmedTo = to.trim();
        if (!trimmedText || trimmedText === trimmedTo) return false;
        if (observation.roomId === void 0) return false;
        const roomKey = String(observation.roomId);
        const currentByRoom = localRoomRules.value;
        const existingRules = currentByRoom[roomKey] ?? [];
        if (existingRules.some((r2) => r2.from === trimmedText)) return false;
        const merged = [...existingRules, { from: trimmedText, to: trimmedTo }];
        localRoomRules.value = { ...currentByRoom, [roomKey]: merged };
        removeShadowBanObservation(observation.text, observation.roomId);
        void syncGuardRoomShadowRule({
          roomId: observation.roomId,
          from: trimmedText,
          to: trimmedTo,
          sourceText: trimmedText
        });
        return true;
      }
      const KOU_SEPARATOR = "口";
      const FULLWIDTH_SPACE = "　";
      function joinWith(text, separator) {
        const graphemes = getGraphemes(text);
        return graphemes.join(separator);
      }
      function generateHeuristicCandidates(text) {
        const trimmed = text.trim();
        if (!trimmed) return [];
        const candidates = [
          { strategy: "invisible", label: "隐形字符", text: processText(trimmed) },
          { strategy: "kou", label: "口分隔", text: joinWith(trimmed, KOU_SEPARATOR) },
          { strategy: "space", label: "全角空格", text: joinWith(trimmed, FULLWIDTH_SPACE) }
        ];
        const seen2 = new Set([trimmed]);
        return candidates.filter((c2) => {
          if (c2.text === trimmed) return false;
          if (seen2.has(c2.text)) return false;
          seen2.add(c2.text);
          return true;
        });
      }
      function formatCandidatesForLog(candidates) {
        if (candidates.length === 0) return null;
        const lines = candidates.map((c2) => `   • ${c2.label}: ${c2.text}`);
        return ["🛠 改写候选（不自动发送，可复制粘贴）：", ...lines].join("\n");
      }
      const SEND_ECHO_TIMEOUT_MS = 4e3;
      const RECENT_DOM_DANMAKU_HISTORY_MS = 15e3;
      const RECENT_DOM_DANMAKU_HISTORY_MAX = 240;
      const recentDomDanmaku = [];
      function pruneRecentDomDanmaku(now = Date.now()) {
        while (recentDomDanmaku.length > 0 && now - recentDomDanmaku[0].observedAt > RECENT_DOM_DANMAKU_HISTORY_MS) {
          recentDomDanmaku.shift();
        }
        while (recentDomDanmaku.length > RECENT_DOM_DANMAKU_HISTORY_MAX) {
          recentDomDanmaku.shift();
        }
      }
      function rememberRecentDomDanmaku(text, uid, observedAt) {
        if (!text) return;
        pruneRecentDomDanmaku(observedAt);
        recentDomDanmaku.push({ text, uid, observedAt });
      }
      function findRecentDomDanmakuSource(text, uid, sinceTs, selfUid) {
        const target = text.trim();
        if (!target) return null;
        pruneRecentDomDanmaku();
        for (let i2 = recentDomDanmaku.length - 1; i2 >= 0; i2--) {
          const event = recentDomDanmaku[i2];
          if (event.observedAt < sinceTs) break;
          if (event.text !== target) continue;
          if (uid && event.uid && event.uid !== uid) continue;
          if (selfUid && event.uid === selfUid) continue;
          return "dom";
        }
        return null;
      }
      function matchesCustomChatEchoEvent(event, target, uid) {
        return event.kind === "danmaku" && event.text.trim() === target && (!uid || !event.uid || event.uid === uid);
      }
      function matchesDomEchoEvent(event, target, uid, selfUid) {
        if (event.text.trim() !== target) return false;
        if (uid && event.uid && event.uid !== uid) return false;
        if (selfUid && event.uid === selfUid) return false;
        return true;
      }
      let domSubscribed = false;
      function ensureDomTracking() {
        if (domSubscribed) return;
        domSubscribed = true;
        subscribeDanmaku({
          onMessage: (ev) => rememberRecentDomDanmaku(ev.text, ev.uid, Date.now())
        });
      }
      let wsTrackingStarted = false;
      let currentWsStatus$1 = "off";
      function ensureWsTracking() {
        if (wsTrackingStarted) return;
        wsTrackingStarted = true;
        subscribeCustomChatWsStatus((status) => {
          currentWsStatus$1 = status;
        });
        startLiveWsSource();
      }
      function waitForSentEcho(text, uid, sinceTs, timeoutMs = SEND_ECHO_TIMEOUT_MS) {
        ensureDomTracking();
        ensureWsTracking();
        const target = text.trim();
        if (!target) return Promise.resolve(null);
        const selfUid = uid;
        const recentCustomSource = findRecentCustomChatDanmakuSource(target, uid, sinceTs);
        if (recentCustomSource && recentCustomSource !== "local") return Promise.resolve(recentCustomSource);
        const recentDomSource = findRecentDomDanmakuSource(target, uid, sinceTs, selfUid);
        if (recentDomSource) return Promise.resolve(recentDomSource);
        return new Promise((resolve) => {
          let done = false;
          let unsubscribeEvents2 = () => {
          };
          let unsubscribeDom2 = () => {
          };
          const finish = (source) => {
            if (done) return;
            done = true;
            clearTimeout(timer2);
            unsubscribeEvents2();
            unsubscribeDom2();
            resolve(source);
          };
          const timer2 = setTimeout(() => {
            const localFallback = findRecentCustomChatDanmakuSource(target, uid, sinceTs);
            finish(localFallback === "local" ? "local" : null);
          }, timeoutMs);
          unsubscribeEvents2 = subscribeCustomChatEvents((event) => {
            if (!matchesCustomChatEchoEvent(event, target, uid)) return;
            if (event.source !== "local") finish(event.source);
          });
          unsubscribeDom2 = subscribeDanmaku({
            onMessage: (event) => {
              if (!matchesDomEchoEvent(event, target, uid, selfUid)) return;
              finish("dom");
            }
          });
          const lateCustomSource = findRecentCustomChatDanmakuSource(target, uid, sinceTs);
          const lateDomSource = findRecentDomDanmakuSource(target, uid, sinceTs, selfUid);
          const lateSource = (lateCustomSource !== "local" ? lateCustomSource : null) ?? lateDomSource;
          if (lateSource) finish(lateSource);
        });
      }
      const TOAST_COOLDOWN_MS = 3e4;
      const lastToastAt = new Map();
      async function verifyBroadcast(input) {
        const isEmoticon = input.isEmoticon ?? isEmoticonUnique(input.text);
        if (isEmoticon) return;
        const uid = getDedeUid() ?? null;
        const source = await waitForSentEcho(input.text, uid, input.sinceTs, input.timeoutMs);
        console.log(`[CB][VERIFY] t=${Date.now()} text="${input.text}" source=${source} wsStatus=${currentWsStatus$1}`);
        if (source === "ws" || source === "dom") return;
        if (currentWsStatus$1 !== "live") {
          appendLogQuiet(`⚪ ${input.label}: ${input.display}（广播校验跳过：WS 未就绪 ${currentWsStatus$1}）`);
          return;
        }
        const target = input.text.trim();
        const recentSelfDom = recentDomDanmaku.some(
          (ev) => ev.observedAt >= input.sinceTs && ev.text === target && uid !== null && ev.uid === uid
        );
        if (recentSelfDom) {
          appendLogQuiet(`⚪ ${input.label}: ${input.display}（仅本地回显，未拿到 WS 广播证据 — 可能是 B站 不向自身推送）`);
          return;
        }
        const message = `⚠️ ${input.label}: ${input.display}（接口成功但未检测到广播，可能被屏蔽）`;
        let surfaceToast = input.surfaceToast !== false;
        if (surfaceToast && input.toastDedupeKey) {
          const now = Date.now();
          const prev = lastToastAt.get(input.toastDedupeKey) ?? 0;
          if (now - prev < TOAST_COOLDOWN_MS) {
            surfaceToast = false;
          } else {
            lastToastAt.set(input.toastDedupeKey, now);
          }
        }
        if (surfaceToast) {
          appendLog(message);
        } else {
          appendLogQuiet(message);
        }
        if (input.isPostEvasion) {
          recordShadowBanObservation({ text: input.text, roomId: input.roomId, evadedAlready: true });
          return;
        }
        const heuristic = generateHeuristicCandidates(input.text);
        const candidates = [...heuristic];
        let aiSuggestion = null;
        if (input.enableAiEvasion && aiEvasion.value) {
          try {
            aiSuggestion = await requestAiSuggestion(input.text);
          } catch {
            aiSuggestion = null;
          }
          if (aiSuggestion) {
            candidates.push({
              strategy: "ai",
              label: "AI改写",
              text: aiSuggestion.evadedMessage
            });
          }
        }
        const formatted = formatCandidatesForLog(candidates);
        if (formatted) appendLogQuiet(formatted);
        recordShadowBanObservation({
          text: input.text,
          roomId: input.roomId,
          evadedAlready: false,
          candidates
        });
        const canAutoResend = shadowBanMode.value === "auto-resend" && aiSuggestion !== null && input.roomId !== void 0 && typeof input.csrfToken === "string" && input.csrfToken.length > 0;
        if (!canAutoResend) return;
        const roomId = input.roomId;
        const csrfToken = input.csrfToken;
        const result = await tryAiEvasion(input.text, roomId, csrfToken, `${input.label}·影子屏蔽-`);
        if (result.success && result.evadedMessage) {
          if (result.sensitiveWords && result.sensitiveWords.length > 0) {
            learnShadowRules({
              roomId,
              sensitiveWords: result.sensitiveWords,
              evadedMessage: result.evadedMessage,
              originalMessage: input.text
            });
          }
          void verifyBroadcast({
            text: result.evadedMessage,
            label: `${input.label}·AI`,
            display: result.evadedMessage,
            sinceTs: Date.now(),
            isPostEvasion: true,
            surfaceToast: false
          });
        }
      }
      const GET_INFO_BY_USER_PATTERN = "/xlive/web-room/v1/index/getInfoByUser";
      function shouldHijackUrl(url) {
        return unlockForbidLive.value && url.includes(GET_INFO_BY_USER_PATTERN);
      }
      function applyTransforms(url, data) {
        if (!shouldHijackUrl(url)) return;
        const forbid = data?.data?.forbid_live;
        if (!forbid) return;
        forbid.is_forbid = false;
        forbid.forbid_text = "";
      }
      (() => {
        try {
          const ResponseProto = _unsafeWindow.Response.prototype;
          if (ResponseProto.__chatterboxFetchHijackInstalled) return;
          ResponseProto.__chatterboxFetchHijackInstalled = true;
          const origJson = ResponseProto.json;
          ResponseProto.json = async function() {
            const data = await origJson.call(this);
            const url = this.url;
            if (!url || !shouldHijackUrl(url) || !data || typeof data !== "object") return data;
            try {
              applyTransforms(url, data);
            } catch (err) {
              console.error("[Chatterbox] fetch-hijack json transform failed:", err);
            }
            return data;
          };
          const origText = ResponseProto.text;
          ResponseProto.text = async function() {
            const text = await origText.call(this);
            const url = this.url;
            if (!url || !shouldHijackUrl(url)) return text;
            try {
              const data = JSON.parse(text);
              applyTransforms(url, data);
              return JSON.stringify(data);
            } catch {
              return text;
            }
          };
        } catch (err) {
          console.error("[Chatterbox] failed to install fetch-hijack:", err);
        }
      })();
      function isOurOwnSend(url) {
        return url.includes(CHATTERBOX_SEND_MARKER);
      }
      function urlOf(input) {
        if (typeof input === "string") return input;
        if (input instanceof URL) return input.toString();
        return input.url;
      }
      function extractMsgFromBody(body) {
        if (!body) return null;
        if (body instanceof FormData) {
          const v2 = body.get("msg");
          return typeof v2 === "string" ? v2 : null;
        }
        if (body instanceof URLSearchParams) return body.get("msg");
        if (typeof body === "string") {
          try {
            return new URLSearchParams(body).get("msg");
          } catch {
            return null;
          }
        }
        return null;
      }
      (() => {
        try {
          const win = _unsafeWindow;
          if (win.__chatterboxMsgSendHijackInstalled) return;
          win.__chatterboxMsgSendHijackInstalled = true;
          const origFetch = win.fetch.bind(win);
          win.fetch = (async (input, init) => {
            try {
              const url = urlOf(input);
              const isMsgSend = url.includes(BASE_URL.BILIBILI_MSG_SEND);
              if (!isMsgSend) return origFetch(input, init);
              if (isOurOwnSend(url)) return origFetch(input, init);
              const startedAt = Date.now();
              const msg = extractMsgFromBody(init?.body);
              const resp = await origFetch(input, init);
              resp.clone().json().then((json) => {
                if (!msg) return;
                const code = json?.code;
                if (code !== 0) return;
                appendLog(`✅ B站原生: ${msg}`);
                void verifyBroadcast({
                  text: msg,
                  label: "B站原生",
                  display: msg,
                  sinceTs: startedAt
                });
              }).catch(() => {
              });
              return resp;
            } catch (err) {
              console.error("[Chatterbox] msg-send hijack error:", err);
              return origFetch(input, init);
            }
          });
        } catch (err) {
          console.error("[Chatterbox] failed to install msg-send hijack:", err);
        }
      })();
      class FetchCache {
        cache = new Map();
        inFlight = new Map();
        async get(opts) {
          const { key, ttlMs, fetcher } = opts;
          const cached = this.cache.get(key);
          if (cached && Date.now() - cached.ts < ttlMs) return cached.data;
          const pending2 = this.inFlight.get(key);
          if (pending2) return pending2;
          const promise = fetcher().then(
            (data) => {
              this.cache.set(key, { ts: Date.now(), data });
              this.inFlight.delete(key);
              return data;
            },
            (err) => {
              this.inFlight.delete(key);
              throw err;
            }
          );
          this.inFlight.set(key, promise);
          return promise;
        }
invalidate(key) {
          if (key === void 0) {
            this.cache.clear();
          } else {
            this.cache.delete(key);
          }
        }
_clearForTests() {
          this.cache.clear();
          this.inFlight.clear();
        }
      }
      const scriptRel = (function detectScriptRel() {
        const relList = typeof document !== "undefined" && document.createElement("link").relList;
        return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
      })();
      const assetsURL = function(dep) {
        return "/" + dep;
      };
      const seen$1 = {};
      const __vitePreload = function preload(baseModule, deps2, importerUrl) {
        let promise = Promise.resolve();
        if (deps2 && deps2.length > 0) {
          let allSettled = function(promises$2) {
            return Promise.all(promises$2.map((p2) => Promise.resolve(p2).then((value$1) => ({
              status: "fulfilled",
              value: value$1
            }), (reason) => ({
              status: "rejected",
              reason
            }))));
          };
          document.getElementsByTagName("link");
          const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
          const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
          promise = allSettled(deps2.map((dep) => {
            dep = assetsURL(dep);
            if (dep in seen$1) return;
            seen$1[dep] = true;
            const isCss = dep.endsWith(".css");
            const cssSelector = isCss ? '[rel="stylesheet"]' : "";
            if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) return;
            const link = document.createElement("link");
            link.rel = isCss ? "stylesheet" : scriptRel;
            if (!isCss) link.as = "script";
            link.crossOrigin = "";
            link.href = dep;
            if (cspNonce) link.setAttribute("nonce", cspNonce);
            document.head.appendChild(link);
            if (isCss) return new Promise((res, rej) => {
              link.addEventListener("load", res);
              link.addEventListener("error", () => rej( new Error(`Unable to preload CSS for ${dep}`)));
            });
          }));
        }
        function handlePreloadError(err$2) {
          const e$12 = new Event("vite:preloadError", { cancelable: true });
          e$12.payload = err$2;
          window.dispatchEvent(e$12);
          if (!e$12.defaultPrevented) throw err$2;
        }
        return promise.then((res) => {
          for (const item of res || []) {
            if (item.status !== "rejected") continue;
            handlePreloadError(item.reason);
          }
          return baseModule().catch(handlePreloadError);
        });
      };
      async function resolveGmXhr() {
        const m2 = await __vitePreload(() => Promise.resolve().then(() => client), void 0 );
        return typeof m2.GM_xmlhttpRequest === "function" ? m2.GM_xmlhttpRequest : null;
      }
      async function gmFetch(url, init = {}) {
        const { method = "GET", headers, body, timeoutMs = 2e4 } = init;
        const xhr = await resolveGmXhr();
        if (!xhr) {
          throw new Error("gmFetch: GM_xmlhttpRequest unavailable (userscript grant missing or test stub).");
        }
        return new Promise((resolve, reject) => {
          let settled = false;
          const finishOnce = (fn) => {
            if (settled) return;
            settled = true;
            fn();
          };
          xhr({
            method,
            url,
            headers,
            data: body,
            timeout: timeoutMs,
            responseType: "text",
            onload: (resp) => {
              finishOnce(() => {
                const status = resp.status;
                const text = String(resp.responseText ?? "");
                resolve({
                  ok: status >= 200 && status < 300,
                  status,
                  statusText: resp.statusText ?? "",
                  url: resp.finalUrl ?? url,
                  headers: resp.responseHeaders ?? "",
                  text: () => text,
                  json: () => JSON.parse(text)
                });
              });
            },
            onerror: (err) => {
              finishOnce(() => {
                const detail = err && typeof err === "object" ? err.error : "";
                reject(new Error(`gmFetch network error: ${detail || "unknown"} (url=${url})`));
              });
            },
            ontimeout: () => {
              finishOnce(() => reject(new Error(`gmFetch timeout after ${timeoutMs}ms: ${url}`)));
            },
            onabort: () => {
              finishOnce(() => reject(new Error(`gmFetch aborted: ${url}`)));
            }
          });
        });
      }
      function memeContentKey(s2) {
        return s2.replace(/[​-‍﻿]/g, "").replace(/\s+/gu, " ").trim().toLowerCase();
      }
      function normalizeCbBackendUrl(input) {
        const trimmed = input.trim().replace(/\/+$/, "");
        if (!trimmed) return "";
        let parsed;
        try {
          parsed = new URL(trimmed);
        } catch {
          return "";
        }
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
        if (parsed.protocol === "http:") {
          const host = parsed.hostname;
          const bare = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
          const isLoopback = bare === "localhost" || bare === "127.0.0.1" || bare === "::1";
          if (!isLoopback) return "";
        }
        return trimmed;
      }
      function getCbBackendBaseUrl() {
        const overrideRaw = cbBackendUrlOverride.value;
        const overrideOk = normalizeCbBackendUrl(overrideRaw);
        if (overrideOk) return overrideOk;
        return BASE_URL.CB_BACKEND.replace(/\/+$/, "");
      }
      const CB_MERGED_TTL_MS = 3e4;
      const mergedCache = new FetchCache();
      async function fetchCbMergedMemes(opts = {}) {
        const base = getCbBackendBaseUrl();
        if (!base) {
          return { items: [], sources: { laplace: false, sbhzm: false, cb: false }, fatal: true };
        }
        const params = new URLSearchParams();
        if (opts.roomId != null) params.set("roomId", String(opts.roomId));
        if (opts.sortBy) params.set("sortBy", opts.sortBy);
        if (opts.perPage) params.set("perPage", String(opts.perPage));
        if (opts.source) params.set("source", opts.source);
        const qs = params.toString();
        const url = `${base}/memes${qs ? `?${qs}` : ""}`;
        const key = url;
        try {
          return await mergedCache.get({
            key,
            ttlMs: CB_MERGED_TTL_MS,
            fetcher: async () => {
              let resp;
              try {
                resp = await gmFetch(url, {
                  method: "GET",
                  headers: { Accept: "application/json" },
                  timeoutMs: 1e4
                });
              } catch (err) {
                appendLog(`⚠️ chatterbox-cloud 网络错误:${err instanceof Error ? err.message : String(err)}`);
                throw err;
              }
              if (!resp.ok) {
                appendLog(`⚠️ chatterbox-cloud HTTP ${resp.status}`);
                throw new Error(`HTTP ${resp.status}`);
              }
              let body;
              try {
                body = resp.json();
              } catch (err) {
                appendLog(`⚠️ chatterbox-cloud JSON 解析失败:${err instanceof Error ? err.message : String(err)}`);
                throw err;
              }
              if (!Array.isArray(body.items)) {
                throw new Error("chatterbox-cloud 响应缺少 items");
              }
              const items = body.items.filter(
                (m2) => !!m2 && typeof m2.content === "string" && m2.content.trim().length > 0
              ).map((m2) => {
                const tag = m2._source === "laplace" || m2._source === "sbhzm" || m2._source === "cb" ? m2._source : "cb";
                return { ...m2, _source: tag };
              });
              return {
                items,
                sources: {
                  laplace: !!body.sources?.laplace,
                  sbhzm: !!body.sources?.sbhzm,
                  cb: !!body.sources?.cb
                },
                fatal: false
              };
            }
          });
        } catch {
          return { items: [], sources: { laplace: false, sbhzm: false, cb: false }, fatal: true };
        }
      }
      async function submitCbMeme(content, opts = {}) {
        const trimmed = content.trim();
        if (!trimmed) throw new Error("提交内容为空");
        const base = getCbBackendBaseUrl();
        if (!base) throw new Error("chatterbox-cloud 后端 URL 未配置");
        const body = { content: trimmed };
        if (opts.tagNames?.length) body.tagNames = opts.tagNames;
        if (typeof opts.roomId === "number") body.roomId = opts.roomId;
        if (typeof opts.uid === "number") body.uid = opts.uid;
        if (opts.username) body.username = opts.username;
        const resp = await gmFetch(`${base}/memes`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
          timeoutMs: 15e3
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.text().slice(0, 200)}`);
        }
        const json = resp.json();
        const id = typeof json.id === "number" ? json.id : Number(json.id);
        if (!Number.isFinite(id) || id <= 0) throw new Error("提交成功但响应里没有 id");
        const status = typeof json.status === "string" && ["pending", "approved", "rejected"].includes(json.status) ? json.status : "pending";
        return { id, status, dedup: !!json.dedup };
      }
      const SESSION_PUSHED_HASHES = new Set();
      const MIRROR_BATCH_SIZE = 200;
      async function mirrorToCbBackend(items, source) {
        if (!cbBackendEnabled.value) return;
        const base = getCbBackendBaseUrl();
        if (!base) return;
        const fresh = [];
        for (const m2 of items) {
          if (!m2?.content) continue;
          const key = memeContentKey(m2.content);
          if (!key || SESSION_PUSHED_HASHES.has(key)) continue;
          fresh.push(m2);
          SESSION_PUSHED_HASHES.add(key);
        }
        if (fresh.length === 0) return;
        const payload = fresh.map(({ _source, ...rest }) => rest);
        try {
          for (let i2 = 0; i2 < payload.length; i2 += MIRROR_BATCH_SIZE) {
            const batch = payload.slice(i2, i2 + MIRROR_BATCH_SIZE);
            const resp = await gmFetch(`${base}/memes/bulk-mirror`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ source, items: batch }),
              timeoutMs: 15e3
            });
            if (resp.status === 429) {
              appendLog("⚠️ chatterbox-cloud mirror 被限流,本会话稍后再推");
              break;
            }
          }
        } catch {
        }
      }
      const COPY_DEBOUNCE_MS = 800;
      let pendingCopies = [];
      let flushTimer = null;
      async function flushCopies() {
        flushTimer = null;
        const batch = pendingCopies;
        pendingCopies = [];
        if (batch.length === 0) return;
        const items = batch.map((p2) => p2.id);
        const base = getCbBackendBaseUrl();
        if (!base) {
          for (const p2 of batch) p2.resolve(null);
          return;
        }
        try {
          const resp = await gmFetch(`${base}/memes/copy/batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ items }),
            timeoutMs: 5e3
          });
          if (!resp.ok) {
            for (const p2 of batch) p2.resolve(null);
            return;
          }
          const json = resp.json();
          const byId = new Map();
          if (Array.isArray(json.results)) {
            for (const r2 of json.results) {
              if (typeof r2?.id === "number" && typeof r2.copyCount === "number") {
                byId.set(r2.id, r2.copyCount);
              }
            }
          }
          for (const p2 of batch) p2.resolve(byId.get(p2.id) ?? null);
        } catch {
          for (const p2 of batch) p2.resolve(null);
        }
      }
      async function reportCbMemeCopy(memeId) {
        if (memeId <= 0) return null;
        const base = getCbBackendBaseUrl();
        if (!base) return null;
        return new Promise((resolve) => {
          pendingCopies.push({ id: memeId, resolve });
          if (flushTimer === null) {
            flushTimer = setTimeout(() => void flushCopies(), COPY_DEBOUNCE_MS);
          }
        });
      }
      const TAGS_CACHE_TTL_MS$1 = 60 * 60 * 1e3;
      let tagsCache$1 = null;
      async function fetchCbTags() {
        if (tagsCache$1 && Date.now() - tagsCache$1.ts < TAGS_CACHE_TTL_MS$1) return tagsCache$1.data;
        const base = getCbBackendBaseUrl();
        if (!base) throw new Error("chatterbox-cloud 后端 URL 未配置");
        const resp = await gmFetch(`${base}/tags`, {
          method: "GET",
          headers: { Accept: "application/json" },
          timeoutMs: 1e4
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = resp.json();
        const tags = Array.isArray(json.items) ? json.items.filter((t2) => typeof t2?.name === "string" && t2.name.length > 0) : [];
        tagsCache$1 = { ts: Date.now(), data: tags };
        return tags;
      }
      async function suggestCbTagNames(content, source) {
        const matched = new Set();
        if (source?.keywordToTag) {
          for (const [pattern, tagName] of Object.entries(source.keywordToTag)) {
            try {
              if (new RegExp(pattern).test(content)) matched.add(tagName);
            } catch {
            }
          }
        }
        let tags;
        try {
          tags = await fetchCbTags();
        } catch {
          return [];
        }
        const allByName = new Map(tags.map((t2) => [t2.name, t2]));
        const fromKeywords = [...matched].filter((name) => allByName.has(name));
        if (fromKeywords.length > 0) return fromKeywords;
        const fromSubstring = [];
        for (const t2 of tags) {
          if (fromSubstring.length >= 3) break;
          if (t2.name.length >= 2 && content.includes(t2.name)) fromSubstring.push(t2.name);
        }
        return fromSubstring;
      }
      async function checkCbBackendHealth() {
        const base = getCbBackendBaseUrl();
        if (!base) return null;
        try {
          const resp = await gmFetch(`${base}/health`, {
            method: "GET",
            headers: { Accept: "application/json" },
            timeoutMs: 5e3
          });
          if (!resp.ok) return null;
          return resp.json();
        } catch {
          return null;
        }
      }
      async function probeAndUpdateCbBackendHealth() {
        cbBackendHealthState.value = "probing";
        cbBackendHealthDetail.value = "探测中…";
        const result = await checkCbBackendHealth();
        if (!result) {
          cbBackendHealthState.value = "fail";
          cbBackendHealthDetail.value = `不通: ${getCbBackendBaseUrl() || "(未配置)"}`;
          return null;
        }
        cbBackendHealthState.value = "ok";
        cbBackendHealthDetail.value = `phase=${result.phase} cb=${result.upstreams.cb}`;
        return result;
      }
      const CUSTOM_CHAT_REARM_OFF_DELAY_MS = 80;
      const CUSTOM_CHAT_REARM_ON_DELAY_MS = 160;
      const PANEL_STYLE = `
      #laplace-chatterbox-toggle,
      #laplace-chatterbox-dialog,
      #laplace-chatterbox-dialog * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
        font-size: 12px;
        letter-spacing: 0;
      }

      #laplace-chatterbox-toggle {
        appearance: none !important;
        border: 1px solid rgba(255, 255, 255, .42) !important;
        border-radius: 999px !important;
        min-height: 30px !important;
        padding: 0 12px !important;
        background: rgba(30, 30, 30, .78) !important;
        color: #fff !important;
        box-shadow: 0 10px 28px rgba(0, 0, 0, .22), inset 0 1px rgba(255, 255, 255, .22) !important;
        backdrop-filter: blur(18px) saturate(1.4);
        -webkit-backdrop-filter: blur(18px) saturate(1.4);
        transition: transform .2s ease, background .2s ease;
      }

      #laplace-chatterbox-toggle[data-sending="true"] {
        background: rgba(0, 186, 143, .88) !important;
      }

      #laplace-chatterbox-toggle[data-open="true"] {
        transform: scale(1.06);
      }

      #laplace-chatterbox-toggle:active {
        transform: scale(0.96);
      }

      #laplace-chatterbox-toggle:focus-visible {
        outline: 2px solid #0a84ff !important;
        outline-offset: 2px !important;
      }

      #laplace-chatterbox-dialog {
        color: #1d1d1f !important;
        background: rgba(248, 248, 250, .86) !important;
        border: 1px solid rgba(0, 0, 0, .08) !important;
        border-radius: 8px !important;
        box-shadow: 0 22px 60px rgba(0, 0, 0, .24), 0 1px 0 rgba(255,255,255,.72) inset !important;
        backdrop-filter: blur(26px) saturate(1.5);
        -webkit-backdrop-filter: blur(26px) saturate(1.5);
        scrollbar-width: thin;
      }

      #laplace-chatterbox-dialog .cb-scroll {
        padding: 8px !important;
      }

      #laplace-chatterbox-dialog details {
        margin: 0 0 5px !important;
        padding: 0 !important;
        border: 1px solid rgba(0, 0, 0, .08) !important;
        border-radius: 8px !important;
        background: rgba(252, 252, 253, .78) !important;
        box-shadow: 0 1px 0 rgba(255, 255, 255, .7) inset !important;
        overflow: hidden;
      }

      #laplace-chatterbox-dialog details[open] {
        background: rgba(255, 255, 255, .9) !important;
      }

      #laplace-chatterbox-dialog .cb-settings-accordion > .cb-section {
        margin: 0 !important;
        padding: 0 7px 7px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      #laplace-chatterbox-dialog .cb-settings-accordion[open] > .cb-section > .cb-heading,
      #laplace-chatterbox-dialog .cb-settings-accordion[open] > .cb-section > .cb-row:first-child > .cb-heading {
        display: none;
      }

      #laplace-chatterbox-dialog details > :not(summary):not(.cb-body) {
        margin-left: 10px;
        margin-right: 10px;
      }

      #laplace-chatterbox-dialog details > :last-child:not(summary) {
        margin-bottom: 10px;
      }

      #laplace-chatterbox-dialog summary {
        min-height: 30px;
        display: flex !important;
        align-items: center;
        gap: 6px;
        padding: 0 8px !important;
        color: #1d1d1f !important;
        list-style: none;
        font-weight: 650 !important;
        cursor: pointer;
        user-select: none;
      }

      /* Hide the default disclosure triangle on every engine.
       * Webkit/Blink expose it via the legacy ::-webkit-details-marker
       * pseudo, while Firefox treats <summary> as a list-item with a
       * ::marker -- list-style: none is the only cross-engine kill switch.
       */
      #laplace-chatterbox-dialog summary {
        list-style: none;
      }
      #laplace-chatterbox-dialog summary::-webkit-details-marker {
        display: none;
      }
      #laplace-chatterbox-dialog summary::marker {
        display: none;
      }

      #laplace-chatterbox-dialog summary::after {
        content: "";
        margin-left: auto;
        width: 10px;
        height: 10px;
        border-right: 2.5px solid #8e8e93;
        border-bottom: 2.5px solid #8e8e93;
        transform: rotate(-45deg);
        transition: transform .18s ease;
        flex-shrink: 0;
      }

      #laplace-chatterbox-dialog details[open] > summary::after {
        transform: rotate(135deg);
      }

      #laplace-chatterbox-dialog button,
      #laplace-chatterbox-dialog select,
      #laplace-chatterbox-dialog input,
      #laplace-chatterbox-dialog textarea {
        outline: none !important;
        font: inherit;
      }

      #laplace-chatterbox-dialog button {
        appearance: none !important;
        min-height: 26px !important;
        border: 1px solid rgba(0, 0, 0, .08) !important;
        border-radius: 8px !important;
        background: rgba(255, 255, 255, .9) !important;
        color: #1d1d1f !important;
        padding: 3px 9px !important;
        cursor: pointer !important;
        font-weight: 560 !important;
        line-height: 1.3 !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, .05) !important;
      }

      #laplace-chatterbox-dialog button:hover {
        background: #fff !important;
        border-color: rgba(0, 0, 0, .14) !important;
      }

      #laplace-chatterbox-dialog button:active {
        transform: translateY(1px);
      }

      #laplace-chatterbox-dialog button:disabled,
      #laplace-chatterbox-dialog input:disabled,
      #laplace-chatterbox-dialog select:disabled {
        opacity: .46;
        cursor: not-allowed !important;
      }

      #laplace-chatterbox-dialog input[type="text"],
      #laplace-chatterbox-dialog input[type="password"],
      #laplace-chatterbox-dialog input[type="number"],
      #laplace-chatterbox-dialog select,
      #laplace-chatterbox-dialog textarea {
        border: 1px solid rgba(0, 0, 0, .08) !important;
        border-radius: 8px !important;
        background: rgba(255, 255, 255, .86) !important;
        color: #1d1d1f !important;
        padding: 5px 8px !important;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, .035) !important;
      }

      #laplace-chatterbox-dialog input[type="number"] {
        text-align: center;
        width: 64px !important;
        min-width: 64px !important;
      }

      #laplace-chatterbox-dialog textarea {
        line-height: 1.45 !important;
      }

      #laplace-chatterbox-dialog input:focus,
      #laplace-chatterbox-dialog select:focus,
      #laplace-chatterbox-dialog textarea:focus {
        border-color: #007aff !important;
        box-shadow: 0 0 0 3px rgba(0, 122, 255, .16), inset 0 1px 2px rgba(0, 0, 0, .03) !important;
      }

      #laplace-chatterbox-dialog input[type="checkbox"] {
        appearance: none !important;
        width: 30px !important;
        height: 18px !important;
        flex: 0 0 30px;
        border: none !important;
        border-radius: 999px !important;
        background: #d1d1d6 !important;
        padding: 0 !important;
        position: relative;
        cursor: pointer;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .04) !important;
        transition: background .18s ease;
      }

      #laplace-chatterbox-dialog input[type="checkbox"]::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 2px rgba(0,0,0,.24);
        transition: transform .18s ease;
      }

      #laplace-chatterbox-dialog input[type="checkbox"]:checked {
        background: #34c759 !important;
      }

      #laplace-chatterbox-dialog input[type="checkbox"]:checked::after {
        transform: translateX(12px);
      }

      #laplace-chatterbox-dialog a {
        color: #007aff !important;
        text-decoration: none !important;
      }

      #laplace-chatterbox-dialog .cb-tabs {
        position: sticky;
        top: 0;
        z-index: 2;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
        padding: 7px;
        background: rgba(248, 248, 250, .9);
        backdrop-filter: blur(18px) saturate(1.4);
        -webkit-backdrop-filter: blur(18px) saturate(1.4);
        border-bottom: 1px solid rgba(0, 0, 0, .06);
      }

      #laplace-chatterbox-dialog .cb-tab {
        min-height: 28px !important;
        padding: 4px 0 !important;
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
        color: #6e6e73 !important;
      }

      #laplace-chatterbox-dialog .cb-tab[data-active="true"] {
        background: #fff !important;
        color: #1d1d1f !important;
        box-shadow: 0 1px 4px rgba(0, 0, 0, .08) !important;
      }

      #laplace-chatterbox-dialog button:focus-visible,
      #laplace-chatterbox-dialog input[type="checkbox"]:focus-visible,
      #laplace-chatterbox-dialog .cb-tab:focus-visible {
        outline: 2px solid #0a84ff !important;
        outline-offset: 2px !important;
      }

      #laplace-chatterbox-dialog .cb-primary {
        background: #007aff !important;
        color: #fff !important;
        border-color: #007aff !important;
      }

      #laplace-chatterbox-dialog .cb-danger {
        background: #ff3b30 !important;
        color: #fff !important;
        border-color: #ff3b30 !important;
      }

      #laplace-chatterbox-dialog .cb-soft {
        color: #6e6e73 !important;
      }

      #laplace-chatterbox-dialog .cb-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
      }

      #laplace-chatterbox-dialog .cb-stack {
        display: grid;
        gap: 6px;
      }

      #laplace-chatterbox-dialog .cb-body {
        padding: 0 9px 8px;
      }

      #laplace-chatterbox-dialog .cb-note {
        color: #6e6e73;
        font-size: 11px !important;
        line-height: 1.45;
      }

      #laplace-chatterbox-dialog .cb-label {
        color: #6e6e73;
        font-size: 11px !important;
        font-weight: 560;
      }

      #laplace-chatterbox-dialog .cb-panel {
        border: 1px solid rgba(0,0,0,.06);
        border-radius: 8px;
        background: rgba(248, 248, 250, .8);
        padding: 7px;
      }

      #laplace-chatterbox-dialog .cb-section {
        margin: 0 0 6px !important;
        padding: 7px !important;
        border: 1px solid rgba(0, 0, 0, .06) !important;
        border-radius: 8px !important;
        background: rgba(255, 255, 255, .72) !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, .04) !important;
      }

      #laplace-chatterbox-dialog .cb-heading {
        margin: 0 0 6px !important;
        color: #1d1d1f !important;
        font-weight: 650 !important;
      }

      #laplace-chatterbox-dialog .cb-empty {
        color: #8e8e93 !important;
        background: rgba(118, 118, 128, .08);
        border-radius: 8px;
        padding: 7px;
      }

      #laplace-chatterbox-dialog .cb-result {
        border: 1px solid rgba(0, 0, 0, .06) !important;
        border-radius: 8px !important;
        background: rgba(255, 255, 255, .82) !important;
        padding: 7px !important;
      }

      #laplace-chatterbox-dialog .cb-switch-row {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        min-height: 22px;
        line-height: 1.32;
      }

      #laplace-chatterbox-dialog .cb-setting-block {
        display: grid;
        gap: 5px;
        padding: 6px 0;
      }

      #laplace-chatterbox-dialog .cb-setting-block + .cb-setting-block {
        border-top: 1px solid rgba(0, 0, 0, .06);
      }

      #laplace-chatterbox-dialog .cb-setting-primary {
        padding: 6px 7px;
        border: 1px solid rgba(0, 0, 0, .055);
        border-left: 3px solid #007aff;
        border-radius: 8px;
        background: rgba(255, 255, 255, .68);
      }

      #laplace-chatterbox-dialog .cb-setting-row {
        justify-content: space-between;
        gap: 8px;
        min-height: 26px;
      }

      #laplace-chatterbox-dialog .cb-setting-row select {
        max-width: 178px;
        margin-left: auto;
      }

      #laplace-chatterbox-dialog .cb-setting-child[data-enabled="false"] {
        color: #8e8e93;
      }

      #laplace-chatterbox-dialog .cb-dependent-group {
        position: relative;
        margin-top: 1px;
        padding: 7px;
        border: 1px solid rgba(0, 0, 0, .055);
        border-left: 3px solid #34c759;
        border-radius: 8px;
        background: rgba(248, 248, 250, .7);
        transition: background .18s ease, border-color .18s ease, opacity .18s ease;
      }

      #laplace-chatterbox-dialog .cb-dependent-group[data-enabled="false"] {
        border-left-color: #c7c7cc;
        background: repeating-linear-gradient(
          -45deg,
          rgba(118, 118, 128, .06),
          rgba(118, 118, 128, .06) 6px,
          rgba(255, 255, 255, .52) 6px,
          rgba(255, 255, 255, .52) 12px
        );
      }

      #laplace-chatterbox-dialog .cb-dependent-group[data-enabled="false"]::before {
        content: attr(data-reason);
        justify-self: start;
        width: max-content;
        max-width: 100%;
        padding: 2px 6px;
        border-radius: 999px;
        background: rgba(118, 118, 128, .13);
        color: #6e6e73;
        font-size: 11px;
        font-weight: 620;
        line-height: 1.35;
      }

      #laplace-chatterbox-dialog .cb-accordion-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: auto;
      }

      #laplace-chatterbox-dialog .cb-module-summary::after {
        margin-left: 2px;
      }

      #laplace-chatterbox-dialog .cb-module-state {
        flex: 0 0 auto;
        min-width: 32px;
        padding: 1px 6px;
        border-radius: 999px;
        border: 1px solid rgba(0, 0, 0, .06);
        background: rgba(118, 118, 128, .1);
        color: #6e6e73;
        font-size: 10px !important;
        font-weight: 720;
        line-height: 1.45;
        text-align: center;
      }

      #laplace-chatterbox-dialog .cb-module-state[data-active="true"] {
        border-color: rgba(52, 199, 89, .28);
        background: rgba(52, 199, 89, .14);
        color: #0a7f55;
      }

      #laplace-chatterbox-dialog .cb-subdetails {
        margin: 0 !important;
        border-color: rgba(0, 0, 0, .05) !important;
        background: rgba(248, 248, 250, .56) !important;
        box-shadow: none !important;
      }

      #laplace-chatterbox-dialog .cb-segment {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        gap: 4px;
        padding: 3px;
        border-radius: 8px;
        background: rgba(118, 118, 128, .12);
      }

      #laplace-chatterbox-dialog .cb-segment button {
        box-shadow: none !important;
        border-color: transparent !important;
        background: transparent !important;
        min-width: 0;
      }

      #laplace-chatterbox-dialog .cb-segment button[aria-pressed="true"] {
        background: #fff !important;
        color: #1d1d1f !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, .12) !important;
      }

      #laplace-chatterbox-dialog .cb-status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        display: inline-block;
        background: currentColor;
      }

      #laplace-chatterbox-dialog .cb-list {
        display: grid;
        gap: 6px;
      }

      #laplace-chatterbox-dialog .cb-list-item {
        border-radius: 8px;
        background: rgba(255,255,255,.74);
        border: 1px solid rgba(0,0,0,.06);
        padding: 8px;
      }

      #laplace-chatterbox-dialog .cb-rule-list {
        display: grid;
        gap: 6px;
        max-height: 190px;
        overflow-y: auto;
      }

      #laplace-chatterbox-dialog .cb-rule-item {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 7px;
        align-items: center;
        border: 1px solid rgba(0,0,0,.06);
        border-radius: 8px;
        background: rgba(255,255,255,.7);
        padding: 7px;
      }

      #laplace-chatterbox-dialog .cb-rule-pair {
        min-width: 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
      }

      #laplace-chatterbox-dialog .cb-rule-pair code {
        display: block;
        min-height: 24px;
        padding: 4px 6px;
        border-radius: 6px;
        background: rgba(118, 118, 128, .08);
        color: #1d1d1f;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        white-space: normal;
        word-break: break-all;
      }

      #laplace-chatterbox-dialog .cb-rule-form,
      #laplace-chatterbox-dialog .cb-rule-room-form {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: 7px;
        align-items: end;
      }

      #laplace-chatterbox-dialog .cb-rule-form label,
      #laplace-chatterbox-dialog .cb-rule-room-form label {
        min-width: 0;
        display: grid;
        gap: 3px;
      }

      #laplace-chatterbox-dialog .cb-rule-form input,
      #laplace-chatterbox-dialog .cb-rule-room-form input,
      #laplace-chatterbox-dialog .cb-rule-room-form select {
        width: 100%;
        min-width: 0;
      }

      #laplace-chatterbox-dialog .cb-rule-room-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      #laplace-chatterbox-dialog .cb-rule-remove {
        color: #ff3b30 !important;
      }

      #laplace-chatterbox-dialog .cb-icon-button {
        width: 28px !important;
        min-width: 28px !important;
        padding: 0 !important;
      }

      #laplace-chatterbox-dialog .cb-tag {
        background: var(--cb-tag-bg, #8e8e93) !important;
        color: #fff !important;
        border: none !important;
        box-shadow: none !important;
        min-height: 20px !important;
        border-radius: 5px !important;
        padding: 0 6px !important;
      }

      #laplace-chatterbox-dialog .cb-emote[data-copied="true"] {
        background: #34c759 !important;
        color: #fff !important;
      }

      @media (max-width: 420px) {
        #laplace-chatterbox-dialog .cb-rule-item,
        #laplace-chatterbox-dialog .cb-rule-form,
        #laplace-chatterbox-dialog .cb-rule-room-form {
          grid-template-columns: 1fr;
        }
      }

      /*
       * Dark mode override. Bilibili Live rooms are typically very dark
       * (the player background is near-black), so the default white-glass
       * panel is jarring at night. Honor the OS preference and darken the
       * surface, text, and component backgrounds. Color semantics (primary
       * #007aff → #0a84ff, danger #ff3b30 → #ff453a, success #34c759 →
       * #30d158) match Apple's iOS dark variant so accents read correctly.
       */
      @media (prefers-color-scheme: dark) {
        #laplace-chatterbox-toggle {
          background: rgba(20, 20, 22, .82) !important;
          color: #f5f5f7 !important;
          border-color: rgba(255, 255, 255, .14) !important;
          box-shadow: 0 10px 28px rgba(0, 0, 0, .6), inset 0 1px rgba(255, 255, 255, .12) !important;
        }

        #laplace-chatterbox-dialog {
          color: #f5f5f7 !important;
          background: rgba(28, 28, 30, .9) !important;
          border-color: rgba(255, 255, 255, .12) !important;
          box-shadow: 0 22px 60px rgba(0, 0, 0, .72), 0 1px 0 rgba(255, 255, 255, .08) inset !important;
        }

        #laplace-chatterbox-dialog details {
          border-color: rgba(255, 255, 255, .08) !important;
          background: rgba(40, 40, 44, .68) !important;
          box-shadow: 0 1px 0 rgba(255, 255, 255, .04) inset !important;
        }

        #laplace-chatterbox-dialog details[open] {
          background: rgba(46, 46, 50, .82) !important;
        }

        #laplace-chatterbox-dialog summary {
          color: #f5f5f7 !important;
        }

        #laplace-chatterbox-dialog summary::after {
          border-right-color: #98989d;
          border-bottom-color: #98989d;
        }

        #laplace-chatterbox-dialog button {
          background: rgba(58, 58, 62, .9) !important;
          color: #f5f5f7 !important;
          border-color: rgba(255, 255, 255, .1) !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, .3) !important;
        }

        #laplace-chatterbox-dialog button:hover {
          background: rgba(72, 72, 76, .95) !important;
          border-color: rgba(255, 255, 255, .18) !important;
        }

        #laplace-chatterbox-dialog input[type="text"],
        #laplace-chatterbox-dialog input[type="password"],
        #laplace-chatterbox-dialog input[type="number"],
        #laplace-chatterbox-dialog input[type="search"],
        #laplace-chatterbox-dialog select,
        #laplace-chatterbox-dialog textarea {
          background: rgba(46, 46, 50, .9) !important;
          color: #f5f5f7 !important;
          border-color: rgba(255, 255, 255, .12) !important;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, .25) !important;
        }

        #laplace-chatterbox-dialog input:focus,
        #laplace-chatterbox-dialog select:focus,
        #laplace-chatterbox-dialog textarea:focus {
          border-color: #0a84ff !important;
          box-shadow: 0 0 0 3px rgba(10, 132, 255, .26), inset 0 1px 2px rgba(0, 0, 0, .25) !important;
        }

        #laplace-chatterbox-dialog input[type="checkbox"] {
          background: #48484a !important;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .06) !important;
        }

        #laplace-chatterbox-dialog input[type="checkbox"]:checked {
          background: #30d158 !important;
        }

        #laplace-chatterbox-dialog .cb-tabs {
          background: rgba(28, 28, 30, .92) !important;
          border-bottom-color: rgba(255, 255, 255, .08) !important;
        }

        #laplace-chatterbox-dialog .cb-tab {
          color: #98989d !important;
        }

        #laplace-chatterbox-dialog .cb-tab[data-active="true"] {
          background: rgba(72, 72, 76, .9) !important;
          color: #f5f5f7 !important;
          box-shadow: 0 1px 4px rgba(0, 0, 0, .35) !important;
        }

        #laplace-chatterbox-dialog .cb-primary {
          background: #0a84ff !important;
          color: #fff !important;
          border-color: #0a84ff !important;
        }

        #laplace-chatterbox-dialog .cb-danger {
          background: #ff453a !important;
          color: #fff !important;
          border-color: #ff453a !important;
        }

        #laplace-chatterbox-dialog .cb-soft,
        #laplace-chatterbox-dialog .cb-note,
        #laplace-chatterbox-dialog .cb-label {
          color: #98989d !important;
        }

        #laplace-chatterbox-dialog .cb-panel {
          background: rgba(40, 40, 44, .72) !important;
          border-color: rgba(255, 255, 255, .08) !important;
        }

        #laplace-chatterbox-dialog .cb-section {
          background: rgba(40, 40, 44, .58) !important;
          border-color: rgba(255, 255, 255, .08) !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, .25) !important;
        }

        #laplace-chatterbox-dialog .cb-heading {
          color: #f5f5f7 !important;
        }

        #laplace-chatterbox-dialog .cb-empty {
          color: #98989d !important;
          background: rgba(118, 118, 128, .18);
        }

        #laplace-chatterbox-dialog .cb-result {
          background: rgba(40, 40, 44, .72) !important;
          border-color: rgba(255, 255, 255, .08) !important;
        }

        #laplace-chatterbox-dialog .cb-segment {
          background: rgba(118, 118, 128, .26);
        }

        #laplace-chatterbox-dialog .cb-segment button[aria-pressed="true"] {
          background: rgba(72, 72, 76, .95) !important;
          color: #f5f5f7 !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, .4) !important;
        }

        #laplace-chatterbox-dialog .cb-rule-pair code {
          background: rgba(118, 118, 128, .22);
          color: #f5f5f7;
        }

        #laplace-chatterbox-dialog .cb-list-item {
          background: rgba(40, 40, 44, .72);
          border-color: rgba(255, 255, 255, .08);
        }

        #laplace-chatterbox-dialog .cb-setting-primary {
          background: rgba(40, 40, 44, .58);
          border-left-color: #0a84ff;
          border-color: rgba(255, 255, 255, .08);
        }

        #laplace-chatterbox-dialog .cb-dependent-group {
          background: rgba(40, 40, 44, .56);
          border-color: rgba(255, 255, 255, .08);
        }

        #laplace-chatterbox-dialog .cb-module-state {
          background: rgba(118, 118, 128, .22);
          color: #98989d;
          border-color: rgba(255, 255, 255, .06);
        }

        #laplace-chatterbox-dialog .cb-module-state[data-active="true"] {
          background: rgba(48, 209, 88, .22);
          color: #30d158;
          border-color: rgba(48, 209, 88, .32);
        }

        #laplace-chatterbox-dialog a {
          color: #0a84ff !important;
        }
      }
    `;
      function currentLiveRoomSlug() {
        try {
          return extractRoomNumber(window.location.href) ?? null;
        } catch {
          return null;
        }
      }
      function installPanelStyles() {
        if (typeof _GM_addStyle === "function") {
          _GM_addStyle(PANEL_STYLE);
          return () => {
          };
        }
        const style = document.createElement("style");
        style.textContent = PANEL_STYLE;
        (document.head || document.documentElement).appendChild(style);
        return () => style.remove();
      }
      function startCustomChatRoomRearm() {
        let disposed = false;
        let offTimer = null;
        let onTimer = null;
        let serial = 0;
        let lastRoomSlug = null;
        const clearTimers = () => {
          if (offTimer) {
            clearTimeout(offTimer);
            offTimer = null;
          }
          if (onTimer) {
            clearTimeout(onTimer);
            onTimer = null;
          }
        };
        const applyDesiredCustomChatDefaults = () => {
          customChatHideNative.value = false;
          customChatUseWs.value = true;
        };
        let rearming = false;
        const rearmCustomChat = () => {
          serial += 1;
          const runId = serial;
          clearTimers();
          rearming = true;
          applyDesiredCustomChatDefaults();
          customChatEnabled.value = true;
          offTimer = setTimeout(() => {
            if (disposed || runId !== serial) return;
            customChatEnabled.value = false;
          }, CUSTOM_CHAT_REARM_OFF_DELAY_MS);
          onTimer = setTimeout(() => {
            if (disposed || runId !== serial) return;
            applyDesiredCustomChatDefaults();
            customChatEnabled.value = true;
            rearming = false;
          }, CUSTOM_CHAT_REARM_ON_DELAY_MS);
        };
        const handleLocationMaybeChanged = (force = false) => {
          const roomSlug = currentLiveRoomSlug();
          if (!roomSlug) {
            lastRoomSlug = null;
            return;
          }
          if (!force && roomSlug === lastRoomSlug) return;
          lastRoomSlug = roomSlug;
          if (!customChatEnabled.value) return;
          rearmCustomChat();
        };
        let prevEnabled = customChatEnabled.peek();
        const stopEnabledWatcher = j$1(() => {
          const next = customChatEnabled.value;
          const wasEnabled = prevEnabled;
          prevEnabled = next;
          if (!wasEnabled && next && !rearming) {
            rearmCustomChat();
          }
        });
        const scheduleLocationCheck = () => {
          window.setTimeout(handleLocationMaybeChanged, 0);
        };
        const originalPushState = window.history.pushState.bind(window.history);
        const originalReplaceState = window.history.replaceState.bind(window.history);
        window.history.pushState = ((...args) => {
          originalPushState(...args);
          scheduleLocationCheck();
        });
        window.history.replaceState = ((...args) => {
          originalReplaceState(...args);
          scheduleLocationCheck();
        });
        window.addEventListener("popstate", handleLocationMaybeChanged);
        window.addEventListener("hashchange", handleLocationMaybeChanged);
        const roomWatcher = window.setInterval(handleLocationMaybeChanged, 1e3);
        handleLocationMaybeChanged(true);
        return () => {
          disposed = true;
          clearTimers();
          stopEnabledWatcher();
          window.history.pushState = originalPushState;
          window.history.replaceState = originalReplaceState;
          window.removeEventListener("popstate", handleLocationMaybeChanged);
          window.removeEventListener("hashchange", handleLocationMaybeChanged);
          clearInterval(roomWatcher);
        };
      }
      function installOptimizedLayoutStyle() {
        const stale = document.querySelector(".app-body");
        if (stale?.style.marginLeft === "1rem") stale.style.marginLeft = "";
        if (!optimizeLayout.value) return () => {
        };
        const style = document.createElement("style");
        style.textContent = ".app-body { margin-left: 1rem !important; }";
        document.head.appendChild(style);
        return () => style.remove();
      }
      function startCbBackendHealthProbe() {
        let lastBaseProbed = "";
        return j$1(() => {
          if (!cbBackendEnabled.value) {
            cbBackendHealthState.value = "idle";
            lastBaseProbed = "";
            return;
          }
          const currentBase = cbBackendUrlOverride.value.trim();
          if (currentBase === lastBaseProbed && cbBackendHealthState.peek() !== "idle") return;
          lastBaseProbed = currentBase;
          void probeAndUpdateCbBackendHealth();
        });
      }
      function isAutoBlendBlacklistedUid(uid) {
        return !!uid && uid in autoBlendUserBlacklist.value;
      }
      const subscribers = new Set();
      function emitAutoBlendEvent(event) {
        for (const subscriber of subscribers) {
          subscriber(event);
        }
      }
      function subscribeAutoBlendEvents(subscriber) {
        subscribers.add(subscriber);
        return () => subscribers.delete(subscriber);
      }
      function logAutoBlend(message, level, detail) {
        emitAutoBlendEvent({ kind: "log", level, message, detail });
      }
      function logAutoBlendSendResult(result, label, display) {
        emitAutoBlendEvent({ kind: "send-result", result, label, display });
      }
      subscribeAutoBlendEvents((event) => {
        if (event.kind === "send-result") {
          appendLog(event.result, event.label, event.display);
          return;
        }
        if (event.level) {
          notifyUser(event.level, event.message, event.detail);
          return;
        }
        appendLog(event.detail ? `${event.message}：${event.detail}` : event.message);
      });
      function formatAutoBlendSenderInfo(uniqueUsers, totalCount) {
        return uniqueUsers > 0 ? `${uniqueUsers} 人 / ${totalCount} 条` : `${totalCount} 条`;
      }
      function shortAutoBlendText(text) {
        return trimText(text, 18)[0] ?? text;
      }
      function formatAutoBlendStatus({
        enabled,
        dryRun,
        isSending: isSending2,
        cooldownUntil: cooldownUntil2,
        now
      }) {
        if (!enabled) return "已关闭";
        if (dryRun) return "试运行（不发送）";
        if (isSending2) return "正在跟车";
        const left = Math.max(0, Math.ceil((cooldownUntil2 - now) / 1e3));
        return left > 0 ? `冷却中 ${left}s` : "观察中";
      }
      function formatAutoBlendCandidate(candidates) {
        let best = null;
        for (const candidate of candidates) {
          if (candidate.totalCount < 2) continue;
          if (!best || candidate.totalCount > best.totalCount) best = candidate;
        }
        if (!best) return "暂无";
        return `${shortAutoBlendText(best.text)}（${formatAutoBlendSenderInfo(best.uniqueUsers, best.totalCount)}）`;
      }
      function detectTrend(events, windowMs, threshold) {
        const now = events.reduce((latest, event) => Math.max(latest, event.ts), 0);
        const windowStart = now - Math.max(0, windowMs);
        const entries = new Map();
        for (const event of events) {
          const text = event.text.trim();
          if (!text || event.ts < windowStart) continue;
          let entry = entries.get(text);
          if (!entry) {
            entry = { totalCount: 0, uids: new Set() };
            entries.set(text, entry);
          }
          entry.totalCount += 1;
          if (event.uid) entry.uids.add(event.uid);
        }
        const candidates = Array.from(entries, ([text, entry]) => ({
          text,
          totalCount: entry.totalCount,
          uniqueUsers: entry.uids.size
        })).sort((a2, b2) => b2.totalCount - a2.totalCount);
        const winner = candidates.find((candidate) => candidate.totalCount >= threshold) ?? null;
        return {
          shouldSend: winner !== null,
          text: winner?.text ?? null,
          candidates
        };
      }
      const MAX_PER_HOUR = 5;
      const MAX_CANDIDATES = 15;
      const MAX_SEEN = 200;
      const MIN_RECURRENCE_GAP_MS = 10 * 60 * 1e3;
      const SESSION_MAP_KEY = "memeSessionMapByRoom";
      const SESSION_MAP_MAX_AGE_MS = 2 * 60 * 60 * 1e3;
      function loadRoomSessionMaps() {
        const raw = _GM_getValue(SESSION_MAP_KEY, {});
        const now = Date.now();
        const out = new Map();
        for (const [roomKey, byText] of Object.entries(raw)) {
          const inner = new Map();
          for (const [text, timestamps] of Object.entries(byText)) {
            const last = timestamps.at(-1);
            if (last !== void 0 && now - last < SESSION_MAP_MAX_AGE_MS) {
              inner.set(text, timestamps);
            }
          }
          if (inner.size > 0) out.set(roomKey, inner);
        }
        return out;
      }
      function saveRoomSessionMaps() {
        const raw = {};
        for (const [roomKey, inner] of roomSessionMaps) {
          if (inner.size === 0) continue;
          const obj = {};
          for (const [text, timestamps] of inner) obj[text] = timestamps;
          raw[roomKey] = obj;
        }
        _GM_setValue(SESSION_MAP_KEY, raw);
      }
      function getOrCreateSessionMap(roomKey) {
        let m2 = roomSessionMaps.get(roomKey);
        if (!m2) {
          m2 = new Map();
          roomSessionMaps.set(roomKey, m2);
        }
        return m2;
      }
      const roomSessionMaps = loadRoomSessionMaps();
      const nominationTimestampsByRoom = new Map();
      function passesQualityFilter(text) {
        const len = text.length;
        if (len < 4 || len > 30) return false;
        if (/^\d+$/.test(text)) return false;
        if ([...text].every((c2) => c2 === text[0])) return false;
        if (/^[\p{P}\p{S}\s]+$/u.test(text)) return false;
        return true;
      }
      function recordMemeCandidate(text, roomId) {
        if (!enableMemeContribution.value) return;
        if (!passesQualityFilter(text)) return;
        const roomKey = String(roomId);
        const sessionMap = getOrCreateSessionMap(roomKey);
        const now = Date.now();
        const times = sessionMap.get(text) ?? [];
        times.push(now);
        sessionMap.set(text, times);
        saveRoomSessionMaps();
        if (times.length < 2) return;
        if (now - times[0] < MIN_RECURRENCE_GAP_MS) return;
        const seenForRoom = memeContributorSeenTextsByRoom.value[roomKey] ?? [];
        const candForRoom = memeContributorCandidatesByRoom.value[roomKey] ?? [];
        if (seenForRoom.includes(text)) return;
        if (candForRoom.includes(text)) return;
        const candidateKey = memeContentKey(text);
        if (candidateKey) {
          const libraryKeys = new Set(currentMemesList.value.map((m2) => memeContentKey(m2.content)));
          if (libraryKeys.has(candidateKey)) {
            const nextSeen2 = [...seenForRoom, text];
            memeContributorSeenTextsByRoom.value = {
              ...memeContributorSeenTextsByRoom.value,
              [roomKey]: nextSeen2.length > MAX_SEEN ? nextSeen2.slice(-MAX_SEEN) : nextSeen2
            };
            return;
          }
        }
        const stamps = nominationTimestampsByRoom.get(roomKey) ?? [];
        const oneHourAgo = now - 36e5;
        const recentCount = stamps.filter((t2) => t2 >= oneHourAgo).length;
        if (recentCount >= MAX_PER_HOUR) return;
        const nextCand = [...candForRoom, text];
        memeContributorCandidatesByRoom.value = {
          ...memeContributorCandidatesByRoom.value,
          [roomKey]: nextCand.length > MAX_CANDIDATES ? nextCand.slice(-MAX_CANDIDATES) : nextCand
        };
        const nextSeen = [...seenForRoom, text];
        memeContributorSeenTextsByRoom.value = {
          ...memeContributorSeenTextsByRoom.value,
          [roomKey]: nextSeen.length > MAX_SEEN ? nextSeen.slice(-MAX_SEEN) : nextSeen
        };
        stamps.push(now);
        nominationTimestampsByRoom.set(roomKey, stamps);
        appendLog(`[贡献者] 检测到高质量烂梗 "${text}"，已加入待贡献池`);
      }
      function ignoreMemeCandidate(text, roomId) {
        const roomKey = String(roomId);
        const candForRoom = memeContributorCandidatesByRoom.value[roomKey] ?? [];
        memeContributorCandidatesByRoom.value = {
          ...memeContributorCandidatesByRoom.value,
          [roomKey]: candForRoom.filter((c2) => c2 !== text)
        };
        const seenForRoom = memeContributorSeenTextsByRoom.value[roomKey] ?? [];
        if (!seenForRoom.includes(text)) {
          const nextSeen = [...seenForRoom, text];
          memeContributorSeenTextsByRoom.value = {
            ...memeContributorSeenTextsByRoom.value,
            [roomKey]: nextSeen.length > MAX_SEEN ? nextSeen.slice(-MAX_SEEN) : nextSeen
          };
        }
      }
      function clearMemeSession(roomId) {
        const roomKey = String(roomId);
        roomSessionMaps.delete(roomKey);
        saveRoomSessionMaps();
        nominationTimestampsByRoom.delete(roomKey);
      }
      const trendMap = new Map();
      let nextTrendPruneAt = Number.POSITIVE_INFINITY;
      let lastPruneWindowMs = 0;
      let cooldownUntil = 0;
      let unsubscribe$3 = null;
      let unsubscribeWsDanmaku = null;
      let cleanupTimer = null;
      let burstSettleTimer = null;
      let pendingBurstText = null;
      let routineTimeout = null;
      let routineActive = false;
      let myUid = null;
      let isSending = false;
      let rateLimitHitCount = 0;
      let firstRateLimitHitAt = 0;
      let moderationStopReason = null;
      let consecutiveSilentDrops = 0;
      const SILENT_DROP_CHECK_THRESHOLD = 3;
      const RATE_LIMIT_BACKOFF_MS = 2 * 60 * 1e3;
      function getBurstSettleMs() {
        return Math.max(0, autoBlendBurstSettleMs.value);
      }
      function getRateLimitWindowMs() {
        return Math.max(1, autoBlendRateLimitWindowMin.value) * 60 * 1e3;
      }
      function getRateLimitStopThreshold() {
        return Math.max(1, autoBlendRateLimitStopThreshold.value);
      }
      function getRateLimitWindowLabel() {
        return `${Math.max(1, autoBlendRateLimitWindowMin.value)} 分钟内`;
      }
      function clearPendingAutoBlend(reason) {
        if (burstSettleTimer) {
          clearTimeout(burstSettleTimer);
          burstSettleTimer = null;
        }
        pendingBurstText = null;
        trendMap.clear();
        nextTrendPruneAt = Number.POSITIVE_INFINITY;
        lastPruneWindowMs = 0;
        updateCandidateText();
        autoBlendLastActionText.value = reason;
      }
      function stopAutoBlendAfterModeration(reason) {
        moderationStopReason = reason;
        clearPendingAutoBlend(reason);
        autoBlendEnabled.value = false;
        logAutoBlend(reason, reason.startsWith("🔴") ? "error" : "warning");
      }
      function handleSendFailure(result, roomId) {
        const now = Date.now();
        const error = result.error;
        const duration = describeRestrictionDuration(result.error, result.errorData);
        const codeKind = classifyByCode(result.errorCode);
        if (codeKind === "muted" || codeKind === null && isMutedError(error)) {
          const risk = classifyRiskEvent(result.error, result.errorData);
          void syncGuardRoomRiskEvent({
            ...risk,
            source: "auto-blend",
            roomId,
            errorCode: result.errorCode,
            reason: result.error
          });
          stopAutoBlendAfterModeration(`🔴 自动跟车：检测到你在本房间被禁言，已自动关闭。禁言时长：${duration}。`);
          return true;
        }
        if (codeKind === "account" || codeKind === null && isAccountRestrictedError(error)) {
          const risk = classifyRiskEvent(result.error, result.errorData);
          void syncGuardRoomRiskEvent({
            ...risk,
            source: "auto-blend",
            roomId,
            errorCode: result.errorCode,
            reason: result.error
          });
          stopAutoBlendAfterModeration(`🔴 自动跟车：检测到账号级限制/风控，已自动关闭。限制时长：${duration}。`);
          return true;
        }
        const isRateLimit = codeKind === "rate-limit" || codeKind === null && isRateLimitError(error);
        if (!isRateLimit) {
          const risk = classifyRiskEvent(result.error, result.errorData);
          void syncGuardRoomRiskEvent({
            ...risk,
            source: "auto-blend",
            roomId,
            errorCode: result.errorCode,
            reason: result.error
          });
          return false;
        }
        if (now - firstRateLimitHitAt > getRateLimitWindowMs()) {
          firstRateLimitHitAt = now;
          rateLimitHitCount = 0;
        }
        rateLimitHitCount += 1;
        if (rateLimitHitCount >= getRateLimitStopThreshold()) {
          const windowLabel = getRateLimitWindowLabel();
          void syncGuardRoomRiskEvent({
            kind: "rate_limited",
            source: "auto-blend",
            level: "stop",
            roomId,
            errorCode: result.errorCode,
            reason: result.error,
            advice: `${windowLabel}多次触发频率限制，自动跟车已经停车，建议休息一阵再开。`
          });
          stopAutoBlendAfterModeration(
            `⚠️ 自动跟车：${windowLabel}多次触发发送频率限制，已自动关闭，避免继续被系统/房管盯上。`
          );
          return true;
        }
        void syncGuardRoomRiskEvent({
          kind: "rate_limited",
          source: "auto-blend",
          level: "observe",
          roomId,
          errorCode: result.errorCode,
          reason: result.error,
          advice: "触发发送频率限制，自动跟车会先歇 2 分钟。"
        });
        cooldownUntil = Math.max(cooldownUntil, now + RATE_LIMIT_BACKOFF_MS);
        clearPendingAutoBlend(
          `自动跟车：触发发送频率限制，已暂停 ${Math.round(RATE_LIMIT_BACKOFF_MS / 6e4)} 分钟并清空本轮候选。`
        );
        updateStatusText();
        return true;
      }
      function countUniqueUids(events) {
        const s2 = new Set();
        for (const e2 of events) if (e2.uid) s2.add(e2.uid);
        return s2.size;
      }
      function updateCandidateText() {
        autoBlendCandidateText.value = formatAutoBlendCandidate(
          Array.from(trendMap, ([text, entry]) => ({
            text,
            totalCount: entry.events.length,
            uniqueUsers: countUniqueUids(entry.events)
          }))
        );
      }
      function updateStatusText() {
        autoBlendStatusText.value = formatAutoBlendStatus({
          enabled: autoBlendEnabled.value,
          dryRun: autoBlendDryRun.value,
          isSending,
          cooldownUntil,
          now: Date.now()
        });
      }
      function pruneExpired(now, force = false) {
        const windowMs = autoBlendWindowSec.value * 1e3;
        if (!force && windowMs === lastPruneWindowMs && now < nextTrendPruneAt) return;
        lastPruneWindowMs = windowMs;
        let next = Number.POSITIVE_INFINITY;
        for (const [k2, entry] of trendMap) {
          entry.events = entry.events.filter((e2) => now - e2.ts <= windowMs);
          if (entry.events.length === 0) trendMap.delete(k2);
          else next = Math.min(next, entry.events[0].ts + windowMs + 1);
        }
        nextTrendPruneAt = next;
        updateCandidateText();
      }
      function getAutoBlendRepeatGapMs() {
        return Math.max(autoBlendCooldownSec.value * 1e3, msgSendInterval.value * 1e3, 1010);
      }
      function getAutoBlendBurstGapMs() {
        return Math.max(msgSendInterval.value * 1e3, 1010);
      }
      function meetsThreshold(entry) {
        if (entry.events.length < autoBlendThreshold.value) return false;
        if (autoBlendRequireDistinctUsers.value) {
          const uniqueUids = countUniqueUids(entry.events);
          const effectiveUnique = uniqueUids > 0 ? uniqueUids : entry.events.length;
          if (effectiveUnique < autoBlendMinDistinctUsers.value) return false;
        }
        return true;
      }
      function pickBestTrendingText(preferredText) {
        const windowMs = autoBlendWindowSec.value * 1e3;
        const events = [];
        for (const [text, entry] of trendMap) {
          if (!meetsThreshold(entry)) continue;
          for (const event of entry.events) events.push({ ...event, text });
        }
        const result = detectTrend(events, windowMs, autoBlendThreshold.value);
        if (!result.shouldSend) return null;
        if (preferredText && result.candidates.some((candidate) => candidate.text === preferredText)) return preferredText;
        return result.text;
      }
      function scheduleBurstSend(text) {
        pendingBurstText ??= text;
        if (burstSettleTimer !== null) return;
        burstSettleTimer = setTimeout(() => {
          burstSettleTimer = null;
          const preferredText = pendingBurstText;
          pendingBurstText = null;
          if (!autoBlendEnabled.value || isSending || Date.now() < cooldownUntil) {
            updateStatusText();
            return;
          }
          pruneExpired(Date.now());
          const chosen = pickBestTrendingText(preferredText);
          if (chosen !== null) void triggerSend(chosen, "burst");
        }, getBurstSettleMs());
      }
      function maybeScheduleBurstFromCurrentTrends() {
        if (!autoBlendEnabled.value || isSending || Date.now() < cooldownUntil || burstSettleTimer !== null) return;
        const chosen = pickBestTrendingText(pendingBurstText);
        if (chosen !== null) scheduleBurstSend(chosen);
      }
      function recordDanmaku(rawText, uid, isReply) {
        if (!autoBlendEnabled.value) return;
        const now = Date.now();
        updateStatusText();
        const text = rawText.trim();
        if (!text) return;
        if (isReply && !autoBlendIncludeReply.value) return;
        if (uid && myUid && uid === myUid) return;
        if (isAutoBlendBlacklistedUid(uid)) return;
        if (isLockedEmoticon(text)) return;
        pruneExpired(now);
        let entry = trendMap.get(text);
        if (!entry) {
          entry = { events: [] };
          trendMap.set(text, entry);
        }
        entry.events.push({ ts: now, uid });
        const expiresAt = now + autoBlendWindowSec.value * 1e3 + 1;
        if (expiresAt < nextTrendPruneAt) nextTrendPruneAt = expiresAt;
        updateCandidateText();
        if (now < cooldownUntil || isSending) return;
        if (meetsThreshold(entry)) scheduleBurstSend(text);
      }
      function scheduleNextRoutine() {
        routineTimeout = setTimeout(() => {
          routineTimerTick();
          if (routineActive) scheduleNextRoutine();
        }, autoBlendRoutineIntervalSec.value * 1e3);
      }
      function routineTimerTick() {
        if (!autoBlendEnabled.value) return;
        const now = Date.now();
        if (now < cooldownUntil) {
          updateStatusText();
          return;
        }
        updateStatusText();
        pruneExpired(now);
        const candidates = [];
        for (const [text, entry] of trendMap) {
          if (meetsThreshold(entry)) {
            candidates.push([text, entry.events.length]);
          }
        }
        if (candidates.length === 0) return;
        const totalWeight = candidates.reduce((s2, [, c2]) => s2 + c2, 0);
        let r2 = Math.random() * totalWeight;
        let chosen = candidates[candidates.length - 1][0];
        for (const [text, count] of candidates) {
          r2 -= count;
          if (r2 <= 0) {
            chosen = text;
            break;
          }
        }
        void triggerSend(chosen, "routine");
      }
      function collectBurst(triggeredText, reason) {
        if (reason !== "burst" || !autoBlendSendAllTrending.value) {
          const entry = trendMap.get(triggeredText);
          const uniqueUsers = entry ? countUniqueUids(entry.events) : 0;
          const totalCount = entry ? entry.events.length : 0;
          return [{ text: triggeredText, uniqueUsers, totalCount }];
        }
        const all = [];
        for (const [text, entry] of trendMap) {
          if (meetsThreshold(entry)) {
            all.push({ text, uniqueUsers: countUniqueUids(entry.events), totalCount: entry.events.length });
          }
        }
        all.sort((a2, b2) => {
          if (b2.totalCount !== a2.totalCount) return b2.totalCount - a2.totalCount;
          return a2.text === triggeredText ? -1 : 1;
        });
        return all.length > 0 ? all : [{ text: triggeredText, uniqueUsers: 0, totalCount: 0 }];
      }
      async function triggerSend(triggeredText, reason) {
        if (isSending) {
          if (reason === "routine") {
            const text = shortAutoBlendText(triggeredText);
            autoBlendLastActionText.value = `还在发，先跳过：${text}`;
            logAutoBlend(`自动跟车：还在发，先跳过补跟：${text}`);
          }
          return;
        }
        isSending = true;
        updateStatusText();
        pruneExpired(Date.now());
        const targets = collectBurst(triggeredText, reason);
        cooldownUntil = Date.now() + autoBlendCooldownSec.value * 1e3;
        for (const { text } of targets) trendMap.delete(text);
        updateCandidateText();
        updateStatusText();
        try {
          const csrfToken = getCsrfToken();
          if (!csrfToken) {
            autoBlendLastActionText.value = "未登录，跳过";
            logAutoBlend("自动跟车：没检测到登录态，先跳过", "warning");
            return;
          }
          const roomId = await ensureRoomId();
          const reasonLabel = reason === "burst" ? "刚刷起来" : "补跟";
          const isMulti = targets.length > 1;
          if (isMulti) {
            logAutoBlend(`自动跟车：同一波有 ${targets.length} 句话达标，开始依次跟`);
          }
          let memeRecorded = false;
          for (let ti = 0; ti < targets.length; ti++) {
            const { text: originalText, uniqueUsers, totalCount } = targets[ti];
            if (isLockedEmoticon(originalText)) {
              logAutoBlend(formatLockedEmoticonReject(originalText, "自动跟车(表情)"), "warning");
              continue;
            }
            const isEmote = isEmoticonUnique(originalText);
            const useReplacements = autoBlendUseReplacements.value && !isEmote;
            const replaced = useReplacements ? applyReplacements(originalText) : originalText;
            const wasReplaced = useReplacements && originalText !== replaced;
            if (isMulti) {
              logAutoBlend(`  - ${shortAutoBlendText(originalText)}（${formatAutoBlendSenderInfo(uniqueUsers, totalCount)}）`);
            }
            const repeatCount = reason === "burst" && autoBlendSendAllTrending.value ? 1 : Math.max(1, autoBlendSendCount.value);
            for (let i2 = 0; i2 < repeatCount; i2++) {
              let toSend = replaced;
              if (!isEmote && randomChar.value) toSend = addRandomCharacter(toSend);
              if (!isEmote) toSend = trimText(toSend, maxLength.value)[0] ?? toSend;
              if (!isEmote && randomColor.value) {
                await setRandomDanmakuColor(roomId, csrfToken);
              }
              const display = wasReplaced || toSend !== originalText ? `${originalText} → ${toSend}` : toSend;
              if (autoBlendDryRun.value) {
                autoBlendLastActionText.value = `试运行命中：${shortAutoBlendText(display)}`;
                logAutoBlend(`自动跟车试运行（未发送）：${display}`);
                continue;
              }
              const result = await enqueueDanmaku(toSend, roomId, csrfToken, SendPriority.AUTO);
              if (isMulti) {
                const label = repeatCount > 1 ? `自动跟车 [${i2 + 1}/${repeatCount}]` : "自动跟车";
                logAutoBlendSendResult(result, label, display);
                if (result.success && !result.cancelled) {
                  autoBlendLastActionText.value = `已跟车：${shortAutoBlendText(display)}`;
                } else if (result.cancelled) {
                  autoBlendLastActionText.value = `被手动发送打断：${shortAutoBlendText(display)}`;
                } else {
                  autoBlendLastActionText.value = `没发出去：${shortAutoBlendText(display)}`;
                }
              } else {
                const info = `${reasonLabel}，${formatAutoBlendSenderInfo(uniqueUsers, totalCount)}`;
                const repeatSuffix = repeatCount > 1 ? ` [${i2 + 1}/${repeatCount}]` : "";
                if (result.cancelled) {
                  autoBlendLastActionText.value = `被手动发送打断：${shortAutoBlendText(display)}`;
                  logAutoBlend(`自动跟车${repeatSuffix}：被手动发送打断：${display}`);
                } else if (result.success) {
                  autoBlendLastActionText.value = `已跟车：${shortAutoBlendText(display)}`;
                  logAutoBlend(`已跟车${repeatSuffix}（${info}）：${display}`);
                } else {
                  const error = formatDanmakuError(result.error);
                  autoBlendLastActionText.value = `没发出去：${shortAutoBlendText(display)}`;
                  logAutoBlend(`自动跟车没发出去${repeatSuffix}（${info}）：${display}，原因：${error}`, "error");
                }
              }
              if (result.success && !result.cancelled) {
                autoBlendLastActionText.value = `已提交，等待回显：${shortAutoBlendText(display)}`;
                const echoSource = await waitForSentEcho(toSend, myUid, result.startedAt ?? Date.now());
                if (echoSource === "ws" || echoSource === "dom") {
                  consecutiveSilentDrops = 0;
                  const sourceLabel = echoSource === "ws" ? "WS" : "DOM";
                  autoBlendLastActionText.value = `已${sourceLabel}回显：${shortAutoBlendText(display)}`;
                } else {
                  consecutiveSilentDrops++;
                  autoBlendLastActionText.value = `接口成功未见广播：${shortAutoBlendText(display)}`;
                  logAutoBlend(
                    `自动跟车接口成功，但 ${Math.round(SEND_ECHO_TIMEOUT_MS / 1e3)}s 内未看到广播回显：${display}`,
                    "warning"
                  );
                  if (consecutiveSilentDrops >= SILENT_DROP_CHECK_THRESHOLD) {
                    consecutiveSilentDrops = 0;
                    logAutoBlend("自动跟车：连续多次未见广播，正在巡检当前房间限制状态…");
                    try {
                      const signals = await checkSelfRoomRestrictions(roomId);
                      if (signals.length > 0) {
                        const desc = signals.map((s2) => `${s2.message}（${s2.duration}）`).join("；");
                        stopAutoBlendAfterModeration(`🔴 自动跟车：巡检发现限制，已自动关闭：${desc}`);
                        return;
                      }
                      logAutoBlend(
                        "自动跟车：巡检未发现明确禁言/限制，弹幕仍未广播。可能原因：该房间需要粉丝牌、发送频率过快、或账号存在风控。"
                      );
                    } catch {
                      logAutoBlend("自动跟车：巡检请求失败，无法确认限制原因。", "warning");
                    }
                  }
                }
              }
              if (!result.success && !result.cancelled && handleSendFailure(result, roomId)) return;
              if (result.success && !result.cancelled && !isEmote && !memeRecorded) {
                memeRecorded = true;
                recordMemeCandidate(originalText, roomId);
              }
              cooldownUntil = Math.max(cooldownUntil, Date.now() + autoBlendCooldownSec.value * 1e3);
              updateStatusText();
              if (i2 < repeatCount - 1) {
                const interval = getAutoBlendRepeatGapMs();
                const offset = randomInterval.value ? Math.floor(Math.random() * 500) : 0;
                await new Promise((r2) => setTimeout(r2, interval + offset));
              }
            }
            if (isMulti && ti < targets.length - 1) {
              await new Promise((r2) => setTimeout(r2, getAutoBlendBurstGapMs()));
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          autoBlendLastActionText.value = `出错：${msg}`;
          logAutoBlend("自动跟车出错", "error", msg);
        } finally {
          isSending = false;
          updateStatusText();
        }
      }
      function startAutoBlend() {
        if (unsubscribe$3) return;
        myUid = getDedeUid() ?? null;
        rateLimitHitCount = 0;
        firstRateLimitHitAt = 0;
        moderationStopReason = null;
        consecutiveSilentDrops = 0;
        nextTrendPruneAt = Number.POSITIVE_INFINITY;
        lastPruneWindowMs = 0;
        autoBlendStatusText.value = "观察中";
        autoBlendCandidateText.value = "暂无";
        autoBlendLastActionText.value = "暂无";
        unsubscribe$3 = subscribeDanmaku({
          onMessage: (ev) => recordDanmaku(ev.text, ev.uid, ev.isReply)
        });
        startLiveWsSource();
        unsubscribeWsDanmaku = subscribeCustomChatEvents((event) => {
          if (event.kind !== "danmaku" || event.source !== "ws") return;
          recordDanmaku(event.text, event.uid, event.isReply);
        });
        if (cleanupTimer === null) {
          cleanupTimer = setInterval(() => {
            if (trendMap.size === 0) return;
            pruneExpired(Date.now());
            updateStatusText();
            maybeScheduleBurstFromCurrentTrends();
          }, 1e3);
        }
        routineActive = true;
        scheduleNextRoutine();
      }
      function stopAutoBlend() {
        if (cleanupTimer) {
          clearInterval(cleanupTimer);
          cleanupTimer = null;
        }
        routineActive = false;
        if (routineTimeout) {
          clearTimeout(routineTimeout);
          routineTimeout = null;
        }
        if (burstSettleTimer) {
          clearTimeout(burstSettleTimer);
          burstSettleTimer = null;
        }
        pendingBurstText = null;
        if (unsubscribe$3) {
          unsubscribe$3();
          unsubscribe$3 = null;
        }
        if (unsubscribeWsDanmaku) {
          unsubscribeWsDanmaku();
          unsubscribeWsDanmaku = null;
        }
        stopLiveWsSource();
        trendMap.clear();
        nextTrendPruneAt = Number.POSITIVE_INFINITY;
        lastPruneWindowMs = 0;
        const currentRoomId = cachedRoomId.peek();
        if (currentRoomId !== null) clearMemeSession(currentRoomId);
        cooldownUntil = 0;
        autoBlendStatusText.value = "已关闭";
        autoBlendCandidateText.value = "暂无";
        autoBlendLastActionText.value = moderationStopReason ?? "暂无";
        moderationStopReason = null;
      }
      let emoticonCacheSource = null;
      let emoticonCache = new Map();
      let emoticonFirstCharCache = new Map();
      function normalizeEmoticonTokens(...values) {
        const tokens = new Set();
        const add = (value) => {
          const token = (value ?? "").trim();
          if (!token) return;
          const bracketMatch = token.match(/^[[\u3010](.*?)[\]\u3011]$/u);
          const core = (bracketMatch?.[1] ?? token).trim();
          if (!core) return;
          tokens.add(`[${core}]`);
          tokens.add(`【${core}】`);
        };
        for (const value of values) add(value);
        return [...tokens];
      }
      function rebuildEmoticonCache() {
        const packages = cachedEmoticonPackages.value;
        if (packages === emoticonCacheSource) return;
        emoticonCacheSource = packages;
        emoticonCache = new Map();
        emoticonFirstCharCache = new Map();
        for (const pkg of packages) {
          for (const emoticon of pkg.emoticons) {
            const entries = normalizeEmoticonTokens(emoticon.emoticon_unique, emoticon.emoji, emoticon.descript);
            for (const token of entries) {
              if (!token || emoticonCache.has(token)) continue;
              emoticonCache.set(token, {
                url: emoticon.url,
                alt: emoticon.descript || emoticon.emoji || emoticon.emoticon_unique || token
              });
            }
          }
        }
        const tokens = [...emoticonCache.keys()].sort((a2, b2) => b2.length - a2.length);
        for (const token of tokens) {
          const firstChar = token[0];
          if (!firstChar) continue;
          const list = emoticonFirstCharCache.get(firstChar);
          if (list) list.push(token);
          else emoticonFirstCharCache.set(firstChar, [token]);
        }
      }
      function matchingEmoticonToken(text, start) {
        rebuildEmoticonCache();
        const candidates = emoticonFirstCharCache.get(text[start] ?? "");
        if (!candidates) return null;
        for (const token of candidates) {
          if (text.startsWith(token, start)) return token;
        }
        return null;
      }
      function setChatText(el, text) {
        if (!text) {
          el.replaceChildren();
          return;
        }
        const fragment = document.createDocumentFragment();
        let cursor = 0;
        let buffer = "";
        while (cursor < text.length) {
          const token = matchingEmoticonToken(text, cursor);
          if (!token) {
            buffer += text[cursor];
            cursor += 1;
            continue;
          }
          if (buffer) {
            fragment.append(buffer);
            buffer = "";
          }
          const emoticon = emoticonCache.get(token);
          if (!emoticon?.url) {
            buffer += token;
            cursor += token.length;
            continue;
          }
          const img = document.createElement("img");
          img.className = "lc-chat-emote";
          img.src = emoticon.url;
          img.alt = emoticon.alt || token;
          img.title = emoticon.alt || token;
          img.loading = "lazy";
          img.decoding = "async";
          fragment.append(img);
          cursor += token.length;
        }
        if (buffer) fragment.append(buffer);
        el.replaceChildren(fragment);
      }
      function prepareChatButton(button, title) {
        button.type = "button";
        button.title = title;
        button.setAttribute("aria-label", title);
      }
      function normalizeWheelDelta(event) {
        const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 180 : 1;
        const delta = event.deltaY * unit;
        if (!Number.isFinite(delta) || delta === 0) return 0;
        return Math.max(-140, Math.min(140, delta));
      }
      const NATIVE_EVENT_SELECTOR = '.chat-item, .super-chat-card, .gift-item, [class*="super"], [class*="gift"], [class*="guard"], [class*="privilege"]';
      const NATIVE_HEALTH_WINDOW = 12e3;
      const NATIVE_HEALTH_MIN_SCANS = 24;
      const NATIVE_HEALTH_MAX_EVENTS = 0;
      const MAX_NATIVE_SCAN_BATCH = 48;
      const MAX_NATIVE_INITIAL_SCAN = 80;
      const NATIVE_SCAN_DEBOUNCE_MS = 16;
      function shouldScanNativeEventNode(node, rootId) {
        if (node.closest(`#${rootId}`)) return false;
        if (node.classList.contains("danmaku-item")) return false;
        return node.matches(NATIVE_EVENT_SELECTOR) || !!node.querySelector(NATIVE_EVENT_SELECTOR);
      }
      function compactText(value) {
        return value.replace(/\s+/g, " ").trim();
      }
      function parseBadgeLevel(raw) {
        const text = compactText(raw);
        const match = text.match(/^(?:UL|LV)\s*(\d{1,3})$/i) ?? text.match(/^用户等级[:：]?\s*(\d{1,3})$/);
        if (!match) return null;
        const value = Number(match[1]);
        return Number.isFinite(value) && value >= 0 ? value : null;
      }
      function formatBadgeLevel(level) {
        return `LV${Math.max(0, Math.trunc(level))}`;
      }
      function cleanDisplayName(value) {
        return compactText(value).replace(/\s*[：:]\s*$/, "");
      }
      function isBadDisplayName(value) {
        return !value || /通过活动|查看我的装扮|获得|装扮|荣耀|粉丝牌|用户等级|头像|复制|举报|回复|关闭/.test(value);
      }
      function usefulBadgeText(raw, uname) {
        const level = parseBadgeLevel(raw);
        const text = level === null ? compactText(raw).replace(/^粉丝牌[:：]?/, "").replace(/^荣耀[:：]?/, "").replace(/^用户等级[:：]?/, "") : formatBadgeLevel(level);
        if (!text || text.length > 16) return null;
        if (/这是\s*TA\s*的|TA 的|TA的|荣耀|粉丝|复制|举报|回复|关闭|头像/.test(text)) return null;
        if (uname && (text === uname || text.startsWith(`${uname} `) || text.startsWith(`${uname}　`))) return null;
        return text;
      }
      function isNoiseEventText(text) {
        const clean = compactText(text);
        if (!clean) return true;
        if (/^(头像|匿名|复制|举报|回复|关闭|更多|展开|收起|弹幕|礼物|SC|进场|通知|暂停|清屏|状态|显示)$/.test(clean))
          return true;
        if (/^搜索\s*user:/.test(clean)) return true;
        return false;
      }
      function resolveAvatarUrl(uid) {
        return uid ? `${BASE_URL.BILIBILI_AVATAR}/${uid}?size=96` : void 0;
      }
      function nodeText(node) {
        return compactText(node.textContent ?? "");
      }
      function attrText(node, attr) {
        const value = node.getAttribute(attr);
        return value ? compactText(value) : null;
      }
      function nativeUid(node) {
        const direct = attrText(node, "data-uid") ?? node.querySelector("[data-uid]")?.getAttribute("data-uid");
        if (direct) return direct;
        const link = node.querySelector('a[href*="space.bilibili.com"], a[href*="uid="]');
        const href = link?.href ?? "";
        return href.match(/space\.bilibili\.com\/(\d+)/)?.[1] ?? href.match(/[?&]uid=(\d+)/)?.[1] ?? null;
      }
      function nativeUname(node, text) {
        const selectors = ["[data-uname]", ".user-name", ".username", ".name", '[class*="user-name"]', '[class*="username"]'];
        for (const selector of selectors) {
          const el = node.querySelector(selector);
          const value = el?.getAttribute("data-uname") ?? el?.getAttribute("title") ?? el?.textContent;
          const clean = cleanDisplayName(value ?? "");
          if (clean && clean !== text && clean.length <= 32 && !isBadDisplayName(clean)) return clean;
        }
        return "匿名";
      }
      function nativeAvatar(node) {
        for (const img of node.querySelectorAll("img")) {
          const src = img.currentSrc || img.src || img.getAttribute("data-src") || img.getAttribute("src");
          if (!src) continue;
          const label = `${img.className} ${img.alt}`.toLowerCase();
          if (label.includes("avatar") || label.includes("face") || label.includes("head") || label.includes("头像"))
            return src;
        }
        return void 0;
      }
      function nativeKind(node, text) {
        const signal = `${node.className} ${text}`;
        if (/super[-_ ]?chat|superchat|醒目留言|醒目|￥|¥|\bSC\b/i.test(signal)) return "superchat";
        if (/舰长|提督|总督|大航海|guard|privilege|开通|续费/i.test(signal)) return "guard";
        if (/红包|red[-_ ]?envelop/i.test(signal)) return "redpacket";
        if (/天选|lottery|抽奖/i.test(signal)) return "lottery";
        if (/关注|follow/i.test(signal)) return "follow";
        if (/点赞|like/i.test(signal)) return "like";
        if (/分享|share/i.test(signal)) return "share";
        if (/gift|礼物|赠送|投喂|送出|小花花|辣条|电池|x\s*\d+/i.test(signal)) return "gift";
        return null;
      }
      function nativeBadges(node, text, uname) {
        const badges = [];
        for (const el of node.querySelectorAll(
          '[title], [aria-label], [class*="medal"], [class*="guard"], [class*="level"]'
        )) {
          const raw = el.getAttribute("title") ?? el.getAttribute("aria-label") ?? el.textContent ?? "";
          const clean = usefulBadgeText(raw, uname);
          if (!clean || clean === text || badges.includes(clean)) continue;
          badges.push(clean);
          if (badges.length >= 3) break;
        }
        if (/总督/i.test(text)) badges.unshift("GUARD 1");
        else if (/提督/i.test(text)) badges.unshift("GUARD 2");
        else if (/舰长/i.test(text)) badges.unshift("GUARD 3");
        return [...new Set(badges)];
      }
      function parseNativeEvent(node, ctx) {
        if (node.classList.contains("danmaku-item")) return null;
        if (node.closest(`#${ctx.rootId}`)) return null;
        const text = nodeText(node);
        if (isNoiseEventText(text) || text.length < 2) return null;
        const kind = nativeKind(node, text);
        if (!kind) return null;
        const uname = nativeUname(node, text);
        const uid = nativeUid(node);
        const badges = nativeBadges(node, text, uname);
        const avatar = nativeAvatar(node) || resolveAvatarUrl(uid);
        if (uname === "匿名" && !uid && !avatar && text.length <= 4) return null;
        const giftMatch = kind === "gift" ? text.match(/([\p{Script=Han}\w·・ぁ-んァ-ンー\s]+?)\s*x\s*(\d+)/iu) : null;
        const fields = [];
        if (kind === "gift" && giftMatch) {
          fields.push({ key: "gift-name", label: "礼物", value: compactText(giftMatch[1]), kind: "text" });
          fields.push({ key: "gift-count", label: "数量", value: `x${giftMatch[2]}`, kind: "count" });
        }
        if (kind === "guard") {
          const guard = /总督/.test(text) ? "总督" : /提督/.test(text) ? "提督" : "舰长";
          fields.push({ key: "guard-level", label: "等级", value: guard, kind: "level" });
          const month = text.match(/(\d+)\s*(个月|月)/)?.[1];
          if (month) fields.push({ key: "guard-months", label: "月份", value: `${month}个月`, kind: "duration" });
        }
        return {
          id: ctx.nextId(),
          kind,
          text,
          sendText: kind === "superchat" ? text : void 0,
          uname,
          uid,
          time: chatEventTime(),
          isReply: false,
          source: "dom",
          badges,
          avatarUrl: avatar,
          fields
        };
      }
      function isNativeDomUnhealthy(samples, minScans, maxEvents) {
        if (samples.length < minScans) return false;
        return samples.filter((s2) => s2.parsed).length <= maxEvents;
      }
      const CUSTOM_CHAT_MAX_MESSAGES = 220;
      const CUSTOM_CHAT_MAX_RENDER_BATCH = 36;
      const CUSTOM_CHAT_MAX_RENDER_QUEUE = CUSTOM_CHAT_MAX_MESSAGES;
      function trimRenderQueue(queue2) {
        if (queue2.length > CUSTOM_CHAT_MAX_RENDER_QUEUE) {
          queue2.splice(0, queue2.length - CUSTOM_CHAT_MAX_RENDER_QUEUE);
        }
      }
      function takeRenderBatch(queue2) {
        return queue2.splice(0, CUSTOM_CHAT_MAX_RENDER_BATCH);
      }
      function shouldAnimateRenderBatch(batchSize) {
        return batchSize <= 12;
      }
      function customChatBadgeType(raw) {
        const value = raw.trim();
        if (!value) return "other";
        if (/GUARD|privilege|guard/i.test(value) || /[\u603b\u63d0\u8230][\u7763\u957f]|\u8230\u961f/.test(value))
          return "guard";
        if (/^\s*(?:UL|LV)\s*\d+/i.test(value)) return "ul";
        if (/[\u623f\u7ba1]/.test(value) || /admin|moderator/i.test(value)) return "admin";
        if (/[\u699c]\s*[123]|top\s*[123]|rank\s*[123]/i.test(value)) return "rank";
        if (/[\u8363\u8000]/.test(value) || /honou?r/i.test(value)) return "honor";
        if (/SC\s*\d+|^\d+(?:\.\d+)?\s*[\u5143]|[¥$]\s*\d+(?:\.\d+)?/i.test(value)) return "price";
        if (/[^\s]\s+\d{1,3}$/.test(value)) return "medal";
        return "other";
      }
      function shouldSuppressCustomChatEvent(event) {
        return event.kind === "enter";
      }
      function customChatPriority(event) {
        if (event.kind === "superchat" || event.kind === "guard") return "critical";
        if (event.kind === "gift" || event.kind === "redpacket" || event.kind === "lottery") return "card";
        if (event.kind === "enter" || event.kind === "follow" || event.kind === "like" || event.kind === "share")
          return "lite";
        if (event.kind === "notice" || event.kind === "system") return "lite";
        if (event.badges.some((badge) => customChatBadgeType(badge) !== "other")) return "identity";
        return "message";
      }
      function visibleRenderMessages(messages2, matches) {
        return messages2.filter(matches).slice(-CUSTOM_CHAT_MAX_MESSAGES);
      }
      const CUSTOM_CHAT_SEARCH_KEYS = new Set(["user", "name", "from", "uid", "text", "msg", "kind", "type", "source", "is"]);
      const CUSTOM_CHAT_SEARCH_KINDS = [
        "danmaku",
        "gift",
        "superchat",
        "guard",
        "redpacket",
        "lottery",
        "enter",
        "follow",
        "like",
        "share",
        "notice",
        "system"
      ];
      function kindLabel(kind) {
        if (kind === "danmaku") return "弹幕";
        if (kind === "gift") return "礼物";
        if (kind === "superchat") return "SC";
        if (kind === "guard") return "舰队";
        if (kind === "redpacket") return "红包";
        if (kind === "lottery") return "天选";
        if (kind === "enter") return "进场";
        if (kind === "follow") return "关注";
        if (kind === "like") return "点赞";
        if (kind === "share") return "分享";
        if (kind === "notice") return "通知";
        if (kind === "system") return "系统";
        return kind;
      }
      function customChatSearchHint(query) {
        for (const token of splitQuery(query)) {
          const normalized = token.startsWith("-") ? token.slice(1).trim() : token.trim();
          const colon = normalized.indexOf(":");
          if (colon <= 0 || normalized.includes("://")) continue;
          const key = normalized.slice(0, colon).toLowerCase();
          const value = normalized.slice(colon + 1).trim().toLowerCase();
          if (!isSearchFilterKey(key)) {
            const suggestion = closestSearchSuggestion(key, [...CUSTOM_CHAT_SEARCH_KEYS]);
            return suggestion ? `不认识 ${key}: 条件，试试 ${suggestion}:` : "不认识这个搜索条件";
          }
          if ((key === "kind" || key === "type") && value && !matchesKnownKind(value)) {
            const suggestion = closestSearchSuggestion(value, CUSTOM_CHAT_SEARCH_KINDS);
            return suggestion ? `没有这种类型，试试 kind:${suggestion}` : "没有这种消息类型";
          }
        }
        return "";
      }
      function messageMatchesCustomChatSearch(message, query, isKindVisible) {
        if (!isKindVisible(message.kind)) return false;
        const tokens = splitQuery(query);
        for (const rawToken of tokens) {
          const negative = rawToken.startsWith("-");
          const token = negative ? rawToken.slice(1) : rawToken;
          const matched = tokenMatches(message, token);
          if (negative ? matched : !matched) return false;
        }
        return true;
      }
      function splitQuery(query) {
        return query.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((token) => token.replace(/^"|"$/g, "").trim()).filter(Boolean) ?? [];
      }
      function isSearchFilterKey(key) {
        return /^[a-z][a-z-]*$/i.test(key) && CUSTOM_CHAT_SEARCH_KEYS.has(key);
      }
      function includesFolded(value, needle) {
        return value.toLowerCase().includes(needle.toLowerCase());
      }
      function matchesKnownKind(value) {
        return CUSTOM_CHAT_SEARCH_KINDS.some((kind) => includesFolded(kind, value) || includesFolded(kindLabel(kind), value));
      }
      function levenshteinDistance(a2, b2) {
        const previous = Array.from({ length: b2.length + 1 }, (_2, index) => index);
        const current = Array.from({ length: b2.length + 1 }, () => 0);
        for (let i2 = 1; i2 <= a2.length; i2++) {
          current[0] = i2;
          for (let j2 = 1; j2 <= b2.length; j2++) {
            current[j2] = a2[i2 - 1] === b2[j2 - 1] ? previous[j2 - 1] : Math.min(previous[j2 - 1] + 1, previous[j2] + 1, current[j2 - 1] + 1);
          }
          previous.splice(0, previous.length, ...current);
        }
        return previous[b2.length];
      }
      function closestSearchSuggestion(value, candidates) {
        const suggestion = candidates.map((candidate) => ({ value: candidate, distance: levenshteinDistance(value, candidate.toLowerCase()) })).sort((a2, b2) => a2.distance - b2.distance)[0];
        return suggestion && suggestion.distance <= 3 ? suggestion.value : null;
      }
      function tokenMatches(message, token) {
        const normalized = token.trim();
        if (!normalized) return true;
        const colon = normalized.indexOf(":");
        if (colon > 0) {
          const key = normalized.slice(0, colon).toLowerCase();
          const value = normalized.slice(colon + 1);
          if (key === "user" || key === "name" || key === "from") return includesFolded(message.uname, value);
          if (key === "uid") return includesFolded(message.uid ?? "", value);
          if (key === "text" || key === "msg") return includesFolded(message.text, value);
          if (key === "kind" || key === "type")
            return includesFolded(message.kind, value) || includesFolded(kindLabel(message.kind), value);
          if (key === "source") return includesFolded(message.source, value);
          if (key === "is") return value.toLowerCase() === "reply" ? message.isReply : false;
        }
        return includesFolded(message.text, normalized) || includesFolded(message.uname, normalized);
      }
      const ROOT_ID$1 = "laplace-custom-chat";
      const CUSTOM_CHAT_STYLE = `
#${ROOT_ID$1}, #${ROOT_ID$1} * {
  box-sizing: border-box;
  font-family: var(--lc-chat-font, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif);
  letter-spacing: 0;
}
#${ROOT_ID$1} {
  --lc-chat-bg: #f5f5f7;
  --lc-chat-panel: rgba(255, 255, 255, .84);
  --lc-chat-border: rgba(60, 60, 67, .12);
  --lc-chat-text: #111;
  --lc-chat-muted: #6e6e73;
  --lc-chat-name: #007aff;
  --lc-chat-bubble: #ffffff;
  --lc-chat-bubble-text: #111;
  --lc-chat-own: #007aff;
  --lc-chat-own-text: #fff;
  --lc-chat-chip: rgba(118, 118, 128, .14);
  --lc-chat-chip-text: #1d1d1f;
  --lc-chat-accent: #34c759;
  --lc-chat-shadow: rgba(0, 0, 0, .10);
  --lc-chat-bubble-shadow: 0 1px 1px rgba(0, 0, 0, .035), 0 8px 22px rgba(0, 0, 0, .075);
  --lc-chat-lite: rgba(118, 118, 128, .12);
  --lc-chat-lite-text: #5f6368;
  --lc-chat-medal-bg: #fff0b8;
  --lc-chat-medal-text: #5c4210;
  --lc-chat-guard-bg: #dceaff;
  --lc-chat-guard-text: #184a8b;
  --lc-chat-admin-bg: #d7ecff;
  --lc-chat-admin-text: #0057a8;
  --lc-chat-rank-bg: #ffe6a8;
  --lc-chat-rank-text: #6a4300;
  --lc-chat-ul-bg: #e8e5ff;
  --lc-chat-ul-text: #473a8d;
  --lc-chat-honor-bg: #e8f8ef;
  --lc-chat-honor-text: #19643a;
  --lc-chat-price-bg: #ffe2cf;
  --lc-chat-price-text: #7f3516;
  height: 100%;
  width: 100%;
  min-width: 0;
  min-height: 340px;
  flex: 1 1 auto;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  color: var(--lc-chat-text);
  background: var(--lc-chat-bg);
  border-left: 1px solid var(--lc-chat-border);
  overflow: hidden;
  contain: layout style;
  transition:
    color .18s ease,
    background-color .18s ease,
    border-color .18s ease;
}
html.lc-custom-chat-mounted #${ROOT_ID$1} {
  display: grid !important;
}
html.lc-custom-chat-root-outside-history #${ROOT_ID$1} {
  flex: 1 1 auto;
  min-height: 0;
}
#${ROOT_ID$1}[data-theme="laplace"],
#${ROOT_ID$1}[data-theme="compact"] {
  --lc-chat-bg: #050608;
  --lc-chat-panel: rgba(22, 24, 29, .86);
  --lc-chat-border: rgba(255, 255, 255, .075);
  --lc-chat-text: #f5f5f7;
  --lc-chat-muted: #98989f;
  --lc-chat-name: #64d2ff;
  --lc-chat-bubble: #1c1c1e;
  --lc-chat-bubble-text: #f5f5f7;
  --lc-chat-own: #0a84ff;
  --lc-chat-own-text: #fff;
  --lc-chat-chip: rgba(255, 255, 255, .1);
  --lc-chat-chip-text: #e6edf7;
  --lc-chat-accent: #30d158;
  --lc-chat-shadow: rgba(0, 0, 0, .34);
  --lc-chat-bubble-shadow: 0 1px 1px rgba(255, 255, 255, .025), 0 10px 28px rgba(0, 0, 0, .28);
  --lc-chat-lite: rgba(255, 255, 255, .08);
  --lc-chat-lite-text: #b8bac4;
  --lc-chat-medal-bg: rgba(255, 214, 10, .18);
  --lc-chat-medal-text: #ffe8a3;
  --lc-chat-guard-bg: rgba(100, 210, 255, .18);
  --lc-chat-guard-text: #b8e6ff;
  --lc-chat-admin-bg: rgba(10, 132, 255, .2);
  --lc-chat-admin-text: #c4e2ff;
  --lc-chat-rank-bg: rgba(255, 204, 0, .2);
  --lc-chat-rank-text: #ffe08a;
  --lc-chat-ul-bg: rgba(191, 90, 242, .2);
  --lc-chat-ul-text: #e7c6ff;
  --lc-chat-honor-bg: rgba(48, 209, 88, .18);
  --lc-chat-honor-text: #b9f6c8;
  --lc-chat-price-bg: rgba(255, 159, 10, .2);
  --lc-chat-price-text: #ffd49a;
}
#${ROOT_ID$1}[data-theme="light"] {
  color: var(--lc-chat-text);
}
#${ROOT_ID$1}[data-theme="compact"] .lc-chat-avatar {
  display: none;
}
#${ROOT_ID$1}[data-theme="compact"] .lc-chat-message {
  grid-template-columns: minmax(0, 1fr);
  padding: 4px 6px;
  gap: 3px 5px;
}
#${ROOT_ID$1}[data-theme="compact"] .lc-chat-body {
  grid-column: 1 / 2;
}
#${ROOT_ID$1}[data-theme="compact"] .lc-chat-bubble {
  font-size: 12px;
}
#${ROOT_ID$1} .lc-chat-toolbar {
  position: relative;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  background: var(--lc-chat-panel);
  border-bottom: 1px solid var(--lc-chat-border);
  backdrop-filter: blur(16px);
  min-width: 0;
  overflow: hidden;
}
#${ROOT_ID$1} .lc-chat-title {
  flex: 1 1 auto;
  min-width: 0;
  text-align: center;
  font-size: 13px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--lc-chat-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#${ROOT_ID$1} .lc-chat-pill {
  min-width: 0;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-chip-text);
  height: 24px;
  padding: 0 8px;
  font-size: 11px;
  cursor: pointer;
}
#${ROOT_ID$1} .lc-chat-icon {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-own);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
#${ROOT_ID$1} .lc-chat-menu {
  display: none;
  min-width: 0;
  margin: 0 8px 8px;
  grid-template-columns: 1fr;
  gap: 10px;
  max-height: min(280px, 38vh);
  overflow-y: auto;
  padding: 10px;
  border: 1px solid var(--lc-chat-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--lc-chat-bg) 92%, #fff);
  box-shadow: 0 16px 42px rgba(0, 0, 0, .28);
  backdrop-filter: blur(24px) saturate(1.35);
  -webkit-backdrop-filter: blur(24px) saturate(1.35);
}
#${ROOT_ID$1}.lc-chat-menu-open .lc-chat-menu {
  display: grid;
}
#${ROOT_ID$1} .lc-chat-menu-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}
#${ROOT_ID$1} .lc-chat-menu-row + .lc-chat-menu-row {
  padding-top: 8px;
  border-top: 1px solid var(--lc-chat-border);
}
#${ROOT_ID$1} .lc-chat-menu-label {
  flex: 0 0 34px;
  color: var(--lc-chat-muted);
  font-size: 11px;
}
#${ROOT_ID$1} .lc-chat-pill[aria-pressed="true"] {
  color: var(--lc-chat-own-text);
  background: var(--lc-chat-own);
  border-color: var(--lc-chat-own);
}
#${ROOT_ID$1} .lc-chat-filterbar {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  padding: 0;
  min-width: 0;
  overflow: hidden;
  background: transparent;
  border-bottom: 0;
  backdrop-filter: none;
}
#${ROOT_ID$1} .lc-chat-filter {
  width: 100%;
  flex: 1 1 0;
  min-width: 0;
  height: 21px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-chip-text);
  padding: 0 3px;
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
}
#${ROOT_ID$1} .lc-chat-filter[aria-pressed="true"] {
  background: var(--lc-chat-own);
  color: var(--lc-chat-own-text);
  border-color: var(--lc-chat-own);
}
#${ROOT_ID$1} .lc-chat-search {
  flex: 1 1 auto;
  min-width: 0;
  width: 0;
  max-width: 100%;
  height: 24px;
  border: 1px solid var(--lc-chat-border);
  border-radius: 999px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-text);
  padding: 0 7px;
  font-size: 11px;
  outline: none;
}
#${ROOT_ID$1} .lc-chat-search:focus {
  border-color: var(--lc-chat-own);
}
#${ROOT_ID$1} .lc-chat-list {
  position: relative;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  overflow-anchor: none;
  padding: 13px 10px 14px;
  scrollbar-width: thin;
  scroll-behavior: auto;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 18px, #000 100%);
  mask-image: linear-gradient(to bottom, transparent, #000 18px, #000 100%);
}
#${ROOT_ID$1} .lc-chat-virtual-items {
  min-width: 0;
  overflow-anchor: none;
}
#${ROOT_ID$1} .lc-chat-virtual-spacer {
  min-width: 1px;
  pointer-events: none;
  overflow-anchor: none;
}
#${ROOT_ID$1} .lc-chat-empty {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 32px 18px;
  color: var(--lc-chat-muted);
  font-size: 12px;
  line-height: 1.55;
  text-align: center;
  pointer-events: none;
}
#${ROOT_ID$1} .lc-chat-message {
  position: relative;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 3px 9px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 4px 2px 6px;
  border-radius: 0;
  border: 1px solid transparent;
  background: transparent;
  overflow: visible;
}
#${ROOT_ID$1} .lc-chat-message:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--lc-chat-own) 64%, transparent);
  outline-offset: -2px;
}
#${ROOT_ID$1} .lc-chat-message:hover {
  background: transparent;
  border-color: transparent;
}
#${ROOT_ID$1} .lc-chat-message[data-kind="gift"] {
  background: transparent;
}
#${ROOT_ID$1} .lc-chat-message[data-kind="superchat"] {
  background: transparent;
  border-color: transparent;
}
#${ROOT_ID$1} .lc-chat-card-event {
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 4px 10px;
  padding: 7px 2px;
}
#${ROOT_ID$1} .lc-chat-card-event .lc-chat-avatar {
  width: 38px;
  height: 38px;
  margin-bottom: 9px;
}
#${ROOT_ID$1} .lc-chat-card-event .lc-chat-meta {
  padding-left: 6px;
}
#${ROOT_ID$1} .lc-chat-card-event .lc-chat-bubble {
  width: 100%;
  max-width: 100%;
  min-height: 62px;
  padding: 11px 14px;
  border-radius: 18px;
  border-bottom-left-radius: 8px;
  font-size: 14px;
  font-weight: 720;
  box-shadow: var(--lc-chat-bubble-shadow);
}
#${ROOT_ID$1} .lc-chat-card-compact .lc-chat-bubble {
  min-height: 0;
  padding: 8px 11px;
  border-radius: 20px;
  border-bottom-left-radius: 8px;
  font-size: 12.5px;
  font-weight: 650;
}
#${ROOT_ID$1} .lc-chat-card-event .lc-chat-bubble::before {
  top: auto;
  bottom: 0;
  left: -4px;
  width: 13px;
  height: 15px;
  background: var(--lc-chat-bubble);
}
#${ROOT_ID$1} .lc-chat-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  margin-bottom: 6px;
  font-size: 12px;
  line-height: 1.2;
  opacity: .92;
}
#${ROOT_ID$1} .lc-chat-card-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#${ROOT_ID$1} .lc-chat-card-mark {
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  min-width: 28px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .28);
  color: currentColor;
  font-size: 11px;
  font-weight: 800;
}
#${ROOT_ID$1} .lc-chat-card-text {
  display: block;
  line-height: 1.35;
}
#${ROOT_ID$1} .lc-chat-card-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 6px;
}
#${ROOT_ID$1} .lc-chat-card-field {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  max-width: 100%;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .24);
  color: currentColor;
  font-size: 11px;
  line-height: 1.35;
}
#${ROOT_ID$1} .lc-chat-card-field-label {
  opacity: .72;
}
#${ROOT_ID$1} .lc-chat-card-field-value {
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#${ROOT_ID$1} .lc-chat-card-event[data-card="gift"] .lc-chat-bubble {
  background: linear-gradient(135deg, #ffd8bf, #fff2c7);
  color: #4a2a10;
  border-color: rgba(191, 92, 0, .2);
}
#${ROOT_ID$1} .lc-chat-card-event[data-card="superchat"] .lc-chat-bubble {
  background: linear-gradient(135deg, #ff9f0a, #ff453a);
  color: #fff;
  border-color: rgba(255, 69, 58, .32);
}
#${ROOT_ID$1} .lc-chat-card-event[data-card="guard"] .lc-chat-bubble {
  background: linear-gradient(135deg, #2f80ed, #7c5cff);
  color: #fff;
  border-color: rgba(47, 128, 237, .32);
}
#${ROOT_ID$1} .lc-chat-card-event[data-card="redpacket"] .lc-chat-bubble {
  background: linear-gradient(135deg, #ff375f, #ffcc00);
  color: #fff;
  border-color: rgba(255, 55, 95, .32);
}
#${ROOT_ID$1} .lc-chat-card-event[data-card="lottery"] .lc-chat-bubble {
  background: linear-gradient(135deg, #34c759, #64d2ff);
  color: #063320;
  border-color: rgba(52, 199, 89, .28);
}
#${ROOT_ID$1} .lc-chat-card-event[data-guard="2"] .lc-chat-bubble {
  background: linear-gradient(135deg, #af52de, #ff7ad9);
}
#${ROOT_ID$1} .lc-chat-card-event[data-guard="1"] .lc-chat-bubble {
  background: linear-gradient(135deg, #ff2d55, #ff9f0a);
}
#${ROOT_ID$1} .lc-chat-message[data-kind="guard"],
#${ROOT_ID$1} .lc-chat-message[data-kind="follow"],
#${ROOT_ID$1} .lc-chat-message[data-kind="like"],
#${ROOT_ID$1} .lc-chat-message[data-kind="share"],
#${ROOT_ID$1} .lc-chat-message[data-kind="redpacket"],
#${ROOT_ID$1} .lc-chat-message[data-kind="lottery"],
#${ROOT_ID$1} .lc-chat-message[data-kind="notice"],
#${ROOT_ID$1} .lc-chat-message[data-kind="system"] {
  opacity: .86;
}
#${ROOT_ID$1} .lc-chat-message[data-priority="lite"] {
  grid-template-columns: minmax(0, 1fr);
  padding: 2px 8px;
  opacity: .78;
}
#${ROOT_ID$1} .lc-chat-message[data-priority="lite"] .lc-chat-avatar,
#${ROOT_ID$1} .lc-chat-message[data-priority="lite"] .lc-chat-meta,
#${ROOT_ID$1} .lc-chat-message[data-priority="lite"] .lc-chat-actions {
  display: none;
}
#${ROOT_ID$1} .lc-chat-message[data-priority="lite"] .lc-chat-body {
  grid-column: 1 / 2;
  justify-items: center;
}
#${ROOT_ID$1} .lc-chat-message[data-priority="lite"] .lc-chat-bubble {
  max-width: 92%;
  min-width: 0;
  padding: 4px 9px;
  border-radius: 999px;
  color: var(--lc-chat-lite-text);
  background: var(--lc-chat-lite);
  border-color: transparent;
  box-shadow: none;
  font-size: 11px;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#${ROOT_ID$1} .lc-chat-message[data-priority="lite"] .lc-chat-bubble::before {
  display: none;
}
#${ROOT_ID$1} .lc-chat-message[data-priority="identity"] .lc-chat-avatar {
  box-shadow: 0 0 0 1px var(--lc-chat-guard-bg), 0 2px 7px var(--lc-chat-shadow);
}
#${ROOT_ID$1} .lc-chat-message[data-guard="1"] .lc-chat-avatar {
  box-shadow: 0 0 0 2px var(--lc-chat-price-bg), 0 2px 8px var(--lc-chat-shadow);
}
#${ROOT_ID$1} .lc-chat-message[data-guard="2"] .lc-chat-avatar {
  box-shadow: 0 0 0 2px var(--lc-chat-ul-bg), 0 2px 8px var(--lc-chat-shadow);
}
#${ROOT_ID$1} .lc-chat-message[data-guard="3"] .lc-chat-avatar {
  box-shadow: 0 0 0 2px var(--lc-chat-guard-bg), 0 2px 8px var(--lc-chat-shadow);
}
#${ROOT_ID$1} .lc-chat-meta {
  max-width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  color: var(--lc-chat-muted);
  font-size: 11px;
  line-height: 1.2;
  padding-left: 10px;
  overflow: hidden;
}
#${ROOT_ID$1} .lc-chat-name {
  min-width: 0;
  max-width: min(15em, 64%);
  color: var(--lc-chat-name);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#${ROOT_ID$1} .lc-chat-time {
  flex: 0 0 auto;
  color: var(--lc-chat-muted);
}
#${ROOT_ID$1} .lc-chat-avatar {
  position: relative;
  grid-row: 1 / 3;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--lc-chat-chip);
  align-self: end;
  margin-bottom: 3px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, .5), 0 2px 7px var(--lc-chat-shadow);
}
#${ROOT_ID$1} .lc-chat-avatar-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
  opacity: 0;
  filter: blur(4px);
  /* Slow, gentle ease-out so a late-arriving avatar fades into focus rather
     than popping in. >250ms keeps the change below the eye's "motion" gate
     so it doesn't draw attention. Cache hits set data-loaded=1 BEFORE the
     element is mounted, so the transition never fires for them — they
     paint at opacity:1 from the first frame. */
  transition: opacity .32s cubic-bezier(.4, 0, .2, 1), filter .32s cubic-bezier(.4, 0, .2, 1);
}
#${ROOT_ID$1} .lc-chat-avatar-img[data-loaded="1"] {
  opacity: 1;
  filter: none;
}
/* Neutral placeholder while the avatar image is in flight. Gray chip
   background (inherited from .lc-chat-avatar) plus a muted person silhouette
   centered on top — visually it reads as "an empty avatar slot", not a
   loading widget. The eye does not fixate on it, and the swap to the real
   photo is a "fill" rather than a "color flip". No text content here, so
   the displayed name has no visual echo in the placeholder either. */
/* Use Bilibili's own default "noface" avatar as the placeholder. Users
   already see this exact image throughout the live site whenever an avatar
   isn't set or hasn't loaded, so it is the quietest possible cache-miss
   state — the brain treats it as "a normal default avatar", not "this chat
   is loading something". The URL is on i0.hdslb.com which we already
   preconnect; the file itself is also prewarmed on chat start (see
   custom-chat-dom.ts) so it sits in HTTP cache before any message renders. */
#${ROOT_ID$1} .lc-chat-avatar-fallback {
  background-image: url("https://i0.hdslb.com/bfs/face/member/noface.jpg");
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}
#${ROOT_ID$1} .lc-chat-reply {
  color: var(--lc-chat-accent);
}
#${ROOT_ID$1} .lc-chat-badge {
  flex: 0 1 auto;
  border-radius: 999px;
  padding: 1px 6px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-chip-text);
  font-size: 10px;
  line-height: 1.25;
  max-width: min(11em, 58%);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#${ROOT_ID$1} .lc-chat-medal {
  max-width: min(12em, 72%);
}
#${ROOT_ID$1} .lc-chat-badge[data-badge-type="medal"] {
  color: var(--lc-chat-medal-text);
  background: var(--lc-chat-medal-bg);
  text-shadow: none;
}
#${ROOT_ID$1} .lc-chat-badge[data-badge-type="guard"] {
  color: var(--lc-chat-guard-text);
  background: var(--lc-chat-guard-bg);
  font-weight: 800;
  text-shadow: none;
}
#${ROOT_ID$1} .lc-chat-badge[data-badge-type="admin"] {
  color: var(--lc-chat-admin-text);
  background: var(--lc-chat-admin-bg);
}
#${ROOT_ID$1} .lc-chat-badge[data-badge-type="rank"] {
  color: var(--lc-chat-rank-text);
  background: var(--lc-chat-rank-bg);
  font-weight: 800;
}
#${ROOT_ID$1} .lc-chat-badge[data-badge-type="ul"] {
  color: var(--lc-chat-ul-text);
  background: var(--lc-chat-ul-bg);
}
#${ROOT_ID$1} .lc-chat-badge[data-badge-type="honor"] {
  color: var(--lc-chat-honor-text);
  background: var(--lc-chat-honor-bg);
}
#${ROOT_ID$1} .lc-chat-badge[data-badge-type="price"] {
  color: var(--lc-chat-price-text);
  background: var(--lc-chat-price-bg);
  font-weight: 800;
}
#${ROOT_ID$1} .lc-chat-kind {
  color: var(--lc-chat-own-text);
  background: var(--lc-chat-own);
}
#${ROOT_ID$1} .lc-chat-message[data-kind="danmaku"] .lc-chat-kind {
  display: none;
}
#${ROOT_ID$1} .lc-chat-kind[data-kind="gift"] {
  background: #ffd166;
}
#${ROOT_ID$1} .lc-chat-kind[data-kind="superchat"] {
  background: #ff7a59;
  color: #fff;
}
#${ROOT_ID$1} .lc-chat-kind[data-kind="enter"] {
  background: #9cb8ff;
}
#${ROOT_ID$1} .lc-chat-body {
  grid-column: 2 / 3;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: grid;
  justify-items: start;
  gap: 4px;
  overflow: visible;
}
#${ROOT_ID$1} .lc-chat-bubble {
  position: relative;
  display: block;
  width: fit-content;
  min-width: 2.6em;
  max-width: calc(100% - 14px);
  color: var(--lc-chat-bubble-text);
  background: var(--lc-chat-bubble);
  border: 1px solid color-mix(in srgb, var(--lc-chat-border) 74%, transparent);
  border-radius: 20px;
  border-bottom-left-radius: 7px;
  padding: 8px 13px 9px;
  font-size: 13.5px;
  line-height: 1.38;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  box-shadow: var(--lc-chat-bubble-shadow);
  isolation: isolate;
}
#${ROOT_ID$1} .lc-chat-emote {
  display: inline-block;
  width: 1.35em;
  height: 1.35em;
  margin: -.15em .06em;
  vertical-align: middle;
  object-fit: contain;
}
#${ROOT_ID$1} .lc-chat-emote-big {
  display: inline-block;
  max-width: 96px;
  max-height: 96px;
  vertical-align: middle;
  object-fit: contain;
}
#${ROOT_ID$1} .lc-chat-bubble::before {
  content: "";
  position: absolute;
  left: -4px;
  bottom: 0;
  width: 12px;
  height: 15px;
  background: inherit;
  border-left: 1px solid color-mix(in srgb, var(--lc-chat-border) 74%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--lc-chat-border) 74%, transparent);
  border-bottom-left-radius: 12px;
  transform: skew(-22deg);
  z-index: -1;
}
#${ROOT_ID$1} .lc-chat-message[data-kind="gift"] .lc-chat-bubble {
  background: #fff4c2;
  color: #4a3400;
  border-color: rgba(191, 134, 0, .22);
}
#${ROOT_ID$1} .lc-chat-message[data-kind="superchat"] .lc-chat-bubble {
  background: linear-gradient(180deg, #ff9f0a, #ff7a59);
  color: #fff;
  border-color: rgba(255, 122, 89, .28);
}
#${ROOT_ID$1}[data-theme="laplace"] .lc-chat-message[data-kind="gift"] .lc-chat-bubble,
#${ROOT_ID$1}[data-theme="compact"] .lc-chat-message[data-kind="gift"] .lc-chat-bubble {
  background: rgba(255, 214, 10, .22);
  color: #fff4bf;
}
#${ROOT_ID$1}[data-theme="laplace"] .lc-chat-message[data-kind="superchat"] .lc-chat-bubble,
#${ROOT_ID$1}[data-theme="compact"] .lc-chat-message[data-kind="superchat"] .lc-chat-bubble {
  background: linear-gradient(180deg, rgba(255, 159, 10, .92), rgba(255, 69, 58, .86));
  color: #fff;
}
#${ROOT_ID$1} .lc-chat-actions {
  grid-column: 2 / 3;
  justify-self: start;
  display: flex;
  gap: 4px;
  margin: 0 0 0 4px;
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity .12s;
  max-width: 100%;
  overflow: hidden;
  pointer-events: none;
}
#${ROOT_ID$1} .lc-chat-message:hover .lc-chat-actions,
#${ROOT_ID$1} .lc-chat-message.lc-chat-selected .lc-chat-actions {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
#${ROOT_ID$1} .lc-chat-message.lc-chat-selected .lc-chat-bubble {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--lc-chat-own) 18%, transparent), var(--lc-chat-bubble-shadow);
}
#${ROOT_ID$1} .lc-chat-action {
  min-width: 22px;
  height: 20px;
  border: 0;
  border-radius: 999px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-chip-text);
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
}
#${ROOT_ID$1} .lc-chat-action:hover {
  background: var(--lc-chat-own);
  color: var(--lc-chat-own-text);
}
#${ROOT_ID$1} .lc-chat-composer {
  position: sticky;
  bottom: 0;
  z-index: 4;
  display: grid;
  grid-template-rows: auto auto;
  flex: 0 0 auto;
  min-width: 0;
  min-height: 88px;
  gap: 6px;
  padding: 9px 8px 8px;
  border-top: 1px solid var(--lc-chat-border);
  background: color-mix(in srgb, var(--lc-chat-panel) 94%, transparent);
  box-shadow: 0 -10px 24px color-mix(in srgb, var(--lc-chat-bg) 86%, transparent);
  backdrop-filter: blur(16px);
}
#${ROOT_ID$1} .lc-chat-jump-bottom {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 6;
  max-width: calc(100% - 24px);
  height: 28px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--lc-chat-own) 32%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--lc-chat-panel) 92%, var(--lc-chat-own) 8%);
  color: var(--lc-chat-text);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--lc-chat-bg) 40%, transparent);
  backdrop-filter: blur(12px);
  transition: background-color .14s ease, transform .14s ease, box-shadow .14s ease;
}
#${ROOT_ID$1} .lc-chat-jump-bottom[data-unread="true"] {
  background: var(--lc-chat-own);
  color: var(--lc-chat-own-text);
  border-color: transparent;
}
#${ROOT_ID$1} .lc-chat-jump-bottom:hover {
  transform: translateX(-50%) translateY(-1px);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--lc-chat-bg) 50%, transparent);
}
#${ROOT_ID$1} .lc-chat-input-wrap {
  position: relative;
}
#${ROOT_ID$1} textarea {
  width: 100%;
  min-width: 0;
  height: 46px;
  resize: vertical;
  min-height: 42px;
  max-height: 120px;
  border: 1px solid var(--lc-chat-border);
  border-radius: 22px;
  background: color-mix(in srgb, var(--lc-chat-bubble) 92%, var(--lc-chat-panel));
  color: var(--lc-chat-bubble-text);
  padding: 9px 38px 9px 13px;
  outline: none;
  font-size: 13px;
  line-height: 1.34;
  overflow-x: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, .035);
}
#${ROOT_ID$1} textarea:focus {
  border-color: var(--lc-chat-own);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lc-chat-own) 18%, transparent);
}
#${ROOT_ID$1} .lc-chat-count {
  position: absolute;
  right: 8px;
  bottom: 6px;
  color: var(--lc-chat-muted);
  font-size: 11px;
  pointer-events: none;
}
#${ROOT_ID$1} .lc-chat-send-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
}
#${ROOT_ID$1} .lc-chat-send {
  min-height: 27px;
  padding: 0 13px;
  border: 0;
  border-radius: 999px;
  background: var(--lc-chat-own);
  color: var(--lc-chat-own-text);
  font-weight: 700;
  cursor: pointer;
}
#${ROOT_ID$1} .lc-chat-send:disabled {
  opacity: .5;
  cursor: wait;
}
#${ROOT_ID$1} .lc-chat-hint {
  color: var(--lc-chat-muted);
  font-size: 11px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#${ROOT_ID$1} .lc-chat-unread {
  max-width: min(100%, 220px);
  border-color: color-mix(in srgb, var(--lc-chat-own) 28%, transparent);
}
#${ROOT_ID$1} .lc-chat-unread[data-frozen="true"] {
  background: color-mix(in srgb, var(--lc-chat-chip) 74%, var(--lc-chat-own) 26%);
}
@keyframes lc-status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
#${ROOT_ID$1} .lc-chat-ws-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 22px;
  max-width: 100%;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--lc-chat-muted);
  min-width: 38px;
  background: color-mix(in srgb, var(--lc-chat-chip) 70%, transparent);
  overflow-wrap: anywhere;
}
#${ROOT_ID$1} .lc-chat-ws-status::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--lc-chat-muted);
  opacity: 0.5;
}
#${ROOT_ID$1} .lc-chat-ws-status[data-status="live"] {
  color: var(--lc-chat-accent);
}
#${ROOT_ID$1} .lc-chat-ws-status[data-status="live"]::before {
  background: var(--lc-chat-accent);
  opacity: 1;
}
#${ROOT_ID$1} .lc-chat-ws-status[data-status="connecting"]::before {
  background: #ff9500;
  opacity: 1;
  animation: lc-status-pulse 1.2s ease-in-out infinite;
}
#${ROOT_ID$1} .lc-chat-ws-status[data-status="fallback"] {
  color: #8a4b00;
  background: rgba(255, 159, 10, .18);
  border: 1px solid rgba(255, 159, 10, .34);
}
#${ROOT_ID$1} .lc-chat-ws-status[data-status="fallback"]::before {
  background: #ff9500;
  opacity: 1;
}
#${ROOT_ID$1} .lc-chat-ws-status[data-status="dom-warning"] {
  color: #9a3412;
  background: rgba(255, 204, 0, .20);
  border: 1px solid rgba(255, 204, 0, .42);
}
#${ROOT_ID$1} .lc-chat-ws-status[data-status="dom-warning"]::before {
  background: #ff9500;
  opacity: 1;
}
#${ROOT_ID$1}[data-theme="laplace"] .lc-chat-ws-status[data-status="fallback"],
#${ROOT_ID$1}[data-theme="compact"] .lc-chat-ws-status[data-status="fallback"],
#${ROOT_ID$1}[data-theme="laplace"] .lc-chat-ws-status[data-status="dom-warning"],
#${ROOT_ID$1}[data-theme="compact"] .lc-chat-ws-status[data-status="dom-warning"] {
  color: #ffd60a;
  background: rgba(255, 159, 10, .20);
  border-color: rgba(255, 214, 10, .36);
}
#${ROOT_ID$1}[data-theme="laplace"] .lc-chat-ws-status[data-status="fallback"]::before,
#${ROOT_ID$1}[data-theme="compact"] .lc-chat-ws-status[data-status="fallback"]::before,
#${ROOT_ID$1}[data-theme="laplace"] .lc-chat-ws-status[data-status="dom-warning"]::before,
#${ROOT_ID$1}[data-theme="compact"] .lc-chat-ws-status[data-status="dom-warning"]::before {
  background: #ff9f0a;
  opacity: 1;
}
#${ROOT_ID$1} .lc-chat-perf {
  display: none;
  width: 100%;
  padding: 6px 8px;
  border-radius: 12px;
  color: var(--lc-chat-muted);
  background: color-mix(in srgb, var(--lc-chat-chip) 72%, transparent);
  font: 11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace;
  overflow-wrap: anywhere;
}
#${ROOT_ID$1}[data-debug="true"] .lc-chat-perf {
  display: block;
}
#${ROOT_ID$1} .lc-chat-event-debug {
  display: none;
  min-width: 0;
  margin: 0 8px 6px;
  padding: 8px 10px;
  border: 1px solid var(--lc-chat-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--lc-chat-panel) 88%, var(--lc-chat-bg));
  color: var(--lc-chat-muted);
  font: 11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace;
  overflow-wrap: anywhere;
}
#${ROOT_ID$1}[data-inspecting="true"] .lc-chat-event-debug {
  display: grid;
  gap: 5px;
}
#${ROOT_ID$1} .lc-chat-debug-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
#${ROOT_ID$1} .lc-chat-debug-title {
  color: var(--lc-chat-text);
  font-weight: 800;
}
#${ROOT_ID$1} .lc-chat-debug-close {
  border: 0;
  border-radius: 999px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-chip-text);
  cursor: pointer;
  font-size: 11px;
}
#${ROOT_ID$1} .lc-chat-debug-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 6px;
}
#${ROOT_ID$1} .lc-chat-debug-key {
  color: var(--lc-chat-muted);
}
#${ROOT_ID$1} .lc-chat-debug-value {
  color: var(--lc-chat-text);
}
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .chat-items,
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .super-chat-card,
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .chat-control-panel,
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .chat-input-panel,
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .control-panel-ctnr,
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .chat-input-ctnr,
html.lc-custom-chat-hide-native.lc-custom-chat-mounted [class*="input-panel"],
html.lc-custom-chat-hide-native.lc-custom-chat-mounted [class*="input-ctnr"],
html.lc-custom-chat-hide-native.lc-custom-chat-mounted [class*="send-bar"],
html.lc-custom-chat-hide-native.lc-custom-chat-mounted [class*="bottom-send"],
html.lc-custom-chat-hide-native.lc-custom-chat-mounted [class*="chat-send"],
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .live-input-panel {
  display: none !important;
}
html.lc-custom-chat-hide-native.lc-custom-chat-mounted.lc-custom-chat-root-outside-history .chat-history-panel {
  display: none !important;
}
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .chat-history-panel:has(#${ROOT_ID$1}) > :not(#${ROOT_ID$1}) {
  display: none !important;
}
`;
      function ensureCustomChatStyles({
        styleId,
        userStyleId,
        customCss,
        styleEl: styleEl2,
        userStyleEl: userStyleEl2
      }) {
        let nextStyleEl = styleEl2;
        if (!nextStyleEl) {
          nextStyleEl = document.createElement("style");
          nextStyleEl.id = styleId;
          nextStyleEl.textContent = CUSTOM_CHAT_STYLE;
          document.head.appendChild(nextStyleEl);
        }
        let nextUserStyleEl = userStyleEl2;
        if (!nextUserStyleEl) {
          nextUserStyleEl = document.createElement("style");
          nextUserStyleEl.id = userStyleId;
          document.head.appendChild(nextUserStyleEl);
        }
        const safeCss = sanitizeCustomChatCss(customCss).css;
        if (nextUserStyleEl.textContent !== safeCss) {
          nextUserStyleEl.textContent = safeCss;
        }
        return { styleEl: nextStyleEl, userStyleEl: nextUserStyleEl };
      }
      function buildOffsets(itemCount, rowHeight2) {
        const offsets = new Array(itemCount + 1);
        offsets[0] = 0;
        for (let index = 0; index < itemCount; index++) offsets[index + 1] = offsets[index] + rowHeight2(index);
        return offsets;
      }
      function findFirstVisibleIndex(offsets, scrollTop) {
        let low = 0;
        let high = offsets.length - 2;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          if (offsets[mid + 1] < scrollTop) low = mid + 1;
          else high = mid - 1;
        }
        return low;
      }
      function findRangeEndIndex(offsets, viewportBottom, start) {
        let low = start;
        let high = offsets.length - 1;
        while (low < high) {
          const mid = Math.floor((low + high) / 2);
          if (offsets[mid] < viewportBottom) low = mid + 1;
          else high = mid;
        }
        return low;
      }
      function calculateVirtualContentHeight(itemCount, rowHeight2, end = itemCount) {
        let height = 0;
        for (let index = 0; index < Math.min(end, itemCount); index++) height += rowHeight2(index);
        return height;
      }
      function calculateVirtualRange(input) {
        const offsets = buildOffsets(input.itemCount, input.rowHeight);
        const total = offsets[input.itemCount] ?? 0;
        if (input.itemCount === 0) return { start: 0, end: 0, top: 0, bottom: 0, total };
        const viewportBottom = input.scrollTop + Math.max(input.viewportHeight, 1);
        const visibleStart = findFirstVisibleIndex(offsets, input.scrollTop);
        const visibleEnd = findRangeEndIndex(offsets, viewportBottom, visibleStart);
        const start = Math.max(0, visibleStart - input.overscan);
        const end = Math.min(input.itemCount, visibleEnd + input.overscan);
        const top = offsets[start] ?? 0;
        const bottom = offsets[end] ?? total;
        return { start, end, top, bottom, total };
      }
      const pending = y$1(null);
      function showConfirm(opts) {
        return new Promise((resolve) => {
          pending.value = { ...opts, resolve };
        });
      }
      function AlertDialog() {
        const ref = A(null);
        const p2 = pending.value;
        y$2(() => {
          const dialog = ref.current;
          if (!dialog) return;
          if (p2) {
            dialog.showModal();
            if (p2.anchor) {
              const rect = dialog.getBoundingClientRect();
              const x2 = Math.max(0, Math.min(p2.anchor.x - rect.width / 2, window.innerWidth - rect.width));
              const y2 = Math.max(0, Math.min(p2.anchor.y - rect.height - 8, window.innerHeight - rect.height));
              dialog.style.margin = "0";
              dialog.style.position = "fixed";
              dialog.style.left = `${x2}px`;
              dialog.style.top = `${y2}px`;
            } else {
              dialog.style.margin = "";
              dialog.style.position = "";
              dialog.style.left = "";
              dialog.style.top = "";
            }
          } else {
            dialog.close();
          }
        }, [p2]);
        if (!p2) return null;
        const close = (confirmed) => {
          p2.resolve(confirmed);
          pending.value = null;
        };
        return u$2(
          "dialog",
          {
            ref,
            onCancel: (e2) => {
              e2.preventDefault();
              close(false);
            },
            onClick: (e2) => {
              if (p2.anchor && e2.target === ref.current) close(false);
            },
            onKeyDown: (e2) => {
              if (p2.anchor && e2.key === "Escape") close(false);
            },
            style: {
              border: "1px solid rgba(0, 0, 0, .08)",
              borderRadius: "8px",
              padding: "14px",
              maxWidth: "320px",
              fontSize: "12px",
              color: "#1d1d1f",
              background: "rgba(248, 248, 250, .92)",
              boxShadow: "0 22px 60px rgba(0,0,0,.24)",
              backdropFilter: "blur(26px) saturate(1.5)"
            },
            children: [
              p2.title && u$2("p", { style: { margin: "0 0 .75em", wordBreak: "break-all" }, children: p2.title }),
              p2.body && u$2("div", { style: { margin: "0 0 .75em", wordBreak: "break-all" }, children: p2.body }),
u$2("div", { style: { display: "flex", justifyContent: "flex-end", gap: ".5em" }, children: [
u$2(
                  "button",
                  {
                    type: "button",
                    onClick: () => close(false),
                    style: {
                      border: "1px solid rgba(0,0,0,.08)",
                      borderRadius: "8px",
                      background: "#fff",
                      padding: "5px 10px"
                    },
                    children: p2.cancelText ?? "取消"
                  }
                ),
u$2(
                  "button",
                  {
                    type: "button",
                    onClick: () => close(true),
                    style: {
                      border: "1px solid #007aff",
                      borderRadius: "8px",
                      background: "#007aff",
                      color: "#fff",
                      padding: "5px 10px"
                    },
                    children: p2.confirmText ?? "确认"
                  }
                )
              ] })
            ]
          }
        );
      }
      async function copyTextToClipboard(text) {
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
          }
        } catch {
        }
        if (typeof document === "undefined") return false;
        try {
          const textarea2 = document.createElement("textarea");
          textarea2.value = text;
          textarea2.setAttribute("readonly", "");
          textarea2.style.position = "fixed";
          textarea2.style.top = "0";
          textarea2.style.left = "0";
          textarea2.style.opacity = "0";
          textarea2.style.pointerEvents = "none";
          document.body.appendChild(textarea2);
          textarea2.select();
          textarea2.setSelectionRange(0, text.length);
          const ok = document.execCommand("copy");
          textarea2.remove();
          return ok;
        } catch {
          return false;
        }
      }
      const copyText = copyTextToClipboard;
      async function stealDanmaku(msg) {
        const copied = await copyText(msg);
        fasongText.value = msg;
        if (!focusCustomChatComposer()) {
          activeTab.value = "fasong";
          dialogOpen.value = true;
        }
        appendLog(copied ? `🥷 偷并复制: ${msg}` : `🥷 偷: ${msg}`);
      }
      function focusCustomChatComposer() {
        if (!customChatEnabled.value) return false;
        const input = document.querySelector("#laplace-custom-chat textarea");
        if (!input) return false;
        input.value = fasongText.value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        return true;
      }
      function fillIntoComposer(text) {
        fasongText.value = text;
        if (focusCustomChatComposer()) return "custom-chat";
        const native = document.querySelector(
          [
            ".chat-control-panel-vm textarea",
            ".bottom-actions textarea",
            ".brush-input textarea",
            "textarea.chat-input"
          ].join(", ")
        );
        if (native) {
          native.value = text;
          native.dispatchEvent(new Event("input", { bubbles: true }));
          native.focus();
          try {
            native.setSelectionRange(text.length, text.length);
          } catch {
          }
          return "native";
        }
        activeTab.value = "fasong";
        dialogOpen.value = true;
        return "send-tab";
      }
      async function repeatDanmaku(msg, options = {}) {
        if (options.confirm) {
          const confirmed = await showConfirm({
            title: "确认发送以下弹幕？",
            body: msg,
            confirmText: "发送",
            anchor: options.anchor
          });
          if (!confirmed) return;
        }
        try {
          const roomId = await ensureRoomId();
          const csrfToken = getCsrfToken();
          if (!csrfToken) {
            appendLog("❌ 未找到登录信息，请先登录 Bilibili");
            return;
          }
          const processed = applyReplacements(msg);
          if (isLockedEmoticon(processed)) {
            appendLog(formatLockedEmoticonReject(processed, "+1 表情"));
            return;
          }
          const result = await enqueueDanmaku(processed, roomId, csrfToken, SendPriority.MANUAL);
          const display = msg !== processed ? `${msg} → ${processed}` : processed;
          appendLog(result, "+1", display);
          if (result.success && !result.cancelled) {
            void verifyBroadcast({
              text: processed,
              label: "+1",
              display,
              sinceTs: result.startedAt ?? Date.now(),
              isEmoticon: result.isEmoticon,
              enableAiEvasion: true,
              roomId,
              csrfToken
            });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          appendLog(`🔴 +1 出错：${message}`);
        }
      }
      async function sendManualDanmaku(originalMessage) {
        const trimmed = originalMessage.trim();
        if (!trimmed) {
          appendLog("⚠️ 消息内容不能为空");
          return false;
        }
        const isEmote = isEmoticonUnique(trimmed);
        if (isLockedEmoticon(trimmed)) {
          appendLog(formatLockedEmoticonReject(trimmed, "手动表情"));
          return false;
        }
        const processedMessage = isEmote ? trimmed : applyReplacements(trimmed);
        const wasReplaced = !isEmote && trimmed !== processedMessage;
        try {
          const roomId = await ensureRoomId();
          const csrfToken = getCsrfToken();
          if (!csrfToken) {
            appendLog("❌ 未找到登录信息，请先登录 Bilibili");
            void syncGuardRoomRiskEvent({
              kind: "login_missing",
              source: "manual",
              level: "observe",
              roomId,
              reason: "未找到登录信息",
              advice: "先登录 Bilibili，再发送弹幕。"
            });
            return false;
          }
          const segments = isEmote ? [processedMessage] : processMessages(processedMessage, maxLength.value);
          let allSuccess = true;
          for (let i2 = 0; i2 < segments.length; i2++) {
            const segment = segments[i2];
            const result = await enqueueDanmaku(segment, roomId, csrfToken, SendPriority.MANUAL);
            const baseLabel = result.isEmoticon ? "手动表情" : "手动";
            const label = segments.length > 1 ? `${baseLabel} [${i2 + 1}/${segments.length}]` : baseLabel;
            const displayMsg = wasReplaced && segments.length === 1 ? `${trimmed} → ${segment}` : segment;
            appendLog(result, label, displayMsg);
            if (!result.success) {
              allSuccess = false;
              const risk = classifyRiskEvent(result.error);
              void syncGuardRoomRiskEvent({
                ...risk,
                source: "manual",
                roomId,
                errorCode: result.errorCode,
                reason: result.error
              });
              if (aiEvasion.value) {
                await tryAiEvasion(segment, roomId, csrfToken, "");
              }
            } else if (!result.cancelled) {
              void verifyBroadcast({
                text: segment,
                label,
                display: displayMsg,
                sinceTs: result.startedAt ?? Date.now(),
                isEmoticon: result.isEmoticon,
                enableAiEvasion: true,
                roomId,
                csrfToken
              });
            }
            if (i2 < segments.length - 1) {
              await new Promise((r2) => setTimeout(r2, msgSendInterval.value * 1e3));
            }
          }
          return allSuccess;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          appendLog(`🔴 发送出错：${msg}`);
          return false;
        }
      }
      function g(n2, t2) {
        for (var e2 in t2) n2[e2] = t2[e2];
        return n2;
      }
      function E(n2, t2) {
        for (var e2 in n2) if ("__source" !== e2 && !(e2 in t2)) return true;
        for (var r2 in t2) if ("__source" !== r2 && n2[r2] !== t2[r2]) return true;
        return false;
      }
      function M(n2, t2) {
        this.props = n2, this.context = t2;
      }
      (M.prototype = new C$1()).isPureReactComponent = true, M.prototype.shouldComponentUpdate = function(n2, t2) {
        return E(this.props, n2) || E(this.state, t2);
      };
      var T = l$3.__b;
      l$3.__b = function(n2) {
        n2.type && n2.type.__f && n2.ref && (n2.props.ref = n2.ref, n2.ref = null), T && T(n2);
      };
      var O = l$3.__e;
      l$3.__e = function(n2, t2, e2, r2) {
        if (n2.then) {
          for (var u2, o2 = t2; o2 = o2.__; ) if ((u2 = o2.__c) && u2.__c) return null == t2.__e && (t2.__e = e2.__e, t2.__k = e2.__k), u2.__c(n2, t2);
        }
        O(n2, t2, e2, r2);
      };
      var U = l$3.unmount;
      function V(n2, t2, e2) {
        return n2 && (n2.__c && n2.__c.__H && (n2.__c.__H.__.forEach(function(n3) {
          "function" == typeof n3.__c && n3.__c();
        }), n2.__c.__H = null), null != (n2 = g({}, n2)).__c && (n2.__c.__P === e2 && (n2.__c.__P = t2), n2.__c.__e = true, n2.__c = null), n2.__k = n2.__k && n2.__k.map(function(n3) {
          return V(n3, t2, e2);
        })), n2;
      }
      function W(n2, t2, e2) {
        return n2 && e2 && (n2.__v = null, n2.__k = n2.__k && n2.__k.map(function(n3) {
          return W(n3, t2, e2);
        }), n2.__c && n2.__c.__P === t2 && (n2.__e && e2.appendChild(n2.__e), n2.__c.__e = true, n2.__c.__P = e2)), n2;
      }
      function P() {
        this.__u = 0, this.o = null, this.__b = null;
      }
      function j(n2) {
        var t2 = n2.__ && n2.__.__c;
        return t2 && t2.__a && t2.__a(n2);
      }
      function B() {
        this.i = null, this.l = null;
      }
      l$3.unmount = function(n2) {
        var t2 = n2.__c;
        t2 && (t2.__z = true), t2 && t2.__R && t2.__R(), t2 && 32 & n2.__u && (n2.type = null), U && U(n2);
      }, (P.prototype = new C$1()).__c = function(n2, t2) {
        var e2 = t2.__c, r2 = this;
        null == r2.o && (r2.o = []), r2.o.push(e2);
        var u2 = j(r2.__v), o2 = false, i2 = function() {
          o2 || r2.__z || (o2 = true, e2.__R = null, u2 ? u2(c2) : c2());
        };
        e2.__R = i2;
        var l2 = e2.__P;
        e2.__P = null;
        var c2 = function() {
          if (!--r2.__u) {
            if (r2.state.__a) {
              var n3 = r2.state.__a;
              r2.__v.__k[0] = W(n3, n3.__c.__P, n3.__c.__O);
            }
            var t3;
            for (r2.setState({ __a: r2.__b = null }); t3 = r2.o.pop(); ) t3.__P = l2, t3.forceUpdate();
          }
        };
        r2.__u++ || 32 & t2.__u || r2.setState({ __a: r2.__b = r2.__v.__k[0] }), n2.then(i2, i2);
      }, P.prototype.componentWillUnmount = function() {
        this.o = [];
      }, P.prototype.render = function(n2, e2) {
        if (this.__b) {
          if (this.__v.__k) {
            var r2 = document.createElement("div"), o2 = this.__v.__k[0].__c;
            this.__v.__k[0] = V(this.__b, r2, o2.__O = o2.__P);
          }
          this.__b = null;
        }
        var i2 = e2.__a && k$1(S$1, null, n2.fallback);
        return i2 && (i2.__u &= -33), [k$1(S$1, null, e2.__a ? null : n2.children), i2];
      };
      var H = function(n2, t2, e2) {
        if (++e2[1] === e2[0] && n2.l.delete(t2), n2.props.revealOrder && ("t" !== n2.props.revealOrder[0] || !n2.l.size)) for (e2 = n2.i; e2; ) {
          for (; e2.length > 3; ) e2.pop()();
          if (e2[1] < e2[0]) break;
          n2.i = e2 = e2[2];
        }
      };
      function Z(n2) {
        return this.getChildContext = function() {
          return n2.context;
        }, n2.children;
      }
      function Y(n2) {
        var e2 = this, r2 = n2.h;
        if (e2.componentWillUnmount = function() {
          R(null, e2.v), e2.v = null, e2.h = null;
        }, e2.h && e2.h !== r2 && e2.componentWillUnmount(), !e2.v) {
          for (var u2 = e2.__v; null !== u2 && !u2.__m && null !== u2.__; ) u2 = u2.__;
          e2.h = r2, e2.v = { nodeType: 1, parentNode: r2, childNodes: [], __k: { __m: u2.__m }, contains: function() {
            return true;
          }, namespaceURI: r2.namespaceURI, insertBefore: function(n3, t2) {
            this.childNodes.push(n3), e2.h.insertBefore(n3, t2);
          }, removeChild: function(n3) {
            this.childNodes.splice(this.childNodes.indexOf(n3) >>> 1, 1), e2.h.removeChild(n3);
          } };
        }
        R(k$1(Z, { context: e2.context }, n2.__v), e2.v);
      }
      function $(n2, e2) {
        var r2 = k$1(Y, { __v: n2, h: e2 });
        return r2.containerInfo = e2, r2;
      }
      (B.prototype = new C$1()).__a = function(n2) {
        var t2 = this, e2 = j(t2.__v), r2 = t2.l.get(n2);
        return r2[0]++, function(u2) {
          var o2 = function() {
            t2.props.revealOrder ? (r2.push(u2), H(t2, n2, r2)) : u2();
          };
          e2 ? e2(o2) : o2();
        };
      }, B.prototype.render = function(n2) {
        this.i = null, this.l = new Map();
        var t2 = F$1(n2.children);
        n2.revealOrder && "b" === n2.revealOrder[0] && t2.reverse();
        for (var e2 = t2.length; e2--; ) this.l.set(t2[e2], this.i = [1, 0, this.i]);
        return n2.children;
      }, B.prototype.componentDidUpdate = B.prototype.componentDidMount = function() {
        var n2 = this;
        this.l.forEach(function(t2, e2) {
          H(n2, e2, t2);
        });
      };
      var q = "undefined" != typeof Symbol && Symbol.for && Symbol.for("react.element") || 60103, G = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/, J = /^on(Ani|Tra|Tou|BeforeInp|Compo)/, K = /[A-Z0-9]/g, Q = "undefined" != typeof document, X = function(n2) {
        return ("undefined" != typeof Symbol && "symbol" == typeof Symbol() ? /fil|che|rad/ : /fil|che|ra/).test(n2);
      };
      C$1.prototype.isReactComponent = true, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(t2) {
        Object.defineProperty(C$1.prototype, t2, { configurable: true, get: function() {
          return this["UNSAFE_" + t2];
        }, set: function(n2) {
          Object.defineProperty(this, t2, { configurable: true, writable: true, value: n2 });
        } });
      });
      var en = l$3.event;
      l$3.event = function(n2) {
        return en && (n2 = en(n2)), n2.persist = function() {
        }, n2.isPropagationStopped = function() {
          return this.cancelBubble;
        }, n2.isDefaultPrevented = function() {
          return this.defaultPrevented;
        }, n2.nativeEvent = n2;
      };
      var un = { configurable: true, get: function() {
        return this.class;
      } }, on = l$3.vnode;
      l$3.vnode = function(n2) {
        "string" == typeof n2.type && (function(n3) {
          var t2 = n3.props, e2 = n3.type, u2 = {}, o2 = -1 == e2.indexOf("-");
          for (var i2 in t2) {
            var l2 = t2[i2];
            if (!("value" === i2 && "defaultValue" in t2 && null == l2 || Q && "children" === i2 && "noscript" === e2 || "class" === i2 || "className" === i2)) {
              var c2 = i2.toLowerCase();
              "defaultValue" === i2 && "value" in t2 && null == t2.value ? i2 = "value" : "download" === i2 && true === l2 ? l2 = "" : "translate" === c2 && "no" === l2 ? l2 = false : "o" === c2[0] && "n" === c2[1] ? "ondoubleclick" === c2 ? i2 = "ondblclick" : "onchange" !== c2 || "input" !== e2 && "textarea" !== e2 || X(t2.type) ? "onfocus" === c2 ? i2 = "onfocusin" : "onblur" === c2 ? i2 = "onfocusout" : J.test(i2) && (i2 = c2) : c2 = i2 = "oninput" : o2 && G.test(i2) ? i2 = i2.replace(K, "-$&").toLowerCase() : null === l2 && (l2 = void 0), "oninput" === c2 && u2[i2 = c2] && (i2 = "oninputCapture"), u2[i2] = l2;
            }
          }
          "select" == e2 && (u2.multiple && Array.isArray(u2.value) && (u2.value = F$1(t2.children).forEach(function(n4) {
            n4.props.selected = -1 != u2.value.indexOf(n4.props.value);
          })), null != u2.defaultValue && (u2.value = F$1(t2.children).forEach(function(n4) {
            n4.props.selected = u2.multiple ? -1 != u2.defaultValue.indexOf(n4.props.value) : u2.defaultValue == n4.props.value;
          }))), t2.class && !t2.className ? (u2.class = t2.class, Object.defineProperty(u2, "className", un)) : t2.className && (u2.class = u2.className = t2.className), n3.props = u2;
        })(n2), n2.$$typeof = q, on && on(n2);
      };
      var ln = l$3.__r;
      l$3.__r = function(n2) {
        ln && ln(n2), n2.__c;
      };
      var cn$1 = l$3.diffed;
      l$3.diffed = function(n2) {
        cn$1 && cn$1(n2);
        var t2 = n2.props, e2 = n2.__e;
        null != e2 && "textarea" === n2.type && "value" in t2 && t2.value !== e2.value && (e2.value = null == t2.value ? "" : t2.value);
      };
      const PICKER_W = 320;
      const PICKER_H = 360;
      const PICKER_GAP = 8;
      const ANCHOR_OFFSET = 4;
      function computePos(rect, viewportWidth, viewportHeight) {
        if (!rect) return { bottom: PICKER_GAP, right: PICKER_GAP };
        const pos = {};
        if (rect.top >= PICKER_H + PICKER_GAP) {
          pos.bottom = viewportHeight - rect.top + ANCHOR_OFFSET;
        } else {
          pos.top = rect.bottom + ANCHOR_OFFSET;
        }
        if (rect.right - PICKER_W >= PICKER_GAP) {
          pos.right = Math.max(PICKER_GAP, viewportWidth - rect.right);
        } else {
          pos.left = Math.max(PICKER_GAP, rect.left);
        }
        return pos;
      }
      let emoticonFetchInFlight = null;
      const emoticonFetchError = y$1(null);
      function ensureEmoticonsLoaded() {
        if (cachedEmoticonPackages.value.length > 0) return Promise.resolve();
        if (emoticonFetchInFlight) return emoticonFetchInFlight;
        emoticonFetchError.value = null;
        emoticonFetchInFlight = (async () => {
          try {
            const roomId = await ensureRoomId();
            await fetchEmoticons(roomId);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            emoticonFetchError.value = msg;
            notifyUser("warning", "表情包加载失败", msg);
          } finally {
            emoticonFetchInFlight = null;
          }
        })();
        return emoticonFetchInFlight;
      }
      const PICKER_BG = "#ffffff";
      const PICKER_BORDER = "#dddddd";
      const PICKER_TEXT = "#333333";
      const PICKER_MUTED = "#999999";
      const TAB_INACTIVE_BG = "#f5f5f5";
      const TAB_ACTIVE_BG = "#36a185";
      const TAB_ACTIVE_TEXT = "#ffffff";
      const EMOTE_TILE_BG = "#f5f5f5";
      function computePosFor(anchor) {
        return computePos(anchor ? anchor.getBoundingClientRect() : null, window.innerWidth, window.innerHeight);
      }
      function EmotePicker({ open, anchorRef, onSend, onClose }) {
        const packages = cachedEmoticonPackages.value;
        const activePkgId = useSignal(packages[0]?.pkg_id ?? null);
        const pos = useSignal(computePosFor(anchorRef.current));
        const rootRef = A(null);
        const isOpen = open.value;
        _$2(() => {
          if (!isOpen) return;
          pos.value = computePosFor(anchorRef.current);
        }, [isOpen, anchorRef, pos]);
        y$2(() => {
          if (!isOpen) return;
          if (cachedEmoticonPackages.value.length > 0) return;
          void ensureEmoticonsLoaded();
        }, [isOpen]);
        y$2(() => {
          if (!isOpen) return;
          const onResize = () => {
            pos.value = computePosFor(anchorRef.current);
          };
          const onScroll = () => {
            pos.value = computePosFor(anchorRef.current);
          };
          const onDocMouseDown = (e2) => {
            const target = e2.target;
            if (!target) return;
            if (rootRef.current?.contains(target)) return;
            if (anchorRef.current?.contains(target)) return;
            onClose();
          };
          const onKeyDown = (e2) => {
            if (e2.key === "Escape") onClose();
          };
          window.addEventListener("resize", onResize);
          window.addEventListener("scroll", onScroll, true);
          document.addEventListener("mousedown", onDocMouseDown, true);
          document.addEventListener("keydown", onKeyDown, true);
          return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("scroll", onScroll, true);
            document.removeEventListener("mousedown", onDocMouseDown, true);
            document.removeEventListener("keydown", onKeyDown, true);
          };
        }, [isOpen, anchorRef, onClose, pos]);
        if (!isOpen) return null;
        if (packages.length === 0) {
          const inRoom = !!cachedRoomId.value;
          const fetchError = emoticonFetchError.value;
          const fetching = emoticonFetchInFlight !== null;
          let message;
          if (!inRoom) message = "请先进入直播间，载入你的表情包";
          else if (fetchError) message = `表情数据加载失败：${fetchError}`;
          else if (fetching) message = "表情数据加载中…";
          else message = "此房间暂无可用表情包";
          return $(
u$2(
              "div",
              {
                ref: rootRef,
                role: "status",
                "aria-live": "polite",
                style: {
                  position: "fixed",
                  ...pos.value,
                  width: `${PICKER_W}px`,
                  minHeight: "64px",
                  zIndex: 2147483646,
                  background: PICKER_BG,
                  border: `1px solid ${PICKER_BORDER}`,
                  borderRadius: "6px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  padding: "12px",
                  color: fetchError ? "#a15c00" : PICKER_MUTED,
                  fontSize: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  textAlign: "center"
                },
                children: [
u$2("span", { children: message }),
                  fetchError && inRoom && u$2(
                    "button",
                    {
                      type: "button",
                      onClick: () => {
                        emoticonFetchError.value = null;
                        void ensureEmoticonsLoaded();
                      },
                      style: { fontSize: "11px", padding: "2px 8px", cursor: "pointer" },
                      children: "重试"
                    }
                  )
                ]
              }
            ),
            document.body
          );
        }
        const activePkg = packages.find((p2) => p2.pkg_id === activePkgId.value) ?? packages[0];
        return $(
u$2(
            "div",
            {
              ref: rootRef,
              role: "dialog",
              "aria-label": "表情选择器",
              style: {
                position: "fixed",
                ...pos.value,
                width: `${PICKER_W}px`,
                height: `${PICKER_H}px`,
                zIndex: 2147483646,
                background: PICKER_BG,
                border: `1px solid ${PICKER_BORDER}`,
                borderRadius: "6px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                color: PICKER_TEXT
              },
              children: [
u$2(
                  "div",
                  {
                    style: {
                      display: "flex",
                      gap: "4px",
                      padding: "6px 8px",
                      borderBottom: `1px solid ${PICKER_BORDER}`,
                      overflowX: "auto",
                      flex: "0 0 auto"
                    },
                    children: packages.map((pkg) => {
                      const active = pkg.pkg_id === (activePkg?.pkg_id ?? -1);
                      return u$2(
                        "button",
                        {
                          type: "button",
                          title: pkg.pkg_name,
                          onClick: () => {
                            activePkgId.value = pkg.pkg_id;
                          },
                          style: {
                            padding: "3px 8px",
                            fontSize: "11px",
                            lineHeight: 1.4,
                            border: `1px solid ${PICKER_BORDER}`,
                            borderRadius: "3px",
                            background: active ? TAB_ACTIVE_BG : TAB_INACTIVE_BG,
                            color: active ? TAB_ACTIVE_TEXT : "#555555",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            flex: "0 0 auto"
                          },
                          children: pkg.pkg_name
                        },
                        pkg.pkg_id
                      );
                    })
                  }
                ),
u$2(
                  "div",
                  {
                    style: {
                      flex: "1 1 auto",
                      overflowY: "auto",
                      padding: "8px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px",
                      alignContent: "flex-start"
                    },
                    children: activePkg?.emoticons.map((emo) => {
                      const meta = getEmoticonLockMeta(emo);
                      const titleParts = [emo.emoji];
                      if (meta.titleSuffix) titleParts.push(meta.titleSuffix);
                      return u$2(
                        "button",
                        {
                          type: "button",
                          title: titleParts.join("\n"),
                          onClick: () => {
                            if (meta.isLocked) {
                              notifyUser("warning", "🔒 该表情已被锁定", meta.reason);
                              return;
                            }
                            onSend(emo.emoticon_unique);
                            onClose();
                          },
                          style: {
                            position: "relative",
                            width: "52px",
                            height: "52px",
                            padding: "2px",
                            border: `1px solid ${PICKER_BORDER}`,
                            borderRadius: "4px",
                            background: EMOTE_TILE_BG,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          },
                          children: [
u$2(
                              "img",
                              {
                                src: emo.url,
                                alt: emo.emoji,
                                loading: "lazy",
                                style: {
                                  maxWidth: "44px",
                                  maxHeight: "44px",
                                  objectFit: "contain",
                                  opacity: meta.isLocked ? 0.5 : 1
                                }
                              }
                            ),
                            meta.isLocked && u$2(
                              "span",
                              {
                                style: {
                                  position: "absolute",
                                  top: 1,
                                  right: 1,
                                  padding: "0 4px",
                                  fontSize: "9px",
                                  lineHeight: "12px",
                                  color: "#fff",
                                  borderRadius: "2px",
                                  background: meta.badgeColor,
                                  pointerEvents: "none",
                                  whiteSpace: "nowrap"
                                },
                                children: meta.badgeLabel
                              }
                            )
                          ]
                        },
                        emo.emoticon_id
                      );
                    })
                  }
                )
              ]
            }
          ),
          document.body
        );
      }
      const iconBtnStyle = {
        width: "28px",
        height: "28px",
        padding: 0,
        border: "1px solid var(--Ga2, #ddd)",
        borderRadius: "999px",
        background: "var(--bg2, #f5f5f5)",
        cursor: "pointer",
        fontSize: "14px",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
      };
      function SendActions({ onSend }) {
        const open = useSignal(false);
        const anchorRef = A(null);
        return u$2("div", { style: { display: "inline-flex", gap: "4px", alignItems: "center" }, children: [
u$2(
            "button",
            {
              ref: anchorRef,
              type: "button",
              title: "表情",
              onClick: () => {
                open.value = !open.value;
              },
              style: iconBtnStyle,
              children: "😀"
            }
          ),
u$2(
            "button",
            {
              type: "button",
              title: "点赞 — 即将上线",
              onClick: () => notifyUser("info", "点赞功能即将上线"),
              style: { ...iconBtnStyle, opacity: 0.4, cursor: "not-allowed" },
              "aria-disabled": "true",
              children: "👍"
            }
          ),
u$2(
            "button",
            {
              type: "button",
              title: "醒目留言 SC — 即将上线",
              onClick: () => notifyUser("info", "醒目留言 (SC) 功能即将上线"),
              style: { ...iconBtnStyle, opacity: 0.4, cursor: "not-allowed" },
              "aria-disabled": "true",
              children: "💰"
            }
          ),
u$2(
            EmotePicker,
            {
              open,
              anchorRef,
              onSend,
              onClose: () => {
                open.value = false;
              }
            }
          )
        ] });
      }
      function mountSendActionsIsland(host, onSend) {
        R( u$2(SendActions, { onSend }), host);
        return () => {
          R(null, host);
        };
      }
      const ROOT_ID = "laplace-custom-chat";
      const STYLE_ID$1 = "laplace-custom-chat-style";
      const USER_STYLE_ID = "laplace-custom-chat-user-style";
      const MAX_MESSAGES = CUSTOM_CHAT_MAX_MESSAGES;
      const VIRTUAL_OVERSCAN = 7;
      const DEFAULT_ROW_HEIGHT = 62;
      const LITE_ROW_HEIGHT = 42;
      const CARD_ROW_HEIGHT = 96;
      const CRITICAL_CARD_ROW_HEIGHT = 108;
      const COMPACT_CARD_ROW_HEIGHT = 70;
      let unsubscribeDom = null;
      let unsubscribeEvents = null;
      let unsubscribeWsStatus = null;
      let disposeSettings = null;
      let disposeComposer = null;
      let disposeActionsIsland = null;
      let fallbackMountTimer = null;
      let nativeEventObserver = null;
      let nativeEventObserverContainer = null;
      let nativeEventObserverSuspended = false;
      let root = null;
      let rootOutsideHistory = false;
      let rootUsesFallbackHost = false;
      let fallbackHost = null;
      let listEl = null;
      let virtualTopSpacer = null;
      let virtualItemsEl = null;
      let virtualBottomSpacer = null;
      let pauseBtn = null;
      let unreadBtn = null;
      let jumpBottomBtn = null;
      let searchInput = null;
      let matchCountEl = null;
      let wsStatusEl = null;
      let emptyEl = null;
      let perfEl = null;
      let debugEl = null;
      let textarea = null;
      let countEl = null;
      let styleEl$1 = null;
      let userStyleEl = null;
      let messageSeq = 0;
      let followMode = "following";
      let frozenSnapshot = null;
      let unread = 0;
      let sending = false;
      let searchQuery = "";
      let hasClearedMessages = false;
      let currentWsStatus = "off";
      let nativeDomWarning = false;
      const messages = [];
      const messageKeys = new Set();
      const recentEventKeys = new Map();
      const eventKeyByMessage = new WeakMap();
      const messageByEventKey = new Map();
      const RECENT_EVENT_KEYS_GC_THRESHOLD = 512;
      const renderQueue = [];
      let visibleMessages = [];
      const rowHeights = new Map();
      const eventTicks = [];
      const nativeHealthSamples = [];
      const seenNativeNodes = new WeakSet();
      const pendingNativeNodes = new Set();
      const sourceCounts = { dom: 0, ws: 0, local: 0 };
      let lastBatchSize = 0;
      let chatFrame = null;
      let nativeScanFrame = null;
      let nativeScanDebounceTimer = null;
      let pendingRenderFlush = false;
      let pendingRerender = null;
      let rerenderToken = 0;
      let emoticonRefreshToken = 0;
      let rootEventController = null;
      let rootEventDisposers = [];
      async function refreshCurrentRoomEmoticons() {
        const token = ++emoticonRefreshToken;
        try {
          const roomId = await ensureRoomId();
          if (token !== emoticonRefreshToken) return;
          await fetchEmoticons(roomId);
        } catch {
        }
      }
      function eventToSendableMessage$1(ev) {
        if (!ev.isReply) return ev.text;
        return ev.uname ? `@${ev.uname} ${ev.text}` : ev.text;
      }
      let signalListenerSupported = null;
      function detectSignalListenerSupport() {
        if (signalListenerSupported !== null) return signalListenerSupported;
        if (typeof AbortController === "undefined") {
          signalListenerSupported = false;
          return false;
        }
        try {
          let read = false;
          const probeOptions = {};
          Object.defineProperty(probeOptions, "signal", {
            get() {
              read = true;
              return void 0;
            }
          });
          const probeTarget = typeof document !== "undefined" ? document.createElement("div") : null;
          if (!probeTarget) {
            signalListenerSupported = false;
            return false;
          }
          probeTarget.addEventListener("test", () => {
          }, probeOptions);
          probeTarget.removeEventListener("test", () => {
          }, probeOptions);
          signalListenerSupported = read;
          return read;
        } catch {
          signalListenerSupported = false;
          return false;
        }
      }
      function getRootEventSignal() {
        if (typeof AbortController === "undefined") return void 0;
        rootEventController ??= new AbortController();
        return rootEventController.signal;
      }
      function abortRootEventListeners() {
        rootEventController?.abort();
        rootEventController = null;
        for (const dispose of rootEventDisposers) {
          try {
            dispose();
          } catch {
          }
        }
        rootEventDisposers = [];
      }
      function addRootEventListener(target, type, listener, options) {
        const eventListener = listener;
        if (detectSignalListenerSupport()) {
          target.addEventListener(type, eventListener, { ...options, signal: getRootEventSignal() });
          return;
        }
        target.addEventListener(type, eventListener, options);
        rootEventDisposers.push(() => target.removeEventListener(type, eventListener, options));
      }
      function makeButton(className, text, title, onClick) {
        const btn = document.createElement("button");
        btn.className = className;
        btn.textContent = text;
        prepareChatButton(btn, title);
        addRootEventListener(btn, "click", onClick);
        return btn;
      }
      function eventKey(event) {
        return `${event.kind}:${event.uid ?? ""}:${compactText(event.text).slice(0, 80)}`;
      }
      function eventKeyOf(message) {
        let key = eventKeyByMessage.get(message);
        if (key === void 0) {
          key = eventKey(message);
          eventKeyByMessage.set(message, key);
        }
        return key;
      }
      function messageKey(event) {
        return `${event.source}:${event.id}`;
      }
      function gcRecentEventKeys(now) {
        for (const [key, ts] of recentEventKeys) {
          if (now - ts > 9e3) recentEventKeys.delete(key);
        }
      }
      function rememberEvent(event) {
        const now = Date.now();
        if (recentEventKeys.size > RECENT_EVENT_KEYS_GC_THRESHOLD) {
          gcRecentEventKeys(now);
        }
        const key = eventKey(event);
        if (recentEventKeys.has(key)) return false;
        recentEventKeys.set(key, now);
        return true;
      }
      function messageIndexByEvent(event) {
        const key = eventKey(event);
        const existing = messageByEventKey.get(key);
        if (!existing) return -1;
        return messages.indexOf(existing);
      }
      function chooseBetterName(current, incoming) {
        const currentName = compactText(current);
        const incomingName = compactText(incoming);
        if (!incomingName) return current;
        if (!currentName || currentName === "匿名") return incoming;
        if (incomingName === "匿名") return current;
        if (incomingName.length > currentName.length && incomingName.includes(currentName)) return incoming;
        return current;
      }
      function mergeFields(current, incoming) {
        if (!incoming?.length) return current;
        if (!current?.length) return incoming;
        const merged = [...current];
        const keys = new Set(current.map((field) => field.key));
        for (const field of incoming) {
          if (keys.has(field.key)) continue;
          merged.push(field);
        }
        return merged;
      }
      function bestMergedBadges(currentBadges, incomingBadges) {
        const merged = [];
        let bestLevel = null;
        for (const raw of [...currentBadges, ...incomingBadges]) {
          const level = parseBadgeLevel(raw);
          if (level !== null) {
            if (level > 0 && (bestLevel === null || level > bestLevel)) bestLevel = level;
            continue;
          }
          if (!merged.includes(raw)) merged.push(raw);
        }
        if (bestLevel !== null) merged.push(formatBadgeLevel(bestLevel));
        return merged;
      }
      function mergeDuplicateEvent(current, incoming) {
        const preferIncomingIdentity = incoming.source === "ws" && current.source === "dom";
        const mergedBadges = bestMergedBadges(current.badges, incoming.badges);
        const mergedFields = mergeFields(current.fields, incoming.fields);
        const merged = {
          ...current,
          id: preferIncomingIdentity ? incoming.id : current.id,
          kind: current.kind === incoming.kind ? current.kind : incoming.kind,
          sendText: incoming.sendText ?? current.sendText,
          uname: chooseBetterName(current.uname, incoming.uname),
          uid: current.uid ?? incoming.uid,
          time: preferIncomingIdentity ? incoming.time : current.time,
          isReply: current.isReply || incoming.isReply,
          source: preferIncomingIdentity ? incoming.source : current.source,
          badges: mergedBadges,
          avatarUrl: incoming.avatarUrl ?? current.avatarUrl,
          amount: current.amount ?? incoming.amount,
          fields: mergedFields,
          rawCmd: incoming.rawCmd ?? current.rawCmd
        };
        const changed = merged.id !== current.id || merged.kind !== current.kind || merged.sendText !== current.sendText || merged.uname !== current.uname || merged.uid !== current.uid || merged.time !== current.time || merged.isReply !== current.isReply || merged.source !== current.source || merged.avatarUrl !== current.avatarUrl || merged.amount !== current.amount || merged.rawCmd !== current.rawCmd || merged.badges.length !== current.badges.length || merged.badges.some((badge, index) => badge !== current.badges[index]) || (merged.fields?.length ?? 0) !== (current.fields?.length ?? 0);
        return changed ? merged : null;
      }
      function replaceMessage(index, next) {
        const previous = messages[index];
        if (!previous) return;
        const prevKey = messageKey(previous);
        const nextKey = messageKey(next);
        const prevEventKey = eventKeyOf(previous);
        const nextEventKey = eventKey(next);
        eventKeyByMessage.set(next, nextEventKey);
        messages[index] = next;
        if (prevKey !== nextKey) {
          messageKeys.delete(prevKey);
          rowHeights.delete(prevKey);
          messageKeys.add(nextKey);
        }
        if (messageByEventKey.get(prevEventKey) === previous) {
          messageByEventKey.delete(prevEventKey);
        }
        messageByEventKey.set(nextEventKey, next);
        scheduleRerenderMessages();
      }
      function recordEventStats(event) {
        const now = Date.now();
        eventTicks.push(now);
        let dropCount = 0;
        while (dropCount < eventTicks.length && now - eventTicks[dropCount] > 1e3) dropCount++;
        if (dropCount > 0) eventTicks.splice(0, dropCount);
        sourceCounts[event.source]++;
      }
      function updatePerfDebug() {
        if (!perfEl || !root) return;
        root.dataset.debug = customChatPerfDebug.value ? "true" : "false";
        root.dataset.followMode = followMode;
        if (!customChatPerfDebug.value) {
          root.removeAttribute("data-inspecting");
          root.querySelectorAll(".lc-chat-message.lc-chat-selected").forEach((el) => {
            el.classList.remove("lc-chat-selected");
          });
          debugEl?.replaceChildren();
          return;
        }
        const totalSources = sourceCounts.dom + sourceCounts.ws + sourceCounts.local || 1;
        const pct = (value) => Math.round(value / totalSources * 100);
        const rendered = virtualItemsEl?.querySelectorAll(".lc-chat-message").length ?? 0;
        perfEl.textContent = `消息 ${messages.length}/${MAX_MESSAGES} | 可见 ${renderedMessages().length} | DOM节点 ${rendered} | 事件 ${eventTicks.length}/秒 | 本帧 ${lastBatchSize} | 待渲染 ${renderQueue.length} | DOM待扫 ${pendingNativeNodes.size} | WS ${pct(sourceCounts.ws)}% DOM ${pct(sourceCounts.dom)}% 本地 ${pct(sourceCounts.local)}%`;
      }
      function isReliableEvent(event) {
        if (shouldSuppressCustomChatEvent(event)) return false;
        const text = compactText(event.text);
        if (isNoiseEventText(text)) return false;
        if (event.source === "dom" && displayName(event) === "匿名" && !event.uid && !event.avatarUrl && text.length <= 2)
          return false;
        return true;
      }
      function shouldShowUserLevelBadge(message) {
        return message.kind === "danmaku";
      }
      function normalizedUserLevelBadge(message, name = displayName(message)) {
        if (!shouldShowUserLevelBadge(message)) return null;
        for (const raw of message.badges) {
          const text = usefulBadgeText(raw, name);
          const level = text ? parseBadgeLevel(text) : parseBadgeLevel(raw);
          if (level !== null) return formatBadgeLevel(level);
        }
        return null;
      }
      function displayName(message) {
        let name = cleanDisplayName(message.uname) || "匿名";
        for (const raw of message.badges) {
          const badge = compactText(raw);
          if (badge && name.startsWith(`${badge} `)) {
            name = cleanDisplayName(name.slice(badge.length));
          }
        }
        const medalPrefix = name.match(/^[^\s:：]{1,10}\s+\d{1,3}\s+(.{1,32})$/);
        const medalName = cleanDisplayName(medalPrefix?.[1] ?? "");
        if (medalName && !isBadDisplayName(medalName)) name = medalName;
        name = cleanDisplayName(name);
        if (isBadDisplayName(name)) return "匿名";
        return name || "匿名";
      }
      function normalizeBadges(message, name = displayName(message)) {
        const normalized = [];
        const userLevelBadge = normalizedUserLevelBadge(message, name);
        const maxOtherBadges = userLevelBadge ? 1 : 2;
        for (const raw of message.badges) {
          const text = usefulBadgeText(raw, name);
          if (!text) continue;
          if (parseBadgeLevel(text) !== null) continue;
          if (text === name || name.includes(text)) continue;
          if (normalized.includes(text)) continue;
          const parts = text.split(/\s+/).filter(Boolean);
          if (parts.length === 1 && normalized.some((item) => item.includes(text))) continue;
          if (parts.length > 1) {
            for (let i2 = normalized.length - 1; i2 >= 0; i2--) {
              if (/^\d{1,3}$/.test(normalized[i2]) && text.includes(normalized[i2])) normalized.splice(i2, 1);
            }
          }
          normalized.push(text);
          if (normalized.length >= maxOtherBadges) break;
        }
        if (userLevelBadge && !normalized.includes(userLevelBadge)) normalized.push(userLevelBadge);
        return normalized;
      }
      function guardLevel(message) {
        const value = `${message.text} ${message.badges.join(" ")} ${message.rawCmd ?? ""}`;
        if (/总督|GUARD\s*1|舰队\s*1|privilege[_-]?type["':\s]*1/i.test(value)) return "1";
        if (/提督|GUARD\s*2|舰队\s*2|privilege[_-]?type["':\s]*2/i.test(value)) return "2";
        if (/舰长|GUARD\s*3|舰队\s*3|privilege[_-]?type["':\s]*3/i.test(value)) return "3";
        return null;
      }
      function cardType(message) {
        if (message.kind === "superchat") return "superchat";
        if (message.kind === "gift") return "gift";
        if (message.kind === "guard") return "guard";
        if (message.kind === "redpacket") return "redpacket";
        if (message.kind === "lottery") return "lottery";
        return null;
      }
      function cardTitle(type, message, guard) {
        if (type === "superchat") return message.amount ? `醒目留言 ¥${message.amount}` : "醒目留言";
        if (type === "gift") return message.amount ? `礼物 ¥${Math.round(message.amount / 1e3)}` : "礼物事件";
        if (type === "redpacket") return "红包事件";
        if (type === "lottery") return "天选时刻";
        if (guard === "1") return "总督事件";
        if (guard === "2") return "提督事件";
        return "舰长事件";
      }
      function cardMark(type, guard) {
        if (type === "superchat") return "SC";
        if (type === "gift") return "礼物";
        if (type === "redpacket") return "红包";
        if (type === "lottery") return "天选";
        if (guard === "1") return "总督";
        if (guard === "2") return "提督";
        return "舰长";
      }
      function formatAmount(message, card) {
        if (!message.amount) return "";
        if (card === "gift" || card === "guard") return formatMilliyuanAmount(message.amount);
        if (card === "gift" || card === "guard") return `¥${Math.round(message.amount / 1e3)}`;
        return `¥${message.amount}`;
      }
      function cardFields(message, card, guard) {
        const fields = message.fields?.filter((field) => field.value) ?? [];
        if (fields.length > 0) return fields;
        const fallback = [];
        const amount = formatAmount(message, card);
        if (card === "superchat" && amount) fallback.push({ key: "sc-price", label: "金额", value: amount, kind: "money" });
        if (card === "gift") {
          const giftMatch = message.text.match(/(.+?)\s*x\s*(\d+)/i);
          if (giftMatch?.[1])
            fallback.push({
              key: "gift-name",
              label: "礼物",
              value: giftMatch[1].replace(/^.*?(投喂|赠送|送出)\s*/, ""),
              kind: "text"
            });
          if (giftMatch?.[2]) fallback.push({ key: "gift-count", label: "数量", value: `x${giftMatch[2]}`, kind: "count" });
          if (amount) fallback.push({ key: "gift-price", label: "金额", value: amount, kind: "money" });
        }
        if (card === "guard") {
          const level = guard === "1" ? "总督" : guard === "2" ? "提督" : "舰长";
          fallback.push({ key: "guard-level", label: "等级", value: level, kind: "level" });
          const month = message.text.match(/x\s*(\d+)/i)?.[1];
          if (month) fallback.push({ key: "guard-months", label: "月份", value: `${month}个月`, kind: "duration" });
          if (amount) fallback.push({ key: "guard-price", label: "金额", value: amount, kind: "money" });
        }
        return fallback;
      }
      function createAvatar(message) {
        const wrap = document.createElement("div");
        wrap.className = "lc-chat-avatar lc-chat-avatar-fallback";
        wrap.title = message.uid ? `UID ${message.uid}` : message.uname;
        const avatar = message.avatarUrl || resolveAvatarUrl(message.uid);
        if (!avatar) return wrap;
        const img = document.createElement("img");
        img.className = "lc-chat-avatar-img";
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        img.decoding = "sync";
        img.src = avatar;
        if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
          img.dataset.loaded = "1";
        } else {
          addRootEventListener(img, "load", () => img.setAttribute("data-loaded", "1"), { once: true });
        }
        addRootEventListener(img, "error", () => img.remove(), { once: true });
        wrap.append(img);
        return wrap;
      }
      function recordNativeHealth(parsed) {
        const now = Date.now();
        nativeHealthSamples.push({ ts: now, parsed });
        while (nativeHealthSamples.length > 0 && now - nativeHealthSamples[0].ts > NATIVE_HEALTH_WINDOW) {
          nativeHealthSamples.shift();
        }
        const unhealthy = isNativeDomUnhealthy(nativeHealthSamples, NATIVE_HEALTH_MIN_SCANS, NATIVE_HEALTH_MAX_EVENTS);
        if (nativeDomWarning === unhealthy) return;
        nativeDomWarning = unhealthy;
        updateWsStatus(currentWsStatus);
      }
      function kindVisible(kind) {
        if (kind === "danmaku") return customChatShowDanmaku.value;
        if (kind === "gift") return customChatShowGift.value;
        if (kind === "superchat") return customChatShowSuperchat.value;
        if (kind === "guard" || kind === "enter" || kind === "follow" || kind === "like" || kind === "share")
          return customChatShowEnter.value;
        if (kind === "redpacket" || kind === "lottery" || kind === "notice" || kind === "system")
          return customChatShowNotice.value;
        return true;
      }
      function messageMatchesSearch(message) {
        return messageMatchesCustomChatSearch(message, searchQuery, kindVisible);
      }
      function searchHint() {
        return customChatSearchHint(searchQuery);
      }
      function isFollowing() {
        return followMode === "following";
      }
      function renderedMessages() {
        return frozenSnapshot?.messages ?? visibleMessages;
      }
      function renderedRowHeights() {
        return frozenSnapshot?.rowHeights ?? rowHeights;
      }
      function snapshotFromLive(scrollTop = listEl?.scrollTop ?? 0) {
        return {
          messages: [...visibleMessages],
          rowHeights: new Map(rowHeights),
          scrollTop
        };
      }
      function syncFrozenSnapshotFromLive() {
        if (isFollowing()) return;
        frozenSnapshot = snapshotFromLive(listEl?.scrollTop ?? frozenSnapshot?.scrollTop ?? 0);
      }
      function enterFrozenMode(mode) {
        if (isFollowing()) {
          frozenSnapshot = snapshotFromLive();
        } else if (frozenSnapshot && listEl) {
          frozenSnapshot.scrollTop = listEl.scrollTop;
        }
        followMode = mode;
        updateUnread();
      }
      function resumeFollowing(behavior = "smooth") {
        followMode = "following";
        frozenSnapshot = null;
        unread = 0;
        updateUnread();
        scrollToBottom(behavior);
      }
      function renderedMessageCount() {
        return renderedMessages().length;
      }
      function updateEmptyState() {
        if (!listEl || !emptyEl) return;
        const visibleCount = renderedMessageCount();
        if (visibleCount > 0) {
          emptyEl.remove();
          return;
        }
        const trimmedQuery = searchQuery.trim();
        const hint = searchHint();
        if (trimmedQuery) {
          emptyEl.textContent = hint || `没有找到匹配“${trimmedQuery}”的消息`;
        } else if (hasClearedMessages) {
          emptyEl.textContent = "已清屏，新的弹幕会继续出现在这里";
        } else {
          emptyEl.textContent = "还没有收到消息";
        }
        if (!emptyEl.isConnected) listEl.append(emptyEl);
      }
      function wsStatusLabel(status) {
        if (nativeDomWarning && (status === "error" || status === "closed" || status === "off"))
          return "页面兜底疑似失效，B站页面结构可能变了";
        if (status === "connecting") return "实时事件源连接中";
        if (status === "live") return "实时事件源正常";
        if (status === "error") return "直连异常，使用页面兜底，可能漏消息";
        if (status === "closed") return "直连已断开，使用页面兜底，可能漏消息";
        return "实时事件源关闭";
      }
      function updateWsStatus(status) {
        currentWsStatus = status;
        syncNativeObserverWithWsStatus();
        if (!wsStatusEl) return;
        wsStatusEl.textContent = wsStatusLabel(status);
        wsStatusEl.dataset.status = nativeDomWarning && (status === "error" || status === "closed" || status === "off") ? "dom-warning" : status === "error" || status === "closed" ? "fallback" : status;
      }
      function updateMatchCount() {
        if (!matchCountEl) return;
        if (!searchQuery.trim()) {
          matchCountEl.textContent = "";
          matchCountEl.style.display = "none";
          return;
        }
        const hint = searchHint();
        if (hint) {
          matchCountEl.textContent = hint;
          matchCountEl.style.display = "";
          return;
        }
        const count = messages.filter(messageMatchesSearch).length;
        matchCountEl.textContent = `${count}/${messages.length}`;
        matchCountEl.style.display = "";
      }
      function updateUnread() {
        if (pauseBtn) {
          const frozen = !isFollowing();
          pauseBtn.textContent = frozen ? "恢复跟随" : "暂停";
          pauseBtn.title = frozen ? "恢复自动跟随并跳到底部" : "暂停自动跟随，停留在当前聊天位置";
          pauseBtn.setAttribute("aria-pressed", frozen ? "true" : "false");
        }
        if (unreadBtn) {
          if (isFollowing()) {
            unreadBtn.textContent = "";
            unreadBtn.style.display = "none";
            unreadBtn.dataset.frozen = "false";
          } else {
            unreadBtn.textContent = unread > 0 ? `${unread} 条新消息，点击回到底部` : followMode === "frozenByButton" ? "已手动暂停跟随" : "正在浏览历史";
            unreadBtn.title = "恢复自动跟随并跳到底部";
            unreadBtn.style.display = "";
            unreadBtn.dataset.frozen = "true";
          }
        }
        if (jumpBottomBtn) {
          if (isFollowing()) {
            jumpBottomBtn.style.display = "none";
            jumpBottomBtn.dataset.unread = "0";
          } else {
            jumpBottomBtn.style.display = "";
            jumpBottomBtn.dataset.unread = unread > 0 ? "true" : "false";
            jumpBottomBtn.textContent = unread > 0 ? `新消息 ${unread} ↓` : "回到最新 ↓";
            jumpBottomBtn.title = "回到底部并恢复自动跟随";
          }
        }
        updatePerfDebug();
      }
      function isNearBottom() {
        if (!listEl) return true;
        return virtualContentHeight() - listEl.scrollTop - listEl.clientHeight < 80;
      }
      function syncAutoFollowFromScroll() {
        if (!listEl) return;
        if (frozenSnapshot) frozenSnapshot.scrollTop = listEl.scrollTop;
        const nearBottom = isNearBottom();
        if (isFollowing()) {
          if (!nearBottom) enterFrozenMode("frozenByScroll");
          return;
        }
        if (followMode === "frozenByScroll" && nearBottom) {
          resumeFollowing();
          return;
        }
        updateUnread();
      }
      function scrollToBottom(behavior = "auto") {
        if (!listEl) return;
        const top = Math.max(0, virtualContentHeight() - listEl.clientHeight);
        listEl.scrollTo({ top, behavior });
        if (behavior === "auto") renderVirtualWindow();
      }
      function scrollListByWheel(event) {
        if (!listEl || renderedMessages().length === 0) return;
        const delta = normalizeWheelDelta(event);
        if (delta === 0) return;
        event.preventDefault();
        const maxTop = Math.max(0, virtualContentHeight() - listEl.clientHeight);
        const nextTop = Math.max(0, Math.min(maxTop, listEl.scrollTop + delta));
        if (Math.abs(nextTop - listEl.scrollTop) < 0.5) return;
        listEl.scrollTop = nextTop;
        renderVirtualWindow();
        syncAutoFollowFromScroll();
      }
      function pruneMessages() {
        if (messages.length <= MAX_MESSAGES) {
          updatePerfDebug();
          return;
        }
        const dropCount = messages.length - MAX_MESSAGES;
        const removed = messages.splice(0, dropCount);
        for (const message of removed) {
          const key = messageKey(message);
          messageKeys.delete(key);
          rowHeights.delete(key);
          const ek = eventKeyByMessage.get(message);
          if (ek !== void 0 && messageByEventKey.get(ek) === message) {
            messageByEventKey.delete(ek);
          }
        }
        updatePerfDebug();
      }
      function estimatedRowHeight(message) {
        const card = cardType(message);
        const priority = customChatPriority(message);
        if (priority === "lite") return LITE_ROW_HEIGHT;
        if (card === "gift" && !message.amount) return COMPACT_CARD_ROW_HEIGHT;
        if (priority === "critical") return CRITICAL_CARD_ROW_HEIGHT;
        if (card) return CARD_ROW_HEIGHT;
        return DEFAULT_ROW_HEIGHT + Math.max(0, Math.ceil(message.text.length / 34) - 1) * 18;
      }
      function rowHeight(message) {
        return renderedRowHeights().get(messageKey(message)) ?? estimatedRowHeight(message);
      }
      function virtualContentHeight(end = renderedMessages().length) {
        const items = renderedMessages();
        return calculateVirtualContentHeight(items.length, (index) => rowHeight(items[index]), end);
      }
      function setSpacerHeight(spacer, height) {
        if (!spacer) return;
        spacer.style.height = `${Math.max(0, Math.round(height))}px`;
      }
      function refreshVisibleMessages() {
        visibleMessages = visibleRenderMessages(messages, messageMatchesSearch);
      }
      function createMessageRow(message, animate = false, virtualIndex = 0) {
        const row = document.createElement("div");
        const priority = customChatPriority(message);
        row.className = animate ? "lc-chat-message lc-chat-peek" : "lc-chat-message";
        row.dataset.uid = message.uid ?? "";
        row.dataset.kind = message.kind;
        row.dataset.source = message.source;
        row.dataset.user = displayName(message);
        row.dataset.priority = priority;
        row.dataset.virtualIndex = String(virtualIndex);
        row.setAttribute("role", "listitem");
        row.tabIndex = 0;
        const guard = guardLevel(message);
        const card = cardType(message);
        if (priority === "lite") row.classList.add("lc-chat-lite-event");
        if (card) {
          row.classList.add("lc-chat-card-event");
          row.dataset.card = card;
        }
        if (card === "gift" && !message.amount) row.classList.add("lc-chat-card-compact");
        if (guard) row.dataset.guard = guard;
        addRootEventListener(row, "click", (e2) => {
          if (!customChatPerfDebug.value) return;
          const target = e2.target;
          if (target instanceof HTMLElement && target.closest("button")) return;
          showEventDebug(message, row, card, guard);
        });
        const avatarEl = createAvatar(message);
        const meta = document.createElement("div");
        meta.className = "lc-chat-meta";
        const kind = document.createElement("span");
        kind.className = "lc-chat-badge lc-chat-kind";
        kind.dataset.kind = message.kind;
        setChatText(kind, kindLabel(message.kind));
        const name = document.createElement("span");
        name.className = "lc-chat-name";
        const shownName = displayName(message);
        setChatText(name, shownName);
        const time = document.createElement("span");
        time.className = "lc-chat-time";
        setChatText(time, message.time);
        if (message.kind !== "danmaku") meta.append(kind);
        meta.append(name, time);
        if (message.isReply) {
          const reply = document.createElement("span");
          reply.className = "lc-chat-reply";
          reply.textContent = "回复";
          meta.append(reply);
        }
        for (const badgeText of normalizeBadges(message, shownName)) {
          const badgeType = customChatBadgeType(badgeText);
          const badge = document.createElement("span");
          badge.className = `lc-chat-badge lc-chat-medal lc-chat-badge-${badgeType}`;
          badge.dataset.badge = badgeText;
          badge.dataset.badgeType = badgeType;
          setChatText(badge, badgeText);
          meta.append(badge);
        }
        const actions = document.createElement("div");
        actions.className = "lc-chat-actions";
        if (message.sendText) {
          actions.append(
            makeButton("lc-chat-action", "偷", "偷到发送框并复制", () => void stealDanmaku(message.sendText ?? message.text)),
            makeButton("lc-chat-action", "+1", "+1 发送", (e2) => {
              void repeatDanmaku(message.sendText ?? message.text, {
                confirm: danmakuDirectConfirm.value,
                anchor: { x: e2.clientX, y: e2.clientY }
              });
            })
          );
        }
        actions.append(
          makeButton("lc-chat-action", "复制", "复制事件文本", () => void copyText(message.sendText ?? message.text))
        );
        const body = document.createElement("div");
        body.className = "lc-chat-body";
        const text = document.createElement("div");
        text.className = "lc-chat-bubble lc-chat-text";
        if (card) {
          const head = document.createElement("div");
          head.className = "lc-chat-card-head";
          const title = document.createElement("span");
          title.className = "lc-chat-card-title";
          setChatText(title, cardTitle(card, message, guard));
          const mark = document.createElement("span");
          mark.className = "lc-chat-card-mark";
          setChatText(mark, cardMark(card, guard));
          const content = document.createElement("span");
          content.className = "lc-chat-card-text";
          setChatText(content, message.text);
          const fields = cardFields(message, card, guard).slice(0, 3);
          const fieldsEl = document.createElement("div");
          fieldsEl.className = "lc-chat-card-fields";
          for (const field of fields) {
            const fieldEl = document.createElement("span");
            fieldEl.className = "lc-chat-card-field";
            fieldEl.dataset.field = field.key;
            if (field.kind) fieldEl.dataset.kind = field.kind;
            const label = document.createElement("span");
            label.className = "lc-chat-card-field-label";
            setChatText(label, field.label);
            const value = document.createElement("span");
            value.className = "lc-chat-card-field-value";
            setChatText(value, field.value);
            fieldEl.append(label, value);
            fieldsEl.append(fieldEl);
          }
          head.append(title, mark);
          text.append(head);
          if (fields.length > 0) text.append(fieldsEl);
          text.append(content);
        } else if (message.emoticonImage?.url) {
          const img = document.createElement("img");
          img.className = "lc-chat-emote-big";
          img.dataset.emoteKind = "big";
          img.src = message.emoticonImage.url;
          img.alt = message.emoticonImage.alt;
          img.title = message.emoticonImage.alt;
          img.loading = "lazy";
          img.decoding = "async";
          text.replaceChildren(img);
        } else {
          setChatText(text, message.text);
        }
        body.append(meta, text);
        row.append(avatarEl, body, actions);
        return row;
      }
      function virtualRange() {
        const items = renderedMessages();
        return calculateVirtualRange({
          itemCount: items.length,
          scrollTop: listEl?.scrollTop ?? 0,
          viewportHeight: listEl?.clientHeight ?? 0,
          overscan: VIRTUAL_OVERSCAN,
          rowHeight: (index) => rowHeight(items[index])
        });
      }
      function measureRenderedRows() {
        if (!virtualItemsEl) return;
        const items = renderedMessages();
        const heights = renderedRowHeights();
        let changed = false;
        for (const row of virtualItemsEl.querySelectorAll(".lc-chat-message")) {
          const index = Number(row.dataset.virtualIndex);
          const message = items[index];
          if (!message) continue;
          const measured = Math.ceil(row.getBoundingClientRect().height);
          if (measured <= 0) continue;
          const key = messageKey(message);
          if (Math.abs((heights.get(key) ?? 0) - measured) > 2) {
            heights.set(key, measured);
            changed = true;
          }
        }
        if (changed) {
          const range = virtualRange();
          setSpacerHeight(virtualTopSpacer, range.top);
          setSpacerHeight(virtualBottomSpacer, range.total - range.bottom);
        }
      }
      function renderVirtualWindow(animateKeys = new Set()) {
        if (!listEl || !virtualItemsEl) return;
        const items = renderedMessages();
        if (items.length === 0) {
          virtualItemsEl.replaceChildren();
          setSpacerHeight(virtualTopSpacer, 0);
          setSpacerHeight(virtualBottomSpacer, 0);
          updateEmptyState();
          updatePerfDebug();
          return;
        }
        emptyEl?.remove();
        const activeKey = document.activeElement instanceof HTMLElement ? document.activeElement.closest(".lc-chat-message")?.dataset.key : void 0;
        const range = virtualRange();
        const rows = [];
        for (let index = range.start; index < range.end; index++) {
          const message = items[index];
          const key = messageKey(message);
          const row = createMessageRow(message, animateKeys.has(key), index);
          row.dataset.key = key;
          rows.push(row);
        }
        virtualItemsEl.replaceChildren(...rows);
        setSpacerHeight(virtualTopSpacer, range.top);
        setSpacerHeight(virtualBottomSpacer, range.total - range.bottom);
        if (activeKey) {
          for (const row of virtualItemsEl.querySelectorAll(".lc-chat-message")) {
            if (row.dataset.key === activeKey) {
              row.focus();
              break;
            }
          }
        }
        measureRenderedRows();
        updateEmptyState();
        updatePerfDebug();
      }
      function scrollToVirtualIndex(index) {
        const items = renderedMessages();
        if (!listEl || items.length === 0) return;
        const clamped = Math.max(0, Math.min(items.length - 1, index));
        const top = virtualContentHeight(clamped);
        listEl.scrollTo({ top: Math.max(0, top - 10), behavior: "auto" });
        renderVirtualWindow();
        virtualItemsEl?.querySelector(`.lc-chat-message[data-virtual-index="${clamped}"]`)?.focus();
      }
      function clearMessages() {
        messages.length = 0;
        messageKeys.clear();
        messageByEventKey.clear();
        renderQueue.length = 0;
        visibleMessages = [];
        rowHeights.clear();
        unread = 0;
        followMode = "following";
        frozenSnapshot = null;
        hasClearedMessages = true;
        virtualItemsEl?.replaceChildren();
        setSpacerHeight(virtualTopSpacer, 0);
        setSpacerHeight(virtualBottomSpacer, 0);
        updateUnread();
        updateMatchCount();
        updateEmptyState();
      }
      function restoreFrozenScrollPosition() {
        if (!listEl || !frozenSnapshot) return;
        const maxTop = Math.max(0, virtualContentHeight() - listEl.clientHeight);
        const top = Math.max(0, Math.min(maxTop, frozenSnapshot.scrollTop));
        if (Math.abs(top - listEl.scrollTop) > 0.5) listEl.scrollTop = top;
        frozenSnapshot.scrollTop = top;
      }
      function rerenderMessages(options = {}) {
        if (!listEl || !virtualItemsEl) return;
        pruneMessages();
        refreshVisibleMessages();
        if (!isFollowing()) {
          if (options.refreshFrozenSnapshot || !frozenSnapshot) syncFrozenSnapshotFromLive();
          restoreFrozenScrollPosition();
        }
        renderVirtualWindow();
        updateMatchCount();
        updateEmptyState();
        if (isFollowing()) scrollToBottom();
      }
      function requestChatFrame() {
        if (chatFrame !== null) return;
        chatFrame = window.requestAnimationFrame(() => {
          chatFrame = null;
          const shouldFlushRender = pendingRenderFlush;
          const rerender = pendingRerender;
          pendingRenderFlush = false;
          pendingRerender = null;
          if (shouldFlushRender) flushRenderQueue();
          if (rerender) runScheduledRerender(rerender);
        });
      }
      function runScheduledRerender(rerender) {
        if (!listEl || rerender.token !== rerenderToken) return;
        refreshVisibleMessages();
        if (!isFollowing()) {
          if (rerender.refreshFrozenSnapshot || !frozenSnapshot) syncFrozenSnapshotFromLive();
          restoreFrozenScrollPosition();
        }
        renderVirtualWindow();
        updateMatchCount();
        updatePerfDebug();
        updateEmptyState();
        if (isFollowing()) scrollToBottom();
      }
      function scheduleRerenderMessages(options = {}) {
        rerenderToken++;
        const token = rerenderToken;
        pendingRerender = {
          token,
          refreshFrozenSnapshot: !!options.refreshFrozenSnapshot || !!pendingRerender?.refreshFrozenSnapshot
        };
        requestChatFrame();
      }
      function flushRenderQueue() {
        if (!listEl || renderQueue.length === 0) return;
        const batch = takeRenderBatch(renderQueue);
        lastBatchSize = batch.length;
        const shouldStickToBottom = isFollowing() && isNearBottom();
        const animate = isFollowing() && shouldAnimateRenderBatch(batch.length);
        const animateKeys = new Set();
        let matched = 0;
        for (const event of batch) {
          if (!messageKeys.has(messageKey(event))) continue;
          if (!messageMatchesSearch(event)) continue;
          matched++;
          if (animate) animateKeys.add(messageKey(event));
        }
        refreshVisibleMessages();
        if (isFollowing()) renderVirtualWindow(animateKeys);
        if (renderQueue.length > 0) {
          pendingRenderFlush = true;
          requestChatFrame();
        }
        if (matched === 0) {
          updateMatchCount();
          updatePerfDebug();
          updateEmptyState();
          return;
        }
        pruneMessages();
        if (!shouldStickToBottom) {
          if (isFollowing()) enterFrozenMode("frozenByScroll");
          unread += matched;
          updateUnread();
        } else {
          scrollToBottom();
        }
        updateMatchCount();
        updatePerfDebug();
        updateEmptyState();
      }
      function scheduleRender(event) {
        renderQueue.push(event);
        trimRenderQueue(renderQueue);
        updatePerfDebug();
        pendingRenderFlush = true;
        requestChatFrame();
      }
      async function sendFromComposer() {
        if (!textarea || sending) return;
        const text = textarea.value;
        sending = true;
        const sendBtn = root?.querySelector(".lc-chat-send");
        if (sendBtn) sendBtn.disabled = true;
        const sent = await sendManualDanmaku(text);
        if (sent) {
          textarea.value = "";
          fasongText.value = "";
          updateCount();
        }
        sending = false;
        if (sendBtn) sendBtn.disabled = false;
      }
      function updateCount() {
        if (countEl && textarea) countEl.textContent = String(textarea.value.length);
      }
      function syncComposerFromStore() {
        if (!textarea || textarea.value === fasongText.value) return;
        textarea.value = fasongText.value;
        updateCount();
      }
      function isNativeSendBox(el) {
        return !!el.querySelector(
          'input[type="text"], textarea, input:not([type="submit"]):not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="range"]):not([type="number"]):not([type="button"]):not([type="image"]):not([type="reset"]):not([type="file"]):not([type="color"])'
        );
      }
      function isNativeChatHistory(el) {
        return el.classList.contains("chat-history-panel") || el.classList.contains("chat-room") || typeof el.className === "string" && el.className.includes("chat-history");
      }
      function applyHide(el, shouldHide) {
        if (shouldHide && !el.dataset.lcHidden) {
          el.dataset.lcHidden = "true";
          el.style.display = "none";
        } else if (!shouldHide && el.dataset.lcHidden) {
          delete el.dataset.lcHidden;
          el.style.display = "";
        }
      }
      function hideSiblingNativeElements(hideSendBox, hideNative) {
        const host = root?.parentElement;
        if (!host) return;
        for (const el of Array.from(host.children)) {
          if (!(el instanceof HTMLElement) || el.id === ROOT_ID) continue;
          const isSendBox = isNativeSendBox(el);
          const isChatHistory = isNativeChatHistory(el);
          const shouldHide = hideSendBox && isSendBox || hideNative && (isChatHistory || isSendBox);
          applyHide(el, shouldHide);
        }
      }
      function updateNativeVisibility() {
        const mounted = !!root?.isConnected && !!root.querySelector(".lc-chat-composer");
        const nativeMounted = mounted && !rootUsesFallbackHost;
        const shouldHideNative = nativeMounted && customChatHideNative.value;
        document.documentElement.classList.toggle("lc-custom-chat-mounted", nativeMounted);
        document.documentElement.classList.toggle("lc-custom-chat-root-outside-history", nativeMounted && rootOutsideHistory);
        document.documentElement.classList.toggle("lc-custom-chat-hide-native", shouldHideNative);
        hideSiblingNativeElements(nativeMounted, shouldHideNative);
      }
      function appendDebugRow(parent, key, value) {
        const row = document.createElement("div");
        row.className = "lc-chat-debug-row";
        const keyEl = document.createElement("span");
        keyEl.className = "lc-chat-debug-key";
        setChatText(keyEl, key);
        const valueEl = document.createElement("span");
        valueEl.className = "lc-chat-debug-value";
        setChatText(valueEl, value || "-");
        row.append(keyEl, valueEl);
        parent.append(row);
      }
      function showEventDebug(message, row, card, guard) {
        if (!root || !debugEl) return;
        root.querySelectorAll(".lc-chat-message.lc-chat-selected").forEach((el) => {
          if (el !== row) el.classList.remove("lc-chat-selected");
        });
        row.classList.add("lc-chat-selected");
        root.dataset.inspecting = "true";
        debugEl.replaceChildren();
        const head = document.createElement("div");
        head.className = "lc-chat-debug-head";
        const title = document.createElement("span");
        title.className = "lc-chat-debug-title";
        setChatText(title, "事件调试");
        const close = makeButton("lc-chat-debug-close", "关闭", "关闭事件调试", () => {
          root?.removeAttribute("data-inspecting");
          row.classList.remove("lc-chat-selected");
          debugEl?.replaceChildren();
        });
        head.append(title, close);
        debugEl.append(head);
        appendDebugRow(debugEl, "id", message.id);
        appendDebugRow(debugEl, "data-kind", message.kind);
        appendDebugRow(debugEl, "data-card", card ?? "");
        appendDebugRow(debugEl, "data-guard", guard ?? "");
        appendDebugRow(debugEl, "priority", customChatPriority(message));
        appendDebugRow(debugEl, "source", message.source);
        appendDebugRow(debugEl, "uid", message.uid ?? "");
        appendDebugRow(debugEl, "raw cmd", message.rawCmd ?? "");
        appendDebugRow(debugEl, "fields", (message.fields ?? []).map((field) => `${field.key}=${field.value}`).join(" | "));
      }
      function createRoot() {
        const panel = document.createElement("section");
        panel.id = ROOT_ID;
        panel.dataset.theme = customChatTheme.value;
        panel.dataset.debug = customChatPerfDebug.value ? "true" : "false";
        const toolbar = document.createElement("div");
        toolbar.className = "lc-chat-toolbar";
        const spacer = document.createElement("span");
        spacer.className = "lc-chat-icon";
        spacer.setAttribute("aria-hidden", "true");
        spacer.style.visibility = "hidden";
        const title = document.createElement("div");
        title.className = "lc-chat-title";
        title.textContent = "直播聊天";
        const menuBtn = makeButton("lc-chat-icon", "…", "聊天工具", () => {
          panel.classList.toggle("lc-chat-menu-open");
        });
        menuBtn.setAttribute("aria-label", "聊天工具");
        const menu = document.createElement("div");
        menu.className = "lc-chat-menu";
        pauseBtn = makeButton("lc-chat-pill", "暂停", "暂停自动跟随", () => {
          if (isFollowing()) {
            enterFrozenMode("frozenByButton");
            return;
          }
          resumeFollowing();
        });
        unreadBtn = makeButton("lc-chat-pill lc-chat-unread", "", "恢复自动跟随并跳到底部", () => {
          resumeFollowing();
        });
        unreadBtn.style.display = "none";
        matchCountEl = document.createElement("span");
        matchCountEl.className = "lc-chat-hint";
        matchCountEl.style.display = "none";
        wsStatusEl = document.createElement("span");
        wsStatusEl.className = "lc-chat-ws-status";
        updateWsStatus(currentWsStatus);
        perfEl = document.createElement("div");
        perfEl.className = "lc-chat-perf";
        updatePerfDebug();
        searchInput = document.createElement("input");
        searchInput.type = "search";
        searchInput.className = "lc-chat-search";
        searchInput.placeholder = "搜索 user:名 kind:gift -词";
        searchInput.setAttribute("aria-label", "搜索直播聊天消息");
        searchInput.value = searchQuery;
        let searchInputTimer = null;
        addRootEventListener(searchInput, "input", () => {
          if (searchInputTimer !== null) clearTimeout(searchInputTimer);
          searchInputTimer = setTimeout(() => {
            searchInputTimer = null;
            searchQuery = searchInput?.value ?? "";
            unread = 0;
            scheduleRerenderMessages({ refreshFrozenSnapshot: true });
            updateUnread();
          }, 120);
        });
        const clearBtn = makeButton("lc-chat-pill", "清屏", "清空自定义评论区", clearMessages);
        const filterbar = document.createElement("div");
        filterbar.className = "lc-chat-filterbar";
        const filters = [
          ["danmaku", "弹幕", customChatShowDanmaku],
          ["gift", "礼物", customChatShowGift],
          ["superchat", "SC", customChatShowSuperchat],
          ["enter", "进场", customChatShowEnter],
          ["notice", "通知", customChatShowNotice]
        ];
        for (const [, label, signal] of filters) {
          const btn = makeButton("lc-chat-filter", label, `显示/隐藏${label}`, () => {
            signal.value = !signal.value;
            btn.setAttribute("aria-pressed", signal.value ? "true" : "false");
            scheduleRerenderMessages({ refreshFrozenSnapshot: true });
          });
          btn.setAttribute("aria-pressed", signal.value ? "true" : "false");
          filterbar.append(btn);
        }
        const searchRow = document.createElement("div");
        searchRow.className = "lc-chat-menu-row";
        searchRow.append(searchInput, matchCountEl);
        const controlRow = document.createElement("div");
        controlRow.className = "lc-chat-menu-row";
        controlRow.append(pauseBtn, unreadBtn, clearBtn);
        const statusRow = document.createElement("div");
        statusRow.className = "lc-chat-menu-row";
        const statusLabel2 = document.createElement("span");
        statusLabel2.className = "lc-chat-menu-label";
        statusLabel2.textContent = "状态";
        statusRow.append(statusLabel2, wsStatusEl);
        const filterLabel = document.createElement("span");
        filterLabel.className = "lc-chat-menu-label";
        filterLabel.textContent = "显示";
        const filterRow = document.createElement("div");
        filterRow.className = "lc-chat-menu-row";
        filterRow.append(filterLabel, filterbar);
        menu.append(searchRow, controlRow, filterRow, statusRow, perfEl);
        toolbar.append(spacer, title, menuBtn);
        debugEl = document.createElement("div");
        debugEl.className = "lc-chat-event-debug";
        listEl = document.createElement("div");
        listEl.className = "lc-chat-list";
        listEl.tabIndex = 0;
        listEl.setAttribute("role", "log");
        listEl.setAttribute("aria-live", "polite");
        listEl.setAttribute("aria-label", "直播聊天消息");
        virtualTopSpacer = document.createElement("div");
        virtualTopSpacer.className = "lc-chat-virtual-spacer";
        virtualItemsEl = document.createElement("div");
        virtualItemsEl.className = "lc-chat-virtual-items";
        virtualBottomSpacer = document.createElement("div");
        virtualBottomSpacer.className = "lc-chat-virtual-spacer";
        emptyEl = document.createElement("div");
        emptyEl.className = "lc-chat-empty";
        listEl.append(virtualTopSpacer, virtualItemsEl, virtualBottomSpacer);
        addRootEventListener(listEl, "wheel", scrollListByWheel, { passive: false });
        addRootEventListener(
          listEl,
          "scroll",
          () => {
            renderVirtualWindow();
            syncAutoFollowFromScroll();
          },
          { passive: true }
        );
        addRootEventListener(listEl, "keydown", (e2) => {
          if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(e2.key)) return;
          const items = renderedMessages();
          if (items.length === 0) return;
          e2.preventDefault();
          const active = document.activeElement instanceof HTMLElement ? document.activeElement.closest(".lc-chat-message") : null;
          const index = active instanceof HTMLElement ? Number(active.dataset.virtualIndex) : -1;
          const nextIndex = e2.key === "Home" ? 0 : e2.key === "End" ? items.length - 1 : Math.max(0, Math.min(items.length - 1, index + (e2.key === "ArrowUp" ? -1 : 1)));
          scrollToVirtualIndex(nextIndex);
        });
        const composer = document.createElement("div");
        composer.className = "lc-chat-composer";
        const inputWrap = document.createElement("div");
        inputWrap.className = "lc-chat-input-wrap";
        textarea = document.createElement("textarea");
        textarea.value = fasongText.value;
        textarea.placeholder = "输入弹幕... Enter 发送，Shift+Enter 换行";
        addRootEventListener(textarea, "input", () => {
          fasongText.value = textarea?.value ?? "";
          updateCount();
        });
        addRootEventListener(textarea, "keydown", (e2) => {
          if (e2.key === "Enter" && !e2.shiftKey && !e2.isComposing) {
            e2.preventDefault();
            void sendFromComposer();
          }
        });
        countEl = document.createElement("span");
        countEl.className = "lc-chat-count";
        countEl.textContent = "0";
        inputWrap.append(textarea, countEl);
        const sendRow = document.createElement("div");
        sendRow.className = "lc-chat-send-row";
        const actionsHost = document.createElement("div");
        actionsHost.className = "lc-chat-actions-host";
        const sendBtn = makeButton("lc-chat-send", "发送", "发送弹幕", () => void sendFromComposer());
        const hint = document.createElement("span");
        hint.className = "lc-chat-hint";
        hint.textContent = "偷 / +1 / 复制，设置可贴 CSS";
        sendRow.append(actionsHost, sendBtn, hint);
        disposeActionsIsland?.();
        disposeActionsIsland = mountSendActionsIsland(actionsHost, (msg) => void sendManualDanmaku(msg));
        jumpBottomBtn = makeButton("lc-chat-jump-bottom", "回到最新 ↓", "回到底部并恢复自动跟随", () => {
          resumeFollowing();
        });
        jumpBottomBtn.style.display = "none";
        composer.append(jumpBottomBtn, inputWrap, sendRow);
        panel.append(toolbar, menu, debugEl, listEl, composer);
        updateUnread();
        updateEmptyState();
        return panel;
      }
      function ensureStyles() {
        const styles = ensureCustomChatStyles({
          styleId: STYLE_ID$1,
          userStyleId: USER_STYLE_ID,
          customCss: customChatCss.value,
          styleEl: styleEl$1,
          userStyleEl
        });
        styleEl$1 = styles.styleEl;
        userStyleEl = styles.userStyleEl;
      }
      function bootstrapPrewarmFromNative(container) {
        const nodes = container.querySelectorAll(NATIVE_EVENT_SELECTOR);
        const limit = Math.min(nodes.length, MAX_NATIVE_INITIAL_SCAN);
        for (let i2 = 0; i2 < limit; i2++) {
          const node = nodes[i2];
          const nativeUrl = nativeAvatar(node);
          if (nativeUrl) prewarmAvatar(nativeUrl);
          const canonical = resolveAvatarUrl(nativeUid(node));
          if (canonical) prewarmAvatar(canonical);
        }
      }
      function mount$1(container) {
        ensureStyles();
        abortRootEventListeners();
        nativeEventObserver?.disconnect();
        nativeEventObserverContainer = null;
        nativeEventObserverSuspended = false;
        root?.remove();
        rootUsesFallbackHost = false;
        fallbackHost?.remove();
        fallbackHost = null;
        const historyPanel = container.closest(".chat-history-panel");
        const host = historyPanel?.parentElement ?? container.parentElement;
        if (!host) return;
        root = createRoot();
        rootOutsideHistory = !!historyPanel && host !== historyPanel;
        root.dataset.theme = customChatTheme.value;
        host.appendChild(root);
        updateNativeVisibility();
        observeNativeEvents(container);
        bootstrapPrewarmFromNative(container);
        rerenderMessages();
      }
      function ensureFallbackHost() {
        if (fallbackHost?.isConnected) return fallbackHost;
        const host = document.createElement("div");
        host.id = "laplace-custom-chat-fallback-host";
        host.style.position = "fixed";
        host.style.right = "12px";
        host.style.bottom = "52px";
        host.style.zIndex = "2147483646";
        host.style.width = "min(360px, calc(100vw - 24px))";
        host.style.height = "min(62vh, 560px)";
        host.style.minHeight = "340px";
        host.style.overflow = "hidden";
        host.style.borderRadius = "18px";
        host.style.border = "1px solid rgba(255, 255, 255, .08)";
        host.style.boxShadow = "0 20px 48px rgba(0, 0, 0, .32)";
        host.style.backdropFilter = "blur(18px)";
        host.style.webkitBackdropFilter = "blur(18px)";
        document.body.appendChild(host);
        fallbackHost = host;
        return host;
      }
      function mountFallback() {
        if (root?.isConnected && rootUsesFallbackHost) return;
        ensureStyles();
        abortRootEventListeners();
        nativeEventObserver?.disconnect();
        nativeEventObserver = null;
        nativeEventObserverContainer = null;
        nativeEventObserverSuspended = false;
        pendingNativeNodes.clear();
        root?.remove();
        const host = ensureFallbackHost();
        root = createRoot();
        rootOutsideHistory = false;
        rootUsesFallbackHost = true;
        root.dataset.theme = customChatTheme.value;
        host.replaceChildren(root);
        updateNativeVisibility();
        rerenderMessages();
      }
      function scheduleFallbackMount() {
        if (fallbackMountTimer !== null) return;
        fallbackMountTimer = setTimeout(() => {
          fallbackMountTimer = null;
          if (root?.isConnected) return;
          mountFallback();
        }, 2500);
      }
      function observeNativeEvents(container) {
        nativeEventObserver?.disconnect();
        nativeEventObserverContainer = null;
        nativeEventObserverSuspended = false;
        pendingNativeNodes.clear();
        nativeHealthSamples.length = 0;
        nativeDomWarning = false;
        updateWsStatus(currentWsStatus);
        if (nativeScanFrame !== null) {
          window.cancelAnimationFrame(nativeScanFrame);
          nativeScanFrame = null;
        }
        if (nativeScanDebounceTimer !== null) {
          clearTimeout(nativeScanDebounceTimer);
          nativeScanDebounceTimer = null;
        }
        const nativeCtx = { rootId: ROOT_ID, nextId: () => `native-${++messageSeq}` };
        const scan = (node) => {
          if (seenNativeNodes.has(node)) return;
          seenNativeNodes.add(node);
          const event = parseNativeEvent(node, nativeCtx);
          let parsed = false;
          if (event) emitCustomChatEvent(event);
          if (event) parsed = true;
          for (const child of node.querySelectorAll(NATIVE_EVENT_SELECTOR)) {
            if (seenNativeNodes.has(child) || child.classList.contains("danmaku-item")) continue;
            seenNativeNodes.add(child);
            const childEvent = parseNativeEvent(child, nativeCtx);
            if (childEvent) emitCustomChatEvent(childEvent);
            if (childEvent) parsed = true;
          }
          recordNativeHealth(parsed);
        };
        const flushScan = () => {
          nativeScanFrame = null;
          let count = 0;
          for (const node of pendingNativeNodes) {
            pendingNativeNodes.delete(node);
            if (node.isConnected) scan(node);
            count++;
            if (count >= MAX_NATIVE_SCAN_BATCH) break;
          }
          if (pendingNativeNodes.size > 0) nativeScanFrame = window.requestAnimationFrame(flushScan);
        };
        const scheduleNativeScan = () => {
          if (nativeScanFrame !== null || nativeScanDebounceTimer !== null) return;
          nativeScanDebounceTimer = setTimeout(() => {
            nativeScanDebounceTimer = null;
            if (nativeScanFrame === null) nativeScanFrame = window.requestAnimationFrame(flushScan);
          }, NATIVE_SCAN_DEBOUNCE_MS);
        };
        const queueScan = (node) => {
          if (!shouldScanNativeEventNode(node, ROOT_ID)) return;
          pendingNativeNodes.add(node);
          scheduleNativeScan();
        };
        const existing = Array.from(container.querySelectorAll(NATIVE_EVENT_SELECTOR)).filter((node) => !node.classList.contains("danmaku-item")).slice(-MAX_NATIVE_INITIAL_SCAN);
        for (const node of existing) queueScan(node);
        nativeEventObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node instanceof HTMLElement) queueScan(node);
            }
          }
        });
        nativeEventObserverContainer = container;
        if (currentWsStatus === "live") {
          nativeEventObserverSuspended = true;
        } else {
          nativeEventObserverSuspended = false;
          nativeEventObserver.observe(container, { childList: true, subtree: true });
        }
      }
      function syncNativeObserverWithWsStatus() {
        if (!nativeEventObserver || !nativeEventObserverContainer) return;
        const shouldSuspend = currentWsStatus === "live";
        if (shouldSuspend && !nativeEventObserverSuspended) {
          nativeEventObserver.disconnect();
          nativeEventObserverSuspended = true;
        } else if (!shouldSuspend && nativeEventObserverSuspended) {
          nativeEventObserver.observe(nativeEventObserverContainer, { childList: true, subtree: true });
          nativeEventObserverSuspended = false;
        }
      }
      function addDomMessage(ev) {
        const text = ev.text.trim();
        if (!text) return;
        const uid = ev.uid;
        if (hasRecentWsDanmaku(text, uid)) return;
        emitCustomChatEvent({
          id: `dom-${++messageSeq}`,
          kind: "danmaku",
          text,
          sendText: eventToSendableMessage$1(ev),
          uname: ev.uname || "匿名",
          uid,
          time: chatEventTime(),
          isReply: ev.isReply,
          source: "dom",
          badges: ev.badges,
          avatarUrl: ev.avatarUrl || resolveAvatarUrl(uid)
        });
      }
      function addEvent(event) {
        if (!isReliableEvent(event)) return;
        const duplicateIndex = messageIndexByEvent(event);
        if (duplicateIndex >= 0) {
          const merged = mergeDuplicateEvent(messages[duplicateIndex], event);
          if (merged) replaceMessage(duplicateIndex, merged);
          return;
        }
        const key = messageKey(event);
        if (messageKeys.has(key)) return;
        if (!rememberEvent(event)) return;
        hasClearedMessages = false;
        recordEventStats(event);
        const ek = eventKey(event);
        eventKeyByMessage.set(event, ek);
        messages.push(event);
        messageKeys.add(key);
        messageByEventKey.set(ek, event);
        pruneMessages();
        scheduleRender(event);
      }
      function ensureAvatarPreconnect() {
        const head = document.head;
        if (!head) return;
        for (const host of ["https://workers.vrp.moe", "https://i0.hdslb.com"]) {
          const id = `lc-avatar-preconnect-${host.replace(/[^a-z0-9]/gi, "-")}`;
          if (document.getElementById(id)) continue;
          const link = document.createElement("link");
          link.id = id;
          link.rel = "preconnect";
          link.href = host;
          head.append(link);
        }
      }
      const BILIBILI_NOFACE_URL = "https://i0.hdslb.com/bfs/face/member/noface.jpg";
      function startCustomChatDom() {
        if (unsubscribeDom) return;
        ensureStyles();
        ensureAvatarPreconnect();
        prewarmAvatar(BILIBILI_NOFACE_URL);
        scheduleFallbackMount();
        void refreshCurrentRoomEmoticons();
        disposeSettings = j$1(() => {
          if (root) root.dataset.theme = customChatTheme.value;
          if (root) root.dataset.debug = customChatPerfDebug.value ? "true" : "false";
          updateNativeVisibility();
          updatePerfDebug();
          ensureStyles();
        });
        disposeComposer = j$1(syncComposerFromStore);
        unsubscribeEvents = subscribeCustomChatEvents(addEvent);
        unsubscribeWsStatus = subscribeCustomChatWsStatus(updateWsStatus);
        unsubscribeDom = subscribeDanmaku({
          onAttach: mount$1,
          onMessage: addDomMessage,
          emitExisting: true
        });
      }
      function stopCustomChatDom() {
        emoticonRefreshToken += 1;
        if (fallbackMountTimer) {
          clearTimeout(fallbackMountTimer);
          fallbackMountTimer = null;
        }
        if (unsubscribeDom) {
          unsubscribeDom();
          unsubscribeDom = null;
        }
        if (unsubscribeEvents) {
          unsubscribeEvents();
          unsubscribeEvents = null;
        }
        if (unsubscribeWsStatus) {
          unsubscribeWsStatus();
          unsubscribeWsStatus = null;
        }
        if (disposeSettings) {
          disposeSettings();
          disposeSettings = null;
        }
        if (disposeComposer) {
          disposeComposer();
          disposeComposer = null;
        }
        if (disposeActionsIsland) {
          disposeActionsIsland();
          disposeActionsIsland = null;
        }
        abortRootEventListeners();
        nativeEventObserver?.disconnect();
        nativeEventObserver = null;
        nativeEventObserverContainer = null;
        nativeEventObserverSuspended = false;
        pendingNativeNodes.clear();
        if (nativeScanDebounceTimer !== null) {
          clearTimeout(nativeScanDebounceTimer);
          nativeScanDebounceTimer = null;
        }
        if (nativeScanFrame !== null) {
          window.cancelAnimationFrame(nativeScanFrame);
          nativeScanFrame = null;
        }
        hideSiblingNativeElements(false, false);
        document.documentElement.classList.remove("lc-custom-chat-hide-native");
        document.documentElement.classList.remove("lc-custom-chat-mounted");
        document.documentElement.classList.remove("lc-custom-chat-root-outside-history");
        root?.remove();
        root = null;
        rootOutsideHistory = false;
        rootUsesFallbackHost = false;
        fallbackHost?.remove();
        fallbackHost = null;
        styleEl$1?.remove();
        styleEl$1 = null;
        userStyleEl?.remove();
        userStyleEl = null;
        listEl = null;
        virtualTopSpacer = null;
        virtualItemsEl = null;
        virtualBottomSpacer = null;
        pauseBtn = null;
        unreadBtn = null;
        jumpBottomBtn = null;
        textarea = null;
        countEl = null;
        searchInput = null;
        matchCountEl = null;
        wsStatusEl = null;
        emptyEl = null;
        perfEl = null;
        debugEl = null;
        messages.length = 0;
        messageKeys.clear();
        messageByEventKey.clear();
        renderQueue.length = 0;
        visibleMessages = [];
        rowHeights.clear();
        eventTicks.length = 0;
        nativeHealthSamples.length = 0;
        rerenderToken++;
        sourceCounts.dom = 0;
        sourceCounts.ws = 0;
        sourceCounts.local = 0;
        lastBatchSize = 0;
        if (chatFrame !== null) {
          window.cancelAnimationFrame(chatFrame);
          chatFrame = null;
        }
        pendingRenderFlush = false;
        pendingRerender = null;
        unread = 0;
        followMode = "following";
        frozenSnapshot = null;
        sending = false;
        searchQuery = "";
        hasClearedMessages = false;
        currentWsStatus = "off";
        nativeDomWarning = false;
        recentEventKeys.clear();
      }
      function startCustomChat() {
        startCustomChatDom();
      }
      function stopCustomChat() {
        stopCustomChatDom();
      }
      function eventToSendableMessage(ev) {
        if (!ev.isReply) return ev.text;
        return ev.uname ? `@${ev.uname} ${ev.text}` : null;
      }
      const MARKER = "lc-dm-direct";
      const STYLE_ID = "lc-dm-direct-style";
      const STYLE = `
.chat-item.danmaku-item {
  position: relative;
}
.${MARKER} {
  display: inline-flex;
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  gap: 2px;
  opacity: 0;
  transition: opacity .15s, transform .15s;
  user-select: none;
  pointer-events: none;
  z-index: 2;
}
.chat-item.danmaku-item:hover .${MARKER},
.${MARKER}:hover {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(-50%) translateX(-2px);
}
.${MARKER} button {
  all: unset;
  cursor: pointer;
  min-width: 20px;
  padding: 2px 4px;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: #fff;
  background: rgba(0, 0, 0, .62);
  font-size: 12px;
  transition: background .1s;
}
.${MARKER} button:hover {
  background: rgba(0, 0, 0, .82);
}
html.lc-dm-direct-always .${MARKER} {
  opacity: 1;
  pointer-events: auto;
}
`;
      function injectButtons(node, msg, uid, uname) {
        if (node.querySelector(`.${MARKER}`)) return;
        const anchor = node.querySelector(".danmaku-item-right");
        if (!anchor) return;
        const container = document.createElement("span");
        container.className = MARKER;
        container.dataset.msg = msg;
        if (uid) container.dataset.uid = uid;
        if (uname) container.dataset.uname = uname;
        const stealBtn = document.createElement("button");
        stealBtn.type = "button";
        stealBtn.textContent = "偷";
        stealBtn.title = "偷弹幕到发送框并复制";
        stealBtn.dataset.action = "steal";
        const repeatBtn = document.createElement("button");
        repeatBtn.type = "button";
        repeatBtn.textContent = "+1";
        repeatBtn.title = "+1 发送弹幕";
        repeatBtn.dataset.action = "repeat";
        const blacklistBtn = document.createElement("button");
        blacklistBtn.type = "button";
        blacklistBtn.textContent = "黑";
        blacklistBtn.title = uid && uid in autoBlendUserBlacklist.value ? "解除融入黑名单" : "添加融入黑名单";
        blacklistBtn.dataset.action = "blacklist";
        container.appendChild(stealBtn);
        container.appendChild(repeatBtn);
        container.appendChild(blacklistBtn);
        anchor.after(container);
      }
      function handleDelegatedClick(e2) {
        const target = e2.target;
        if (!(target instanceof HTMLElement)) return;
        const btn = target.closest(`.${MARKER} button`);
        if (!btn) return;
        e2.stopPropagation();
        const container = btn.closest(`.${MARKER}`);
        const msg = container?.dataset.msg;
        if (!msg) return;
        const action = btn.dataset.action;
        if (action === "steal") void stealDanmaku(msg);
        else if (action === "repeat") {
          void repeatDanmaku(msg, { confirm: danmakuDirectConfirm.value, anchor: { x: e2.clientX, y: e2.clientY } });
        } else if (action === "blacklist") {
          const uid = container?.dataset.uid;
          if (!uid) return;
          const next = { ...autoBlendUserBlacklist.value };
          const display = container?.dataset.uname || uid;
          if (uid in next) {
            delete next[uid];
            appendLog(`🚲 已解除融入黑名单：${display}`);
          } else {
            next[uid] = container?.dataset.uname ?? "";
            appendLog(`🚲 已加入融入黑名单：${display}`);
          }
          autoBlendUserBlacklist.value = next;
        }
      }
      let unsubscribe$2 = null;
      let styleEl = null;
      let attachedContainer = null;
      let alwaysShowDispose = null;
      let contextMenuHandler$1 = null;
      function closeNativeContextMenu$1() {
        for (const li of document.querySelectorAll("li")) {
          if (li.textContent?.trim() === "关闭") {
            li.click();
            return;
          }
        }
      }
      function createContextMenuItem(source, label) {
        const item = document.createElement("li");
        item.className = source.className;
        item.dataset.lc = "";
        item.textContent = label;
        return item;
      }
      function tryInjectContextMenuItems(li) {
        if (li.textContent?.trim() !== "复制弹幕") return;
        const ul = li.parentElement;
        if (!ul || ul.querySelector("[data-lc]")) return;
        const repeatEl = createContextMenuItem(li, "弹幕 +1");
        repeatEl.onclick = (e2) => {
          const text = ul.parentElement?.querySelector("span")?.textContent?.trim() ?? null;
          if (text) {
            void repeatDanmaku(text, { confirm: danmakuDirectConfirm.value, anchor: { x: e2.clientX, y: e2.clientY } });
          }
          closeNativeContextMenu$1();
        };
        const stealEl = createContextMenuItem(li, "偷弹幕");
        stealEl.onclick = () => {
          const text = ul.parentElement?.querySelector("span")?.textContent?.trim() ?? null;
          if (text) {
            void stealDanmaku(text);
          }
          closeNativeContextMenu$1();
        };
        ul.insertBefore(stealEl, li.nextSibling);
        ul.insertBefore(repeatEl, li.nextSibling);
      }
      function initContextMenuHijack() {
        if (contextMenuHandler$1) return;
        contextMenuHandler$1 = () => {
          requestAnimationFrame(() => {
            for (const li of document.querySelectorAll("li")) {
              tryInjectContextMenuItems(li);
            }
          });
        };
        document.addEventListener("contextmenu", contextMenuHandler$1);
      }
      function stopContextMenuHijack() {
        if (contextMenuHandler$1) {
          document.removeEventListener("contextmenu", contextMenuHandler$1);
          contextMenuHandler$1 = null;
        }
      }
      function startDanmakuDirect() {
        if (unsubscribe$2) return;
        alwaysShowDispose = j$1(() => {
          document.documentElement.classList.toggle("lc-dm-direct-always", danmakuDirectAlwaysShow.value);
        });
        initContextMenuHijack();
        unsubscribe$2 = subscribeDanmaku({
          onAttach: (container) => {
            styleEl = document.createElement("style");
            styleEl.id = STYLE_ID;
            styleEl.textContent = STYLE;
            document.head.appendChild(styleEl);
            attachedContainer = container;
            container.addEventListener("click", handleDelegatedClick, true);
          },
          onMessage: (ev) => {
            if (!danmakuDirectMode.value) return;
            const msg = eventToSendableMessage(ev);
            if (msg !== null) injectButtons(ev.node, msg, ev.uid ?? null, ev.uname ?? null);
          },
          emitExisting: true
        });
      }
      function stopDanmakuDirect() {
        stopContextMenuHijack();
        if (alwaysShowDispose) {
          alwaysShowDispose();
          alwaysShowDispose = null;
          document.documentElement.classList.remove("lc-dm-direct-always");
        }
        if (unsubscribe$2) {
          unsubscribe$2();
          unsubscribe$2 = null;
        }
        if (attachedContainer) {
          attachedContainer.removeEventListener("click", handleDelegatedClick, true);
          attachedContainer = null;
        }
        if (styleEl) {
          styleEl.remove();
          styleEl = null;
        }
        for (const el of Array.from(document.querySelectorAll(`.${MARKER}`))) {
          el.remove();
        }
      }
      const AUTO_BLEND_PRESETS = {
        safe: {
          label: "稳一点",
          hint: "少跟，适合挂机",
          windowSec: 25,
          threshold: 5,
          cooldownSec: 45,
          routineIntervalSec: 75,
          minDistinctUsers: 3,
          burstSettleMs: 1800,
          rateLimitWindowMin: 10,
          rateLimitStopThreshold: 3
        },
        normal: {
          label: "正常",
          hint: "推荐，比较克制",
          windowSec: 20,
          threshold: 4,
          cooldownSec: 35,
          routineIntervalSec: 60,
          minDistinctUsers: 3,
          burstSettleMs: 1500,
          rateLimitWindowMin: 10,
          rateLimitStopThreshold: 3
        },
        hot: {
          label: "热闹",
          hint: "跟得更快，但会自动刹车",
          windowSec: 15,
          threshold: 3,
          cooldownSec: 20,
          routineIntervalSec: 40,
          minDistinctUsers: 2,
          burstSettleMs: 1200,
          rateLimitWindowMin: 10,
          rateLimitStopThreshold: 2
        }
      };
      function getAutoBlendPresetValues(preset) {
        return {
          ...AUTO_BLEND_PRESETS[preset],
          includeReply: false,
          requireDistinctUsers: true,
          sendCount: 1,
          sendAllTrending: false,
          useReplacements: true
        };
      }
      function applyAutoBlendPreset(preset) {
        const p2 = getAutoBlendPresetValues(preset);
        autoBlendPreset.value = preset;
        autoBlendWindowSec.value = p2.windowSec;
        autoBlendThreshold.value = p2.threshold;
        autoBlendCooldownSec.value = p2.cooldownSec;
        autoBlendRoutineIntervalSec.value = p2.routineIntervalSec;
        autoBlendBurstSettleMs.value = p2.burstSettleMs;
        autoBlendRateLimitWindowMin.value = p2.rateLimitWindowMin;
        autoBlendRateLimitStopThreshold.value = p2.rateLimitStopThreshold;
        autoBlendIncludeReply.value = p2.includeReply;
        autoBlendRequireDistinctUsers.value = p2.requireDistinctUsers;
        autoBlendMinDistinctUsers.value = p2.minDistinctUsers;
        autoBlendSendCount.value = p2.sendCount;
        autoBlendSendAllTrending.value = p2.sendAllTrending;
        autoBlendUseReplacements.value = p2.useReplacements;
      }
      const MIN_SYNC_INTERVAL_MS = 3e4;
      const FOLLOWING_PAGE_LIMIT = 4;
      const LIVE_STATUS_BATCH = 8;
      let timer$1 = null;
      let running = false;
      let lastSessionId = "";
      let lastFailure = "";
      function setDisconnected(message) {
        guardRoomAgentConnected.value = false;
        guardRoomAgentStatusText.value = message;
        guardRoomAgentLastSyncAt.value = null;
        guardRoomAgentWatchlistCount.value = 0;
        guardRoomAgentLiveCount.value = 0;
        guardRoomLiveDeskSessionId.value = "";
        guardRoomWatchlistRooms.value = [];
      }
      function mergeWatchlistRooms(medals, follows) {
        const rooms = new Map();
        for (const room of medals) {
          rooms.set(room.roomId, {
            roomId: room.roomId,
            anchorName: room.anchorName,
            anchorUid: room.anchorUid,
            medalName: room.medalName,
            source: "medal"
          });
        }
        for (const room of follows) {
          const existing = rooms.get(room.roomId);
          if (existing) {
            rooms.set(room.roomId, {
              ...existing,
              anchorName: existing.anchorName || room.anchorName,
              anchorUid: existing.anchorUid ?? room.anchorUid,
              source: existing.source === "medal" ? "both" : existing.source
            });
            continue;
          }
          rooms.set(room.roomId, {
            roomId: room.roomId,
            anchorName: room.anchorName,
            anchorUid: room.anchorUid,
            medalName: null,
            source: "follow"
          });
        }
        return [...rooms.values()].sort((a2, b2) => a2.anchorName.localeCompare(b2.anchorName));
      }
      async function attachLiveStatus(rooms) {
        const results = [];
        for (let index = 0; index < rooms.length; index += LIVE_STATUS_BATCH) {
          const batch = rooms.slice(index, index + LIVE_STATUS_BATCH);
          const resolved = await Promise.all(
            batch.map(async (room) => ({
              ...room,
              liveStatus: await fetchRoomLiveStatus(room.roomId).catch(() => "unknown")
            }))
          );
          results.push(...resolved);
        }
        return results;
      }
      async function collectWatchlist() {
        const medals = await fetchMedalRooms();
        let follows = [];
        try {
          follows = await fetchFollowingRooms(FOLLOWING_PAGE_LIMIT);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          appendLog(`直播间保安室：拉关注列表失败，先只同步粉丝牌房。${message}`);
        }
        const merged = mergeWatchlistRooms(medals, follows);
        return attachLiveStatus(merged);
      }
      function applyControlProfile(profile) {
        guardRoomAppliedProfile.value = profile;
        guardRoomLiveDeskHeartbeatSec.value = profile.heartbeatSec;
        if (!guardRoomWebsiteControlEnabled.value && !guardRoomHandoffActive.value) return;
        autoBlendDryRun.value = profile.dryRunDefault;
        applyAutoBlendPreset(profile.conservativeMode);
      }
      function markSuccess(watchlist) {
        const now = Date.now();
        guardRoomAgentConnected.value = true;
        guardRoomAgentStatusText.value = "监控室代理已连接";
        guardRoomAgentLastSyncAt.value = now;
        guardRoomAgentWatchlistCount.value = watchlist.length;
        guardRoomAgentLiveCount.value = watchlist.filter((room) => room.liveStatus === "live").length;
        guardRoomWatchlistRooms.value = watchlist;
        lastFailure = "";
      }
      async function syncOnce() {
        const endpoint = guardRoomEndpoint.value.trim();
        const syncKey = guardRoomSyncKey.value.trim();
        if (!endpoint || !syncKey) {
          setDisconnected("未配置监控室地址或同步密钥");
          return;
        }
        guardRoomAgentStatusText.value = "监控室代理同步中…";
        const watchlist = await collectWatchlist();
        await syncGuardRoomWatchlist(watchlist);
        const control = await fetchGuardRoomControlProfile();
        if (!control) {
          throw new Error("监控室没有返回统一配置");
        }
        applyControlProfile(control.profile);
        guardRoomLiveDeskSessionId.value = control.session?.status === "active" ? control.session.id : "";
        if (control.session?.id && control.session.id !== lastSessionId) {
          appendLog(`直播间保安室：监控会话已切到 ${control.session.id}`);
        }
        lastSessionId = control.session?.id ?? "";
        markSuccess(
          watchlist.map((room) => ({
            ...room,
            medalName: room.medalName ?? null
          }))
        );
      }
      async function tick$1() {
        try {
          await syncOnce();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          guardRoomAgentConnected.value = false;
          guardRoomAgentStatusText.value = `监控室代理掉线：${message}`;
          if (message !== lastFailure) {
            appendLog(`直播间保安室：监控室代理同步失败：${message}`);
            lastFailure = message;
          }
        } finally {
          if (running) {
            const intervalMs = Math.max(MIN_SYNC_INTERVAL_MS, guardRoomLiveDeskHeartbeatSec.value * 1e3);
            timer$1 = setTimeout(() => {
              void tick$1();
            }, intervalMs);
          }
        }
      }
      function startGuardRoomAgent() {
        if (running) return;
        running = true;
        void tick$1();
      }
      function stopGuardRoomAgent() {
        running = false;
        if (timer$1) {
          clearTimeout(timer$1);
          timer$1 = null;
        }
      }
      let applied = false;
      function applyGuardRoomHandoff() {
        if (applied) return;
        applied = true;
        const url = new URL(window.location.href);
        if (url.searchParams.get("guard_room_source") !== "guard-room") return;
        guardRoomHandoffActive.value = true;
        const mode = url.searchParams.get("guard_room_mode");
        const autostart = url.searchParams.get("guard_room_autostart") === "1";
        const sessionId = url.searchParams.get("guard_room_session");
        if (sessionId) {
          guardRoomLiveDeskSessionId.value = sessionId;
        }
        if (mode === "dry-run") {
          autoBlendDryRun.value = true;
        }
        if (autostart) {
          autoBlendEnabled.value = true;
          appendLog("直播间保安室：已接管本页，自动跟车进入试运行。");
        }
      }
      const WINDOW_MS = 60 * 1e3;
      let timer = null;
      let unsubscribe$1 = null;
      const seen = [];
      function trimSeen(now) {
        while (seen.length > 0 && now - seen[0].ts > WINDOW_MS) seen.shift();
      }
      async function uploadSnapshot() {
        const sessionId = guardRoomLiveDeskSessionId.value.trim();
        if (!sessionId || !guardRoomEndpoint.value.trim() || !guardRoomSyncKey.value.trim()) return;
        const roomId = await ensureRoomId();
        const rooms = guardRoomWatchlistRooms.value;
        const current = rooms.find((item) => item.roomId === roomId);
        const now = Date.now();
        trimSeen(now);
        const uniqueUsers = new Set(seen.map((item) => item.uid).filter(Boolean));
        const candidateText = autoBlendCandidateText.value !== "暂无" ? autoBlendCandidateText.value : void 0;
        await syncGuardRoomLiveDeskHeartbeat({
          sessionId,
          roomId,
          anchorName: current?.anchorName ?? `直播间 ${roomId}`,
          medalName: current?.medalName ?? "粉丝牌",
          liveStatus: "live",
          sampledAt: new Date(now).toISOString(),
          messageCount: seen.length,
          activeUsersEstimate: uniqueUsers.size,
          candidateText,
          riskLevel: guardRoomCurrentRiskLevel.value
        });
      }
      function startLiveDeskSync() {
        if (timer || unsubscribe$1) return;
        unsubscribe$1 = subscribeCustomChatEvents((event) => {
          if (event.kind !== "danmaku") return;
          const now = Date.now();
          seen.push({ ts: now, uid: event.uid });
          trimSeen(now);
        });
        timer = setInterval(() => {
          void uploadSnapshot();
        }, Math.max(10, guardRoomLiveDeskHeartbeatSec.value) * 1e3);
        void uploadSnapshot();
      }
      function stopLiveDeskSync() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        unsubscribe$1?.();
        unsubscribe$1 = null;
        seen.splice(0, seen.length);
      }
      function computeJitteredSleepMs(intervalSec, withJitter) {
        const safeInterval = Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec : 1;
        const baseMs = safeInterval * 1e3;
        const jitterMs = withJitter ? Math.floor(Math.random() * 500) : 0;
        return Math.max(0, baseMs - jitterMs);
      }
      let currentAbort = null;
      function getSpmPrefix() {
        const metaTag = document.querySelector('meta[name="spm_prefix"]');
        return metaTag?.getAttribute("content") ?? "444.8";
      }
      function cancelLoop() {
        currentAbort?.abort();
        currentAbort = null;
        cancelPendingAuto();
      }
      function abortableSleep(ms, signal) {
        return new Promise((resolve) => {
          if (signal.aborted) {
            resolve(false);
            return;
          }
          const timer2 = setTimeout(() => resolve(true), ms);
          signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer2);
              resolve(false);
            },
            { once: true }
          );
        });
      }
      async function loop() {
        let count = 0;
        let initialized = false;
        while (true) {
          if (sendMsg.value) {
            let roomId;
            try {
              roomId = await ensureRoomId();
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              appendLog(`❌ 获取房间ID失败: ${message}`);
              await new Promise((r2) => setTimeout(r2, 5e3));
              continue;
            }
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
              appendLog("❌ 未找到登录信息，已自动停止运行，请先登录 Bilibili");
              void syncGuardRoomRiskEvent({
                kind: "login_missing",
                source: "auto-send",
                level: "observe",
                roomId,
                reason: "自动发送没有检测到 B 站登录态。",
                advice: "先登录 B 站，再重新开车。"
              });
              sendMsg.value = false;
              continue;
            }
            if (!initialized) {
              initialized = true;
              buildReplacementMap();
              await waitForWbiKeys();
              if (cachedWbiKeys) {
                try {
                  const configQuery = encodeWbi(
                    {
                      room_id: String(roomId),
                      web_location: getSpmPrefix()
                    },
                    cachedWbiKeys
                  );
                  const configUrl = `${BASE_URL.BILIBILI_GET_DM_CONFIG}?${configQuery}`;
                  const configResp = await fetch(configUrl, {
                    method: "GET",
                    credentials: "include"
                  }).then((r2) => r2.json());
                  if (configResp?.data?.group) {
                    const colors = [];
                    for (const group of configResp.data.group) {
                      for (const color of group.color) {
                        if (color.status === 1) {
                          colors.push(`0x${color.color_hex}`);
                        }
                      }
                    }
                    if (colors.length > 0) {
                      availableDanmakuColors.value = colors;
                    }
                  }
                } catch {
                }
              }
              try {
                await fetchEmoticons(roomId);
              } catch {
              }
              if (forceScrollDanmaku.value) {
                const initCsrfToken = getCsrfToken();
                if (initCsrfToken) {
                  await setDanmakuMode(roomId, initCsrfToken, "1");
                }
              }
            }
            currentAbort = new AbortController();
            const { signal } = currentAbort;
            const currentTemplate = msgTemplates.value[activeTemplateIndex.value] ?? "";
            if (!currentTemplate.trim()) {
              appendLog("⚠️ 当前模板为空，已自动停止运行");
              sendMsg.value = false;
              currentAbort = null;
              continue;
            }
            const interval = msgSendInterval.value;
            const enableRandomColor = randomColor.value;
            const enableRandomInterval = randomInterval.value;
            const enableRandomChar = randomChar.value;
            const Msg = [];
            for (const line of currentTemplate.split("\n").filter((l2) => l2?.trim())) {
              if (isEmoticonUnique(line.trim())) {
                Msg.push(line.trim());
              } else {
                Msg.push(...processMessages(line, maxLength.value, enableRandomChar));
              }
            }
            const total = Msg.length;
            let completed = true;
            for (let i2 = 0; i2 < total; i2++) {
              if (signal.aborted) {
                completed = false;
                break;
              }
              const message = Msg[i2];
              if (sendMsg.value) {
                if (isLockedEmoticon(message)) {
                  const skipLabel = total > 1 ? `自动表情 [${i2 + 1}/${total}]` : "自动表情";
                  appendLog(formatLockedEmoticonReject(message, skipLabel));
                  const ok2 = await abortableSleep(computeJitteredSleepMs(interval, enableRandomInterval), signal);
                  if (!ok2) {
                    completed = false;
                    break;
                  }
                  continue;
                }
                const isEmote = isEmoticonUnique(message);
                const originalMessage = message;
                const processedMessage = isEmote ? message : applyReplacements(message);
                const wasReplaced = !isEmote && originalMessage !== processedMessage;
                if (enableRandomColor) {
                  await setRandomDanmakuColor(roomId, csrfToken);
                }
                if (signal.aborted) {
                  completed = false;
                  break;
                }
                const result = await enqueueDanmaku(processedMessage, roomId, csrfToken, SendPriority.AUTO);
                const displayMsg = wasReplaced ? `${originalMessage} → ${processedMessage}` : processedMessage;
                const baseLabel = result.isEmoticon ? "自动表情" : "自动";
                const label = total > 1 ? `${baseLabel} [${i2 + 1}/${total}]` : baseLabel;
                appendLog(result, label, displayMsg);
                if (!result.success && !result.cancelled) {
                  const risk = classifyRiskEvent(result.error, result.errorData);
                  void syncGuardRoomRiskEvent({
                    ...risk,
                    source: "auto-send",
                    roomId,
                    errorCode: result.errorCode,
                    reason: result.error
                  });
                }
                if (result.success && !result.cancelled) {
                  void verifyBroadcast({
                    text: processedMessage,
                    label,
                    display: displayMsg,
                    sinceTs: result.startedAt ?? Date.now(),
                    isEmoticon: result.isEmoticon,
                    toastDedupeKey: `loop:${originalMessage}`
                  });
                }
                const ok = await abortableSleep(computeJitteredSleepMs(interval, enableRandomInterval), signal);
                if (!ok) {
                  completed = false;
                  break;
                }
              }
            }
            currentAbort = null;
            if (completed) {
              count += 1;
              appendLog(`🔵第 ${count} 轮发送完成`);
            }
          } else {
            count = 0;
            await new Promise((r2) => setTimeout(r2, 1e3));
          }
        }
      }
      const UNAME_NOISE_RE = /通过活动|装扮|粉丝牌|用户等级|头像|复制|举报|回复|关闭/;
      const MAX_UNAME_LENGTH = 32;
      function extractUidFromDanmakuItem(item) {
        const direct = item.getAttribute("data-uid");
        if (direct) return direct;
        const link = item.querySelector('a[href*="space.bilibili.com"], a[href*="uid="]');
        const href = link?.href ?? "";
        return href.match(/space\.bilibili\.com\/(\d+)/)?.[1] ?? href.match(/[?&]uid=(\d+)/)?.[1] ?? null;
      }
      function extractUnameFromDanmakuItem(item) {
        const selectors = ["[data-uname]", ".user-name", ".username", ".danmaku-item-user", '[class*="user-name"]'];
        for (const selector of selectors) {
          const el = item.querySelector(selector);
          const value = el?.getAttribute("data-uname") ?? el?.getAttribute("title") ?? el?.textContent;
          const clean = (value ?? "").replace(/\s+/g, " ").trim();
          if (clean && clean.length <= MAX_UNAME_LENGTH && !UNAME_NOISE_RE.test(clean)) return clean;
        }
        return null;
      }
      const INJECTED_ATTR = "data-lc-bl";
      let lastUid = null;
      let lastUname = null;
      let contextMenuHandler = null;
      function closeNativeContextMenu() {
        for (const li of document.querySelectorAll("li")) {
          if (li.textContent?.trim() === "关闭") {
            li.click();
            return;
          }
        }
      }
      function createMenuItem(source, label) {
        const item = document.createElement("li");
        item.className = source.className;
        item.setAttribute(INJECTED_ATTR, "");
        item.textContent = label;
        return item;
      }
      function tryInjectMenuItem(copyLi) {
        if (!lastUid) return;
        const ul = copyLi.parentElement;
        if (!ul || ul.querySelector(`[${INJECTED_ATTR}]`)) return;
        const isBlacklisted = lastUid in autoBlendUserBlacklist.value;
        const label = isBlacklisted ? "解除融入黑名单" : "添加融入黑名单";
        const el = createMenuItem(copyLi, label);
        el.addEventListener("click", () => {
          const uid = lastUid;
          if (!uid) return;
          const next = { ...autoBlendUserBlacklist.value };
          const display = lastUname || uid;
          if (uid in next) {
            delete next[uid];
            appendLog(`🚲 已解除融入黑名单：${display}`);
          } else {
            next[uid] = lastUname ?? "";
            appendLog(`🚲 已加入融入黑名单：${display}`);
          }
          autoBlendUserBlacklist.value = next;
          closeNativeContextMenu();
        });
        ul.insertBefore(el, copyLi.nextSibling);
      }
      function startUserBlacklistHijack() {
        if (contextMenuHandler) return;
        contextMenuHandler = (e2) => {
          const target = e2.target;
          if (!(target instanceof HTMLElement)) {
            lastUid = null;
            lastUname = null;
            return;
          }
          const item = target.closest(".chat-item.danmaku-item");
          if (!item) {
            lastUid = null;
            lastUname = null;
            return;
          }
          lastUid = extractUidFromDanmakuItem(item);
          lastUname = extractUnameFromDanmakuItem(item);
          requestAnimationFrame(() => {
            for (const li of document.querySelectorAll("li")) {
              if (li.textContent?.trim() === "复制弹幕") {
                tryInjectMenuItem(li);
                break;
              }
            }
          });
        };
        document.addEventListener("contextmenu", contextMenuHandler);
      }
      function stopUserBlacklistHijack() {
        if (contextMenuHandler) {
          document.removeEventListener("contextmenu", contextMenuHandler);
          contextMenuHandler = null;
        }
        lastUid = null;
        lastUname = null;
        for (const el of Array.from(document.querySelectorAll(`[${INJECTED_ATTR}]`))) {
          el.remove();
        }
      }
      function pushClass(tokens, value) {
        if (!value) return;
        if (typeof value === "string" || typeof value === "number") {
          const parts = String(value).trim().split(/\s+/);
          for (const part of parts) {
            if (part) tokens.push(part);
          }
          return;
        }
        if (Array.isArray(value)) {
          for (const entry of value) pushClass(tokens, entry);
          return;
        }
        for (const [key, enabled] of Object.entries(value)) {
          if (enabled) tokens.push(key);
        }
      }
      function cn(...inputs) {
        const tokens = [];
        for (const input of inputs) pushClass(tokens, input);
        return tokens.join(" ");
      }
      function shouldShowVersionUpdateBadge(lastSeen, current) {
        if (!lastSeen) return false;
        return lastSeen !== current;
      }
      const SECTION_STYLE = {
        margin: ".5em 0",
        paddingBottom: "1em",
        borderBottom: "1px solid var(--Ga2, #eee)"
      };
      const HEADING_STYLE = {
        fontWeight: "bold",
        marginBottom: ".5em"
      };
      const LINK_STYLE = {
        color: "#288bb8",
        textDecoration: "none"
      };
      const EXTERNAL_SERVICES = [
        {
          name: "Bilibili 直播接口",
          host: "api.live.bilibili.com",
          trigger: "发送弹幕、获取房间信息、读取粉丝牌、检查禁言状态时",
          description: "脚本会使用你的 B 站登录态访问直播间相关接口，用于发送弹幕、获取房间号、读取表情包和粉丝牌直播间，并在你手动触发巡检时检查禁言/封禁信号。"
        },
        {
          name: "AI 弹幕审核",
          host: "edge-workers.laplace.cn",
          trigger: "启用「AI 规避」功能时",
          description: "当弹幕发送失败且开启了 AI 规避功能后，脚本会将弹幕文本发送至此服务进行敏感词检测，并尝试自动替换敏感词后重新发送。"
        },
        {
          name: "云端替换规则",
          host: "workers.vrp.moe",
          url: "https://subspace.institute/docs/laplace-chatterbox/replacement",
          trigger: "打开设置页时自动同步",
          description: "从云端获取由社区维护的弹幕敏感词替换规则，每 10 分钟自动同步一次。"
        },
        {
          name: "烂梗列表",
          host: "workers.vrp.moe",
          url: "https://subspace.institute/docs/laplace-chatterbox/memes",
          trigger: "打开独轮车页面中的烂梗列表时",
          description: "从原项目沿用的社区服务获取烂梗列表。复制烂梗时会向服务报告使用次数。"
        },
        {
          name: "Soniox 语音识别",
          host: "api.soniox.com",
          url: "https://soniox.com",
          trigger: "使用同传功能时",
          description: "通过 WebSocket 连接 Soniox 语音识别云服务，将麦克风音频流实时转换为文字。需要提供 Soniox API Key。"
        },
        {
          name: "Soniox SDK",
          host: "unpkg.com",
          trigger: "脚本加载时",
          description: "从 unpkg CDN 加载 Soniox 语音识别 SDK (@soniox/speech-to-text-web)。"
        }
      ];
      function AboutTab() {
        const initialSeenRef = A(lastSeenVersion.value);
        const isFreshUpdate = shouldShowVersionUpdateBadge(initialSeenRef.current, VERSION);
        y$2(() => {
          if (lastSeenVersion.value !== VERSION) {
            lastSeenVersion.value = VERSION;
          }
        }, []);
        return u$2(S$1, { children: [
u$2("div", { className: "cb-section cb-stack", style: SECTION_STYLE, children: [
u$2("div", { className: "cb-heading", style: HEADING_STYLE, children: "B站独轮车 + 自动跟车" }),
u$2("div", { className: "cb-note", style: { display: "flex", flexDirection: "column", gap: ".25em", color: "#666" }, children: [
u$2("span", { children: [
                "版本: ",
                VERSION,
                isFreshUpdate && u$2(
                  "span",
                  {
                    style: {
                      marginLeft: ".5em",
                      padding: "1px 6px",
                      borderRadius: "999px",
                      background: "#ffe7c2",
                      color: "#a15c00",
                      fontSize: "0.8em"
                    },
                    title: `从 v${initialSeenRef.current} 更新到 v${VERSION}`,
                    children: "🆕 已更新"
                  }
                )
              ] }),
u$2("span", { children: [
                "作者:",
                " ",
u$2("a", { href: "https://github.com/aijc123", target: "_blank", rel: "noopener", style: LINK_STYLE, children: "Eric Ai" })
              ] }),
u$2("span", { children: "许可证: AGPL-3.0" }),
u$2("span", { children: [
                "源代码:",
                " ",
u$2(
                  "a",
                  {
                    href: "https://github.com/aijc123/bilibili-live-wheel-auto-follow",
                    target: "_blank",
                    rel: "noopener",
                    style: LINK_STYLE,
                    children: "GitHub"
                  }
                )
              ] }),
u$2("span", { children: [
                "原项目:",
                " ",
u$2("a", { href: "https://github.com/laplace-live/chatterbox", target: "_blank", rel: "noopener", style: LINK_STYLE, children: "LAPLACE Chatterbox" })
              ] }),
u$2("span", { style: { marginTop: ".5em" }, children: u$2(
                "button",
                {
                  type: "button",
                  className: "cb-btn",
                  onClick: () => {
                    hasSeenWelcome.value = false;
                    activeTab.value = "fasong";
                  },
                  title: "下次打开「发送」页签时会再次显示首次引导",
                  children: "重新查看新手引导"
                }
              ) })
            ] })
          ] }),
u$2("div", { className: "cb-section cb-stack", style: { ...SECTION_STYLE, borderBottom: "none" }, children: [
u$2("div", { className: "cb-heading", style: HEADING_STYLE, children: "隐私说明" }),
u$2("div", { className: "cb-note", style: { color: "#666", marginBottom: ".75em" }, children: "本脚本在运行时可能会与以下外部服务通信。不同功能触发的请求不同，请按需启用。" }),
u$2("div", { className: "cb-list", style: { display: "flex", flexDirection: "column", gap: ".75em" }, children: EXTERNAL_SERVICES.map((service) => u$2(
              "div",
              {
                className: "cb-list-item",
                style: {
                  padding: ".5em",
                  borderRadius: "4px",
                  background: "var(--Ga1_s, rgba(0,0,0,.03))"
                },
                children: [
u$2("div", { style: { fontWeight: "bold", marginBottom: ".25em" }, children: service.url ? u$2("a", { href: service.url, target: "_blank", rel: "noopener", style: LINK_STYLE, children: service.name }) : service.name }),
u$2("div", { style: { fontSize: ".9em", color: "#666", fontFamily: "monospace", marginBottom: ".25em" }, children: service.host }),
u$2("div", { style: { fontSize: ".9em", marginBottom: ".25em" }, children: [
u$2("span", { style: { color: "#36a185" }, children: "触发条件:" }),
                    " ",
                    service.trigger
                  ] }),
u$2("div", { style: { fontSize: ".9em", color: "#555" }, children: service.description })
                ]
              },
              service.name
            )) })
          ] })
        ] });
      }
      function shouldRequireAutoBlendRealFireConfirm(state) {
        return !state.currentlyEnabled && !state.dryRun && !state.hasConfirmedRealFire;
      }
      function decideAutoBlendToggle(state, onConfirm) {
        if (!shouldRequireAutoBlendRealFireConfirm(state)) {
          return { proceed: true, markConfirmed: false };
        }
        const accepted = onConfirm();
        if (!accepted) return { proceed: false, markConfirmed: false };
        return { proceed: true, markConfirmed: true };
      }
      function NumberInput({
        value,
        min,
        max,
        width = "40px",
        onChange
      }) {
        const rangeText = max !== void 0 ? `${min}–${max}` : `≥${min}`;
        const rangeHint = max !== void 0 ? `允许范围：${min}–${max}` : `最小值：${min}`;
        return u$2("span", { style: { display: "inline-flex", alignItems: "center", gap: "2px" }, children: [
u$2(
            "input",
            {
              type: "number",
              autocomplete: "off",
              min: String(min),
              max: max !== void 0 ? String(max) : void 0,
              title: rangeHint,
              "aria-label": rangeHint,
              style: { width },
              value,
              onInput: (e2) => {
                let v2 = parseInt(e2.currentTarget.value, 10);
                if (Number.isNaN(v2) || v2 < min) v2 = min;
                if (max !== void 0 && v2 > max) v2 = max;
                onChange(v2);
              }
            }
          ),
u$2("span", { className: "cb-soft", "aria-hidden": "true", style: { fontSize: "10px", whiteSpace: "nowrap" }, children: rangeText })
        ] });
      }
      function markCustom() {
        autoBlendPreset.value = "custom";
      }
      function modeButtonStyle$1(active) {
        return {
          fontWeight: active ? "bold" : void 0
        };
      }
      function SettingHint({ children }) {
        return u$2("div", { className: "cb-note", style: { marginTop: "-.25em" }, children });
      }
      function BlacklistPanel() {
        const addUid = useSignal("");
        const addUname = useSignal("");
        const list = autoBlendUserBlacklist.value;
        const entries = Object.entries(list);
        const handleAdd = () => {
          const uid = addUid.value.trim().replace(/\D/g, "");
          if (!uid) return;
          if (uid in list) {
            appendLog(`⚠️ UID ${uid} 已在黑名单中`);
            return;
          }
          const next = { ...list, [uid]: addUname.value.trim() };
          autoBlendUserBlacklist.value = next;
          appendLog(`🚲 已加入融入黑名单：${addUname.value.trim() || uid}`);
          addUid.value = "";
          addUname.value = "";
        };
        const handleRemove = (uid) => {
          const next = { ...list };
          const display = next[uid] || uid;
          delete next[uid];
          autoBlendUserBlacklist.value = next;
          appendLog(`🚲 已解除融入黑名单：${display}`);
        };
        return u$2("details", { style: { marginTop: ".5em" }, children: [
u$2("summary", { style: { cursor: "pointer", userSelect: "none" }, children: [
            "融入黑名单",
            entries.length > 0 && u$2("span", { className: "cb-soft", children: [
              " (",
              entries.length,
              ")"
            ] })
          ] }),
u$2("div", { style: { margin: ".5em 0", display: "grid", gap: ".35em" }, children: [
u$2("div", { className: "cb-note", children: "黑名单用户的弹幕不会触发自动跟车。也可在弹幕右键菜单中添加。" }),
            entries.length > 0 ? u$2("div", { style: { maxHeight: "150px", overflowY: "auto", display: "grid", gap: ".25em" }, children: entries.map(([uid, uname]) => u$2(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: ".5em",
                  padding: "2px 4px",
                  borderRadius: "3px",
                  background: "rgba(0,0,0,.04)"
                },
                children: [
u$2(
                    "span",
                    {
                      style: {
                        flex: 1,
                        fontSize: "12px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      },
                      children: [
                        uname || "(未记录昵称)",
u$2("span", { style: { color: "#999", marginLeft: ".4em" }, children: [
                          "UID ",
                          uid
                        ] })
                      ]
                    }
                  ),
u$2(
                    "button",
                    {
                      type: "button",
                      className: "cb-rule-remove",
                      style: { minHeight: "unset", padding: "1px 6px", fontSize: "11px" },
                      onClick: () => handleRemove(uid),
                      children: "删除"
                    }
                  )
                ]
              },
              uid
            )) }) : u$2("div", { className: "cb-empty", children: "暂无黑名单用户" }),
u$2("div", { style: { display: "flex", gap: ".35em", alignItems: "center", flexWrap: "wrap" }, children: [
u$2(
                "input",
                {
                  type: "text",
                  placeholder: "UID",
                  style: { width: "80px" },
                  value: addUid.value,
                  onInput: (e2) => {
                    addUid.value = e2.currentTarget.value.replace(/\D/g, "");
                  },
                  onKeyDown: (e2) => {
                    if (e2.key === "Enter" && !e2.isComposing) {
                      e2.preventDefault();
                      handleAdd();
                    }
                  }
                }
              ),
u$2(
                "input",
                {
                  type: "text",
                  placeholder: "备注名（可选）",
                  style: { flex: 1, minWidth: "60px" },
                  value: addUname.value,
                  onInput: (e2) => {
                    addUname.value = e2.currentTarget.value;
                  },
                  onKeyDown: (e2) => {
                    if (e2.key === "Enter" && !e2.isComposing) {
                      e2.preventDefault();
                      handleAdd();
                    }
                  }
                }
              ),
u$2("button", { type: "button", onClick: handleAdd, style: { whiteSpace: "nowrap" }, children: "添加" })
            ] })
          ] })
        ] });
      }
      function AutoBlendControls() {
        const isOn = autoBlendEnabled.value;
        const currentPreset = autoBlendPreset.value;
        const presetHint = currentPreset === "safe" || currentPreset === "normal" || currentPreset === "hot" ? AUTO_BLEND_PRESETS[currentPreset].hint : "自定义参数";
        const statusColor = !isOn ? "#777" : autoBlendStatusText.value.includes("冷却") ? "#a15c00" : autoBlendStatusText.value.includes("跟车") ? "#1677ff" : "#0a7f55";
        const toggleEnabled = () => {
          const decision = decideAutoBlendToggle(
            {
              currentlyEnabled: autoBlendEnabled.value,
              dryRun: autoBlendDryRun.value,
              hasConfirmedRealFire: hasConfirmedAutoBlendRealFire.value
            },
            () => confirm(
              "自动跟车将会以你的账号真实发送弹幕（试运行已关闭）。\n\n建议先打开「试运行」观察一段时间。是否继续直接开启？"
            )
          );
          if (!decision.proceed) return;
          if (decision.markConfirmed) hasConfirmedAutoBlendRealFire.value = true;
          autoBlendEnabled.value = !autoBlendEnabled.value;
        };
        return u$2(
          "details",
          {
            open: autoBlendPanelOpen.value,
            onToggle: (e2) => {
              autoBlendPanelOpen.value = e2.currentTarget.open;
            },
            children: [
u$2("summary", { style: { cursor: "pointer", userSelect: "none", fontWeight: "bold" }, children: [
u$2("span", { children: "自动跟车" }),
                isOn && u$2("span", { className: "cb-soft", children: "已开" })
              ] }),
u$2("div", { className: "cb-body cb-stack", children: [
u$2("div", { className: "cb-note", style: { color: "#666", fontSize: "0.9em", marginBottom: ".25em" }, children: "条件满足时，会以你的账号自动发送弹幕。第一次开启建议先打开下方的「试运行」观察效果。" }),
u$2("div", { style: { display: "grid", gridTemplateColumns: "1fr auto", gap: ".5em", alignItems: "center" }, children: [
u$2("button", { type: "button", className: isOn ? "cb-danger" : "cb-primary", onClick: toggleEnabled, children: isOn ? "停止跟车" : "开始跟车" }),
u$2(
                    "span",
                    {
                      style: {
                        color: statusColor,
                        fontWeight: "bold",
                        whiteSpace: "nowrap"
                      },
                      children: [
u$2("span", { className: "cb-status-dot" }),
                        " ",
                        autoBlendStatusText.value
                      ]
                    }
                  )
                ] }),
u$2("div", { children: [
u$2("div", { className: "cb-segment", children: [
                    ["safe", "normal", "hot"].map((preset) => u$2(
                      "button",
                      {
                        type: "button",
                        "aria-pressed": currentPreset === preset,
                        onClick: () => applyAutoBlendPreset(preset),
                        style: modeButtonStyle$1(currentPreset === preset),
                        children: AUTO_BLEND_PRESETS[preset].label
                      },
                      preset
                    )),
u$2(
                      "button",
                      {
                        type: "button",
                        "aria-pressed": currentPreset === "custom",
                        onClick: () => {
                          autoBlendPreset.value = "custom";
                          autoBlendAdvancedOpen.value = true;
                        },
                        style: modeButtonStyle$1(currentPreset === "custom"),
                        title: "保留当前数值并切到自定义；点击后会展开高级设置以便调参。",
                        children: "自定义"
                      }
                    )
                  ] }),
u$2("div", { className: "cb-note", style: { marginTop: ".25em" }, children: [
                    "当前：",
                    presetHint
                  ] })
                ] }),
u$2(
                  "div",
                  {
                    className: "cb-panel",
                    style: {
                      color: isOn ? void 0 : "#999",
                      lineHeight: 1.6
                    },
                    children: [
u$2("div", { style: { display: "grid", gridTemplateColumns: "4.5em 1fr", gap: ".25em" }, children: [
u$2("strong", { children: "正在刷" }),
u$2("span", { style: { wordBreak: "break-all", overflowWrap: "anywhere" }, children: autoBlendCandidateText.value })
                      ] }),
u$2("div", { style: { display: "grid", gridTemplateColumns: "4.5em 1fr", gap: ".25em" }, children: [
u$2("strong", { children: "刚刚" }),
u$2("span", { style: { wordBreak: "break-all", overflowWrap: "anywhere" }, children: autoBlendLastActionText.value })
                      ] })
                    ]
                  }
                )
              ] }),
u$2(
                "details",
                {
                  open: autoBlendAdvancedOpen.value,
                  onToggle: (e2) => {
                    autoBlendAdvancedOpen.value = e2.currentTarget.open;
                  },
                  style: { marginTop: ".5em" },
                  children: [
u$2("summary", { style: { cursor: "pointer", userSelect: "none" }, children: "高级设置" }),
u$2(
                      "div",
                      {
                        style: {
                          margin: ".5em 0",
                          display: "grid",
                          gap: ".5em",
                          color: isOn ? void 0 : "#999"
                        },
                        children: [
u$2("div", { style: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: ".25em" }, children: [
u$2("span", { children: "多少算跟：" }),
u$2(
                              NumberInput,
                              {
                                value: autoBlendWindowSec.value,
                                min: 3,
                                onChange: (v2) => {
                                  markCustom();
                                  autoBlendWindowSec.value = v2;
                                }
                              }
                            ),
u$2("span", { children: "秒内" }),
u$2(
                              NumberInput,
                              {
                                value: autoBlendThreshold.value,
                                min: 2,
                                onChange: (v2) => {
                                  markCustom();
                                  autoBlendThreshold.value = v2;
                                }
                              }
                            ),
u$2("span", { children: "条" })
                          ] }),
u$2(SettingHint, { children: "在指定秒数内，同一句弹幕达到条数才触发；阈值越低越积极。" }),
u$2("div", { style: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: ".25em" }, children: [
u$2("span", { children: "节奏：" }),
u$2("span", { children: "冷却" }),
u$2(
                              NumberInput,
                              {
                                value: autoBlendCooldownSec.value,
                                min: 4,
                                width: "50px",
                                onChange: (v2) => {
                                  markCustom();
                                  autoBlendCooldownSec.value = v2;
                                }
                              }
                            ),
u$2("span", { children: "秒，补跟" }),
u$2(
                              NumberInput,
                              {
                                value: autoBlendRoutineIntervalSec.value,
                                min: 10,
                                width: "50px",
                                onChange: (v2) => {
                                  markCustom();
                                  autoBlendRoutineIntervalSec.value = v2;
                                }
                              }
                            ),
u$2("span", { children: "秒" })
                          ] }),
u$2(SettingHint, { children: "冷却是每次发送后的停顿；补跟是没有突发时重新检查热门弹幕的间隔。" }),
u$2("div", { style: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: ".25em" }, children: [
u$2("span", { children: "突发等待" }),
u$2(
                              NumberInput,
                              {
                                value: autoBlendBurstSettleMs.value,
                                min: 0,
                                max: 1e4,
                                width: "58px",
                                onChange: (v2) => {
                                  markCustom();
                                  autoBlendBurstSettleMs.value = v2;
                                }
                              }
                            ),
u$2("span", { children: "毫秒" })
                          ] }),
u$2(SettingHint, { children: "检测到刷屏后先等一小会儿，把同一波里的其它高频弹幕一起纳入判断。" }),
u$2("div", { style: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: ".25em" }, children: [
u$2("span", { children: "限频保护：" }),
u$2(
                              NumberInput,
                              {
                                value: autoBlendRateLimitWindowMin.value,
                                min: 1,
                                max: 60,
                                width: "44px",
                                onChange: (v2) => {
                                  markCustom();
                                  autoBlendRateLimitWindowMin.value = v2;
                                }
                              }
                            ),
u$2("span", { children: "分钟内" }),
u$2(
                              NumberInput,
                              {
                                value: autoBlendRateLimitStopThreshold.value,
                                min: 1,
                                max: 20,
                                width: "40px",
                                onChange: (v2) => {
                                  markCustom();
                                  autoBlendRateLimitStopThreshold.value = v2;
                                }
                              }
                            ),
u$2("span", { children: "次后停车" })
                          ] }),
u$2(SettingHint, { children: "限制连续失败或风控信号；超过次数会自动停止跟车，避免继续刷失败。" }),
u$2("div", { style: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: ".25em" }, children: [
u$2("span", { children: "每次发：" }),
u$2(
                              NumberInput,
                              {
                                value: autoBlendSendCount.value,
                                min: 1,
                                max: 20,
                                width: "40px",
                                onChange: (v2) => {
                                  markCustom();
                                  autoBlendSendCount.value = v2;
                                }
                              }
                            ),
u$2("span", { children: "遍" })
                          ] }),
u$2(SettingHint, { children: "同一句被选中后重复发送的次数；建议配合发送间隔和冷却一起调。" })
                        ]
                      }
                    ),
u$2("div", { style: { margin: ".5em 0", display: "grid", gap: ".35em" }, children: [
u$2("span", { style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                          "input",
                          {
                            id: "autoBlendDryRun",
                            type: "checkbox",
                            checked: autoBlendDryRun.value,
                            onInput: (e2) => {
                              markCustom();
                              autoBlendDryRun.value = e2.currentTarget.checked;
                            }
                          }
                        ),
u$2("label", { for: "autoBlendDryRun", title: "开启后只在日志里显示会发送什么，不会真的发出。关闭后会真实发送弹幕。", children: "试运行（只观察，不发送）" }),
                        !autoBlendDryRun.value && u$2("span", { style: { color: "#a15c00", fontSize: "0.85em" }, title: "当前关闭试运行，会真实发送弹幕。", children: "关闭后会真实发送" })
                      ] }),
u$2("span", { style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                          "input",
                          {
                            id: "autoBlendRequireDistinctUsers",
                            type: "checkbox",
                            checked: autoBlendRequireDistinctUsers.value,
                            onInput: (e2) => {
                              markCustom();
                              autoBlendRequireDistinctUsers.value = e2.currentTarget.checked;
                            }
                          }
                        ),
u$2("label", { for: "autoBlendRequireDistinctUsers", children: "多人都在刷才跟" }),
                        autoBlendRequireDistinctUsers.value && u$2(S$1, { children: [
u$2("span", { children: "至少" }),
u$2(
                            NumberInput,
                            {
                              value: autoBlendMinDistinctUsers.value,
                              min: 2,
                              width: "40px",
                              onChange: (v2) => {
                                markCustom();
                                autoBlendMinDistinctUsers.value = v2;
                              }
                            }
                          ),
u$2("span", { children: "人" })
                        ] })
                      ] }),
u$2("span", { style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                          "input",
                          {
                            id: "autoBlendUseReplacements",
                            type: "checkbox",
                            checked: autoBlendUseReplacements.value,
                            onInput: (e2) => {
                              markCustom();
                              autoBlendUseReplacements.value = e2.currentTarget.checked;
                            }
                          }
                        ),
u$2("label", { for: "autoBlendUseReplacements", children: "套用替换规则" })
                      ] }),
u$2("span", { style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                          "input",
                          {
                            id: "autoBlendIncludeReply",
                            type: "checkbox",
                            checked: autoBlendIncludeReply.value,
                            onInput: (e2) => {
                              markCustom();
                              autoBlendIncludeReply.value = e2.currentTarget.checked;
                            }
                          }
                        ),
u$2("label", { for: "autoBlendIncludeReply", children: "也跟 @ 回复" })
                      ] }),
u$2("span", { style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                          "input",
                          {
                            id: "autoBlendSendAllTrending",
                            type: "checkbox",
                            checked: autoBlendSendAllTrending.value,
                            onInput: (e2) => {
                              markCustom();
                              autoBlendSendAllTrending.value = e2.currentTarget.checked;
                            }
                          }
                        ),
u$2("label", { for: "autoBlendSendAllTrending", title: "命中后连发同一波里多句达标弹幕，更激进。", children: "一波刷屏全跟" }),
u$2("span", { style: { color: "#a15c00" }, title: "更激进：命中一波后会连发多条达标弹幕，更容易被风控。", children: "（更激进）" })
                      ] })
                    ] }),
                    autoBlendSendAllTrending.value && u$2("div", { style: { color: "#a15c00", fontSize: "12px", lineHeight: 1.5, marginBottom: ".25em" }, children: "会把同一波里达标的几句话依次发出去。" }),
                    autoBlendSendCount.value * msgSendInterval.value > autoBlendCooldownSec.value && u$2("div", { style: { color: "#a15c00", fontSize: "12px", lineHeight: 1.5, marginBottom: ".25em" }, children: [
                      "当前要发 ",
                      autoBlendSendCount.value * msgSendInterval.value,
                      "s，超过冷却 ",
                      autoBlendCooldownSec.value,
                      "s。"
                    ] }),
u$2(BlacklistPanel, {})
                  ]
                }
              )
            ]
          }
        );
      }
      function getPreview(template) {
        const firstLine = (template.split("\n")[0] ?? "").trim();
        if (!firstLine) return "(空)";
        return getGraphemes(firstLine).length > 10 ? `${trimText(firstLine, 10)[0]}…` : firstLine;
      }
      function AutoSendControls() {
        const templates = msgTemplates.value;
        const idx = activeTemplateIndex.value;
        const currentTemplate = templates[idx] ?? "";
        const msgCount = processMessages(currentTemplate, maxLength.value).length;
        const toggleSend = () => {
          if (!sendMsg.value) {
            if (!currentTemplate.trim()) {
              appendLog("⚠️ 当前模板为空，请先输入内容");
              return;
            }
            sendMsg.value = true;
          } else {
            cancelLoop();
            sendMsg.value = false;
          }
        };
        const updateTemplate = (text) => {
          const next = [...templates];
          next[idx] = text;
          msgTemplates.value = next;
        };
        const addTemplate = () => {
          msgTemplates.value = [...templates, ""];
          activeTemplateIndex.value = msgTemplates.value.length - 1;
        };
        const removeTemplate = () => {
          if (templates.length <= 1) return;
          const next = [...templates];
          next.splice(idx, 1);
          msgTemplates.value = next;
          activeTemplateIndex.value = Math.max(0, idx - 1);
        };
        return u$2(
          "details",
          {
            open: autoSendPanelOpen.value,
            onToggle: (e2) => {
              autoSendPanelOpen.value = e2.currentTarget.open;
            },
            children: [
u$2("summary", { style: { cursor: "pointer", userSelect: "none", fontWeight: "bold" }, children: [
u$2("span", { children: "独轮车" }),
                sendMsg.value && u$2("span", { className: "cb-soft", children: "运行中" })
              ] }),
u$2("div", { className: "cb-body cb-stack", children: [
u$2("div", { className: "cb-row", children: [
u$2("button", { type: "button", className: sendMsg.value ? "cb-danger" : "cb-primary", onClick: toggleSend, children: sendMsg.value ? "停车" : "开车" }),
u$2(
                    "select",
                    {
                      style: { width: "16ch" },
                      value: String(idx),
                      onChange: (e2) => {
                        activeTemplateIndex.value = parseInt(e2.currentTarget.value, 10);
                      },
                      children: templates.map((t2, i2) => u$2("option", { value: String(i2), children: [
                        i2 + 1,
                        ": ",
                        getPreview(t2)
                      ] }, i2))
                    }
                  ),
u$2("button", { type: "button", onClick: addTemplate, children: "新增" }),
u$2("button", { type: "button", onClick: removeTemplate, children: "删除当前" })
                ] }),
u$2(
                  "textarea",
                  {
                    value: currentTemplate,
                    onInput: (e2) => updateTemplate(e2.currentTarget.value),
                    placeholder: "在这输入弹幕，每行一句话，超过可发送字数的会自动进行分割",
                    style: { boxSizing: "border-box", height: "80px", width: "100%", resize: "vertical" }
                  }
                ),
u$2("div", { className: "cb-panel cb-stack", children: [
u$2("div", { className: "cb-row", children: [
u$2("span", { children: [
                      msgCount,
                      " 条，"
                    ] }),
u$2("span", { children: "间隔" }),
u$2(
                      "input",
                      {
                        type: "number",
                        min: "0",
                        autocomplete: "off",
                        title: "允许范围：≥0 秒",
                        "aria-label": "发送间隔（秒），允许范围 ≥0",
                        style: { width: "40px" },
                        value: msgSendInterval.value,
                        onInput: (e2) => {
                          const v2 = parseInt(e2.currentTarget.value, 10);
                          msgSendInterval.value = v2 >= 0 ? v2 : 0;
                        }
                      }
                    ),
u$2("span", { className: "cb-soft", "aria-hidden": "true", style: { fontSize: "10px" }, children: "≥0" }),
u$2("span", { children: "秒，" }),
u$2("span", { children: "超过" }),
u$2(
                      "input",
                      {
                        type: "number",
                        min: "1",
                        autocomplete: "off",
                        title: "允许范围：≥1 字",
                        "aria-label": "自动分段字数阈值，允许范围 ≥1",
                        style: { width: "30px" },
                        value: maxLength.value,
                        onInput: (e2) => {
                          const v2 = parseInt(e2.currentTarget.value, 10);
                          maxLength.value = v2 >= 1 ? v2 : 1;
                        }
                      }
                    ),
u$2("span", { className: "cb-soft", "aria-hidden": "true", style: { fontSize: "10px" }, children: "≥1" }),
u$2("span", { children: "字自动分段" })
                  ] }),
u$2("span", { className: "cb-row", children: [
u$2(
                      "input",
                      {
                        id: "randomColor",
                        type: "checkbox",
                        checked: randomColor.value,
                        onInput: (e2) => {
                          randomColor.value = e2.currentTarget.checked;
                        }
                      }
                    ),
u$2("label", { for: "randomColor", children: "随机颜色" })
                  ] }),
u$2("span", { className: "cb-row", children: [
u$2(
                      "input",
                      {
                        id: "randomInterval",
                        type: "checkbox",
                        checked: randomInterval.value,
                        onInput: (e2) => {
                          randomInterval.value = e2.currentTarget.checked;
                        }
                      }
                    ),
u$2("label", { for: "randomInterval", children: "间隔增加随机性" })
                  ] }),
u$2("span", { className: "cb-row", children: [
u$2(
                      "input",
                      {
                        id: "randomChar",
                        type: "checkbox",
                        checked: randomChar.value,
                        onInput: (e2) => {
                          randomChar.value = e2.currentTarget.checked;
                        }
                      }
                    ),
u$2("label", { for: "randomChar", children: "随机字符" })
                  ] }),
u$2("span", { className: "cb-row", children: [
u$2(
                      "input",
                      {
                        id: "persistSendState",
                        type: "checkbox",
                        disabled: cachedRoomId.value === null,
                        checked: cachedRoomId.value !== null && !!persistSendState.value[String(cachedRoomId.value)],
                        onInput: (e2) => {
                          const roomId = cachedRoomId.value;
                          if (roomId === null) return;
                          persistSendState.value = { ...persistSendState.value, [String(roomId)]: e2.currentTarget.checked };
                        }
                      }
                    ),
u$2("label", { for: "persistSendState", children: "保持当前直播间独轮车开关状态" })
                  ] })
                ] })
              ] })
            ]
          }
        );
      }
      const RECENT_ACTION_WINDOW_MS = 5e3;
      const MODE_LABEL$1 = {
        heuristic: "启发式",
        llm: "LLM"
      };
      function formatHzmDriveStatus({
        enabled,
        mode,
        dryRun,
        lastActionAt: lastActionAt2,
        now,
        gateOpen = true
      }) {
        if (!enabled) return "已关闭";
        if (dryRun) return "试运行（不发送）";
        if (lastActionAt2 !== null && now - lastActionAt2 <= RECENT_ACTION_WINDOW_MS) {
          return `运行中 · ${MODE_LABEL$1[mode]}`;
        }
        if (!gateOpen) return "观察中（公屏冷清）";
        return "观察中";
      }
      const RECENT_DANMU_TTL_MS = 6e4;
      const RECENT_DANMU_MAX = 200;
      const PAUSE_HOLD_MS = 6e4;
      const MIN_TICK_DELAY_MS = 2e3;
      let recentDanmu = [];
      let unsubscribe = null;
      let tickTimer = null;
      let pausedUntil = 0;
      const sentTimestamps = [];
      let heuristicTickCount = 0;
      let activeRoomId = null;
      let activeSource = null;
      let memesProvider = null;
      let lastActionAt = null;
      function resetRuntime() {
        recentDanmu = [];
        pausedUntil = 0;
        sentTimestamps.length = 0;
        heuristicTickCount = 0;
        activeRoomId = null;
        activeSource = null;
        memesProvider = null;
        lastActionAt = null;
      }
      function updateHzmStatusText() {
        hzmDriveStatusText.value = formatHzmDriveStatus({
          enabled: hzmDriveEnabled.value,
          mode: hzmDriveMode.value,
          dryRun: hzmDryRun.value,
          lastActionAt,
          now: Date.now(),
          gateOpen: isActivityGateOpen(Date.now())
        });
      }
      function isActivityGateOpen(now, records) {
        const cutoff = now - hzmActivityWindowSec.value * 1e3;
        const window2 = recentDanmu.filter((d2) => d2.ts >= cutoff);
        if (window2.length < hzmActivityMinDanmu.value) return false;
        const distinctUids = new Set();
        for (const d2 of window2) {
          if (d2.uid) distinctUids.add(d2.uid);
        }
        return distinctUids.size >= hzmActivityMinDistinctUsers.value;
      }
      j$1(() => {
        void hzmDriveEnabled.value;
        void hzmDriveMode.value;
        void hzmDryRun.value;
        updateHzmStatusText();
      });
      function getRecentDanmuTexts() {
        const cutoff = Date.now() - RECENT_DANMU_TTL_MS;
        recentDanmu = recentDanmu.filter((d2) => d2.ts >= cutoff);
        return recentDanmu.map((d2) => d2.text);
      }
      function getEffectivePauseKeywords(source) {
        const override = hzmPauseKeywordsOverride.value.trim();
        const lines = override ? override.split("\n").map((s2) => s2.trim()).filter(Boolean) : source.pauseKeywords ?? [];
        const patterns = [];
        for (const p2 of lines) {
          try {
            patterns.push(new RegExp(p2));
          } catch {
          }
        }
        return patterns;
      }
      function shouldPauseFromKeywords(source) {
        const recent = getRecentDanmuTexts().join(" ");
        for (const re of getEffectivePauseKeywords(source)) {
          if (re.test(recent)) {
            pausedUntil = Date.now() + PAUSE_HOLD_MS;
            appendLog(`⏸ 智驾：检测到暂停关键词，60s 内不发`);
            return true;
          }
        }
        return Date.now() < pausedUntil;
      }
      function withinRateLimit() {
        const cutoff = Date.now() - 6e4;
        while (sentTimestamps.length > 0 && sentTimestamps[0] < cutoff) {
          sentTimestamps.shift();
        }
        return sentTimestamps.length < hzmRateLimitPerMin.value;
      }
      function buildCandidatePool(opts) {
        const recent = new Set(opts.recentSent ?? getRecentSent(opts.roomId));
        const blacklist = new Set(opts.blacklistTags ?? getBlacklistTags(opts.roomId));
        return opts.memes.filter((m2) => {
          if (!m2.content) return false;
          if (recent.has(m2.content)) return false;
          if (m2.tags.some((t2) => blacklist.has(t2.name))) return false;
          return true;
        });
      }
      function pickByHeuristic(opts) {
        const pool = buildCandidatePool({
          roomId: opts.roomId,
          memes: opts.memes,
          recentSent: opts.recentSent,
          blacklistTags: opts.blacklistTags
        });
        if (pool.length === 0) return null;
        const keywordEntries = Object.entries(opts.source.keywordToTag ?? {});
        const matchKeyword = (text) => {
          for (const [pattern, tag] of keywordEntries) {
            try {
              if (new RegExp(pattern).test(text)) return tag;
            } catch {
            }
          }
          return null;
        };
        let matchedTag = null;
        if (opts.recentDanmu && opts.recentDanmu.length > 0) {
          const windowMs = opts.trendingWindowMs ?? 3e4;
          const threshold = opts.trendingThreshold ?? 2;
          const trend = detectTrend(
            opts.recentDanmu.map((d2) => ({ text: d2.text, ts: d2.ts, uid: d2.uid })),
            windowMs,
            threshold
          );
          if (trend.text) {
            const tag = matchKeyword(trend.text);
            if (tag) matchedTag = tag;
          }
        }
        if (!matchedTag) matchedTag = matchKeyword(opts.recentDanmuText);
        let filtered = null;
        if (matchedTag) {
          const byTag = pool.filter((m2) => m2.tags.some((t2) => t2.name === matchedTag));
          if (byTag.length > 0) filtered = byTag;
        } else {
          const selected = opts.selectedTags ?? getSelectedTags(opts.roomId);
          if (selected.length > 0) {
            const sel = new Set(selected);
            const bySelected = pool.filter((m2) => m2.tags.some((t2) => sel.has(t2.name)));
            if (bySelected.length > 0) filtered = bySelected;
          }
        }
        if (filtered === null) {
          const strict = opts.strict ?? hzmStrictHeuristic.value;
          if (strict) return null;
          filtered = pool;
        }
        const rand = opts.randomFn ?? Math.random;
        return filtered[Math.floor(rand() * filtered.length)] ?? null;
      }
      async function pickByLLM(roomId, source, opts) {
        const apiKey = hzmLlmApiKey.value.trim();
        if (!apiKey) return { kind: "error" };
        const all = memesProvider?.() ?? [];
        const pool = buildCandidatePool({ roomId, memes: all }).slice(0, 30);
        if (pool.length === 0) return { kind: "error" };
        bumpDailyLlmCalls(roomId);
        try {
          const chooser = opts?.chooser ?? (await __vitePreload(async () => {
            const { chooseMemeWithLLM } = await module.import('./llm-driver-BlAF69Id-Dm-Qekq_.js');
            return { chooseMemeWithLLM };
          }, true ? void 0 : void 0)).chooseMemeWithLLM;
          const chosenContent = await chooser({
            provider: hzmLlmProvider.value,
            apiKey,
            model: hzmLlmModel.value,
            baseURL: hzmLlmBaseURL.value.trim() || void 0,
            roomName: source.name,
            recentChat: opts?.recentChat ?? getRecentDanmuTexts().slice(-30),
            candidates: pool.map((m2) => ({ id: String(m2.id), content: m2.content, tags: m2.tags.map((t2) => t2.name) }))
          });
          if (!chosenContent) return { kind: "abstain" };
          const meme = pool.find((m2) => m2.content === chosenContent);
          return meme ? { kind: "pick", meme } : { kind: "abstain" };
        } catch (err) {
          appendLog(`⚠️ 智驾 LLM 调用失败，回退启发式：${err instanceof Error ? err.message : String(err)}`);
          return { kind: "error" };
        }
      }
      async function sendOne(roomId, meme) {
        if (hzmDryRun.value) {
          appendLog(`🚗[试运行] 智驾候选：${meme.content}`);
          pushRecentSent(roomId, meme.content);
          lastActionAt = Date.now();
          updateHzmStatusText();
          return;
        }
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
          appendLog("❌ 智驾：未找到登录信息，已暂停发送");
          pausedUntil = Date.now() + PAUSE_HOLD_MS;
          return;
        }
        try {
          const result = await enqueueDanmaku(meme.content, roomId, csrfToken, SendPriority.AUTO);
          if (result.success && !result.cancelled) {
            sentTimestamps.push(Date.now());
            pushRecentSent(roomId, meme.content);
            bumpDailySent(roomId);
            lastActionAt = Date.now();
            updateHzmStatusText();
            appendLog(`🚗 智驾：${meme.content}`);
          } else if (result.cancelled) {
            appendLog(`⏭ 智驾被打断：${meme.content}`);
          } else {
            appendLog(`❌ 智驾发送失败：${meme.content}，原因：${result.error ?? "未知"}`);
          }
        } catch (err) {
          appendLog(`❌ 智驾发送异常：${err instanceof Error ? err.message : String(err)}`);
        }
      }
      async function tick() {
        if (!hzmDriveEnabled.value || activeRoomId === null || activeSource === null) {
          tickTimer = null;
          return;
        }
        try {
          const now = Date.now();
          if (shouldPauseFromKeywords(activeSource)) {
            scheduleNext(hzmDriveIntervalSec.value * 2);
            return;
          }
          if (now < pausedUntil) {
            scheduleNext(hzmDriveIntervalSec.value);
            return;
          }
          if (!withinRateLimit()) {
            scheduleNext(hzmDriveIntervalSec.value);
            return;
          }
          if (!isActivityGateOpen(now)) {
            updateHzmStatusText();
            scheduleNext(hzmDriveIntervalSec.value);
            return;
          }
          heuristicTickCount++;
          let meme = null;
          const llmRatio = Math.max(1, hzmLlmRatio.value);
          const useLLM = hzmDriveMode.value === "llm" && hzmLlmApiKey.value.trim() !== "" && heuristicTickCount % llmRatio === 0;
          if (useLLM) {
            const result = await pickByLLM(activeRoomId, activeSource);
            if (result.kind === "abstain") {
              scheduleNext(hzmDriveIntervalSec.value);
              return;
            }
            if (result.kind === "pick") meme = result.meme;
          }
          if (!meme) {
            meme = pickByHeuristic({
              roomId: activeRoomId,
              source: activeSource,
              memes: memesProvider?.() ?? [],
              recentDanmuText: getRecentDanmuTexts().join(" "),
              recentDanmu
            });
          }
          if (meme) {
            await sendOne(activeRoomId, meme);
          }
        } catch (err) {
          appendLog(`⚠️ 智驾 tick 异常：${err instanceof Error ? err.message : String(err)}`);
        } finally {
          scheduleNext(hzmDriveIntervalSec.value);
        }
      }
      function scheduleNext(baseSec) {
        if (!hzmDriveEnabled.value) {
          tickTimer = null;
          return;
        }
        const jitter = baseSec * (0.7 + Math.random() * 0.8);
        const delay = Math.max(MIN_TICK_DELAY_MS, Math.round(jitter * 1e3));
        tickTimer = setTimeout(() => {
          void tick();
        }, delay);
      }
      async function startHzmAutoDrive(opts) {
        stopHzmAutoDrive();
        let roomId;
        try {
          roomId = await ensureRoomId();
        } catch (err) {
          notifyUser("error", "智驾启动失败：无法获取房间号", err instanceof Error ? err.message : String(err));
          return;
        }
        if (roomId !== opts.source.roomId) {
          notifyUser("warning", `当前房间 (${roomId}) 与梗源配置 (${opts.source.roomId}) 不匹配，智驾未启动`);
          return;
        }
        activeRoomId = roomId;
        activeSource = opts.source;
        memesProvider = opts.getMemes;
        unsubscribe = subscribeDanmaku({
          onMessage: (ev) => {
            if (!ev.text) return;
            recentDanmu.push({ ts: Date.now(), text: ev.text, uid: ev.uid ?? null });
            if (recentDanmu.length > RECENT_DANMU_MAX) {
              recentDanmu.splice(0, recentDanmu.length - RECENT_DANMU_MAX);
            }
          }
        });
        appendLog(
          `🤖 智能辅助驾驶已启动（mode=${hzmDriveMode.value}，试运行=${hzmDryRun.value ? "开" : "关"}）— 独轮车工具无罪，请合理使用`
        );
        updateHzmStatusText();
        void tick();
      }
      function stopHzmAutoDrive() {
        if (tickTimer) {
          clearTimeout(tickTimer);
          tickTimer = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        resetRuntime();
        updateHzmStatusText();
      }
      const DEFAULT_MEME_SOURCES = {






"1713546334": {
          roomId: 1713546334,
          name: "灰泽满烂梗库",
          listEndpoint: "https://sbhzm.cn/api/public/memes",
          randomEndpoint: "https://sbhzm.cn/api/public/memes/random",
          defaultTags: ["满弟", "喷绿冻", "老弥"],
          keywordToTag: {
            "冲耳朵|耳朵痛|实习医生|医生|住院|医院": "满弟",
            "绿冻|绿茬|喷.*绿|路人.*骂": "喷绿冻",
            "困|睡|累|休息|床|被子|起床": "老弥",
            "可爱|心动|心疼|爱.*(?:灰|满)|宝贝|乖": "爱灰泽满",
            "傻逼|讨厌|喷.*(?:灰|满)|骂.*(?:灰|满)|烦死|滚": "喷灰泽满",
            "茶|奶茶|龙井|绿茶": "茶",
            "富|有钱|sc|大哥|舰长|豪|订阅": "富",
            "原话|刚.*说|刚才.*说|你.*说.*过": "原话",
            "黄桃|罐头": "黄桃",
            "丈育|文盲|不识字": "丈育",
            "hololive|holo|宝钟|姫|崎波": "hololive",
            "nijisanji|彩虹社|niji|社团": "nijisanji",
            "东野圭吾|侦探|推理|嫌疑人": "东野圭吾",
            "同事|公司|周报|加班|上班": "同事",
            "满爸|爸爸|父亲": "满爸",
            "群魔乱舞|聚众|互喷|对骂": "群魔乱舞"
          },
          pauseKeywords: ["歇歇", "够了", "别刷了", "刷够了", "烦", "不要刷", "停一下"],
          submitPage: "https://sbhzm.cn/submit"
        }
      };
      function getMemeSourceForRoom(roomId) {
        if (roomId == null) return null;
        return DEFAULT_MEME_SOURCES[String(roomId)] ?? null;
      }
      const PROVIDER_LABEL = {
        anthropic: "Anthropic",
        openai: "OpenAI",
        "openai-compat": "OpenAI 兼容"
      };
      const MODE_LABEL = {
        heuristic: "启发式",
        llm: "LLM 智驾"
      };
      const MODE_HINT = {
        heuristic: "关键词触发，按 tag 命中本地梗库",
        llm: "由 LLM 阅读弹幕选梗，需要 API key"
      };
      function maskKey(k2) {
        const trimmed = k2.trim();
        if (trimmed.length <= 8) return trimmed ? `${trimmed[0]}***${trimmed.at(-1)}` : "";
        return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
      }
      function modeButtonStyle(active) {
        return {
          fontWeight: active ? "bold" : void 0
        };
      }
      function resolveCurrentRoomIdSync() {
        const fromCache = cachedRoomId.value;
        if (fromCache !== null) return fromCache;
        try {
          const slug = extractRoomNumber(window.location.href);
          if (!slug) return null;
          const n2 = Number(slug);
          return Number.isFinite(n2) && n2 > 0 ? n2 : null;
        } catch {
          return null;
        }
      }
      function HzmDrivePanelMount() {
        const source = getMemeSourceForRoom(resolveCurrentRoomIdSync());
        if (!source) return null;
        return u$2(HzmDrivePanel, { source });
      }
      function HzmDrivePanel({ source }) {
        const roomId = cachedRoomId.value;
        const stats = getDailyStats(roomId);
        const selected = getSelectedTags(roomId);
        const blacklist = getBlacklistTags(roomId);
        const isOn = hzmDriveEnabled.value;
        const mode = hzmDriveMode.value;
        const memes = currentMemesList.value;
        const tagOptions = (() => {
          const set = new Set();
          for (const m2 of memes) {
            for (const t2 of m2.tags) {
              if (t2.name) set.add(t2.name);
            }
          }
          return [...set].sort();
        })();
        const testStatus = useSignal("idle");
        const testError = useSignal("");
        const advancedOpen = useSignal(false);
        const llmConfigOpen = useSignal(false);
        const statusText = hzmDriveStatusText.value;
        const statusColor = !isOn ? "#777" : statusText.includes("试运行") ? "#a15c00" : statusText.includes("运行中") ? "#1677ff" : "#0a7f55";
        const toggleEnabled = () => {
          if (isOn) {
            hzmDriveEnabled.value = false;
            stopHzmAutoDrive();
            return;
          }
          if (!hzmDryRun.value && !hasConfirmedHzmRealFire.value) {
            const ok = confirm(
              "智能辅助驾驶将会以你的账号真实发送弹幕（试运行已关闭）。\n\n建议先打开「试运行」观察一段时间。是否继续直接开车？"
            );
            if (!ok) return;
            hasConfirmedHzmRealFire.value = true;
          }
          hzmDriveEnabled.value = true;
          void startHzmAutoDrive({ source, getMemes: () => currentMemesList.value });
        };
        const handleTestLLM = async () => {
          if (testStatus.value === "testing") return;
          testStatus.value = "testing";
          testError.value = "";
          try {
            const { testLLMConnection } = await __vitePreload(async () => {
              const { testLLMConnection: testLLMConnection2 } = await module.import('./llm-driver-BlAF69Id-Dm-Qekq_.js');
              return { testLLMConnection: testLLMConnection2 };
            }, true ? void 0 : void 0);
            const r2 = await testLLMConnection({
              provider: hzmLlmProvider.value,
              apiKey: hzmLlmApiKey.value,
              model: hzmLlmModel.value,
              baseURL: hzmLlmBaseURL.value.trim() || void 0
            });
            if (r2.ok) {
              testStatus.value = "ok";
            } else {
              testStatus.value = "fail";
              testError.value = r2.error ?? "未知错误";
            }
          } catch (err) {
            testStatus.value = "fail";
            testError.value = err instanceof Error ? err.message : String(err);
          }
        };
        const toggleSelectedTag = (tag) => {
          if (roomId === null) return;
          setSelectedTags(roomId, selected.includes(tag) ? selected.filter((t2) => t2 !== tag) : [...selected, tag]);
        };
        const toggleBlacklistTag = (tag) => {
          if (roomId === null) return;
          setBlacklistTags(roomId, blacklist.includes(tag) ? blacklist.filter((t2) => t2 !== tag) : [...blacklist, tag]);
        };
        const apiKeyConfigured = hzmLlmApiKey.value.trim().length > 0;
        const pauseDefault = (source.pauseKeywords ?? []).join(" / ");
        return u$2(
          "details",
          {
            open: hzmPanelOpen.value,
            onToggle: (e2) => {
              hzmPanelOpen.value = e2.currentTarget.open;
            },
            children: [
u$2("summary", { style: { cursor: "pointer", userSelect: "none", fontWeight: "bold" }, children: [
u$2("span", { children: [
                  "智能辅助驾驶（",
                  source.name,
                  "）"
                ] }),
                isOn && u$2("span", { className: "cb-soft", children: "已开" })
              ] }),
u$2("div", { className: "cb-body cb-stack", children: [
u$2("div", { className: "cb-note", style: { marginBottom: ".25em" }, children: "条件满足时，会以你的账号自动从烂梗库挑选并发送弹幕。第一次开启建议先打开下方的「试运行」观察效果。" }),
u$2("div", { style: { display: "grid", gridTemplateColumns: "1fr auto", gap: ".5em", alignItems: "center" }, children: [
u$2("button", { type: "button", className: isOn ? "cb-danger" : "cb-primary", onClick: toggleEnabled, children: isOn ? "停车" : "开车" }),
u$2(
                    "span",
                    {
                      style: {
                        color: statusColor,
                        fontWeight: "bold",
                        whiteSpace: "nowrap"
                      },
                      children: [
u$2("span", { className: "cb-status-dot" }),
                        " ",
                        statusText
                      ]
                    }
                  )
                ] }),
u$2("div", { children: [
u$2("div", { className: "cb-segment", children: ["heuristic", "llm"].map((m2) => u$2(
                    "button",
                    {
                      type: "button",
                      "aria-pressed": mode === m2,
                      onClick: () => {
                        hzmDriveMode.value = m2;
                        testStatus.value = "idle";
                      },
                      style: modeButtonStyle(mode === m2),
                      title: MODE_HINT[m2],
                      children: MODE_LABEL[m2]
                    },
                    m2
                  )) }),
u$2("div", { className: "cb-note", style: { marginTop: ".25em" }, children: [
                    "当前：",
                    MODE_HINT[mode]
                  ] })
                ] }),
u$2("span", { style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                    "input",
                    {
                      id: "hzmDryRun",
                      type: "checkbox",
                      checked: hzmDryRun.value,
                      onInput: (e2) => {
                        hzmDryRun.value = e2.currentTarget.checked;
                      }
                    }
                  ),
u$2("label", { for: "hzmDryRun", title: "开启后只在日志显示候选，不真发到弹幕——新手强烈建议先开", children: "试运行（只观察，不发送）" }),
                  !hzmDryRun.value && u$2("span", { style: { color: "#a15c00", fontSize: "0.85em" }, title: "当前关闭试运行，会真实发送弹幕。", children: "关闭后会真实发送" })
                ] }),
u$2(
                  "div",
                  {
                    className: "cb-panel",
                    style: {
                      color: isOn ? void 0 : "#999",
                      lineHeight: 1.6
                    },
                    children: u$2("div", { style: { display: "grid", gridTemplateColumns: "4.5em 1fr", gap: ".25em" }, children: [
u$2("strong", { children: "今日" }),
u$2("span", { children: [
                        "已发 ",
u$2("b", { children: stats.sent }),
                        " 条 · LLM 调用 ",
u$2("b", { children: stats.llmCalls }),
                        " 次"
                      ] })
                    ] })
                  }
                ),
                sendMsg.value && u$2("div", { style: { color: "#a15c00", fontSize: "12px", lineHeight: 1.5 }, children: "文字独轮车正在运行，与智驾叠加可能超出每分钟限速，建议先停一个。" })
              ] }),
u$2(
                "details",
                {
                  open: advancedOpen.value,
                  onToggle: (e2) => {
                    advancedOpen.value = e2.currentTarget.open;
                  },
                  style: { marginTop: ".5em" },
                  children: [
u$2("summary", { style: { cursor: "pointer", userSelect: "none" }, children: "高级设置" }),
u$2(
                      "div",
                      {
                        style: {
                          margin: ".5em 0",
                          display: "grid",
                          gap: ".5em",
                          color: isOn ? void 0 : "#999"
                        },
                        children: [
u$2("div", { style: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: ".25em" }, children: [
u$2("span", { children: "发送间隔" }),
u$2(
                              "input",
                              {
                                type: "number",
                                min: "3",
                                max: "120",
                                style: { width: "40px" },
                                value: hzmDriveIntervalSec.value,
                                onInput: (e2) => {
                                  const v2 = parseInt(e2.currentTarget.value, 10);
                                  if (Number.isFinite(v2) && v2 > 0) hzmDriveIntervalSec.value = v2;
                                },
                                title: "基础间隔（秒），实际会再加 0.7~1.5× 的随机抖动。建议 5–15。"
                              }
                            ),
u$2("span", { children: "秒，每分钟最多" }),
u$2(
                              "input",
                              {
                                type: "number",
                                min: "1",
                                max: "20",
                                style: { width: "40px" },
                                value: hzmRateLimitPerMin.value,
                                onInput: (e2) => {
                                  const v2 = parseInt(e2.currentTarget.value, 10);
                                  if (Number.isFinite(v2) && v2 > 0) hzmRateLimitPerMin.value = v2;
                                },
                                title: "硬限速。同时开文字独轮车会叠加发送量，建议保持 ≤6 单独使用。"
                              }
                            ),
u$2("span", { children: "条" }),
                            mode === "llm" && u$2(S$1, { children: [
u$2("span", { style: { marginLeft: ".5em" }, children: "，LLM 每" }),
u$2(
                                "input",
                                {
                                  type: "number",
                                  min: "1",
                                  max: "10",
                                  style: { width: "36px" },
                                  value: hzmLlmRatio.value,
                                  onInput: (e2) => {
                                    const v2 = parseInt(e2.currentTarget.value, 10);
                                    if (Number.isFinite(v2) && v2 >= 1) hzmLlmRatio.value = v2;
                                  },
                                  title: "1=每次都用 LLM；3=每 3 次用 1 次（其它走启发式，省 API 费）"
                                }
                              ),
u$2("span", { children: "次" })
                            ] })
                          ] }),
u$2("div", { style: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: ".25em" }, children: [
u$2("span", { title: "活跃度闸门：最近窗口内必须既有 ≥N 条公屏，又有 ≥M 个不同 uid，否则本 tick 不发——避免空屏照刷。", children: "活跃度 最近" }),
u$2(
                              "input",
                              {
                                type: "number",
                                min: "10",
                                max: "300",
                                style: { width: "46px" },
                                value: hzmActivityWindowSec.value,
                                onInput: (e2) => {
                                  const v2 = parseInt(e2.currentTarget.value, 10);
                                  if (Number.isFinite(v2) && v2 >= 10) hzmActivityWindowSec.value = v2;
                                },
                                title: "活跃度窗口（秒）。建议 30–90。"
                              }
                            ),
u$2("span", { children: "秒内 ≥" }),
u$2(
                              "input",
                              {
                                type: "number",
                                min: "1",
                                max: "50",
                                style: { width: "40px" },
                                value: hzmActivityMinDanmu.value,
                                onInput: (e2) => {
                                  const v2 = parseInt(e2.currentTarget.value, 10);
                                  if (Number.isFinite(v2) && v2 >= 1) hzmActivityMinDanmu.value = v2;
                                },
                                title: "窗口内最少弹幕条数。"
                              }
                            ),
u$2("span", { children: "条 / ≥" }),
u$2(
                              "input",
                              {
                                type: "number",
                                min: "1",
                                max: "20",
                                style: { width: "36px" },
                                value: hzmActivityMinDistinctUsers.value,
                                onInput: (e2) => {
                                  const v2 = parseInt(e2.currentTarget.value, 10);
                                  if (Number.isFinite(v2) && v2 >= 1) hzmActivityMinDistinctUsers.value = v2;
                                },
                                title: "窗口内最少不同人数。防一人独刷被当作活跃。"
                              }
                            ),
u$2("span", { children: "人在说话" })
                          ] }),
u$2(
                            "label",
                            {
                              style: { display: "flex", alignItems: "center", gap: ".4em", cursor: "pointer" },
                              title: "严格模式：弹幕里没匹配到关键词、用户也没勾偏好 tag 时，本 tick 不发。关掉则随机选一条（旧版行为）。",
                              children: [
u$2(
                                  "input",
                                  {
                                    type: "checkbox",
                                    checked: hzmStrictHeuristic.value,
                                    onInput: (e2) => {
                                      hzmStrictHeuristic.value = e2.currentTarget.checked;
                                    }
                                  }
                                ),
u$2("span", { children: "严格选梗（无信号时不随机兜底）" })
                              ]
                            }
                          ),
                          tagOptions.length > 0 ? u$2(S$1, { children: [
u$2("div", { className: "cb-row", children: [
u$2("span", { style: { fontWeight: "bold", minWidth: "4em" }, title: "只从勾选 tag 的梗里选；空 = 全部", children: "偏好 tag" }),
                              tagOptions.map((t2) => u$2(
                                "button",
                                {
                                  type: "button",
                                  className: "cb-tag",
                                  onClick: () => toggleSelectedTag(t2),
                                  title: selected.includes(t2) ? "已加入偏好，点击取消" : "点击加入偏好",
                                  style: { "--cb-tag-bg": selected.includes(t2) ? "#34c759" : void 0 },
                                  children: t2
                                },
                                t2
                              ))
                            ] }),
u$2("div", { className: "cb-row", children: [
u$2("span", { style: { fontWeight: "bold", minWidth: "4em" }, title: "命中即跳过的 tag", children: "黑名单" }),
                              tagOptions.map((t2) => u$2(
                                "button",
                                {
                                  type: "button",
                                  className: "cb-tag",
                                  onClick: () => toggleBlacklistTag(t2),
                                  title: blacklist.includes(t2) ? "已拉黑，点击取消" : "点击拉黑这个 tag",
                                  style: { "--cb-tag-bg": blacklist.includes(t2) ? "#ff3b30" : void 0 },
                                  children: t2
                                },
                                t2
                              ))
                            ] })
                          ] }) : u$2("div", { className: "cb-empty", children: "梗库还没加载到 tag。等列表载入后再来选偏好与黑名单。" }),
u$2("div", { className: "cb-row", children: [
u$2("span", { style: { fontWeight: "bold", minWidth: "4em" }, children: "暂停词" }),
u$2("span", { style: { fontSize: "10px", color: "#888" }, children: [
                              "每行一条正则；命中后 60s 不发。空 = 用默认（",
                              pauseDefault || "无",
                              "）"
                            ] })
                          ] }),
u$2(
                            "textarea",
                            {
                              rows: 2,
                              value: hzmPauseKeywordsOverride.value,
                              onInput: (e2) => {
                                hzmPauseKeywordsOverride.value = e2.currentTarget.value;
                              },
                              style: { boxSizing: "border-box", width: "100%", fontSize: "11px", resize: "vertical" },
                              placeholder: (source.pauseKeywords ?? []).join("\n")
                            }
                          )
                        ]
                      }
                    )
                  ]
                }
              ),
              mode === "llm" && u$2(
                "details",
                {
                  open: llmConfigOpen.value,
                  onToggle: (e2) => {
                    llmConfigOpen.value = e2.currentTarget.open;
                  },
                  style: { marginTop: ".5em" },
                  children: [
u$2("summary", { style: { cursor: "pointer", userSelect: "none" }, children: [
                      "LLM 配置",
u$2("span", { className: "cb-soft", style: { marginLeft: ".4em" }, children: apiKeyConfigured ? "已配置" : "未配置" })
                    ] }),
u$2("div", { className: "cb-stack", style: { margin: ".5em 0" }, children: [
u$2("div", { className: "cb-row", children: [
u$2("span", { style: { minWidth: "4em" }, children: "Provider" }),
u$2("div", { className: "cb-segment", style: { flex: 1, minWidth: 0 }, children: ["anthropic", "openai", "openai-compat"].map((p2) => u$2(
                          "button",
                          {
                            type: "button",
                            "aria-pressed": hzmLlmProvider.value === p2,
                            style: modeButtonStyle(hzmLlmProvider.value === p2),
                            onClick: () => {
                              hzmLlmProvider.value = p2;
                              testStatus.value = "idle";
                            },
                            children: PROVIDER_LABEL[p2]
                          },
                          p2
                        )) })
                      ] }),
u$2("div", { className: "cb-row", children: [
u$2("span", { style: { minWidth: "4em" }, children: "API Key" }),
u$2(
                          "input",
                          {
                            type: "password",
                            value: hzmLlmApiKey.value,
                            onInput: (e2) => {
                              hzmLlmApiKey.value = e2.currentTarget.value;
                              testStatus.value = "idle";
                            },
                            placeholder: "sk-... 或 anthropic key",
                            style: { flex: 1, minWidth: 0, boxSizing: "border-box" }
                          }
                        ),
u$2("span", { className: "cb-soft", style: { whiteSpace: "nowrap" }, children: apiKeyConfigured ? maskKey(hzmLlmApiKey.value) : "未配置" }),
u$2(
                          "button",
                          {
                            type: "button",
                            disabled: !apiKeyConfigured,
                            onClick: () => {
                              clearHzmLlmApiKey();
                              testStatus.value = "idle";
                            },
                            title: "把 key 从内存和 GM 存储里都抹掉",
                            children: "清除"
                          }
                        )
                      ] }),
u$2("div", { className: "cb-row", children: [
u$2("span", { style: { minWidth: "4em" } }),
u$2("span", { style: { display: "inline-flex", alignItems: "center", gap: ".25em", flex: 1 }, children: [
u$2(
                            "input",
                            {
                              id: "hzmLlmApiKeyPersist",
                              type: "checkbox",
                              checked: hzmLlmApiKeyPersist.value,
                              onInput: (e2) => {
                                hzmLlmApiKeyPersist.value = e2.currentTarget.checked;
                              }
                            }
                          ),
u$2(
                            "label",
                            {
                              for: "hzmLlmApiKeyPersist",
                              title: "不勾：key 仅留在内存，刷新页面就清空，GM 存储里的旧值也立即抹掉",
                              children: "保存到 GM 存储（关闭后仅本次会话有效）"
                            }
                          )
                        ] })
                      ] }),
u$2("div", { className: "cb-row", children: [
u$2("span", { style: { minWidth: "4em" }, children: "模型" }),
u$2(
                          "input",
                          {
                            type: "text",
                            value: hzmLlmModel.value,
                            onInput: (e2) => {
                              hzmLlmModel.value = e2.currentTarget.value;
                              testStatus.value = "idle";
                            },
                            placeholder: "例：claude-haiku-4-5-20251001",
                            title: "Anthropic 推荐 claude-haiku-4-5-20251001；OpenAI 推荐 gpt-4o-mini；DeepSeek 用 deepseek-chat",
                            style: { flex: 1, minWidth: 0, boxSizing: "border-box" }
                          }
                        )
                      ] }),
                      hzmLlmProvider.value === "openai-compat" && u$2("div", { className: "cb-row", children: [
u$2("span", { style: { minWidth: "4em" }, children: "Base URL" }),
u$2(
                          "input",
                          {
                            type: "text",
                            value: hzmLlmBaseURL.value,
                            onInput: (e2) => {
                              hzmLlmBaseURL.value = e2.currentTarget.value;
                              testStatus.value = "idle";
                            },
                            placeholder: "https://api.deepseek.com（带不带 /v1 都行，自动补全到 /v1/chat/completions）",
                            title: "DeepSeek=https://api.deepseek.com / Moonshot=https://api.moonshot.cn / OpenRouter=https://openrouter.ai/api / 小米 mimo=https://token-plan-sgp.xiaomimimo.com/v1",
                            style: { flex: 1, minWidth: 0, boxSizing: "border-box" }
                          }
                        )
                      ] }),
u$2("div", { className: "cb-row", children: [
u$2(
                          "button",
                          {
                            type: "button",
                            disabled: !apiKeyConfigured || testStatus.value === "testing",
                            onClick: () => void handleTestLLM(),
                            title: "发一个最小请求验证 key/路由能跑通；不消耗你的实际智驾配额",
                            children: testStatus.value === "testing" ? "测试中…" : "测试连接"
                          }
                        ),
                        testStatus.value === "ok" && u$2("span", { className: "cb-soft", style: { color: "#0a7f55" }, children: "连接成功" }),
                        testStatus.value === "fail" && u$2("span", { style: { color: "#c00", fontSize: "11px", wordBreak: "break-all" }, children: [
                          "连接失败：",
                          testError.value
                        ] })
                      ] }),
u$2("div", { className: "cb-note", style: { color: "#a15c00" }, children: [
                        hzmLlmApiKeyPersist.value ? "Key 明文保存在浏览器 GM 存储；共用电脑或备份导出会暴露。担心可关掉「保存到 GM 存储」改为仅本会话。" : "Key 仅留在内存，刷新页面后清空。",
                        "openai-compat 自定义域首次调用时 Tampermonkey 会弹权限确认，需手动允许。"
                      ] })
                    ] })
                  ]
                }
              )
            ]
          }
        );
      }
      function LogPanel() {
        const detailsRef = A(null);
        const ref = A(null);
        const scrollToBottom2 = () => {
          if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
        };
        y$2(() => {
          scrollToBottom2();
        }, [logLines.value]);
        y$2(() => {
          if (logPanelFocusRequest.value <= 0) return;
          detailsRef.current?.scrollIntoView({ block: "nearest" });
          scrollToBottom2();
          ref.current?.focus();
        }, [logPanelFocusRequest.value]);
        return u$2(
          "details",
          {
            ref: detailsRef,
            open: logPanelOpen.value,
            onToggle: (e2) => {
              logPanelOpen.value = e2.currentTarget.open;
            },
            style: { marginTop: ".25em" },
            children: [
u$2("summary", { style: { cursor: "pointer", userSelect: "none", fontWeight: "bold" }, children: "日志" }),
u$2("div", { className: "cb-body", children: u$2(
                "textarea",
                {
                  ref,
                  readOnly: true,
                  value: logLines.value.join("\n"),
                  placeholder: `活动日志会在这里显示（自动发送、跟车、同传、错误等；最多保留 ${maxLogLines.value} 条）`,
                  style: {
                    boxSizing: "border-box",
                    height: "60px",
                    width: "100%",
                    resize: "vertical",
                    marginTop: ".5em"
                  }
                }
              ) })
            ]
          }
        );
      }
      const LAPLACE_LIST_TTL_MS = 3e4;
      const listCache = new FetchCache();
      function sortMemesInPlace(memes, sortBy) {
        memes.sort((a2, b2) => {
          if (sortBy === "lastCopiedAt") {
            if (a2.lastCopiedAt === null && b2.lastCopiedAt === null) return 0;
            if (a2.lastCopiedAt === null) return 1;
            if (b2.lastCopiedAt === null) return -1;
            return b2.lastCopiedAt.localeCompare(a2.lastCopiedAt);
          }
          if (sortBy === "copyCount") return b2.copyCount - a2.copyCount;
          return b2.createdAt.localeCompare(a2.createdAt);
        });
      }
      async function fetchLaplaceMemes(roomId, sortBy) {
        const url = `${BASE_URL.LAPLACE_MEMES}?roomId=${roomId}&sortBy=${sortBy}&sort=desc`;
        const key = `${roomId}|${sortBy}`;
        return listCache.get({
          key,
          ttlMs: LAPLACE_LIST_TTL_MS,
          fetcher: async () => {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
            const json = await resp.json();
            const items = json.data ?? [];
            sortMemesInPlace(items, sortBy);
            return items;
          }
        });
      }
      const LAPLACE_COPY_DEDUP_MS = 2e3;
      const recentLaplaceCopies = new Map();
      async function reportLaplaceMemeCopy(memeId) {
        if (memeId <= 0) return null;
        const now = Date.now();
        const last = recentLaplaceCopies.get(memeId);
        if (last !== void 0 && now - last < LAPLACE_COPY_DEDUP_MS) {
          return null;
        }
        recentLaplaceCopies.set(memeId, now);
        if (recentLaplaceCopies.size > 64) {
          for (const [id, ts] of recentLaplaceCopies) {
            if (now - ts >= LAPLACE_COPY_DEDUP_MS) recentLaplaceCopies.delete(id);
          }
        }
        try {
          const resp = await fetch(`${BASE_URL.LAPLACE_MEME_COPY}/${memeId}`, { method: "POST" });
          if (!resp.ok) return null;
          const json = await resp.json();
          return json.copyCount;
        } catch {
          return null;
        }
      }
      function filterBackendMemesForRoom(items, hasRoomSpecificSource) {
        return items.filter((m2) => {
          if (m2._source === "laplace") return false;
          if (m2._source === "sbhzm") return hasRoomSpecificSource;
          return true;
        });
      }
      const TAG_COLOR_NAMES = ["red", "yellow", "fuchsia", "emerald", "blue", "orange", "purple", "pink", "cyan", "green"];
      function hashTagColor(name) {
        let h2 = 0;
        for (let i2 = 0; i2 < name.length; i2++) {
          h2 = (h2 << 5) - h2 + name.charCodeAt(i2) | 0;
        }
        return TAG_COLOR_NAMES[Math.abs(h2) % TAG_COLOR_NAMES.length] ?? "blue";
      }
      function normalizeTag(rawTag) {
        const name = (typeof rawTag === "string" ? rawTag : rawTag.name ?? "").trim();
        const emoji = typeof rawTag === "string" ? null : rawTag.emoji ?? null;
        let h2 = 0;
        for (let i2 = 0; i2 < name.length; i2++) h2 = (h2 << 5) - h2 + name.charCodeAt(i2) | 0;
        const tagId = -Math.abs(h2) - 1;
        return {
          id: tagId,
          name,
          color: hashTagColor(name),
          emoji,
          icon: null,
          description: null,
          count: 0
        };
      }
      function normalizeMeme(raw) {
        const content = (raw.content ?? "").trim();
        if (!content) return null;
        let synthId;
        const rid = typeof raw.id === "number" ? raw.id : Number(raw.id);
        if (Number.isFinite(rid) && rid > 0) {
          synthId = -rid;
        } else {
          let h2 = 0;
          for (let i2 = 0; i2 < content.length; i2++) h2 = (h2 << 5) - h2 + content.charCodeAt(i2) | 0;
          synthId = -Math.abs(h2) - 1e6;
        }
        const tags = Array.isArray(raw.tags) ? raw.tags.map(normalizeTag).filter((t2) => t2.name) : [];
        const created = raw.created_at ?? "";
        const meme = {
          id: synthId,
          uid: 0,
          content,
          tags,
          copyCount: raw.copy_count ?? 0,
          lastCopiedAt: created || null,
          createdAt: created,
          updatedAt: raw.updated_at ?? created,
          username: null,
          avatar: null,
          room: null,
          _source: "sbhzm"
        };
        return meme;
      }
      const PAGE_SIZE = 100;
      const MAX_PAGES = 50;
      const CACHE_TTL_MS = 30 * 60 * 1e3;
      const TAGS_CACHE_TTL_MS = 60 * 60 * 1e3;
      const memoryCache = new Map();
      function isList(body) {
        return Array.isArray(body);
      }
      function extractListAndTotal(body) {
        if (isList(body)) return { items: body, total: null };
        if (body && typeof body === "object") {
          const obj = body;
          const total = typeof obj.total === "number" ? obj.total : null;
          if (isList(obj.items)) return { items: obj.items, total };
          if (isList(obj.data)) return { items: obj.data, total };
          if (isList(obj.results)) return { items: obj.results, total };
          if (obj.data && typeof obj.data === "object") {
            const inner = obj.data;
            if (isList(inner.data)) return { items: inner.data, total };
            if (isList(inner.items)) return { items: inner.items, total };
          }
        }
        return { items: [], total: null };
      }
      async function fetchPage(source, page) {
        const url = `${source.listEndpoint}?page=${page}&page_size=${PAGE_SIZE}`;
        let resp;
        try {
          resp = await gmFetch(url, { method: "GET", headers: { Accept: "application/json" } });
        } catch (err) {
          appendLog(`⚠️ ${source.name} 第 ${page} 页网络错误，停止分页：${err instanceof Error ? err.message : String(err)}`);
          return { items: [], total: null };
        }
        if (!resp.ok) {
          appendLog(`⚠️ ${source.name} 第 ${page} 页 HTTP ${resp.status}，停止分页`);
          return { items: [], total: null };
        }
        try {
          return extractListAndTotal(resp.json());
        } catch (err) {
          appendLog(`⚠️ ${source.name} 第 ${page} 页 JSON 解析失败：${err instanceof Error ? err.message : String(err)}`);
          return { items: [], total: null };
        }
      }
      async function fetchAllPages(source) {
        const collected = [];
        const seen2 = new Set();
        let knownTotal = null;
        for (let page = 1; page <= MAX_PAGES; page++) {
          const { items, total } = await fetchPage(source, page);
          if (total !== null) knownTotal = total;
          if (items.length === 0) break;
          let added = 0;
          for (const item of items) {
            if (!item?.content) continue;
            const key = item.id ?? item.content;
            if (seen2.has(key)) continue;
            seen2.add(key);
            collected.push(item);
            added++;
          }
          if (knownTotal !== null && collected.length >= knownTotal) break;
          if (added === 0) break;
        }
        return collected;
      }
      async function fetchRandomFallback(source) {
        if (!source.randomEndpoint) return [];
        const BATCH = 20;
        const tasks = [];
        for (let i2 = 0; i2 < BATCH; i2++) {
          tasks.push(
            gmFetch(source.randomEndpoint, { method: "GET", headers: { Accept: "application/json" } }).then((r2) => r2.ok ? r2.json() : null).catch(() => null)
          );
        }
        const all = await Promise.all(tasks);
        return all.filter((x2) => !!x2?.content);
      }
      async function fetchSbhzmMemes(source, force = false) {
        const cacheKey = source.listEndpoint;
        const cached = memoryCache.get(cacheKey);
        if (!force && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
          return cached.data;
        }
        let raw = await fetchAllPages(source);
        if (raw.length === 0) {
          raw = await fetchRandomFallback(source);
          if (raw.length === 0) {
            notifyUser("warning", `${source.name}：列表与随机接口都拉不到内容`);
          }
        }
        const byContent = new Map();
        for (const r2 of raw) {
          const c2 = (r2.content ?? "").trim();
          if (!c2) continue;
          if (!byContent.has(c2)) byContent.set(c2, r2);
        }
        const normalized = [...byContent.values()].map(normalizeMeme).filter((m2) => m2 !== null).sort((a2, b2) => b2.copyCount - a2.copyCount);
        memoryCache.set(cacheKey, { ts: Date.now(), data: normalized });
        return normalized;
      }
      async function fetchSbhzmFirstPage(source) {
        const { items: raw } = await fetchPage(source, 1);
        if (raw.length === 0) return [];
        const byContent = new Map();
        for (const r2 of raw) {
          const c2 = (r2.content ?? "").trim();
          if (!c2) continue;
          if (!byContent.has(c2)) byContent.set(c2, r2);
        }
        return [...byContent.values()].map(normalizeMeme).filter((m2) => m2 !== null);
      }
      let tagsCache = null;
      async function fetchSbhzmTags() {
        if (tagsCache && Date.now() - tagsCache.ts < TAGS_CACHE_TTL_MS) return tagsCache.data;
        const resp = await gmFetch(BASE_URL.SBHZM_TAGS, {
          method: "GET",
          headers: { Accept: "application/json" },
          timeoutMs: 1e4
        });
        if (!resp.ok) throw new Error(`SBHZM tags HTTP ${resp.status}`);
        const json = resp.json();
        const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        const tags = arr.filter((t2) => typeof t2?.id === "number" && typeof t2?.name === "string").map((t2) => ({ id: t2.id, name: t2.name.trim() })).filter((t2) => t2.name.length > 0);
        tagsCache = { ts: Date.now(), data: tags };
        return tags;
      }
      async function inferSbhzmTagIds(content, source) {
        const map = source.keywordToTag;
        if (!map) return [];
        const matchedNames = new Set();
        for (const [pattern, tagName] of Object.entries(map)) {
          try {
            if (new RegExp(pattern).test(content)) matchedNames.add(tagName);
          } catch {
          }
        }
        if (matchedNames.size === 0) return [];
        let allTags;
        try {
          allTags = await fetchSbhzmTags();
        } catch {
          return [];
        }
        return allTags.filter((t2) => matchedNames.has(t2.name)).map((t2) => t2.id);
      }
      async function submitSbhzmMeme(content, tagIds = []) {
        const trimmed = content.trim();
        if (!trimmed) throw new Error("提交内容为空");
        const resp = await gmFetch(BASE_URL.SBHZM_SUBMIT_MEME, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ content: trimmed, tag_ids: tagIds }),
          timeoutMs: 15e3
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.text().slice(0, 200)}`);
        }
        const json = resp.json();
        const id = typeof json.id === "number" ? json.id : Number(json.id);
        if (!Number.isFinite(id) || id <= 0) {
          throw new Error("提交成功但响应里没有 id");
        }
        const echo = typeof json.content === "string" ? json.content : trimmed;
        return { id, content: echo };
      }
      function sortMemes(memes, sortBy) {
        memes.sort((a2, b2) => {
          if (sortBy === "lastCopiedAt") {
            if (a2.lastCopiedAt === null && b2.lastCopiedAt === null) return 0;
            if (a2.lastCopiedAt === null) return 1;
            if (b2.lastCopiedAt === null) return -1;
            return b2.lastCopiedAt.localeCompare(a2.lastCopiedAt);
          }
          if (sortBy === "copyCount") return b2.copyCount - a2.copyCount;
          return b2.createdAt.localeCompare(a2.createdAt);
        });
      }
      function deps() {
        return {
          fetchCbMergedMemes,
          fetchLaplaceMemes,
          fetchSbhzmMemes,
          mirrorToCbBackend
        };
      }
      async function fetchAllMemes(roomId, sortBy, source) {
        const d2 = deps();
        if (cbBackendEnabled.value) {
          const cb = await d2.fetchCbMergedMemes({ roomId, sortBy, perPage: 500 });
          if (!cb.fatal) {
            const cbItems = filterBackendMemesForRoom(cb.items, source !== null);
            const fallbacks = [];
            fallbacks.push(
              d2.fetchLaplaceMemes(roomId, sortBy).then((data) => {
                const tagged = data.map((m2) => ({ ...m2, _source: "laplace" }));
                void d2.mirrorToCbBackend(tagged, "laplace");
                return tagged;
              }).catch((err) => {
                appendLog(`⚠️ LAPLACE 加载失败:${err instanceof Error ? err.message : String(err)}`);
                return [];
              })
            );
            if (source && !cb.sources.sbhzm) {
              fallbacks.push(
                d2.fetchSbhzmMemes(source).then((data) => {
                  void d2.mirrorToCbBackend(data, "sbhzm");
                  return data;
                }).catch((err) => {
                  appendLog(`⚠️ ${source.name} 兜底加载失败:${err instanceof Error ? err.message : String(err)}`);
                  return [];
                })
              );
            }
            const fallbackArrs = await Promise.all(fallbacks);
            const merged2 = [].concat(cbItems, ...fallbackArrs);
            sortMemes(merged2, sortBy);
            return merged2;
          }
          appendLog("⚠️ chatterbox-cloud 后端不可达,降级到本地直拉 LAPLACE/SBHZM");
        }
        const tasks = [];
        tasks.push(
          d2.fetchLaplaceMemes(roomId, sortBy).then((data) => {
            const tagged = data.map((m2) => ({ ...m2, _source: "laplace" }));
            void d2.mirrorToCbBackend(tagged, "laplace");
            return tagged;
          }).catch((err) => {
            appendLog(`⚠️ LAPLACE 烂梗加载失败:${err instanceof Error ? err.message : String(err)}`);
            return [];
          })
        );
        if (source) {
          tasks.push(
            d2.fetchSbhzmMemes(source).then((data) => {
              void d2.mirrorToCbBackend(data, "sbhzm");
              return data;
            }).catch((err) => {
              appendLog(`⚠️ ${source.name} 加载失败:${err instanceof Error ? err.message : String(err)}`);
              return [];
            })
          );
        }
        const results = await Promise.all(tasks);
        const merged = [].concat(...results);
        sortMemes(merged, sortBy);
        return merged;
      }
      const PROBE_INTERVAL_MS = 30 * 60 * 1e3;
      const lastProbeByEndpoint = new Map();
      async function maybeProbeSbhzmFreshness(source, options = {}) {
        if (!source) return { outcome: "skipped_no_source" };
        const enabled = options.forceEnabled ?? cbBackendEnabled.value;
        if (!enabled) return { outcome: "skipped_disabled" };
        const now = options.now ?? Date.now();
        const last = lastProbeByEndpoint.get(source.listEndpoint) ?? 0;
        if (now - last < PROBE_INTERVAL_MS) return { outcome: "skipped_throttled" };
        lastProbeByEndpoint.set(source.listEndpoint, now);
        let items = [];
        try {
          items = await fetchSbhzmFirstPage(source);
        } catch {
          return { outcome: "probed", itemsFetched: 0 };
        }
        if (items.length > 0) {
          try {
            await mirrorToCbBackend(items, "sbhzm");
          } catch {
          }
        }
        return { outcome: "probed", itemsFetched: items.length };
      }
      function CbSubmitRow({
        content,
        source,
        onDone,
        onCancel
      }) {
        const tags = useSignal(null);
        const selected = useSignal( new Set());
        const customInput = useSignal("");
        const loading = useSignal(true);
        const submitting = useSignal(false);
        const error = useSignal(null);
        y$2(() => {
          let cancelled = false;
          void (async () => {
            try {
              const [allTags, suggested] = await Promise.all([fetchCbTags(), suggestCbTagNames(content, source)]);
              if (cancelled) return;
              tags.value = allTags;
              selected.value = new Set(suggested);
              loading.value = false;
            } catch (err) {
              if (cancelled) return;
              loading.value = false;
              error.value = err instanceof Error ? err.message : String(err);
            }
          })();
          return () => {
            cancelled = true;
          };
        }, [content]);
        const toggleTag = (name) => {
          const next = new Set(selected.value);
          if (next.has(name)) next.delete(name);
          else next.add(name);
          selected.value = next;
        };
        const collectTagNames = () => {
          const out = new Set(selected.value);
          for (const piece of customInput.value.split(/[,，\s]+/)) {
            const t2 = piece.trim();
            if (t2) out.add(t2);
          }
          return [...out];
        };
        const handleSubmit = async () => {
          if (submitting.value) return;
          submitting.value = true;
          error.value = null;
          try {
            const tagNames = collectTagNames();
            const result = await submitCbMeme(content, { tagNames });
            if (result.dedup) {
              notifyUser("info", `已提交,但库内已有同梗(状态:${result.status})`, content);
            } else {
              notifyUser("success", `已贡献 #${result.id},等待审核`, content);
            }
            onDone(result.id);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            error.value = msg;
            notifyUser("error", `chatterbox-cloud 提交失败`, msg);
          } finally {
            submitting.value = false;
          }
        };
        return u$2(
          "div",
          {
            style: {
              marginTop: ".3em",
              padding: ".4em",
              background: "var(--bg2, #f0f7ff)",
              border: "1px solid #3b82f6",
              borderRadius: "4px",
              fontSize: "11px"
            },
            children: [
u$2("div", { style: { marginBottom: ".3em", color: "#666" }, children: [
                "给「",
u$2("b", { children: content }),
                "」选标签后提交到 ",
u$2("b", { children: "chatterbox-cloud" }),
                "。已根据关键词预选了推荐标签,可任意修改。"
              ] }),
              loading.value ? u$2("div", { style: { color: "#666" }, children: "正在拉取标签字典…" }) : !tags.value || tags.value.length === 0 ? u$2("div", { style: { color: "#666", marginBottom: ".3em" }, children: [
                "后端字典暂时无 tag",
                error.value ? `(${error.value})` : "",
                "。可以无 tag 提交,管理员可后补。"
              ] }) : u$2("div", { style: { display: "flex", flexWrap: "wrap", gap: ".3em", marginBottom: ".3em" }, children: tags.value.map((t2) => {
                const isOn = selected.value.has(t2.name);
                return u$2(
                  "button",
                  {
                    type: "button",
                    onClick: () => toggleTag(t2.name),
                    title: t2.count > 0 ? `已有 ${t2.count} 条` : "尚未使用过",
                    style: {
                      appearance: "none",
                      cursor: "pointer",
                      padding: ".1em .4em",
                      borderRadius: "999px",
                      border: "1px solid var(--Ga2, #ccc)",
                      background: isOn ? "#3b82f6" : "transparent",
                      color: isOn ? "#fff" : "inherit",
                      fontSize: "11px",
                      fontFamily: "inherit"
                    },
                    children: [
                      t2.emoji ? `${t2.emoji} ` : "",
                      t2.name
                    ]
                  },
                  t2.id
                );
              }) }),
u$2("div", { style: { marginBottom: ".3em" }, children: u$2(
                "input",
                {
                  type: "text",
                  value: customInput.value,
                  placeholder: "额外 tag(逗号分隔,可空)",
                  style: { boxSizing: "border-box", width: "100%", fontSize: "11px", padding: ".2em" },
                  onInput: (e2) => {
                    customInput.value = e2.currentTarget.value;
                  }
                }
              ) }),
              error.value && !loading.value && u$2("div", { style: { color: "#a00", marginBottom: ".3em" }, children: error.value }),
u$2("div", { style: { display: "flex", gap: ".4em", alignItems: "center" }, children: [
u$2(
                  "button",
                  {
                    type: "button",
                    disabled: submitting.value,
                    onClick: () => void handleSubmit(),
                    style: {
                      cursor: submitting.value ? "wait" : "pointer",
                      padding: ".15em .8em",
                      background: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      borderRadius: "3px",
                      fontSize: "11px"
                    },
                    children: submitting.value ? "提交中…" : `提交(已选 ${selected.value.size} 个标签)`
                  }
                ),
u$2(
                  "button",
                  {
                    type: "button",
                    disabled: submitting.value,
                    onClick: onCancel,
                    style: { cursor: "pointer", padding: ".15em .8em", fontSize: "11px" },
                    children: "取消"
                  }
                ),
u$2("span", { style: { color: "#888", marginLeft: "auto", fontSize: "10px" }, children: "API:POST /memes(等管理员审核)" })
              ] })
            ]
          }
        );
      }
      const TAG_COLORS$1 = {
        red: "#ef4444",
        yellow: "#eab308",
        fuchsia: "#d946ef",
        emerald: "#10b981",
        blue: "#3b82f6",
        orange: "#f97316",
        purple: "#a855f7",
        pink: "#ec4899",
        cyan: "#06b6d4",
        green: "#22c55e"
      };
      function MemeTagsBar({
        memes,
        filterText
      }) {
        const aggregated = T$1(() => {
          const map = new Map();
          for (const m2 of memes) {
            for (const t2 of m2.tags) {
              const existing = map.get(t2.name);
              if (existing) {
                existing.count++;
              } else {
                const colorKey = t2.color ?? "blue";
                map.set(t2.name, {
                  name: t2.name,
                  emoji: t2.emoji ?? null,
                  color: TAG_COLORS$1[colorKey] ?? "#888",
                  count: 1
                });
              }
            }
          }
          return [...map.values()].sort((a2, b2) => b2.count - a2.count);
        }, [memes]);
        if (aggregated.length === 0) return null;
        const active = filterText.value.trim();
        return u$2(
          "div",
          {
            style: {
              display: "flex",
              flexWrap: "wrap",
              gap: ".25em",
              marginBottom: ".5em",
              paddingBottom: ".4em",
              borderBottom: "1px dashed var(--Ga2, #ddd)"
            },
            children: [
u$2("span", { style: { fontSize: "11px", color: "#666", alignSelf: "center", marginRight: ".25em" }, children: "标签：" }),
              aggregated.map((t2) => {
                const isActive = active === t2.name;
                return u$2(
                  "button",
                  {
                    type: "button",
                    className: "cb-tag",
                    onClick: () => {
                      filterText.value = isActive ? "" : t2.name;
                    },
                    title: `按「${t2.name}」筛选（${t2.count} 条）`,
                    style: {
                      appearance: "none",
                      border: isActive ? "1.5px solid #000" : "none",
                      outline: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: ".15em",
                      padding: ".05em .4em",
                      borderRadius: "2px",
                      fontSize: "10px",
                      lineHeight: 1.6,
                      color: "#fff",
                      background: t2.color,
                      fontFamily: "inherit",
                      transition: "filter .15s, opacity .15s",
                      opacity: isActive ? 1 : 0.85
                    },
                    children: [
                      t2.emoji ?? "",
                      t2.name,
u$2("span", { style: { opacity: 0.7, marginLeft: ".15em" }, children: t2.count })
                    ]
                  },
                  t2.name
                );
              })
            ]
          }
        );
      }
      function SbhzmSubmitRow({
        content,
        source,
        onDone,
        onCancel
      }) {
        const tags = useSignal(null);
        const selected = useSignal( new Set());
        const loadingTags = useSignal(true);
        const submitting = useSignal(false);
        const error = useSignal(null);
        y$2(() => {
          let cancelled = false;
          void (async () => {
            try {
              const [allTags, inferred] = await Promise.all([fetchSbhzmTags(), inferSbhzmTagIds(content, source)]);
              if (cancelled) return;
              tags.value = allTags;
              selected.value = new Set(inferred);
              loadingTags.value = false;
            } catch (err) {
              if (cancelled) return;
              loadingTags.value = false;
              error.value = err instanceof Error ? err.message : String(err);
            }
          })();
          return () => {
            cancelled = true;
          };
        }, [content]);
        const toggleTag = (id) => {
          const next = new Set(selected.value);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          selected.value = next;
        };
        const handleSubmit = async () => {
          if (submitting.value) return;
          submitting.value = true;
          error.value = null;
          try {
            const result = await submitSbhzmMeme(content, [...selected.value]);
            notifyUser("success", `已提交到 ${source.name}（ID: ${result.id}）`, content);
            onDone(result.id);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            error.value = msg;
            notifyUser("error", `${source.name} 上传失败`, msg);
          } finally {
            submitting.value = false;
          }
        };
        return u$2(
          "div",
          {
            style: {
              marginTop: ".3em",
              padding: ".4em",
              background: "var(--bg2, #f6fff8)",
              border: "1px solid #10b981",
              borderRadius: "4px",
              fontSize: "11px"
            },
            children: [
u$2("div", { style: { marginBottom: ".3em", color: "#666" }, children: [
                "给「",
u$2("b", { children: content }),
                "」选标签后上传到 ",
u$2("b", { children: source.name }),
                "。已根据关键词预选了推荐标签，可任意修改。"
              ] }),
              loadingTags.value ? u$2("div", { style: { color: "#666" }, children: "正在拉取标签字典…" }) : !tags.value || tags.value.length === 0 ? u$2("div", { style: { color: "#a00" }, children: [
                "没拉到标签字典",
                error.value ? `（${error.value}）` : "",
                "。可以无标签上传，站长会后台补 tag。"
              ] }) : u$2("div", { style: { display: "flex", flexWrap: "wrap", gap: ".3em", marginBottom: ".3em" }, children: tags.value.map((t2) => {
                const isOn = selected.value.has(t2.id);
                return u$2(
                  "button",
                  {
                    type: "button",
                    onClick: () => toggleTag(t2.id),
                    title: `tag id=${t2.id}`,
                    style: {
                      appearance: "none",
                      cursor: "pointer",
                      padding: ".1em .4em",
                      borderRadius: "999px",
                      border: "1px solid var(--Ga2, #ccc)",
                      background: isOn ? "#10b981" : "transparent",
                      color: isOn ? "#fff" : "inherit",
                      fontSize: "11px",
                      fontFamily: "inherit"
                    },
                    children: t2.name
                  },
                  t2.id
                );
              }) }),
              error.value && !loadingTags.value && tags.value && tags.value.length > 0 && u$2("div", { style: { color: "#a00", marginBottom: ".3em" }, children: error.value }),
u$2("div", { style: { display: "flex", gap: ".4em", alignItems: "center" }, children: [
u$2(
                  "button",
                  {
                    type: "button",
                    disabled: submitting.value,
                    onClick: () => void handleSubmit(),
                    style: {
                      cursor: submitting.value ? "wait" : "pointer",
                      padding: ".15em .8em",
                      background: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: "3px",
                      fontSize: "11px"
                    },
                    children: submitting.value ? "上传中…" : `上传（已选 ${selected.value.size} 个标签）`
                  }
                ),
u$2(
                  "button",
                  {
                    type: "button",
                    disabled: submitting.value,
                    onClick: onCancel,
                    style: { cursor: "pointer", padding: ".15em .8em", fontSize: "11px" },
                    children: "取消"
                  }
                ),
u$2("span", { style: { color: "#888", marginLeft: "auto", fontSize: "10px" }, children: "API：POST /api/admin/memes（无鉴权）" })
              ] })
            ]
          }
        );
      }
      const MEME_SORT_OPTIONS = new Set(["lastCopiedAt", "copyCount", "createdAt"]);
      const isMemeSortBy = (v2) => MEME_SORT_OPTIONS.has(v2);
      const TAG_COLORS = {
        red: "#ef4444",
        yellow: "#eab308",
        fuchsia: "#d946ef",
        emerald: "#10b981",
        blue: "#3b82f6",
        orange: "#f97316",
        purple: "#a855f7",
        pink: "#ec4899",
        cyan: "#06b6d4",
        green: "#22c55e"
      };
      function SourceBadge({ source }) {
        if (!source || source === "laplace") return null;
        const config = source === "sbhzm" ? { letter: "H", bg: "#10b981", title: "来自社区专属梗库（sbhzm.cn）" } : { letter: "C", bg: "#3b82f6", title: "来自 chatterbox-cloud 自建梗库" };
        return u$2(
          "span",
          {
            title: config.title,
            style: {
              display: "inline-block",
              flexShrink: 0,
              marginRight: ".3em",
              padding: "0 .3em",
              fontSize: "9px",
              lineHeight: 1.6,
              color: "#fff",
              background: config.bg,
              borderRadius: "2px",
              fontWeight: "bold",
              verticalAlign: "middle"
            },
            children: config.letter
          }
        );
      }
      function MemeItem({
        meme,
        onUpdateCount,
        onTagClick
      }) {
        const copyLabel = useSignal("复制");
        const handleSend = async () => {
          try {
            const roomId = await ensureRoomId();
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
              appendLog("❌ 未找到登录信息，请先登录 Bilibili");
              return;
            }
            const processed = applyReplacements(meme.content);
            const wasReplaced = meme.content !== processed;
            const segments = processMessages(processed, maxLength.value);
            const total = segments.length;
            for (let i2 = 0; i2 < total; i2++) {
              const segment = segments[i2];
              if (isLockedEmoticon(segment)) {
                const label2 = total > 1 ? `烂梗表情 [${i2 + 1}/${total}]` : "烂梗表情";
                appendLog(formatLockedEmoticonReject(segment, label2));
                continue;
              }
              const result = await enqueueDanmaku(segment, roomId, csrfToken, SendPriority.MANUAL);
              const label = total > 1 ? `烂梗 [${i2 + 1}/${total}]` : "烂梗";
              const display = wasReplaced && total === 1 ? `${meme.content} → ${segment}` : segment;
              appendLog(result, label, display);
              if (i2 < total - 1) {
                await new Promise((r2) => setTimeout(r2, msgSendInterval.value * 1e3));
              }
            }
            if (meme.id > 0) {
              let newCount = null;
              if (meme._source === "cb") {
                newCount = await reportCbMemeCopy(meme.id);
              } else if (meme._source === "laplace" || meme._source == null) {
                newCount = await reportLaplaceMemeCopy(meme.id);
              }
              if (newCount !== null) onUpdateCount(meme.id, newCount);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            appendLog(`🔴 发送出错：${msg}`);
          }
        };
        const handleCopy = async () => {
          const ok = await copyTextToClipboard(meme.content);
          if (!ok) {
            notifyUser("error", "复制烂梗失败，请手动复制", meme.content);
            return;
          }
          copyLabel.value = "已复制";
          setTimeout(() => {
            copyLabel.value = "复制";
          }, 1500);
          if (meme.id > 0) {
            let newCount = null;
            if (meme._source === "cb") {
              newCount = await reportCbMemeCopy(meme.id);
            } else if (meme._source === "laplace" || meme._source == null) {
              newCount = await reportLaplaceMemeCopy(meme.id);
            }
            if (newCount !== null) onUpdateCount(meme.id, newCount);
          }
        };
        return u$2(
          "div",
          {
            "data-meme-id": meme.id,
            style: {
              padding: ".4em 0",
              borderBottom: "1px solid var(--Ga2, #eee)",
              display: "flex",
              gap: ".4em",
              alignItems: "flex-start"
            },
            children: [
u$2("div", { style: { flex: 1, minWidth: 0 }, children: [
                meme.tags.length > 0 && u$2("div", { style: { display: "flex", flexWrap: "wrap", gap: ".2em", marginBottom: ".2em" }, children: meme.tags.map((tag) => {
                  const bgColor = (tag.color && TAG_COLORS[tag.color]) ?? "#888";
                  return u$2(
                    "button",
                    {
                      type: "button",
                      className: "cb-tag",
                      onClick: () => onTagClick(tag.name),
                      title: `按「${tag.name}」筛选`,
                      style: {
                        appearance: "none",
                        border: "none",
                        outline: "none",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: ".15em",
                        padding: "0 .35em",
                        borderRadius: "2px",
                        fontSize: "10px",
                        lineHeight: 1.6,
                        color: "#fff",
                        "--cb-tag-bg": bgColor,
                        background: bgColor,
                        fontFamily: "inherit",
                        transition: "filter .15s"
                      },
                      onMouseEnter: (e2) => {
                        e2.currentTarget.style.filter = "brightness(1.1)";
                      },
                      onMouseLeave: (e2) => {
                        e2.currentTarget.style.filter = "";
                      },
                      children: [
                        tag.emoji ?? "",
                        tag.name
                      ]
                    },
                    tag.id
                  );
                }) }),
u$2(
                  "button",
                  {
                    type: "button",
                    onClick: () => void handleSend(),
                    title: "点击发送",
                    style: {
                      appearance: "none",
                      outline: "none",
                      border: "none",
                      background: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      wordBreak: "break-all",
                      lineHeight: 1.4,
                      whiteSpace: "pre-wrap",
                      borderRadius: "2px",
                      transition: "background .15s"
                    },
                    onMouseEnter: (e2) => {
                      e2.currentTarget.style.background = "var(--bg2, #f0f0f0)";
                    },
                    onMouseLeave: (e2) => {
                      e2.currentTarget.style.background = "";
                    },
                    children: [
u$2(SourceBadge, { source: meme._source }),
                      meme.content
                    ]
                  }
                )
              ] }),
u$2(
                "div",
                {
                  style: {
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: ".15em"
                  },
                  children: [
u$2(
                      "button",
                      {
                        type: "button",
                        title: "复制到剪贴板",
                        onClick: () => void handleCopy(),
                        style: { fontSize: "11px !important", cursor: "pointer", padding: ".1em .4em" },
                        children: copyLabel.value
                      }
                    ),
                    meme.copyCount > 0 && u$2("span", { style: { fontSize: "10px !important", color: "#999", lineHeight: 1 }, children: [
                      meme.copyCount,
                      "次"
                    ] })
                  ]
                }
              )
            ]
          }
        );
      }
      const MEME_RELOAD_INTERVAL = 3e4;
      const FLIP_MAX_ITEMS = 300;
      function MemesList() {
        const memes = useSignal([]);
        const sortBy = useSignal("lastCopiedAt");
        const filterText = useSignal("");
        const sourceFilter = useSignal("all");
        const submittingFor = useSignal(null);
        const status = useSignal("");
        const statusColor = useSignal("#666");
        const loading = useSignal(false);
        const containerRef = A(null);
        const prevRectsRef = A( new Map());
        const memeSource = getMemeSourceForRoom(cachedRoomId.value);
        const capturePositions = () => {
          const el = containerRef.current;
          if (!el) return;
          const map = new Map();
          for (let i2 = 0; i2 < el.children.length; i2++) {
            const child = el.children[i2];
            if (!(child instanceof HTMLElement)) continue;
            const id = Number(child.dataset.memeId);
            if (!Number.isNaN(id)) map.set(id, child.getBoundingClientRect());
          }
          prevRectsRef.current = map;
        };
        const loadMemes = async ({ silent = false } = {}) => {
          if (!silent) loading.value = true;
          statusColor.value = "#666";
          try {
            const roomId = await ensureRoomId();
            const liveSource = getMemeSourceForRoom(roomId);
            const data = await fetchAllMemes(roomId, sortBy.peek(), liveSource);
            if (data.length === 0) {
              memes.value = [];
              currentMemesList.value = [];
              status.value = "当前房间暂无烂梗";
              return;
            }
            if (memes.peek().length > 0) capturePositions();
            const counts = { L: 0, H: 0, C: 0 };
            for (const m2 of data) {
              if (m2._source === "sbhzm") counts.H++;
              else if (m2._source === "cb") counts.C++;
              else counts.L++;
            }
            const parts = [];
            if (counts.L) parts.push(`L:${counts.L}`);
            if (counts.H) parts.push(`H:${counts.H}`);
            if (counts.C) parts.push(`C:${counts.C}`);
            status.value = parts.length > 1 ? parts.join(" + ") : `${data.length} 条`;
            memes.value = data;
            currentMemesList.value = data;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            status.value = `加载失败: ${msg}`;
            statusColor.value = "#f44";
          } finally {
            if (!silent) loading.value = false;
          }
        };
        _$2(() => {
          const el = containerRef.current;
          const old = prevRectsRef.current;
          if (!el || old.size === 0) return;
          prevRectsRef.current = new Map();
          if (el.children.length > FLIP_MAX_ITEMS) return;
          for (let i2 = 0; i2 < el.children.length; i2++) {
            const node = el.children[i2];
            if (!(node instanceof HTMLElement)) continue;
            const id = Number(node.dataset.memeId);
            const prev = old.get(id);
            if (!prev) continue;
            const curr = node.getBoundingClientRect();
            const dy = prev.top - curr.top;
            if (Math.abs(dy) < 1) continue;
            node.style.transform = `translateY(${dy}px)`;
            node.style.transition = "";
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                node.style.transition = "transform .3s ease";
                node.style.transform = "";
              });
            });
          }
        }, [memes.value]);
        const updateCount2 = (id, count) => {
          capturePositions();
          const now = ( new Date()).toISOString();
          const updated = memes.value.map((m2) => m2.id === id ? { ...m2, copyCount: count, lastCopiedAt: now } : m2);
          sortMemes(updated, sortBy.peek());
          memes.value = updated;
        };
        const handleTagClick = (tagName) => {
          filterText.value = filterText.peek() === tagName ? "" : tagName;
        };
        y$2(() => {
          if (!memesPanelOpen.value && !memeSource) return;
          void loadMemes();
          const timer2 = setInterval(() => void loadMemes({ silent: true }), MEME_RELOAD_INTERVAL);
          return () => clearInterval(timer2);
        }, [sortBy.value, memesPanelOpen.value, memeSource]);
        y$2(() => {
          void maybeProbeSbhzmFreshness(memeSource);
        }, [memeSource]);
        return u$2(S$1, { children: [
u$2(
            "details",
            {
              open: memesPanelOpen.value,
              onToggle: (e2) => {
                memesPanelOpen.value = e2.currentTarget.open;
              },
              children: u$2("summary", { style: { cursor: "pointer", userSelect: "none", fontWeight: "bold" }, children: "烂梗库" })
            }
          ),
          memesPanelOpen.value && u$2(S$1, { children: [
u$2("div", { style: { display: "flex", alignItems: "center", gap: ".5em", marginTop: ".5em", marginBottom: ".5em" }, children: [
u$2(
                "select",
                {
                  style: { fontSize: "12px" },
                  value: sortBy.value,
                  onChange: (e2) => {
                    const v2 = e2.currentTarget.value;
                    if (isMemeSortBy(v2)) sortBy.value = v2;
                  },
                  children: [
u$2("option", { value: "lastCopiedAt", children: "最近使用" }),
u$2("option", { value: "copyCount", children: "最多复制" }),
u$2("option", { value: "createdAt", children: "最新添加" })
                  ]
                }
              ),
u$2(
                "button",
                {
                  type: "button",
                  style: { fontSize: "12px" },
                  disabled: loading.value,
                  onClick: () => void loadMemes(),
                  children: loading.value ? "加载中…" : "刷新"
                }
              ),
u$2("span", { style: { color: statusColor.value }, children: status.value }),
u$2(
                "a",
                {
                  href: `https://laplace.live/memes${cachedStreamerUid.value ? `?contribute=${cachedStreamerUid.value}` : ""}`,
                  target: "_blank",
                  rel: "noopener",
                  title: "打开 LAPLACE 烂梗贡献页（LAPLACE 库供所有直播间共享）",
                  style: { color: "#288bb8", textDecoration: "none", fontSize: "12px" },
                  children: "贡献到 LAPLACE"
                }
              ),
              memeSource && u$2(
                "a",
                {
                  href: memeSource.submitPage ?? memeSource.listEndpoint,
                  target: "_blank",
                  rel: "noopener",
                  title: `打开 ${memeSource.name} 提交页（仅本房间烂梗库；推荐用候选行的「↑ 上传」按钮直接 API 提交）`,
                  style: { color: "#10b981", textDecoration: "none", fontSize: "12px" },
                  children: [
                    "贡献到 ",
                    memeSource.name.replace("烂梗库", "")
                  ]
                }
              )
            ] }),
u$2("div", { style: { display: "flex", alignItems: "center", gap: ".25em", marginBottom: ".5em" }, children: [
u$2(
                "input",
                {
                  id: "enableMemeContribution",
                  type: "checkbox",
                  checked: enableMemeContribution.value,
                  onInput: (e2) => {
                    enableMemeContribution.value = e2.currentTarget.checked;
                  }
                }
              ),
u$2("label", { for: "enableMemeContribution", style: { fontSize: "12px" }, children: "自动挖掘待贡献梗" })
            ] }),
            enableMemeContribution.value && memeContributorCandidates.value.length > 0 && u$2("div", { style: { marginBottom: ".5em" }, children: [
u$2("div", { style: { fontSize: "12px", color: "#666", marginBottom: ".25em" }, children: [
                "候选梗（",
                memeContributorCandidates.value.length,
                " 条）："
              ] }),
              memeContributorCandidates.value.map((text) => {
                const expanded = submittingFor.value;
                const isSbhzmOpen = expanded?.text === text && expanded.target === "sbhzm";
                const isCbOpen = expanded?.text === text && expanded.target === "cb";
                return u$2(
                  "div",
                  {
                    style: {
                      padding: ".2em 0",
                      borderBottom: "1px solid var(--Ga2, #eee)"
                    },
                    children: [
u$2("div", { style: { display: "flex", gap: ".4em", alignItems: "center" }, children: [
u$2("span", { style: { flex: 1, fontSize: "12px", wordBreak: "break-all" }, children: text }),
u$2(
                          "button",
                          {
                            type: "button",
                            style: { fontSize: "11px", cursor: "pointer", padding: ".1em .4em", flexShrink: 0 },
                            title: "复制到剪贴板，并打开 LAPLACE 贡献页面",
                            onClick: () => {
                              const id = cachedRoomId.peek();
                              if (id === null) return;
                              void copyTextToClipboard(text);
                              const uid = cachedStreamerUid.value;
                              window.open(
                                `https://laplace.live/memes${uid ? `?contribute=${uid}` : ""}`,
                                "_blank",
                                "noopener"
                              );
                              ignoreMemeCandidate(text, id);
                            },
                            children: "复制+贡献 LAPLACE"
                          }
                        ),
                        memeSource && u$2(
                          "button",
                          {
                            type: "button",
                            style: {
                              fontSize: "11px",
                              cursor: "pointer",
                              padding: ".1em .4em",
                              flexShrink: 0,
                              background: isSbhzmOpen ? "#10b981" : "transparent",
                              color: isSbhzmOpen ? "#fff" : "inherit",
                              border: "1px solid var(--Ga2, #ccc)",
                              borderRadius: "3px"
                            },
                            title: `选标签后上传到 ${memeSource.name}（API：POST /api/admin/memes）`,
                            onClick: () => {
                              submittingFor.value = isSbhzmOpen ? null : { text, target: "sbhzm" };
                            },
                            children: isSbhzmOpen ? "收起" : `↑ 上传到 ${memeSource.name.replace("烂梗库", "")}`
                          }
                        ),
                        cbBackendEnabled.value && u$2(
                          "button",
                          {
                            type: "button",
                            style: {
                              fontSize: "11px",
                              cursor: "pointer",
                              padding: ".1em .4em",
                              flexShrink: 0,
                              background: isCbOpen ? "#3b82f6" : "transparent",
                              color: isCbOpen ? "#fff" : "#3b82f6",
                              border: "1px solid #3b82f6",
                              borderRadius: "3px"
                            },
                            title: "选标签后提交到 chatterbox-cloud(进 pending 队列等管理员审核)",
                            onClick: () => {
                              submittingFor.value = isCbOpen ? null : { text, target: "cb" };
                            },
                            children: isCbOpen ? "收起" : "↑ 贡献到 cb"
                          }
                        ),
u$2(
                          "button",
                          {
                            type: "button",
                            style: { fontSize: "11px", cursor: "pointer", padding: ".1em .4em", flexShrink: 0 },
                            onClick: () => {
                              const id = cachedRoomId.peek();
                              if (id !== null) ignoreMemeCandidate(text, id);
                              if (submittingFor.value?.text === text) submittingFor.value = null;
                            },
                            children: "忽略"
                          }
                        )
                      ] }),
                      isSbhzmOpen && memeSource && u$2(
                        SbhzmSubmitRow,
                        {
                          content: text,
                          source: memeSource,
                          onDone: () => {
                            const id = cachedRoomId.peek();
                            if (id !== null) ignoreMemeCandidate(text, id);
                            submittingFor.value = null;
                          },
                          onCancel: () => {
                            submittingFor.value = null;
                          }
                        }
                      ),
                      isCbOpen && u$2(
                        CbSubmitRow,
                        {
                          content: text,
                          source: memeSource,
                          onDone: () => {
                            const id = cachedRoomId.peek();
                            if (id !== null) ignoreMemeCandidate(text, id);
                            submittingFor.value = null;
                          },
                          onCancel: () => {
                            submittingFor.value = null;
                          }
                        }
                      )
                    ]
                  },
                  text
                );
              })
            ] }),
            memes.value.length > 0 && u$2(
              "input",
              {
                type: "text",
                placeholder: "筛选烂梗…",
                value: filterText.value,
                onInput: (e2) => {
                  filterText.value = e2.currentTarget.value;
                },
                style: { boxSizing: "border-box", width: "100%", marginBottom: ".5em" }
              }
            ),
            memeSource && memes.value.length > 0 && u$2("div", { style: { display: "flex", gap: ".3em", marginBottom: ".4em", fontSize: "11px" }, children: ["all", "laplace", "sbhzm"].map((s2) => u$2(
              "button",
              {
                type: "button",
                onClick: () => {
                  sourceFilter.value = s2;
                },
                style: {
                  padding: ".1em .5em",
                  borderRadius: "999px",
                  border: "1px solid var(--Ga2, #ccc)",
                  background: sourceFilter.value === s2 ? "var(--Ga2, #eee)" : "transparent",
                  fontWeight: sourceFilter.value === s2 ? "bold" : "normal",
                  cursor: "pointer"
                },
                children: s2 === "all" ? "全部" : s2 === "laplace" ? "LAPLACE" : memeSource.name
              },
              s2
            )) }),
            memes.value.length > 0 && u$2(MemeTagsBar, { memes: memes.value, filterText }),
u$2(
              "div",
              {
                ref: containerRef,
                style: {
                  overflowY: "auto",
                  marginLeft: "-10px",
                  marginRight: "-10px",
                  paddingInline: "10px",
                  maxHeight: optimizeLayout.value ? "180px" : "240px"
                },
                children: memes.value.filter((m2) => {
                  if (sourceFilter.value === "laplace" && m2._source === "sbhzm") return false;
                  if (sourceFilter.value === "sbhzm" && m2._source !== "sbhzm") return false;
                  const q2 = filterText.value.trim().toLowerCase();
                  if (!q2) return true;
                  if (m2.content.toLowerCase().includes(q2)) return true;
                  return m2.tags.some((t2) => t2.name.toLowerCase().includes(q2));
                }).map((meme) => u$2(MemeItem, { meme, onUpdateCount: updateCount2, onTagClick: handleTagClick }, meme.id))
              }
            )
          ] })
        ] });
      }
      function NormalSendTab() {
        if (customChatEnabled.value) return null;
        const sendMessage = async () => {
          const sent = await sendManualDanmaku(fasongText.value);
          if (sent) {
            fasongText.value = "";
          }
        };
        return u$2("details", { open: true, children: [
u$2("summary", { style: { cursor: "pointer", userSelect: "none", fontWeight: "bold" }, children: u$2("span", { children: "常规发送" }) }),
u$2("div", { className: "cb-body cb-stack", children: [
u$2("div", { style: { position: "relative" }, "data-cb-send-tab-anchor": true, children: [
u$2(
                "textarea",
                {
                  "data-cb-send-tab-textarea": true,
                  value: fasongText.value,
                  onInput: (e2) => {
                    fasongText.value = e2.currentTarget.value;
                  },
                  onKeyDown: (e2) => {
                    if (e2.key === "Enter" && !e2.shiftKey && !e2.isComposing) {
                      e2.preventDefault();
                      void sendMessage();
                    }
                  },
                  placeholder: "输入弹幕内容... (Enter 发送)",
                  style: {
                    boxSizing: "border-box",
                    height: "50px",
                    minHeight: "40px",
                    width: "100%",
                    resize: "vertical"
                  }
                }
              ),
u$2(
                "div",
                {
                  style: {
                    position: "absolute",
                    right: "8px",
                    bottom: "6px",
                    color: "#999",
                    pointerEvents: "none"
                  },
                  children: fasongText.value.length
                }
              )
            ] }),
u$2("div", { className: "cb-row", style: { display: "flex", alignItems: "center", gap: ".5em" }, children: [
u$2(SendActions, { onSend: (msg) => void sendManualDanmaku(msg) }),
u$2(
                "button",
                {
                  type: "button",
                  className: "cb-primary",
                  onClick: () => void sendMessage(),
                  style: { marginLeft: "auto" },
                  children: "发送"
                }
              )
            ] }),
u$2("div", { className: "cb-row", style: { display: "flex", flexDirection: "column", gap: ".15em" }, children: [
u$2("span", { className: "cb-row", children: [
u$2(
                  "input",
                  {
                    id: "aiEvasion",
                    type: "checkbox",
                    checked: aiEvasion.value,
                    onInput: (e2) => {
                      aiEvasion.value = e2.currentTarget.checked;
                    }
                  }
                ),
u$2(
                  "label",
                  {
                    for: "aiEvasion",
                    title: "发送失败时，弹幕文本会发到 edge-workers.laplace.cn 进行敏感词检测和改写，再尝试重新发送。详见 关于 → 隐私说明。",
                    children: "AI规避（发送失败时自动检测敏感词并重试）"
                  }
                )
              ] }),
              aiEvasion.value && u$2("div", { className: "cb-note", style: { color: "#666", fontSize: "0.85em", paddingLeft: "1.4em" }, children: "开启后，发送失败的弹幕文本会发到 edge-workers.laplace.cn 改写。详见 关于 → 隐私说明。" })
            ] })
          ] })
        ] });
      }
      function EmoteIds() {
        const packages = cachedEmoticonPackages.value;
        const copiedId = useSignal(null);
        if (packages.length === 0) {
          return u$2("div", { className: "cb-empty", style: { color: "#999" }, children: "表情数据加载中…" });
        }
        const handleCopy = async (unique) => {
          const ok = await copyTextToClipboard(unique);
          if (!ok) {
            notifyUser("error", "复制表情 ID 失败，请手动复制", unique);
            return;
          }
          copiedId.value = unique;
          setTimeout(() => {
            if (copiedId.peek() === unique) copiedId.value = null;
          }, 1500);
        };
        return u$2(S$1, { children: packages.map((pkg) => u$2("div", { style: { marginBottom: ".75em" }, children: [
u$2(
            "div",
            {
              className: "cb-heading",
              style: {
                fontWeight: "bold",
                marginBottom: ".25em",
                color: "#666",
                fontSize: "11px"
              },
              children: [
                pkg.pkg_name,
u$2("span", { style: { fontWeight: "normal", marginLeft: ".5em" }, children: [
                  "(",
                  pkg.emoticons.length,
                  ")"
                ] })
              ]
            }
          ),
u$2("div", { className: "cb-row", style: { display: "flex", flexWrap: "wrap", gap: "4px" }, children: pkg.emoticons.map((emo) => {
            const isCopied = copiedId.value === emo.emoticon_unique;
            const meta = getEmoticonLockMeta(emo);
            const titleParts = [emo.emoji, `点击复制: ${emo.emoticon_unique}`];
            if (meta.titleSuffix) titleParts.push(meta.titleSuffix);
            return u$2(
              "button",
              {
                type: "button",
                className: "cb-emote",
                "data-copied": isCopied,
                "data-locked": meta.isLocked,
                title: titleParts.join("\n"),
                onClick: () => void handleCopy(emo.emoticon_unique),
                style: {
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                  border: "1px solid var(--Ga2, #ddd)",
                  borderRadius: "3px",
                  background: isCopied ? "#36a185" : "var(--bg2, #f5f5f5)",
                  color: isCopied ? "#fff" : "#555",
                  cursor: "pointer",
                  fontSize: "10px",
                  lineHeight: 1.6,
                  transition: "background .15s, color .15s"
                },
                children: [
u$2(
                    "img",
                    {
                      src: emo.url,
                      alt: emo.emoji,
                      loading: "lazy",
                      style: {
                        width: "48px",
                        height: "48px",
                        objectFit: "contain",


opacity: meta.isLocked && !isCopied ? 0.5 : 1
                      }
                    }
                  ),
                  isCopied ? "已复制" : emo.emoji,
                  meta.isLocked && !isCopied && u$2(
                    "span",
                    {
                      style: {
                        position: "absolute",
                        top: 1,
                        right: 1,
                        padding: "0 4px",
                        fontSize: "9px",
                        lineHeight: "12px",
                        color: "#fff",
                        borderRadius: "2px",
                        background: meta.badgeColor,
                        pointerEvents: "none",
                        whiteSpace: "nowrap"
                      },
                      children: meta.badgeLabel
                    }
                  )
                ]
              },
              emo.emoticon_id
            );
          }) })
        ] }, pkg.pkg_id)) });
      }
      const BACKUP_VERSION = 1;
      const EXPORT_KEYS = [
"msgSendInterval",
        "maxLength",
        "randomColor",
        "randomInterval",
        "randomChar",
        "aiEvasion",
        "forceScrollDanmaku",
        "optimizeLayout",
        "danmakuDirectMode",
        "danmakuDirectConfirm",
        "danmakuDirectAlwaysShow",
"MsgTemplates",
        "activeTemplateIndex",
        "persistSendState",
"autoBlendWindowSec",
        "autoBlendThreshold",
        "autoBlendCooldownSec",
        "autoBlendRoutineIntervalSec",
        "autoBlendBurstSettleMs",
        "autoBlendRateLimitWindowMin",
        "autoBlendRateLimitStopThreshold",
        "autoBlendPreset",
        "autoBlendAdvancedOpen",
        "autoBlendDryRun",
        "autoBlendAvoidRisky",
        "autoBlendBlockedWords",
        "autoBlendIncludeReply",
        "autoBlendUseReplacements",
        "autoBlendRequireDistinctUsers",
        "autoBlendMinDistinctUsers",
        "autoBlendSendCount",
        "autoBlendSendAllTrending",
"customChatEnabled",
        "customChatHideNative",
        "customChatUseWs",
        "customChatTheme",
        "customChatShowDanmaku",
        "customChatShowGift",
        "customChatShowSuperchat",
        "customChatShowEnter",
        "customChatShowNotice",
        "customChatCss",
        "customChatPerfDebug",
"guardRoomEndpoint",
        "guardRoomSyncKey",
        "guardRoomWebsiteControlEnabled",
"logPanelOpen",
        "autoSendPanelOpen",
        "autoBlendPanelOpen",
        "memesPanelOpen",
"sonioxApiKey",
        "sonioxLanguageHints",
        "sonioxAutoSend",
        "sonioxMaxLength",
        "sonioxWrapBrackets",
        "sonioxTranslationEnabled",
        "sonioxTranslationTarget",
"localGlobalRules",
        "localRoomRules",
"maxLogLines"
      ];
      function exportSettings() {
        const data = {
          __version: BACKUP_VERSION,
          __exportedAt: ( new Date()).toISOString()
        };
        for (const key of EXPORT_KEYS) {
          const val = _GM_getValue(key, void 0);
          if (val !== void 0) data[key] = val;
        }
        return JSON.stringify(data, null, 2);
      }
      function importSettings(json) {
        let data;
        try {
          data = JSON.parse(json);
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          return { ok: false, error: `无效的 JSON 格式：${detail}`, count: 0 };
        }
        if (typeof data !== "object" || data === null || Array.isArray(data)) {
          return { ok: false, error: "数据格式错误，需要 JSON 对象", count: 0 };
        }
        const version = data.__version;
        if (typeof version === "number" && version > BACKUP_VERSION) {
          return { ok: false, error: `导入版本 ${version} 高于当前支持的版本 ${BACKUP_VERSION}`, count: 0 };
        }
        const allowed = new Set(EXPORT_KEYS);
        const toApply = {};
        const skipped = [];
        const unknownKeys = [];
        let count = 0;
        for (const [key, val] of Object.entries(data)) {
          if (key.startsWith("__")) continue;
          if (!allowed.has(key)) {
            unknownKeys.push(key);
            continue;
          }
          if (!isValidImportedValue(key, val)) {
            skipped.push(key);
            continue;
          }
          _GM_setValue(key, val);
          toApply[key] = val;
          count++;
        }
        applyImportedSettings(toApply);
        return {
          ok: true,
          count,
          skipped: skipped.length > 0 ? skipped : void 0,
          unknownKeys: unknownKeys.length > 0 ? unknownKeys : void 0
        };
      }
      function BackupSection({ query = "" }) {
        const importOpen = useSignal(false);
        const importText = useSignal("");
        const importMsg = useSignal("");
        const visible = !query || "配置备份 恢复 导出 导入 JSON 复制 backup export import".toLowerCase().includes(query);
        if (!visible) return null;
        function handleExport() {
          const json = exportSettings();
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a2 = document.createElement("a");
          a2.href = url;
          a2.download = `chatterbox-backup-${( new Date()).toISOString().slice(0, 10)}.json`;
          a2.click();
          URL.revokeObjectURL(url);
          notifyUser("success", "配置已导出");
        }
        function handleCopyExport() {
          const json = exportSettings();
          void copyTextToClipboard(json).then((ok) => {
            if (ok) notifyUser("success", "配置已复制到剪贴板");
            else notifyUser("error", "复制配置失败，请手动复制", "可改用「导出配置」下载文件");
          });
        }
        function handleImport() {
          const result = importSettings(importText.value);
          if (!result.ok) {
            importMsg.value = `❌ 导入失败：${result.error}（常见原因：JSON 格式错误，或来自不兼容的旧版本）`;
            notifyUser("error", "配置导入失败", result.error);
            return;
          }
          const skippedNote = result.skipped && result.skipped.length > 0 ? `（${result.skipped.length} 项格式不匹配被跳过：${result.skipped.join("、")}）` : "";
          const unknownNote = result.unknownKeys && result.unknownKeys.length > 0 ? `（${result.unknownKeys.length} 项未识别 key 被忽略：${result.unknownKeys.join("、")}）` : "";
          importMsg.value = `✅ 已导入 ${result.count} 项，请刷新页面生效${skippedNote}${unknownNote}`;
          notifyUser("success", `配置导入成功（${result.count} 项），请刷新页面`);
          if (result.skipped && result.skipped.length > 0) {
            notifyUser("warning", "部分配置因格式不匹配被跳过", result.skipped.join("、"));
          }
        }
        return u$2("details", { className: "cb-settings-accordion", children: [
u$2("summary", { children: "配置备份 / 恢复" }),
u$2("div", { className: "cb-section cb-stack", style: { margin: ".5em 0", paddingBottom: "1em" }, children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".5em" }, children: "配置备份 / 恢复" }),
u$2("div", { className: "cb-row", style: { display: "flex", gap: ".5em", flexWrap: "wrap" }, children: [
u$2("button", { className: "cb-btn", onClick: handleExport, title: "下载配置 JSON 文件", type: "button", children: "导出配置" }),
u$2("button", { className: "cb-btn", onClick: handleCopyExport, title: "复制配置 JSON 到剪贴板", type: "button", children: "复制 JSON" }),
u$2(
                "button",
                {
                  className: "cb-btn",
                  onClick: () => {
                    importOpen.value = !importOpen.value;
                    importMsg.value = "";
                  },
                  type: "button",
                  children: importOpen.value ? "取消导入" : "导入配置"
                }
              )
            ] }),
            importOpen.value && u$2("div", { className: "cb-stack", style: { marginTop: ".5em", gap: ".5em" }, children: [
u$2("div", { className: "cb-note", style: { color: "#a15c00", fontSize: "0.85em" }, children: "⚠️ 导入会覆盖现有设置，包括同步密钥、Soniox API Key 和保安室地址。建议导入前先备份当前配置。" }),
u$2("details", { style: { fontSize: "0.85em" }, children: [
u$2("summary", { style: { cursor: "pointer", color: "#666" }, children: "查看示例 JSON 结构" }),
u$2(
                  "pre",
                  {
                    style: {
                      background: "var(--bg2, #f5f5f5)",
                      padding: ".5em",
                      borderRadius: "4px",
                      fontSize: "0.8em",
                      overflowX: "auto",
                      margin: ".25em 0 0",
                      whiteSpace: "pre"
                    },
                    children: `{
  "__version": 1,
  "__exportedAt": "2026-01-15T10:30:00.000Z",
  "msgSendInterval": 4,
  "autoBlendPreset": "normal",
  "autoBlendDryRun": true,
  "MsgTemplates": [{ "name": "默认", "msg": "..." }],
  "customChatEnabled": false,
  ...
}`
                  }
                )
              ] }),
u$2(
                "textarea",
                {
                  style: { width: "100%", height: "80px", fontFamily: "monospace", fontSize: "0.8em", resize: "vertical" },
                  placeholder: "粘贴配置 JSON...",
                  value: importText.value,
                  onInput: (e2) => {
                    importText.value = e2.currentTarget.value;
                    importMsg.value = "";
                  }
                }
              ),
u$2("button", { className: "cb-btn", onClick: handleImport, disabled: !importText.value.trim(), type: "button", children: "确认导入（刷新后生效）" }),
              importMsg.value && u$2(
                "span",
                {
                  role: "status",
                  "aria-live": "polite",
                  style: { fontSize: "0.85em", color: importMsg.value.startsWith("✅") ? "#4caf50" : "#f44336" },
                  children: importMsg.value
                }
              )
            ] }),
u$2("p", { style: { color: "#666", fontSize: "0.8em", margin: ".25em 0 0" }, children: "导出包含所有设置、模板、替换规则和跟车配置（不含烂梗缓存）。" })
          ] })
        ] });
      }
      const SECTION_KEYWORDS$1 = "梗库后端 chatterbox cloud cb 后端 自建 backend localhost";
      function statusDotColor(state) {
        switch (state) {
          case "ok":
            return "#34c759";
          case "fail":
            return "#ff3b30";
          case "probing":
            return "#ff9500";
          default:
            return "#c7c7cc";
        }
      }
      function statusLabel(state) {
        switch (state) {
          case "ok":
            return "已连通";
          case "fail":
            return "不通";
          case "probing":
            return "探测中";
          default:
            return "未启用";
        }
      }
      function CbBackendSection({ query = "" }) {
        const visible = !query || SECTION_KEYWORDS$1.toLowerCase().includes(query);
        if (!visible) return null;
        async function handleProbe() {
          await probeAndUpdateCbBackendHealth();
        }
        const probing = cbBackendHealthState.value === "probing";
        return u$2("details", { className: "cb-settings-accordion", children: [
u$2("summary", { children: [
u$2("span", { className: "cb-accordion-title", children: "梗库后端 (chatterbox-cloud)" }),
u$2(
              "span",
              {
                className: "cb-status-dot",
                role: "img",
                style: { color: statusDotColor(cbBackendHealthState.value) },
                title: `${statusLabel(cbBackendHealthState.value)}: ${cbBackendHealthDetail.value || "尚未探测"}`,
                "aria-label": statusLabel(cbBackendHealthState.value)
              }
            )
          ] }),
u$2("div", { className: "cb-section cb-stack", style: { margin: ".5em 0", paddingBottom: "1em" }, children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".5em" }, children: "梗库后端 (chatterbox-cloud)" }),
u$2("div", { className: "cb-note", style: { color: "#666", fontSize: "0.85em", marginBottom: ".5em" }, children: "自建第三方烂梗库。开启后,烂梗库列表会额外加载来自 chatterbox-cloud 的内容(带蓝色 C 徽章)。 Phase A 仅有 3 条写死样例,Phase B/C 会接入真实社区贡献和上游聚合。" }),
u$2("label", { className: "cb-row", style: { display: "flex", gap: ".5em", alignItems: "center" }, children: [
u$2(
                "input",
                {
                  type: "checkbox",
                  checked: cbBackendEnabled.value,
                  onChange: (e2) => {
                    cbBackendEnabled.value = e2.currentTarget.checked;
                  }
                }
              ),
u$2("span", { children: "启用 chatterbox-cloud 梗源" })
            ] }),
u$2("div", { className: "cb-stack", style: { marginTop: ".5em", gap: ".25em" }, children: [
u$2("label", { htmlFor: "cbBackendUrlOverride", style: { color: "#666", fontSize: "0.85em" }, children: [
                "后端 URL(开发用,留空走默认 ",
                BASE_URL.CB_BACKEND,
                ")"
              ] }),
u$2(
                "input",
                {
                  id: "cbBackendUrlOverride",
                  type: "url",
                  placeholder: "http://localhost:8787",
                  value: cbBackendUrlOverride.value,
                  style: { width: "100%", fontSize: "12px" },
                  onInput: (e2) => {
                    cbBackendUrlOverride.value = e2.currentTarget.value;
                  }
                }
              )
            ] }),
u$2("div", { className: "cb-row", style: { display: "flex", gap: ".5em", alignItems: "center", marginTop: ".5em" }, children: [
u$2("button", { className: "cb-btn", onClick: handleProbe, disabled: probing, type: "button", children: probing ? "探测中…" : "测试连通性" }),
u$2(
                "span",
                {
                  className: "cb-status-dot",
                  style: { color: statusDotColor(cbBackendHealthState.value), marginLeft: "4px" },
                  "aria-hidden": "true"
                }
              ),
u$2("span", { style: { fontSize: "0.85em" }, children: [
                statusLabel(cbBackendHealthState.value),
                cbBackendHealthDetail.value ? `: ${cbBackendHealthDetail.value}` : ""
              ] })
            ] })
          ] })
        ] });
      }
      const MILK_GREEN_IMESSAGE_CSS = `/* Chatterbox 奶绿 iMessage × Laplace 气泡 */
@import url('https://fonts.googleapis.com/css2?family=Jost:wght@400;600;700;800&display=swap');

@layer chatterbox-custom-css {
  #laplace-custom-chat {
    --lc-chat-font: 'Jost', -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
    --lc-chat-bg: #eef7f1;
    --lc-chat-panel: rgba(248, 253, 249, .86);
    --lc-chat-border: rgba(63, 103, 79, .15);
    --lc-chat-text: #1e3427;
    --lc-chat-muted: #6d8273;
    --lc-chat-name: #248a61;
    --lc-chat-bubble: #f7fff9;
    --lc-chat-bubble-text: #213d2b;
    --lc-chat-own: #2f9b70;
    --lc-chat-own-text: #fff;
    --lc-chat-chip: rgba(78, 141, 104, .14);
    --lc-chat-chip-text: #21422f;
    --lc-chat-accent: #34c759;
    --lc-chat-shadow: rgba(36, 74, 48, .16);
    --lc-chat-bubble-shadow: 0 1px 1px rgba(36, 74, 48, .05), 0 8px 22px rgba(36, 74, 48, .12);
    --lc-chat-lite: rgba(116, 159, 131, .16);
    --lc-chat-lite-text: #58715f;
    --lc-chat-medal-bg: #f7e7a8;
    --lc-chat-medal-text: #5c4210;
    --lc-chat-guard-bg: #c8ddfc;
    --lc-chat-guard-text: #1d4b86;
    --lc-chat-admin-bg: #d7ebff;
    --lc-chat-admin-text: #075d9a;
    --lc-chat-rank-bg: #ffe4a1;
    --lc-chat-rank-text: #704400;
    --lc-chat-ul-bg: #e6dcfa;
    --lc-chat-ul-text: #543579;
    --lc-chat-honor-bg: #d8f1df;
    --lc-chat-honor-text: #1d633c;
    --lc-chat-price-bg: #ffe0cc;
    --lc-chat-price-text: #7f3516;
    --lc-event-text: #213d2b;
    --lc-event-bg: #f1fbf5;
    --lc-gift-bg: linear-gradient(135deg, #ffe0cc, #fff3cd);
    --lc-gift-text: #4a2618;
    --lc-superchat-bg: linear-gradient(135deg, #2f80ed, #47d18c);
    --lc-superchat-text: #fff;
    --lc-guard-3-bg: linear-gradient(135deg, #c8ddfc, #d8f1df);
    --lc-guard-2-bg: linear-gradient(135deg, #e9ccf0, #d8f1df);
    --lc-guard-1-bg: linear-gradient(135deg, #ffd7c2, #f5e19e);
    --lc-redpacket-bg: linear-gradient(135deg, #ffb3bd, #ffe6a7);
    --lc-lottery-bg: linear-gradient(135deg, #bde5d1, #c8ddfc);
  }

  #laplace-custom-chat,
  #laplace-custom-chat * {
    font-family: var(--lc-chat-font);
  }

  #laplace-custom-chat .lc-chat-list {
    background-image:
      linear-gradient(45deg, rgba(255,255,255,.46) 25%, transparent 25%),
      linear-gradient(-45deg, rgba(255,255,255,.46) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, rgba(255,255,255,.46) 75%),
      linear-gradient(-45deg, transparent 75%, rgba(255,255,255,.46) 75%);
    background-size: 18px 18px;
    background-position: 0 0, 0 9px, 9px -9px, -9px 0;
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 24px, #000 calc(100% - 24px), transparent);
    mask-image: linear-gradient(to bottom, transparent, #000 24px, #000 calc(100% - 24px), transparent);
  }

  #laplace-custom-chat .lc-chat-message {
    transition: .24s color ease, .24s background-color ease, .24s opacity ease;
  }

  #laplace-custom-chat .lc-chat-avatar {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, .72), 0 2px 8px rgba(36, 74, 48, .16);
  }

  #laplace-custom-chat .lc-chat-name {
    color: #21976a;
    font-weight: 800;
    text-shadow: 0 0 2px rgba(238, 247, 241, .8);
  }

  #laplace-custom-chat .lc-chat-time {
    color: #7b8e82;
  }

  #laplace-custom-chat .lc-chat-bubble {
    color: var(--lc-event-text);
    background: var(--lc-event-bg);
    font-weight: 700;
    filter: drop-shadow(0 0 1px rgba(33, 61, 43, .24));
  }

  #laplace-custom-chat .lc-chat-bubble::before {
    background: var(--lc-event-bg);
    border-color: rgba(63, 103, 79, .12);
  }

  #laplace-custom-chat .lc-chat-reply {
    color: #15945f;
  }

  #laplace-custom-chat .lc-chat-medal {
    max-width: min(13em, 72%);
    text-shadow: none;
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="medal"] {
    color: var(--lc-chat-medal-text);
    background: var(--lc-chat-medal-bg);
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="guard"] {
    color: var(--lc-chat-guard-text);
    background: var(--lc-chat-guard-bg);
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="admin"] {
    color: var(--lc-chat-admin-text);
    background: var(--lc-chat-admin-bg);
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="rank"] {
    color: var(--lc-chat-rank-text);
    background: var(--lc-chat-rank-bg);
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="ul"] {
    color: var(--lc-chat-ul-text);
    background: var(--lc-chat-ul-bg);
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="honor"] {
    color: var(--lc-chat-honor-text);
    background: var(--lc-chat-honor-bg);
  }

  #laplace-custom-chat .lc-chat-badge[data-badge-type="price"] {
    color: var(--lc-chat-price-text);
    background: var(--lc-chat-price-bg);
  }

  #laplace-custom-chat .lc-chat-kind,
  #laplace-custom-chat .lc-chat-card-mark {
    color: #21422f;
    background: rgba(255, 255, 255, .5);
  }

  #laplace-custom-chat .lc-chat-card-event .lc-chat-bubble {
    min-width: min(18em, 100%);
    padding: 11px 15px;
    border-radius: 20px;
    border-bottom-left-radius: 8px;
    filter: drop-shadow(0 1px 2px rgba(36, 74, 48, .18));
  }

  #laplace-custom-chat .lc-chat-card-event .lc-chat-bubble::before {
    background: inherit;
  }

  #laplace-custom-chat .lc-chat-card-title {
    font-weight: 800;
  }

  #laplace-custom-chat .lc-chat-card-field {
    background: rgba(255, 255, 255, .42);
  }

  #laplace-custom-chat .lc-chat-card-field[data-field$="price"],
  #laplace-custom-chat .lc-chat-card-field[data-kind="money"] {
    color: #855118;
  }

  #laplace-custom-chat .lc-chat-card-field[data-field$="count"],
  #laplace-custom-chat .lc-chat-card-field[data-kind="count"] {
    color: #24523a;
  }

  #laplace-custom-chat .lc-chat-event-debug {
    color: #24523a;
    background: rgba(214, 239, 224, .92);
  }

  #laplace-custom-chat .lc-chat-card-event[data-card="gift"] .lc-chat-bubble {
    color: var(--lc-gift-text);
    background: var(--lc-gift-bg);
  }

  #laplace-custom-chat .lc-chat-card-event[data-card="superchat"] .lc-chat-bubble {
    color: var(--lc-superchat-text);
    background: var(--lc-superchat-bg);
  }

  #laplace-custom-chat .lc-chat-card-event[data-card="guard"] .lc-chat-bubble {
    color: #173b28;
    background: var(--lc-guard-3-bg);
  }

  #laplace-custom-chat .lc-chat-card-event[data-guard="2"] .lc-chat-bubble {
    color: #43205c;
    background: var(--lc-guard-2-bg);
  }

  #laplace-custom-chat .lc-chat-card-event[data-guard="1"] .lc-chat-bubble {
    color: #4d2318;
    background: var(--lc-guard-1-bg);
  }

  #laplace-custom-chat .lc-chat-card-event[data-card="redpacket"] .lc-chat-bubble {
    color: #4d2318;
    background: var(--lc-redpacket-bg);
  }

  #laplace-custom-chat .lc-chat-card-event[data-card="lottery"] .lc-chat-bubble {
    color: #173b28;
    background: var(--lc-lottery-bg);
  }

  #laplace-custom-chat .lc-chat-message[data-kind="follow"] .lc-chat-bubble,
  #laplace-custom-chat .lc-chat-message[data-kind="like"] .lc-chat-bubble,
  #laplace-custom-chat .lc-chat-message[data-kind="share"] .lc-chat-bubble,
  #laplace-custom-chat .lc-chat-message[data-kind="enter"] .lc-chat-bubble,
  #laplace-custom-chat .lc-chat-message[data-kind="notice"] .lc-chat-bubble,
  #laplace-custom-chat .lc-chat-message[data-priority="lite"] .lc-chat-bubble {
    color: #24523a;
    background: rgba(189, 229, 209, .72);
  }

  #laplace-custom-chat .lc-chat-actions {
    filter: drop-shadow(0 1px 2px rgba(36, 74, 48, .16));
  }

  #laplace-custom-chat .lc-chat-action,
  #laplace-custom-chat .lc-chat-send {
    color: #fff;
    background: #2f9b70;
  }

  #laplace-custom-chat .lc-chat-perf {
    color: #24523a;
    background: rgba(214, 239, 224, .8);
  }
}
`;
      function CustomChatSection({ query = "" }) {
        const cssDraft = useSignal(customChatCss.value);
        const cssStatus = useSignal("saved");
        y$2(() => {
          const draft = cssDraft.value;
          if (draft === customChatCss.value) {
            cssStatus.value = "saved";
            return;
          }
          cssStatus.value = "pending";
          const timer2 = setTimeout(() => {
            customChatCss.value = draft;
            cssStatus.value = "saved";
          }, 400);
          return () => clearTimeout(timer2);
        }, [cssDraft.value]);
        const visible = !query || "Chatterbox Chat 评论区 WS DOM 主题 CSS".toLowerCase().includes(query);
        if (!visible) return null;
        return u$2("details", { className: "cb-settings-accordion", open: true, children: [
u$2("summary", { className: "cb-module-summary", children: [
u$2("span", { className: "cb-accordion-title", children: "Chatterbox Chat" }),
u$2("span", { className: "cb-module-state", "data-active": customChatEnabled.value ? "true" : "false", children: customChatEnabled.value ? "接管" : "关闭" })
          ] }),
u$2(
            "div",
            {
              className: "cb-section cb-stack",
              style: { margin: ".5em 0", paddingBottom: "1em", borderBottom: "1px solid var(--Ga2, #eee)" },
              children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".5em" }, children: "Chatterbox Chat" }),
u$2("div", { className: "cb-setting-block cb-setting-primary", children: u$2("span", { className: "cb-switch-row", style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                    "input",
                    {
                      id: "customChatEnabled",
                      type: "checkbox",
                      checked: customChatEnabled.value,
                      onInput: (e2) => {
                        customChatEnabled.value = e2.currentTarget.checked;
                      }
                    }
                  ),
u$2("label", { htmlFor: "customChatEnabled", children: "接管 B 站聊天区（Chatterbox Chat）" })
                ] }) }),
u$2(
                  "div",
                  {
                    className: "cb-setting-block cb-dependent-group",
                    "data-enabled": customChatEnabled.value ? "true" : "false",
                    "data-reason": "先开启 Chatterbox Chat",
                    children: [
u$2("span", { className: "cb-switch-row", style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                          "input",
                          {
                            id: "customChatHideNative",
                            type: "checkbox",
                            checked: customChatHideNative.value,
                            disabled: !customChatEnabled.value,
                            onInput: (e2) => {
                              customChatHideNative.value = e2.currentTarget.checked;
                            }
                          }
                        ),
u$2("label", { htmlFor: "customChatHideNative", style: { color: customChatEnabled.value ? void 0 : "#999" }, children: "隐藏 B 站原评论列表和原发送框" })
                      ] }),
u$2("span", { className: "cb-switch-row", style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                          "input",
                          {
                            id: "customChatUseWs",
                            type: "checkbox",
                            checked: customChatUseWs.value,
                            disabled: !customChatEnabled.value,
                            onInput: (e2) => {
                              customChatUseWs.value = e2.currentTarget.checked;
                            }
                          }
                        ),
u$2("label", { htmlFor: "customChatUseWs", style: { color: customChatEnabled.value ? void 0 : "#999" }, children: "直连 WebSocket 获取礼物、醒目留言、进场等事件（DOM 兜底）" })
                      ] }),
u$2("div", { className: "cb-row cb-setting-row", children: [
u$2("label", { htmlFor: "customChatTheme", children: "评论区主题" }),
u$2(
                          "select",
                          {
                            id: "customChatTheme",
                            value: customChatTheme.value,
                            disabled: !customChatEnabled.value,
                            onChange: (e2) => {
                              customChatTheme.value = e2.currentTarget.value;
                            },
                            children: [
u$2("option", { value: "laplace", children: "iMessage Dark" }),
u$2("option", { value: "light", children: "iMessage Light" }),
u$2("option", { value: "compact", children: "Compact Bubble" })
                            ]
                          }
                        )
                      ] }),
u$2("details", { className: "cb-subdetails", children: [
u$2("summary", { children: "自定义评论区 CSS" }),
u$2("div", { className: "cb-body cb-stack", children: [
u$2("div", { className: "cb-row", children: [
u$2(
                              "button",
                              {
                                type: "button",
                                disabled: !customChatEnabled.value,
                                onClick: () => {
                                  cssDraft.value = MILK_GREEN_IMESSAGE_CSS;
                                },
                                children: "奶绿 iMessage"
                              }
                            ),
u$2(
                              "button",
                              {
                                type: "button",
                                disabled: !customChatEnabled.value || !cssDraft.value.trim(),
                                onClick: () => {
                                  cssDraft.value = "";
                                },
                                children: "清空 CSS"
                              }
                            )
                          ] }),
u$2(
                            "textarea",
                            {
                              value: cssDraft.value,
                              disabled: !customChatEnabled.value,
                              onInput: (e2) => {
                                cssDraft.value = e2.currentTarget.value;
                              },
                              placeholder: "#laplace-custom-chat .lc-chat-message { ... }",
                              style: { minHeight: "90px", resize: "vertical", width: "100%" }
                            }
                          ),
u$2("div", { className: "cb-note", style: { display: "flex", justifyContent: "space-between" }, children: [
u$2("span", { children: "可覆盖 #laplace-custom-chat 的 --lc-chat-* 变量，以及 .lc-chat-bubble、.lc-chat-medal、.lc-chat-name、.lc-chat-action、.lc-chat-card-event、[data-kind]、[data-card]、[data-guard] 等选择器。" }),
u$2(
                              "span",
                              {
                                style: {
                                  flexShrink: 0,
                                  marginLeft: "8px",
                                  color: cssStatus.value === "pending" ? "#ff9500" : "#34c759"
                                },
                                children: cssStatus.value === "pending" ? "有待保存更改" : "已保存"
                              }
                            )
                          ] })
                        ] })
                      ] }),
u$2("span", { className: "cb-switch-row", style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                          "input",
                          {
                            id: "customChatPerfDebug",
                            type: "checkbox",
                            checked: customChatPerfDebug.value,
                            disabled: !customChatEnabled.value,
                            onInput: (e2) => {
                              customChatPerfDebug.value = e2.currentTarget.checked;
                            }
                          }
                        ),
u$2("label", { htmlFor: "customChatPerfDebug", style: { color: customChatEnabled.value ? void 0 : "#999" }, children: "显示 Chatterbox 性能调试信息" })
                      ] })
                    ]
                  }
                )
              ]
            }
          )
        ] });
      }
      function DanmakuDirectSection({ query = "" }) {
        const visible = !query || "偷弹幕 +1 发送 确认 按钮".toLowerCase().includes(query);
        if (!visible) return null;
        return u$2("details", { className: "cb-settings-accordion", children: [
u$2("summary", { className: "cb-module-summary", children: [
u$2("span", { className: "cb-accordion-title", children: "偷弹幕与 +1" }),
u$2("span", { className: "cb-module-state", "data-active": danmakuDirectMode.value ? "true" : "false", children: danmakuDirectMode.value ? "ON" : "OFF" })
          ] }),
u$2(
            "div",
            {
              className: "cb-section cb-stack",
              style: { margin: ".5em 0", paddingBottom: "1em", borderBottom: "1px solid var(--Ga2, #eee)" },
              children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".5em" }, children: "偷弹幕与 +1" }),
u$2("div", { className: "cb-setting-block cb-setting-primary", children: [
u$2("span", { className: "cb-switch-row", style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                      "input",
                      {
                        id: "danmakuDirectMode",
                        type: "checkbox",
                        checked: danmakuDirectMode.value,
                        onInput: (e2) => {
                          danmakuDirectMode.value = e2.currentTarget.checked;
                        }
                      }
                    ),
u$2("label", { htmlFor: "danmakuDirectMode", children: "+1模式（在聊天消息旁显示偷弹幕和+1按钮）" })
                  ] }),
u$2(
                    "span",
                    {
                      className: "cb-switch-row cb-setting-child",
                      "data-enabled": danmakuDirectMode.value ? "true" : "false",
                      style: { display: "inline-flex", alignItems: "center", gap: ".25em", paddingLeft: "1.5em" },
                      children: [
u$2(
                          "input",
                          {
                            id: "danmakuDirectConfirm",
                            type: "checkbox",
                            checked: danmakuDirectConfirm.value,
                            disabled: !danmakuDirectMode.value,
                            onInput: (e2) => {
                              danmakuDirectConfirm.value = e2.currentTarget.checked;
                            }
                          }
                        ),
u$2("label", { htmlFor: "danmakuDirectConfirm", style: { color: danmakuDirectMode.value ? void 0 : "#999" }, children: "+1弹幕发送前需确认（防误触）" })
                      ]
                    }
                  ),
u$2(
                    "span",
                    {
                      className: "cb-switch-row cb-setting-child",
                      "data-enabled": danmakuDirectMode.value ? "true" : "false",
                      style: { display: "inline-flex", alignItems: "center", gap: ".25em", paddingLeft: "1.5em" },
                      children: [
u$2(
                          "input",
                          {
                            id: "danmakuDirectAlwaysShow",
                            type: "checkbox",
                            checked: danmakuDirectAlwaysShow.value,
                            disabled: !danmakuDirectMode.value,
                            onInput: (e2) => {
                              danmakuDirectAlwaysShow.value = e2.currentTarget.checked;
                            }
                          }
                        ),
u$2("label", { htmlFor: "danmakuDirectAlwaysShow", style: { color: danmakuDirectMode.value ? void 0 : "#999" }, children: "总是显示偷/+1按钮" })
                      ]
                    }
                  )
                ] })
              ]
            }
          )
        ] });
      }
      function LayoutSection({ query = "" }) {
        const visible = !query || "直播间布局 优化布局 滚动 拉黑 解锁".toLowerCase().includes(query);
        if (!visible) return null;
        return u$2("details", { className: "cb-settings-accordion", children: [
u$2("summary", { className: "cb-module-summary", children: [
u$2("span", { className: "cb-accordion-title", children: "直播间布局" }),
u$2("span", { className: "cb-module-state", "data-active": optimizeLayout.value ? "true" : "false", children: optimizeLayout.value ? "OPT" : "STD" })
          ] }),
u$2(
            "div",
            {
              className: "cb-section cb-stack",
              style: { margin: ".5em 0", paddingBottom: "1em", borderBottom: "1px solid var(--Ga2, #eee)" },
              children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".5em" }, children: "直播间布局" }),
u$2("div", { className: "cb-setting-block cb-setting-primary", children: [
u$2("span", { className: "cb-switch-row", style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                      "input",
                      {
                        id: "optimizeLayout",
                        type: "checkbox",
                        checked: optimizeLayout.value,
                        onInput: (e2) => {
                          optimizeLayout.value = e2.currentTarget.checked;
                        }
                      }
                    ),
u$2("label", { htmlFor: "optimizeLayout", children: "优化布局" })
                  ] }),
u$2("span", { className: "cb-switch-row", style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                      "input",
                      {
                        id: "forceScrollDanmaku",
                        type: "checkbox",
                        checked: forceScrollDanmaku.value,
                        onInput: (e2) => {
                          forceScrollDanmaku.value = e2.currentTarget.checked;
                        }
                      }
                    ),
u$2("label", { htmlFor: "forceScrollDanmaku", children: "脚本载入时强制配置弹幕位置为滚动方向" })
                  ] }),
u$2("span", { className: "cb-switch-row", style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                      "input",
                      {
                        id: "unlockForbidLive",
                        type: "checkbox",
                        checked: unlockForbidLive.value,
                        onInput: (e2) => {
                          unlockForbidLive.value = e2.currentTarget.checked;
                        }
                      }
                    ),
u$2("label", { htmlFor: "unlockForbidLive", children: "拉黑直播间解锁（刷新生效，仅布局解锁）" })
                  ] })
                ] })
              ]
            }
          )
        ] });
      }
      const DEFAULT_STATUS = "尚未巡检 — 点击「检查粉丝牌禁言」开始";
      const NOT_LOGGED_IN_STATUS = "未登录 Bilibili — 请先登录再执行巡检";
      const medalCheckStatusByUid = gmSignal("medalCheckStatusByUid", {});
      const medalCheckResultsByUid = gmSignal("medalCheckResultsByUid", {});
      const medalCheckFilterByUid = gmSignal("medalCheckFilterByUid", {});
      (() => {
        const uid = getDedeUid();
        if (!uid) return;
        const legacyResults = _GM_getValue("medalCheckResults", void 0);
        const legacyStatus = _GM_getValue("medalCheckStatus", void 0);
        const legacyFilter = _GM_getValue("medalCheckFilter", void 0);
        let migrated = false;
        if (Array.isArray(legacyResults) && legacyResults.length > 0 && !medalCheckResultsByUid.value[uid]) {
          medalCheckResultsByUid.value = { ...medalCheckResultsByUid.value, [uid]: legacyResults };
          migrated = true;
        }
        if (typeof legacyStatus === "string" && legacyStatus && !medalCheckStatusByUid.value[uid]) {
          medalCheckStatusByUid.value = { ...medalCheckStatusByUid.value, [uid]: legacyStatus };
          migrated = true;
        }
        if (typeof legacyFilter === "string" && !medalCheckFilterByUid.value[uid]) {
          medalCheckFilterByUid.value = { ...medalCheckFilterByUid.value, [uid]: legacyFilter };
          migrated = true;
        }
        if (migrated) {
          try {
            _GM_deleteValue("medalCheckResults");
          } catch {
          }
          try {
            _GM_deleteValue("medalCheckStatus");
          } catch {
          }
          try {
            _GM_deleteValue("medalCheckFilter");
          } catch {
          }
        }
      })();
      function getMedalCheckCounts(results) {
        return {
          restricted: results.filter((result) => result.status === "restricted").length,
          deactivated: results.filter((result) => result.status === "deactivated").length,
          unknown: results.filter((result) => result.status === "unknown").length,
          ok: results.filter((result) => result.status === "ok").length
        };
      }
      function signalKindLabel(kind) {
        if (kind === "muted") return "房间禁言";
        if (kind === "blocked") return "房间屏蔽/拉黑";
        if (kind === "account") return "账号风控";
        if (kind === "rate-limit") return "频率限制";
        if (kind === "deactivated") return "主播已注销";
        return "未知信号";
      }
      function formatCheckTime(ts) {
        return new Date(ts).toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
      }
      function sortMedalResults(results) {
        const rank = { restricted: 0, unknown: 1, deactivated: 2, ok: 3 };
        return [...results].sort(
          (a2, b2) => rank[a2.status] - rank[b2.status] || a2.room.anchorName.localeCompare(b2.room.anchorName)
        );
      }
      function medalStatusTitle(status) {
        if (status === "restricted") return "发现限制";
        if (status === "unknown") return "无法确认";
        if (status === "deactivated") return "主播已注销";
        return "未发现限制";
      }
      function medalStatusColor(status) {
        if (status === "restricted") return "#a15c00";
        if (status === "unknown") return "#666";
        if (status === "deactivated") return "#8e8e93";
        return "#0a7f55";
      }
      function getFilteredMedalResults(results, filter) {
        const sorted = sortMedalResults(results);
        if (filter === "all") return sorted;
        if (filter === "issues") return sorted.filter((result) => result.status !== "ok");
        return sorted.filter((result) => result.status === filter);
      }
      function formatMedalResultLine(result) {
        const room = `${result.room.anchorName} / ${result.room.medalName}`;
        const header = `${medalStatusTitle(result.status)}｜${room}｜房间号：${result.room.roomId}｜检查时间：${formatCheckTime(result.checkedAt)}`;
        if (result.signals.length === 0) return `${header}
${result.note ?? "接口未发现禁言/封禁信号"}`;
        const details = result.signals.map(
          (signal) => `${signalKindLabel(signal.kind)}：${signal.message}；时长：${signal.duration}；来源：${signal.source}`
        ).join("\n");
        return `${header}
${details}`;
      }
      function medalFilterLabel(filter) {
        if (filter === "issues") return "异常";
        if (filter === "restricted") return "限制";
        if (filter === "unknown") return "未知";
        if (filter === "deactivated") return "主播注销";
        if (filter === "ok") return "正常";
        return "全部";
      }
      function formatMedalCheckReport(results, status, filter, uidLabel) {
        const counts = getMedalCheckCounts(results);
        const shown = getFilteredMedalResults(results, filter);
        return [
          "粉丝牌禁言巡检",
          `登录账号：${uidLabel}`,
          status,
          `统计：限制 ${counts.restricted}，未知 ${counts.unknown}，主播注销 ${counts.deactivated}，正常 ${counts.ok}`,
          `当前复制范围：${medalFilterLabel(filter)}（${shown.length} 条）`,
          "",
          ...shown.map(formatMedalResultLine)
        ].join("\n\n");
      }
      function normalizeGuardRoomEndpoint(endpoint) {
        return endpoint.trim().replace(/\/+$/, "");
      }
      function buildGuardRoomInspectionRun(results) {
        const checkedAtValues = results.map((result) => result.checkedAt);
        const startedAt = checkedAtValues.length > 0 ? Math.min(...checkedAtValues) : Date.now();
        const finishedAt = checkedAtValues.length > 0 ? Math.max(...checkedAtValues) : Date.now();
        return {
          runId: `chatterbox-${Date.now()}`,
          scriptVersion: VERSION,
          startedAt: new Date(startedAt).toISOString(),
          finishedAt: new Date(finishedAt).toISOString(),
          results: results.map((result) => ({
            roomId: result.room.roomId,
            anchorName: result.room.anchorName,
            anchorUid: result.room.anchorUid,
            medalName: result.room.medalName,
            status: result.status,
            signals: result.signals.map((signal) => ({
              kind: signal.kind,
              message: signal.message,
              duration: signal.duration,
              source: signal.source
            })),
            checkedAt: new Date(result.checkedAt).toISOString(),
            note: result.note
          }))
        };
      }
      function MedalCheckSection({ query = "" }) {
        const checkingMedalRooms = useSignal(false);
        const medalCheckCopyStatus = useSignal("");
        const guardRoomSyncing = useSignal(false);
        const guardRoomSyncStatus = useSignal("");
        const currentUid = useSignal(getDedeUid() ?? null);
        y$2(() => {
          const tick2 = () => {
            const next = getDedeUid() ?? null;
            if (currentUid.value !== next) currentUid.value = next;
          };
          tick2();
          const id = setInterval(tick2, 5e3);
          const onVisibility = () => {
            if (document.visibilityState === "visible") tick2();
          };
          document.addEventListener("visibilitychange", onVisibility);
          return () => {
            clearInterval(id);
            document.removeEventListener("visibilitychange", onVisibility);
          };
        }, []);
        const medalCheckStatus = useComputed(() => {
          const uid = currentUid.value;
          if (!uid) return NOT_LOGGED_IN_STATUS;
          return medalCheckStatusByUid.value[uid] ?? DEFAULT_STATUS;
        });
        const medalCheckResults = useComputed(() => {
          const uid = currentUid.value;
          if (!uid) return [];
          return medalCheckResultsByUid.value[uid] ?? [];
        });
        const medalCheckFilter = useComputed(() => {
          const uid = currentUid.value;
          if (!uid) return "issues";
          return medalCheckFilterByUid.value[uid] ?? "issues";
        });
        const writeFilter = (val) => {
          const uid = currentUid.value;
          if (!uid) return;
          medalCheckFilterByUid.value = { ...medalCheckFilterByUid.value, [uid]: val };
        };
        const visible = !query || "粉丝牌禁言巡检 禁言 粉丝牌 直播间 巡检 保安室 guard room 同步 账号 登录 uid".toLowerCase().includes(query);
        if (!visible) return null;
        const checkMedalRooms = async () => {
          const uid = currentUid.value;
          if (!uid) {
            appendLog("禁言巡检：未登录 Bilibili");
            return;
          }
          const writeStatus = (val) => {
            medalCheckStatusByUid.value = { ...medalCheckStatusByUid.value, [uid]: val };
          };
          const writeResults = (val) => {
            medalCheckResultsByUid.value = { ...medalCheckResultsByUid.value, [uid]: val };
          };
          checkingMedalRooms.value = true;
          writeResults([]);
          writeStatus("正在获取粉丝牌…");
          try {
            const rooms = await fetchMedalRooms();
            if (rooms.length === 0) {
              writeStatus("没有找到粉丝牌直播间");
              appendLog("禁言巡检：没有找到粉丝牌直播间");
              return;
            }
            appendLog(`禁言巡检：找到 ${rooms.length} 个粉丝牌直播间，开始检查（账号 UID ${uid}）`);
            const results = [];
            for (let i2 = 0; i2 < rooms.length; i2++) {
              const room = rooms[i2];
              writeStatus(`检查中 ${i2 + 1}/${rooms.length}：${room.anchorName}（${room.medalName}）`);
              const result = await checkMedalRoomRestriction(room);
              results.push(result);
              writeResults([...results]);
              const label = `${room.anchorName} / ${room.medalName} / ${room.roomId}`;
              if (result.status === "restricted") {
                const detail = result.signals.map((signal) => `${signalKindLabel(signal.kind)}：${signal.message}，时长：${signal.duration}`).join("；");
                appendLog(`禁言巡检：发现限制 - ${label}：${detail}`);
              } else if (result.status === "deactivated") {
                appendLog(`禁言巡检：主播已注销 - ${label}`);
              } else if (result.status === "unknown") {
                appendLog(`禁言巡检：无法确认 - ${label}：${result.note ?? "接口未返回明确结果"}`);
              } else {
                appendLog(`禁言巡检：正常 - ${label}`);
              }
              if (i2 < rooms.length - 1) await new Promise((r2) => setTimeout(r2, 500));
            }
            const counts = getMedalCheckCounts(results);
            writeStatus(
              `完成：${rooms.length} 个房间，${counts.restricted} 个限制，${counts.deactivated} 个主播注销，${counts.unknown} 个无法确认`
            );
            appendLog(
              `禁言巡检完成：${rooms.length} 个房间，${counts.restricted} 个限制，${counts.deactivated} 个主播注销，${counts.unknown} 个无法确认`
            );
            if (guardRoomSyncKey.value.trim()) await syncGuardRoomInspection(results);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            writeStatus(`检查失败：${msg}`);
            appendLog(`禁言巡检失败：${msg}`);
          } finally {
            checkingMedalRooms.value = false;
          }
        };
        const syncGuardRoomInspection = async (results = medalCheckResults.value) => {
          if (results.length === 0) {
            guardRoomSyncStatus.value = "还没有巡检结果";
            return;
          }
          const endpoint = normalizeGuardRoomEndpoint(guardRoomEndpoint.value);
          const syncKey = guardRoomSyncKey.value.trim();
          if (!endpoint || !syncKey) {
            guardRoomSyncStatus.value = "缺少保安室地址或同步密钥";
            return;
          }
          guardRoomSyncing.value = true;
          guardRoomSyncStatus.value = "同步中…";
          try {
            const response = await fetch(`${endpoint}/api/inspection-runs`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-sync-key": syncKey
              },
              body: JSON.stringify(buildGuardRoomInspectionRun(results))
            });
            const json = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(json.message ?? `HTTP ${response.status}`);
            guardRoomSyncStatus.value = "已同步到直播间保安室";
            appendLog("直播间保安室：巡检结果已同步");
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            guardRoomSyncStatus.value = `同步失败：${msg}。请检查保安室地址（必须是 https://）和同步密钥，或稍后重试。`;
            appendLog(`直播间保安室：同步失败：${msg}`);
          } finally {
            guardRoomSyncing.value = false;
          }
        };
        const uidLabelForReport = () => currentUid.value ?? "未登录";
        const copyMedalCheckResults = async () => {
          const results = medalCheckResults.value;
          if (results.length === 0) {
            medalCheckCopyStatus.value = "还没有巡检结果";
            return;
          }
          const ok = await copyTextToClipboard(
            formatMedalCheckReport(results, medalCheckStatus.value, medalCheckFilter.value, uidLabelForReport())
          );
          if (ok) {
            medalCheckCopyStatus.value = `已复制${medalFilterLabel(medalCheckFilter.value)}结果`;
            setTimeout(() => {
              medalCheckCopyStatus.value = "";
            }, 1800);
          } else {
            medalCheckCopyStatus.value = "复制失败，请检查浏览器剪贴板权限，或改用「下载报告」";
          }
        };
        const downloadMedalCheckResults = () => {
          const results = medalCheckResults.value;
          if (results.length === 0) {
            medalCheckCopyStatus.value = "还没有巡检结果";
            return;
          }
          const report = formatMedalCheckReport(results, medalCheckStatus.value, "all", uidLabelForReport());
          const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a2 = document.createElement("a");
          a2.href = url;
          a2.download = `禁言巡检_${( new Date()).toISOString().slice(0, 10)}.txt`;
          document.body.appendChild(a2);
          a2.click();
          document.body.removeChild(a2);
          URL.revokeObjectURL(url);
          medalCheckCopyStatus.value = "已下载报告";
          setTimeout(() => {
            medalCheckCopyStatus.value = "";
          }, 1800);
        };
        return u$2("details", { className: "cb-settings-accordion", open: true, children: [
u$2("summary", { children: "粉丝牌禁言巡检" }),
u$2(
            "div",
            {
              className: "cb-section cb-stack",
              style: { margin: ".5em 0", paddingBottom: "1em", borderBottom: "1px solid var(--Ga2, #eee)" },
              children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".5em" }, children: "粉丝牌禁言巡检" }),
u$2("div", { className: "cb-note", style: { marginBlock: ".5em", color: "#666" }, children: "只读取 B 站接口，不发送弹幕。结果会按限制、无法确认、主播注销、正常排序；上次巡检按账号分别保留。" }),
u$2(
                  "div",
                  {
                    className: "cb-note",
                    role: "status",
                    "aria-live": "polite",
                    style: {
                      marginBlock: ".25em",
                      padding: ".35em .55em",
                      borderRadius: "4px",
                      background: currentUid.value ? "rgba(10, 127, 85, .08)" : "rgba(161, 92, 0, .08)",
                      color: currentUid.value ? "#0a7f55" : "#a15c00"
                    },
                    children: currentUid.value ? `当前账号 UID：${currentUid.value}（巡检与缓存只针对该账号）` : "未登录 Bilibili — 请先登录后再执行巡检"
                  }
                ),
u$2("details", { className: "cb-panel cb-stack", style: { marginBottom: ".5em" }, children: [
u$2("summary", { style: { cursor: "pointer", userSelect: "none", fontWeight: "bold" }, className: "cb-heading", children: "直播间保安室同步（外部服务）" }),
u$2("div", { className: "cb-note", style: { color: "#666", marginTop: ".5em" }, children: [
                    "保安室是独立的开源项目，需要自行搭建或加入。同步会上传：房间号、主播昵称、粉丝牌、限制信号、脚本版本。",
u$2("strong", { children: "不会上传 cookie、csrf、localStorage 或完整接口数据。" }),
                    "填写密钥后，每次完成巡检会自动同步一次。"
                  ] }),
u$2("label", { htmlFor: "guardRoomEndpoint", className: "cb-note", style: { color: "#666" }, children: "保安室地址（必须是 https://，例外：localhost）" }),
u$2(
                    "input",
                    {
                      id: "guardRoomEndpoint",
                      type: "text",
                      placeholder: "https://bilibili-guard-room.vercel.app",
                      value: guardRoomEndpoint.value,
                      onInput: (e2) => {
                        guardRoomEndpoint.value = e2.currentTarget.value;
                      }
                    }
                  ),
u$2("label", { htmlFor: "guardRoomSyncKey", className: "cb-note", style: { color: "#666" }, children: "同步密钥（在保安室项目首页注册空间后获得，格式：spaceId@syncSecret）" }),
u$2(
                    "input",
                    {
                      id: "guardRoomSyncKey",
                      type: "text",
                      placeholder: "spaceId@syncSecret",
                      value: guardRoomSyncKey.value,
                      onInput: (e2) => {
                        guardRoomSyncKey.value = e2.currentTarget.value;
                      }
                    }
                  ),
u$2("div", { className: "cb-row", children: [
u$2(
                      "button",
                      {
                        type: "button",
                        disabled: guardRoomSyncing.value || medalCheckResults.value.length === 0,
                        title: medalCheckResults.value.length === 0 ? "需要先完成一次巡检" : void 0,
                        onClick: () => void syncGuardRoomInspection(),
                        children: guardRoomSyncing.value ? "同步中…" : "同步当前结果"
                      }
                    ),
                    guardRoomSyncStatus.value && u$2("span", { className: "cb-note", role: "status", "aria-live": "polite", children: guardRoomSyncStatus.value })
                  ] })
                ] }),
u$2("details", { className: "cb-panel cb-stack", style: { marginBottom: ".5em" }, children: [
u$2("summary", { style: { cursor: "pointer", userSelect: "none", fontWeight: "bold" }, className: "cb-heading", children: "高级：监控室代理（默认折叠）" }),
u$2("div", { className: "cb-note", style: { color: "#666", marginTop: ".5em" }, children: "连接到保安室网站后用于远程协调监控。普通用户通常不需要打开。" }),
u$2("div", { className: "cb-note", children: "监控、推荐、跳转和统一跟车配置现在都以网站为准。脚本这边只负责同步牌子房/关注房清单、拉取网站配置，并在当前直播页执行试运行。" }),
u$2("label", { className: "cb-note cb-switch-row", children: [
u$2(
                      "input",
                      {
                        type: "checkbox",
                        checked: guardRoomWebsiteControlEnabled.value,
                        onChange: (e2) => {
                          guardRoomWebsiteControlEnabled.value = e2.currentTarget.checked;
                        }
                      }
                    ),
u$2("span", { title: "开启后，连接的保安室网站可以远程下发预设和试运行开关；关闭后保留你的本地参数。", children: "允许直播间保安室远程下发自动跟车预设和试运行开关" })
                  ] }),
                  !guardRoomWebsiteControlEnabled.value && u$2("div", { className: "cb-note", children: "关闭时仍会同步监控状态，但不会把你的本地自定义参数改回 normal / 试运行。" }),
                  guardRoomHandoffActive.value && u$2("div", { className: "cb-note", children: "当前页是从监控室接管跳转进来的，本页仍会按监控室指令执行试运行/自动启动。" }),
u$2("div", { className: "cb-row", style: { display: "flex", gap: ".5em", alignItems: "center", flexWrap: "wrap" }, children: u$2("label", { className: "cb-note", style: { display: "inline-flex", alignItems: "center", gap: ".4em" }, children: [
                    "心跳间隔",
u$2(
                      "input",
                      {
                        type: "number",
                        min: "10",
                        max: "120",
                        value: guardRoomLiveDeskHeartbeatSec.value,
                        onInput: (e2) => {
                          const value = Number(e2.currentTarget.value);
                          guardRoomLiveDeskHeartbeatSec.value = Number.isFinite(value) ? Math.max(10, Math.min(120, value)) : 30;
                        },
                        style: { width: "64px" }
                      }
                    ),
                    "秒"
                  ] }) }),
u$2("div", { className: "cb-note", children: [
                    "连接状态（网站主控版）：",
                    guardRoomAgentConnected.value ? "已连接" : "未连接",
                    " ·",
                    " ",
                    guardRoomAgentStatusText.value
                  ] }),
u$2("div", { className: "cb-note", children: [
                    "当前会话：",
                    guardRoomLiveDeskSessionId.value || "暂无活动监控会话"
                  ] }),
u$2("div", { className: "cb-note", children: [
                    "最近同步：",
                    guardRoomAgentLastSyncAt.value ? new Date(guardRoomAgentLastSyncAt.value).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    }) : "暂无"
                  ] }),
u$2("div", { className: "cb-note", children: [
                    "当前监控清单：",
                    guardRoomAgentWatchlistCount.value,
                    " 间 · 开播 ",
                    guardRoomAgentLiveCount.value,
                    " 间"
                  ] }),
u$2("div", { className: "cb-note", children: [
                    "网站下发配置：",
                    guardRoomAppliedProfile.value ? `${guardRoomAppliedProfile.value.dryRunDefault ? "默认试运行" : "默认真发"} / ${guardRoomAppliedProfile.value.autoBlendEnabled ? "允许自动跟车" : "只观察"} / ${guardRoomAppliedProfile.value.conservativeMode} 档` : "尚未收到"
                  ] })
                ] }),
u$2(
                  "div",
                  {
                    className: "cb-row",
                    style: { display: "flex", gap: ".5em", alignItems: "center", flexWrap: "wrap", marginBottom: ".5em" },
                    children: [
u$2(
                        "button",
                        {
                          type: "button",
                          disabled: checkingMedalRooms.value || !currentUid.value,
                          title: !currentUid.value ? "需要先登录 Bilibili 账号" : void 0,
                          onClick: () => void checkMedalRooms(),
                          children: checkingMedalRooms.value ? "检查中…" : "检查粉丝牌禁言"
                        }
                      ),
u$2(
                        "button",
                        {
                          type: "button",
                          disabled: medalCheckResults.value.length === 0,
                          onClick: () => void copyMedalCheckResults(),
                          children: "复制巡检结果"
                        }
                      ),
u$2("button", { type: "button", disabled: medalCheckResults.value.length === 0, onClick: downloadMedalCheckResults, children: "下载报告" }),
u$2(
                        "span",
                        {
                          role: "status",
                          "aria-live": "polite",
                          style: { color: medalCheckStatus.value.includes("发现限制") ? "#a15c00" : "#666" },
                          children: medalCheckStatus.value
                        }
                      ),
                      medalCheckCopyStatus.value && u$2("span", { className: "cb-note", role: "status", "aria-live": "polite", children: medalCheckCopyStatus.value })
                    ]
                  }
                ),
                medalCheckResults.value.length > 0 && u$2("div", { className: "cb-stack", children: [
                  (() => {
                    const counts = getMedalCheckCounts(medalCheckResults.value);
                    const filter = medalCheckFilter.value;
                    const shownCount = getFilteredMedalResults(medalCheckResults.value, filter).length;
                    const filterButtonStyle = (active, color) => ({
                      minHeight: "24px",
                      padding: "2px 6px",
                      borderColor: active ? color : void 0,
                      background: active ? "rgba(0, 122, 255, .08)" : void 0,
                      color,
                      boxShadow: active ? "inset 0 0 0 1px currentColor" : void 0
                    });
                    return u$2("div", { className: "cb-panel", style: { display: "grid", gap: "6px" }, children: [
u$2("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px" }, children: [
u$2(
                          "button",
                          {
                            type: "button",
                            "aria-pressed": filter === "issues",
                            onClick: () => writeFilter("issues"),
                            style: filterButtonStyle(filter === "issues", "#a15c00"),
                            children: [
                              "异常 ",
                              counts.restricted + counts.unknown + counts.deactivated
                            ]
                          }
                        ),
u$2(
                          "button",
                          {
                            type: "button",
                            "aria-pressed": filter === "all",
                            onClick: () => writeFilter("all"),
                            style: filterButtonStyle(filter === "all"),
                            children: [
                              "全部 ",
                              medalCheckResults.value.length
                            ]
                          }
                        ),
u$2(
                          "button",
                          {
                            type: "button",
                            "aria-pressed": filter === "restricted",
                            onClick: () => writeFilter("restricted"),
                            style: filterButtonStyle(filter === "restricted", "#a15c00"),
                            children: [
                              "限制 ",
                              counts.restricted
                            ]
                          }
                        ),
u$2(
                          "button",
                          {
                            type: "button",
                            "aria-pressed": filter === "unknown",
                            onClick: () => writeFilter("unknown"),
                            style: filterButtonStyle(filter === "unknown", "#666"),
                            children: [
                              "未知 ",
                              counts.unknown
                            ]
                          }
                        ),
u$2(
                          "button",
                          {
                            type: "button",
                            "aria-pressed": filter === "deactivated",
                            onClick: () => writeFilter("deactivated"),
                            style: filterButtonStyle(filter === "deactivated", "#8e8e93"),
                            children: [
                              "注销 ",
                              counts.deactivated
                            ]
                          }
                        ),
u$2(
                          "button",
                          {
                            type: "button",
                            "aria-pressed": filter === "ok",
                            onClick: () => writeFilter("ok"),
                            style: filterButtonStyle(filter === "ok", "#0a7f55"),
                            children: [
                              "正常 ",
                              counts.ok
                            ]
                          }
                        )
                      ] }),
u$2("div", { className: "cb-note", children: [
                        "当前显示：",
                        medalFilterLabel(filter),
                        " ",
                        shownCount,
                        " / ",
                        medalCheckResults.value.length,
                        " 条"
                      ] })
                    ] });
                  })(),
u$2("div", { style: { maxHeight: "220px", overflowY: "auto", display: "grid", gap: ".35em" }, children: getFilteredMedalResults(medalCheckResults.value, medalCheckFilter.value).map((result) => {
                    const color = medalStatusColor(result.status);
                    const title = medalStatusTitle(result.status);
                    return u$2(
                      "div",
                      {
                        className: "cb-panel",
                        style: {
                          display: "grid",
                          gap: ".25em",
                          borderColor: result.status === "restricted" ? "#f0b35a" : void 0
                        },
                        children: [
u$2("div", { style: { display: "flex", justifyContent: "space-between", gap: ".5em" }, children: [
u$2("strong", { style: { wordBreak: "break-all" }, children: [
                              result.room.anchorName,
                              " / ",
                              result.room.medalName
                            ] }),
u$2("span", { style: { color, whiteSpace: "nowrap" }, children: title })
                          ] }),
u$2("div", { className: "cb-note", children: [
                            "房间号：",
                            result.room.roomId,
                            " · 检查时间：",
                            formatCheckTime(result.checkedAt)
                          ] }),
                          result.signals.length > 0 ? result.signals.map((signal, index) => u$2("div", { style: { color, wordBreak: "break-all", lineHeight: 1.5 }, children: [
                            signalKindLabel(signal.kind),
                            "：",
                            signal.message,
u$2("br", {}),
                            "时长：",
                            signal.duration,
                            " · 来源：",
                            signal.source
                          ] }, index)) : u$2("div", { className: "cb-note", children: result.note ?? "接口未发现禁言/封禁信号" })
                        ]
                      },
                      result.room.roomId
                    );
                  }) })
                ] })
              ]
            }
          )
        ] });
      }
      const REMOTE_KEYWORDS_MAX_GLOBAL = 1e3;
      const REMOTE_KEYWORDS_MAX_PER_ROOM = 500;
      const REMOTE_KEYWORDS_MAX_ROOMS = 200;
      const REMOTE_KEYWORDS_MAX_KEY_LEN = 200;
      const REMOTE_KEYWORDS_MAX_VALUE_LEN = 200;
      function sanitizeKeywordsRecord(input, maxEntries) {
        if (typeof input !== "object" || input === null || Array.isArray(input)) return {};
        const out = {};
        let count = 0;
        for (const [from, to] of Object.entries(input)) {
          if (count >= maxEntries) break;
          if (typeof from !== "string" || typeof to !== "string") continue;
          if (from.trim().length === 0 || from.length > REMOTE_KEYWORDS_MAX_KEY_LEN) continue;
          if (to.length > REMOTE_KEYWORDS_MAX_VALUE_LEN) continue;
          out[from] = to;
          count++;
        }
        return out;
      }
      function sanitizeRemoteKeywords(input) {
        if (typeof input !== "object" || input === null || Array.isArray(input)) return {};
        const obj = input;
        const result = {};
        const globalSection = obj.global;
        if (typeof globalSection === "object" && globalSection !== null && !Array.isArray(globalSection)) {
          result.global = {
            keywords: sanitizeKeywordsRecord(globalSection.keywords, REMOTE_KEYWORDS_MAX_GLOBAL)
          };
        }
        if (Array.isArray(obj.rooms)) {
          const rooms = [];
          for (const entry of obj.rooms) {
            if (rooms.length >= REMOTE_KEYWORDS_MAX_ROOMS) break;
            if (typeof entry !== "object" || entry === null) continue;
            const roomEntry = entry;
            const roomId = typeof roomEntry.room === "string" ? roomEntry.room : String(roomEntry.room ?? "");
            if (!roomId) continue;
            rooms.push({
              room: roomId,
              keywords: sanitizeKeywordsRecord(roomEntry.keywords, REMOTE_KEYWORDS_MAX_PER_ROOM)
            });
          }
          result.rooms = rooms;
        }
        return result;
      }
      async function fetchRemoteKeywords() {
        const response = await fetch(BASE_URL.REMOTE_KEYWORDS);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const raw = await response.json();
        return sanitizeRemoteKeywords(raw);
      }
      const SYNC_INTERVAL = 10 * 60 * 1e3;
      function ReplacementRuleList({
        rules,
        emptyText,
        onRemove
      }) {
        if (rules.length === 0) {
          return u$2("div", { className: "cb-empty", children: emptyText });
        }
        return u$2("div", { className: "cb-rule-list", children: rules.map((rule, i2) => u$2("div", { className: "cb-rule-item", children: [
u$2("div", { className: "cb-rule-pair", children: [
u$2("div", { children: [
u$2("div", { className: "cb-label", children: "替换前" }),
u$2("code", { children: rule.from || "(空)" })
            ] }),
u$2("div", { children: [
u$2("div", { className: "cb-label", children: "替换后" }),
u$2("code", { children: rule.to || "(空)" })
            ] })
          ] }),
u$2("button", { type: "button", className: "cb-rule-remove", onClick: () => onRemove(i2), "aria-label": "删除替换规则", children: "删除" })
        ] }, i2)) });
      }
      function ReplacementRuleForm({
        from,
        to,
        onFromChange,
        onToChange,
        onAdd,
        disabled
      }) {
        const handleKeyDown = (e2) => {
          if (e2.key === "Enter" && !e2.isComposing) {
            e2.preventDefault();
            onAdd();
          }
        };
        return u$2("div", { className: "cb-rule-form", children: [
u$2("label", { children: [
u$2("span", { className: "cb-label", children: "替换前" }),
u$2(
              "input",
              {
                placeholder: "会被屏蔽或想改写的原词",
                value: from,
                disabled,
                onInput: (e2) => onFromChange(e2.currentTarget.value),
                onKeyDown: handleKeyDown
              }
            )
          ] }),
u$2("label", { children: [
u$2("span", { className: "cb-label", children: "替换后" }),
u$2(
              "input",
              {
                placeholder: "实际发送的内容",
                value: to,
                disabled,
                onInput: (e2) => onToChange(e2.currentTarget.value),
                onKeyDown: handleKeyDown
              }
            )
          ] }),
u$2("button", { type: "button", disabled, onClick: onAdd, children: "添加规则" })
        ] });
      }
      function CloudReplacementSection({ query = "" }) {
        const syncStatus = useSignal("未同步");
        const syncStatusColor = useSignal("#666");
        const syncing = useSignal(false);
        const testingRemote = useSignal(false);
        const visible = !query || "云端规则替换 远程 规则 同步 替换".toLowerCase().includes(query);
        const updateRemoteStatus = () => {
          const rk = remoteKeywords.value;
          const ls = remoteKeywordsLastSync.value;
          if (!rk || !ls) {
            syncStatus.value = "未同步";
            syncStatusColor.value = "#666";
            return;
          }
          const rid = cachedRoomId.value;
          const globalCount = Object.keys(rk.global?.keywords ?? {}).length;
          let roomCount = 0;
          if (rid !== null) {
            const roomData = rk.rooms?.find((r2) => String(r2.room) === String(rid));
            roomCount = Object.keys(roomData?.keywords ?? {}).length;
          }
          const timeStr = new Date(ls).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
          });
          syncStatus.value = `最后同步: ${timeStr}，当前房间共 ${globalCount + roomCount} 条规则（全局 ${globalCount} + 当前房间 ${roomCount}）`;
          syncStatusColor.value = "#36a185";
        };
        const syncRemote = async () => {
          syncing.value = true;
          syncStatus.value = "正在同步…";
          syncStatusColor.value = "#666";
          try {
            const data = await fetchRemoteKeywords();
            remoteKeywords.value = data;
            remoteKeywordsLastSync.value = Date.now();
            buildReplacementMap();
            updateRemoteStatus();
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            syncStatus.value = `同步失败: ${msg}`;
            syncStatusColor.value = "#f44";
            appendLog(`❌ 云端替换规则同步失败: ${msg}`);
          } finally {
            syncing.value = false;
          }
        };
        const testKeywordPair = async (original, replaced, roomId, csrfToken) => {
          const originalResult = await sendDanmaku(original, roomId, csrfToken);
          let replacedResult = null;
          if (!originalResult.success) {
            await new Promise((r2) => setTimeout(r2, 2e3));
            replacedResult = await sendDanmaku(replaced, roomId, csrfToken);
          }
          return {
            originalBlocked: !originalResult.success,
            replacedBlocked: replacedResult ? !replacedResult.success : null,
            originalError: originalResult.error,
            replacedError: replacedResult?.error
          };
        };
        const logTestResult = (result, replacedKeyword) => {
          if (result.originalBlocked && isInfrastructureError(result.originalError)) {
            appendLog(`  ⛔ 测试出错（网络/CORS）：${result.originalError} — 跳过这条`);
            return 0;
          }
          if (result.originalBlocked) {
            appendLog(`  ✅ 原词被屏蔽 (错误: ${result.originalError})，测试替换词: ${replacedKeyword}`);
            if (result.replacedBlocked && isInfrastructureError(result.replacedError)) {
              appendLog(`  ⛔ 替换词测试出错（网络/CORS）：${result.replacedError}`);
            } else if (result.replacedBlocked) {
              appendLog(`  ❌ 替换词也被屏蔽 (错误: ${result.replacedError})`);
            } else {
              appendLog("  ✅ 替换词未被屏蔽");
            }
            return 1;
          }
          appendLog("  ⚠️ 原词未被屏蔽，请考虑提交贡献词条");
          return 0;
        };
        const testRemote = async () => {
          if (!confirm(
            "即将测试当前直播间的云端替换词，请避免在当前直播间正在直播时进行测试，否则可能会给主播造成困扰，是否继续？"
          ))
            return;
          testingRemote.value = true;
          try {
            const roomId = await ensureRoomId();
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
              appendLog("❌ 未找到登录信息，请先登录 Bilibili");
              return;
            }
            const rk = remoteKeywords.value;
            const globalKw = Object.entries(rk?.global?.keywords ?? {}).filter(([f2]) => f2).map(([from, to]) => ({ from, to }));
            const rid = cachedRoomId.value;
            const roomKw = rid !== null ? Object.entries(rk?.rooms?.find((r2) => String(r2.room) === String(rid))?.keywords ?? {}).filter(([f2]) => f2).map(([from, to]) => ({ from, to })) : [];
            const total = globalKw.length + roomKw.length;
            if (total === 0) {
              appendLog("⚠️ 没有云端替换词可供测试，请先同步云端规则");
              return;
            }
            appendLog(`🔵 开始测试云端替换词 ${total} 个（全局 ${globalKw.length} + 房间 ${roomKw.length}）`);
            let tested = 0;
            let totalBlocked = 0;
            if (globalKw.length > 0) {
              appendLog(`
📡 测试云端全局替换词 (${globalKw.length} 个)`);
              let blockedCount = 0;
              for (const { from, to } of globalKw) {
                tested++;
                appendLog(`[${tested}/${total}] 测试: ${from}`);
                const result = await testKeywordPair(from, to, roomId, csrfToken);
                const b2 = logTestResult(result, to);
                blockedCount += b2;
                totalBlocked += b2;
                if (tested < total) await new Promise((r2) => setTimeout(r2, 2e3));
              }
              appendLog(`📡 全局替换词测试完成：${blockedCount}/${globalKw.length} 个原词被屏蔽`);
            }
            if (roomKw.length > 0) {
              appendLog(`
🏠 测试云端房间专属替换词 (${roomKw.length} 个)`);
              let blockedCount = 0;
              for (const { from, to } of roomKw) {
                tested++;
                appendLog(`[${tested}/${total}] 测试: ${from}`);
                const result = await testKeywordPair(from, to, roomId, csrfToken);
                const b2 = logTestResult(result, to);
                blockedCount += b2;
                totalBlocked += b2;
                if (tested < total) await new Promise((r2) => setTimeout(r2, 2e3));
              }
              appendLog(`🏠 房间专属替换词测试完成：${blockedCount}/${roomKw.length} 个原词被屏蔽`);
            }
            appendLog(`
🔵 云端测试完成！共测试 ${total} 个词，其中 ${totalBlocked} 个原词被屏蔽`);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            appendLog(`🔴 测试出错：${msg}`);
          } finally {
            testingRemote.value = false;
          }
        };
        const didInit = A(false);
        y$2(() => {
          if (didInit.current) return;
          didInit.current = true;
          const ls = remoteKeywordsLastSync.value;
          if (!ls || Date.now() - ls > SYNC_INTERVAL) {
            void syncRemote();
          } else {
            updateRemoteStatus();
          }
          const timer2 = setInterval(() => void syncRemote(), SYNC_INTERVAL);
          return () => clearInterval(timer2);
        }, []);
        if (!visible) return null;
        return u$2("details", { className: "cb-settings-accordion", open: true, children: [
u$2("summary", { children: "云端规则替换" }),
u$2(
            "div",
            {
              className: "cb-section cb-stack",
              style: { margin: ".5em 0", paddingBottom: "1em", borderBottom: "1px solid var(--Ga2, #eee)" },
              children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".5em" }, children: [
                  "云端规则替换",
                  " ",
u$2(
                    "a",
                    {
                      href: "https://github.com/laplace-live/public/blob/master/artifacts/livesrtream-keywords.json",
                      target: "_blank",
                      style: { color: "#288bb8", textDecoration: "none" },
                      rel: "noopener",
                      children: "我要贡献规则"
                    }
                  )
                ] }),
u$2("div", { className: "cb-note", style: { marginBlock: ".5em", color: "#666" }, children: "云端规则由社区维护，每 10 分钟会自动从 workers.vrp.moe 同步一次。" }),
u$2("div", { className: "cb-note", style: { marginBlock: ".25em", color: "#666", fontSize: "0.85em" }, children: "应用顺序（从高到低）：当前直播间规则 → 本地全局规则 → 云端规则 → 原文。" }),
u$2(
                  "div",
                  {
                    className: "cb-row",
                    style: { display: "flex", gap: ".5em", alignItems: "center", flexWrap: "wrap", marginBottom: ".5em" },
                    children: [
u$2("button", { type: "button", disabled: syncing.value, onClick: () => void syncRemote(), children: syncing.value ? "同步中…" : "同步" }),
u$2("button", { type: "button", disabled: testingRemote.value, onClick: () => void testRemote(), children: testingRemote.value ? "测试中…" : "测试云端词库" }),
u$2("span", { style: { color: syncStatusColor.value }, children: syncStatus.value })
                    ]
                  }
                )
              ]
            }
          )
        ] });
      }
      function LocalGlobalReplacementSection({ query = "" }) {
        const testingLocal = useSignal(false);
        const globalReplaceFrom = useSignal("");
        const globalReplaceTo = useSignal("");
        const visible = !query || "本地全局规则 替换 规则".toLowerCase().includes(query);
        const testKeywordPair = async (original, replaced, roomId, csrfToken) => {
          const originalResult = await sendDanmaku(original, roomId, csrfToken);
          let replacedResult = null;
          if (!originalResult.success) {
            await new Promise((r2) => setTimeout(r2, 2e3));
            replacedResult = await sendDanmaku(replaced, roomId, csrfToken);
          }
          return {
            originalBlocked: !originalResult.success,
            replacedBlocked: replacedResult ? !replacedResult.success : null,
            originalError: originalResult.error,
            replacedError: replacedResult?.error
          };
        };
        const logTestResult = (result, replacedKeyword) => {
          if (result.originalBlocked && isInfrastructureError(result.originalError)) {
            appendLog(`  ⛔ 测试出错（网络/CORS）：${result.originalError} — 跳过这条`);
            return 0;
          }
          if (result.originalBlocked) {
            appendLog(`  ✅ 原词被屏蔽 (错误: ${result.originalError})，测试替换词: ${replacedKeyword}`);
            if (result.replacedBlocked && isInfrastructureError(result.replacedError)) {
              appendLog(`  ⛔ 替换词测试出错（网络/CORS）：${result.replacedError}`);
            } else if (result.replacedBlocked) {
              appendLog(`  ❌ 替换词也被屏蔽 (错误: ${result.replacedError})`);
            } else {
              appendLog("  ✅ 替换词未被屏蔽");
            }
            return 1;
          }
          appendLog("  ⚠️ 原词未被屏蔽，请考虑提交贡献词条");
          return 0;
        };
        const testLocal = async () => {
          if (!confirm("即将测试本地替换词，请避免在当前直播间正在直播时进行测试，否则可能会给主播造成困扰，是否继续？"))
            return;
          testingLocal.value = true;
          try {
            const roomId = await ensureRoomId();
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
              appendLog("❌ 未找到登录信息，请先登录 Bilibili");
              return;
            }
            const globalRules2 = localGlobalRules.value.filter((r2) => r2.from);
            const rid = cachedRoomId.value;
            const roomRules = rid !== null ? (localRoomRules.value[String(rid)] ?? []).filter((r2) => r2.from) : [];
            const total = globalRules2.length + roomRules.length;
            if (total === 0) {
              appendLog("⚠️ 没有本地替换词可供测试，请先添加本地替换规则");
              return;
            }
            appendLog(`🔵 开始测试本地替换词 ${total} 个（全局 ${globalRules2.length} + 当前房间 ${roomRules.length}）`);
            let tested = 0;
            let totalBlocked = 0;
            if (globalRules2.length > 0) {
              appendLog(`
📋 测试本地全局替换词 (${globalRules2.length} 个)`);
              let blockedCount = 0;
              for (const rule of globalRules2) {
                tested++;
                appendLog(`[${tested}/${total}] 测试: ${rule.from}`);
                const result = await testKeywordPair(rule.from ?? "", rule.to ?? "", roomId, csrfToken);
                const b2 = logTestResult(result, rule.to ?? "");
                blockedCount += b2;
                totalBlocked += b2;
                if (tested < total) await new Promise((r2) => setTimeout(r2, 2e3));
              }
              appendLog(`📋 本地全局替换词测试完成：${blockedCount}/${globalRules2.length} 个原词被屏蔽`);
            }
            if (roomRules.length > 0) {
              appendLog(`
🏠 测试本地房间替换词 (${roomRules.length} 个)`);
              let blockedCount = 0;
              for (const rule of roomRules) {
                tested++;
                appendLog(`[${tested}/${total}] 测试: ${rule.from}`);
                const result = await testKeywordPair(rule.from ?? "", rule.to ?? "", roomId, csrfToken);
                const b2 = logTestResult(result, rule.to ?? "");
                blockedCount += b2;
                totalBlocked += b2;
                if (tested < total) await new Promise((r2) => setTimeout(r2, 2e3));
              }
              appendLog(`🏠 本地房间替换词测试完成：${blockedCount}/${roomRules.length} 个原词被屏蔽`);
            }
            appendLog(`
🔵 本地测试完成！共测试 ${total} 个词，其中 ${totalBlocked} 个原词被屏蔽`);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            appendLog(`🔴 测试出错：${msg}`);
          } finally {
            testingLocal.value = false;
          }
        };
        const addGlobalRule = () => {
          if (!globalReplaceFrom.value) {
            appendLog("⚠️ 替换前的内容不能为空");
            return;
          }
          localGlobalRules.value = [...localGlobalRules.value, { from: globalReplaceFrom.value, to: globalReplaceTo.value }];
          buildReplacementMap();
          globalReplaceFrom.value = "";
          globalReplaceTo.value = "";
        };
        const removeGlobalRule = (index) => {
          const next = [...localGlobalRules.value];
          next.splice(index, 1);
          localGlobalRules.value = next;
          buildReplacementMap();
        };
        if (!visible) return null;
        const globalRules = localGlobalRules.value;
        return u$2("details", { className: "cb-settings-accordion", open: true, children: [
u$2("summary", { children: "本地全局规则" }),
u$2(
            "div",
            {
              className: "cb-section cb-stack",
              style: { margin: ".5em 0", paddingBottom: "1em", borderBottom: "1px solid var(--Ga2, #eee)" },
              children: [
u$2(
                  "div",
                  {
                    className: "cb-row",
                    style: { display: "flex", gap: ".5em", alignItems: "center", flexWrap: "wrap", marginBottom: ".5em" },
                    children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold" }, children: "本地全局规则" }),
u$2("button", { type: "button", disabled: testingLocal.value, onClick: () => void testLocal(), children: testingLocal.value ? "测试中…" : "测试本地词库" })
                    ]
                  }
                ),
u$2("div", { className: "cb-note", style: { marginBlock: ".5em", color: "#666" }, children: "适用于所有直播间，优先级高于云端规则" }),
u$2(
                  ReplacementRuleList,
                  {
                    rules: globalRules,
                    emptyText: "暂无全局替换规则，请在下方添加",
                    onRemove: removeGlobalRule
                  }
                ),
u$2(
                  ReplacementRuleForm,
                  {
                    from: globalReplaceFrom.value,
                    to: globalReplaceTo.value,
                    onFromChange: (value) => {
                      globalReplaceFrom.value = value;
                    },
                    onToChange: (value) => {
                      globalReplaceTo.value = value;
                    },
                    onAdd: addGlobalRule
                  }
                )
              ]
            }
          )
        ] });
      }
      function LocalRoomReplacementSection({ query = "" }) {
        const roomReplaceFrom = useSignal("");
        const roomReplaceTo = useSignal("");
        const editingRoomId = useSignal(cachedRoomId.value !== null ? String(cachedRoomId.value) : "");
        const newRoomId = useSignal("");
        const visible = !query || "本地直播间规则 房间 规则 替换".toLowerCase().includes(query);
        y$2(() => {
          if (editingRoomId.value) return;
          const rid = cachedRoomId.value;
          if (rid !== null) {
            editingRoomId.value = String(rid);
          }
        }, [editingRoomId.value, cachedRoomId.value]);
        const addRoomRule = () => {
          const rid = editingRoomId.value;
          if (!rid) {
            appendLog("⚠️ 请先选择一个直播间");
            return;
          }
          if (!roomReplaceFrom.value) {
            appendLog("⚠️ 替换前的内容不能为空");
            return;
          }
          const all = { ...localRoomRules.value };
          const existing = all[rid] ?? [];
          all[rid] = [...existing, { from: roomReplaceFrom.value, to: roomReplaceTo.value }];
          localRoomRules.value = all;
          buildReplacementMap();
          roomReplaceFrom.value = "";
          roomReplaceTo.value = "";
        };
        const removeRoomRule = (index) => {
          const rid = editingRoomId.value;
          if (!rid) return;
          const all = { ...localRoomRules.value };
          const existing = [...all[rid] ?? []];
          existing.splice(index, 1);
          if (existing.length === 0) {
            delete all[rid];
          } else {
            all[rid] = existing;
          }
          localRoomRules.value = all;
          buildReplacementMap();
        };
        const addRoom = () => {
          const rid = newRoomId.value.trim();
          if (!rid) return;
          const knownRoomIds2 = Object.keys(localRoomRules.value);
          if (knownRoomIds2.includes(rid)) {
            editingRoomId.value = rid;
            newRoomId.value = "";
            return;
          }
          const all = { ...localRoomRules.value };
          all[rid] = all[rid] ?? [];
          localRoomRules.value = all;
          editingRoomId.value = rid;
          newRoomId.value = "";
        };
        const deleteRoom = (rid) => {
          const all = { ...localRoomRules.value };
          delete all[rid];
          localRoomRules.value = all;
          if (editingRoomId.value === rid) {
            editingRoomId.value = cachedRoomId.value !== null ? String(cachedRoomId.value) : "";
          }
          buildReplacementMap();
        };
        if (!visible) return null;
        const knownRoomIds = Object.keys(localRoomRules.value);
        const currentRoomStr = cachedRoomId.value !== null ? String(cachedRoomId.value) : null;
        if (currentRoomStr && !knownRoomIds.includes(currentRoomStr)) {
          knownRoomIds.unshift(currentRoomStr);
        }
        const editingRules = editingRoomId.value ? localRoomRules.value[editingRoomId.value] ?? [] : [];
        return u$2("details", { className: "cb-settings-accordion", children: [
u$2("summary", { children: "本地直播间规则" }),
u$2(
            "div",
            {
              className: "cb-section cb-stack",
              style: { margin: ".5em 0", paddingBottom: "1em", borderBottom: "1px solid var(--Ga2, #eee)" },
              children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".5em" }, children: "本地直播间规则" }),
u$2("div", { className: "cb-note", style: { marginBlock: ".5em", color: "#666" }, children: "仅在对应直播间生效；优先级高于全局规则" }),
u$2("div", { className: "cb-rule-room-form", children: [
u$2("label", { children: [
u$2("span", { className: "cb-label", children: "正在编辑" }),
u$2(
                      "select",
                      {
                        value: editingRoomId.value,
                        onChange: (e2) => {
                          editingRoomId.value = e2.currentTarget.value;
                        },
                        children: [
u$2("option", { value: "", disabled: true, children: "选择直播间" }),
                          knownRoomIds.map((rid) => u$2("option", { value: rid, children: [
                            rid,
                            rid === currentRoomStr ? " (当前)" : ""
                          ] }, rid))
                        ]
                      }
                    )
                  ] }),
u$2("label", { children: [
u$2("span", { className: "cb-label", children: "添加房间号" }),
u$2(
                      "input",
                      {
                        placeholder: "输入房间号",
                        value: newRoomId.value,
                        onInput: (e2) => {
                          newRoomId.value = e2.currentTarget.value.replace(/\D/g, "");
                        },
                        onKeyDown: (e2) => {
                          if (e2.key === "Enter" && !e2.isComposing) {
                            e2.preventDefault();
                            addRoom();
                          }
                        }
                      }
                    )
                  ] }),
u$2("div", { className: "cb-rule-room-actions", children: [
u$2("button", { type: "button", onClick: addRoom, children: "添加房间" }),
                    editingRoomId.value && editingRoomId.value !== currentRoomStr && u$2("button", { type: "button", className: "cb-rule-remove", onClick: () => deleteRoom(editingRoomId.value), children: "删除此房间" })
                  ] })
                ] }),
                editingRoomId.value ? u$2(S$1, { children: [
u$2(
                    ReplacementRuleList,
                    {
                      rules: editingRules,
                      emptyText: "暂无此房间的替换规则，请在下方添加",
                      onRemove: removeRoomRule
                    }
                  ),
u$2(
                    ReplacementRuleForm,
                    {
                      from: roomReplaceFrom.value,
                      to: roomReplaceTo.value,
                      onFromChange: (value) => {
                        roomReplaceFrom.value = value;
                      },
                      onToChange: (value) => {
                        roomReplaceTo.value = value;
                      },
                      onAdd: addRoomRule
                    }
                  )
                ] }) : u$2("div", { className: "cb-empty", style: { color: "#999" }, children: "请选择或添加一个直播间" })
              ]
            }
          )
        ] });
      }
      const SECTION_KEYWORDS = "影子屏蔽 屏蔽观察 自动学习 shadow ban 改写 候选";
      function formatRelative(ts) {
        const diff = Date.now() - ts;
        if (diff < 6e4) return "刚刚";
        if (diff < 36e5) return `${Math.floor(diff / 6e4)} 分钟前`;
        if (diff < 864e5) return `${Math.floor(diff / 36e5)} 小时前`;
        return `${Math.floor(diff / 864e5)} 天前`;
      }
      function CandidateRow$1({ candidate }) {
        return u$2(
          "div",
          {
            className: "cb-row",
            style: {
              display: "flex",
              gap: ".4em",
              alignItems: "baseline",
              flexWrap: "wrap",
              padding: ".15em 0"
            },
            children: [
u$2("span", { style: { color: "#888", fontSize: "0.85em", minWidth: "4.5em" }, children: candidate.label }),
u$2(
                "code",
                {
                  style: {
                    flex: 1,
                    minWidth: 0,
                    overflowWrap: "anywhere",
                    background: "var(--Ga0, #f5f5f5)",
                    padding: ".1em .3em",
                    borderRadius: ".2em"
                  },
                  children: candidate.text
                }
              ),
u$2(
                "button",
                {
                  type: "button",
                  style: { fontSize: "0.85em" },
                  onClick: async () => {
                    const ok = await copyText(candidate.text);
                    appendLog(ok ? `📋 已复制（${candidate.label}）` : `⚠️ 复制失败（${candidate.label}）`);
                  },
                  children: "复制"
                }
              ),
u$2(
                "button",
                {
                  type: "button",
                  style: { fontSize: "0.85em" },
                  title: "填入弹幕输入框，但不会自动发送 — 你确认无误后再按发送/回车",
                  onClick: () => {
                    const target = fillIntoComposer(candidate.text);
                    const where = target === "custom-chat" ? "Chatterbox 输入框" : target === "native" ? "B站原生输入框" : "发送 Tab";
                    appendLog(`📝 已填入${where}（${candidate.label}），请检查后再发送`);
                  },
                  children: "填入输入框"
                }
              )
            ]
          }
        );
      }
      function ShadowObservationSection({ query = "" }) {
        const visible = !query || SECTION_KEYWORDS.toLowerCase().includes(query);
        const replaceTo = useSignal({});
        if (!visible) return null;
        const sorted = [...shadowBanObservations.value].sort((a2, b2) => b2.count - a2.count || b2.ts - a2.ts);
        const top = sorted.slice(0, 50);
        const keyOf = (text, roomId) => `${roomId ?? "global"}\0${text}`;
        return u$2("details", { className: "cb-settings-accordion", children: [
u$2("summary", { children: "影子屏蔽观察 / 自动学习" }),
u$2(
            "div",
            {
              className: "cb-section cb-stack",
              style: { margin: ".5em 0", paddingBottom: "1em", borderBottom: "1px solid var(--Ga2, #eee)" },
              children: [
u$2("div", { className: "cb-row", style: { flexWrap: "wrap", gap: ".4em", alignItems: "baseline" }, children: [
u$2("span", { className: "cb-label", children: "检测到影子封禁后：" }),
u$2("label", { children: [
u$2(
                      "input",
                      {
                        type: "radio",
                        name: "shadowBanMode",
                        value: "suggest",
                        checked: shadowBanMode.value === "suggest",
                        onInput: () => {
                          shadowBanMode.value = "suggest";
                        }
                      }
                    ),
                    " ",
                    "只给候选改写（推荐）"
                  ] }),
u$2("label", { children: [
u$2(
                      "input",
                      {
                        type: "radio",
                        name: "shadowBanMode",
                        value: "auto-resend",
                        checked: shadowBanMode.value === "auto-resend",
                        onInput: () => {
                          shadowBanMode.value = "auto-resend";
                        }
                      }
                    ),
                    " ",
                    "自动 AI 改写并重发"
                  ] })
                ] }),
u$2("div", { className: "cb-note", style: { color: "#666", fontSize: "0.85em", paddingLeft: "1.4em" }, children: "「只给候选」模式下脚本不会自动再发任何消息，只是把改写候选列在日志和下方观察列表里，由你决定是否复制/填入输入框。 「自动重发」模式需要同时打开「AI 规避」开关，会把 AI 改写后的弹幕自动重发并写入本地房间规则。" }),
u$2("div", { className: "cb-row", style: { marginTop: ".4em" }, children: [
u$2(
                    "input",
                    {
                      id: "autoLearnShadowRules",
                      type: "checkbox",
                      checked: autoLearnShadowRules.value,
                      onInput: (e2) => {
                        autoLearnShadowRules.value = e2.currentTarget.checked;
                      }
                    }
                  ),
u$2(
                    "label",
                    {
                      for: "autoLearnShadowRules",
                      title: "仅在「自动重发」模式下生效：AI 改写成功后把（敏感词→改写后）写入当前房间的本地替换规则。",
                      children: "自动学习屏蔽词（仅自动重发模式生效，写入本地房间规则）"
                    }
                  )
                ] }),
u$2("div", { className: "cb-note", style: { color: "#666", fontSize: "0.85em", paddingLeft: "1.4em" }, children: "学到的规则保存为本地房间规则，下次发送同样文本会先走替换。如果配置了 Guard Room，每条新规则会上报到云端供跨设备同步。" }),
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginTop: ".6em" }, children: [
                  "影子封禁观察列表",
u$2("span", { style: { color: "#999", fontWeight: "normal", marginLeft: ".4em" }, children: [
                    "(共 ",
                    shadowBanObservations.value.length,
                    " 条，显示前 50)"
                  ] }),
                  top.length > 0 && u$2(
                    "button",
                    {
                      type: "button",
                      className: "cb-button-text",
                      style: { float: "right", fontSize: "0.85em" },
                      onClick: () => {
                        if (!confirm("确定清空所有影子封禁观察记录吗？")) return;
                        clearShadowBanObservations();
                        appendLog("🧹 已清空影子封禁观察列表");
                      },
                      children: "全部清空"
                    }
                  )
                ] }),
                top.length === 0 ? u$2("div", { className: "cb-empty", style: { color: "#999" }, children: "暂无观察记录。被影子封禁的弹幕会出现在这里，附带候选改写以供你复制或填入输入框。" }) : u$2("div", { className: "cb-rule-list", children: top.map((obs) => {
                  const k2 = keyOf(obs.text, obs.roomId);
                  const editing = replaceTo.value[k2];
                  const showInput = typeof editing === "string";
                  const candidates = obs.candidates ?? [];
                  return u$2(
                    "div",
                    {
                      className: "cb-rule-item",
                      style: { flexDirection: "column", alignItems: "stretch", gap: ".35em" },
                      children: [
u$2("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline" }, children: [
u$2("code", { style: { fontSize: "0.95em" }, children: obs.text }),
u$2("span", { style: { color: "#999", fontSize: "0.85em" }, children: [
                            "×",
                            obs.count,
                            obs.roomId !== void 0 && u$2(S$1, { children: [
                              " · 房间 ",
                              obs.roomId
                            ] }),
                            " · ",
                            formatRelative(obs.ts),
                            obs.evadedAlready && u$2(S$1, { children: " · AI改写后仍未广播" })
                          ] })
                        ] }),
                        candidates.length > 0 && u$2("div", { className: "cb-stack", style: { paddingLeft: ".5em", borderLeft: "2px solid var(--Ga2, #ddd)" }, children: [
u$2("div", { style: { color: "#888", fontSize: "0.8em" }, children: "候选改写（不自动发送）" }),
                          candidates.map((c2) => u$2(CandidateRow$1, { candidate: c2 }, `${k2}|${c2.strategy}`))
                        ] }),
                        showInput && u$2("div", { className: "cb-row", style: { gap: ".4em", alignItems: "center" }, children: [
u$2("span", { className: "cb-label", style: { color: "#999", fontSize: "0.85em" }, children: "改成" }),
u$2(
                            "input",
                            {
                              type: "text",
                              style: { flex: 1 },
                              value: editing,
                              placeholder: "留空 = 用隐形字符变体",
                              onInput: (e2) => {
                                replaceTo.value = { ...replaceTo.value, [k2]: e2.currentTarget.value };
                              }
                            }
                          ),
u$2(
                            "button",
                            {
                              type: "button",
                              onClick: () => {
                                const target = (replaceTo.value[k2] ?? "").trim() || processText(obs.text);
                                if (obs.roomId === void 0) {
                                  appendLog("⚠️ 该条观察记录没有房间 id，无法转为本地房间规则");
                                  return;
                                }
                                const ok = promoteObservationToRule(obs, target);
                                if (ok) {
                                  appendLog(`📚 已加为房间 ${obs.roomId} 的本地规则：${obs.text} → ${target}`);
                                  const { [k2]: _drop, ...rest } = replaceTo.value;
                                  replaceTo.value = rest;
                                } else {
                                  appendLog("⚠️ 添加规则失败（可能已存在同 from 的规则，或 from===to）");
                                }
                              },
                              children: "确认"
                            }
                          ),
u$2(
                            "button",
                            {
                              type: "button",
                              onClick: () => {
                                const { [k2]: _drop, ...rest } = replaceTo.value;
                                replaceTo.value = rest;
                              },
                              children: "取消"
                            }
                          )
                        ] }),
                        !showInput && u$2("div", { className: "cb-row", style: { gap: ".4em" }, children: [
u$2(
                            "button",
                            {
                              type: "button",
                              disabled: obs.roomId === void 0,
                              title: obs.roomId === void 0 ? "没有房间 id 信息，无法加为房间规则" : "",
                              onClick: () => {
                                replaceTo.value = { ...replaceTo.value, [k2]: processText(obs.text) };
                              },
                              children: "加为本地规则"
                            }
                          ),
u$2("button", { type: "button", onClick: () => removeShadowBanObservation(obs.text, obs.roomId), children: "删除" })
                        ] })
                      ]
                    },
                    k2
                  );
                }) })
              ]
            }
          )
        ] });
      }
      function GroupHeading({ children, query }) {
        if (query) return null;
        return u$2(
          "div",
          {
            className: "cb-group-heading",
            style: {
              margin: "1em 0 .25em",
              fontSize: "0.75em",
              fontWeight: "bold",
              color: "#999",
              letterSpacing: "0.04em",
              textTransform: "uppercase"
            },
            children
          }
        );
      }
      function SettingsTab() {
        const settingsSearch = useSignal("");
        const query = settingsSearch.value.trim().toLowerCase();
        return u$2(S$1, { children: [
u$2("div", { className: "cb-section cb-stack", style: { margin: ".5em 0", gap: ".35em" }, children: [
u$2("label", { htmlFor: "settingsSearch", className: "cb-label", children: "搜索设置" }),
u$2(
              "input",
              {
                id: "settingsSearch",
                type: "search",
                value: settingsSearch.value,
                placeholder: "输入关键词，例如：表情、保安室、CSS、备份",
                style: { width: "100%" },
                onInput: (e2) => {
                  settingsSearch.value = e2.currentTarget.value;
                }
              }
            )
          ] }),
u$2(GroupHeading, { query, children: "常用" }),
u$2(CustomChatSection, { query }),
u$2(DanmakuDirectSection, { query }),
u$2(LayoutSection, { query }),
          (!query || "表情 emote emoji ID 复制".toLowerCase().includes(query)) && u$2("details", { className: "cb-settings-accordion", open: true, children: [
u$2("summary", { children: "表情" }),
u$2(
              "div",
              {
                className: "cb-section cb-stack",
                style: { margin: ".5em 0", paddingBottom: "1em", borderBottom: "1px solid var(--Ga2, #eee)" },
                children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".5em" }, children: "表情（复制后可在独轮车或常规发送中直接发送）" }),
u$2("div", { style: { maxHeight: "200px", overflowY: "auto" }, children: u$2(EmoteIds, {}) })
                ]
              }
            )
          ] }),
u$2(GroupHeading, { query, children: "替换规则" }),
u$2(CloudReplacementSection, { query }),
u$2(LocalGlobalReplacementSection, { query }),
u$2(LocalRoomReplacementSection, { query }),
u$2(ShadowObservationSection, { query }),
u$2(GroupHeading, { query, children: "工具" }),
u$2(MedalCheckSection, { query }),
u$2(CbBackendSection, { query }),
u$2(BackupSection, { query }),
u$2(GroupHeading, { query, children: "系统" }),
          (!query || "日志设置 日志 行数 调试 debug".toLowerCase().includes(query)) && u$2("details", { className: "cb-settings-accordion", children: [
u$2("summary", { children: "日志设置" }),
u$2("div", { className: "cb-section cb-stack", style: { margin: ".5em 0", paddingBottom: "1em" }, children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".5em" }, children: "日志设置" }),
u$2("div", { className: "cb-row", style: { display: "flex", gap: ".5em", alignItems: "center", flexWrap: "wrap" }, children: [
u$2("label", { htmlFor: "maxLogLines", style: { color: "#666" }, children: "最大日志行数:" }),
u$2(
                  "input",
                  {
                    id: "maxLogLines",
                    type: "number",
                    min: "1",
                    max: "1000",
                    style: { width: "80px" },
                    value: maxLogLines.value,
                    onChange: (e2) => {
                      let v2 = parseInt(e2.currentTarget.value, 10);
                      if (Number.isNaN(v2) || v2 < 1) v2 = 1;
                      else if (v2 > 1e3) v2 = 1e3;
                      maxLogLines.value = v2;
                    }
                  }
                ),
u$2("span", { style: { color: "#999", fontSize: "0.9em" }, children: "(1-1000)" })
              ] }),
u$2("span", { className: "cb-switch-row", style: { display: "inline-flex", alignItems: "center", gap: ".4em" }, children: [
u$2(
                  "input",
                  {
                    id: "debugLogVisible",
                    type: "checkbox",
                    checked: debugLogVisible.value,
                    onInput: (e2) => {
                      debugLogVisible.value = e2.currentTarget.checked;
                    }
                  }
                ),
u$2(
                  "label",
                  {
                    htmlFor: "debugLogVisible",
                    title: "打开后内部诊断日志会带上 🔍 前缀，便于打包成完整日志反馈给维护者。正常使用不需要打开。",
                    children: "调试模式（在日志中标注内部诊断行）"
                  }
                )
              ] }),
u$2("div", { className: "cb-note", style: { color: "#666" }, children: "收到「请发完整日志」类的反馈请求时打开此开关，再复制日志面板内容提交。" })
            ] })
          ] })
        ] });
      }
      const SONIOX_FLUSH_DELAY_MS = 5e3;
      function SttTab() {
        const apiKeyVisible = useSignal(false);
        const state = useSignal("stopped");
        const statusText = useSignal("未启动");
        const statusColor = useSignal("#666");
        const finalText = useSignal("");
        const nonFinalText = useSignal("");
        const clientRef = A(null);
        const accFinal = A("");
        const accTranslated = A("");
        const sendBuffer = A("");
        const flushTimeout = A(null);
        const isFlushing = A(false);
        const resetState = (nextStatusText = "未启动", nextStatusColor = "#666") => {
          state.value = "stopped";
          sttRunning.value = false;
          statusText.value = nextStatusText;
          statusColor.value = nextStatusColor;
          clientRef.current = null;
          sendBuffer.current = "";
          isFlushing.current = false;
          accFinal.current = "";
          accTranslated.current = "";
          finalText.value = "";
          nonFinalText.value = "";
          if (flushTimeout.current) {
            clearTimeout(flushTimeout.current);
            flushTimeout.current = null;
          }
        };
        const sendSegment = async (segment) => {
          if (!segment.trim()) return;
          try {
            const roomId = await ensureRoomId();
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
              appendLog(`❌ 同传：未找到 Bilibili 登录信息，请刷新 B 站页面或重新登录（未发送：${segment}）`);
              return;
            }
            if (isLockedEmoticon(segment)) {
              appendLog(formatLockedEmoticonReject(segment, "同传表情"));
              return;
            }
            const result = await enqueueDanmaku(segment, roomId, csrfToken, SendPriority.STT);
            appendLog(result, "同传", segment);
            if (!result.success && !result.cancelled) {
              await tryAiEvasion(segment, roomId, csrfToken, "同传");
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            appendLog(`🔴 同传发送出错：${msg}（未发送：${segment}）`);
          }
        };
        const flushBuffer = async () => {
          if (isFlushing.current) return;
          isFlushing.current = true;
          try {
            if (flushTimeout.current) {
              clearTimeout(flushTimeout.current);
              flushTimeout.current = null;
            }
            if (!sendBuffer.current.trim()) return;
            const wrap = sonioxWrapBrackets.value;
            const maxLen = sonioxMaxLength.value || 40;
            const splitLen = wrap ? Math.max(1, maxLen - 2) : maxLen;
            const processedText = applyReplacements(sendBuffer.current.trim());
            sendBuffer.current = "";
            const segments = splitTextSmart(processedText, splitLen);
            for (const segment of segments) {
              const clean = stripTrailingPunctuation(segment);
              if (!clean) continue;
              await sendSegment(wrap ? `【${clean}】` : clean);
            }
          } finally {
            isFlushing.current = false;
          }
        };
        const addToBuffer = (text) => {
          if (!text) return;
          sendBuffer.current += text;
          if (flushTimeout.current) clearTimeout(flushTimeout.current);
          if (state.value === "running") {
            flushTimeout.current = setTimeout(() => void flushBuffer(), SONIOX_FLUSH_DELAY_MS);
          }
        };
        const toggle = async () => {
          if (state.value === "stopped") {
            const apiKey = sonioxApiKey.value.trim();
            if (!apiKey) {
              appendLog("⚠️ 请先输入 Soniox API Key");
              statusText.value = "请输入 API Key";
              statusColor.value = "#f44";
              return;
            }
            finalText.value = "";
            nonFinalText.value = "";
            accFinal.current = "";
            accTranslated.current = "";
            state.value = "starting";
            statusText.value = "正在连接…";
            statusColor.value = "#666";
            try {
              const client2 = new SonioxClient({ apiKey });
              clientRef.current = client2;
              const hints2 = sonioxLanguageHints.value;
              const translationEnabled = sonioxTranslationEnabled.value;
              const translationTarget = sonioxTranslationTarget.value;
              const startConfig = {
                model: "stt-rt-v3",
                languageHints: hints2,
                enableEndpointDetection: true,
                onStarted: () => {
                  state.value = "running";
                  sttRunning.value = true;
                  if (translationEnabled) {
                    const langNames = { en: "English", zh: "中文", ja: "日本語" };
                    statusText.value = `正在识别并翻译为${langNames[translationTarget] ?? translationTarget}…`;
                  } else {
                    statusText.value = "正在识别…";
                  }
                  statusColor.value = "#36a185";
                  appendLog(translationEnabled ? `🎤 同传已启动（翻译模式：${translationTarget}）` : "🎤 同传已启动");
                },
                onPartialResult: (result) => {
                  let newFinal = "";
                  let nonFinal = "";
                  let newTransFinal = "";
                  let transNonFinal = "";
                  let endpointDetected = false;
                  for (const token of result.tokens ?? []) {
                    if (token.text === "<end>" && token.is_final) {
                      endpointDetected = true;
                      continue;
                    }
                    if (translationEnabled) {
                      if (token.translation_status === "translation") {
                        if (token.is_final) newTransFinal += token.text;
                        else transNonFinal += token.text;
                      }
                    } else {
                      if (token.is_final) newFinal += token.text;
                      else nonFinal += token.text;
                    }
                  }
                  if (translationEnabled) {
                    if (newTransFinal && sonioxAutoSend.value) addToBuffer(newTransFinal);
                    accTranslated.current += newTransFinal;
                    let display = accTranslated.current;
                    if (display.length > 500) display = `…${display.slice(-500)}`;
                    finalText.value = display;
                    nonFinalText.value = transNonFinal;
                  } else {
                    if (newFinal && sonioxAutoSend.value) addToBuffer(newFinal);
                    accFinal.current += newFinal;
                    let display = accFinal.current;
                    if (display.length > 500) display = `…${display.slice(-500)}`;
                    finalText.value = display;
                    nonFinalText.value = nonFinal;
                  }
                  if (endpointDetected && sonioxAutoSend.value) {
                    setTimeout(() => void flushBuffer(), translationEnabled ? 300 : 0);
                  }
                },
                onFinished: async () => {
                  let waitCount = 0;
                  while (isFlushing.current && waitCount < 100) {
                    await new Promise((r2) => setTimeout(r2, 100));
                    waitCount++;
                  }
                  await flushBuffer();
                  appendLog("🎤 同传已停止");
                  resetState();
                },
                onError: (_status, message) => {
                  appendLog(`🔴 Soniox 错误：${message}`);
                  if (state.value !== "stopping" && state.value !== "stopped") resetState(`错误: ${message}`, "#f44");
                }
              };
              if (translationEnabled) {
                startConfig.translation = { type: "one_way", target_language: translationTarget };
              }
              client2.start(startConfig);
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              if (err instanceof Error && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
                appendLog("❌ 麦克风权限被拒绝，请在浏览器设置中允许使用麦克风");
                resetState("麦克风权限被拒绝，请允许浏览器使用麦克风", "#f44");
              } else if (err instanceof Error && err.name === "NotFoundError") {
                appendLog("❌ 未找到麦克风设备");
                resetState("未找到麦克风设备", "#f44");
              } else {
                appendLog(`🔴 启动同传失败：${message}`);
                resetState(`启动失败: ${message}`, "#f44");
              }
            }
          } else if (state.value === "running") {
            state.value = "stopping";
            statusText.value = "正在停止…";
            if (clientRef.current) clientRef.current.stop();
          }
        };
        const updateLangHints = (lang, checked) => {
          let hints2 = [...sonioxLanguageHints.value];
          if (checked && !hints2.includes(lang)) hints2.push(lang);
          else if (!checked) hints2 = hints2.filter((h2) => h2 !== lang);
          if (hints2.length === 0) hints2 = ["zh"];
          sonioxLanguageHints.value = hints2;
        };
        const btnText = state.value === "starting" ? "启动中…" : state.value === "stopping" ? "停止中…" : state.value === "running" ? "停止同传" : "开始同传";
        const hints = sonioxLanguageHints.value;
        return u$2(S$1, { children: [
u$2(
            "div",
            {
              className: "cb-section cb-stack",
              style: { margin: ".5em 0", paddingBottom: ".5em", borderBottom: "1px solid var(--Ga2, #eee)" },
              children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".5em" }, children: "Soniox API 设置" }),
u$2(
                  "div",
                  {
                    className: "cb-row",
                    style: { display: "flex", gap: ".5em", alignItems: "center", flexWrap: "wrap", marginBottom: ".5em" },
                    children: [
u$2(
                        "input",
                        {
                          type: apiKeyVisible.value ? "text" : "password",
                          placeholder: "输入 Soniox API Key",
                          style: { flex: 1, minWidth: "150px" },
                          value: sonioxApiKey.value,
                          onInput: (e2) => {
                            sonioxApiKey.value = e2.currentTarget.value;
                          }
                        }
                      ),
u$2(
                        "button",
                        {
                          type: "button",
                          style: { cursor: "pointer" },
                          onClick: () => {
                            apiKeyVisible.value = !apiKeyVisible.value;
                          },
                          children: apiKeyVisible.value ? "隐藏" : "显示"
                        }
                      )
                    ]
                  }
                ),
u$2(
                  "div",
                  {
                    className: "cb-row",
                    style: { display: "flex", gap: ".5em", alignItems: "center", flexWrap: "wrap", marginBottom: ".25em" },
                    children: [
u$2(
                        "a",
                        {
                          href: "https://soniox.com/",
                          target: "_blank",
                          className: "cb-primary",
                          style: { display: "inline-flex", alignItems: "center", minHeight: "26px", padding: "3px 9px" },
                          rel: "noopener",
                          children: "获取 Soniox API Key"
                        }
                      ),
u$2("span", { className: "cb-note", children: "注册后把 API Key 粘贴到上方。" })
                    ]
                  }
                ),
u$2("div", { className: "cb-note", style: { color: "#666", fontSize: "0.85em", marginTop: ".25em" }, children: "API Key 仅保存在你的浏览器（GM 存储）。开启同传后，麦克风音频流会通过 WebSocket 发送到 api.soniox.com 进行识别。" })
              ]
            }
          ),
u$2(
            "div",
            {
              className: "cb-section cb-stack",
              style: { margin: ".5em 0", paddingBottom: ".5em", borderBottom: "1px solid var(--Ga2, #eee)" },
              children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".5em" }, children: "语音识别设置" }),
u$2(
                  "div",
                  {
                    className: "cb-row",
                    style: { display: "flex", gap: ".5em", alignItems: "center", flexWrap: "wrap", marginBottom: ".5em" },
                    children: [
u$2("span", { children: "语言提示：" }),
                      ["zh", "en", "ja", "ko"].map((lang) => {
                        const labels = { zh: "中文", en: "English", ja: "日本語", ko: "한국어" };
                        return u$2(
                          "span",
                          {
                            className: "cb-switch-row",
                            style: { display: "inline-flex", alignItems: "center", gap: ".25em" },
                            children: [
u$2(
                                "input",
                                {
                                  type: "checkbox",
                                  checked: hints.includes(lang),
                                  onChange: (e2) => updateLangHints(lang, e2.currentTarget.checked)
                                }
                              ),
u$2("label", { htmlFor: lang, children: labels[lang] })
                            ]
                          },
                          lang
                        );
                      }),
u$2("label", { htmlFor: "sonioxMaxLength", children: "超过" }),
u$2(
                        "input",
                        {
                          id: "sonioxMaxLength",
                          type: "number",
                          min: "1",
                          style: { width: "40px" },
                          value: sonioxMaxLength.value,
                          onInput: (e2) => {
                            const v2 = parseInt(e2.currentTarget.value, 10) || 1;
                            sonioxMaxLength.value = Math.max(1, v2);
                          }
                        }
                      ),
u$2("span", { children: "字自动分段" })
                    ]
                  }
                ),
u$2("div", { className: "cb-row", style: { display: "flex", gap: ".75em", alignItems: "center", flexWrap: "wrap" }, children: [
u$2("span", { className: "cb-switch-row", style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                      "input",
                      {
                        id: "sonioxAutoSend",
                        type: "checkbox",
                        checked: sonioxAutoSend.value,
                        onInput: (e2) => {
                          sonioxAutoSend.value = e2.currentTarget.checked;
                        }
                      }
                    ),
u$2("label", { htmlFor: "sonioxAutoSend", children: "识别完成后自动发送弹幕" })
                  ] }),
u$2("span", { className: "cb-switch-row", style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                      "input",
                      {
                        id: "sonioxWrapBrackets",
                        type: "checkbox",
                        checked: sonioxWrapBrackets.value,
                        onInput: (e2) => {
                          sonioxWrapBrackets.value = e2.currentTarget.checked;
                        }
                      }
                    ),
u$2("label", { htmlFor: "sonioxWrapBrackets", children: "使用【】包裹同传内容" })
                  ] })
                ] })
              ]
            }
          ),
u$2(
            "div",
            {
              className: "cb-section cb-stack",
              style: { margin: ".5em 0", paddingBottom: ".5em", borderBottom: "1px solid var(--Ga2, #eee)" },
              children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".5em" }, children: "实时翻译设置" }),
u$2(
                  "div",
                  {
                    className: "cb-row",
                    style: { display: "flex", gap: ".5em", alignItems: "center", flexWrap: "wrap", marginBottom: ".5em" },
                    children: u$2("span", { className: "cb-switch-row", style: { display: "inline-flex", alignItems: "center", gap: ".25em" }, children: [
u$2(
                        "input",
                        {
                          id: "sonioxTranslationEnabled",
                          type: "checkbox",
                          checked: sonioxTranslationEnabled.value,
                          onInput: (e2) => {
                            sonioxTranslationEnabled.value = e2.currentTarget.checked;
                          }
                        }
                      ),
u$2("label", { htmlFor: "sonioxTranslationEnabled", children: "启用实时翻译" })
                    ] })
                  }
                ),
u$2("div", { className: "cb-row", style: { display: "flex", gap: ".5em", alignItems: "center", flexWrap: "wrap" }, children: [
u$2("label", { htmlFor: "sonioxTranslationTarget", children: "翻译目标语言：" }),
u$2(
                    "select",
                    {
                      id: "sonioxTranslationTarget",
                      style: { minWidth: "80px" },
                      value: sonioxTranslationTarget.value,
                      onChange: (e2) => {
                        sonioxTranslationTarget.value = e2.currentTarget.value;
                      },
                      children: [
u$2("option", { value: "en", children: "English" }),
u$2("option", { value: "zh", children: "中文" }),
u$2("option", { value: "ja", children: "日本語" })
                      ]
                    }
                  )
                ] }),
u$2("div", { className: "cb-note", style: { marginTop: ".5em", color: "#666", fontSize: "0.9em" }, children: "启用后将发送翻译结果而非原始识别文字" })
              ]
            }
          ),
u$2("div", { className: "cb-section cb-stack", style: { margin: ".5em 0" }, children: [
u$2(
              "div",
              {
                className: "cb-row",
                style: { display: "flex", gap: ".5em", alignItems: "center", flexWrap: "wrap", marginBottom: ".5em" },
                children: [
u$2("button", { type: "button", onClick: () => void toggle(), children: btnText }),
u$2("span", { style: { color: statusColor.value }, children: statusText.value })
                ]
              }
            ),
u$2("div", { style: { marginBlock: ".5em" }, children: [
u$2("div", { className: "cb-heading", style: { fontWeight: "bold", marginBottom: ".25em" }, children: "实时识别结果：" }),
u$2(
                "div",
                {
                  className: "cb-result",
                  style: {
                    padding: ".5em",
                    background: "var(--bg2, #f5f5f5)",
                    borderRadius: "4px",
                    minHeight: "40px",
                    maxHeight: "100px",
                    overflowY: "auto",
                    wordBreak: "break-all"
                  },
                  children: [
u$2("span", { children: finalText.value }),
u$2("span", { style: { color: "#999" }, children: nonFinalText.value })
                  ]
                }
              )
            ] })
          ] })
        ] });
      }
      const TABS = [
        { id: "fasong", label: "发送" },
        { id: "tongchuan", label: "同传" },
        { id: "settings", label: "设置" },
        { id: "about", label: "关于" }
      ];
      function Tabs() {
        const current = activeTab.value;
        const wsDegraded = liveWsStatus.value === "error" || liveWsStatus.value === "closed";
        return u$2("div", { className: "cb-tabs", role: "tablist", "aria-label": "弹幕助手分类", children: [
          TABS.map((tab) => u$2(
            "button",
            {
              type: "button",
              className: "cb-tab lc-min-w-0",
              role: "tab",
              "aria-selected": current === tab.id,
              "data-active": current === tab.id,
              onClick: () => {
                activeTab.value = tab.id;
              },
              children: [
                tab.label,
                tab.id === "fasong" && sendMsg.value ? " · 车" : "",
                tab.id === "fasong" && autoBlendEnabled.value ? " · 跟" : "",
                tab.id === "fasong" && wsDegraded ? " ⚠️" : "",
                tab.id === "tongchuan" && sttRunning.value ? " · 开" : ""
              ]
            },
            tab.id
          )),
          wsDegraded && u$2(
            "div",
            {
              className: "cb-ws-degraded-banner",
              role: "status",
              "aria-live": "polite",
              title: "直播 WebSocket 断开，自动跟车与 Chatterbox Chat 已退化为 DOM 抓取模式（高峰期可能漏事件）",
              style: {
                gridColumn: "1 / -1",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                margin: "4px 0 0",
                padding: "2px 6px",
                borderRadius: "999px",
                background: "rgba(255, 149, 0, .14)",
                color: "#a15c00",
                fontSize: "11px",
                fontWeight: 620,
                lineHeight: 1.4
              },
              children: "⚠️ 直播 WS 已断开 · 已退回 DOM 抓取（高峰期可能漏事件）"
            }
          )
        ] });
      }
      function Configurator() {
        const tab = activeTab.value;
        const visible = dialogOpen.value;
        const visited = A( new Set([tab]));
        visited.current.add(tab);
        const panelClass = (active) => cn("cb-scroll", active ? "lc-block" : "lc-hidden");
        return u$2(
          "section",
          {
            id: "laplace-chatterbox-dialog",
            "aria-label": "弹幕助手面板",
            "aria-hidden": !visible,
            className: cn(
              "lc-fixed lc-right-2 lc-bottom-[46px] lc-z-[2147483647]",
              "lc-w-[320px] lc-max-w-[calc(100vw_-_16px)]",
              "lc-max-h-[50vh] lc-overflow-y-auto",
              !visible && "lc-hidden"
            ),
            children: [
u$2(Tabs, {}),
u$2("div", { className: panelClass(tab === "fasong"), children: visited.current.has("fasong") && u$2(S$1, { children: [
u$2(AutoSendControls, {}),
u$2("div", { children: u$2(AutoBlendControls, {}) }),
u$2("div", { children: u$2(HzmDrivePanelMount, {}) }),
u$2("div", { style: { margin: ".25rem 0" }, children: u$2(MemesList, {}) }),
u$2(NormalSendTab, {})
              ] }) }),
u$2("div", { className: panelClass(tab === "tongchuan"), children: visited.current.has("tongchuan") && u$2(SttTab, {}) }),
u$2("div", { className: panelClass(tab === "settings"), children: visited.current.has("settings") && u$2(SettingsTab, {}) }),
u$2("div", { className: panelClass(tab === "about"), children: visited.current.has("about") && u$2(AboutTab, {}) }),
u$2("div", { className: "lc-px-[10px] lc-pb-[10px]", children: u$2(LogPanel, {}) })
            ]
          }
        );
      }
      class ErrorBoundary extends C$1 {
        state = {
          error: null
        };
        static getDerivedStateFromError(error) {
          return { error };
        }
        componentDidCatch(error, errorInfo) {
          console.error("[Chatterbox] UI crashed", error, errorInfo);
        }
        handleReload = () => {
          this.setState({ error: null });
          location.reload();
        };
        render({ children }, { error }) {
          if (!error) return children;
          return u$2(
            "div",
            {
              className: "lc-fixed lc-right-2 lc-bottom-[46px] lc-z-[2147483647] lc-w-[320px] lc-max-w-[calc(100vw_-_16px)]",
              style: {
                padding: "12px",
                borderRadius: "12px",
                background: "#fff7f7",
                border: "1px solid #f3b7b7",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
                color: "#7f1d1d"
              },
              children: [
u$2("div", { style: { fontWeight: "bold", marginBottom: "6px" }, children: "Chatterbox 面板遇到错误" }),
u$2("div", { style: { fontSize: "13px", lineHeight: 1.5, marginBottom: "10px" }, children: "为了避免整个页面功能失效，已停止渲染当前面板。你可以刷新页面后继续使用。" }),
u$2("button", { type: "button", className: "cb-button", onClick: this.handleReload, children: "刷新页面" })
              ]
            }
          );
        }
      }
      const ONBOARDING_STEPS = [
        {
          title: "选一个自动跟车预设",
          detail: "建议先选「正常」。预设决定多积极地跟车。"
        },
        {
          title: "先手动发一条普通弹幕",
          detail: "确认账号能正常发言，再交给脚本。"
        },
        {
          title: "开启自动跟车「试运行」",
          detail: "试运行只在日志里显示会发什么，不会真的发出去。先观察一会再决定是否真的发送。"
        }
      ];
      function Onboarding() {
        if (hasSeenWelcome.value || !dialogOpen.value) return null;
        const finish = (message) => {
          hasSeenWelcome.value = true;
          appendLog(message);
        };
        const useRecommended = () => {
          autoBlendPreset.value = "normal";
          autoBlendDryRun.value = true;
          activeTab.value = "fasong";
          finish("👋 已套用新手建议：自动跟车使用正常预设，并先开启试运行。");
        };
        const openAbout = () => {
          activeTab.value = "about";
          finish("👋 已跳过首次引导，已为你打开「关于」隐私说明。");
        };
        return u$2(
          "div",
          {
            role: "dialog",
            "aria-label": "弹幕助手首次引导",
            style: {
              position: "fixed",
              right: "min(336px, calc(100vw - 288px))",
              bottom: "46px",
              zIndex: 2147483647,
              width: "min(300px, calc(100vw - 24px))",
              border: "1px solid rgba(60, 60, 67, .18)",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, .96)",
              color: "#1d1d1f",
              boxShadow: "0 18px 48px rgba(0,0,0,.22)",
              padding: "12px",
              fontSize: "13px",
              lineHeight: 1.5
            },
            children: [
u$2("div", { style: { fontWeight: 700, marginBottom: "6px" }, children: "第一次使用弹幕助手" }),
u$2("div", { style: { color: "#555", marginBottom: "8px", fontSize: "12px" }, children: "弹幕助手可以循环发送弹幕、按热度自动跟车、接管聊天区，并查询粉丝牌房间状态。" }),
u$2("ol", { style: { margin: "0 0 10px 18px", padding: 0 }, children: ONBOARDING_STEPS.map((step) => u$2("li", { style: { marginBottom: "4px" }, children: [
u$2("div", { children: step.title }),
u$2("div", { style: { color: "#666", fontSize: "12px" }, children: step.detail })
              ] }, step.title)) }),
u$2("div", { style: { color: "#666", fontSize: "12px", marginBottom: "8px" }, children: "部分功能（AI 规避、保安室同步、同传）会和外部服务通信，详见「关于 → 隐私说明」。" }),
u$2("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap" }, children: [
u$2("button", { type: "button", className: "cb-btn", onClick: useRecommended, children: "使用建议配置" }),
u$2("button", { type: "button", className: "cb-btn", onClick: openAbout, children: "查看隐私说明" }),
u$2("button", { type: "button", className: "cb-btn", onClick: () => finish("👋 已跳过首次引导。"), children: "跳过" })
              ] })
            ]
          }
        );
      }
      const SHADOW_CHIP_RECENT_WINDOW_MS = 6e4;
      const ANCHOR_REFRESH_MS = 500;
      const CHIP_GAP_PX = 6;
      const CHIP_MAX_WIDTH = 420;
      function obsKey(text, roomId) {
        return `${roomId ?? "global"}\0${text}`;
      }
      function pickActiveObservation(observations, dismissedKeys, now = Date.now()) {
        let best = null;
        for (const o2 of observations) {
          if (!o2.candidates || o2.candidates.length === 0) continue;
          if (now - o2.ts >= SHADOW_CHIP_RECENT_WINDOW_MS) continue;
          if (dismissedKeys.has(obsKey(o2.text, o2.roomId))) continue;
          if (best === null || o2.ts > best.ts) best = o2;
        }
        return best;
      }
      function computeChipPlacement(anchorRect, viewport, candidateCount) {
        const estimatedHeight = 60 + candidateCount * 24;
        let top = anchorRect.top - CHIP_GAP_PX - estimatedHeight;
        if (top < 8) top = anchorRect.bottom + CHIP_GAP_PX;
        if (top + estimatedHeight > viewport.innerHeight - 8) {
          top = Math.max(8, viewport.innerHeight - estimatedHeight - 8);
        }
        const width = Math.min(CHIP_MAX_WIDTH, Math.max(260, anchorRect.width));
        let left = anchorRect.left;
        if (left + width > viewport.innerWidth - 8) {
          left = Math.max(8, viewport.innerWidth - width - 8);
        }
        return { top, left, width };
      }
      const ANCHOR_SELECTORS = [
        { sel: "#laplace-custom-chat textarea", source: "custom-chat" },
{
          sel: [
            ".chat-control-panel-vm textarea",
            ".bottom-actions textarea",
            ".brush-input textarea",
            "textarea.chat-input"
          ].join(", "),
          source: "native"
        },
        { sel: "[data-cb-send-tab-textarea]", source: "send-tab" }
      ];
      function findComposerAnchor(doc = document) {
        for (const { sel, source } of ANCHOR_SELECTORS) {
          const el = doc.querySelector(sel);
          if (!el) continue;
          if (el.offsetParent === null && el.getClientRects().length === 0) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) continue;
          return { rect, source };
        }
        return null;
      }
      function CandidateRow({ candidate }) {
        return u$2(
          "div",
          {
            style: {
              display: "flex",
              gap: "4px",
              alignItems: "center",
              padding: "2px 0",
              fontSize: "12px"
            },
            children: [
u$2("span", { style: { minWidth: "4em", color: "#888", fontSize: "11px" }, children: candidate.label }),
u$2(
                "code",
                {
                  style: {
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    background: "#f5f5f5",
                    padding: "1px 6px",
                    borderRadius: "3px",
                    fontFamily: "monospace"
                  },
                  title: candidate.text,
                  children: candidate.text
                }
              ),
u$2(
                "button",
                {
                  type: "button",
                  style: { fontSize: "11px", padding: "2px 6px" },
                  onClick: async () => {
                    const ok = await copyText(candidate.text);
                    appendLog(ok ? `📋 已复制（${candidate.label}）` : `⚠️ 复制失败（${candidate.label}）`);
                  },
                  children: "复制"
                }
              ),
u$2(
                "button",
                {
                  type: "button",
                  style: { fontSize: "11px", padding: "2px 6px" },
                  title: "填入弹幕输入框，但不会自动发送 — 你确认后再按发送/回车",
                  onClick: () => {
                    const target = fillIntoComposer(candidate.text);
                    const where = target === "custom-chat" ? "Chatterbox 输入框" : target === "native" ? "B站原生输入框" : "发送 Tab";
                    appendLog(`📝 已填入${where}（${candidate.label}），请检查后再发送`);
                  },
                  children: "填入"
                }
              )
            ]
          }
        );
      }
      function ShadowBypassChip() {
        const dismissedKeys = useSignal( new Set());
        const anchor = useSignal(null);
        y$2(() => {
          const tick2 = () => {
            anchor.value = findComposerAnchor();
          };
          tick2();
          const handle = window.setInterval(tick2, ANCHOR_REFRESH_MS);
          window.addEventListener("resize", tick2);
          return () => {
            window.clearInterval(handle);
            window.removeEventListener("resize", tick2);
          };
        }, [anchor]);
        const target = pickActiveObservation(shadowBanObservations.value, dismissedKeys.value);
        if (!target || !anchor.value) return null;
        const { top, left, width } = computeChipPlacement(
          anchor.value.rect,
          { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
          target.candidates?.length ?? 0
        );
        const dismiss = () => {
          const k2 = obsKey(target.text, target.roomId);
          dismissedKeys.value = new Set([...dismissedKeys.value, k2]);
        };
        return u$2(
          "div",
          {
            role: "dialog",
            "aria-label": "影子封禁改写候选",
            style: {
              position: "fixed",
              top: `${top}px`,
              left: `${left}px`,
              width: `${width}px`,
              zIndex: 2147483600,
              background: "white",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: "6px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
              padding: "8px 10px",
              fontSize: "12px",
              lineHeight: 1.4
            },
            children: [
u$2(
                "div",
                {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px"
                  },
                  children: [
u$2("strong", { style: { color: "#d93025", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
                      "⚠️ 疑似屏蔽：",
                      target.text
                    ] }),
u$2("div", { style: { display: "flex", gap: "4px" }, children: [
u$2(
                        "button",
                        {
                          type: "button",
                          style: { fontSize: "11px", padding: "2px 6px" },
                          title: "从观察列表删除这一条",
                          onClick: () => {
                            removeShadowBanObservation(target.text, target.roomId);
                          },
                          children: "删除"
                        }
                      ),
u$2(
                        "button",
                        {
                          type: "button",
                          style: { fontSize: "14px", lineHeight: 1, padding: "0 6px" },
                          title: "关闭这个提示（不删除观察记录，下次还能从设置里找到）",
                          onClick: dismiss,
                          children: "×"
                        }
                      )
                    ] })
                  ]
                }
              ),
u$2("div", { style: { color: "#666", fontSize: "11px", marginBottom: "4px" }, children: "候选改写（不自动发送，点「填入」会替换你的输入框文本）：" }),
              target.candidates?.map((c2) => u$2(CandidateRow, { candidate: c2 }, c2.strategy))
            ]
          }
        );
      }
      function ToggleButton() {
        const btnRef = A(null);
        const toggle = q$2(() => {
          dialogOpen.value = !dialogOpen.value;
        }, []);
        y$2(() => {
          const onKey = (e2) => {
            if (e2.key !== "Escape") return;
            if (!dialogOpen.value) return;
            const target = e2.target;
            const tag = target?.tagName?.toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) return;
            e2.stopPropagation();
            dialogOpen.value = false;
            btnRef.current?.focus();
          };
          document.addEventListener("keydown", onKey, true);
          return () => document.removeEventListener("keydown", onKey, true);
        }, []);
        const sending2 = sendMsg.value;
        const open = dialogOpen.value;
        return u$2(
          "button",
          {
            ref: btnRef,
            type: "button",
            id: "laplace-chatterbox-toggle",
            "data-open": open,
            "data-sending": sending2,
            "aria-label": open ? "关闭弹幕助手面板（按 Esc 关闭）" : "打开弹幕助手面板",
            "aria-expanded": open,
            "aria-controls": "laplace-chatterbox-dialog",
            title: open ? "Esc 关闭面板" : "点击打开弹幕助手",
            onClick: toggle,
            style: {
              position: "fixed",
              right: "8px",
              bottom: "8px",
              zIndex: 2147483647
            },
            children: "弹幕助手"
          }
        );
      }
      function UserNotice() {
        const notices = userNotices.value;
        if (notices.length === 0) return null;
        const showLog = () => {
          logPanelOpen.value = true;
          logPanelFocusRequest.value += 1;
        };
        return u$2(
          "div",
          {
            style: {
              position: "fixed",
              right: "8px",
              bottom: "86px",
              zIndex: 2147483647,
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              width: "min(360px, calc(100vw - 16px))"
            },
            children: notices.map((notice) => {
              const toneColor = notice.tone === "error" ? "#ff3b30" : notice.tone === "warning" ? "#a15c00" : notice.tone === "success" ? "#168a45" : "#2563eb";
              const title = notice.tone === "error" ? "操作失败" : notice.tone === "warning" ? "需要注意" : notice.tone === "success" ? "操作成功" : "提示";
              return u$2(
                "div",
                {
                  role: "status",
                  "aria-live": "polite",
                  style: {
                    border: `1px solid ${toneColor}`,
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, .94)",
                    color: "#1d1d1f",
                    boxShadow: "0 18px 48px rgba(0,0,0,.22)",
                    backdropFilter: "blur(22px) saturate(1.4)",
                    WebkitBackdropFilter: "blur(22px) saturate(1.4)",
                    padding: "9px 10px",
                    fontSize: "12px",
                    lineHeight: 1.45,
                    wordBreak: "break-word"
                  },
                  children: [
u$2("div", { style: { color: toneColor, fontWeight: 650, marginBottom: "2px" }, children: title }),
u$2("div", { children: notice.message }),
u$2(
                      "button",
                      {
                        type: "button",
                        onClick: showLog,
                        style: {
                          marginTop: "7px",
                          minHeight: "24px",
                          border: `1px solid ${toneColor}`,
                          borderRadius: "8px",
                          background: "#fff",
                          color: toneColor,
                          padding: "3px 8px",
                          cursor: "pointer",
                          fontWeight: 650
                        },
                        children: "查看日志"
                      }
                    )
                  ]
                },
                notice.id
              );
            })
          }
        );
      }
      function App() {
        y$2(() => {
          applyGuardRoomHandoff();
        }, []);
        y$2(() => {
          startGuardRoomAgent();
          return () => {
            stopGuardRoomAgent();
          };
        }, []);
        y$2(() => {
          const dispose = installPanelStyles();
          void loop();
          return dispose;
        }, []);
        y$2(() => startCustomChatRoomRearm(), []);
        y$2(() => startCbBackendHealthProbe(), []);
        y$2(() => {
          if (danmakuDirectMode.value) {
            startDanmakuDirect();
          } else {
            stopDanmakuDirect();
          }
          return () => stopDanmakuDirect();
        }, [danmakuDirectMode.value]);
        y$2(() => {
          if (autoBlendEnabled.value) {
            startAutoBlend();
          } else {
            stopAutoBlend();
          }
          return () => stopAutoBlend();
        }, [autoBlendEnabled.value]);
        y$2(() => {
          startUserBlacklistHijack();
          return () => stopUserBlacklistHijack();
        }, []);
        y$2(() => {
          if (guardRoomLiveDeskSessionId.value) {
            startLiveDeskSync();
          } else {
            stopLiveDeskSync();
          }
          return () => stopLiveDeskSync();
        }, [guardRoomLiveDeskSessionId.value]);
        y$2(() => {
          if (customChatEnabled.value) {
            startCustomChat();
          } else {
            stopCustomChat();
          }
          return () => stopCustomChat();
        }, [customChatEnabled.value]);
        y$2(() => {
          if (customChatEnabled.value && customChatUseWs.value) {
            startLiveWsSource();
          } else {
            stopLiveWsSource();
          }
          return () => stopLiveWsSource();
        }, [customChatEnabled.value, customChatUseWs.value]);
        y$2(() => installOptimizedLayoutStyle(), [optimizeLayout.value]);
        return u$2(S$1, { children: [
u$2(ToggleButton, {}),
u$2(ErrorBoundary, { children: [
u$2(Configurator, {}),
u$2(Onboarding, {}),
u$2(UserNotice, {}),
u$2(ShadowBypassChip, {}),
u$2(AlertDialog, {})
          ] })
        ] });
      }
      const MOBILE_UA_RE = /(Android|iPhone|iPad|iPod|Mobile|Phone|Tablet|webOS|BlackBerry|IEMobile|Opera Mini)/i;
      function detectPlatform(userAgent) {
        const ua = userAgent ?? "";
        if (!ua) return { isMobileUA: false, warning: null };
        const isMobileUA = MOBILE_UA_RE.test(ua);
        if (!isMobileUA) return { isMobileUA: false, warning: null };
        return {
          isMobileUA: true,
          warning: "[chatterbox] 检测到移动端 UA。本 userscript 主要在桌面 Chrome/Firefox/Edge 加 Tampermonkey/Violentmonkey 上测试，移动端可能出现 UI 错位、点击命中区不准、剪贴板/通知接口不可用等问题。功能不会被禁用，但出问题时请把这条警告一起贴进 issue。"
        };
      }
      let warned = false;
      function warnIfDegraded() {
        if (warned) return;
        warned = true;
        if (typeof navigator === "undefined") return;
        const report = detectPlatform(navigator.userAgent);
        if (report.warning) {
          console.warn(report.warning);
        }
      }
      function mount() {
        const app = document.createElement("div");
        document.body.append(app);
        R( u$2(App, {}), app);
      }
      const isLiveHost = location.hostname === "live.bilibili.com";
      if (isLiveHost) {
        warnIfDegraded();
        if (document.body) {
          mount();
        } else {
          const observer2 = new MutationObserver(() => {
            if (document.body) {
              observer2.disconnect();
              mount();
            }
          });
          observer2.observe(document.documentElement, { childList: true });
        }
      }

    })
  };
}));

System.register("./llm-driver-BlAF69Id-Dm-Qekq_.js", ['./__monkey.entry-BZv1j5rD.js', '@soniox/speech-to-text-web'], (function (exports, module) {
  'use strict';
  var appendLog, gmFetch, BASE_URL;
  return {
    setters: [module => {
      appendLog = module.a;
      gmFetch = module.g;
      BASE_URL = module.B;
    }, null],
    execute: (function () {

      exports({
        buildOpenAICompatChatURL: buildOpenAICompatChatURL,
        chooseMemeWithLLM: chooseMemeWithLLM,
        normalizeIdFromLlmOutput: normalizeIdFromLlmOutput,
        testLLMConnection: testLLMConnection
      });

      const LLM_CANDIDATES_HARD_CAP = exports("LLM_CANDIDATES_HARD_CAP", 256);
      const SYSTEM_PROMPT_TEMPLATE = (roomName) => `你在 ${roomName} 直播间帮观众发弹幕（独轮车）。从下面给出的 candidates 里选 1 条最贴合最近公屏氛围的发出去。
仅返回该梗的 id（candidates 里的 id 字符串）。如果都不合适，返回 -1。
不要解释，不要带前后空格，不要 Markdown，只输出一个 id 字符串或者 -1。`;
      function buildUserMessage(opts) {
        return JSON.stringify({
          recentDanmu: opts.recentChat,
          candidates: opts.candidates
        });
      }
      function buildOpenAICompatChatURL(base) {
        const trimmed = base.replace(/\/+$/, "");
        if (/\/v1\/chat\/completions$/i.test(trimmed)) return trimmed;
        if (/\/v1$/i.test(trimmed)) return `${trimmed}/chat/completions`;
        return `${trimmed}/v1/chat/completions`;
      }
      function parseAnthropicResponse(json) {
        if (!json || typeof json !== "object") return null;
        const arr = json.content;
        if (!Array.isArray(arr) || arr.length === 0) return null;
        const text = arr.map((c) => c.text ?? "").join("").trim();
        return text ? { rawId: text } : null;
      }
      function extractIdFromReasoning(reasoning) {
        const tail = reasoning.slice(-300);
        const matches = tail.match(/-?\d+/g);
        if (!matches || matches.length === 0) return null;
        return matches[matches.length - 1] ?? null;
      }
      function parseOpenAIResponse(json) {
        if (!json || typeof json !== "object") return null;
        const choices = json.choices;
        if (!Array.isArray(choices) || choices.length === 0) return null;
        const choice = choices[0];
        if (!choice) return null;
        const content = choice.message?.content?.trim() ?? "";
        if (content) return { rawId: content };
        const reasoning = choice.message?.reasoning_content?.trim() ?? "";
        if (reasoning) {
          const fromReasoning = extractIdFromReasoning(reasoning);
          if (fromReasoning) return { rawId: fromReasoning };
        }
        return null;
      }
      async function callAnthropic(opts) {
        const resp = await gmFetch(BASE_URL.ANTHROPIC_MESSAGES, {
          method: "POST",
          headers: {
            "x-api-key": opts.apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
"anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model: opts.model,
            max_tokens: 64,
            system: [{ type: "text", text: SYSTEM_PROMPT_TEMPLATE(opts.roomName), cache_control: { type: "ephemeral" } }],
            messages: [{ role: "user", content: buildUserMessage(opts) }]
          }),
          timeoutMs: 15e3
        });
        if (!resp.ok) {
          throw new Error(`Anthropic HTTP ${resp.status}: ${resp.text().slice(0, 200)}`);
        }
        return parseAnthropicResponse(resp.json());
      }
      async function callOpenAI(opts, urlOverride) {
        const url = urlOverride ?? BASE_URL.OPENAI_CHAT;
        const resp = await gmFetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${opts.apiKey}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: opts.model,





max_tokens: 1024,
            messages: [
              { role: "system", content: SYSTEM_PROMPT_TEMPLATE(opts.roomName) },
              { role: "user", content: buildUserMessage(opts) }
            ]
          }),
          timeoutMs: 3e4
        });
        if (!resp.ok) {
          throw new Error(`OpenAI HTTP ${resp.status}: ${resp.text().slice(0, 200)}`);
        }
        return parseOpenAIResponse(resp.json());
      }
      async function testLLMConnection(opts) {
        if (!opts.apiKey.trim()) return { ok: false, error: "API key 为空" };
        const probe = {
          ...opts,
          roomName: "连接测试",
          recentChat: ["ping"],
          candidates: [{ id: "1", content: "pong", tags: [] }]
        };
        try {
          let parsed = null;
          if (opts.provider === "anthropic") {
            parsed = await callAnthropic(probe);
          } else if (opts.provider === "openai") {
            parsed = await callOpenAI(probe);
          } else {
            const base = (opts.baseURL ?? "").trim();
            if (!base) return { ok: false, error: "需要填 base URL（例如 https://api.deepseek.com）" };
            parsed = await callOpenAI(probe, buildOpenAICompatChatURL(base));
          }
          if (parsed === null) return { ok: false, error: "响应里未解析出文本（模型可能返回了空）" };
          return { ok: true };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      }
      async function chooseMemeWithLLM(opts) {
        if (!opts.apiKey || opts.candidates.length === 0) return null;
        let effectiveOpts = opts;
        if (opts.candidates.length > LLM_CANDIDATES_HARD_CAP) {
          appendLog(
            `⚠️ 智驾：candidates 超过上限 ${LLM_CANDIDATES_HARD_CAP}（实际 ${opts.candidates.length}），已截断以避免请求超额`
          );
          effectiveOpts = { ...opts, candidates: opts.candidates.slice(0, LLM_CANDIDATES_HARD_CAP) };
        }
        let parsed = null;
        if (effectiveOpts.provider === "anthropic") {
          parsed = await callAnthropic(effectiveOpts);
        } else if (effectiveOpts.provider === "openai") {
          parsed = await callOpenAI(effectiveOpts);
        } else {
          const base = (effectiveOpts.baseURL ?? "").trim();
          if (!base) throw new Error("openai-compat 需要填 base URL（例如 https://api.deepseek.com）");
          parsed = await callOpenAI(effectiveOpts, buildOpenAICompatChatURL(base));
        }
        if (!parsed) return null;
        const raw = parsed.rawId.trim();
        if (!raw) return null;
        const id = normalizeIdFromLlmOutput(raw);
        if (id === "-1") return null;
        if (id) {
          const found = effectiveOpts.candidates.find((c) => c.id === id);
          if (found) return found.content;
        }
        const byContent = effectiveOpts.candidates.find(
          (c) => c.content === raw || raw.includes(c.content) || c.content.includes(raw)
        );
        return byContent?.content ?? null;
      }
      function normalizeIdFromLlmOutput(raw) {
        const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        if (!stripped) return null;
        try {
          const parsed = JSON.parse(stripped);
          if (typeof parsed === "string") return parsed.trim() || null;
          if (typeof parsed === "number") return String(parsed);
          if (parsed && typeof parsed === "object") {
            const v = parsed.id;
            if (typeof v === "string") return v.trim() || null;
            if (typeof v === "number") return String(v);
          }
        } catch {
        }
        const m = stripped.match(/-1|\d+/);
        return m ? m[0] : null;
      }

    })
  };
}));

System.import("./__entry.js", "./");