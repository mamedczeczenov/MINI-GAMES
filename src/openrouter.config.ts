import { OpenRouterService } from "./openrouter.service";

/**
 * Pojedyncza, współdzielona instancja OpenRouterService skonfigurowana
 * na podstawie zmiennych środowiskowych aplikacji.
 *
 * Uwaga:
 * - korzystamy z `import.meta.env`, bo w Astro/Vite to on ładuje wartości z plików `.env`
 *   oraz z rzeczywistych zmiennych środowiskowych,
 * - plik powinien być używany wyłącznie po stronie serwera (endpointy Astro / middleware).
 */
const apiKey =
  import.meta.env.OPENROUTER_API_KEY ??
  import.meta.env.OPENROUTER ??
  "";

const defaultModel =
  import.meta.env.OPENROUTER_DEFAULT_MODEL ?? "openai/gpt-4o-mini";

const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? "http://localhost";

// Prosty log pomocniczy do debugowania konfiguracji (tylko w dev).
if (!apiKey) {
  console.warn(
    "[OpenRouter] Brak klucza API (OPENROUTER_API_KEY / OPENROUTER) w import.meta.env.",
  );
} else {
  // Nie wypisujemy całego klucza, tylko prefiks – ze względów bezpieczeństwa.
  console.log(
    "[OpenRouter] Załadowano klucz API, prefiks:",
    String(apiKey).slice(0, 8),
    "********",
  );
}

export const openRouterService = new OpenRouterService({
  apiKey,
  defaultModel,
  defaultParams: {
    temperature: 0.7,
    maxTokens: 512,
  },
  requestTimeoutMs: 15_000,
  siteUrl,
  logger: (message, meta) => {
    // Prosty logger serwerowy – nie wypisujemy promptów ani pełnych odpowiedzi.
    console.error("[OpenRouterService]", message, meta ?? "");
  },
});


