import type { FC, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

type Cell = "X" | "O" | null;

type GamePhase = "idle" | "player_turn" | "bot_turn" | "finished";

type GameResult = "player_win" | "bot_win" | "draw" | null;

const BOT_SYMBOL: Cell = "O";
const PLAYER_SYMBOL: Cell = "X";

/**
 * Mini gra „Kółko i krzyżyk” (3x3) – gracz vs bot.
 *
 * Zasady:
 * - Grasz jako X, bot gra jako O.
 * - Plansza 3x3, wygrywa ten, kto pierwszy ułoży trzy swoje symbole w linii.
 * - Po każdej wygranej gracza wynik jest automatycznie wysyłany do API
 *   `/api/games/tic_tac_toe/score` jako 1 zwycięstwo przeciwko botowi.
 * - Ranking opiera się na łącznej liczbie zwycięstw z ostatnich 7 dni.
 */
const TicTacToe: FC = () => {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [result, setResult] = useState<GameResult>(null);
  const [winsThisSession, setWinsThisSession] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "success" | "error" | "unauthorized"
  >("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const botMoveTimeoutRef = useRef<number | null>(null);

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

  const winningLines: number[][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const calculateWinner = (cells: Cell[]): Cell => {
    for (const [a, b, c] of winningLines) {
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
        return cells[a];
      }
    }
    return null;
  };

  const isBoardFull = (cells: Cell[]): boolean => {
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
          "Content-Type": "application/json",
        },
        // Każda wygrana to 1 punkt przeciwko botowi.
        body: JSON.stringify({ hits: 1 }),
      });

      if (response.status === 401) {
        setSaveStatus("unauthorized");
        setSaveMessage("Zaloguj się, aby zapisywać swoje zwycięstwa w rankingu.");
        return;
      }

      if (!response.ok) {
        let message =
          "Nie udało się zapisać zwycięstwa. Spróbuj ponownie po chwili.";

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
        "Zwycięstwo zapisane! Sprawdź swoje miejsce w tabeli wyników poniżej.",
      );
    } catch {
      setSaveStatus("error");
      setSaveMessage(
        "Nie udało się zapisać zwycięstwa. Sprawdź połączenie i spróbuj ponownie.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const scheduleBotMove = (currentBoard: Cell[]) => {
    clearBotTimeout();

    botMoveTimeoutRef.current = window.setTimeout(() => {
      setBoard((prevBoard) => {
        // Upewniamy się, że plansza nie zmieniła się radykalnie od czasu zaplanowania ruchu.
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

  const pickBotMove = (cells: Cell[]): number | null => {
    const availableIndices = cells
      .map((cell, index) => (cell === null ? index : null))
      .filter((index): index is number => index !== null);

    if (availableIndices.length === 0) {
      return null;
    }

    // Poziom „medium”: w większości przypadków bot gra sensownie,
    // ale czasami robi błąd, żeby dało się go ograć.
    const shouldPlaySuboptimal = Math.random() < 0.25;

    const tryFindWinningMove = (symbol: Cell): number | null => {
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
      // 1. Spróbuj wygrać, jeśli to możliwe.
      const winningMoveForBot = tryFindWinningMove(BOT_SYMBOL);
      if (winningMoveForBot !== null) {
        return winningMoveForBot;
      }

      // 2. Zablokuj wygraną gracza.
      const blockingMove = tryFindWinningMove(PLAYER_SYMBOL);
      if (blockingMove !== null) {
        return blockingMove;
      }
    }

    // 3. Centrum, jeśli wolne.
    if (cells[4] === null) {
      return 4;
    }

    // 4. Jeden z rogów.
    const corners = [0, 2, 6, 8].filter((index) => cells[index] === null);
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)] ?? corners[0];
    }

    // 5. Dowolne wolne pole.
    return (
      availableIndices[Math.floor(Math.random() * availableIndices.length)] ??
      availableIndices[0]
    );
  };

  const handleCellClick = (index: number) => {
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

  const renderCell = (index: number) => {
    const value = board[index];
    const isDisabled = phase === "bot_turn" || phase === "finished";

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (isDisabled) {
        return;
      }
      handleCellClick(index);
    };

    const symbolClasses =
      value === PLAYER_SYMBOL
        ? "text-emerald-300"
        : value === BOT_SYMBOL
          ? "text-sky-300"
          : "text-slate-500";

    return (
      // eslint-disable-next-line react/button-has-type
      <button
        key={index}
        onClick={handleClick}
        disabled={isDisabled || value !== null}
        className={`flex aspect-square items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/60 text-4xl font-bold shadow-sm shadow-slate-950/60 transition hover:border-sky-400/80 hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          isDisabled || value !== null ? "cursor-default opacity-90" : ""
        }`}
        aria-label={
          value
            ? `Pole zajęte przez ${value === PLAYER_SYMBOL ? "gracza" : "bota"}`
            : "Puste pole – kliknij, aby wykonać ruch"
        }
      >
        <span className={symbolClasses}>{value ?? ""}</span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-slate-300">{statusText}</p>
        <p className="text-xs text-slate-400">
          Zwycięstwa zapisujemy automatycznie po każdej wygranej rundzie. Ranking
          liczy łączną liczbę wygranych z ostatnich 7 dni – jeden gracz może
          zająć tylko jedno miejsce w TOP 10.
        </p>
      </div>

      <div className="space-y-4">
        <div
          className={`flex h-[32rem] w-full flex-col items-center justify-center rounded-2xl border-2 px-4 py-6 text-center text-lg font-semibold tracking-tight text-slate-50 shadow-lg shadow-slate-950/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${areaColors}`}
          aria-label={areaLabel}
        >
          <div className="mb-4 text-sm font-medium text-slate-200">
            {areaLabel}
          </div>

          <div className="mx-auto w-full max-w-xs">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }, (_, index) => renderCell(index))}
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Twoje zwycięstwa (ta sesja)
            </p>
            <p className="text-sm font-medium text-slate-50">
              {winsThisSession}
            </p>
          </div>

          <button
            type="button"
            onClick={resetGame}
            className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 shadow-sm shadow-slate-900/40 transition hover:bg-slate-800"
          >
            Nowa gra / Reset
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
          {saveStatus === "unauthorized" ? (
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event("dreary:open-auth-modal"));
              }}
              className="max-w-xs text-left text-xs font-medium text-sky-300 underline underline-offset-2 hover:text-sky-200"
            >
              Zaloguj się, aby Twoje zwycięstwa liczyły się w rankingu.
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
      </div>
    </div>
  );
};

export default TicTacToe;


