import { d as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_BTtRWRX2.mjs';
import 'piccolore';
import { T as Text, $ as $$AppShell } from '../../chunks/AppShell_DlUaiTou.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
export { renderers } from '../../renderers.mjs';

const ANSWER_ORDER = ["A", "B", "C", "D"];
const AiQuiz = () => {
  const [phase, setPhase] = useState("loading");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState(
    {}
  );
  const [errorMessage, setErrorMessage] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveMessage, setSaveMessage] = useState(null);
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
        let message = "Nie udało się wygenerować quizu. Spróbuj ponownie za chwilę.";
        try {
          const json = await response.json();
          if (json?.message) {
            message = json.message;
          }
        } catch {
        }
        throw new Error(message);
      }
      const data = await response.json();
      if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(
          "Usługa AI zwróciła nieprawidłowy format quizu. Spróbuj ponownie."
        );
      }
      const normalizedQuestions = data.questions.map((q, index) => ({
        ...q,
        id: index + 1
      }));
      const initialAnswers = {};
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
        error instanceof Error ? error.message : "Nie udało się wygenerować quizu. Spróbuj ponownie."
      );
      setPhase("error");
    }
  };
  useEffect(() => {
    void loadQuiz();
  }, []);
  const handleAnswerClick = (answer) => {
    if (phase !== "quiz") {
      return;
    }
    const currentQuestion2 = questions[currentIndex];
    if (!currentQuestion2) {
      return;
    }
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion2.id]: answer
    }));
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
  const allAnswered = totalQuestions > 0 && questions.every((q) => userAnswers[q.id] !== null && userAnswers[q.id] !== void 0);
  const saveScore = async (correctAnswers) => {
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ hits: correctAnswers })
      });
      if (response.status === 401) {
        setSaveStatus("unauthorized");
        setSaveMessage("Zaloguj się, aby Twój wynik liczył się w rankingu.");
        return;
      }
      if (!response.ok) {
        let message = "Nie udało się zapisać wyniku quizu. Spróbuj ponownie po chwili.";
        try {
          const json = await response.json();
          if (json?.error?.message) {
            message = json.error.message;
          }
        } catch {
        }
        setSaveStatus("error");
        setSaveMessage(message);
        return;
      }
      setSaveStatus("success");
      setSaveMessage(
        "Wynik zapisany! Sprawdź swoje miejsce w tabeli wyników poniżej."
      );
    } catch {
      setSaveStatus("error");
      setSaveMessage(
        "Nie udało się zapisać wyniku quizu. Sprawdź połączenie i spróbuj ponownie."
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
  const correctCount = phase === "summary" ? questions.reduce((acc, q) => {
    const userAnswer = userAnswers[q.id];
    if (userAnswer && userAnswer === q.correctAnswer) {
      return acc + 1;
    }
    return acc;
  }, 0) : 0;
  const percentage = phase === "summary" && totalQuestions > 0 ? Math.round(correctCount / totalQuestions * 100) : 0;
  const statusText = (() => {
    if (phase === "loading") {
      return "Generuję dla Ciebie nowy quiz z losowymi pytaniami…";
    }
    if (phase === "error") {
      return errorMessage ?? "Coś poszło nie tak podczas generowania quizu. Spróbuj ponownie.";
    }
    if (phase === "quiz") {
      return "Odpowiedz na 5 pytań wielokrotnego wyboru. Każde ma tylko jedną poprawną odpowiedź.";
    }
    if (phase === "summary") {
      return `Twój wynik: ${correctCount}/${totalQuestions} (${percentage}%)`;
    }
    return "";
  })();
  const currentQuestion = phase === "quiz" || phase === "summary" ? questions[currentIndex] ?? questions[0] : void 0;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-300", children: statusText }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400", children: "Quiz jest generowany na bieżąco przez AI i łączy pytania z różnych dziedzin – od podstawówki po „profesora”. Każde pytanie ma 4 odpowiedzi (A–D) i dokładnie jedna z nich jest poprawna." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      (phase === "loading" || phase === "error") && /* @__PURE__ */ jsx("div", { className: "flex h-[20rem] w-full items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-900/70 text-center text-sm text-slate-200 shadow-lg shadow-slate-950/70", children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx("p", { children: statusText }),
        phase === "error" && /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => {
              void loadQuiz();
            },
            className: "mt-2 inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm shadow-sky-900/60 transition hover:bg-sky-400",
            children: "Spróbuj ponownie"
          }
        )
      ] }) }),
      (phase === "quiz" || phase === "summary") && currentQuestion && /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border-2 border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/70", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-baseline justify-between gap-3", children: [
            /* @__PURE__ */ jsxs("p", { className: "text-xs font-medium uppercase tracking-wide text-slate-400", children: [
              "Pytanie ",
              currentQuestion.id,
              " z ",
              totalQuestions || 5
            ] }),
            phase === "summary" && /* @__PURE__ */ jsxs("p", { className: "text-xs font-medium text-slate-300", children: [
              "Twoja odpowiedź:",
              " ",
              userAnswers[currentQuestion.id] ?? "brak odpowiedzi"
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-base font-semibold text-slate-50", children: currentQuestion.question }),
          /* @__PURE__ */ jsx("div", { className: "mt-4 grid gap-2", children: ANSWER_ORDER.map((answerId) => {
            const label = currentQuestion.answers[answerId];
            if (!label) {
              return null;
            }
            const isUserAnswer = userAnswers[currentQuestion.id] === answerId;
            const isCorrect = currentQuestion.correctAnswer === answerId;
            const baseClasses = "flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";
            let stateClasses = "border-slate-700 bg-slate-800/80 hover:bg-slate-700/80";
            if (phase === "quiz" && isUserAnswer) {
              stateClasses = "border-sky-500 bg-sky-900/40 hover:bg-sky-900/60";
            }
            if (phase === "summary") {
              if (isCorrect) {
                stateClasses = "border-emerald-500 bg-emerald-900/40 hover:bg-emerald-900/60";
              } else if (isUserAnswer && !isCorrect) {
                stateClasses = "border-red-500 bg-red-900/40 hover:bg-red-900/60";
              } else {
                stateClasses = "border-slate-700 bg-slate-800/60 hover:bg-slate-800/80";
              }
            }
            return /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => {
                  if (phase === "quiz") {
                    handleAnswerClick(answerId);
                  }
                },
                className: `${baseClasses} ${stateClasses}`,
                disabled: phase !== "quiz",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border border-slate-500 text-xs font-semibold text-slate-100", children: answerId }),
                  /* @__PURE__ */ jsx("span", { className: "text-slate-100", children: label })
                ]
              },
              answerId
            );
          }) }),
          phase === "summary" && currentQuestion.explanation && /* @__PURE__ */ jsxs("p", { className: "mt-3 text-xs text-slate-300", children: [
            "Wyjaśnienie: ",
            currentQuestion.explanation
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: handlePrevQuestion,
                disabled: currentIndex === 0,
                className: "inline-flex items-center justify-center rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm shadow-slate-900/40 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50",
                children: "Poprzednie"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: handleNextQuestion,
                disabled: currentIndex >= (totalQuestions || 5) - 1,
                className: "inline-flex items-center justify-center rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm shadow-slate-900/40 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50",
                children: "Następne"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-end gap-2 text-right sm:flex-row sm:items-center sm:justify-end", children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400", children: phase === "quiz" ? "Po odpowiedzi na wszystkie pytania kliknij „Zakończ quiz”, aby zobaczyć wynik." : "Poniżej możesz zobaczyć, które odpowiedzi były poprawne." }),
            phase === "quiz" && /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: handleFinishQuiz,
                disabled: !allAnswered || isFinishing,
                className: "inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-sky-900/60 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300",
                children: isFinishing ? "Zakańczanie…" : "Zakończ quiz"
              }
            ),
            phase === "summary" && /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => {
                  void loadQuiz();
                },
                className: "inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 shadow-sm shadow-slate-900/40 transition hover:bg-slate-800",
                children: "Zagraj ponownie (nowy quiz)"
              }
            )
          ] })
        ] }),
        phase === "summary" && /* @__PURE__ */ jsxs("div", { className: "mt-4 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-200", children: [
          /* @__PURE__ */ jsxs("p", { className: "font-semibold", children: [
            "Twój wynik: ",
            correctCount,
            "/",
            totalQuestions,
            " (",
            percentage,
            "%)"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-slate-400", children: "Poniżej przełączaj się między pytaniami, aby zobaczyć, które odpowiedzi były poprawne i co zaznaczyłeś." })
        ] }),
        phase === "summary" && /* @__PURE__ */ jsx("div", { className: "mt-2 flex flex-wrap items-center justify-end gap-3", children: saveStatus === "unauthorized" ? /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => {
              window.dispatchEvent(new Event("dreary:open-auth-modal"));
            },
            className: "max-w-xs text-left text-xs font-medium text-sky-300 underline underline-offset-2 hover:text-sky-200",
            children: "Zaloguj się, aby Twoje wyniki liczyły się w rankingu."
          }
        ) : saveMessage && /* @__PURE__ */ jsx(
          "p",
          {
            className: `max-w-xs text-xs ${saveStatus === "success" ? "text-emerald-300" : "text-red-300"}`,
            children: saveMessage
          }
        ) })
      ] })
    ] })
  ] });
};

