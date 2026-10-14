# Questoriaa Knowledge Engine Integration v1

`QuestoriaaKnowledgeService` implements the existing KnowledgeService protocol. API
dependencies and the database worker share `services/factories.py`. Tutor and learning
continue using the protocol; no second tutor API or text-generation provider was added.

## Ingestion and persistence

The worker claims a job, locks its course, reads all completed uploads through
`StorageService.read_object`, extracts PDF/PPTX text, and chunks within each page/slide.
The optional job `file_id` remains validated provenance, not a per-file processing selector.
Upload all course files before processing. A course with existing chapters or chunks is
rejected with `ALREADY_PROCESSED`; create a new course to ingest revised material. Mock
processing retains its existing idempotent illustrative fixture behavior.

PDF uses PyMuPDF text extraction, whitespace cleanup and line-break dehyphenation. PPTX
uses python-pptx, recursively extracts group shapes, paragraphs and tables, and includes
speaker notes. Code-aware sentence/unit splitting bounds chunks at 1,400 characters.
No chunk crosses a page or slide: existing citation fields suffice without `page_end`.
Blank, textless and image-only pages/slides are skipped without changing original page/slide
numbers. Text, table contents and speaker notes on other slides are processed normally.
`TEXTLESS_DOCUMENT` is raised only if an entire uploaded document produces zero chunks.
Encrypted/malformed documents fail with `INVALID_DOCUMENT`. No OCR or image/diagram
content is invented or interpreted.

The canonical ModelProvider receives numbered source passages and a subject-independent
curriculum prompt, returning a neutral `CourseDraft`. It cannot specify location metadata.
Application code validates source references, normalizes/deduplicates concept names,
assigns deterministic UUIDs, stores chapter/topic `order_index`, and resolves prerequisites
to existing earlier concepts. Unknown, self, or forward prerequisites fail validation,
preventing cycles. This bounded single structured call accepts up to 60,000 extracted text
characters and 200 chunks; larger inputs fail explicitly rather than silently truncating.
There is no model repair loop in this integration.

Graph and chunk/vector writes use the same SQLAlchemy transaction, with a savepoint for
ingestion failures. Final job completion commits with the graph. Failures roll back the
graph and persist a controlled error code/message; unexpected failures use the existing
generic processing error. Progress callbacks reflect actual phases (extract, analyze,
build, embed, index). On PostgreSQL, progress-only updates commit in a separate short session, while the course
lock and graph writes stay in the ingestion transaction. SQLite's single-writer fallback
flushes progress within the graph transaction, so polling generally sees the initial stage
until completion/failure. Crash recovery remains manual; there are no leases or retries.

Every valid concept/source citation is persisted in `source_chunk_concepts`, a many-to-many
association with a composite primary key. Repeated citations and deduplicated concepts do
not create duplicate pairs. `SourceChunk.concept_id` retains the first/primary concept for
backward compatibility. Concept-scoped semantic and exact retrieval accept any associated
concept, with legacy primary links also supported. Returned context reflects the requested
concept without changing persisted primary metadata. Course-wide retrieval returns each
chunk once, regardless of association count. Chapter/topic order is persisted; concepts have
no separate pedagogical order column in the existing contract.

## Embeddings and retrieval

`EmbeddingProvider` exposes `embed_texts` and `embed_query`. The OpenAI-compatible adapter
posts to `<EMBEDDING_BASE_URL>/embeddings`, batches 16 texts, restores response index order,
checks 1,024 finite nonzero dimensions and normalizes vectors. Query text uses the reference
Qwen instruction prefix. Requests time out after 60 seconds and fail with sanitized
`EMBEDDING_UNAVAILABLE` errors. The deterministic mock uses lexical hashing, not semantic AI.

`DatabaseChunkStore` is authoritative. PostgreSQL uses pgvector cosine distance (`<=>`),
filters course and optional concept using association EXISTS checks, and orders before LIMIT. Score is `(cosine + 1) / 2`,
clamped to [0,1], with UUID tie-breaking. SQLite stores JSON vectors and computes the same
ranking in Python. No approximate vector index is installed for this small MVP; PostgreSQL
performs exact distance ordering. Existing unembedded chunks are excluded from semantic
search. Database state survives worker/API service and engine recreation; no memory cache
or reference-repository runtime import is required.

`get_context_by_ids(course_id, chunk_ids, concept_id=None)` performs only exact database
lookup. It preserves requested order, deduplicates repeated IDs, omits missing/wrong-course/
wrong-concept IDs, validates file/course association, and projects authoritative citation
metadata. Authenticated routes establish course ownership before calling services; the
internal service accepts an authorized course UUID, not a user identity. Attempt grading
uses the Challenge's persisted evidence IDs, never semantic re-retrieval. Missing evidence
still fails closed with 409 and no mastery/XP update. Exact lookup works without embeddings.

## Configuration

