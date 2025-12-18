import { d as createComponent, j as renderComponent, r as renderTemplate } from '../chunks/astro/server_BTtRWRX2.mjs';
import 'piccolore';
import { $ as $$AppShell } from '../chunks/AppShell_DlUaiTou.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useCallback, useEffect } from 'react';
import { l as listActiveGames } from '../chunks/gameService_v6Wbwfkw.mjs';
export { renderers } from '../renderers.mjs';

const HomeIntro = ({ title, description }) => {
  return /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
    /* @__PURE__ */ jsx(
      "h1",
      {
        className: "text-3xl font-semibold tracking-tight text-slate-50 ",
        children: title
      }
    ),
    /* @__PURE__ */ jsx("p", { className: "max-w-2xl text-sm text-slate-300 sm:text-base", children: description })
  ] });
};

function mapGameDtoToHomeVM(game) {
  const iconKey = deriveIconKeyFromCode(game.code);
  return {
    code: game.code,
    name: game.name || "Bez nazwy",
    description: game.description ?? "",
    isActive: game.is_active,
    createdAt: game.created_at,
    iconKey
  };
}
function mapGamesListResponseToVM(response) {
  if (!Array.isArray(response.items)) {
    throw new Error("Invalid games response: items is not an array");
  }
  return response.items.filter(
    (game) => game && game.is_active === true && typeof game.code === "string" && game.code.length > 0
  ).map(mapGameDtoToHomeVM);
}
function deriveIconKeyFromCode(code) {
  const iconByCode = {
    reaction_test: "reaction_test",
    aim_trainer: "aim_trainer_30s"
  };
  if (!code) {
    return void 0;
  }
  return iconByCode[code] ?? code;
}

const DEFAULT_ERROR_MESSAGE = "Nie udało się załadować listy gier. Spróbuj ponownie.";
async function fetchGamesFromApi() {
  const response = await fetch("/api/games");
  if (!response.ok) {
    throw new Error(`Failed to fetch games: ${response.status}`);
  }
  const json = await response.json();
  return mapGamesListResponseToVM(json);
}
function useGamesList(initialGames) {
  const [state, setState] = useState(() => ({
    games: initialGames ?? null,
    isLoading: !initialGames,
    isError: false,
    errorMessage: void 0
  }));
  const load = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      isError: false,
      errorMessage: void 0
    }));
    try {
      const games = await fetchGamesFromApi();
      setState({
        games,
        isLoading: false,
        isError: false,
        errorMessage: void 0
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isError: true,
        errorMessage: DEFAULT_ERROR_MESSAGE
      }));
    }
  }, []);
  useEffect(() => {
    if (initialGames && initialGames.length > 0) {
      return;
    }
    void load();
  }, [initialGames, load]);
  return {
    games: state.games,
    isLoading: state.isLoading,
    isError: state.isError,
    errorMessage: state.errorMessage,
    refetch: load
  };
}

const GamesSkeletonList = ({ count = 3 }) => {
  const items = Array.from({ length: count });
  return /* @__PURE__ */ jsx("ul", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: items.map((_, index) => /* @__PURE__ */ jsxs(
    "li",
    {
      className: "rounded-xl border border-slate-800 bg-slate-900/60 p-4",
      children: [
        /* @__PURE__ */ jsx("div", { className: "mb-4 h-10 w-10 rounded-lg bg-slate-800/80" }),
        /* @__PURE__ */ jsx("div", { className: "mb-2 h-5 w-3/4 rounded bg-slate-800/80" }),
        /* @__PURE__ */ jsx("div", { className: "mb-4 h-4 w-full rounded bg-slate-900/80" }),
        /* @__PURE__ */ jsx("div", { className: "h-9 w-28 rounded-full bg-slate-800/80" })
      ]
    },
    index
  )) });
};

const DEFAULT_MESSAGE = "Nie udało się załadować listy gier. Spróbuj ponownie.";
const GamesErrorState = ({ message, onRetry }) => {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-start gap-3 rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
      /* @__PURE__ */ jsx("div", { className: "mt-0.5 h-6 w-6 shrink-0 rounded-full bg-red-900/70 text-center text-xs font-semibold leading-6", children: "!" }),
      /* @__PURE__ */ jsx("p", { children: message ?? DEFAULT_MESSAGE })
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: onRetry,
        className: "mt-2 inline-flex items-center justify-center rounded-full border border-red-500/70 bg-red-900/40 px-4 py-1.5 text-xs font-medium text-red-50 transition hover:bg-red-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:mt-0",
        children: "Spróbuj ponownie"
      }
    )
  ] });
};

