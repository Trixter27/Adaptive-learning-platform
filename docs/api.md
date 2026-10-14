# API v1

Base URL: `http://localhost:8000`. OpenAPI is `/openapi.json`; Swagger UI is `/docs`.
Domain endpoints use the configured auth adapter except the local PUT upload, where possession
of a valid unexpired signed URL authorizes the specific reserved object. Presign and completion
remain authenticated and ownership-protected; health/docs are public. Development
auth selects the fixed local user without a token. Error responses follow:

```json
{"error":{"code":"COURSE_NOT_FOUND","message":"The requested course does not exist.","details":{}}}
```

Common codes: `COURSE_NOT_FOUND` (404), `UNAUTHORIZED` (401), `INVALID_FILE_TYPE` (422),
`INVALID_CHALLENGE` (404/409/422), `MODEL_UNAVAILABLE` (503), `VALIDATION_ERROR` (422),
`INVALID_UPLOAD` (409/413/422), `FILE_NOT_FOUND`, `CONCEPT_NOT_FOUND`, `JOB_NOT_FOUND` (404).
Worker failures use status `failed` and a `PROCESSING_FAILED` error string on the job
rather than failing the previously accepted POST. Ownership violations return 404.

| Method | Route | Response |
| --- | --- | --- |
| GET | `/health` | status/version (200) |
| POST | `/api/v1/courses` | Course (201) |
| GET | `/api/v1/courses` | owned Course list (200) |
| GET | `/api/v1/courses/{course_id}` | Course (200) |
| DELETE | `/api/v1/courses/{course_id}` | cascades course data and deletes local objects (204) |
| POST | `/api/v1/uploads/presign` | UploadInfo (200) |
| PUT | `/api/v1/uploads/local/{object_key}` | local bytes upload using signed query parameters (204) |
| POST | `/api/v1/courses/{course_id}/files/complete` | CourseFile (200) |
| POST | `/api/v1/courses/{course_id}/process` | ProcessingJob (202); optional `{file_id}` |
| GET | `/api/v1/jobs/{job_id}` | ProcessingJob (200) |
| GET | `/api/v1/courses/{course_id}/map` | CourseMap (200); empty until processed |
| GET | `/api/v1/concepts/{concept_id}` | Concept (200) |
| POST | `/api/v1/tutor/chat` | TutorResponse (200) |
| POST | `/api/v1/challenges/next` | Challenge (201) |
| POST | `/api/v1/attempts` | AssessmentResult (200) |
| GET | `/api/v1/courses/{course_id}/progress` | ProgressResponse (200) |
| GET | `/api/v1/courses/{course_id}/game` | GameState (200) |

## Runnable PowerShell demo

Start the migrated API and polling worker as in README, then:

```powershell
$base = "http://localhost:8000"
$course = Invoke-RestMethod "$base/api/v1/courses" -Method Post -ContentType "application/json" -Body '{"title":"Study skills","description":"Demo course"}'
$uploadBody = @{course_id=$course.id; filename="notes.txt"; source_type="text"; content_type="text/plain"; size_bytes=5} | ConvertTo-Json
$upload = Invoke-RestMethod "$base/api/v1/uploads/presign" -Method Post -ContentType "application/json" -Body $uploadBody
Invoke-WebRequest ($base + $upload.upload_url) -Method Put -ContentType "text/plain" -Body ([System.Text.Encoding]::UTF8.GetBytes("hello"))
$completeBody = @{file_id=$upload.file_id} | ConvertTo-Json
Invoke-RestMethod "$base/api/v1/courses/$($course.id)/files/complete" -Method Post -ContentType "application/json" -Body $completeBody
$job = Invoke-RestMethod "$base/api/v1/courses/$($course.id)/process" -Method Post -ContentType "application/json" -Body $completeBody
do {
    Start-Sleep -Seconds 1
    $job = Invoke-RestMethod "$base/api/v1/jobs/$($job.id)"
} while ($job.status -in @("pending", "processing"))
if ($job.status -eq "failed") { throw $job.error }
$map = Invoke-RestMethod "$base/api/v1/courses/$($course.id)/map"
$challengeBody = @{course_id=$course.id} | ConvertTo-Json
$challenge = Invoke-RestMethod "$base/api/v1/challenges/next" -Method Post -ContentType "application/json" -Body $challengeBody
$attemptBody = @{challenge_id=$challenge.id; answer=@{selected_option=0}; time_taken_seconds=14} | ConvertTo-Json -Depth 5
Invoke-RestMethod "$base/api/v1/attempts" -Method Post -ContentType "application/json" -Body $attemptBody
$tutorBody = @{course_id=$course.id; message="What is active recall?"} | ConvertTo-Json
Invoke-RestMethod "$base/api/v1/tutor/chat" -Method Post -ContentType "application/json" -Body $tutorBody
Invoke-RestMethod "$base/api/v1/courses/$($course.id)/progress"
Invoke-RestMethod "$base/api/v1/courses/$($course.id)/game"
```

The upload step is optional for the mock course: `/process` also accepts no body or `{}`.
Mocks generate the fixture regardless of uploaded file type or content. Each process request
uses one active job per course. Rerunning completed processing is idempotent for the fixture.

## Example assessment

```json
{
  "correct": true,
  "score": 1.0,
  "feedback": "Correct. Supporting evidence: Active recall means retrieving information from memory instead of rereading notes.",
  "misconception": null,
  "mastery_before": 0.2,
  "mastery_after": 0.6,
  "next_action": "continue",
  "sources": [{
    "file_id": "00000000-0000-4000-8000-000000000001",
    "source_type": "text",
    "page_number": null,
    "slide_number": null,
    "start_seconds": null,
    "end_seconds": null
  }]
}
```

Tutor sources contain a real stored file UUID and source type; fixture text sources have
null page/slide/timestamps. Generated challenge content contains `options`, source_chunk_ids,
and no private answer key. Allowed modes are `mcq`, `matching`, `sequence`, `short_answer`,
and `numerical`. The adaptive learner supports all five; the local model mock generates MCQ
fixtures. The file UUID above is illustrative; actual feedback sources are resolved from the DB.
See [learning engine](learning-engine.md) for per-mode answer formats and grading behavior.

Generation returns `422 INVALID_CHALLENGE` after bounded verification/repetition retries;
missing supporting context returns 409. Provider errors/timeouts return `503 MODEL_UNAVAILABLE`.
These failures do not persist partial challenges, assessments, mastery or game rewards.
Submitting an already graded challenge again returns `409 INVALID_CHALLENGE` for that user;
request a new challenge for another learning observation. Rejected repeats do not change progress.
