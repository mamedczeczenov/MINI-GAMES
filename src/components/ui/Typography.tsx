import type { HTMLAttributes, ReactNode } from "react";
import React from "react";

type TypographyAs = "h1" | "h2" | "h3" | "h4" | "p" | "span";

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: TypographyAs;
  variant?:
    | "display"
    | "title"
    | "subtitle"
    | "body"
    | "body-small"
    | "caption";
  children: ReactNode;
}

const variantClasses: Record<NonNullable<TextProps["variant"]>, string> = {
  display:
    "text-[length:var(--text-2xl)] font-semibold leading-[var(--leading-tight)] tracking-tight",
  title:
    "text-[length:var(--text-xl)] font-semibold leading-[var(--leading-tight)]",
  subtitle:
    "text-[length:var(--text-lg)] font-medium leading-[var(--leading-normal)] text-[color:var(--color-fg-soft)]",
  body:
    "text-[length:var(--text-md)] leading-[var(--leading-normal)] text-[color:var(--color-fg)]",
  "body-small":
    "text-[length:var(--text-sm)] leading-[var(--leading-normal)] text-[color:var(--color-fg-soft)]",
  caption:
    "text-[length:var(--text-xs)] leading-[var(--leading-normal)] uppercase tracking-wide text-[color:var(--color-fg-muted)]",
};

const defaultElement: Record<NonNullable<TextProps["variant"]>, TypographyAs> =
  {
    display: "h1",
    title: "h2",
    subtitle: "h3",
    body: "p",
    "body-small": "p",
    caption: "span",
  };

export const Text: React.FC<TextProps> = ({
  as,
  variant = "body",
  className,
  children,
  ...props
}) => {
  const Component = (as ?? defaultElement[variant]) as any;

  return (
    <Component
      className={[variantClasses[variant], className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
};


