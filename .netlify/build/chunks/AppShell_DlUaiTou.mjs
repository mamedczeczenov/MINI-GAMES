import { d as createComponent, e as createAstro, g as addAttribute, k as renderHead, j as renderComponent, l as renderSlot, r as renderTemplate } from './astro/server_BTtRWRX2.mjs';
import 'piccolore';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import React, { useState, useEffect } from 'react';
/* empty css                                  */

class LoginError extends Error {
  status;
  code;
  fieldErrors;
  constructor(message, options) {
    super(message);
    this.name = "LoginError";
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
  }
}
async function login(payload) {
  let response;
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new LoginError(
      "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie.",
      {
        status: 0,
        code: "NETWORK_ERROR"
      }
    );
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const status = response.status;
    const body = data;
    const fieldErrors = body?.errors && typeof body.errors === "object" ? body.errors : void 0;
    let code = "UNKNOWN_ERROR";
    if (body?.code === "INVALID_CREDENTIALS") {
      code = "INVALID_CREDENTIALS";
    } else if (body?.code === "VALIDATION_ERROR") {
      code = "VALIDATION_ERROR";
    } else if (body?.code === "INVALID_REQUEST") {
      code = "INVALID_REQUEST";
    } else if (body?.code === "INTERNAL_ERROR") {
      code = "INTERNAL_ERROR";
    } else if (status === 401) {
      code = "INVALID_CREDENTIALS";
    } else if (status === 400) {
      code = "VALIDATION_ERROR";
    } else if (status >= 500) {
      code = "INTERNAL_ERROR";
    }
    const messageFromBody = body?.message;
    const message = messageFromBody ?? (code === "INVALID_CREDENTIALS" ? "Nieprawidłowy e‑mail lub hasło." : "Nie udało się zalogować. Spróbuj ponownie.");
    throw new LoginError(message, {
      status,
      code,
      fieldErrors
    });
  }
  const successBody = data;
  if (!successBody || !successBody.userId) {
    throw new LoginError(
      "Nie udało się zalogować. Spróbuj ponownie.",
      {
        status: response.status || 500,
        code: "UNKNOWN_ERROR"
      }
    );
  }
  return {
    userId: successBody.userId,
    nick: successBody.nick ?? null
  };
}
async function getCurrentProfile() {
  let response;
  try {
    response = await fetch("/api/profile/me", {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });
  } catch {
    return null;
  }
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    return null;
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    return null;
  }
  if (!data || !data.user_id) {
    return null;
  }
  return data;
}
async function logout() {
  let response;
  try {
    response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("Network error during logout:", err);
    return;
  }
  if (!response.ok && response.status !== 204) {
    try {
      const data = await response.json();
      console.error("Logout failed:", data?.message ?? "Unknown error");
    } catch {
      console.error("Logout failed with status:", response.status);
    }
  }
}
class RegisterError extends Error {
  status;
  code;
  fieldErrors;
  constructor(message, options) {
    super(message);
    this.name = "RegisterError";
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
  }
}
async function register(payload) {
  let response;
  try {
    response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new RegisterError(
      "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie.",
      {
        status: 0,
        code: "NETWORK_ERROR"
      }
    );
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const status = response.status;
    const body = data;
    const fieldErrors = body?.errors && typeof body.errors === "object" ? body.errors : void 0;
    let code = "UNKNOWN_ERROR";
    if (body?.code === "NICK_TAKEN") {
      code = "NICK_TAKEN";
    } else if (body?.code === "EMAIL_TAKEN") {
      code = "EMAIL_TAKEN";
    } else if (body?.code === "VALIDATION_ERROR") {
      code = "VALIDATION_ERROR";
    } else if (body?.code === "INVALID_REQUEST") {
      code = "INVALID_REQUEST";
    } else if (body?.code === "INTERNAL_ERROR") {
      code = "INTERNAL_ERROR";
    } else if (status === 409) {
      code = "VALIDATION_ERROR";
    } else if (status === 400) {
      code = "VALIDATION_ERROR";
    } else if (status >= 500) {
      code = "INTERNAL_ERROR";
    }
    const messageFromBody = body?.message;
    const message = messageFromBody ?? (code === "NICK_TAKEN" ? "Nick jest już zajęty." : code === "EMAIL_TAKEN" ? "Konto z tym e‑mailem już istnieje." : "Nie udało się utworzyć konta. Spróbuj ponownie.");
    throw new RegisterError(message, {
      status,
      code,
      fieldErrors
    });
  }
  const successBody = data;
  if (!successBody || !successBody.userId || !successBody.nick) {
    throw new RegisterError(
      "Nie udało się utworzyć konta. Spróbuj ponownie.",
      {
        status: response.status || 500,
        code: "UNKNOWN_ERROR"
      }
    );
  }
  return {
    userId: successBody.userId,
    nick: successBody.nick,
    email: successBody.email
  };
}
class ForgotPasswordError extends Error {
  status;
  code;
  fieldErrors;
  constructor(message, options) {
    super(message);
    this.name = "ForgotPasswordError";
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
  }
}
async function requestPasswordReset(payload) {
  let response;
  try {
    response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new ForgotPasswordError(
      "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie.",
      {
        status: 0,
        code: "NETWORK_ERROR"
      }
    );
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const status = response.status;
    const body = data;
    const fieldErrors = body?.errors && typeof body.errors === "object" ? body.errors : void 0;
    let code = "UNKNOWN_ERROR";
    if (body?.code === "VALIDATION_ERROR") {
      code = "VALIDATION_ERROR";
    } else if (body?.code === "INVALID_REQUEST") {
      code = "INVALID_REQUEST";
    } else if (body?.code === "INTERNAL_ERROR") {
      code = "INTERNAL_ERROR";
    } else if (status === 400) {
      code = "VALIDATION_ERROR";
    } else if (status >= 500) {
      code = "INTERNAL_ERROR";
    }
    const messageFromBody = body?.message;
    const message = messageFromBody ?? "Nie udało się wysłać instrukcji resetu hasła. Spróbuj ponownie.";
    throw new ForgotPasswordError(message, {
      status,
      code,
      fieldErrors
    });
  }
  return;
}
class ResetPasswordError extends Error {
  status;
  code;
  fieldErrors;
  constructor(message, options) {
    super(message);
    this.name = "ResetPasswordError";
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
  }
}
async function resetPassword(payload) {
  let response;
  if (typeof window === "undefined") {
    throw new ResetPasswordError(
      "Zmiana hasła jest dostępna tylko z poziomu przeglądarki.",
      {
        status: 400,
        code: "INVALID_REQUEST"
      }
    );
  }
  const rawHash = window.location.hash ?? "";
  const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
  const params = new URLSearchParams(hash);
  const type = params.get("type");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (type !== "recovery" || !accessToken || !refreshToken) {
    throw new ResetPasswordError(
      "Link do resetu hasła jest nieaktywny lub wygasł. Poproś o nową instrukcję.",
      {
        status: 401,
        code: "UNAUTHORIZED"
      }
    );
  }
  try {
    response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        newPassword: payload.newPassword,
        accessToken,
        refreshToken
      })
    });
  } catch {
    throw new ResetPasswordError(
      "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie.",
      {
        status: 0,
        code: "NETWORK_ERROR"
      }
    );
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const status = response.status;
    const body = data;
    const fieldErrors = body?.errors && typeof body.errors === "object" ? body.errors : void 0;
    let code = "UNKNOWN_ERROR";
    if (body?.code === "UNAUTHORIZED") {
      code = "UNAUTHORIZED";
    } else if (body?.code === "VALIDATION_ERROR") {
      code = "VALIDATION_ERROR";
    } else if (body?.code === "INVALID_REQUEST") {
      code = "INVALID_REQUEST";
    } else if (body?.code === "INTERNAL_ERROR") {
      code = "INTERNAL_ERROR";
    } else if (status === 401) {
      code = "UNAUTHORIZED";
    } else if (status === 400) {
      code = "VALIDATION_ERROR";
    } else if (status >= 500) {
      code = "INTERNAL_ERROR";
    }
    const messageFromBody = body?.message;
    const message = messageFromBody ?? (code === "UNAUTHORIZED" ? "Link do resetu hasła jest nieaktywny lub wygasł. Poproś o nową instrukcję." : code === "VALIDATION_ERROR" ? "Hasło nie spełnia wymagań bezpieczeństwa." : "Nie udało się zmienić hasła. Spróbuj ponownie.");
    throw new ResetPasswordError(message, {
      status,
      code,
      fieldErrors
    });
  }
  return;
}

