# OpenAI-compatible ModelProvider

`MODEL_PROVIDER=mock|openai|unavailable` selects the canonical text provider through
`services/factories.py`. If omitted, the existing defaults remain: mock in development/test,
unavailable elsewhere. Explicit selection overrides that default. Mock and unavailable
selection never use the network. OpenAI selection creates an adapter without probing the
endpoint; missing configuration fails at inference with `503 MODEL_UNAVAILABLE`.

Configure locally for an Ollama/Qwen or other compatible endpoint:

```dotenv
MODEL_PROVIDER=openai
MODEL_BASE_URL=
MODEL_API_KEY=
MODEL_NAME=
MODEL_TIMEOUT_SECONDS=30
MODEL_MAX_ATTEMPTS=2
```

Set MODEL_BASE_URL to the endpoint's complete API base, including `/v1` when required.
Set MODEL_NAME to the exact served Qwen model name. MODEL_API_KEY is optional for endpoints
without authentication; otherwise it supplies the Bearer token. No URL/token is embedded
in source or examples. The endpoint must support POST `<base>/chat/completions` with the
usual choices/message/content response. This adapter uses existing async HTTPX; no extra
SDK or second provider interface is installed.

System/user/assistant roles are preserved. Tutor's internal context/chunk_id roles are
encoded as labelled JSON user data. Structured calls include the supplied JSON schema and
request `response_format={"type":"json_object"}`. Pydantic remains authoritative, including
custom challenge validators. Complete markdown fences and Qwen `<think>...</think>` blocks
are removed before validation; missing required fields are never invented. Invalid output
receives a bounded corrective retry with validation field paths/types, without echoing raw
response contents. Explicit response_format rejections (400/422 mentioning that parameter)
permit a schema-prompt-only retry. Other 4xx errors fail immediately, except rate limiting.

One shared attempt budget bounds validation retries, format fallback, transport failures,
429 and transient 5xx retries. MODEL_MAX_ATTEMPTS defaults to 2 and is limited to 1–3;
backoff is 0.25/0.5 seconds. MODEL_TIMEOUT_SECONDS defaults to 30 and bounds the complete
operation across all attempts (also sets HTTP timeouts). Learning's existing independent
timeout may cancel a request earlier. Empty responses and exhausted retries return
sanitized MODEL_UNAVAILABLE errors; raw upstream errors/output are suppressed in exception
chains. Cancellation propagates. No silent mock fallback occurs.

The existing knowledge hierarchy, challenge generation/verification, short-answer grading
and tutor consume this provider through their existing boundaries. Embeddings stay separate
under EMBEDDING_PROVIDER/EMBEDDING_* even if they share the same physical endpoint.

Manual smoke test, from the repository root after configuring `.env`:

```powershell
.\.venv\Scripts\python.exe backend/scripts/model_smoke.py
```

It makes one text and one structured call and prints only success/counts or sanitized
errors. It is not run by automated tests and does not access the database. Automated tests
use mocked HTTP responses, including existing tutor/learning/curriculum schemas; no external
model, network or Neon access is required.

Limits: text-only inference, no streaming/tool calls/media analysis; JSON mode does not
guarantee semantic correctness, and schema-prompt fallback depends on model compliance.
Output is capped at 4096 tokens per request; long curriculum outputs may fail validation
on truncation. Real endpoint compatibility and semantic accuracy need a manual smoke test
and representative evaluation. The reference project's chat request shape, JSON-object
mode, reasoning/fence cleanup and bounded corrective prompts informed this adapter; its
synchronous SDK wrapper, embedded model path and media/embedding stack were not copied.
