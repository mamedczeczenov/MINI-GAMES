import { d as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_BTtRWRX2.mjs';
import 'piccolore';
import { T as Text, $ as $$AppShell } from '../../chunks/AppShell_DlUaiTou.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useRef, useEffect } from 'react';
export { renderers } from '../../renderers.mjs';

const TOTAL_DURATION_MS = 3e4;
const AimTrainer = () => {
  const [phase, setPhase] = useState("idle");
  const [hits, setHits] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(TOTAL_DURATION_MS);
  const [targetPosition, setTargetPosition] = useState({
    xPercent: 50,
    yPercent: 50
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveMessage, setSaveMessage] = useState(null);
  const endTimeRef = useRef(null);
  const timerIdRef = useRef(null);
  const clearTimer = () => {
    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  };
  const randomizeTargetPosition = () => {
    const min = 8;
    const max = 92;
    const xPercent = min + Math.random() * (max - min);
    const yPercent = min + Math.random() * (max - min);
    setTargetPosition({ xPercent, yPercent });
  };
  const setupTimerInterval = () => {
    clearTimer();
    timerIdRef.current = window.setInterval(() => {
      if (endTimeRef.current == null) {
        return;
      }
      const now = performance.now();
      const remaining = Math.max(0, endTimeRef.current - now);
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        clearTimer();
        endTimeRef.current = null;
        setPhase("finished");
      }
    }, 50);
  };
  const startGame = () => {
    setHits(0);
    setTimeLeftMs(TOTAL_DURATION_MS);
    setIsSaving(false);
    setSaveStatus("idle");
    setSaveMessage(null);
    endTimeRef.current = performance.now() + TOTAL_DURATION_MS;
    randomizeTargetPosition();
    setPhase("running");
    setupTimerInterval();
  };
  const resetGame = () => {
    clearTimer();
    endTimeRef.current = null;
    setHits(0);
    setTimeLeftMs(TOTAL_DURATION_MS);
    setPhase("idle");
    setIsSaving(false);
    setSaveStatus("idle");
    setSaveMessage(null);
  };
  const handleAreaClick = (event) => {
    event.preventDefault();
    if (phase === "idle" || phase === "finished") {
      startGame();
    }
  };
  const handleTargetClick = (event) => {
    event.preventDefault();
    if (phase !== "running" || timeLeftMs <= 0) {
      return;
    }
    setHits((prev) => prev + 1);
    randomizeTargetPosition();
  };
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);
  const formattedTimeLeft = (() => {
    const seconds = timeLeftMs / 1e3;
    const clamped = Math.max(0, Math.min(TOTAL_DURATION_MS / 1e3, seconds));
    return clamped.toFixed(1).replace(".", ",");
  })();
  const statusText = (() => {
    switch (phase) {
      case "idle":
        return "Kliknij w duży obszar gry, aby rozpocząć 30‑sekundowy trening celności.";
      case "running":
        return "Trafiaj w czerwone tarcze jak najszybciej – liczy się liczba trafień w 30 s.";
      case "finished":
        return `Koniec czasu! Twój wynik: ${hits} trafień. Zagraj ponownie lub zapisz wynik.`;
      default:
        return "";
    }
  })();
  const areaColors = (() => {
    if (phase === "running") {
      return "border-emerald-500 bg-slate-900/80";
    }
    if (phase === "finished") {
      return "border-sky-500 bg-slate-900/80";
    }
    return "border-slate-700 bg-slate-900/70";
  })();
  const handleSaveScore = async () => {
    if (hits <= 0 || isSaving || phase !== "finished") {
      return;
    }
    try {
      setIsSaving(true);
      setSaveStatus("idle");
      setSaveMessage(null);
      const response = await fetch("/api/games/aim_trainer/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ hits })
      });
      if (response.status === 401) {
        setSaveStatus("unauthorized");
        setSaveMessage("Zaloguj się, aby zapisać swój wynik.");
        return;
      }
      if (!response.ok) {
        let message = "Nie udało się zapisać wyniku. Spróbuj ponownie.";
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
        "Wynik zapisany! Możesz sprawdzić swoje miejsce w tabeli wyników."
      );
    } catch {
      setSaveStatus("error");
      setSaveMessage("Nie udało się zapisać wyniku. Spróbuj ponownie.");
    } finally {
      setIsSaving(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-300", children: statusText }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400", children: "Zasada: na ekranie zawsze jest jedna mała czerwona tarcza. Nie znika sama – musisz w nią kliknąć. Wynik to liczba trafień w 30 sekund." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: handleAreaClick,
          className: `relative flex h-[32rem] w-full items-center justify-center rounded-2xl border-2 text-center text-lg font-semibold tracking-tight text-slate-50 shadow-lg shadow-slate-950/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${areaColors}`,
          children: [
            (phase === "idle" || phase === "finished") && /* @__PURE__ */ jsx("span", { children: phase === "idle" ? "Kliknij tutaj, aby rozpocząć." : "Kliknij, aby zagrać ponownie." }),
            phase === "running" && /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: handleTargetClick,
                "aria-label": "Cel do trafienia",
                className: "absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-300 bg-red-500 shadow-md shadow-red-900/70 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300",
                style: {
                  left: `${targetPosition.xPercent}%`,
                  top: `${targetPosition.yPercent}%`
                }
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400", children: "Wynik rundy" }),
          /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-slate-50", children: [
            "Trafienia: ",
            hits
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1 text-right", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400", children: "Pozostały czas" }),
          /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium text-slate-50", children: [
            formattedTimeLeft,
            " s"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-2 flex flex-wrap items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: resetGame,
            className: "inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 shadow-sm shadow-slate-900/40 transition hover:bg-slate-800",
            children: "Reset"
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-end gap-2 text-right sm:flex-row sm:items-center sm:justify-end", children: [
          phase === "finished" && hits > 0 && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: handleSaveScore,
              disabled: isSaving,
              className: "inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-sky-900/60 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300",
              children: isSaving ? "Zapisywanie..." : "Zapisz wynik"
            }
          ),
          saveStatus === "unauthorized" ? /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => {
                window.dispatchEvent(new Event("dreary:open-auth-modal"));
              },
              className: "max-w-xs text-left text-xs font-medium text-sky-300 underline underline-offset-2 hover:text-sky-200",
              children: "Zaloguj się, aby zapisać swój wynik."
            }
          ) : saveMessage && /* @__PURE__ */ jsx(
            "p",
            {
              className: `max-w-xs text-xs ${saveStatus === "success" ? "text-emerald-300" : "text-red-300"}`,
              children: saveMessage
            }
          )
        ] })
      ] })
    ] })
  ] });
};

