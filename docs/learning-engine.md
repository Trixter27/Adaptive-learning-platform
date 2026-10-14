# Questoriaa Learning Engine v1

`AdaptiveLearningService` is the default `LearningService`, constructed in
`services/factories.py` with a database session, `ModelProvider`, and `LearningPolicy`.
FastAPI only supplies dependencies and owns persistence/transactions. KnowledgeService
continues to supply all course text; learning reads Attempt/Challenge history, not course
material. Game rewards remain in the platform's existing game service.

## Generation, verification, repetition

1. The route authorizes the course/concept, initializes mastery, and retrieves context
   through KnowledgeService. Citation metadata is resolved against persisted chunk/file
   records scoped to the same course/concept; retriever-supplied locations are replaced.
2. Difficulty is 1 below mastery 0.35, 2 from 0.35 to below 0.75, and 3 from 0.75.
   A student without attempts starts at the concept's difficulty capped at 2.
3. The service reads the latest 20 attempts for that user/concept and sends their prompts
   as exclusions alongside the concept, mastery, difficulty, allowed modes and context.
4. ModelProvider returns a neutral `ChallengeDraft`. The platform validates mode-specific
   content/key shapes, indices, permutations, finite numeric values, nonnegative tolerance,
   distinct options, concept/difficulty and cited IDs. Public content permits only fields
   defined for that mode, preventing extra answer-key fields from being serialized.
5. A separate structured `QuestionVerificationDraft` checks concept relevance, source
   answerability, supported key, internal consistency, exactly one correct MCQ option,
   and usable numerical answer/tolerance. Its evidence must be a non-empty subset of the
   draft's cited chunk IDs: the verifier may narrow evidence but cannot invent or add IDs.
   The Challenge persists only verifier-approved evidence. The service rejects any failed
   check or reported issue.
6. Invalid, unverified, or repeated drafts receive corrective context and regenerate,
   with **at most 3 generation attempts**. Only a successful draft becomes a persisted
   Challenge. Exhaustion returns `422 INVALID_CHALLENGE` and rolls back the request.

Prompt comparison uses Unicode NFKC normalization, case folding, punctuation removal,
and collapsed whitespace. This prevents obvious duplicates within the recent attempted
window, not all semantic paraphrases. Unattempted generated questions are not exclusions.
No embedding store, new column, or migration is needed.

## Mode contracts and grading

The request remains `{course_id, concept_id?}`; the provider chooses an appropriate mode
from the supplied context. The public Challenge response never includes `answer_key`.

| Mode | Public content | Private key | Student answer |
| --- | --- | --- | --- |
| mcq | `options: string[]` | `selected_option: int` | `{"selected_option": 0}` |
| matching | `left/right: string[]` | `matches: int[]` | `{"matches": [1, 0]}` |
| sequence | `items: string[]` | `order: int[]` | `{"order": [1, 2, 0]}` |
| short_answer | optional `hint` | `expected_answer: string` | `{"text": "..."}` |
| numerical | optional `unit` | `value: number, tolerance: number` | `{"value": 10.1}` |

Indices are zero-based. Matching maps each left item to a distinct right index and requires
equal list lengths. Sequence order is a permutation of all item indices. These modes use
exact deterministic comparison, with no model call during grading. Numerical grading uses
`abs(answer - target) <= tolerance` (inclusive absolute tolerance in the advertised unit),
using decimal comparison of finite numeric representations. Unit conversion is not included.
Malformed inputs, booleans as numbers/indices, and non-finite numbers are rejected.

Short answers use a structured `AssessmentDraft` with the prompt, private expected answer,
student response, source evidence, and passing score (default 0.80). Correctness must agree
with the score threshold. Unsupported source IDs or invented structured metadata reject
the assessment. No frontend correctness claim is accepted.

