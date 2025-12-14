import { useCallback, useEffect, useState } from "react";
import type { GameDto, ListResponseDto } from "../types";
import type {
  HomeGameCardViewModel,
  HomeViewState,
} from "../viewModels/homeViewModels";
import { mapGamesListResponseToVM } from "../viewModels/homeViewModels";

export interface UseGamesListResult {
  games: HomeGameCardViewModel[] | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  refetch: () => void;
}

const DEFAULT_ERROR_MESSAGE =
  "Nie udało się załadować listy gier. Spróbuj ponownie.";

async function fetchGamesFromApi(): Promise<HomeGameCardViewModel[]> {
  const response = await fetch("/api/games");

  if (!response.ok) {
    throw new Error(`Failed to fetch games: ${response.status}`);
  }

  const json = (await response.json()) as ListResponseDto<GameDto>;

  return mapGamesListResponseToVM(json);
}

export function useGamesList(
  initialGames?: HomeGameCardViewModel[]
): UseGamesListResult {
  const [state, setState] = useState<HomeViewState>(() => ({
    games: initialGames ?? null,
    isLoading: !initialGames,
    isError: false,
    errorMessage: undefined,
  }));

  const load = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      isError: false,
      errorMessage: undefined,
    }));

    try {
      const games = await fetchGamesFromApi();

      setState({
        games,
        isLoading: false,
        isError: false,
        errorMessage: undefined,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
         
        console.error("Failed to load games list", error);
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isError: true,
        errorMessage: DEFAULT_ERROR_MESSAGE,
      }));
    }
  }, []);

  useEffect(() => {
    if (initialGames && initialGames.length > 0) {
      // Mamy dane startowe z SSR – w tej iteracji nie wykonujemy cichego odświeżania.
      return;
    }

    void load();
  }, [initialGames, load]);

  return {
    games: state.games,
    isLoading: state.isLoading,
    isError: state.isError,
    errorMessage: state.errorMessage,
    refetch: load,
  };
}


