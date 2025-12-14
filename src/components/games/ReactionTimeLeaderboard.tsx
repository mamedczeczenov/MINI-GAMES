import type { FC } from "react";
import { useEffect, useState } from "react";
import type { LeaderboardDto } from "../../types";
import { Text } from "../ui/Typography";

interface State {
  data: LeaderboardDto | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}

const ReactionTimeLeaderboard: FC = () => {
  const [state, setState] = useState<State>({
    data: null,
    isLoading: true,
    isError: false,
    errorMessage: undefined,
  });
  const [nextRefreshAt, setNextRefreshAt] = useState<number | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number | null>(
    null,
  );

  useEffect(() => {
    let isCancelled = false;

    const REFRESH_INTERVAL_MS = 2 * 60 * 1000;

    const load = async () => {
      setState((prev) => ({
        ...prev,
        isLoading: !prev.data,
        isError: false,
        errorMessage: undefined,
      }));

      try {
        const response = await fetch(
          "/api/games/reaction_test/leaderboard?limit=10&period_days=7",
        );

        if (!response.ok) {
          let message =
            "Nie udało się załadować rankingu. Spróbuj ponownie później.";

          try {
            const json = (await response.json()) as {
              error?: { message?: string };
            };
            if (json?.error?.message) {
              message = json.error.message;
            }
          } catch {
            // Ignorujemy błąd parsowania – zostawiamy domyślny komunikat.
          }

          if (!isCancelled) {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              isError: true,
              errorMessage: message,
            }));
          }
          return;
        }

        const data = (await response.json()) as LeaderboardDto;

        if (!isCancelled) {
          setState({
            data,
            isLoading: false,
            isError: false,
            errorMessage: undefined,
          });
          setNextRefreshAt(Date.now() + REFRESH_INTERVAL_MS);
        }
      } catch {
        if (!isCancelled) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isError: true,
            errorMessage:
              "Nie udało się załadować rankingu. Sprawdź połączenie z internetem.",
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
        setSecondsUntilRefresh(Math.ceil(diffMs / 1000));
      }
    };

    update();
    const id = window.setInterval(update, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [nextRefreshAt]);

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/60">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <Text variant="subtitle" className="text-slate-100">
            Tygodniowy ranking – najlepsze czasy reakcji
          </Text>
          <Text variant="body-small">
            Liczy się Twój najlepszy wynik z ostatnich 7 dni. Jeden gracz może
            zająć tylko jedno miejsce w TOP 10.
          </Text>
        </div>
        <div className="text-right">
          <Text variant="caption">
            Odświeżanie co 2 minuty.
          </Text>
          <Text variant="body-small" className="text-slate-300">
            Następne odświeżenie za{" "}
            {secondsUntilRefresh != null ? `${secondsUntilRefresh}s` : "…"}
          </Text>
        </div>
      </header>

      {isLoading && (
        <Text variant="body-small">Ładowanie rankingu…</Text>
      )}

      {isError && !isLoading && (
        <Text variant="body-small" className="text-red-300">
          {errorMessage ??
            "Nie udało się załadować rankingu. Spróbuj ponownie później."}
        </Text>
      )}

      {!isLoading && !isError && (!data || data.items.length === 0) && (
        <Text variant="body-small">
          Brak zapisanych wyników w tym tygodniu. Zapisz swój pierwszy wynik, aby
          otworzyć tabelę!
        </Text>
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-100">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4">Miejsce</th>
                <th className="py-2 pr-4">Gracz</th>
                <th className="py-2 pr-4 text-right">Czas reakcji</th>
                <th className="hidden py-2 text-right text-xs sm:table-cell">
                  Data
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const createdAt = new Date(item.created_at);
                const formattedDate = createdAt.toLocaleDateString("pl-PL", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });

                const formattedTime =
                  item.reaction_time_ms ?? Number(item.score_value ?? 0);

                return (
                  <tr
                    key={`${item.user_id}-${item.rank}-${item.created_at}`}
                    className="border-b border-slate-800/60 last:border-0"
                  >
                    <td className="py-2 pr-4 text-xs font-semibold text-slate-300">
                      #{item.rank}
                    </td>
                    <td className="py-2 pr-4 text-sm font-medium">
                      {item.nick ?? "Gracz"}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-sky-300">
                      {formattedTime} ms
                    </td>
                    <td className="hidden py-2 text-right text-xs text-slate-400 sm:table-cell">
                      {formattedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ReactionTimeLeaderboard;


