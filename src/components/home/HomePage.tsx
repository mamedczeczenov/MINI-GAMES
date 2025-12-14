import type { FC } from "react";
import type { HomeGameCardViewModel } from "../../viewModels/homeViewModels";
import HomeIntro from "./HomeIntro";
import GamesSection from "./GamesSection";

export interface HomePageProps {
  introTitle?: string;
  introDescription?: string;
  initialGames?: HomeGameCardViewModel[];
}

const DEFAULT_TITLE = "Rywalizuj w mini‑grach i wspinaj się w rankingach";
const DEFAULT_DESCRIPTION =
  "Wybierz jedną z dostępnych gier, zagraj w trybie gościa lub jako zalogowany gracz i sprawdź swoje wyniki w tygodniowych rankingach.";

const HomePage: FC<HomePageProps> = ({
  introTitle = DEFAULT_TITLE,
  introDescription = DEFAULT_DESCRIPTION,
  initialGames,
}) => {
  return (
    <main className="space-y-10">
      <HomeIntro title={introTitle} description={introDescription} />
      <GamesSection initialGames={initialGames} />
    </main>
  );
};

export default HomePage;


