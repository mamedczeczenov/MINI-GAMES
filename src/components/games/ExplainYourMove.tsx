import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { useExplainGame } from "../../lib/explain/game.state";
import type { Choice } from "../../services/explain/types";

type Mode = "menu" | "join" | "game";

export default function ExplainYourMove() {
  const [authState, setAuthState] = useState<{
    checked: boolean;
    userId?: string;
    token?: string;
    nickname?: string;
  }>({ checked: false });

  const { state, actions } = useExplainGame();
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [mode, setMode] = useState<Mode>("menu");

  // --------------------------- Auth bootstrap ------------------------------
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!mounted) return;

        if (res.status === 401) {
          setAuthState({ checked: true });
          return;
        }

        if (!res.ok) {
          console.error("[ExplainYourMove] Auth session error:", await res.text());
          setAuthState({ checked: true });
          return;
        }

        const data = (await res.json()) as {
          userId: string;
          nickname: string;
          accessToken: string;
        };

        setAuthState({
          checked: true,
          userId: data.userId,
          token: data.accessToken,
          nickname: data.nickname,
        });
      } catch (err) {
        console.error("[ExplainYourMove] Init auth error:", err);
        if (mounted) setAuthState({ checked: true });
      }
    };
    void init();
    return () => {
      mounted = false;
    };
  }, []);

  const isAuthenticated = useMemo(
    () => Boolean(authState.checked && authState.userId),
    [authState.checked, authState.userId],
  );

  // --------------------------- Actions -------------------------------------
  const handleCreateRoom = async () => {
    if (!isAuthenticated) {
      alert("Zaloguj się w górnym nagłówku, aby utworzyć pokój.");
      return;
    }
    try {
      const res = await fetch("/api/explain/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authState.userId,
          nickname: authState.nickname,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Nie udało się utworzyć pokoju");
        return;
      }
      const data = await res.json();
      
      // Wait for socket connection before joining room
      await actions.connect(authState.token!, data.roomCode);
      actions.joinRoom(data.roomCode, authState.userId!, authState.token!);
      setMode("game");
    } catch (err) {
      console.error("Create room error:", err);
      alert("Nie udało się utworzyć pokoju");
    }
  };

  const handleJoinRoom = async () => {
    if (!isAuthenticated) {
      alert("Zaloguj się w górnym nagłówku, aby dołączyć do pokoju.");
      return;
    }
    if (!roomCodeInput.trim()) {
      alert("Wpisz kod pokoju");
      return;
    }
    try {
      const code = roomCodeInput.toUpperCase();
      const res = await fetch(`/api/explain/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authState.userId,
          nickname: authState.nickname,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Nie udało się dołączyć do pokoju");
        return;
      }
      
      // Wait for socket connection before joining room
      await actions.connect(authState.token!, code);
      actions.joinRoom(code, authState.userId!, authState.token!);
      setMode("game");
    } catch (err) {
      console.error("Join room error:", err);
      alert("Nie udało się dołączyć do pokoju");
    }
  };

  // --------------------------- Layout shell -------------------------------
  const renderShell = (content: ReactNode, status: ReactNode) => (
    <div className="space-y-6">
      <div className="space-y-1 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-sm shadow-slate-950/40">
        {status}
        <p className="text-xs text-slate-400">
          Multiplayer z oceną AI • zaloguj się w górnym nagłówku, aby grać online.
        </p>
      </div>
      {content}
      {state.error && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-red-500 px-6 py-3 text-white shadow-lg">
          {state.error}
          <button
            onClick={actions.clearError}
            className="ml-4 font-bold"
            aria-label="Zamknij komunikat"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );

  // --------------------------- Modes --------------------------------------
  if (mode === "menu") {
    return renderShell(
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/70">
          <p className="text-sm text-slate-300">
            Wybierz, czy chcesz utworzyć nowy pokój czy dołączyć wpisując kod.
          </p>
          <p className="text-xs text-slate-400">
            Gra startuje, gdy są dwaj gracze. AI ocenia argumenty po każdej
            rundzie (3 rundy).
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={handleCreateRoom}
            className="h-40 rounded-2xl border-2 border-slate-700 bg-sky-500 px-6 py-4 text-left text-lg font-semibold text-slate-950 shadow-lg shadow-sky-900/60 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            🎮 Utwórz pokój
            <p className="mt-2 text-sm font-normal text-slate-900/80">
              Dostaniesz kod, którym zaprosisz drugiego gracza.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("join")}
            className="h-40 rounded-2xl border-2 border-slate-700 bg-emerald-500 px-6 py-4 text-left text-lg font-semibold text-slate-950 shadow-lg shadow-emerald-900/60 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            🔗 Dołącz do pokoju
            <p className="mt-2 text-sm font-normal text-slate-900/80">
              Wpisz 6-znakowy kod od znajomego i wejdź do gry.
            </p>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 shadow-sm shadow-slate-900/40 transition hover:bg-slate-800"
          >
            ← Wróć do menu
          </a>
          <p className="text-xs text-slate-500">
            Potrzebujesz dwóch graczy, aby rozpocząć rozgrywkę.
          </p>
        </div>
      </div>,
      <p className="text-sm text-slate-300">
        Explain Your Move — argumentacyjny multiplayer z oceną AI. Utwórz pokój
        lub dołącz i rozegraj 3 rundy.
      </p>,
    );
  }

  if (mode === "join") {
    return renderShell(
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/70">
          <p className="text-sm text-slate-300">
            Wpisz 6-znakowy kod, który otrzymałeś. Gra ruszy, gdy dołączy drugi
            gracz.
          </p>
          <p className="text-xs text-slate-400">
            Kod bez znaków I, O, 0, 1. W razie braku kodu wróć i utwórz pokój.
          </p>
        </div>

        <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/70">
          <div className="w-full max-w-md space-y-4">
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="w-full rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-3 text-center text-2xl font-mono tracking-wider uppercase text-slate-100 placeholder-slate-500 focus:border-sky-400 focus:outline-none"
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleJoinRoom}
                className="flex-1 rounded-xl bg-sky-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-sky-900/60 transition hover:bg-sky-400"
              >
                Dołącz
              </button>
              <button
                onClick={() => setMode("menu")}
                className="flex-1 rounded-lg border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      </div>,
      <p className="text-sm text-slate-300">
        Dołącz do istniejącego pokoju wpisując kod od znajomego.
      </p>,
    );
  }

  // Game mode
  return renderShell(
    <div className="space-y-4">
      {renderGameScreen(state, actions)}
    </div>,
    <p className="text-sm text-slate-300">
      Rozgrywka w toku — 3 rundy: wybór A/B, uzasadnienie, ocena AI.
    </p>,
  );
}

// --------------------------- Screens ---------------------------------------
function renderGameScreen(state: any, actions: any) {
  switch (state.gameState) {
    case "WAITING":
      return <WaitingScreen roomCode={state.roomCode} />;
    case "COUNTDOWN":
      return <CountdownScreen seconds={state.countdownSeconds} />;
    case "CHOOSING_MOVE":
      return (
        <ChooseScreen
          scenario={state.scenario}
          round={state.currentRound}
          timeLeft={state.timeLeft}
          myChoice={state.myChoice}
          opponentChose={state.opponentChose}
          onChoose={actions.chooseOption}
        />
      );
    case "WRITING_REASON":
      return (
        <WritingScreen
          scenario={state.scenario}
          myChoice={state.myChoice}
          myReason={state.myReason}
          timeLeft={state.timeLeft}
          opponentSubmitted={state.opponentSubmitted}
          onReasonChange={actions.updateReason}
          onSubmit={actions.submitReason}
          onAutoSubmit={actions.autoSubmitReason}
        />
      );
    case "AI_JUDGING":
      return <JudgingScreen />;
    case "ROUND_RESULTS":
      return <ResultsScreen results={state.roundResults} />;
    case "GAME_OVER":
      return <GameOverScreen data={state.gameOverData} />;
    default:
      return (
        <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/70 p-6 text-center text-sm text-slate-200 shadow-lg shadow-slate-950/70">
          <div className="space-y-2">
            <div className="animate-pulse text-4xl">⏳</div>
            <p>Ładowanie gry...</p>
            <p className="text-xs text-slate-400">
              Proszę czekać, trwa inicjalizacja rozgrywki.
            </p>
          </div>
        </div>
      );
  }
}

function WaitingScreen({ roomCode }: { roomCode: string | null }) {
  const copyCode = () => {
    if (roomCode) {
      void navigator.clipboard.writeText(roomCode);
      alert("Kod skopiowany!");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/70">
        <p className="text-sm text-slate-300">
          Oczekiwanie na drugiego gracza. Udostępnij kod pokoju.
        </p>
        <p className="text-xs text-slate-400">
          Gra wystartuje automatycznie, gdy drugi gracz dołączy.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border-2 border-slate-700 bg-slate-900/70 p-8 text-center text-lg font-semibold text-slate-50 shadow-lg shadow-slate-950/70">
        <h2 className="text-2xl font-bold text-slate-50">Czekamy na gracza…</h2>
        {roomCode && (
          <>
            <div className="rounded-xl bg-slate-800/80 p-4">
              <p className="mb-2 text-sm text-slate-400">Kod pokoju:</p>
              <p className="text-4xl font-mono font-bold tracking-wider text-slate-50">
                {roomCode}
              </p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-lg bg-sky-500 px-6 py-3 font-semibold text-slate-950 shadow-sm shadow-sky-900/60 transition hover:bg-sky-400"
            >
              📋 Skopiuj kod
            </button>
          </>
        )}
        <div className="animate-pulse text-5xl">⏳</div>
      </div>
    </div>
  );
}

function CountdownScreen({ seconds }: { seconds: number | null }) {
  return (
    <div className="flex h-[28rem] w-full items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-900/70 p-6 text-center text-lg font-semibold text-slate-50 shadow-lg shadow-slate-950/70">
      <div className="space-y-3">
        <p className="text-sm text-slate-300">
          Obaj gracze gotowi. Pierwsza runda startuje za:
        </p>
        <div className="animate-pulse text-8xl font-bold text-slate-50">
          {seconds || 10}
        </div>
      </div>
    </div>
  );
}

function ChooseScreen({
  scenario,
  round,
  timeLeft,
  myChoice,
  opponentChose,
  onChoose,
}: {
  scenario: any;
  round: number;
  timeLeft: number;
  myChoice: Choice | null;
  opponentChose: boolean;
  onChoose: (choice: Choice) => void;
}) {
  if (!scenario) return null;

  const statusText = myChoice
    ? opponentChose
      ? "Obaj gracze wybrali. Za chwilę pisanie uzasadnień."
      : "Czekanie na wybór przeciwnika…"
    : "Wybierz opcję A lub B.";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/70">
        <p className="text-sm text-slate-300">{statusText}</p>
        <p className="text-xs text-slate-400">
          Runda {round}/3 • Pozostały czas: {timeLeft}s
        </p>
      </div>

      <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/70">
        <div className="mb-4 rounded-xl bg-slate-800/80 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
            {scenario.category}
          </p>
          <p className="text-base leading-relaxed text-slate-100">
            {scenario.situation}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <OptionCard
            label="A"
            title={scenario.optionA.label}
            desc={scenario.optionA.desc}
            selected={myChoice === "A"}
            disabled={!!myChoice}
            onClick={() => onChoose("A")}
          />
          <OptionCard
            label="B"
            title={scenario.optionB.label}
            desc={scenario.optionB.desc}
            selected={myChoice === "B"}
            disabled={!!myChoice}
            onClick={() => onChoose("B")}
          />
        </div>
      </div>
    </div>
  );
}

function OptionCard({
  label,
  title,
  desc,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  title: string;
  desc: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
        selected
          ? "border-4 border-emerald-400 bg-emerald-900/40"
          : "border-2 border-slate-600 bg-slate-800/60 hover:bg-slate-800"
      }`}
    >
      <div className="mb-2 text-3xl font-bold text-slate-50">{label}</div>
      <div className="mb-1 text-lg font-semibold text-slate-100">{title}</div>
      <div className="text-sm text-slate-400">{desc}</div>
    </button>
  );
}

