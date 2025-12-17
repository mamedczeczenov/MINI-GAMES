import type { ProfileDto } from "../types";
import { supabaseClient } from "../db/supabase.client";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  userId: string;
  nick: string | null;
}

export type LoginErrorCode =
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export class LoginError extends Error {
  status: number;
  code: LoginErrorCode;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    options: {
      status: number;
      code: LoginErrorCode;
      fieldErrors?: Record<string, string>;
    },
  ) {
    super(message);
    this.name = "LoginError";
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
  }
}

interface LoginErrorResponseBody {
  code?: string;
  message?: string;
  errors?: Record<string, string>;
}

interface LoginSuccessResponseBody {
  userId: string;
  nick: string | null;
}

export async function login(
  payload: LoginPayload,
): Promise<LoginResult> {
  let response: Response;

  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new LoginError(
      "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie.",
      {
        status: 0,
        code: "NETWORK_ERROR",
      },
    );
  }

  let data: LoginErrorResponseBody | LoginSuccessResponseBody | null = null;

  try {
    data = (await response.json()) as
      | LoginErrorResponseBody
      | LoginSuccessResponseBody;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const status = response.status;
    const body = data as LoginErrorResponseBody | null;

    const fieldErrors =
      body?.errors && typeof body.errors === "object"
        ? body.errors
        : undefined;

    let code: LoginErrorCode = "UNKNOWN_ERROR";

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

    const message =
      messageFromBody ??
      (code === "INVALID_CREDENTIALS"
        ? "Nieprawidłowy e‑mail lub hasło."
        : "Nie udało się zalogować. Spróbuj ponownie.");

    throw new LoginError(message, {
      status,
      code,
      fieldErrors,
    });
  }

  const successBody = data as LoginSuccessResponseBody | null;

  if (!successBody || !successBody.userId) {
    throw new LoginError(
      "Nie udało się zalogować. Spróbuj ponownie.",
      {
        status: response.status || 500,
        code: "UNKNOWN_ERROR",
      },
    );
  }

  return {
    userId: successBody.userId,
    nick: successBody.nick ?? null,
  };
}

// -----------------------------------------------------------------------------
// Current profile (session-based auth state)
// -----------------------------------------------------------------------------

/**
 * Pobiera aktualnie zalogowany profil użytkownika na podstawie sesji (cookies).
 *
 * Zwraca:
 * - `ProfileDto` – jeśli użytkownik jest zalogowany
 * - `null` – jeśli jest gościem lub wystąpił błąd/nieoczekiwana odpowiedź
 *
 * Funkcja jest celowo „miękka” – nie rzuca wyjątków, bo używamy jej m.in.
 * w nagłówku do inicjalnego odczytu stanu logowania po odświeżeniu strony.
 */
export async function getCurrentProfile(): Promise<ProfileDto | null> {
  let response: Response;

  try {
    response = await fetch("/api/profile/me", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    // Problemy z siecią traktujemy jak brak zalogowanego użytkownika.
    return null;
  }

  // 401 – brak sesji / niezalogowany użytkownik.
  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    // Dla innych błędów API zachowujemy się jak dla gościa –
    // nagłówek nie powinien przez to „wybuchać”.
    return null;
  }

  let data: ProfileDto | null = null;

  try {
    data = (await response.json()) as ProfileDto;
  } catch {
    return null;
  }

  if (!data || !data.user_id) {
    return null;
  }

  return data;
}

// -----------------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------------

/**
 * Wylogowuje użytkownika, czyszcząc sesję po stronie backendu (Supabase).
 *
 * Funkcja jest „bezpieczna” – w razie błędu loguje go w konsoli i nie rzuca
 * wyjątku, żeby UI (np. nagłówek) mógł kontynuować działanie.
 */
export async function logout(): Promise<void> {
  let response: Response;

  try {
    response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Network error during logout:", err);
    return;
  }

  if (!response.ok && response.status !== 204) {
    try {
      const data = (await response.json()) as { message?: string };
      console.error("Logout failed:", data?.message ?? "Unknown error");
    } catch {
      console.error("Logout failed with status:", response.status);
    }
  }
}

// -----------------------------------------------------------------------------
// Registration
// -----------------------------------------------------------------------------

export interface RegisterPayload {
  nick: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  userId: string;
  nick: string;
  email: string;
}

export type RegisterErrorCode =
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "NICK_TAKEN"
  | "EMAIL_TAKEN"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export class RegisterError extends Error {
  status: number;
  code: RegisterErrorCode;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    options: {
      status: number;
      code: RegisterErrorCode;
      fieldErrors?: Record<string, string>;
    },
  ) {
    super(message);
    this.name = "RegisterError";
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
  }
}

interface RegisterErrorResponseBody {
  code?: string;
  message?: string;
  errors?: Record<string, string>;
}

interface RegisterSuccessResponseBody {
  userId: string;
  nick: string;
  email: string;
}

