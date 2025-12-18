class OpenRouterError extends Error {
  code;
  status;
  details;
  constructor(code, message, options) {
    super(message);
    this.name = "OpenRouterError";
    this.code = code;
    this.status = options?.status;
    this.details = options?.details;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
  static fromApiResponse(status, body) {
    const message = typeof body === "object" && body !== null && "error" in body ? body.error?.message ?? "Błąd w odpowiedzi OpenRouter" : "Błąd w odpowiedzi OpenRouter";
    return new OpenRouterError("API_ERROR", message, { status, details: body });
  }
  get isTransient() {
    if (this.code === "NETWORK_ERROR") {
      return true;
    }
    if (typeof this.status === "number") {
      return this.status >= 500 && this.status < 600;
    }
    return false;
  }
}
class OpenRouterService {
  constructor(config) {
    this.config = config;
    if (!config.apiKey) {
      throw new OpenRouterError(
        "MISSING_API_KEY",
        "Brak konfiguracji klucza OpenRouter API (OPENROUTER_API_KEY)."
      );
    }
    if (!config.defaultModel) {
      throw new OpenRouterError(
        "INVALID_CONFIG",
        "Wymagany jest domyślny model OpenRouter (defaultModel)."
      );
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? "https://openrouter.ai/api/v1").replace(/\/+$/, "");
    this.defaultModel = config.defaultModel;
    this.defaultParams = config.defaultParams ?? {};
    this.requestTimeoutMs = config.requestTimeoutMs;
    this.logger = config.logger;
    if (config.httpClient) {
      this.httpClient = config.httpClient;
    } else if (typeof fetch === "function") {
      this.httpClient = fetch;
    } else {
      throw new OpenRouterError(
        "INVALID_CONFIG",
        "Brak dostępnej implementacji fetch dla OpenRouterService."
      );
    }
  }
  apiKey;
  baseUrl;
  defaultModel;
  defaultParams;
  requestTimeoutMs;
  httpClient;
  logger;
  maxRetries = 1;
  /**
   * Zwraca bezpieczny podzbiór konfiguracji serwisu (bez klucza API).
   * Może być użyty przez inne warstwy (np. endpointy), aby odczytać domyślne ustawienia modelu.
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      defaultParams: this.defaultParams,
      requestTimeoutMs: this.requestTimeoutMs
    };
  }
  /**
   * Buduje tablicę wiadomości czatu na podstawie komunikatu systemowego, historii i komunikatu użytkownika.
   * Gwarantuje, że lista wiadomości jest niepusta i że komunikat użytkownika nie jest pustym stringiem.
   *
   * @throws OpenRouterError z kodem INVALID_INPUT, jeśli komunikat użytkownika jest pusty.
   */
  buildSystemAndUserMessages(input) {
    const { systemPrompt, userPrompt, history } = input;
    if (!userPrompt || userPrompt.trim().length === 0) {
      throw new OpenRouterError("INVALID_INPUT", "Komunikat użytkownika nie może być pusty.");
    }
    const messages = [];
    if (systemPrompt && systemPrompt.trim().length > 0) {
      messages.push({ role: "system", content: systemPrompt.trim() });
    }
    if (history && Array.isArray(history)) {
      messages.push(...history);
    }
    messages.push({ role: "user", content: userPrompt });
    return messages;
  }
  /**
   * Tworzy obiekt response_format zgodny z wymaganiami OpenRouter dla odpowiedzi w formacie JSON Schema.
   *
   * @param schemaName Nazwa schematu (wymagana, niepusta).
   * @param schema Obiekt schematu JSON (wymagany).
   * @throws OpenRouterError z kodem INVALID_INPUT, jeśli nazwa lub schemat są nieprawidłowe.
   */
  buildJsonSchemaResponseFormat(schemaName, schema) {
    if (!schemaName || schemaName.trim().length === 0) {
      throw new OpenRouterError("INVALID_INPUT", "Nazwa schematu response_format nie może być pusta.");
    }
    if (!schema || typeof schema !== "object") {
      throw new OpenRouterError(
        "INVALID_INPUT",
        "Schemat JSON dla response_format musi być obiektem."
      );
    }
    return {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        strict: true,
        schema
      }
    };
  }
  /**
   * Łączy parametry modelu przekazane w wywołaniu z domyślnymi parametrami z konfiguracji serwisu.
   * Parametry z wywołania nadpisują wartości domyślne.
   */
  withDefaults(params) {
    return {
      ...this.defaultParams,
      ...params
    };
  }
  /**
   * Wykonuje wywołanie OpenRouter chat completions i zwraca ujednolicony wynik.
   * Odpowiada za:
   * - zbudowanie payloadu API,
   * - ustawienie limitu czasu (jeśli skonfigurowano),
   * - obsługę przerwania przez AbortSignal,
   * - proste ponowne próby dla błędów przejściowych.
   *
   * @throws OpenRouterError dla błędów konfiguracyjnych, wejściowych, sieciowych lub błędów API.
   */
  async generateChatCompletion(options) {
    if (!options || !Array.isArray(options.messages) || options.messages.length === 0) {
      throw new OpenRouterError("INVALID_INPUT", "Lista wiadomości (messages) nie może być pusta.", {
        details: { options }
      });
    }
    const requestBody = this.buildRequestBody(options);
    let timeoutId;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : void 0;
    if (controller && this.requestTimeoutMs) {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, this.requestTimeoutMs);
    }
    try {
      const raw = await this.executeWithRetry(
        () => this.doRequest("/chat/completions", requestBody, controller?.signal)
      );
      return this.parseCompletion(raw);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
  async executeWithRetry(fn) {
    let attempt = 0;
    let lastError;
    while (attempt <= this.maxRetries) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (!(error instanceof OpenRouterError) || !error.isTransient || attempt === this.maxRetries) {
          throw error;
        }
        const delayMs = 200 * (attempt + 1);
        if (this.logger) {
          this.logger("OpenRouterService transient error, retrying", {
            attempt,
            delayMs,
            code: error.code,
            status: error.status
          });
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      attempt += 1;
    }
    throw lastError ?? new OpenRouterError("API_ERROR", "Nieznany błąd OpenRouter.");
  }
  buildRequestBody(options) {
    const model = options.model ?? this.defaultModel;
    const params = this.withDefaults(options.params);
    const body = {
      model,
      messages: options.messages,
      response_format: options.responseFormat,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      presence_penalty: params.presencePenalty,
      frequency_penalty: params.frequencyPenalty,
      seed: params.seed
    };
    Object.keys(body).forEach((key) => {
      if (body[key] === void 0) {
        delete body[key];
      }
    });
    return body;
  }
  buildRequestHeaders() {
    const siteUrl = this.config.siteUrl ?? "http://localhost";
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "HTTP-Referer": siteUrl,
      "Referer": siteUrl,
      // Cloudflare wymaga standardowego nagłówka Referer
      // Zgodnie z zaleceniami OpenRouter – prosta, rozpoznawalna nazwa aplikacji.
      // Dzięki temu na openrouter.ai w rankingach będzie widoczna Twoja nazwa.
      "X-Title": "Mini Games"
    };
  }
  async doRequest(path, body, signal) {
    const url = `${this.baseUrl}${path}`;
    try {
      const response = await this.httpClient(url, {
        method: "POST",
        headers: this.buildRequestHeaders(),
        body: JSON.stringify(body),
        signal
      });
      return this.handleResponse(response);
    } catch (error) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        if (this.logger) {
          this.logger("OpenRouterService timeout", { error, timeoutMs: this.requestTimeoutMs });
        }
        throw new OpenRouterError("TIMEOUT", `Przekroczono limit czasu żądania (${this.requestTimeoutMs}ms).`, {
          cause: error
        });
      }
      if (this.logger) {
        this.logger("OpenRouterService network error", { error });
      }
      throw new OpenRouterError("NETWORK_ERROR", "Błąd sieci podczas komunikacji z OpenRouter.", {
        cause: error
      });
    }
  }
  async handleResponse(response) {
    let json;
    try {
      json = await response.json();
    } catch (error) {
      if (this.logger) {
        this.logger("OpenRouterService invalid JSON", { error });
      }
      throw new OpenRouterError("INVALID_JSON", "Nieprawidłowy JSON w odpowiedzi OpenRouter.", {
        cause: error
      });
    }
    if (!response.ok) {
      if (this.logger) {
        this.logger("OpenRouterService API error", {
          status: response.status,
          body: json
        });
      }
      throw OpenRouterError.fromApiResponse(response.status, json);
    }
    return json;
  }
  parseCompletion(raw) {
    const choice = raw?.choices?.[0];
    const content = choice?.message?.content;
    let parsedJson;
    if (typeof content === "string") {
      try {
        parsedJson = JSON.parse(content);
      } catch {
      }
    }
    return {
      id: raw.id,
      model: raw.model,
      createdAt: new Date(raw.created * 1e3),
      raw,
      text: typeof content === "string" ? content : void 0,
      parsedJson
    };
  }
}

const defaultModel = "google/gemini-3-flash-preview";
const siteUrl = ("https://mini-games-yur.pages.dev");
let cachedService = null;
function getOpenRouterService() {
  if (cachedService && true) {
    return cachedService;
  }
  const apiKey = "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";
  const requestTimeoutMs = 9e3;
  cachedService = new OpenRouterService({
    apiKey,
    defaultModel,
    defaultParams: {
      temperature: 0.7,
      maxTokens: 512
    },
    requestTimeoutMs,
    siteUrl,
    logger: (message, meta) => {
      console.error("[OpenRouterService]", message, meta ?? "");
    }
  });
  return cachedService;
}

export { OpenRouterError as O, getOpenRouterService as g };
