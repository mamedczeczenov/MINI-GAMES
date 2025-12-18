import { d as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_BTtRWRX2.mjs';
import 'piccolore';
import { T as Text, $ as $$AppShell } from '../../chunks/AppShell_DlUaiTou.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useRef, useEffect } from 'react';
export { renderers } from '../../renderers.mjs';

const BOT_SYMBOL = "O";
const PLAYER_SYMBOL = "X";
const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [winsThisSession, setWinsThisSession] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveMessage, setSaveMessage] = useState(null);
  const botMoveTimeoutRef = useRef(null);
  const clearBotTimeout = () => {
    if (botMoveTimeoutRef.current !== null) {
      window.clearTimeout(botMoveTimeoutRef.current);
      botMoveTimeoutRef.current = null;
    }
  };
  useEffect(() => {
    return () => {
      clearBotTimeout();
    };
  }, []);
  const winningLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];
  const calculateWinner = (cells) => {
    for (const [a, b, c] of winningLines) {
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
        return cells[a];
      }
    }
    return null;
  };
  const isBoardFull = (cells) => {
    return cells.every((cell) => cell !== null);
  };
  const resetGame = () => {
    clearBotTimeout();
    setBoard(Array(9).fill(null));
    setPhase("idle");
    setResult(null);
    setIsSaving(false);
    setSaveStatus("idle");
    setSaveMessage(null);
  };
  const handlePlayerWin = () => {
    setWinsThisSession((prev) => prev + 1);
    void saveWin();
  };
  const saveWin = async () => {
    if (isSaving) {
      return;
    }
    try {
      setIsSaving(true);
      setSaveStatus("idle");
      setSaveMessage(null);
      const response = await fetch("/api/games/tic_tac_toe/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        // Każda wygrana to 1 punkt przeciwko botowi.
        body: JSON.stringify({ hits: 1 })
      });
      if (response.status === 401) {
        setSaveStatus("unauthorized");
        setSaveMessage("Zaloguj się, aby zapisywać swoje zwycięstwa w rankingu.");
        return;
      }
      if (!response.ok) {
        let message = "Nie udało się zapisać zwycięstwa. Spróbuj ponownie po chwili.";
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
        "Zwycięstwo zapisane! Sprawdź swoje miejsce w tabeli wyników poniżej."
      );
    } catch {
      setSaveStatus("error");
      setSaveMessage(
        "Nie udało się zapisać zwycięstwa. Sprawdź połączenie i spróbuj ponownie."
      );
    } finally {
      setIsSaving(false);
    }
  };
  const scheduleBotMove = (currentBoard) => {
    clearBotTimeout();
    botMoveTimeoutRef.current = window.setTimeout(() => {
      setBoard((prevBoard) => {
        const boardToUse = prevBoard === currentBoard ? prevBoard : prevBoard;
        const nextBoard = [...boardToUse];
        const botIndex = pickBotMove(nextBoard);
        if (botIndex === null) {
          return boardToUse;
        }
        nextBoard[botIndex] = BOT_SYMBOL;
        const winner = calculateWinner(nextBoard);
        if (winner === BOT_SYMBOL) {
          setResult("bot_win");
          setPhase("finished");
        } else if (isBoardFull(nextBoard)) {
          setResult("draw");
          setPhase("finished");
        } else {
          setPhase("player_turn");
        }
        return nextBoard;
      });
    }, 450);
  };
  const pickBotMove = (cells) => {
    const availableIndices = cells.map((cell, index) => cell === null ? index : null).filter((index) => index !== null);
    if (availableIndices.length === 0) {
      return null;
    }
    const shouldPlaySuboptimal = Math.random() < 0.25;
    const tryFindWinningMove = (symbol) => {
      for (const [a, b, c] of winningLines) {
        const line = [cells[a], cells[b], cells[c]];
        const indices = [a, b, c];
        const countSymbol = line.filter((v) => v === symbol).length;
        const countEmpty = line.filter((v) => v === null).length;
        if (countSymbol === 2 && countEmpty === 1) {
          const emptyIndexInLine = indices[line.findIndex((v) => v === null)];
          return emptyIndexInLine;
        }
      }
      return null;
    };
    if (!shouldPlaySuboptimal) {
      const winningMoveForBot = tryFindWinningMove(BOT_SYMBOL);
      if (winningMoveForBot !== null) {
        return winningMoveForBot;
      }
      const blockingMove = tryFindWinningMove(PLAYER_SYMBOL);
      if (blockingMove !== null) {
        return blockingMove;
      }
    }
    if (cells[4] === null) {
      return 4;
    }
    const corners = [0, 2, 6, 8].filter((index) => cells[index] === null);
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)] ?? corners[0];
    }
    return availableIndices[Math.floor(Math.random() * availableIndices.length)] ?? availableIndices[0];
  };
  const handleCellClick = (index) => {
    if (phase === "bot_turn" || phase === "finished") {
      return;
    }
    setBoard((prev) => {
      if (prev[index] !== null) {
        return prev;
      }
      const next = [...prev];
      next[index] = PLAYER_SYMBOL;
      const winner = calculateWinner(next);
      if (winner === PLAYER_SYMBOL) {
        setResult("player_win");
        setPhase("finished");
        handlePlayerWin();
        return next;
      }
      if (isBoardFull(next)) {
        setResult("draw");
        setPhase("finished");
        return next;
      }
      setPhase("bot_turn");
      scheduleBotMove(next);
      return next;
    });
    if (phase === "idle") {
      setPhase("player_turn");
    }
  };
  const statusText = (() => {
    if (phase === "finished") {
      switch (result) {
        case "player_win":
          return "Wygrałeś z botem! Każde zwycięstwo liczy się do tygodniowego rankingu.";
        case "bot_win":
          return "Tym razem bot wygrał. Spróbuj ponownie i spróbuj go ograć!";
        case "draw":
          return "Remis. Następnym razem spróbuj przechytrzyć bota i wygrać.";
        default:
          return "Runda zakończona.";
      }
    }
    if (phase === "bot_turn") {
      return "Ruch bota… Poczekaj chwilę na jego odpowiedź.";
    }
    if (phase === "player_turn") {
      return "Twoja tura. Postaraj się ułożyć trzy X w linii, zanim zrobi to bot.";
    }
    return "Kliknij w dowolne pole, aby rozpocząć grę. Grasz jako X przeciwko botowi (O).";
  })();
  const areaLabel = (() => {
    if (phase === "finished") {
      switch (result) {
        case "player_win":
          return "Wygrałeś!";
        case "bot_win":
          return "Bot wygrał.";
        case "draw":
          return "Remis.";
        default:
          return "Runda zakończona.";
      }
    }
    if (phase === "bot_turn") {
      return "Ruch bota…";
    }
    if (phase === "player_turn") {
      return "Twoja tura.";
    }
    return "Zacznij grę, klikając w dowolne pole.";
  })();
  const areaColors = (() => {
    if (phase === "bot_turn") {
      return "border-purple-500/80 bg-slate-900/80";
    }
    if (phase === "player_turn") {
      return "border-emerald-500/80 bg-slate-900/80";
    }
    if (phase === "finished") {
      if (result === "player_win") {
        return "border-emerald-400 bg-slate-900/80";
      }
      if (result === "bot_win") {
        return "border-red-500/80 bg-slate-900/80";
      }
      return "border-sky-500/80 bg-slate-900/80";
    }
    return "border-slate-700 bg-slate-900/70";
  })();
  const renderCell = (index) => {
    const value = board[index];
    const isDisabled = phase === "bot_turn" || phase === "finished";
    const handleClick = (event) => {
      event.preventDefault();
      if (isDisabled) {
        return;
      }
      handleCellClick(index);
    };
    const symbolClasses = value === PLAYER_SYMBOL ? "text-emerald-300" : value === BOT_SYMBOL ? "text-sky-300" : "text-slate-500";
    return /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: handleClick,
        disabled: isDisabled || value !== null,
        className: `flex aspect-square items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/60 text-4xl font-bold shadow-sm shadow-slate-950/60 transition hover:border-sky-400/80 hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${isDisabled || value !== null ? "cursor-default opacity-90" : ""}`,
        "aria-label": value ? `Pole zajęte przez ${value === PLAYER_SYMBOL ? "gracza" : "bota"}` : "Puste pole – kliknij, aby wykonać ruch",
        children: /* @__PURE__ */ jsx("span", { className: symbolClasses, children: value ?? "" })
      },
      index
    );
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-300", children: statusText }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400", children: "Zwycięstwa zapisujemy automatycznie po każdej wygranej rundzie. Ranking liczy łączną liczbę wygranych z ostatnich 7 dni – jeden gracz może zająć tylko jedno miejsce w TOP 10." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: `flex h-[32rem] w-full flex-col items-center justify-center rounded-2xl border-2 px-4 py-6 text-center text-lg font-semibold tracking-tight text-slate-50 shadow-lg shadow-slate-950/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${areaColors}`,
          "aria-label": areaLabel,
          children: [
            /* @__PURE__ */ jsx("div", { className: "mb-4 text-sm font-medium text-slate-200", children: areaLabel }),
            /* @__PURE__ */ jsx("div", { className: "mx-auto w-full max-w-xs", children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-2", children: Array.from({ length: 9 }, (_, index) => renderCell(index)) }) })
          ]
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "mt-2 flex flex-wrap items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400", children: "Twoje zwycięstwa (ta sesja)" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-50", children: winsThisSession })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: resetGame,
            className: "inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 shadow-sm shadow-slate-900/40 transition hover:bg-slate-800",
            children: "Nowa gra / Reset"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 flex flex-wrap items-center justify-end gap-3", children: saveStatus === "unauthorized" ? /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => {
            window.dispatchEvent(new Event("dreary:open-auth-modal"));
          },
          className: "max-w-xs text-left text-xs font-medium text-sky-300 underline underline-offset-2 hover:text-sky-200",
          children: "Zaloguj się, aby Twoje zwycięstwa liczyły się w rankingu."
        }
      ) : saveMessage && /* @__PURE__ */ jsx(
        "p",
        {
          className: `max-w-xs text-xs ${saveStatus === "success" ? "text-emerald-300" : "text-red-300"}`,
          children: saveMessage
        }
      ) })
    ] })
  ] });
};