export async function register(
  payload: RegisterPayload,
): Promise<RegisterResult> {
  let response: Response;

  try {
    response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new RegisterError(
      "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie.",
      {
        status: 0,
        code: "NETWORK_ERROR",
      },
    );
  }

  let data:
    | RegisterErrorResponseBody
    | RegisterSuccessResponseBody
    | null = null;

  try {
    data = (await response.json()) as
      | RegisterErrorResponseBody
      | RegisterSuccessResponseBody;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const status = response.status;
    const body = data as RegisterErrorResponseBody | null;

    const fieldErrors =
      body?.errors && typeof body.errors === "object"
        ? body.errors
        : undefined;

    let code: RegisterErrorCode = "UNKNOWN_ERROR";

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
      // Konflikty mapujemy na specyficzne błędy, gdy to możliwe.
      code = "VALIDATION_ERROR";
    } else if (status === 400) {
      code = "VALIDATION_ERROR";
    } else if (status >= 500) {
      code = "INTERNAL_ERROR";
    }

    const messageFromBody = body?.message;

    const message =
      messageFromBody ??
      (code === "NICK_TAKEN"
        ? "Nick jest już zajęty."
        : code === "EMAIL_TAKEN"
          ? "Konto z tym e‑mailem już istnieje."
          : "Nie udało się utworzyć konta. Spróbuj ponownie.");

    throw new RegisterError(message, {
      status,
      code,
      fieldErrors,
    });
  }

  const successBody = data as RegisterSuccessResponseBody | null;

  if (!successBody || !successBody.userId || !successBody.nick) {
    throw new RegisterError(
      "Nie udało się utworzyć konta. Spróbuj ponownie.",
      {
        status: response.status || 500,
        code: "UNKNOWN_ERROR",
      },
    );
  }

  return {
    userId: successBody.userId,
    nick: successBody.nick,
    email: successBody.email,
  };
}

// -----------------------------------------------------------------------------
// Forgot password
// -----------------------------------------------------------------------------

export interface ForgotPasswordPayload {
  email: string;
}

export type ForgotPasswordErrorCode =
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export class ForgotPasswordError extends Error {
  status: number;
  code: ForgotPasswordErrorCode;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    options: {
      status: number;
      code: ForgotPasswordErrorCode;
      fieldErrors?: Record<string, string>;
    },
  ) {
    super(message);
    this.name = "ForgotPasswordError";
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
  }
}

interface ForgotPasswordErrorResponseBody {
  code?: string;
  message?: string;
  errors?: Record<string, string>;
}

interface ForgotPasswordSuccessResponseBody {
  message: string;
}

export async function requestPasswordReset(
  payload: ForgotPasswordPayload,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ForgotPasswordError(
      "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie.",
      {
        status: 0,
        code: "NETWORK_ERROR",
      },
    );
  }

  let data:
    | ForgotPasswordErrorResponseBody
    | ForgotPasswordSuccessResponseBody
    | null = null;

  try {
    data = (await response.json()) as
      | ForgotPasswordErrorResponseBody
      | ForgotPasswordSuccessResponseBody;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const status = response.status;
    const body = data as ForgotPasswordErrorResponseBody | null;

    const fieldErrors =
      body?.errors && typeof body.errors === "object"
        ? body.errors
        : undefined;

    let code: ForgotPasswordErrorCode = "UNKNOWN_ERROR";

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

    const message =
      messageFromBody ??
      "Nie udało się wysłać instrukcji resetu hasła. Spróbuj ponownie.";

    throw new ForgotPasswordError(message, {
      status,
      code,
      fieldErrors,
    });
  }

  // Przy sukcesie nic nie zwracamy – UI wykorzystuje neutralny komunikat.
  return;
}

// -----------------------------------------------------------------------------
// Reset password (after clicking email link)
// -----------------------------------------------------------------------------

export interface ResetPasswordPayload {
  newPassword: string;
}

export type ResetPasswordErrorCode =
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export class ResetPasswordError extends Error {
  status: number;
  code: ResetPasswordErrorCode;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    options: {
      status: number;
      code: ResetPasswordErrorCode;
      fieldErrors?: Record<string, string>;
    },
  ) {
    super(message);
    this.name = "ResetPasswordError";
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
  }
}

interface ResetPasswordErrorResponseBody {
  code?: string;
  message?: string;
  errors?: Record<string, string>;
}

interface ResetPasswordSuccessResponseBody {
  message: string;
}

export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<void> {
  // Funkcja działa tylko po stronie przeglądarki – wykorzystujemy tokeny
  // przekazane w hashu URL przez Supabase (`type=recovery`).
  if (typeof window === "undefined") {
    throw new ResetPasswordError(
      "Zmiana hasła jest dostępna tylko z poziomu przeglądarki.",
      {
        status: 400,
        code: "INVALID_REQUEST",
      },
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
        code: "UNAUTHORIZED",
      },
    );
  }

  // Najpierw ustawiamy sesję na podstawie tokenów z linku.
  const { error: sessionError } = await supabaseClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    throw new ResetPasswordError(
      "Nie udało się uwierzytelnić linku do resetu hasła. Poproś o nową instrukcję.",
      {
        status: 401,
        code: "UNAUTHORIZED",
      },
    );
  }

  // Następnie aktualizujemy hasło w Supabase.
  const { error: updateError } = await supabaseClient.auth.updateUser({
    password: payload.newPassword,
  });

  if (updateError) {
    // Supabase zwykle zwraca status 422 przy błędach walidacji hasła.
    const status = (updateError as any)?.status ?? 400;

    const isValidationError =
      status === 422 ||
      status === 400 ||
      /password/i.test(updateError.message);

    const code: ResetPasswordErrorCode = isValidationError
      ? "VALIDATION_ERROR"
      : "INTERNAL_ERROR";

    const message =
      code === "VALIDATION_ERROR"
        ? "Hasło nie spełnia wymagań bezpieczeństwa."
        : "Nie udało się zmienić hasła. Spróbuj ponownie.";

    throw new ResetPasswordError(message, {
      status,
      code,
    });
  }

  // Przy sukcesie nie zwracamy nic – UI wykorzysta neutralny komunikat.
}





