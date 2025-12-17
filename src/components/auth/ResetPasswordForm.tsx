import type { FC, FormEvent } from "react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Text } from "../ui/Typography";
import {
  resetPassword,
  ResetPasswordError,
} from "../../services/authService";

export interface ResetPasswordFormValues {
  newPassword: string;
  newPasswordConfirm: string;
}

export type ResetPasswordFormStatus = "idle" | "submitting" | "success" | "error";

export interface ResetPasswordFormProps {
  onSubmit?: (values: ResetPasswordFormValues) => void | Promise<void>;
  title?: string;
}

const ResetPasswordForm: FC<ResetPasswordFormProps> = ({
  onSubmit,
  title = "Ustaw nowe hasło",
}) => {
  const [values, setValues] = useState<ResetPasswordFormValues>({
    newPassword: "",
    newPasswordConfirm: "",
  });
  const [errors, setErrors] = useState<Partial<ResetPasswordFormValues>>({});
  const [status, setStatus] = useState<ResetPasswordFormStatus>("idle");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const validate = (nextValues: ResetPasswordFormValues) => {
    const nextErrors: Partial<ResetPasswordFormValues> = {};

    if (!nextValues.newPassword) {
      nextErrors.newPassword = "Podaj nowe hasło.";
    } else if (nextValues.newPassword.length < 8) {
      nextErrors.newPassword = "Hasło powinno mieć co najmniej 8 znaków.";
    }

    if (!nextValues.newPasswordConfirm) {
      nextErrors.newPasswordConfirm = "Powtórz nowe hasło.";
    } else if (nextValues.newPassword !== nextValues.newPasswordConfirm) {
      nextErrors.newPasswordConfirm = "Hasła muszą być takie same.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange =
    (field: keyof ResetPasswordFormValues) =>
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

    // Jeśli przekazano własny handler onSubmit, użyj go zamiast domyślnego wywołania API.
    if (onSubmit) {
      try {
        setStatus("submitting");
        await onSubmit(values);
        setStatus("success");
        setInfoMessage("Hasło zostało zmienione. Możesz teraz się zalogować.");
      } catch {
        setStatus("error");
        setInfoMessage("Nie udało się zmienić hasła. Spróbuj ponownie.");
      }
      return;
    }

    try {
      setStatus("submitting");
      await resetPassword({ newPassword: values.newPassword });
      setStatus("success");
      setInfoMessage("Hasło zostało zmienione. Możesz teraz się zalogować.");
    } catch (error) {
      setStatus("error");

      if (error instanceof ResetPasswordError) {
        if (error.code === "NETWORK_ERROR") {
          setInfoMessage(
            "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie.",
          );
          return;
        }

        if (error.code === "UNAUTHORIZED") {
          setInfoMessage(
            "Link do resetu hasła jest nieaktywny lub wygasł. Poproś o nową instrukcję.",
          );
          return;
        }

        if (error.code === "VALIDATION_ERROR") {
          setInfoMessage(
            "Nowe hasło nie spełnia wymagań bezpieczeństwa. Spróbuj z innym hasłem.",
          );
          return;
        }

        setInfoMessage("Nie udało się zmienić hasła. Spróbuj ponownie.");
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
          Wybierz nowe, silne hasło, którego nie używasz w innych serwisach.
        </Text>
      </div>

      <div className="space-y-3">
        <Input
          name="newPassword"
          type="password"
          label="Nowe hasło"
          placeholder="Min. 8 znaków"
          autoComplete="new-password"
          value={values.newPassword}
          onChange={handleChange("newPassword")}
          error={errors.newPassword}
        />

        <Input
          name="newPasswordConfirm"
          type="password"
          label="Powtórz nowe hasło"
          placeholder="Powtórz hasło"
          autoComplete="new-password"
          value={values.newPasswordConfirm}
          onChange={handleChange("newPasswordConfirm")}
          error={errors.newPasswordConfirm}
        />
      </div>

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
        Zmień hasło
      </Button>
    </form>
  );
};

export default ResetPasswordForm;


