import type { FC, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

type GamePhase = "idle" | "running" | "finished";

interface TargetPosition {
  xPercent: number;
  yPercent: number;
}

const TOTAL_DURATION_MS = 30_000;

/**
 * Mini gra Aim Trainer – 30 sekund na trafienie jak największej liczby małych tarcz.
 *
 * Fazy:
 * - idle: ekran startowy – kliknięcie w kafelek rozpoczyna grę
 * - running: aktywna gra – odliczanie 30 s, jedna mała tarcza pojawia się w losowych miejscach
 * - finished: czas się skończył – wyświetlamy łączną liczbę trafień
 */
const AimTrainer: FC = () => {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [hits, setHits] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(TOTAL_DURATION_MS);
  const [targetPosition, setTargetPosition] = useState<TargetPosition>({
    xPercent: 50,
    yPercent: 50,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "success" | "error" | "unauthorized"
  >("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const endTimeRef = useRef<number | null>(null);
  const timerIdRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  };

  const randomizeTargetPosition = () => {
    // Zakres 8–92%, aby tarcza nie była zbyt blisko krawędzi.
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

  const handleAreaClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (phase === "idle" || phase === "finished") {
      startGame();
    }
  };

  const handleTargetClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (phase !== "running" || timeLeftMs <= 0) {
      return;
    }

    setHits((prev) => prev + 1);
    randomizeTargetPosition();
  };

  // Sprzątanie timera przy odmontowaniu komponentu
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  const formattedTimeLeft = (() => {
    const seconds = timeLeftMs / 1000;
    const clamped = Math.max(0, Math.min(TOTAL_DURATION_MS / 1000, seconds));
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hits }),
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-slate-300">{statusText}</p>
        <p className="text-xs text-slate-400">
          Zasada: na ekranie zawsze jest jedna mała czerwona tarcza. Nie znika
          sama – musisz w nią kliknąć. Wynik to liczba trafień w 30 sekund.
        </p>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={handleAreaClick}
          className={`relative flex h-[32rem] w-full items-center justify-center rounded-2xl border-2 text-center text-lg font-semibold tracking-tight text-slate-50 shadow-lg shadow-slate-950/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${areaColors}`}
        >
          {(phase === "idle" || phase === "finished") && (
            <span>
              {phase === "idle"
                ? "Kliknij tutaj, aby rozpocząć."
                : "Kliknij, aby zagrać ponownie."}
            </span>
          )}

          {phase === "running" && (
            <button
              type="button"
              onClick={handleTargetClick}
              aria-label="Cel do trafienia"
              className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-300 bg-red-500 shadow-md shadow-red-900/70 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              style={{
                left: `${targetPosition.xPercent}%`,
                top: `${targetPosition.yPercent}%`,
              }}
            />
          )}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Wynik rundy
            </p>
            <p className="text-sm font-medium text-slate-50">
              Trafienia: {hits}
            </p>
          </div>

          <div className="space-y-1 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Pozostały czas
            </p>
            <p className="text-sm font-medium text-slate-50">
              {formattedTimeLeft} s
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={resetGame}
            className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 shadow-sm shadow-slate-900/40 transition hover:bg-slate-800"
          >
            Reset
          </button>

          <div className="flex flex-col items-end gap-2 text-right sm:flex-row sm:items-center sm:justify-end">
            {phase === "finished" && hits > 0 && (
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

export default AimTrainer;


