"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  Send,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import {
  api,
  friendlyApiError,
  sourceLabel,
  type AssessmentResult,
  type Challenge,
  type Concept,
  type GameState,
  type ProgressResponse,
  type SourceReference,
  type TutorResponse,
} from "@/lib/api";

type MatchingContent = { left?: string[]; right?: string[] };
type SequenceContent = { items?: string[] };

export default function ConceptQuestView({
  courseId,
  conceptId,
}: {
  courseId: string;
  conceptId: string;
}) {
  const [concept, setConcept] = useState<Concept | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [numberAnswer, setNumberAnswer] = useState("");
  const [matching, setMatching] = useState<number[]>([]);
  const [sequencePositions, setSequencePositions] = useState<number[]>([]);
  const [startedAt, setStartedAt] = useState(Date.now());

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [tutorMessage, setTutorMessage] = useState("");
  const [tutorBusy, setTutorBusy] = useState(false);
  const [tutorError, setTutorError] = useState("");
  const [tutorResponse, setTutorResponse] = useState<TutorResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [conceptData, progressData, gameData] = await Promise.all([
          api.getConcept(conceptId),
          api.getProgress(courseId),
          api.getGame(courseId),
        ]);

        if (!cancelled) {
          setConcept(conceptData);
          setProgress(progressData);
          setGame(gameData);
        }
      } catch (err) {
        if (!cancelled) setError(friendlyApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [courseId, conceptId]);

  const mastery = useMemo(
    () =>
      progress?.mastery.find((item) => item.concept_id === conceptId)
        ?.mastery_score ?? 0,
    [conceptId, progress],
  );

  function resetAnswers(next: Challenge) {
    setSelectedOption(null);
    setTextAnswer("");
    setNumberAnswer("");
    setAssessment(null);
    setStartedAt(Date.now());

    const matchingContent = next.content as MatchingContent;
    const sequenceContent = next.content as SequenceContent;
    setMatching(new Array(matchingContent.left?.length || 0).fill(-1));
    setSequencePositions(
      new Array(sequenceContent.items?.length || 0).fill(-1),
    );
  }

  async function generateChallenge() {
    setGenerating(true);
    setError("");

    try {
      const next = await api.nextChallenge(courseId, conceptId);
      setChallenge(next);
      resetAnswers(next);
    } catch (err) {
      setError(friendlyApiError(err));
    } finally {
      setGenerating(false);
    }
  }

  function answerPayload(): Record<string, unknown> | null {
    if (!challenge) return null;

    if (challenge.mode === "mcq") {
      return selectedOption === null
        ? null
        : { selected_option: selectedOption };
    }

    if (challenge.mode === "short_answer") {
      return textAnswer.trim() ? { text: textAnswer.trim() } : null;
    }

    if (challenge.mode === "numerical") {
      const value = Number(numberAnswer);
      return numberAnswer.trim() && Number.isFinite(value) ? { value } : null;
    }

    if (challenge.mode === "matching") {
      if (
        !matching.length ||
        matching.some((value) => value < 0) ||
        new Set(matching).size !== matching.length
      ) {
        return null;
      }
      return { matches: matching };
    }

    if (challenge.mode === "sequence") {
      if (
        !sequencePositions.length ||
        sequencePositions.some((value) => value < 0) ||
        new Set(sequencePositions).size !== sequencePositions.length
      ) {
        return null;
      }

      const order = sequencePositions
        .map((position, itemIndex) => ({ position, itemIndex }))
        .sort((a, b) => a.position - b.position)
        .map((item) => item.itemIndex);

      return { order };
    }

    return null;
  }

  async function submitAnswer() {
    if (!challenge) return;

    const answer = answerPayload();
    if (!answer) {
      setError("Complete the answer before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await api.submitAttempt(
        challenge.id,
        answer,
        (Date.now() - startedAt) / 1000,
      );
      setAssessment(result);

      const [progressData, gameData] = await Promise.all([
        api.getProgress(courseId),
        api.getGame(courseId),
      ]);
      setProgress(progressData);
      setGame(gameData);
    } catch (err) {
      setError(friendlyApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function askTutor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = tutorMessage.trim();
    if (!message) return;

    setTutorBusy(true);
    setTutorError("");

    try {
      const response = await api.tutor(courseId, conceptId, message);
      setTutorResponse(response);
      setTutorMessage("");
    } catch (err) {
      setTutorError(friendlyApiError(err));
    } finally {
      setTutorBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading concept…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1250px]">
      <Link
        href={"/courses/" + courseId}
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Course map
      </Link>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-5">
          <section className="app-panel p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pink">
                  Adaptive Quest · Difficulty {concept?.difficulty || 1}
                </div>
                <h1 className="mt-2 font-display text-3xl font-bold">
                  {concept?.name || "Concept"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                  {concept?.description}
                </p>
              </div>

              <div className="min-w-36 rounded-xl bg-bg p-4 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted">
                  Current mastery
                </div>
                <div className="mt-1 font-display text-2xl font-bold text-cyan">
                  {Math.round(mastery * 100)}%
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink to-cyan transition-all"
                    style={{ width: String(Math.round(mastery * 100)) + "%" }}
                  />
                </div>
              </div>
            </div>
          </section>

          {!challenge ? (
            <section className="app-panel flex min-h-80 flex-col items-center justify-center p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink/10 text-pink">
                <Sparkles className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold">
                Ready for an adaptive challenge?
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
                Questoriaa retrieves evidence from your course, generates a
                mastery-aware challenge, and verifies it before showing it.
              </p>
              <button
                type="button"
                onClick={() => void generateChallenge()}
                disabled={generating}
                className="btn-pink mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {generating ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {generating ? "Generating + verifying…" : "Generate Challenge"}
              </button>
            </section>
          ) : (
            <section className="app-panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan">
                  {challenge.mode.replace("_", " ")} · {challenge.xp_reward} XP
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-muted">
                  Difficulty {challenge.difficulty}
                </span>
              </div>

              <h2 className="mt-3 font-display text-xl font-semibold">
                {challenge.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text/90">
                {challenge.prompt}
              </p>

              <div className="mt-6">
                <ChallengeInput
                  challenge={challenge}
                  disabled={Boolean(assessment)}
                  selectedOption={selectedOption}
                  setSelectedOption={setSelectedOption}
                  textAnswer={textAnswer}
                  setTextAnswer={setTextAnswer}
                  numberAnswer={numberAnswer}
                  setNumberAnswer={setNumberAnswer}
                  matching={matching}
                  setMatching={setMatching}
                  sequencePositions={sequencePositions}
                  setSequencePositions={setSequencePositions}
                />
              </div>

              {!assessment && (
                <button
                  type="button"
                  onClick={() => void submitAnswer()}
                  disabled={submitting}
                  className="btn-pink mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {submitting ? "Evaluating…" : "Submit Answer"}
                </button>
              )}

              {assessment && (
                <div
                  className={
                    "mt-6 rounded-2xl border p-5 " +
                    (assessment.correct
                      ? "border-cyan/25 bg-cyan/5"
                      : "border-pink/25 bg-pink/5")
                  }
                >
                  <div className="flex items-center gap-3">
                    {assessment.correct ? (
                      <CheckCircle2 className="h-6 w-6 text-cyan" />
                    ) : (
                      <XCircle className="h-6 w-6 text-pink" />
                    )}
                    <div>
                      <div className="font-display text-lg font-semibold">
                        {assessment.correct
                          ? "Quest cleared"
                          : "Remediation recommended"}
                      </div>
                      <div className="text-xs text-muted">
                        Score {Math.round(assessment.score * 100)}% · Next action:{" "}
                        {assessment.next_action}
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-text/90">
                    {assessment.feedback}
                  </p>

                  {assessment.misconception && (
                    <p className="mt-3 text-xs text-pink">
                      Misconception: {assessment.misconception}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MasteryBox
                      label="Before"
                      value={assessment.mastery_before}
                    />
                    <MasteryBox
                      label="After"
                      value={assessment.mastery_after}
                      accent
                    />
                  </div>

                  <SourceList sources={assessment.sources} />

                  <button
                    type="button"
                    onClick={() => void generateChallenge()}
                    disabled={generating}
                    className="btn-ghost mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold"
                  >
                    {generating ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Next adaptive challenge
                  </button>
                </div>
              )}
            </section>
          )}

          {error && (
            <div className="rounded-xl border border-pink/25 bg-pink/5 p-4 text-sm text-pink">
              {error}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <section className="app-panel p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
                <Brain className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-semibold">AI Mentor · Aria</div>
                <div className="text-[10px] text-muted">
                  Source-grounded tutor
                </div>
              </div>
            </div>

            {tutorResponse ? (
              <div className="mt-4 rounded-xl bg-bg p-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cyan">
                  {tutorResponse.answer_type.replaceAll("_", " ")}
                </div>
                <p className="text-sm leading-relaxed text-text/90">
                  {tutorResponse.answer}
                </p>
                <SourceList sources={tutorResponse.sources} compact />
              </div>
            ) : (
              <p className="mt-4 text-xs leading-relaxed text-muted">
                Ask a question about this concept. Aria retrieves relevant
                course chunks and returns database-backed source locations.
              </p>
            )}

            <form onSubmit={askTutor} className="mt-4">
              <textarea
                value={tutorMessage}
                onChange={(event) => setTutorMessage(event.target.value)}
                placeholder="Explain this concept using my notes…"
                className="app-input min-h-24 w-full resize-none rounded-xl px-3 py-3 text-sm"
              />
              <button
                type="submit"
                disabled={tutorBusy || !tutorMessage.trim()}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan px-4 py-2.5 text-xs font-semibold text-bg disabled:opacity-50"
              >
                {tutorBusy ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {tutorBusy ? "Retrieving + answering…" : "Ask Aria"}
              </button>
            </form>

            {tutorError && (
              <p className="mt-3 text-xs text-pink">{tutorError}</p>
            )}
          </section>

          <section className="app-panel p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              Live game state
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="XP" value={String(game?.xp ?? 0)} accent="cyan" />
              <Metric label="Level" value={String(game?.level ?? 1)} accent="pink" />
            </div>
            <div className="mt-3 text-[11px] text-muted">
              Completed challenges: {game?.completed_challenges.length ?? 0}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ChallengeInput(props: {
  challenge: Challenge;
  disabled: boolean;
  selectedOption: number | null;
  setSelectedOption: (value: number) => void;
  textAnswer: string;
  setTextAnswer: (value: string) => void;
  numberAnswer: string;
  setNumberAnswer: (value: string) => void;
  matching: number[];
  setMatching: (value: number[]) => void;
  sequencePositions: number[];
  setSequencePositions: (value: number[]) => void;
}) {
  const { challenge, disabled } = props;

  if (challenge.mode === "mcq") {
    const options = Array.isArray(challenge.content.options)
      ? challenge.content.options.map(String)
      : [];

    return (
      <div className="grid gap-2">
        {options.map((option, index) => (
          <button
            key={option + "-" + String(index)}
            type="button"
            disabled={disabled}
            onClick={() => props.setSelectedOption(index)}
            className={
              "rounded-xl border p-4 text-left text-sm transition " +
              (props.selectedOption === index
                ? "border-pink/50 bg-pink/10 text-text"
                : "border-white/10 bg-bg text-muted hover:border-white/20 hover:text-text")
            }
          >
            <span className="mr-3 font-display font-bold text-pink">
              {String.fromCharCode(65 + index)}
            </span>
            {option}
          </button>
        ))}
      </div>
    );
  }

  if (challenge.mode === "short_answer") {
    const hint =
      typeof challenge.content.hint === "string" ? challenge.content.hint : "";

    return (
      <div>
        <textarea
          disabled={disabled}
          value={props.textAnswer}
          onChange={(event) => props.setTextAnswer(event.target.value)}
          placeholder="Write your answer in your own words…"
          className="app-input min-h-32 w-full resize-y rounded-xl px-4 py-3 text-sm"
        />
        {hint && <p className="mt-2 text-xs text-muted">Hint: {hint}</p>}
      </div>
    );
  }

  if (challenge.mode === "numerical") {
    const unit =
      typeof challenge.content.unit === "string" ? challenge.content.unit : "";

    return (
      <label className="block">
        <span className="text-xs text-muted">
          Your numerical answer {unit ? "(" + unit + ")" : ""}
        </span>
        <input
          disabled={disabled}
          inputMode="decimal"
          value={props.numberAnswer}
          onChange={(event) => props.setNumberAnswer(event.target.value)}
          placeholder="Enter a number"
          className="app-input mt-2 h-12 w-full rounded-xl px-4 text-sm"
        />
      </label>
    );
  }

  if (challenge.mode === "matching") {
    const content = challenge.content as MatchingContent;
    const left = content.left || [];
    const right = content.right || [];

    return (
      <div className="space-y-3">
        {left.map((item, index) => (
          <div
            key={item + "-" + String(index)}
            className="grid gap-2 rounded-xl bg-bg p-3 sm:grid-cols-[1fr_1fr] sm:items-center"
          >
            <div className="text-sm">{item}</div>
            <select
              disabled={disabled}
              value={props.matching[index] ?? -1}
              onChange={(event) => {
                const next = [...props.matching];
                next[index] = Number(event.target.value);
                props.setMatching(next);
              }}
              className="app-input h-10 rounded-lg px-3 text-sm"
            >
              <option value={-1}>Match with…</option>
              {right.map((value, rightIndex) => (
                <option
                  key={value + "-" + String(rightIndex)}
                  value={rightIndex}
                >
                  {value}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  const items = (challenge.content as SequenceContent).items || [];

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item + "-" + String(index)}
          className="grid gap-2 rounded-xl bg-bg p-3 sm:grid-cols-[1fr_140px] sm:items-center"
        >
          <div className="text-sm">{item}</div>
          <select
            disabled={disabled}
            value={props.sequencePositions[index] ?? -1}
            onChange={(event) => {
              const next = [...props.sequencePositions];
              next[index] = Number(event.target.value);
              props.setSequencePositions(next);
            }}
            className="app-input h-10 rounded-lg px-3 text-sm"
          >
            <option value={-1}>Position…</option>
            {items.map((_, position) => (
              <option key={position} value={position}>
                {position + 1}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function MasteryBox({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-bg p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted">
        Mastery {label}
      </div>
      <div
        className={
          "mt-1 font-display text-xl font-bold " +
          (accent ? "text-cyan" : "")
        }
      >
        {Math.round(value * 100)}%
      </div>
    </div>
  );
}

function SourceList({
  sources,
  compact = false,
}: {
  sources: SourceReference[];
  compact?: boolean;
}) {
  if (!sources.length) return null;

  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        Sources & citations
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {sources.map((source, index) => (
          <span
            key={source.file_id + "-" + String(index)}
            className="rounded-md border border-cyan/15 bg-cyan/5 px-2 py-1 text-[10px] text-cyan"
          >
            {sourceLabel(source)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "cyan" | "pink";
}) {
  return (
    <div className="rounded-xl bg-bg p-3">
      <div className="text-[10px] text-muted">{label}</div>
      <div
        className={
          "mt-1 font-display text-xl font-bold " +
          (accent === "cyan" ? "text-cyan" : "text-pink")
        }
      >
        {value}
      </div>
    </div>
  );
}