const variantClasses$1 = {
  display: "text-[length:var(--text-2xl)] font-semibold leading-[var(--leading-tight)] tracking-tight",
  title: "text-[length:var(--text-xl)] font-semibold leading-[var(--leading-tight)]",
  subtitle: "text-[length:var(--text-lg)] font-medium leading-[var(--leading-normal)] text-[color:var(--color-fg-soft)]",
  body: "text-[length:var(--text-md)] leading-[var(--leading-normal)] text-[color:var(--color-fg)]",
  "body-small": "text-[length:var(--text-sm)] leading-[var(--leading-normal)] text-[color:var(--color-fg-soft)]",
  caption: "text-[length:var(--text-xs)] leading-[var(--leading-normal)] uppercase tracking-wide text-[color:var(--color-fg-muted)]"
};
const defaultElement = {
  display: "h1",
  title: "h2",
  subtitle: "h3",
  body: "p",
  "body-small": "p",
  caption: "span"
};
const Text = ({
  as,
  variant = "body",
  className,
  children,
  ...props
}) => {
  const Component = as ?? defaultElement[variant];
  return /* @__PURE__ */ jsx(
    Component,
    {
      className: [variantClasses$1[variant], className].filter(Boolean).join(" "),
      ...props,
      children
    }
  );
};

