/**
 * 静态 admin UI,作为字符串内嵌(避免上 wrangler assets 绑定的复杂度)。
 * 走 GET /admin 返回 HTML;HTML 自带 <style> 和 <script>,fetch 同源 /admin/*。
 *
 * 设计:
 *  - 顶部一个 token 输入框,值写到 localStorage('cbAdminToken')。
 *  - 每个 fetch 都把 token 塞 Authorization。401 → 弹回输入框。
 *  - 不依赖任何前端框架,改起来像改 PHP 时代的页面。
 */

export const ADMIN_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>chatterbox-cloud admin</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { font: 14px/1.5 system-ui, sans-serif; max-width: 900px; margin: 1.5em auto; padding: 0 1em; }
  h1 { font-size: 1.4em; margin: .3em 0 1em; }
  .bar { display: flex; gap: .5em; align-items: center; margin-bottom: 1em; flex-wrap: wrap; }
  .bar input[type=password] { flex: 1; min-width: 200px; padding: .4em; }
  button { padding: .35em .8em; cursor: pointer; }
  button.primary { background: #2563eb; color: #fff; border: 1px solid #1e40af; border-radius: 3px; }
  button.danger  { background: #dc2626; color: #fff; border: 1px solid #991b1b; border-radius: 3px; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .stats { display: flex; gap: 1em; flex-wrap: wrap; margin: .5em 0 1.5em; padding: .8em; background: #f5f5f5; border-radius: 4px; }
  .stats span { font-weight: 600; }
  .pending-row { padding: .8em; border: 1px solid #e5e7eb; border-radius: 4px; margin-bottom: .5em; }
  .pending-row .meta { font-size: .85em; color: #666; margin-bottom: .3em; }
  .pending-row .content { white-space: pre-wrap; word-break: break-all; margin-bottom: .5em; padding: .5em; background: #f9fafb; border-radius: 3px; }
  .pending-row .actions { display: flex; gap: .4em; align-items: center; flex-wrap: wrap; }
  .pending-row .actions input { flex: 1; min-width: 150px; padding: .3em; }
  .msg { padding: .5em .8em; border-radius: 3px; margin-bottom: 1em; }
  .msg.err { background: #fee2e2; color: #991b1b; }
  .msg.ok  { background: #dcfce7; color: #166534; }
  .empty { color: #666; text-align: center; padding: 2em; }
  @media (prefers-color-scheme: dark) {
    body { background: #111827; color: #f3f4f6; }
    .stats { background: #1f2937; }
    .pending-row { border-color: #374151; }
    .pending-row .content { background: #0f172a; }
  }
</style>
</head>
<body>
<h1>chatterbox-cloud · admin</h1>

<div class="bar">
  <input id="token" type="password" placeholder="Bearer token" autocomplete="off">
  <button class="primary" id="login">登录</button>
  <button id="logout">注销</button>
  <button id="refresh">刷新</button>
</div>

<div id="msg"></div>
<div id="stats" class="stats" style="display:none"></div>
<div id="pending"></div>

<script>
(function(){
  const $ = (id) => document.getElementById(id);
  const tokenInput = $('token');
  const msgEl = $('msg');
  const statsEl = $('stats');
  const listEl = $('pending');

  function getToken() { return localStorage.getItem('cbAdminToken') || ''; }
  function setToken(v) {
    if (v) localStorage.setItem('cbAdminToken', v);
    else localStorage.removeItem('cbAdminToken');
  }
  tokenInput.value = getToken();

  function flash(text, kind) {
    msgEl.innerHTML = '<div class="msg ' + (kind === 'err' ? 'err' : 'ok') + '">' + escapeHtml(text) + '</div>';
    setTimeout(() => { if (msgEl.firstChild) msgEl.removeChild(msgEl.firstChild); }, 5000);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  async function api(path, init) {
    const opts = Object.assign({ headers: {} }, init || {});
    opts.headers['Authorization'] = 'Bearer ' + getToken();
    if (init && init.body && !opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
    const res = await fetch(path, opts);
    if (res.status === 401) { flash('Token 无效或已撤销', 'err'); return null; }
    return res;
  }

  async function loadStats() {
    const res = await api('/admin/stats');
    if (!res || !res.ok) return;
    const data = await res.json();
    statsEl.style.display = '';
    statsEl.innerHTML =
      'pending: <span>' + data.counts.pending + '</span> · ' +
      'approved: <span>' + data.counts.approved + '</span> · ' +
      'rejected: <span>' + data.counts.rejected + '</span> · ' +
      '过去 24h 新提交: <span>' + data.submits24h + '</span>';
  }

  async function loadPending() {
    listEl.innerHTML = '<div class="empty">加载中...</div>';
    const res = await api('/admin/pending?perPage=100');
    if (!res || !res.ok) { listEl.innerHTML = '<div class="empty">加载失败</div>'; return; }
    const data = await res.json();
    if (!data.items.length) { listEl.innerHTML = '<div class="empty">没有待审条目 🎉</div>'; return; }
    listEl.innerHTML = data.items.map(m => renderRow(m)).join('');
    listEl.querySelectorAll('[data-act=approve]').forEach(b => b.addEventListener('click', onApprove));
    listEl.querySelectorAll('[data-act=reject]').forEach(b => b.addEventListener('click', onReject));
  }

  function renderRow(m) {
    return '<div class="pending-row" data-id="' + m.id + '">' +
      '<div class="meta">#' + m.id + ' · ' + escapeHtml(m.username || 'anon') + ' · ' + escapeHtml(m.createdAt) + '</div>' +
      '<div class="content">' + escapeHtml(m.content) + '</div>' +
      '<div class="actions">' +
        '<input class="tags" placeholder="批准时附 tag,逗号分隔(可选)">' +
        '<button class="primary" data-act="approve">批准</button>' +
        '<button class="danger"  data-act="reject">拒绝</button>' +
      '</div>' +
    '</div>';
  }

  async function onApprove(ev) {
    const row = ev.target.closest('.pending-row');
    const id = row.dataset.id;
    const tagInput = row.querySelector('.tags').value.trim();
    const tagNames = tagInput ? tagInput.split(/[,，]/).map(s => s.trim()).filter(Boolean) : null;
    ev.target.disabled = true;
    const res = await api('/admin/memes/' + id + '/approve', { method: 'POST', body: JSON.stringify({ tagNames }) });
    if (res && res.ok) { flash('已批准 #' + id, 'ok'); row.remove(); loadStats(); }
    else { ev.target.disabled = false; flash('批准失败', 'err'); }
  }

  async function onReject(ev) {
    const row = ev.target.closest('.pending-row');
    const id = row.dataset.id;
    const note = prompt('拒绝原因(可选):') || null;
    ev.target.disabled = true;
    const res = await api('/admin/memes/' + id + '/reject', { method: 'POST', body: JSON.stringify({ note }) });
    if (res && res.ok) { flash('已拒绝 #' + id, 'ok'); row.remove(); loadStats(); }
    else { ev.target.disabled = false; flash('拒绝失败', 'err'); }
  }

  $('login').addEventListener('click', async () => {
    setToken(tokenInput.value.trim());
    await loadStats();
    await loadPending();
  });
  $('logout').addEventListener('click', () => { setToken(''); tokenInput.value = ''; statsEl.style.display = 'none'; listEl.innerHTML = ''; });
  $('refresh').addEventListener('click', () => { loadStats(); loadPending(); });

  if (getToken()) { loadStats(); loadPending(); }
})();
</script>
</body>
</html>`
