import type { FC } from "react";

export interface GamesErrorStateProps {
  message?: string;
  onRetry: () => void;
}

const DEFAULT_MESSAGE =
  "Nie udało się załadować listy gier. Spróbuj ponownie.";

const GamesErrorState: FC<GamesErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-red-900/70 text-center text-xs font-semibold leading-6">
          !
        </div>
        <p>{message ?? DEFAULT_MESSAGE}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center justify-center rounded-full border border-red-500/70 bg-red-900/40 px-4 py-1.5 text-xs font-medium text-red-50 transition hover:bg-red-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:mt-0"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
};

export default GamesErrorState;