const baseClasses = "inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed rounded-[var(--radius-md)]";
const variantClasses = {
  primary: "bg-[color:var(--color-primary)] text-[color:var(--color-surface)] hover:bg-[color:var(--color-primary-strong)]",
  secondary: "bg-[color:var(--color-surface-soft)] text-[color:var(--color-fg)] hover:bg-[color:var(--color-surface-alt)]",
  ghost: "bg-transparent text-[color:var(--color-fg-soft)] hover:bg-[color:var(--color-primary-soft)]",
  outline: "bg-transparent text-[color:var(--color-fg)] border border-[color:var(--color-border-subtle)] hover:bg-[color:var(--color-primary-soft)]",
  danger: "bg-[color:var(--color-danger)] text-[color:var(--color-surface)] hover:bg-[color:var(--color-danger)]/90"
};
const sizeClasses = {
  sm: "h-8 px-3 text-[length:var(--text-sm)]",
  md: "h-10 px-4 text-[length:var(--text-md)]",
  lg: "h-11 px-5 text-[length:var(--text-md)]"
};
const Button = React.forwardRef(
  ({
    variant = "primary",
    size = "md",
    leftIcon,
    rightIcon,
    loading,
    fullWidth,
    className,
    children,
    ...props
  }, ref) => {
    const isIconOnly = !children && (leftIcon || rightIcon);
    return /* @__PURE__ */ jsxs(
      "button",
      {
        ref,
        "data-variant": variant,
        "data-size": size,
        className: [
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          isIconOnly ? "aspect-square px-0" : "",
          fullWidth ? "w-full" : "",
          className
        ].filter(Boolean).join(" "),
        ...props,
        children: [
          leftIcon && !loading && /* @__PURE__ */ jsx("span", { className: "inline-flex items-center", children: leftIcon }),
          loading && /* @__PURE__ */ jsx(
            "span",
            {
              "aria-hidden": "true",
              className: "h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--color-fg-soft)] border-t-transparent"
            }
          ),
          children && /* @__PURE__ */ jsx("span", { children }),
          rightIcon && !loading && /* @__PURE__ */ jsx("span", { className: "inline-flex items-center", children: rightIcon })
        ]
      }
    );
  }
);
Button.displayName = "Button";

