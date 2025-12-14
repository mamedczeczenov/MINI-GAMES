import type { InputHTMLAttributes, ReactNode } from "react";
import React from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { label, description, error, leftIcon, rightIcon, className, id, ...props },
    ref,
  ) => {
    const inputId = id ?? props.name;
    const describedByIds = [
      description ? `${inputId}-description` : null,
      error ? `${inputId}-error` : null,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[length:var(--text-sm)] font-medium text-[color:var(--color-fg-soft)]"
          >
            {label}
          </label>
        )}
        <div
          className={[
            "group flex items-center gap-2 rounded-[var(--radius-md)] border bg-[color:var(--color-surface-soft)] px-3 py-2 transition-colors",
            "focus-within:border-[color:var(--color-primary)] focus-within:ring-1 focus-within:ring-[color:var(--color-primary)]",
            error
              ? "border-[color:var(--color-danger)]"
              : "border-[color:var(--color-border-subtle)]",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {leftIcon && (
            <span className="inline-flex items-center text-[color:var(--color-fg-soft)]">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={describedByIds || undefined}
            className="flex-1 bg-transparent text-[length:var(--text-md)] text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] outline-none"
            {...props}
          />
          {rightIcon && (
            <span className="inline-flex items-center text-[color:var(--color-fg-soft)]">
              {rightIcon}
            </span>
          )}
        </div>
        {description && !error && (
          <p
            id={`${inputId}-description`}
            className="text-[length:var(--text-xs)] text-[color:var(--color-fg-muted)]"
          >
            {description}
          </p>
        )}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-[length:var(--text-xs)] text-[color:var(--color-danger)]"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";


