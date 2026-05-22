-- Planned sqlite-vec migration.
-- Requires installing/loading sqlite-vec first.
-- Reference package path for Node.js: npm install sqlite-vec

-- Example after extension loading:
-- SELECT vec_version();

CREATE VIRTUAL TABLE IF NOT EXISTS vec_context_embeddings USING vec0(
  embedding float[384],
  context_id TEXT,
  kind TEXT,
  title TEXT
);

-- Example KNN shape:
-- SELECT
--   context_id,
--   distance
-- FROM vec_context_embeddings
-- WHERE embedding MATCH ?
-- ORDER BY distance
-- LIMIT 8;
