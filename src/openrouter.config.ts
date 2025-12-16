import { OpenRouterService, OpenRouterError } from "./openrouter.service";

/**
 * Pojedyncza, współdzielona instancja OpenRouterService skonfigurowana
 * na podstawie zmiennych środowiskowych aplikacji.
 *
 * Uwaga:
 * - korzystamy z `import.meta.env`, bo w Astro/Vite to on ładuje wartości z plików `.env`
 *   oraz z rzeczywistych zmiennych środowiskowych,
 * - plik powinien być używany wyłącznie po stronie serwera (endpointy Astro / middleware).
 */
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
  (import.meta.env.DEV ? "http://localhost:4321" : "https://mini-games-yur.pages.dev");

let cachedService: OpenRouterService | null = null;

/**
 * Zwraca współdzieloną instancję OpenRouterService.
 *
 * Uwaga:
 * - Inicjalizacja jest leniwa (on‑demand), żeby uniknąć błędów już na etapie
 *   ładowania workera na Cloudflare, gdy brakuje klucza API.
 * - Błąd MISSING_API_KEY jest wtedy łapany w handlerach API (np. /api/ai/quiz)
 *   i zamieniany na kontrolowaną odpowiedź JSON zamiast 502 z Cloudflare.
 */
export function getOpenRouterService(): OpenRouterService {
  if (cachedService) {
    return cachedService;
  }

  const apiKey =
    import.meta.env.OPENROUTER_API_KEY ??
    import.meta.env.OPENROUTER ??
    "";

  // Prosty log pomocniczy do debugowania konfiguracji (tylko w dev).
  if (!apiKey && import.meta.env.DEV) {
    console.warn(
      "[OpenRouter] Brak klucza API (OPENROUTER_API_KEY / OPENROUTER) w import.meta.env.",
    );
  } else if (apiKey && import.meta.env.DEV) {
    // Nie wypisujemy całego klucza, tylko prefiks – ze względów bezpieczeństwa.
    console.log(
      "[OpenRouter] Załadowano klucz API, prefiks:",
      String(apiKey).slice(0, 8),
      "********",
    );
  }

  if (!apiKey) {
    // Rzucamy kontrolowany błąd, który endpoint może przekonwertować na 500 z JSON-em,
    // zamiast doprowadzić do awarii całego workera (Cloudflare 502).
    throw new OpenRouterError(
      "MISSING_API_KEY",
      "Brak konfiguracji klucza OpenRouter API (OPENROUTER_API_KEY).",
    );
  }

  cachedService = new OpenRouterService({
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

  return cachedService;
}

