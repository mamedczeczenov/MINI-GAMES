import type { FC } from "react";
import type { HomeGameCardViewModel } from "../../viewModels/homeViewModels";

export interface GameCardProps {
  game: HomeGameCardViewModel;
}

function getGameIcon(game: HomeGameCardViewModel): string {
  const key = game.iconKey ?? game.code ?? "";

  if (key.includes("reaction") || key.includes("reaction_test")) {
    return "⚡";
  }

  if (key.includes("aim") || key.includes("trainer") || key.includes("target")) {
    return "🎯";
  }

  if (key.includes("click") || key.includes("tap")) {
    return "🖱️";
  }

  return "🎮";
}

const GameCard: FC<GameCardProps> = ({ game }) => {
  const href = `/g/${encodeURIComponent(game.code)}`;
  const icon = getGameIcon(game);

  return (
    <li className="h-full list-none">
      <a
        href={href}
        className="group flex h-full flex-col rounded-2xl border border-slate-800/70 bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-4 text-left shadow-sm shadow-slate-950/40 no-underline transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-sky-500/80 hover:shadow-xl hover:shadow-slate-950/70 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <div className="flex h-full flex-col gap-4">
          {/* Ikona / ilustracja */}
          <div className="flex items-start justify-between">
            <div className="inline-flex items-center gap-3 rounded-full bg-slate-900/70 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 ring-1 ring-slate-700/80">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-sky-500 to-emerald-400 text-base shadow-md shadow-sky-900/40">
                {icon}
              </span>
              <span>Mini gra</span>
            </div>
          </div>

          {/* Tytuł + tagline */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight text-slate-50 no-underline decoration-transparent">
              {game.name}
            </h3>
            {game.description && (
              <p className="line-clamp-2 text-sm text-slate-300/90 no-underline decoration-transparent">
                {game.description}
              </p>
            )}
          </div>

          {/* CTA */}
          <div className="mt-auto pt-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 shadow-md shadow-sky-900/40 transition duration-200 group-hover:from-sky-400 group-hover:to-emerald-400 group-hover:shadow-lg group-hover:shadow-sky-900/60">
              <span>Graj</span>
              <span className="text-xs transition-transform duration-200 group-hover:translate-x-0.5">
                ▶
              </span>
            </span>
          </div>
        </div>
      </a>
    </li>
  );
};

export default GameCard;


