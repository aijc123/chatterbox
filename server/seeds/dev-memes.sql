-- 开发用种子数据:几条已批准的样例梗 + 几条 pending,方便看 admin UI 效果。
-- 真实部署不要跑这个。

-- 已批准
INSERT INTO memes (uid, content, status, copy_count, content_hash, username, created_at, updated_at, reviewed_at)
VALUES
  (0, '【dev seed】这是一条已批准的样例梗', 'approved', 12, 'devhash-1', 'devseed', '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z', '2026-05-01T00:01:00.000Z'),
  (0, '【dev seed】另一条已批准',           'approved',  3, 'devhash-2', 'devseed', '2026-05-01T01:00:00.000Z', '2026-05-01T01:00:00.000Z', '2026-05-01T01:01:00.000Z');

-- 待审
INSERT INTO memes (uid, content, status, content_hash, username, created_at, updated_at)
VALUES
  (0, '【dev seed】等待审核 #1', 'pending', 'devhash-p1', 'anon-test', '2026-05-02T10:00:00.000Z', '2026-05-02T10:00:00.000Z'),
  (0, '【dev seed】等待审核 #2', 'pending', 'devhash-p2', 'anon-test', '2026-05-02T10:01:00.000Z', '2026-05-02T10:01:00.000Z');