Deterministic grading quotes supporting source content for feedback and leaves misconception
null when the response does not establish one. Short-answer grading may identify a specific
misconception from the student's response; successful answers always return null. Models
provide only evidence IDs, never page/slide/timestamp fields. AssessmentResult adds an
optional/default-empty `sources: SourceReference[]`, built from authoritative database metadata.
Older stored assessment JSON remains valid. If a challenge's cited context is no longer
retrievable, assessment fails with `409 INVALID_CHALLENGE` instead of using unrelated text.

## Bayesian Knowledge Tracing

Mastery represents `P(learned)`. Defaults are initial prior **0.20**, guess **0.20**,
slip **0.10**, and learning transition **0.15**. The pure `bkt_update` function computes:

```text
correct:   posterior = p(1-slip) / [p(1-slip) + (1-p)guess]
incorrect: posterior = p·slip / [p·slip + (1-p)(1-guess)]
new mastery = posterior + (1-posterior)learn
```

Results are clamped to [0,1]; inputs/parameters are validated. From p=0.20, one correct
answer produces 0.60; one incorrect answer produces approximately 0.17576. The learning
transition can raise very low mastery even after an error: this is intentional BKT behavior.
Existing unattempted zero-prior rows use 0.20 when next assessed; historical nonempty mastery
is preserved as the prior. No prior scores are bulk rewritten. Scores from partial short-answer
grading become a binary observation at the passing threshold; there is no forgetting/time decay.

The route persists mastery, counters, and the current Attempt in the same transaction before
asking for the next action, so history includes the new answer. It then persists the chosen
action and applies the existing game reward. Each user may receive only one graded attempt
per challenge UUID. Under the existing course lock, the route checks for an earlier Attempt
before retrieving context or grading. Resubmission returns `409 INVALID_CHALLENGE` and leaves
mastery, attempt/correct counters, and XP unchanged. Further BKT observations require a new
challenge. This application-level guard adds no migration or database unique constraint.

Policy precedence, evaluated newest-first:

1. Three consecutive incorrect attempts → `review`.
2. Latest answer wrong and mastery below 0.35 → `remediate`.
3. Mastery at least 0.80 → `advance`.
4. Otherwise → `continue`.

These are recommendations; selecting a new concept, unlocking later chapters, and pacing
the game remain future platform/game work.

## Configuration and model integration

`LEARNING_MODE=adaptive` is the default. `LEARNING_MODE=mock` keeps the legacy fixed-increment
MCQ learner available in development/tests. Thresholds and limits are centralized in
`LearningPolicy`, configurable through nested settings such as `LEARNING__GUESS=0.20`,
`LEARNING__REVIEW_FAILURES=3`, `LEARNING__GENERATION_ATTEMPTS=3`, and
`LEARNING__MODEL_TIMEOUT_SECONDS=30`. See the policy class for all validated fields.

In development/test, `create_model` selects MockModelProvider. It generates a few generic
source-excerpt MCQs, performs fixture checks, and compares short answers literally. These
are deterministic integration fixtures, **not semantic AI verification**. All five modes
are supported by the adaptive orchestrator and exercised using explicit scripted providers
in tests; the default mock only generates MCQs. It fails cleanly when its prompt variants
are exhausted instead of manufacturing unlimited variants or source claims.

To plug in a real model, implement the existing ModelProvider protocol and select it in
`create_model`; generation, verification and short-answer grading share this adapter.
The neutral schemas live in `services/inference/schemas.py`. An adapter must honor the
provided output schema and return validated models. No Gemini dependency or external engine
integration is present. Production currently selects UnavailableModelProvider, so the API
boots without credentials but model calls return `503 MODEL_UNAVAILABLE`. Provider errors
and per-call timeouts also return a sanitized 503; there is no silent runtime mock fallback.

No migration is required: Challenge stores the private key and supporting IDs, Attempt stores
the assessment JSON, and MasteryState/GameState retain their existing schemas. Tests cover
the legacy adapter plus the adaptive course → concept → challenge → attempt → mastery → game
flow without external services. Real semantic accuracy and live PostgreSQL concurrency still
require integration evaluation with the selected provider/database.
