import { d as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_BTtRWRX2.mjs';
import 'piccolore';
import { T as Text, $ as $$AppShell } from '../../chunks/AppShell_DlUaiTou.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useRef, useEffect } from 'react';
export { renderers } from '../../renderers.mjs';

const ReactionTimeTest = () => {
  const [phase, setPhase] = useState("idle");
  const [reactionTime, setReactionTime] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveMessage, setSaveMessage] = useState(null);
  const startTimeRef = useRef(null);
  const timeoutIdRef = useRef(null);
  const clearPendingTimeout = () => {
    if (timeoutIdRef.current !== null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  };
  const scheduleReadyPhase = () => {
    const minDelay = 750;
    const maxDelay = 4750;
    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    clearPendingTimeout();
    timeoutIdRef.current = window.setTimeout(() => {
      startTimeRef.current = performance.now();
      setPhase("ready");
    }, delay);
  };
  const startGame = () => {
    setReactionTime(null);
    setIsSaving(false);
    setSaveStatus("idle");
    setSaveMessage(null);
    startTimeRef.current = null;
    setPhase("waiting");
    scheduleReadyPhase();
  };
  const handleClickArea = (event) => {
    event.preventDefault();
    if (phase === "idle" || phase === "result" || phase === "false_start") {
      startGame();
      return;
    }
    if (phase === "waiting") {
      clearPendingTimeout();
      startTimeRef.current = null;
      setReactionTime(null);
      setPhase("false_start");
      return;
    }
    if (phase === "ready" && startTimeRef.current !== null) {
      const endTime = performance.now();
      const diff = Math.round(endTime - startTimeRef.current);
      setReactionTime(diff);
      setPhase("result");
      setIsSaving(false);
      setSaveStatus("idle");
      setSaveMessage(null);
      return;
    }
  };
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== " " && event.key !== "Enter") {
        return;
      }
      if (phase === "idle" || phase === "result" || phase === "false_start") {
        event.preventDefault();
        startGame();
        return;
      }
      if (phase === "waiting") {
        event.preventDefault();
        clearPendingTimeout();
        startTimeRef.current = null;
        setReactionTime(null);
        setPhase("false_start");
        return;
      }
      if (phase === "ready" && startTimeRef.current !== null) {
        event.preventDefault();
        const endTime = performance.now();
        const diff = Math.round(endTime - startTimeRef.current);
        setReactionTime(diff);
        setPhase("result");
        setIsSaving(false);
        setSaveStatus("idle");
        setSaveMessage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase]);
  useEffect(() => {
    return () => {
      clearPendingTimeout();
    };
  }, []);
  const handleSaveScore = async () => {
    if (reactionTime == null || isSaving || phase !== "result") {
      return;
    }
    try {
      setIsSaving(true);
      setSaveStatus("idle");
      setSaveMessage(null);
      const response = await fetch("/api/games/reaction_test/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reaction_time_ms: reactionTime })
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
  const statusText = (() => {
    switch (phase) {
      case "idle":
        return "Kliknij w duży kafelek, aby rozpocząć i poczekaj na zielony ekran.";
      case "waiting":
        return "Poczekaj na zielony ekran… Nie klikaj jeszcze!";
      case "ready":
        return "Klikaj jak najszybciej! (klik lub spacja / Enter)";
      case "result":
        return reactionTime !== null ? `Twój czas reakcji: ${reactionTime} ms` : "Zagraj ponownie, aby zmierzyć swój czas reakcji.";
      case "false_start":
        return "Za wcześnie! Kliknąłeś zanim pojawił się zielony ekran.";
      default:
        return "";
    }
  })();
  const areaColors = (() => {
    if (phase === "waiting") {
      return "border-red-600 bg-red-900/70";
    }
    if (phase === "ready") {
      return "border-emerald-500 bg-emerald-700/80";
    }
    if (phase === "false_start") {
      return "border-yellow-500 bg-yellow-700/70";
    }
    if (phase === "result") {
      return "border-sky-500 bg-slate-900/80";
    }
    return "border-slate-700 bg-slate-900/70";
  })();
  const areaLabel = (() => {
    if (phase === "waiting") {
      return "Poczekaj na zielony…";
    }
    if (phase === "ready") {
      return "Kliknij mnie jak najszybciej!";
    }
    if (phase === "result" && reactionTime !== null) {
      return `${reactionTime} ms`;
    }
    if (phase === "false_start") {
      return "Za wcześnie!";
    }
    return "Start, kiedy będziesz gotowy.";
  })();
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-300", children: statusText }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400", children: "Zasada: poczekaj, aż ekran zmieni się z czerwonego na zielony. Kliknięcie wcześniej liczy się jako falstart." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: handleClickArea,
          className: `flex h-[28rem] w-full items-center justify-center rounded-2xl border-2 text-center text-lg font-semibold tracking-tight text-slate-50 shadow-lg shadow-slate-950/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${areaColors}`,
          children: /* @__PURE__ */ jsx("span", { children: areaLabel })
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400", children: "Ostatni wynik" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-50", children: reactionTime !== null ? `${reactionTime} ms` : "Brak pomiaru" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-end gap-2 text-right sm:flex-row sm:items-center sm:justify-end", children: [
          phase === "result" && reactionTime !== null && /* @__PURE__ */ jsx(
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

const ReactionTimeLeaderboard = () => {
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
          "/api/games/reaction_test/leaderboard?limit=10&period_days=7"
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
        /* @__PURE__ */ jsx(Text, { variant: "subtitle", className: "text-slate-100", children: "Tygodniowy ranking – najlepsze czasy reakcji" }),
        /* @__PURE__ */ jsx(Text, { variant: "body-small", children: "Liczy się Twój najlepszy wynik z ostatnich 7 dni. Jeden gracz może zająć tylko jedno miejsce w TOP 10." })
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
        /* @__PURE__ */ jsx("th", { className: "py-2 pr-4 text-right", children: "Czas reakcji" }),
        /* @__PURE__ */ jsx("th", { className: "hidden py-2 text-right text-xs sm:table-cell", children: "Data" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: data.items.map((item) => {
        const createdAt = new Date(item.created_at);
        const formattedDate = createdAt.toLocaleDateString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
        const formattedTime = item.reaction_time_ms ?? Number(item.score_value ?? 0);
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
              /* @__PURE__ */ jsxs("td", { className: "py-2 pr-4 text-right text-sm font-semibold text-sky-300", children: [
                formattedTime,
                " ms"
              ] }),
              /* @__PURE__ */ jsx("td", { className: "hidden py-2 text-right text-xs text-slate-400 sm:table-cell", children: formattedDate })
            ]
          },
          `${item.user_id}-${item.rank}-${item.created_at}`
        );
      }) })
    ] }) })
  ] });
};

