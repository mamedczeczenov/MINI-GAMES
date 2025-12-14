import type { FC } from "react";
import type { HomeGameCardViewModel } from "../../viewModels/homeViewModels";
import { useGamesList } from "../../hooks/useGamesList";
import GamesSkeletonList from "./GamesSkeletonList";
import GamesErrorState from "./GamesErrorState";
import GameCardList from "./GameCardList";

export interface GamesListContainerProps {
  initialGames?: HomeGameCardViewModel[];
}

const GamesListContainer: FC<GamesListContainerProps> = ({ initialGames }) => {
  const { games, isLoading, isError, errorMessage, refetch } =
    useGamesList(initialGames);

  if (isLoading && !games) {
    return <GamesSkeletonList />;
  }

  if (!isLoading && isError && !games) {
    return <GamesErrorState message={errorMessage} onRetry={refetch} />;
  }

  if (!games || games.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-300">
        Brak dostępnych gier. Wróć później.
      </div>
    );
  }

  return <GameCardList games={games} />;
};

export default GamesListContainer;


