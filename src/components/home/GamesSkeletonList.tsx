import type { FC } from "react";

export interface GamesSkeletonListProps {
  count?: number;
}

const GamesSkeletonList: FC<GamesSkeletonListProps> = ({ count = 3 }) => {
  const items = Array.from({ length: count });

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((_, index) => (
        <li
           
          key={index}
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <div className="mb-4 h-10 w-10 rounded-lg bg-slate-800/80" />
          <div className="mb-2 h-5 w-3/4 rounded bg-slate-800/80" />
          <div className="mb-4 h-4 w-full rounded bg-slate-900/80" />
          <div className="h-9 w-28 rounded-full bg-slate-800/80" />
        </li>
      ))}
    </ul>
  );
};

export default GamesSkeletonList;