const Input = React.forwardRef(
  ({ label, description, error, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    const describedByIds = [
      description ? `${inputId}-description` : null,
      error ? `${inputId}-error` : null
    ].filter(Boolean).join(" ");
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
      label && /* @__PURE__ */ jsx(
        "label",
        {
          htmlFor: inputId,
          className: "text-[length:var(--text-sm)] font-medium text-[color:var(--color-fg-soft)]",
          children: label
        }
      ),
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: [
            "group flex items-center gap-2 rounded-[var(--radius-md)] border bg-[color:var(--color-surface-soft)] px-3 py-2 transition-colors",
            "focus-within:border-[color:var(--color-primary)] focus-within:ring-1 focus-within:ring-[color:var(--color-primary)]",
            error ? "border-[color:var(--color-danger)]" : "border-[color:var(--color-border-subtle)]",
            className
          ].filter(Boolean).join(" "),
          children: [
            leftIcon && /* @__PURE__ */ jsx("span", { className: "inline-flex items-center text-[color:var(--color-fg-soft)]", children: leftIcon }),
            /* @__PURE__ */ jsx(
              "input",
              {
                id: inputId,
                ref,
                "aria-invalid": !!error,
                "aria-describedby": describedByIds || void 0,
                className: "flex-1 bg-transparent text-[length:var(--text-md)] text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] outline-none",
                ...props
              }
            ),
            rightIcon && /* @__PURE__ */ jsx("span", { className: "inline-flex items-center text-[color:var(--color-fg-soft)]", children: rightIcon })
          ]
        }
      ),
      description && !error && /* @__PURE__ */ jsx(
        "p",
        {
          id: `${inputId}-description`,
          className: "text-[length:var(--text-xs)] text-[color:var(--color-fg-muted)]",
          children: description
        }
      ),
      error && /* @__PURE__ */ jsx(
        "p",
        {
          id: `${inputId}-error`,
          className: "text-[length:var(--text-xs)] text-[color:var(--color-danger)]",
          children: error
        }
      )
    ] });
  }
);
Input.displayName = "Input";

const emailRegex$2 = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LoginForm = ({
  onSubmit,
  title = "Zaloguj się",
  showForgotPasswordLink = true,
  onForgotPasswordClick,
  onSuccess
}) => {
  const [values, setValues] = useState({
    email: "",
    password: ""
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [formError, setFormError] = useState(null);
  const validate = (nextValues) => {
    const nextErrors = {};
    if (!nextValues.email) {
      nextErrors.email = "Podaj adres e‑mail.";
    } else if (!emailRegex$2.test(nextValues.email)) {
      nextErrors.email = "Adres e‑mail ma niepoprawny format.";
    }
    if (!nextValues.password) {
      nextErrors.password = "Podaj hasło.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const handleChange = (field) => (event) => {
    const nextValues = { ...values, [field]: event.target.value };
    setValues(nextValues);
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const isValid = validate(values);
    if (!isValid) {
      return;
    }
    setStatus("submitting");
    if (onSubmit) {
      try {
        await onSubmit(values);
        setStatus("success");
      } catch {
        setStatus("error");
        setFormError("Coś poszło nie tak. Spróbuj ponownie.");
      }
      return;
    }
    try {
      const result = await login(values);
      setStatus("success");
      onSuccess?.(result);
    } catch (error) {
      setStatus("error");
      if (error instanceof LoginError) {
        if (error.fieldErrors) {
          setErrors((prev) => ({
            ...prev,
            ...error.fieldErrors
          }));
        }
        if (error.code === "INVALID_CREDENTIALS") {
          setFormError("Nieprawidłowy e‑mail lub hasło.");
          return;
        }
        if (error.code === "NETWORK_ERROR") {
          setFormError(
            "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie."
          );
          return;
        }
        setFormError(error.message);
        return;
      }
      setFormError("Nie udało się zalogować. Spróbuj ponownie.");
    }
  };
  const isSubmitting = status === "submitting";
  return /* @__PURE__ */ jsxs(
    "form",
    {
      onSubmit: handleSubmit,
      className: "space-y-5",
      noValidate: true,
      children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx(Text, { variant: "title", className: "text-slate-50", children: title }),
          /* @__PURE__ */ jsx(Text, { variant: "body-small", children: "Zaloguj się, aby zapisywać swoje wyniki w rankingach." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              name: "email",
              type: "email",
              label: "E‑mail",
              placeholder: "twoj.email@example.com",
              autoComplete: "email",
              value: values.email,
              onChange: handleChange("email"),
              error: errors.email
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              name: "password",
              type: "password",
              label: "Hasło",
              placeholder: "••••••••",
              autoComplete: "current-password",
              value: values.password,
              onChange: handleChange("password"),
              error: errors.password
            }
          ),
          showForgotPasswordLink && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: onForgotPasswordClick,
              className: "text-left text-[length:var(--text-sm)] font-medium text-sky-400 underline-offset-2 hover:underline",
              children: "Nie pamiętasz hasła?"
            }
          )
        ] }),
        formError && /* @__PURE__ */ jsx(
          Text,
          {
            variant: "body-small",
            className: "rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-red-200",
            children: formError
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "submit",
            variant: "primary",
            size: "md",
            loading: isSubmitting,
            fullWidth: true,
            children: "Zaloguj się"
          }
        )
      ]
    }
  );
};