const QuizLeaderboard = () => {
  const [state, setState] = useState({
    data: null,
    isLoading: true,
    isError: false,
    errorMessage: void 0
  });
  const [nextRefreshAt, setNextRefreshAt] = useState(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(
    null
  );
  useEffect(() => {
    let isCancelled = false;
    const REFRESH_INTERVAL_MS = 2 * 60 * 1e3;
    const load = async () => {
      setState((prev) => ({
        ...prev,
        isLoading: !prev.data,
        isError: false,
        errorMessage: void 0
      }));
      try {
        const response = await fetch(
          "/api/games/ai_quiz/leaderboard?limit=10&period_days=7"
        );
        if (!response.ok) {
          let message = "Nie udało się załadować rankingu. Spróbuj ponownie później.";
          try {
            const json = await response.json();
            if (json?.error?.message) {
              message = json.error.message;
            }
          } catch {
          }
          if (!isCancelled) {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              isError: true,
              errorMessage: message
            }));
          }
          return;
        }
        const data2 = await response.json();
        if (!isCancelled) {
          setState({
            data: data2,
            isLoading: false,
            isError: false,
            errorMessage: void 0
          });
          setNextRefreshAt(Date.now() + REFRESH_INTERVAL_MS);
        }
      } catch {
        if (!isCancelled) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isError: true,
            errorMessage: "Nie udało się załadować rankingu. Sprawdź połączenie z internetem."
          }));
        }
      }
    };
    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, REFRESH_INTERVAL_MS);
    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);
  const { data, isLoading, isError, errorMessage } = state;
  useEffect(() => {
    if (nextRefreshAt == null) {
      setSecondsUntilRefresh(null);
      return;
    }
    const update = () => {
      const diffMs = nextRefreshAt - Date.now();
      if (diffMs <= 0) {
        setSecondsUntilRefresh(0);
      } else {
        setSecondsUntilRefresh(Math.ceil(diffMs / 1e3));
      }
    };
    update();
    const id = window.setInterval(update, 1e3);
    return () => {
      window.clearInterval(id);
    };
  }, [nextRefreshAt]);
  return /* @__PURE__ */ jsxs("section", { className: "mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/60", children: [
    /* @__PURE__ */ jsxs("header", { className: "mb-4 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Text, { variant: "subtitle", className: "text-slate-100", children: "Tygodniowy ranking – AI Quiz (skuteczność odpowiedzi)" }),
        /* @__PURE__ */ jsx(Text, { variant: "body-small", children: "Liczy się łączna liczba poprawnych odpowiedzi z ostatnich 7 dni. Jeden gracz może zająć tylko jedno miejsce w TOP 10 – im wyższa skuteczność (więcej poprawnych odpowiedzi na większej liczbie pytań), tym wyżej." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
        /* @__PURE__ */ jsx(Text, { variant: "caption", children: "Odświeżanie co 2 minuty." }),
        /* @__PURE__ */ jsxs(Text, { variant: "body-small", className: "text-slate-300", children: [
          "Następne odświeżenie za",
          " ",
          secondsUntilRefresh != null ? `${secondsUntilRefresh}s` : "…"
        ] })
      ] })
    ] }),
    isLoading && /* @__PURE__ */ jsx(Text, { variant: "body-small", children: "Ładowanie rankingu…" }),
    isError && !isLoading && /* @__PURE__ */ jsx(Text, { variant: "body-small", className: "text-red-300", children: errorMessage ?? "Nie udało się załadować rankingu. Spróbuj ponownie później." }),
    !isLoading && !isError && (!data || data.items.length === 0) && /* @__PURE__ */ jsx(Text, { variant: "body-small", children: "Brak zapisanych wyników w tym tygodniu. Ukończ quiz, aby otworzyć tabelę!" }),
    !isLoading && !isError && data && data.items.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-3 overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "min-w-full text-left text-sm text-slate-100", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400", children: [
        /* @__PURE__ */ jsx("th", { className: "py-2 pr-4", children: "Miejsce" }),
        /* @__PURE__ */ jsx("th", { className: "py-2 pr-4", children: "Gracz" }),
        /* @__PURE__ */ jsx("th", { className: "py-2 pr-4 text-right", children: "Skuteczność (poprawne odpowiedzi)" }),
        /* @__PURE__ */ jsx("th", { className: "hidden py-2 text-right text-xs sm:table-cell", children: "Data" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: data.items.map((item) => {
        const createdAt = new Date(item.created_at);
        const formattedDate = createdAt.toLocaleDateString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
        const hits = typeof item.hits === "number" ? item.hits : void 0;
        const totalQuestionsRaw = Number(item.score_value ?? 0);
        const totalQuestions = Number.isFinite(totalQuestionsRaw) ? totalQuestionsRaw : void 0;
        let label = "-";
        if (hits != null && totalQuestions != null && totalQuestions > 0) {
          const percent = hits / totalQuestions * 100;
          label = `${hits}/${totalQuestions} (${percent.toFixed(0)}%)`;
        }
        return /* @__PURE__ */ jsxs(
          "tr",
          {
            className: "border-b border-slate-800/60 last:border-0",
            children: [
              /* @__PURE__ */ jsxs("td", { className: "py-2 pr-4 text-xs font-semibold text-slate-300", children: [
                "#",
                item.rank
              ] }),
              /* @__PURE__ */ jsx("td", { className: "py-2 pr-4 text-sm font-medium", children: item.nick ?? "Gracz" }),
              /* @__PURE__ */ jsx("td", { className: "py-2 pr-4 text-right text-sm font-semibold text-sky-300", children: label }),
              /* @__PURE__ */ jsx("td", { className: "hidden py-2 text-right text-xs text-slate-400 sm:table-cell", children: formattedDate })
            ]
          },
          `${item.user_id}-${item.rank}-${item.created_at}`
        );
      }) })
    ] }) })
  ] });
};