Default `KNOWLEDGE_PROVIDER=mock` explicitly selects synthetic knowledge. No credentials
are needed to boot. To exercise real extraction/storage locally with fixture inference:

```dotenv
ENVIRONMENT=development
KNOWLEDGE_PROVIDER=questoriaa
EMBEDDING_PROVIDER=mock
```

This mode parses actual uploads but produces clearly labelled mock curriculum concepts
and lexical embeddings. It does **not** represent real AI analysis. To enable Qwen embeddings:

```dotenv
KNOWLEDGE_PROVIDER=questoriaa
EMBEDDING_PROVIDER=openai
EMBEDDING_BASE_URL=
EMBEDDING_API_KEY=
EMBEDDING_MODEL=Qwen/Qwen3-Embedding-0.6B
EMBEDDING_DIMENSION=1024
```

Fill the base URL (including `/v1` when required) and any endpoint credential locally.
Dimension is fixed to the schema's 1024. Mock embeddings are restricted to development/test.
Use identical embedding model/settings for ingestion and queries; changing embedding spaces
requires a new course and reingestion. There is no silent fallback after a provider failure.

Text inference remains the existing mock in development/test and UnavailableModelProvider
in production. `MODEL_*` alone does not yet select a real adapter. The next integration is
an OpenAI-compatible implementation of the **existing ModelProvider**, selected in
`create_model`, covering CourseDraft, TutorDraft, challenge verification and assessment
schemas with timeout/error/schema validation. Real production ingestion needs that adapter.
Local storage must be readable by both API and worker on the same shared filesystem; S3
storage, Clerk verification and deployment infrastructure are unchanged.

## Migration and manual Neon preflight

Migration `0002_chunk_embeddings.py` follows unchanged `0001`. On PostgreSQL it runs
`CREATE EXTENSION IF NOT EXISTS vector` and adds nullable `source_chunks.embedding
vector(1024)`. SQLite gets nullable JSON. The same unreleased 0002 also creates
`source_chunk_concepts(chunk_id, concept_id)` with a composite primary key and cascading
foreign keys to chunks and concepts. No existing rows are backfilled; legacy primary links
remain usable. Downgrade drops the association table before the embedding column (discarding
links and vectors), and leaves the potentially shared extension intact. No 0003 was added.

Before manually applying to Neon:

1. Review the generated PostgreSQL SQL and back up/snapshot the database. Confirm current
   revision is 0001 and the migration role can install the available `vector` extension.
2. Verify the target connection locally without exposing credentials; schedule the ALTER
   TABLE lock. No live Neon connection is part of automated verification.
3. Install backend dependencies and run `alembic -c backend/alembic.ini upgrade head`
   against the deliberately selected target, then `alembic ... check`. Run this manually.
4. Existing fixture knowledge remains unembedded and cannot be reprocessed under this
   policy. Create new courses for real ingestion; plan any old-data transition separately.
5. Test the chosen endpoint's vector size and semantic behavior on representative course
   materials, then verify pgvector retrieval and concurrency on a staging PostgreSQL database.

## Reference adaptation and scope

Read-only source: A/AJ's `adaptive-knowledge/backend/app/services/knowledge`.

| Reference component | Adaptation here |
| --- | --- |
| `pdf_extractor.py` | PyMuPDF page numbering and `clean_text` whitespace/dehyphenation |
| `pptx_extractor.py` | recursive shape text, table rows, speaker notes, slide numbering |
| `chunker.py` | `CODE_RE`, `is_code`, `split_long`, `to_units`; new location-local packing |
| `extractor.py` | grounded numbered-source prompt, application-assigned IDs, name cleanup/dedup, earlier-only prerequisite resolution; bounded nested draft replaces its multi-pass runner |
| `embedder.py` | batch size 16, 1024-dimension validation, L2 normalization, Qwen query instruction |
| `store.py` / `pipeline.py` | ChunkStore boundary, cosine retrieval, primary chunk association plus explicit shared evidence links, phased orchestration; database replaces process-local chunks/maps |

Cross-page/slide merging and aggressive boilerplate/fuzzy concept removal were not ported:
they can lose precise locations or merge valid subject content. The reference's provider,
tutor stack, disk caches, evaluation outputs, `.env`, model caches and tunnel settings were
not copied. OCR, image/diagram understanding, video/text-file ingestion, automatic retries,
incremental updates, large-document multi-pass analysis and semantic-quality evaluation
remain unsupported. Public source-type and challenge-mode enums remain unchanged.

Tests use generated PDF/PPTX bytes, mocked model/HTTP embedding responses and SQLite;
they cover persistence across engines, exact evidence, citations, ranking/scope, rollback,
reprocessing, skipped blank pages/slides with original numbering, shared-evidence learning,
association uniqueness/cascades, public OpenAPI contracts, migrations and PostgreSQL SQL compilation. They
do not establish live Neon behavior or real model accuracy.