const emailRegex$1 = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nickRegex = /^[a-zA-Z0-9_]{3,20}$/;
const RegisterForm = ({
  onSubmit,
  title = "Załóż konto",
  onSuccess
}) => {
  const [values, setValues] = useState({
    nick: "",
    email: "",
    password: "",
    passwordConfirm: ""
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [formError, setFormError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const validate = (nextValues) => {
    const nextErrors = {};
    if (!nextValues.nick) {
      nextErrors.nick = "Podaj nick.";
    } else if (!nickRegex.test(nextValues.nick)) {
      nextErrors.nick = "Nick powinien mieć 3–20 znaków i może zawierać litery, cyfry oraz podkreślenie.";
    }
    if (!nextValues.email) {
      nextErrors.email = "Podaj adres e‑mail.";
    } else if (!emailRegex$1.test(nextValues.email)) {
      nextErrors.email = "Adres e‑mail ma niepoprawny format.";
    }
    if (!nextValues.password) {
      nextErrors.password = "Podaj hasło.";
    } else if (nextValues.password.length < 8) {
      nextErrors.password = "Hasło powinno mieć co najmniej 8 znaków.";
    }
    if (!nextValues.passwordConfirm) {
      nextErrors.passwordConfirm = "Powtórz hasło.";
    } else if (nextValues.password !== nextValues.passwordConfirm) {
      nextErrors.passwordConfirm = "Hasła muszą być takie same.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const handleChange = (field) => (event) => {
    const nextValues = { ...values, [field]: event.target.value };
    setValues(nextValues);
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setInfoMessage(null);
    const isValid = validate(values);
    if (!isValid) {
      return;
    }
    setStatus("submitting");
    if (onSubmit) {
      try {
        await onSubmit(values);
        setStatus("success");
        setInfoMessage(
          "Konto zostało utworzone. Sprawdź swoją skrzynkę e‑mail i kliknij link aktywacyjny, aby potwierdzić konto."
        );
        if (typeof window !== "undefined") {
          window.alert(
            "Na podany adres e‑mail wysłaliśmy wiadomość z linkiem i instrukcją aktywacji konta."
          );
        }
      } catch {
        setStatus("error");
        setFormError("Nie udało się utworzyć konta. Spróbuj ponownie.");
      }
      return;
    }
    try {
      const result = await register({
        nick: values.nick,
        email: values.email,
        password: values.password
      });
      setStatus("success");
      setInfoMessage(
        "Konto zostało utworzone. Sprawdź swoją skrzynkę e‑mail i kliknij link aktywacyjny, aby potwierdzić konto."
      );
      onSuccess?.(result);
      if (typeof window !== "undefined") {
        window.alert(
          "Na podany adres e‑mail wysłaliśmy wiadomość z linkiem i instrukcją aktywacji konta."
        );
      }
    } catch (error) {
      setStatus("error");
      if (error instanceof RegisterError) {
        if (error.fieldErrors) {
          setErrors((prev) => ({
            ...prev,
            ...error.fieldErrors
          }));
        }
        if (error.code === "NICK_TAKEN") {
          setFormError("Nick jest już zajęty.");
          return;
        }
        if (error.code === "EMAIL_TAKEN") {
          setFormError("Konto z tym e‑mailem już istnieje.");
          return;
        }
        if (error.code === "NETWORK_ERROR") {
          setFormError(
            "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie."
          );
          return;
        }
        setFormError(error.message);
        return;
      }
      setFormError("Nie udało się utworzyć konta. Spróbuj ponownie.");
    }
  };
  const isSubmitting = status === "submitting";
  return /* @__PURE__ */ jsxs(
    "form",
    {
      onSubmit: handleSubmit,
      className: "space-y-5",
      noValidate: true,
      children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx(Text, { variant: "title", className: "text-slate-50", children: title }),
          /* @__PURE__ */ jsx(Text, { variant: "body-small", children: "Załóż konto, aby przypisać swoje wyniki do stałego profilu." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              name: "nick",
              label: "Nick",
              placeholder: "Twoja nazwa gracza",
              autoComplete: "nickname",
              value: values.nick,
              onChange: handleChange("nick"),
              error: errors.nick
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              name: "email",
              type: "email",
              label: "E‑mail",
              placeholder: "twoj.email@example.com",
              autoComplete: "email",
              value: values.email,
              onChange: handleChange("email"),
              error: errors.email
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              name: "password",
              type: "password",
              label: "Hasło",
              placeholder: "Min. 8 znaków",
              autoComplete: "new-password",
              value: values.password,
              onChange: handleChange("password"),
              error: errors.password
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              name: "passwordConfirm",
              type: "password",
              label: "Powtórz hasło",
              placeholder: "Powtórz hasło",
              autoComplete: "new-password",
              value: values.passwordConfirm,
              onChange: handleChange("passwordConfirm"),
              error: errors.passwordConfirm
            }
          )
        ] }),
        formError && /* @__PURE__ */ jsx(
          Text,
          {
            variant: "body-small",
            className: "rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-red-200",
            children: formError
          }
        ),
        infoMessage && /* @__PURE__ */ jsx(
          Text,
          {
            variant: "body-small",
            className: "rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-200",
            children: infoMessage
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "submit",
            variant: "primary",
            size: "md",
            loading: isSubmitting,
            fullWidth: true,
            children: "Załóż konto"
          }
        )
      ]
    }
  );
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ForgotPasswordForm = ({
  onSubmit,
  title = "Odzyskaj dostęp do konta"
}) => {
  const [values, setValues] = useState({ email: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [infoMessage, setInfoMessage] = useState(null);
  const validate = (nextValues) => {
    const nextErrors = {};
    if (!nextValues.email) {
      nextErrors.email = "Podaj adres e‑mail.";
    } else if (!emailRegex.test(nextValues.email)) {
      nextErrors.email = "Adres e‑mail ma niepoprawny format.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const handleChange = (field) => (event) => {
    const nextValues = { ...values, [field]: event.target.value };
    setValues(nextValues);
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setInfoMessage(null);
    const isValid = validate(values);
    if (!isValid) {
      return;
    }
    setStatus("submitting");
    if (onSubmit) {
      try {
        await onSubmit(values);
        setStatus("success");
        setInfoMessage(
          "Jeśli podany e‑mail istnieje w systemie, wyślemy instrukcję resetu hasła."
        );
      } catch {
        setStatus("error");
        setInfoMessage("Coś poszło nie tak. Spróbuj ponownie.");
      }
      return;
    }
    try {
      await requestPasswordReset({ email: values.email });
      setStatus("success");
      setInfoMessage(
        "Jeśli podany e‑mail istnieje w systemie, wyślemy instrukcję resetu hasła."
      );
    } catch (error) {
      setStatus("error");
      if (error instanceof ForgotPasswordError) {
        if (error.code === "NETWORK_ERROR") {
          setInfoMessage(
            "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie."
          );
          return;
        }
        setInfoMessage(
          "Nie udało się wysłać instrukcji resetu hasła. Spróbuj ponownie."
        );
        return;
      }
      setInfoMessage("Coś poszło nie tak. Spróbuj ponownie.");
    }
  };
  const isSubmitting = status === "submitting";
  return /* @__PURE__ */ jsxs(
    "form",
    {
      onSubmit: handleSubmit,
      className: "space-y-5",
      noValidate: true,
      children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx(Text, { variant: "title", className: "text-slate-50", children: title }),
          /* @__PURE__ */ jsx(Text, { variant: "body-small", children: "Podaj adres e‑mail przypisany do konta. Jeśli istnieje, wyślemy na niego link do zmiany hasła." })
        ] }),
        /* @__PURE__ */ jsx(
          Input,
          {
            name: "email",
            type: "email",
            label: "E‑mail",
            placeholder: "twoj.email@example.com",
            autoComplete: "email",
            value: values.email,
            onChange: handleChange("email"),
            error: errors.email
          }
        ),
        infoMessage && /* @__PURE__ */ jsx(
          Text,
          {
            variant: "body-small",
            className: "rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-200",
            children: infoMessage
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "submit",
            variant: "primary",
            size: "md",
            loading: isSubmitting,
            fullWidth: true,
            children: "Wyślij instrukcję resetu"
          }
        )
      ]
    }
  );
};

