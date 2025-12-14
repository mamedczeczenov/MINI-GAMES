import type { ButtonHTMLAttributes, ReactNode } from "react";
import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed rounded-[var(--radius-md)]";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[color:var(--color-primary)] text-[color:var(--color-surface)] hover:bg-[color:var(--color-primary-strong)]",
  secondary:
    "bg-[color:var(--color-surface-soft)] text-[color:var(--color-fg)] hover:bg-[color:var(--color-surface-alt)]",
  ghost:
    "bg-transparent text-[color:var(--color-fg-soft)] hover:bg-[color:var(--color-primary-soft)]",
  outline:
    "bg-transparent text-[color:var(--color-fg)] border border-[color:var(--color-border-subtle)] hover:bg-[color:var(--color-primary-soft)]",
  danger:
    "bg-[color:var(--color-danger)] text-[color:var(--color-surface)] hover:bg-[color:var(--color-danger)]/90",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[length:var(--text-sm)]",
  md: "h-10 px-4 text-[length:var(--text-md)]",
  lg: "h-11 px-5 text-[length:var(--text-md)]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      leftIcon,
      rightIcon,
      loading,
      fullWidth,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isIconOnly = !children && (leftIcon || rightIcon);

    return (
      <button
        ref={ref}
        data-variant={variant}
        data-size={size}
        className={[
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          isIconOnly ? "aspect-square px-0" : "",
          fullWidth ? "w-full" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {leftIcon && !loading && (
          <span className="inline-flex items-center">{leftIcon}</span>
        )}
        {loading && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--color-fg-soft)] border-t-transparent"
          />
        )}
        {children && <span>{children}</span>}
        {rightIcon && !loading && (
          <span className="inline-flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";


