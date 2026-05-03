-- chatterbox-cloud Phase B 初始化:5 表 + 1 上游缓存表(供 Phase C 用)。
-- 时间戳一律 ISO 字符串,跟 LAPLACE `createdAt` 形状一致,方便客户端不做归一直接用。

CREATE TABLE IF NOT EXISTS memes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  uid           INTEGER NOT NULL DEFAULT 0,
  content       TEXT    NOT NULL,
  status        TEXT    NOT NULL CHECK(status IN ('pending','approved','rejected')),
  copy_count    INTEGER NOT NULL DEFAULT 0,
  last_copied_at TEXT,
  room_id       INTEGER,
  username      TEXT,
  avatar        TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  reviewed_at   TEXT,
  reviewer_note TEXT,
  -- 归一化 content 的 sha-1(小写、去空白与零宽字符)。同一条梗只入库一次。
  content_hash  TEXT NOT NULL
);

-- 同 hash 的 content 只能存一份。这是 Phase C 跨源去重的基石。
CREATE UNIQUE INDEX IF NOT EXISTS idx_memes_content_hash ON memes(content_hash);
CREATE INDEX IF NOT EXISTS idx_memes_status_updated ON memes(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_memes_status_copy    ON memes(status, copy_count DESC);
CREATE INDEX IF NOT EXISTS idx_memes_room_status    ON memes(room_id, status);

CREATE TABLE IF NOT EXISTS tags (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  color       TEXT,
  emoji       TEXT,
  icon        TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS meme_tags (
  meme_id INTEGER NOT NULL REFERENCES memes(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (meme_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_meme_tags_tag ON meme_tags(tag_id);

-- 审计日志:每次提交 / 审批 / 编辑都写一行,便于事后回溯。
CREATE TABLE IF NOT EXISTS contributions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  meme_id      INTEGER REFERENCES memes(id) ON DELETE SET NULL,
  action       TEXT    NOT NULL,            -- 'submit' | 'approve' | 'reject' | 'edit'
  actor        TEXT,                         -- 'public' 或管理员 label
  ip_hash      TEXT,                         -- sha256(ip + salt) 防 PII 直存
  user_agent   TEXT,
  payload_json TEXT,                         -- 提交/编辑时的全量请求快照
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_contrib_meme ON contributions(meme_id);
CREATE INDEX IF NOT EXISTS idx_contrib_action_time ON contributions(action, created_at DESC);

-- 管理员 API key。明文 token 永远不入库,只存 sha-256 hash。
CREATE TABLE IF NOT EXISTS api_keys (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  label      TEXT    NOT NULL,
  key_hash   TEXT    NOT NULL UNIQUE,
  scopes     TEXT    NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  revoked_at TEXT
);

-- Phase C 才会用:SBHZM 上游分页快照。每 15 分钟由 cron 写一行。
CREATE TABLE IF NOT EXISTS upstream_sbhzm_cache (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  json       TEXT    NOT NULL,
  fetched_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sbhzm_cache_fetched ON upstream_sbhzm_cache(fetched_at DESC);
