import type { FC, FormEvent } from "react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Text } from "../ui/Typography";
import {
  login as loginRequest,
  LoginError,
  type LoginResult,
} from "../../services/authService";

export interface LoginFormValues {
  email: string;
  password: string;
}

export type LoginFormStatus = "idle" | "submitting" | "success" | "error";

export interface LoginFormProps {
  /**
   * Wywoływane po poprawnym przejściu walidacji UI.
   * Nie implementuje backendu – można tu później podpiąć wywołanie API.
   */
  onSubmit?: (values: LoginFormValues) => void | Promise<void>;
  /**
   * Tekst nagłówka formularza (np. w modalu).
   */
  title?: string;
  /**
   * Czy pokazywać link \"Nie pamiętasz hasła?\" (bez logiki).
   */
  showForgotPasswordLink?: boolean;
  /**
   * Callback kliknięcia w link odzyskiwania hasła (np. przełączenie zakładki w modalu).
   */
  onForgotPasswordClick?: () => void;
  /**
   * Wywoływane po pomyślnym zalogowaniu (po stronie backendu),
   * z danymi użytkownika zwróconymi z API.
   */
  onSuccess?: (result: LoginResult) => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginForm: FC<LoginFormProps> = ({
  onSubmit,
  title = "Zaloguj się",
  showForgotPasswordLink = true,
  onForgotPasswordClick,
  onSuccess,
}) => {
  const [values, setValues] = useState<LoginFormValues>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<LoginFormValues>>({});
  const [status, setStatus] = useState<LoginFormStatus>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const validate = (nextValues: LoginFormValues) => {
    const nextErrors: Partial<LoginFormValues> = {};

    if (!nextValues.email) {
      nextErrors.email = "Podaj adres e‑mail.";
    } else if (!emailRegex.test(nextValues.email)) {
      nextErrors.email = "Adres e‑mail ma niepoprawny format.";
    }

    if (!nextValues.password) {
      nextErrors.password = "Podaj hasło.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange =
    (field: keyof LoginFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValues = { ...values, [field]: event.target.value };
      setValues(nextValues);
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError(null);

    const isValid = validate(values);
    if (!isValid) {
      return;
    }

    setStatus("submitting");

    // Jeśli przekazano własny handler onSubmit, użyj go zamiast domyślnego wywołania API.
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
      const result = await loginRequest(values);
      setStatus("success");
      onSuccess?.(result);
    } catch (error) {
      setStatus("error");

      if (error instanceof LoginError) {
        if (error.fieldErrors) {
          setErrors((prev) => ({
            ...prev,
            ...error.fieldErrors,
          }));
        }

        if (error.code === "INVALID_CREDENTIALS") {
          setFormError("Nieprawidłowy e‑mail lub hasło.");
          return;
        }

        if (error.code === "NETWORK_ERROR") {
          setFormError(
            "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie.",
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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
    >
      <div className="space-y-1">
        <Text variant="title" className="text-slate-50">
          {title}
        </Text>
        <Text variant="body-small">
          Zaloguj się, aby zapisywać swoje wyniki w rankingach.
        </Text>
      </div>

      <div className="space-y-3">
        <Input
          name="email"
          type="email"
          label="E‑mail"
          placeholder="twoj.email@example.com"
          autoComplete="email"
          value={values.email}
          onChange={handleChange("email")}
          error={errors.email}
        />

        <Input
          name="password"
          type="password"
          label="Hasło"
          placeholder="••••••••"
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange("password")}
          error={errors.password}
        />

        {showForgotPasswordLink && (
          <button
            type="button"
            onClick={onForgotPasswordClick}
            className="text-left text-[length:var(--text-sm)] font-medium text-sky-400 underline-offset-2 hover:underline"
          >
            Nie pamiętasz hasła?
          </button>
        )}
      </div>

      {formError && (
        <Text
          variant="body-small"
          className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-red-200"
        >
          {formError}
        </Text>
      )}

      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={isSubmitting}
        fullWidth
      >
        Zaloguj się
      </Button>
    </form>
  );
};

export default LoginForm;


