import type { FC, FormEvent } from "react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Text } from "../ui/Typography";
import {
  register as registerRequest,
  RegisterError,
  type RegisterResult,
} from "../../services/authService";

export interface RegisterFormValues {
  nick: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export type RegisterFormStatus = "idle" | "submitting" | "success" | "error";

export interface RegisterFormProps {
  /**
   * Wywoływane po poprawnej walidacji UI.
   * Backend (API Supabase) zostanie podpięty później.
   */
  onSubmit?: (values: RegisterFormValues) => void | Promise<void>;
  title?: string;
  /**
   * Wywoływane po pomyślnej rejestracji (i automatycznym zalogowaniu),
   * z danymi użytkownika zwróconymi z API.
   */
  onSuccess?: (result: RegisterResult) => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nickRegex = /^[a-zA-Z0-9_]{3,20}$/;

const RegisterForm: FC<RegisterFormProps> = ({
  onSubmit,
  title = "Załóż konto",
  onSuccess,
}) => {
  const [values, setValues] = useState<RegisterFormValues>({
    nick: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [errors, setErrors] = useState<Partial<RegisterFormValues>>({});
  const [status, setStatus] = useState<RegisterFormStatus>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const validate = (nextValues: RegisterFormValues) => {
    const nextErrors: Partial<RegisterFormValues> = {};

    if (!nextValues.nick) {
      nextErrors.nick = "Podaj nick.";
    } else if (!nickRegex.test(nextValues.nick)) {
      nextErrors.nick =
        "Nick powinien mieć 3–20 znaków i może zawierać litery, cyfry oraz podkreślenie.";
    }

    if (!nextValues.email) {
      nextErrors.email = "Podaj adres e‑mail.";
    } else if (!emailRegex.test(nextValues.email)) {
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

  const handleChange =
    (field: keyof RegisterFormValues) =>
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
        setFormError("Nie udało się utworzyć konta. Spróbuj ponownie.");
      }
      return;
    }

    try {
      const result = await registerRequest({
        nick: values.nick,
        email: values.email,
        password: values.password,
      });

      setStatus("success");
      onSuccess?.(result);
    } catch (error) {
      setStatus("error");

      if (error instanceof RegisterError) {
        if (error.fieldErrors) {
          setErrors((prev) => ({
            ...prev,
            ...error.fieldErrors,
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
            "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie.",
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
          Załóż konto, aby przypisać swoje wyniki do stałego profilu.
        </Text>
      </div>

      <div className="space-y-3">
        <Input
          name="nick"
          label="Nick"
          placeholder="Twoja nazwa gracza"
          autoComplete="nickname"
          value={values.nick}
          onChange={handleChange("nick")}
          error={errors.nick}
        />

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
          placeholder="Min. 8 znaków"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange("password")}
          error={errors.password}
        />

        <Input
          name="passwordConfirm"
          type="password"
          label="Powtórz hasło"
          placeholder="Powtórz hasło"
          autoComplete="new-password"
          value={values.passwordConfirm}
          onChange={handleChange("passwordConfirm")}
          error={errors.passwordConfirm}
        />
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
        Załóż konto
      </Button>
    </form>
  );
};

export default RegisterForm;