function getGameIcon(game) {
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
const GameCard = ({ game }) => {
  const href = `/g/${encodeURIComponent(game.code)}`;
  const icon = getGameIcon(game);
  return /* @__PURE__ */ jsx("li", { className: "h-full list-none", children: /* @__PURE__ */ jsx(
    "a",
    {
      href,
      className: "group flex h-full flex-col rounded-2xl border border-slate-800/70 bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-4 text-left shadow-sm shadow-slate-950/40 no-underline transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-sky-500/80 hover:shadow-xl hover:shadow-slate-950/70 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
      children: /* @__PURE__ */ jsxs("div", { className: "flex h-full flex-col gap-4", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-start justify-between", children: /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-3 rounded-full bg-slate-900/70 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 ring-1 ring-slate-700/80", children: [
          /* @__PURE__ */ jsx("span", { className: "inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-sky-500 to-emerald-400 text-base shadow-md shadow-sky-900/40", children: icon }),
          /* @__PURE__ */ jsx("span", { children: "Mini gra" })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold tracking-tight text-slate-50 no-underline decoration-transparent", children: game.name }),
          game.description && /* @__PURE__ */ jsx("p", { className: "line-clamp-2 text-sm text-slate-300/90 no-underline decoration-transparent", children: game.description })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-auto pt-2", children: /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 shadow-md shadow-sky-900/40 transition duration-200 group-hover:from-sky-400 group-hover:to-emerald-400 group-hover:shadow-lg group-hover:shadow-sky-900/60", children: [
          /* @__PURE__ */ jsx("span", { children: "Graj" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs transition-transform duration-200 group-hover:translate-x-0.5", children: "▶" })
        ] }) })
      ] })
    }
  ) });
};

const GameCardList = ({ games }) => {
  if (!games.length) {
    return /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-300", children: "Brak dostępnych gier. Wróć później." });
  }
  return /* @__PURE__ */ jsx("ul", { className: "grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 pb-4", children: games.map((game) => /* @__PURE__ */ jsx(GameCard, { game }, game.code)) });
};

const GamesListContainer = ({ initialGames }) => {
  const { games, isLoading, isError, errorMessage, refetch } = useGamesList(initialGames);
  if (isLoading && !games) {
    return /* @__PURE__ */ jsx(GamesSkeletonList, {});
  }
  if (!isLoading && isError && !games) {
    return /* @__PURE__ */ jsx(GamesErrorState, { message: errorMessage, onRetry: refetch });
  }
  if (!games || games.length === 0) {
    return /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-6 text-sm text-slate-300", children: "Brak dostępnych gier. Wróć później." });
  }
  return /* @__PURE__ */ jsx(GameCardList, { games });
};

const GamesSection = ({ initialGames }) => {
  return /* @__PURE__ */ jsxs("section", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsx(
        "h2",
        {
          className: "text-xl font-semibold tracking-tight text-slate-50 no-underline decoration-transparent",
          children: "Wybierz grę"
        }
      ),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-400 ", children: "Wybierz jedną z dostępnych mini-gier i spróbuj pobić swój rekord." })
    ] }),
    /* @__PURE__ */ jsx(GamesListContainer, { initialGames })
  ] });
};

const DEFAULT_TITLE = "Rywalizuj w mini‑grach i wspinaj się w rankingach";
const DEFAULT_DESCRIPTION = "Wybierz jedną z dostępnych gier, zagraj w trybie gościa lub jako zalogowany gracz i sprawdź swoje wyniki w tygodniowych rankingach.";
const HomePage = ({
  introTitle = DEFAULT_TITLE,
  introDescription = DEFAULT_DESCRIPTION,
  initialGames
}) => {
  return /* @__PURE__ */ jsxs("main", { className: "space-y-10", children: [
    /* @__PURE__ */ jsx(HomeIntro, { title: introTitle, description: introDescription }),
    /* @__PURE__ */ jsx(GamesSection, { initialGames })
  ] });
};

const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const games = await listActiveGames();
  const initialGames = mapGamesListResponseToVM({ items: games });
  return renderTemplate`${renderComponent($$result, "AppShell", $$AppShell, {}, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "HomePage", HomePage, { "client:load": true, "initialGames": initialGames, "client:component-hydration": "load", "client:component-path": "/Users/macbook/Desktop/folder/dreary-disk/src/components/home/HomePage.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/macbook/Desktop/folder/dreary-disk/src/pages/index.astro", void 0);

const $$file = "/Users/macbook/Desktop/folder/dreary-disk/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