const TicTacToeLeaderboard = () => {
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
          "/api/games/tic_tac_toe/leaderboard?limit=10&period_days=7"
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
        /* @__PURE__ */ jsx(Text, { variant: "subtitle", className: "text-slate-100", children: "Tygodniowy ranking – Kółko i krzyżyk (wygrane z botem)" }),
        /* @__PURE__ */ jsx(Text, { variant: "body-small", children: "Liczy się łączna liczba zwycięstw z ostatnich 7 dni. Jeden gracz może zająć tylko jedno miejsce w TOP 10 – im więcej wygranych, tym wyżej." })
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
    !isLoading && !isError && (!data || data.items.length === 0) && /* @__PURE__ */ jsx(Text, { variant: "body-small", children: "Brak zapisanych zwycięstw w tym tygodniu. Wygraj z botem, aby otworzyć tabelę!" }),
    !isLoading && !isError && data && data.items.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-3 overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "min-w-full text-left text-sm text-slate-100", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400", children: [
        /* @__PURE__ */ jsx("th", { className: "py-2 pr-4", children: "Miejsce" }),
        /* @__PURE__ */ jsx("th", { className: "py-2 pr-4", children: "Gracz" }),
        /* @__PURE__ */ jsx("th", { className: "py-2 pr-4 text-right", children: "Liczba zwycięstw" }),
        /* @__PURE__ */ jsx("th", { className: "hidden py-2 text-right text-xs sm:table-cell", children: "Ostatnie zwycięstwo" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: data.items.map((item) => {
        const createdAt = new Date(item.created_at);
        const formattedDate = createdAt.toLocaleDateString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
        const wins = Number(item.score_value ?? 0);
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
              /* @__PURE__ */ jsx("td", { className: "py-2 pr-4 text-right text-sm font-semibold text-sky-300", children: wins }),
              /* @__PURE__ */ jsx("td", { className: "hidden py-2 text-right text-xs text-slate-400 sm:table-cell", children: formattedDate })
            ]
          },
          `${item.user_id}-${item.rank}-${item.created_at}`
        );
      }) })
    ] }) })
  ] });
};