function WritingScreen({
  scenario,
  myChoice,
  myReason,
  timeLeft,
  opponentSubmitted,
  onReasonChange,
  onSubmit,
  onAutoSubmit,
}: {
  scenario: any;
  myChoice: Choice;
  myReason: string;
  timeLeft: number;
  opponentSubmitted: boolean;
  onReasonChange: (val: string) => void;
  onSubmit: () => void;
  onAutoSubmit: () => void;
}) {
  const charCount = myReason.length;
  const minChars = 20;
  const maxChars = 500;
  const canSubmit = charCount >= minChars && charCount <= maxChars;

  // Auto-submit when time runs out
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (timeLeft === 0 && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      console.log('[WritingScreen] Auto-submitting reason due to timeout');
      onAutoSubmit();
    }
  }, [timeLeft, onAutoSubmit]);

  const statusText = opponentSubmitted
    ? "Przeciwnik już wysłał uzasadnienie. Dokończ i wyślij."
    : "Napisz uzasadnienie (min. 20 znaków, max. 500).";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/70">
        <p className="text-sm text-slate-300">{statusText}</p>
        <p className="text-xs text-slate-400">
          Wybrałeś {myChoice} • Pozostały czas: {timeLeft}s
        </p>
      </div>

      <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/70">
        {scenario && (
          <div className="mb-4 rounded-xl bg-slate-800/80 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
              {scenario.category}
            </p>
            <p className="mb-3 text-sm leading-relaxed text-slate-200">
              {scenario.situation}
            </p>
            <div className="mt-3 border-t border-slate-700 pt-3">
              <p className="mb-2 text-xs font-semibold text-slate-300">
                Twój wybór: <span className="text-lg font-bold text-emerald-400">{myChoice}</span>
              </p>
              <p className="text-sm font-semibold text-slate-100">
                {myChoice === "A" ? scenario.optionA.label : scenario.optionB.label}
              </p>
              <p className="text-xs text-slate-400">
                {myChoice === "A" ? scenario.optionA.desc : scenario.optionB.desc}
              </p>
            </div>
          </div>
        )}

        <textarea
          value={myReason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Wyjaśnij swoją decyzję (min. 20 znaków, max. 500)..."
          maxLength={maxChars}
          className="mb-4 min-h-[200px] w-full rounded-xl border-2 border-slate-600 bg-slate-800/80 p-4 text-slate-100 placeholder-slate-500 focus:border-sky-400 focus:outline-none"
        />

        <div className="mb-4 flex items-center justify-between text-sm">
          <span
            className={
              charCount < minChars ? "text-red-300" : "text-emerald-300"
            }
          >
            {charCount}/{maxChars} {charCount < minChars && `(min. ${minChars})`}
          </span>
          {opponentSubmitted && (
            <span className="text-slate-300">✓ Przeciwnik wysłał</span>
          )}
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`w-full rounded-xl px-6 py-4 font-semibold transition-all ${
            canSubmit
              ? "bg-sky-500 text-slate-950 shadow-sm shadow-sky-900/60 hover:bg-sky-400"
              : "cursor-not-allowed bg-slate-700 text-slate-400"
          }`}
        >
          {canSubmit ? "Wyślij uzasadnienie" : "Za krótkie uzasadnienie"}
        </button>
      </div>
    </div>
  );
}