const AimTrainerLeaderboard = () => {
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
          "/api/games/aim_trainer/leaderboard?limit=10&period_days=7"
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
        /* @__PURE__ */ jsx(Text, { variant: "subtitle", className: "text-slate-100", children: "Tygodniowy ranking – Aim Trainer (liczba trafień)" }),
        /* @__PURE__ */ jsx(Text, { variant: "body-small", children: "Liczy się Twój najlepszy wynik z ostatnich 7 dni. Jeden gracz może zająć tylko jedno miejsce w TOP 10 – im więcej trafień w 30 sekund, tym wyżej." })
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
    !isLoading && !isError && (!data || data.items.length === 0) && /* @__PURE__ */ jsx(Text, { variant: "body-small", children: "Brak zapisanych wyników w tym tygodniu. Zapisz swój pierwszy wynik, aby otworzyć tabelę!" }),
    !isLoading && !isError && data && data.items.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-3 overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "min-w-full text-left text-sm text-slate-100", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400", children: [
        /* @__PURE__ */ jsx("th", { className: "py-2 pr-4", children: "Miejsce" }),
        /* @__PURE__ */ jsx("th", { className: "py-2 pr-4", children: "Gracz" }),
        /* @__PURE__ */ jsx("th", { className: "py-2 pr-4 text-right", children: "Liczba trafień" }),
        /* @__PURE__ */ jsx("th", { className: "hidden py-2 text-right text-xs sm:table-cell", children: "Data" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: data.items.map((item) => {
        const createdAt = new Date(item.created_at);
        const formattedDate = createdAt.toLocaleDateString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
        const hits = item.hits ?? Number(item.score_value ?? 0);
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
              /* @__PURE__ */ jsx("td", { className: "py-2 pr-4 text-right text-sm font-semibold text-sky-300", children: hits ?? 0 }),
              /* @__PURE__ */ jsx("td", { className: "hidden py-2 text-right text-xs text-slate-400 sm:table-cell", children: formattedDate })
            ]
          },
          `${item.user_id}-${item.rank}-${item.created_at}`
        );
      }) })
    ] }) })
  ] });
};

const $$AimTrainer = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppShell", $$AppShell, {}, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mx-auto flex max-w-5xl flex-col gap-8"> <section class="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/60"> <header class="space-y-1"> <h1 class="text-2xl font-semibold tracking-tight text-slate-50">
Aim Trainer – 30 sekund
</h1> <p class="text-sm text-slate-300">
Masz 30 sekund, aby trafić jak najwięcej małych czerwonych tarcz
          pojawiających się w losowych miejscach w dużym polu gry. Wynik to
          liczba trafień – im więcej, tym lepiej.
</p> </header> ${renderComponent($$result2, "AimTrainer", AimTrainer, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/macbook/Desktop/folder/dreary-disk/src/components/games/AimTrainer.tsx", "client:component-export": "default" })} </section> ${renderComponent($$result2, "AimTrainerLeaderboard", AimTrainerLeaderboard, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/macbook/Desktop/folder/dreary-disk/src/components/games/AimTrainerLeaderboard.tsx", "client:component-export": "default" })} </div> ` })}`;
}, "/Users/macbook/Desktop/folder/dreary-disk/src/pages/g/aim_trainer.astro", void 0);

const $$file = "/Users/macbook/Desktop/folder/dreary-disk/src/pages/g/aim_trainer.astro";
const $$url = "/g/aim_trainer";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$AimTrainer,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