const $$ReactionTest = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppShell", $$AppShell, {}, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mx-auto flex max-w-5xl flex-col gap-8"> <section class="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/60"> <header class="space-y-1"> <h1 class="text-2xl font-semibold tracking-tight text-slate-50">
Test czasu reakcji
</h1> <p class="text-sm text-slate-300">
Naciśnij w duży kafelek lub użyj spacji/Enter, aby jak najszybciej
          zareagować na zmianę koloru z czerwonego na zielony. Kliknięcie
          wcześniej liczy się jako falstart.
</p> </header> ${renderComponent($$result2, "ReactionTimeTest", ReactionTimeTest, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/macbook/Desktop/folder/dreary-disk/src/components/games/ReactionTimeTest.tsx", "client:component-export": "default" })} </section> ${renderComponent($$result2, "ReactionTimeLeaderboard", ReactionTimeLeaderboard, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/macbook/Desktop/folder/dreary-disk/src/components/games/ReactionTimeLeaderboard.tsx", "client:component-export": "default" })} </div> ` })}`;
}, "/Users/macbook/Desktop/folder/dreary-disk/src/pages/g/reaction_test.astro", void 0);

const $$file = "/Users/macbook/Desktop/folder/dreary-disk/src/pages/g/reaction_test.astro";
const $$url = "/g/reaction_test";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$ReactionTest,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
