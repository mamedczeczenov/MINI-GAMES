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

/**
 * Adres aplikacji używany jako HTTP-Referer dla OpenRouter.
 *
 * Kolejność źródeł:
 * 1. PUBLIC_SITE_URL – możesz go ustawić ręcznie (np. na własną domenę).
 * 2. CF_PAGES_URL – automatyczna domena Cloudflare Pages (np. https://mini-games.pages.dev).
 * 3. Fallback:
 *    - w dev: http://localhost:4321 (domyślny port Astro),
 *    - w produkcji: https://mini-games.pages.dev (bezpieczny domyślny adres projektu).
 *
 * Dzięki temu ten sam kod działa lokalnie i po wdrożeniu na Cloudflare,
 * także gdy w OpenRouter masz włączone ograniczenie domen dla klucza API.
 */
const siteUrl =
  import.meta.env.PUBLIC_SITE_URL ??
  import.meta.env.CF_PAGES_URL ??
  (import.meta.env.DEV ? "http://localhost:4321" : "https://mini-games.pages.dev");

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
  apiKey: "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",
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


