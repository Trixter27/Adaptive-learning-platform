export type SourceType = "pdf" | "pptx" | "video" | "image" | "text";
export type ChallengeMode = "mcq" | "matching" | "sequence" | "short_answer" | "numerical";
export type NextAction = "continue" | "remediate" | "advance" | "review";

export type Course = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type UploadInfo = {
  file_id: string;
  object_key: string;
  upload_url: string;
  method: string;
  headers: Record<string, string>;
  expires_in_seconds: number;
};

export type ProcessingJob = {
  id: string;
  course_id: string;
  file_id: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  stage:
    | "queued"
    | "extracting_content"
    | "analyzing_content"
    | "building_course"
    | "creating_embeddings"
    | "indexing"
    | "completed";
  progress: number;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type Concept = {
  id: string;
  topic_id: string;
  name: string;
  description: string;
  difficulty: 1 | 2 | 3;
};

export type Topic = {
  id: string;
  chapter_id: string;
  title: string;
  order_index: number;
  concepts: Concept[];
};

export type Chapter = {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  topics: Topic[];
};

export type CourseMap = {
  course_id: string;
  chapters: Chapter[];
  prerequisites: Array<{
    concept_id: string;
    prerequisite_concept_id: string;
  }>;
};

export type SourceReference = {
  file_id: string;
  source_type: SourceType;
  page_number: number | null;
  slide_number: number | null;
  start_seconds: number | null;
  end_seconds: number | null;
};

export type Challenge = {
  id: string;
  concept_id: string;
  mode: ChallengeMode;
  title: string;
  prompt: string;
  difficulty: 1 | 2 | 3;
  xp_reward: number;
  content: Record<string, unknown>;
  source_chunk_ids: string[];
};

export type AssessmentResult = {
  correct: boolean;
  score: number;
  feedback: string;
  misconception: string | null;
  mastery_before: number;
  mastery_after: number;
  next_action: NextAction;
  sources: SourceReference[];
};

export type MasteryState = {
  user_id: string;
  concept_id: string;
  mastery_score: number;
  attempt_count: number;
  correct_count: number;
  last_updated: string;
};

export type ProgressResponse = {
  course_id: string;
  mastery: MasteryState[];
  average_mastery: number;
};

export type GameState = {
  course_id: string;
  current_chapter_id: string | null;
  current_concept_id: string | null;
  xp: number;
  level: number;
  completed_challenges: string[];
  unlocked_chapter_ids: string[];
};

export type TutorResponse = {
  answer: string;
  answer_type: "source_backed" | "source_inferred" | "general_knowledge";
  sources: SourceReference[];
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(init?.method === "POST" ? 900_000 : 30_000),
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let code = "REQUEST_FAILED";
    let message = response.status === 401 ? "Your session has expired. Sign in again." :
      response.status === 502 || response.status === 504 ? "The API or model did not respond. Check the backend and model service, then retry." :
      `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      code = body?.error?.code || code;
      message = body?.error?.message || message;
    } catch {
      // Keep the safe fallback message when a non-JSON response is returned.
    }
    throw new ApiError(response.status, code, message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  listCourses: () => request<Course[]>("/api/v1/courses"),
  getCourse: (courseId: string) => request<Course>(`/api/v1/courses/${courseId}`),
  createCourse: (payload: { title: string; description?: string }) =>
    request<Course>("/api/v1/courses", {
      method: "POST",
      body: JSON.stringify({ title: payload.title, description: payload.description || "" }),
    }),
  presignUpload: (payload: {
    course_id: string;
    filename: string;
    source_type: SourceType;
    content_type: string;
    size_bytes: number;
  }) =>
    request<UploadInfo>("/api/v1/uploads/presign", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  uploadFile: async (upload: UploadInfo, file: File, contentType: string) => {
    const target = /^https?:\/\//i.test(upload.upload_url)
      ? upload.upload_url
      : `${API_BASE}${upload.upload_url.startsWith("/") ? "" : "/"}${upload.upload_url}`;
    const headers = new Headers(upload.headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", contentType);
    const response = await fetch(target, {
      method: upload.method || "PUT",
      headers,
      body: file,
      signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok) {
      throw new ApiError(response.status, "UPLOAD_FAILED", "The source file could not be uploaded.");
    }
  },
  completeUpload: (courseId: string, fileId: string) =>
    request(`/api/v1/courses/${courseId}/files/complete`, {
      method: "POST",
      body: JSON.stringify({ file_id: fileId }),
    }),
  processCourse: (courseId: string, fileId: string) =>
    request<ProcessingJob>(`/api/v1/courses/${courseId}/process`, {
      method: "POST",
      body: JSON.stringify({ file_id: fileId }),
    }),
  getJob: (jobId: string, signal?: AbortSignal) => request<ProcessingJob>(`/api/v1/jobs/${jobId}`, { signal }),
  getCourseMap: (courseId: string) => request<CourseMap>(`/api/v1/courses/${courseId}/map`),
  getConcept: (conceptId: string) => request<Concept>(`/api/v1/concepts/${conceptId}`),
  nextChallenge: (courseId: string, conceptId?: string) =>
    request<Challenge>("/api/v1/challenges/next", {
      method: "POST",
      body: JSON.stringify({ course_id: courseId, concept_id: conceptId || null }),
    }),
  submitAttempt: (challengeId: string, answer: Record<string, unknown>, timeTakenSeconds: number) =>
    request<AssessmentResult>("/api/v1/attempts", {
      method: "POST",
      body: JSON.stringify({
        challenge_id: challengeId,
        answer,
        time_taken_seconds: Math.max(0, Math.min(86400, timeTakenSeconds)),
      }),
    }),
  getProgress: (courseId: string) =>
    request<ProgressResponse>(`/api/v1/courses/${courseId}/progress`),
  getGame: (courseId: string) => request<GameState>(`/api/v1/courses/${courseId}/game`),
  tutor: (courseId: string, conceptId: string | null, message: string) =>
    request<TutorResponse>("/api/v1/tutor/chat", {
      method: "POST",
      body: JSON.stringify({ course_id: courseId, concept_id: conceptId, message }),
    }),
};

export function sourceLabel(source: SourceReference): string {
  if (source.page_number) return `PDF page ${source.page_number}`;
  if (source.slide_number) return `PowerPoint slide ${source.slide_number}`;
  if (source.start_seconds != null) {
    const start = Math.round(source.start_seconds);
    const end = source.end_seconds != null ? `–${Math.round(source.end_seconds)}s` : "";
    return `Video ${start}s${end}`;
  }
  return source.source_type.toUpperCase();
}

export function friendlyApiError(error: unknown): string {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "The request timed out. For an upload or answer submission, the server may still have completed it. Refresh progress before trying again.";
  }
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) {
    return "Could not reach the Questoriaa API. Check your connection and that the API service is running.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
