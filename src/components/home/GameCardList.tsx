import type { FC } from "react";
import type { HomeGameCardViewModel } from "../../viewModels/homeViewModels";
import GameCard from "./GameCard";

export interface GameCardListProps {
  games: HomeGameCardViewModel[];
}

const GameCardList: FC<GameCardListProps> = ({ games }) => {
  if (!games.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-300">
        Brak dostępnych gier. Wróć później.
      </div>
    );
  }

  return (
    <ul className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 pb-4">
      {games.map((game) => (
        <GameCard key={game.code} game={game} />
      ))}
    </ul>
  );
};

export default GameCardList;


