-- Phase D:把 LAPLACE/SBHZM 的内容也存进自建 memes 表(由 userscript 用户经
-- POST /memes/bulk-mirror 投喂),让自建库逐步覆盖三个源。
--
-- 设计:
--  - 新加 `source_origin` 列:每行标明它最初来自哪里('cb' / 'laplace' / 'sbhzm')。
--    UI 展示的 _source badge 直接读这个值。
--  - 新加 `external_id` 列:存上游(LAPLACE / SBHZM)的原始 id,便于将来同步。
--  - content_hash 仍是 UNIQUE 索引,所以同内容跨源只存一行——管理员手工录入或编辑过的
--    'cb' 行不会被后续 mirror 覆盖。
--  - 现有所有行默认归为 'cb'(它们要么是种子,要么是用户提交)。
--
-- D1 的 ALTER TABLE 不支持 CHECK 约束新增,所以 source_origin 的取值在应用层校验。

ALTER TABLE memes ADD COLUMN source_origin TEXT NOT NULL DEFAULT 'cb';
ALTER TABLE memes ADD COLUMN external_id INTEGER;

-- 加速"按源浏览"和"反查上游 id 是否已镜像"两类查询。
CREATE INDEX IF NOT EXISTS idx_memes_origin_external ON memes(source_origin, external_id);
CREATE INDEX IF NOT EXISTS idx_memes_origin_status ON memes(source_origin, status);
