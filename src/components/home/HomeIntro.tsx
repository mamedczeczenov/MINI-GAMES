import type { FC } from "react";

export interface HomeIntroProps {
  title: string;
  description: string;
}

const HomeIntro: FC<HomeIntroProps> = ({ title, description }) => {
  return (
    <section className="space-y-3">
      <h1
        className="text-3xl font-semibold tracking-tight text-slate-50 "
      >
        {title}
      </h1>
      <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
        {description}
      </p>
    </section>
  );
};

export default HomeIntro;


