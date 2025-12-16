import { OpenRouterService, OpenRouterError } from "./openrouter.service";

/**
 * Domyślny model OpenRouter – można nadpisać przez OPENROUTER_DEFAULT_MODEL.
 */
const defaultModel =
  import.meta.env.OPENROUTER_DEFAULT_MODEL ?? "openai/gpt-4o-mini";

/**
 * Bezpieczne wykrywanie środowiska (dev / prod).
 */
const isDev = import.meta.env.MODE === "development";

/**
 * Adres aplikacji używany jako HTTP-Referer dla OpenRouter.
 *
 * Kolejność źródeł:
 * 1. PUBLIC_SITE_URL – możesz go ustawić ręcznie (np. na własną domenę).
 * 2. CF_PAGES_URL – automatyczna domena Cloudflare Pages.
 * 3. Fallback:
 *    - w dev: http://localhost:4321 (domyślny port Astro),
 *    - w produkcji: https://mini-games-yur.pages.dev (domena projektu).
 */
const siteUrl =
  import.meta.env.PUBLIC_SITE_URL ??
  import.meta.env.CF_PAGES_URL ??
  (isDev ? "http://localhost:4321" : "https://mini-games-yur.pages.dev");

/**
 * Zwraca nową instancję OpenRouterService skonfigurowaną na podstawie env.
 * Używana wyłącznie po stronie serwera (endpointy Astro / middleware).
 */
export function getOpenRouterService(): OpenRouterService {
  const apiKey =
    import.meta.env.OPENROUTER_API_KEY ??
    import.meta.env.OPENROUTER ??
    "";

  if (!apiKey) {
    throw new OpenRouterError(
      "MISSING_API_KEY",
      "Brak konfiguracji klucza OpenRouter API (OPENROUTER_API_KEY).",
    );
  }

  return new OpenRouterService({
    apiKey,
    defaultModel,
    defaultParams: {
      temperature: 0.7,
      maxTokens: 512,
    },
    // Cloudflare Edge ma limity czasu (~10s) – trzymamy się poniżej.
    requestTimeoutMs: 6_000,
    siteUrl,
    logger: (message, meta) => {
      // Prosty logger serwerowy – nie wypisujemy promptów ani pełnych odpowiedzi.
      console.error("[OpenRouterService]", message, meta ?? "");
    },
  });
}
