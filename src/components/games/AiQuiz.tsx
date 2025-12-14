import type { FC } from "react";
import { useEffect, useState } from "react";

type AnswerId = "A" | "B" | "C" | "D";

interface QuizQuestion {
  id: number;
  question: string;
  answers: Record<AnswerId, string>;
  correctAnswer: AnswerId;
  explanation?: string | null;
}

interface QuizResponseBody {
  questions: QuizQuestion[];
}

type QuizPhase = "loading" | "quiz" | "summary" | "error";

const ANSWER_ORDER: AnswerId[] = ["A", "B", "C", "D"];

const AiQuiz: FC = () => {
  const [phase, setPhase] = useState<QuizPhase>("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, AnswerId | null>>(
    {},
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "success" | "error" | "unauthorized"
  >("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const totalQuestions = questions.length;

  const loadQuiz = async () => {
    setPhase("loading");
    setErrorMessage(null);
    setQuestions([]);
    setUserAnswers({});
    setCurrentIndex(0);
    setIsSaving(false);
    setSaveStatus("idle");
    setSaveMessage(null);

    try {
      const response = await fetch("/api/ai/quiz");

      if (!response.ok) {
        let message =
          "Nie udało się wygenerować quizu. Spróbuj ponownie za chwilę.";

        try {
          const json = (await response.json()) as {
            message?: string;
            code?: string;
          };
          if (json?.message) {
            message = json.message;
          }
        } catch {
          // Ignorujemy błąd parsowania JSON – użyjemy domyślnego komunikatu.
        }

        throw new Error(message);
      }

      const data = (await response.json()) as QuizResponseBody;

      if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(
          "Usługa AI zwróciła nieprawidłowy format quizu. Spróbuj ponownie.",
        );
      }

      // Upewniamy się, że mamy stabilne ID pytań (1..N), niezależnie od tego, co zwróci AI.
      const normalizedQuestions = data.questions.map((q, index) => ({
        ...q,
        id: index + 1,
      }));

      const initialAnswers: Record<number, AnswerId | null> = {};
      for (const q of normalizedQuestions) {
        initialAnswers[q.id] = null;
      }

      setQuestions(normalizedQuestions);
      setUserAnswers(initialAnswers);
      setCurrentIndex(0);
      setPhase("quiz");
    } catch (error) {
      console.error("Failed to load AI quiz:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nie udało się wygenerować quizu. Spróbuj ponownie.",
      );
      setPhase("error");
    }
  };

  useEffect(() => {
    void loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswerClick = (answer: AnswerId) => {
    if (phase !== "quiz") {
      return;
    }

    const currentQuestion = questions[currentIndex];

    if (!currentQuestion) {
      return;
    }

    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));

    // Automatycznie przechodzimy do kolejnego pytania, jeśli istnieje.
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextQuestion = () => {
    setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1));
  };

  const allAnswered =
    totalQuestions > 0 &&
    questions.every((q) => userAnswers[q.id] !== null && userAnswers[q.id] !== undefined);

  const saveScore = async (correctAnswers: number) => {
    if (isSaving || totalQuestions <= 0) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveStatus("idle");
      setSaveMessage(null);

      const response = await fetch("/api/games/ai_quiz/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hits: correctAnswers }),
      });

      if (response.status === 401) {
        setSaveStatus("unauthorized");
        setSaveMessage("Zaloguj się, aby Twój wynik liczył się w rankingu.");
        return;
      }

      if (!response.ok) {
        let message =
          "Nie udało się zapisać wyniku quizu. Spróbuj ponownie po chwili.";

        try {
          const json = (await response.json()) as {
            error?: { message?: string };
          };
          if (json?.error?.message) {
            message = json.error.message;
          }
        } catch {
          // Ignorujemy błąd parsowania JSON – użyjemy domyślnego komunikatu.
        }

        setSaveStatus("error");
        setSaveMessage(message);
        return;
      }

      setSaveStatus("success");
      setSaveMessage(
        "Wynik zapisany! Sprawdź swoje miejsce w tabeli wyników poniżej.",
      );
    } catch {
      setSaveStatus("error");
      setSaveMessage(
        "Nie udało się zapisać wyniku quizu. Sprawdź połączenie i spróbuj ponownie.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishQuiz = () => {
    if (phase !== "quiz" || !allAnswered || isFinishing) {
      return;
    }

    setIsFinishing(true);

    const correctAnswers = questions.reduce((acc, q) => {
      const userAnswer = userAnswers[q.id];
      if (userAnswer && userAnswer === q.correctAnswer) {
        return acc + 1;
      }
      return acc;
    }, 0);

    setPhase("summary");
    void saveScore(correctAnswers).finally(() => {
      setIsFinishing(false);
    });
  };

  const correctCount =
    phase === "summary"
      ? questions.reduce((acc, q) => {
          const userAnswer = userAnswers[q.id];
          if (userAnswer && userAnswer === q.correctAnswer) {
            return acc + 1;
          }
          return acc;
        }, 0)
      : 0;

  const percentage =
    phase === "summary" && totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

  const statusText = (() => {
    if (phase === "loading") {
      return "Generuję dla Ciebie nowy quiz z losowymi pytaniami…";
    }
    if (phase === "error") {
      return (
        errorMessage ??
        "Coś poszło nie tak podczas generowania quizu. Spróbuj ponownie."
      );
    }
    if (phase === "quiz") {
      return "Odpowiedz na 5 pytań wielokrotnego wyboru. Każde ma tylko jedną poprawną odpowiedź.";
    }
    if (phase === "summary") {
      return `Twój wynik: ${correctCount}/${totalQuestions} (${percentage}%)`;
    }
    return "";
  })();

  const currentQuestion =
    phase === "quiz" || phase === "summary"
      ? questions[currentIndex] ?? questions[0]
      : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-slate-300">{statusText}</p>
        <p className="text-xs text-slate-400">
          Quiz jest generowany na bieżąco przez AI i łączy pytania z różnych
          dziedzin – od podstawówki po „profesora”. Każde pytanie ma 4 odpowiedzi
          (A–D) i dokładnie jedna z nich jest poprawna.
        </p>
      </div>

      <div className="space-y-4">
        {(phase === "loading" || phase === "error") && (
          <div className="flex h-[20rem] w-full items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-900/70 text-center text-sm text-slate-200 shadow-lg shadow-slate-950/70">
            <div className="space-y-2">
              <p>{statusText}</p>
              {phase === "error" && (
                <button
                  type="button"
                  onClick={() => {
                    void loadQuiz();
                  }}
                  className="mt-2 inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm shadow-sky-900/60 transition hover:bg-sky-400"
                >
                  Spróbuj ponownie
                </button>
              )}
            </div>
          </div>
        )}

        {(phase === "quiz" || phase === "summary") && currentQuestion && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/70">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Pytanie {currentQuestion.id} z {totalQuestions || 5}
                </p>
                {phase === "summary" && (
                  <p className="text-xs font-medium text-slate-300">
                    Twoja odpowiedź:{" "}
                    {userAnswers[currentQuestion.id] ?? "brak odpowiedzi"}
                  </p>
                )}
              </div>

              <p className="text-base font-semibold text-slate-50">
                {currentQuestion.question}
              </p>

              <div className="mt-4 grid gap-2">
                {ANSWER_ORDER.map((answerId) => {
                  const label = currentQuestion.answers[answerId];
                  if (!label) {
                    return null;
                  }

                  const isUserAnswer = userAnswers[currentQuestion.id] === answerId;
                  const isCorrect = currentQuestion.correctAnswer === answerId;

                  const baseClasses =
                    "flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

                  let stateClasses =
                    "border-slate-700 bg-slate-800/80 hover:bg-slate-700/80";

                  if (phase === "quiz" && isUserAnswer) {
                    stateClasses =
                      "border-sky-500 bg-sky-900/40 hover:bg-sky-900/60";
                  }

                  if (phase === "summary") {
                    if (isCorrect) {
                      stateClasses =
                        "border-emerald-500 bg-emerald-900/40 hover:bg-emerald-900/60";
                    } else if (isUserAnswer && !isCorrect) {
                      stateClasses =
                        "border-red-500 bg-red-900/40 hover:bg-red-900/60";
                    } else {
                      stateClasses =
                        "border-slate-700 bg-slate-800/60 hover:bg-slate-800/80";
                    }
                  }

                  return (
                    <button
                      key={answerId}
                      type="button"
                      onClick={() => {
                        if (phase === "quiz") {
                          handleAnswerClick(answerId);
                        }
                      }}
                      className={`${baseClasses} ${stateClasses}`}
                      disabled={phase !== "quiz"}
                    >
                      <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border border-slate-500 text-xs font-semibold text-slate-100">
                        {answerId}
                      </span>
                      <span className="text-slate-100">{label}</span>
                    </button>
                  );
                })}
              </div>

              {phase === "summary" && currentQuestion.explanation && (
                <p className="mt-3 text-xs text-slate-300">
                  Wyjaśnienie: {currentQuestion.explanation}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevQuestion}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm shadow-slate-900/40 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Poprzednie
                </button>
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  disabled={
                    currentIndex >= (totalQuestions || 5) - 1
                  }
                  className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm shadow-slate-900/40 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Następne
                </button>
              </div>

              <div className="flex flex-col items-end gap-2 text-right sm:flex-row sm:items-center sm:justify-end">
                <p className="text-xs text-slate-400">
                  {phase === "quiz"
                    ? "Po odpowiedzi na wszystkie pytania kliknij „Zakończ quiz”, aby zobaczyć wynik."
                    : "Poniżej możesz zobaczyć, które odpowiedzi były poprawne."}
                </p>

                {phase === "quiz" && (
                  <button
                    type="button"
                    onClick={handleFinishQuiz}
                    disabled={!allAnswered || isFinishing}
                    className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-sky-900/60 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                  >
                    {isFinishing ? "Zakańczanie…" : "Zakończ quiz"}
                  </button>
                )}

                {phase === "summary" && (
                  <button
                    type="button"
                    onClick={() => {
                      void loadQuiz();
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 shadow-sm shadow-slate-900/40 transition hover:bg-slate-800"
                  >
                    Zagraj ponownie (nowy quiz)
                  </button>
                )}
              </div>
            </div>

            {phase === "summary" && (
              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-200">
                <p className="font-semibold">
                  Twój wynik: {correctCount}/{totalQuestions} ({percentage}%)
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Poniżej przełączaj się między pytaniami, aby zobaczyć, które
                  odpowiedzi były poprawne i co zaznaczyłeś.
                </p>
              </div>
            )}

            {phase === "summary" && (
              <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
                {saveStatus === "unauthorized" ? (
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new Event("dreary:open-auth-modal"));
                    }}
                    className="max-w-xs text-left text-xs font-medium text-sky-300 underline underline-offset-2 hover:text-sky-200"
                  >
                    Zaloguj się, aby Twoje wyniki liczyły się w rankingu.
                  </button>
                ) : (
                  saveMessage && (
                    <p
                      className={`max-w-xs text-xs ${
                        saveStatus === "success"
                          ? "text-emerald-300"
                          : "text-red-300"
                      }`}
                    >
                      {saveMessage}
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiQuiz;