const AuthModal = ({
  isOpen,
  initialTab = "login",
  onClose,
  onLoginSuccess
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);
  if (!isOpen) {
    return null;
  }
  const handleSwitchToLogin = () => setActiveTab("login");
  const handleSwitchToRegister = () => setActiveTab("register");
  const handleSwitchToForgot = () => setActiveTab("forgot");
  const renderContent = () => {
    if (activeTab === "login") {
      return /* @__PURE__ */ jsx(
        LoginForm,
        {
          showForgotPasswordLink: true,
          onForgotPasswordClick: handleSwitchToForgot,
          onSuccess: onLoginSuccess
        }
      );
    }
    if (activeTab === "register") {
      return /* @__PURE__ */ jsx(
        RegisterForm,
        {
          onSuccess: () => {
            onClose?.();
          }
        }
      );
    }
    return /* @__PURE__ */ jsx(ForgotPasswordForm, {});
  };
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-2xl shadow-slate-950/80", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-0.5", children: [
        /* @__PURE__ */ jsx(Text, { variant: "subtitle", className: "text-slate-100", children: "Konto gracza" }),
        /* @__PURE__ */ jsx(Text, { variant: "body-small", children: "Zaloguj się lub załóż konto, aby zapisywać swoje wyniki w rankingach." })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: onClose,
          "aria-label": "Zamknij okno logowania",
          className: "inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-slate-500 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
          children: "✕"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mb-4 flex gap-2 rounded-full bg-slate-900/60 p-1 text-sm", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: handleSwitchToLogin,
          className: [
            "flex-1 rounded-full px-3 py-1.5 font-medium transition",
            activeTab === "login" ? "bg-sky-500 text-slate-950 shadow-sm" : "text-slate-300 hover:bg-slate-800"
          ].join(" "),
          children: "Zaloguj się"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: handleSwitchToRegister,
          className: [
            "flex-1 rounded-full px-3 py-1.5 font-medium transition",
            activeTab === "register" ? "bg-sky-500 text-slate-950 shadow-sm" : "text-slate-300 hover:bg-slate-800"
          ].join(" "),
          children: "Zarejestruj się"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: handleSwitchToForgot,
          className: [
            "hidden flex-1 rounded-full px-3 py-1.5 font-medium transition sm:block",
            activeTab === "forgot" ? "bg-sky-500 text-slate-950 shadow-sm" : "text-slate-300 hover:bg-slate-800"
          ].join(" "),
          children: "Odzyskaj konto"
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-4", children: renderContent() }),
    /* @__PURE__ */ jsx("div", { className: "mt-5 border-t border-slate-800 pt-3", children: /* @__PURE__ */ jsx(Text, { variant: "body-small", className: "text-slate-400", children: "Możesz nadal grać jako gość. Logowanie jest wymagane tylko do zapisu wyniku w rankingu." }) })
  ] }) });
};

