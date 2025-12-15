import type { FC, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

type GamePhase = "idle" | "waiting" | "ready" | "result" | "false_start";

/**
 * Mini gra sprawdzająca czas reakcji użytkownika.
 *
 * Fazy:
 * - idle: ekran startowy – kliknięcie w kafelek rozpoczyna grę
 * - waiting: czerwone tło, losowe opóźnienie 750–4750 ms, czekamy na zielony
 * - ready: zielone tło, mierzymy czas reakcji od pojawienia się przycisku/obszaru
 * - result: wyświetlamy wynik w ms
 * - false_start: użytkownik kliknął zanim pojawił się zielony
 */
const ReactionTimeTest: FC = () => {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "success" | "error" | "unauthorized"
  >("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Czas startu pomiaru reakcji
  const startTimeRef = useRef<number | null>(null);
  // Timeout odpowiedzialny za przejście z "waiting" -> "ready"
  const timeoutIdRef = useRef<number | null>(null);

  const clearPendingTimeout = () => {
    if (timeoutIdRef.current !== null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  };

  const scheduleReadyPhase = () => {
    // Losowe opóźnienie 750–4750 ms
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

  const handleClickArea = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (phase === "idle" || phase === "result" || phase === "false_start") {
      // Start nowej rundy bezpośrednio z kliknięcia w kafelek
      startGame();
      return;
    }

    if (phase === "waiting") {
      // Falstart – kliknięcie zanim pojawił się zielony ekran
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

  // Obsługa klawiatury (spacja / Enter) jako alternatywa do klikania
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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

  // Sprzątanie timeoutu przy odmontowaniu komponentu
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reaction_time_ms: reactionTime }),
      });

      if (response.status === 401) {
        setSaveStatus("unauthorized");
        setSaveMessage("Zaloguj się, aby zapisać swój wynik.");
        return;
      }

      if (!response.ok) {
        let message = "Nie udało się zapisać wyniku. Spróbuj ponownie.";

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
        "Wynik zapisany! Możesz sprawdzić swoje miejsce w tabeli wyników.",
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
        return reactionTime !== null
          ? `Twój czas reakcji: ${reactionTime} ms`
          : "Zagraj ponownie, aby zmierzyć swój czas reakcji.";
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-slate-300">{statusText}</p>
        <p className="text-xs text-slate-400">
          Zasada: poczekaj, aż ekran zmieni się z czerwonego na zielony. Kliknięcie
          wcześniej liczy się jako falstart.
        </p>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={handleClickArea}
          className={`flex h-[28rem] w-full items-center justify-center rounded-2xl border-2 text-center text-lg font-semibold tracking-tight text-slate-50 shadow-lg shadow-slate-950/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${areaColors}`}
        >
          <span>{areaLabel}</span>
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Ostatni wynik
            </p>
            <p className="text-sm font-medium text-slate-50">
              {reactionTime !== null ? `${reactionTime} ms` : "Brak pomiaru"}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right sm:flex-row sm:items-center sm:justify-end">
            {phase === "result" && reactionTime !== null && (
              <button
                type="button"
                onClick={handleSaveScore}
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-sky-900/60 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                {isSaving ? "Zapisywanie..." : "Zapisz wynik"}
              </button>
            )}
            {saveStatus === "unauthorized" ? (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new Event("dreary:open-auth-modal"));
                }}
                className="max-w-xs text-left text-xs font-medium text-sky-300 underline underline-offset-2 hover:text-sky-200"
              >
                Zaloguj się, aby zapisać swój wynik.
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
    </div>
  );
};

export default ReactionTimeTest;


