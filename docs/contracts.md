# Shared domain contracts

Canonical machine-readable contracts: `backend/app/schemas/domain.py` and `/openapi.json`.
Persisted models live in `backend/app/models/domain.py`; provider-only structured output
is separate from public API responses. Generate frontend TypeScript types from OpenAPI.

All IDs are UUIDs; timestamps are timezone-aware UTC; API field names are snake_case.
Mastery and assessment scores range from 0 to 1. Concept/challenge difficulty is 1
(introductory), 2 (normal), or 3 (advanced). JSON fields permit mode-specific content.

| Contract | Fields / meaning | Owner |
| --- | --- | --- |
| User | id, clerk_user_id, created_at; no passwords | Platform |
| Course | id, user_id, title, description, created_at, updated_at | Platform |
| CourseFile | id, course_id, filename, source_type, object_key, content_type, size_bytes, upload_completed, created_at | Platform |
| ProcessingJob | id, course_id, optional file_id, status, stage, progress 0–100, error, created_at, started_at, completed_at | Platform |
| Chapter | id, course_id, title, order_index, nested topics | Knowledge |
| Topic | id, chapter_id, title, order_index, nested concepts | Knowledge |
| Concept | id, topic_id, name, description, difficulty | Knowledge |
| ConceptPrerequisite | concept_id, prerequisite_concept_id | Knowledge |
| SourceChunk | id, course_id, optional concept_id, content, source | Knowledge / Platform persistence |
| SourceReference | file_id, source_type, nullable page_number, slide_number, start_seconds, end_seconds | Platform resolves metadata |
| RetrievedChunk | chunk_id, course_id, optional concept_id, content, score, source | Knowledge → Learning |
| Challenge | id, concept_id, mode, title, prompt, difficulty, xp_reward, content, source_chunk_ids | Learning |
| AttemptRequest | challenge_id, answer dict, nonnegative time_taken_seconds | Frontend → Platform |
| Attempt | id, user_id, challenge_id, answer, time_taken_seconds, assessment, created_at | Platform |
| AssessmentResult | correct, score, feedback, optional misconception, mastery_before, mastery_after, next_action, optional/default-empty sources | Learning |
| MasteryState | user_id, concept_id, mastery_score, attempt_count, correct_count, last_updated | Learning / Platform persistence |
| Quest | id, course_id, optional chapter_id, title, description, challenge_ids | Game / Platform |
| GameState | course_id, optional current_chapter_id/current_concept_id, xp, level, completed_challenges, unlocked_chapter_ids | Game / Platform |
| TutorRequest | course_id, optional concept_id, message | Frontend |
| TutorResponse | answer, answer_type, sources | Knowledge / Platform |

Persisted prerequisite, mastery, game, quest and conversation/message records also have
UUID primary keys even when the public contract omits them. CourseMap adds `course_id`,
`chapters`, and `prerequisites`. Progress adds `course_id`, `mastery`, and `average_mastery`
(all concepts count in the denominator; concepts without mastery rows contribute zero;
initialized adaptive rows start at the learner prior, normally 0.20).

## Enumerations

- Source types: `pdf`, `pptx`, `video`, `image`, `text`.
- Challenge modes: `mcq`, `matching`, `sequence`, `short_answer`, `numerical`.
- Next actions: `continue`, `remediate`, `advance`, `review`.
- Tutor answer types: `source_backed`, `source_inferred`, `general_knowledge`.
- Processing statuses: `pending`, `processing`, `completed`, `failed`.
- Processing stages: `queued`, `extracting_content`, `analyzing_content`, `building_course`,
  `creating_embeddings`, `indexing`, `completed`.

Page and slide numbers are 1-based. Video timestamps are nonnegative seconds;
end_seconds requires start_seconds and cannot precede it. MCQ selected_option is 0-based.
GameState completed_challenges and unlocked_chapter_ids are UUID lists.

## Role 2 → Role 3 handoff

Role 2 provides persisted Concept records and `list[RetrievedChunk]` from
`KnowledgeService.retrieve_context(course_id, query, concept_id=None, top_k=8)`.
Chunks contain content and authoritative source references, and scores are normalized
to 0–1 for this shared contract. Role 3 consumes that context plus MasteryState to create
a Challenge, and the same source context to evaluate an answer. Role 3 returns assessment
and updated mastery through the LearningService interface. Platform persists challenge,
attempt, assessment, mastery, and game rewards within a transaction.

Service interfaces are in `services/*/base.py`. Learning generation returns an unpersisted
SQLAlchemy Challenge with a private `answer_key`; platform assigns its UUID on persistence.
Knowledge service owns graph writes using the injected session, leaving final transaction
completion to the worker. Future engine replacements must preserve these interfaces or agree
on a shared-contract change with Platform and Frontend first.

Providers return **chunk IDs**, never page/slide/timestamp metadata. TutorDraft contains
only answer and source_chunk_ids. Platform accepts IDs only from the course's retrieved
context and resolves SourceReference from the database. Unknown or fabricated IDs are
discarded. The mock tutor quotes fixture context; `source_backed` describes those fixture
sources, not uploaded course content. A future tutor should classify inferred answers
explicitly while keeping citation resolution on the platform side.

## Adaptive learning policy

AdaptiveLearningService is the normal adapter. Its `initial_mastery` property supplies the
prior for newly initialized state. It accepts all five modes, validates private keys, verifies
questions through ModelProvider, and rejects recent normalized prompt duplicates. Grading is
deterministic except for short answers. New internal drafts belong to the neutral inference
schema module and are not public OpenAPI contracts. See [Learning Engine v1](learning-engine.md)
for exact content/key/answer shapes and the BKT equations and configurable policy thresholds.

Assessment `sources` are resolved SourceReference values, not model-authored metadata.
The current Attempt is flushed before next-action recommendation, keeping correctness and
recent-history decisions consistent within the transaction. Only platform code awards XP.

## Legacy mock learning policy

Generated challenges are MCQ with four options; option 0 matches the concept definition.
The answer key is never exposed in the challenge schema. This legacy adapter supports MCQ only;
the adaptive adapter supports the remaining modes.
Correct answers add 0.2 mastery, incorrect answers subtract 0.1, clamped to 0–1.
Advance at 0.8; remediate below 0.2 after an attempt; otherwise continue. Correct completion
awards 20 XP once per challenge UUID, and level is `1 + xp // 100`. The platform rejects a
second graded attempt by the same user/challenge with HTTP 409; new observations require
new challenges. New challenges can award new XP; broader abuse prevention is future
work. The first chapter is unlocked; adaptive progression/unlock policy belongs to later work.