function JudgingScreen() {
  return (
    <div className="flex h-[28rem] w-full items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-900/70 p-6 text-center text-lg font-semibold text-slate-50 shadow-lg shadow-slate-950/70">
      <div className="space-y-3">
        <div className="animate-bounce text-6xl">🤖</div>
        <h2 className="text-2xl font-bold text-slate-50">AI ocenia…</h2>
        <p className="text-sm text-slate-300">
          Analiza logiki, spójności i kreatywności argumentów.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <span className="h-3 w-3 animate-bounce rounded-full bg-sky-400" />
          <span
            className="h-3 w-3 animate-bounce rounded-full bg-sky-400"
            style={{ animationDelay: "0.1s" }}
          />
          <span
            className="h-3 w-3 animate-bounce rounded-full bg-sky-400"
            style={{ animationDelay: "0.2s" }}
          />
        </div>
      </div>
    </div>
  );
}

function ResultsScreen({ results }: { results: any }) {
  if (!results) return null;
  const isWinner = results.winner === "you";
  const isTie = results.winner === "tie";

  // Countdown timer for next round
  const [countdown, setCountdown] = useState(15);
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const statusText = isWinner
    ? "Gratulacje! Wygrałeś tę rundę."
    : isTie
      ? "Remis! AI uznało argumenty za równie dobre."
      : "Przeciwnik wygrał tę rundę.";

  const isLastRound = results.roundWins.you + results.roundWins.opponent >= 2 || 
                      results.roundWins.you >= 2 || results.roundWins.opponent >= 2;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/70">
        <p className="text-sm text-slate-300">{statusText}</p>
        <p className="text-xs text-slate-400">
          {isLastRound 
            ? `Koniec gry za ${countdown}s` 
            : `Następna runda za ${countdown}s • Zobacz szczegóły oceny AI poniżej.`}
        </p>
      </div>

      <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/70">
        <h2 className="mb-4 text-center text-2xl font-bold">
          {isWinner && <span className="text-emerald-400">🎉 Wygrana</span>}
          {!isWinner && !isTie && <span className="text-red-400">Przegrana</span>}
          {isTie && <span className="text-yellow-400">🤝 Remis</span>}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <ScoreCard
            title="Twój wynik"
            scores={results.yourScores}
            total={results.yourTotal}
            feedback={results.yourFeedback}
          />
          <ScoreCard
            title="Przeciwnik"
            scores={results.opponentScores}
            total={results.opponentTotal}
            feedback={results.opponentFeedback}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
          <span>Twoje wygrane: {results.roundWins.you}/3</span>
          <span>Wygrane przeciwnika: {results.roundWins.opponent}/3</span>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({
  title,
  scores,
  total,
  feedback,
}: {
  title: string;
  scores: { logic: number; coherence: number; creativity: number };
  total: number;
  feedback: string;
}) {
  return (
    <div className="rounded-xl bg-slate-800/80 p-5">
      <h3 className="mb-3 text-lg font-bold text-slate-50">{title}</h3>
      <div className="space-y-1 text-sm text-slate-200">
        <div className="flex justify-between">
          <span className="text-slate-400">Logika</span>
          <span className="font-semibold">{scores.logic}/10</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Spójność</span>
          <span className="font-semibold">{scores.coherence}/10</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Kreatywność</span>
          <span className="font-semibold">{scores.creativity}/10</span>
        </div>
        <div className="flex justify-between border-t border-slate-700 pt-2 text-base font-bold">
          <span>SUMA</span>
          <span>{total}</span>
        </div>
      </div>
      {feedback && (
        <p className="mt-2 text-xs italic text-slate-400">"{feedback}"</p>
      )}
    </div>
  );
}

function GameOverScreen({ data }: { data: any }) {
  if (!data) return null;
  const isWinner = data.winner === "you";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/70">
        <p className="text-sm text-slate-300">
          {isWinner
            ? "Gratulacje! Wygrałeś całą rozgrywkę."
            : "Rozgrywka zakończona. Spróbuj ponownie!"}
        </p>
        <p className="text-xs text-slate-400">
          Końcowy wynik: {data.roundWins.you} - {data.roundWins.opponent}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-slate-700 bg-slate-900/70 p-8 text-center text-lg font-semibold text-slate-50 shadow-lg shadow-slate-950/70">
        <div className="text-7xl">{isWinner ? "🏆" : "😔"}</div>
        <h1 className="text-4xl font-bold">
          {isWinner ? "ZWYCIĘSTWO!" : "Przegrana"}
        </h1>
        <p className="text-slate-300">
          Wynik: {data.finalScore.you} - {data.finalScore.opponent}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 shadow-sm shadow-slate-900/40 transition hover:bg-slate-800"
        >
          ← Wróć do menu
        </a>
        <a
          href="/g/explain_your_move"
          className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-sky-900/60 transition hover:bg-sky-400"
        >
          🔄 Zagraj ponownie
        </a>
      </div>
    </div>
  );
}