const $$AiQuiz = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppShell", $$AppShell, {}, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mx-auto flex max-w-5xl flex-col gap-8"> <section class="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/60"> <header class="space-y-1"> <h1 class="text-2xl font-semibold tracking-tight text-slate-50">
AI Quiz – 5 pytań
</h1> <p class="text-sm text-slate-300">
Weź udział w krótkim quizie z losowymi pytaniami generowanymi przez AI.
          Pięć pytań, cztery odpowiedzi (A–D), dokładnie jedna poprawna. Tematyka
          jest specjalnie wymieszana – od prostych faktów po trudniejsze zagadki.
</p> </header> ${renderComponent($$result2, "AiQuiz", AiQuiz, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/macbook/Desktop/folder/dreary-disk/src/components/games/AiQuiz.tsx", "client:component-export": "default" })} </section> ${renderComponent($$result2, "QuizLeaderboard", QuizLeaderboard, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/macbook/Desktop/folder/dreary-disk/src/components/games/QuizLeaderboard.tsx", "client:component-export": "default" })} </div> ` })}`;
}, "/Users/macbook/Desktop/folder/dreary-disk/src/pages/g/ai_quiz.astro", void 0);

const $$file = "/Users/macbook/Desktop/folder/dreary-disk/src/pages/g/ai_quiz.astro";
const $$url = "/g/ai_quiz";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$AiQuiz,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
