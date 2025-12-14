import type { FC, FormEvent } from "react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Text } from "../ui/Typography";
import {
  requestPasswordReset,
  ForgotPasswordError,
} from "../../services/authService";

export interface ForgotPasswordFormValues {
  email: string;
}

export type ForgotPasswordFormStatus = "idle" | "submitting" | "success" | "error";

export interface ForgotPasswordFormProps {
  onSubmit?: (values: ForgotPasswordFormValues) => void | Promise<void>;
  title?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordForm: FC<ForgotPasswordFormProps> = ({
  onSubmit,
  title = "Odzyskaj dostęp do konta",
}) => {
  const [values, setValues] = useState<ForgotPasswordFormValues>({ email: "" });
  const [errors, setErrors] = useState<Partial<ForgotPasswordFormValues>>({});
  const [status, setStatus] = useState<ForgotPasswordFormStatus>("idle");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const validate = (nextValues: ForgotPasswordFormValues) => {
    const nextErrors: Partial<ForgotPasswordFormValues> = {};

    if (!nextValues.email) {
      nextErrors.email = "Podaj adres e‑mail.";
    } else if (!emailRegex.test(nextValues.email)) {
      nextErrors.email = "Adres e‑mail ma niepoprawny format.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange =
    (field: keyof ForgotPasswordFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValues = { ...values, [field]: event.target.value };
      setValues(nextValues);
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInfoMessage(null);

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
        setInfoMessage(
          "Jeśli podany e‑mail istnieje w systemie, wyślemy instrukcję resetu hasła.",
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
        "Jeśli podany e‑mail istnieje w systemie, wyślemy instrukcję resetu hasła.",
      );
    } catch (error) {
      setStatus("error");

      if (error instanceof ForgotPasswordError) {
        if (error.code === "NETWORK_ERROR") {
          setInfoMessage(
            "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie.",
          );
          return;
        }

        // Dla błędów walidacji backendowej możemy pokazać prosty komunikat,
        // ale nie ujawniamy, czy e‑mail istnieje w systemie.
        setInfoMessage(
          "Nie udało się wysłać instrukcji resetu hasła. Spróbuj ponownie.",
        );
        return;
      }

      setInfoMessage("Coś poszło nie tak. Spróbuj ponownie.");
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
          Podaj adres e‑mail przypisany do konta. Jeśli istnieje, wyślemy na niego link do zmiany hasła.
        </Text>
      </div>

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

      {infoMessage && (
        <Text
          variant="body-small"
          className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-200"
        >
          {infoMessage}
        </Text>
      )}

      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={isSubmitting}
        fullWidth
      >
        Wyślij instrukcję resetu
      </Button>
    </form>
  );
};

export default ForgotPasswordForm;