const AppHeader = ({
  authState,
  onLoginClick,
  onRegisterClick,
  onLogoutClick
}) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState("login");
  const [currentAuthState, setCurrentAuthState] = useState(authState);
  useEffect(() => {
    setCurrentAuthState(authState);
  }, [authState]);
  useEffect(() => {
    let isMounted = true;
    const initializeAuthFromSession = async () => {
      if (authState.status === "authenticated") {
        return;
      }
      setCurrentAuthState(
        (prev) => prev.status === "loading" ? prev : { status: "loading" }
      );
      const profile = await getCurrentProfile();
      if (!isMounted) {
        return;
      }
      if (profile) {
        setCurrentAuthState({
          status: "authenticated",
          nick: profile.nick ?? void 0,
          userId: profile.user_id
        });
      } else {
        setCurrentAuthState({ status: "guest" });
      }
    };
    void initializeAuthFromSession();
    return () => {
      isMounted = false;
    };
  }, [authState.status]);
  useEffect(() => {
    const handleOpenAuthModal = () => {
      setInitialTab("login");
      setIsAuthModalOpen(true);
    };
    window.addEventListener("dreary:open-auth-modal", handleOpenAuthModal);
    return () => {
      window.removeEventListener("dreary:open-auth-modal", handleOpenAuthModal);
    };
  }, []);
  const openLoginModal = () => {
    setInitialTab("login");
    setIsAuthModalOpen(true);
  };
  const openRegisterModal = () => {
    setInitialTab("register");
    setIsAuthModalOpen(true);
  };
  const handleLoginClick = () => {
    onLoginClick?.();
    openLoginModal();
  };
  const handleRegisterClick = () => {
    onRegisterClick?.();
    openRegisterModal();
  };
  const handleCloseModal = () => {
    setIsAuthModalOpen(false);
  };
  const handleLoginSuccess = (result) => {
    setCurrentAuthState({
      status: "authenticated",
      nick: result.nick ?? void 0,
      userId: result.userId
    });
    setIsAuthModalOpen(false);
  };
  const handleLogoutClick = async () => {
    setCurrentAuthState({ status: "loading" });
    await logout();
    setCurrentAuthState({ status: "guest" });
    onLogoutClick?.();
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("header", { className: "border-b border-slate-800 bg-slate-900/80 backdrop-blur", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-5xl items-center justify-between px-4 py-3", children: [
      /* @__PURE__ */ jsx(
        "a",
        {
          href: "/",
          className: "text-lg font-semibold tracking-tight text-slate-50 no-underline decoration-transparent",
          children: "MINI GRY - RANKINGI I RYWALIZACJA"
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-sm", children: [
        currentAuthState.status === "loading" && /* @__PURE__ */ jsx("span", { className: "text-slate-300", children: "Sprawdzanie stanu logowania…" }),
        currentAuthState.status === "guest" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("span", { className: "hidden text-slate-300 sm:inline", children: "Grasz jako gość" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: handleLoginClick,
              className: "rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
              children: "Zaloguj się"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: handleRegisterClick,
              className: "hidden rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:inline-flex",
              children: "Zarejestruj się"
            }
          )
        ] }),
        currentAuthState.status === "authenticated" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-sm font-semibold text-slate-950", children: (currentAuthState.nick ?? "gracz").charAt(0).toUpperCase() }),
            /* @__PURE__ */ jsxs("span", { className: "hidden text-slate-200 sm:inline", children: [
              "Zalogowano jako",
              " ",
              /* @__PURE__ */ jsx("span", { className: "font-semibold", children: currentAuthState.nick ?? "gracz" })
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: handleLogoutClick,
              className: "rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-100 transition hover:border-red-500 hover:bg-red-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
              children: "Wyloguj"
            }
          )
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(
      AuthModal,
      {
        isOpen: isAuthModalOpen && currentAuthState.status !== "authenticated",
        initialTab,
        onClose: handleCloseModal,
        onLoginSuccess: handleLoginSuccess
      }
    )
  ] });
};

const $$Astro = createAstro();
const $$AppShell = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$AppShell;
  const title = "Mini gry \u2013 rankingi i rywalizacja";
  return renderTemplate`<html lang="pl"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="generator"${addAttribute(Astro2.generator, "content")}><title>${title}</title>${renderHead()}</head> <body class="min-h-screen bg-slate-950 text-slate-50 antialiased"> ${renderComponent($$result, "AppHeader", AppHeader, { "client:load": true, "authState": { status: "loading" }, "client:component-hydration": "load", "client:component-path": "/Users/macbook/Desktop/folder/dreary-disk/src/components/layout/AppHeader.tsx", "client:component-export": "default" })} <main class="mx-auto max-w-5xl px-4 py-8"> ${renderSlot($$result, $$slots["default"])} </main> </body></html>`;
}, "/Users/macbook/Desktop/folder/dreary-disk/src/layouts/AppShell.astro", void 0);

export { $$AppShell as $, Button as B, Input as I, ResetPasswordError as R, Text as T, resetPassword as r };
