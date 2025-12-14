import type { FC } from "react";
import type { HomeGameCardViewModel } from "../../viewModels/homeViewModels";
import GamesListContainer from "./GamesListContainer";

export interface GamesSectionProps {
  initialGames?: HomeGameCardViewModel[];
}

const GamesSection: FC<GamesSectionProps> = ({ initialGames }) => {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2
          className="text-xl font-semibold tracking-tight text-slate-50 no-underline decoration-transparent"
        >
          Wybierz grę
        </h2>
        <p className="text-sm text-slate-400 ">
          Wybierz jedną z dostępnych mini-gier i spróbuj pobić swój rekord.
        </p>
      </div>

      <GamesListContainer initialGames={initialGames} />
    </section>
  );
};

export default GamesSection;