const $$TicTacToe = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppShell", $$AppShell, {}, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mx-auto flex max-w-5xl flex-col gap-8"> <section class="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/60"> <header class="space-y-1"> <h1 class="text-2xl font-semibold tracking-tight text-slate-50">
Kółko i krzyżyk – gra z botem
</h1> <p class="text-sm text-slate-300">
Zagraj klasyczne kółko i krzyżyk na planszy 3×3 przeciwko botowi.
          Każde Twoje zwycięstwo przeciwko botowi automatycznie liczy się do
          tygodniowego rankingu – im więcej wygranych w ostatnich 7 dniach, tym
          wyżej.
</p> </header> ${renderComponent($$result2, "TicTacToe", TicTacToe, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/macbook/Desktop/folder/dreary-disk/src/components/games/TicTacToe.tsx", "client:component-export": "default" })} </section> ${renderComponent($$result2, "TicTacToeLeaderboard", TicTacToeLeaderboard, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/macbook/Desktop/folder/dreary-disk/src/components/games/TicTacToeLeaderboard.tsx", "client:component-export": "default" })} </div> ` })}`;
}, "/Users/macbook/Desktop/folder/dreary-disk/src/pages/g/tic_tac_toe.astro", void 0);

const $$file = "/Users/macbook/Desktop/folder/dreary-disk/src/pages/g/tic_tac_toe.astro";
const $$url = "/g/tic_tac_toe";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$TicTacToe,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
