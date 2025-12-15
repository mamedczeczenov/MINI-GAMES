/**
 * OpenRouter service for server-side usage in Astro/Node.
 * This module must NEVER be imported in client-side code, because it uses a secret API key.
 */

type OpenRouterModelParams = {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
};

type OpenRouterServiceConfig = {
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
  defaultParams?: OpenRouterModelParams;
  requestTimeoutMs?: number;
  httpClient?: typeof fetch;
  logger?: (message: string, meta?: unknown) => void;
  /**
   * Optional public URL of this application used as HTTP-Referer for OpenRouter.
   * If not provided, the service will attempt to read PUBLIC_SITE_URL from environment variables.
   */
  siteUrl?: string;
};

type ChatMessageRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: ChatMessageRole;
  content: string;
};

type MessageBuilderInput = {
  systemPrompt?: string;
  userPrompt: string;
  history?: ChatMessage[];
};

type ChatCompletionOptions = {
  messages: ChatMessage[];
  model?: string;
  params?: OpenRouterModelParams;
  responseFormat?: unknown;
  abortSignal?: AbortSignal;
};

type ChatCompletionResult = {
  id: string;
  model: string;
  createdAt: Date;
  raw: unknown;
  text?: string;
  parsedJson?: unknown;
};

type JsonSchema = Record<string, unknown>;

type OpenRouterErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_CONFIG'
  | 'INVALID_INPUT'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_JSON'
  | 'API_ERROR';

type OpenRouterErrorOptions = {
  status?: number;
  cause?: unknown;
  details?: unknown;
};

class OpenRouterError extends Error {
  public readonly code: OpenRouterErrorCode;
  public readonly status?: number;
  public readonly details?: unknown;

  constructor(code: OpenRouterErrorCode, message: string, options?: OpenRouterErrorOptions) {
    super(message);
    this.name = 'OpenRouterError';
    this.code = code;
    this.status = options?.status;
    this.details = options?.details;

    if (options?.cause) {
      // Node >=16 supports the Error cause option; keep assignment for TS consumers.
      (this as any).cause = options.cause;
    }
  }

  static fromApiResponse(status: number, body: unknown): OpenRouterError {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? (body as any).error?.message ?? 'Błąd w odpowiedzi OpenRouter'
        : 'Błąd w odpowiedzi OpenRouter';

    return new OpenRouterError('API_ERROR', message, { status, details: body });
  }

  get isTransient(): boolean {
    if (this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT') {
      return true;
    }

    if (typeof this.status === 'number') {
      return this.status >= 500 && this.status < 600;
    }

    return false;
  }
}

class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultParams: OpenRouterModelParams;
  private readonly requestTimeoutMs?: number;
  private readonly httpClient: typeof fetch;
  private readonly logger?: (message: string, meta?: unknown) => void;
  private readonly maxRetries = 1;

  constructor(private readonly config: OpenRouterServiceConfig) {
    if (!config.apiKey) {
      throw new OpenRouterError(
        'MISSING_API_KEY',
        'Brak konfiguracji klucza OpenRouter API (OPENROUTER_API_KEY).',
      );
    }

    if (!config.defaultModel) {
      throw new OpenRouterError(
        'INVALID_CONFIG',
        'Wymagany jest domyślny model OpenRouter (defaultModel).',
      );
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
    this.defaultModel = config.defaultModel;
    this.defaultParams = config.defaultParams ?? {};
    this.requestTimeoutMs = config.requestTimeoutMs;
    this.logger = config.logger;

    if (config.httpClient) {
      this.httpClient = config.httpClient;
    } else if (typeof fetch === 'function') {
      this.httpClient = fetch;
    } else {
      throw new OpenRouterError(
        'INVALID_CONFIG',
        'Brak dostępnej implementacji fetch dla OpenRouterService.',
      );
    }
  }

  /**
   * Zwraca bezpieczny podzbiór konfiguracji serwisu (bez klucza API).
   * Może być użyty przez inne warstwy (np. endpointy), aby odczytać domyślne ustawienia modelu.
   */
  public getConfig(): Pick<
    OpenRouterServiceConfig,
    'baseUrl' | 'defaultModel' | 'defaultParams' | 'requestTimeoutMs'
  > {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      defaultParams: this.defaultParams,
      requestTimeoutMs: this.requestTimeoutMs,
    };
  }

  /**
   * Buduje tablicę wiadomości czatu na podstawie komunikatu systemowego, historii i komunikatu użytkownika.
   * Gwarantuje, że lista wiadomości jest niepusta i że komunikat użytkownika nie jest pustym stringiem.
   *
   * @throws OpenRouterError z kodem INVALID_INPUT, jeśli komunikat użytkownika jest pusty.
   */
  public buildSystemAndUserMessages(input: MessageBuilderInput): ChatMessage[] {
    const { systemPrompt, userPrompt, history } = input;

    if (!userPrompt || userPrompt.trim().length === 0) {
      throw new OpenRouterError('INVALID_INPUT', 'Komunikat użytkownika nie może być pusty.');
    }

    const messages: ChatMessage[] = [];

    if (systemPrompt && systemPrompt.trim().length > 0) {
      messages.push({ role: 'system', content: systemPrompt.trim() });
    }

    if (history && Array.isArray(history)) {
      messages.push(...history);
    }

    messages.push({ role: 'user', content: userPrompt });

    return messages;
  }

  /**
   * Tworzy obiekt response_format zgodny z wymaganiami OpenRouter dla odpowiedzi w formacie JSON Schema.
   *
   * @param schemaName Nazwa schematu (wymagana, niepusta).
   * @param schema Obiekt schematu JSON (wymagany).
   * @throws OpenRouterError z kodem INVALID_INPUT, jeśli nazwa lub schemat są nieprawidłowe.
   */
  public buildJsonSchemaResponseFormat(schemaName: string, schema: JsonSchema) {
    if (!schemaName || schemaName.trim().length === 0) {
      throw new OpenRouterError('INVALID_INPUT', 'Nazwa schematu response_format nie może być pusta.');
    }

    if (!schema || typeof schema !== 'object') {
      throw new OpenRouterError(
        'INVALID_INPUT',
        'Schemat JSON dla response_format musi być obiektem.',
      );
    }

    return {
      type: 'json_schema' as const,
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
      },
    };
  }

  /**
   * Łączy parametry modelu przekazane w wywołaniu z domyślnymi parametrami z konfiguracji serwisu.
   * Parametry z wywołania nadpisują wartości domyślne.
   */
  public withDefaults(params?: OpenRouterModelParams): OpenRouterModelParams {
    return {
      ...this.defaultParams,
      ...params,
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
  public async generateChatCompletion(
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    if (!options || !Array.isArray(options.messages) || options.messages.length === 0) {
      throw new OpenRouterError('INVALID_INPUT', 'Lista wiadomości (messages) nie może być pusta.', {
        details: { options },
      });
    }

    const requestBody = this.buildRequestBody(options);
    const controller = new AbortController();
    const { abortSignal } = options;

    let timeoutId: NodeJS.Timeout | undefined;

    if (this.requestTimeoutMs && this.requestTimeoutMs > 0) {
      timeoutId = setTimeout(() => {
        controller.abort(
          new OpenRouterError('TIMEOUT', 'Przekroczono limit czasu żądania do OpenRouter.'),
        );
      }, this.requestTimeoutMs);
    }

    if (abortSignal) {
      if (abortSignal.aborted) {
        controller.abort(abortSignal.reason);
      } else {
        abortSignal.addEventListener(
          'abort',
          () => {
            controller.abort(abortSignal.reason);
          },
          { once: true },
        );
      }
    }

    try {
      const raw = await this.executeWithRetry(() =>
        this.doRequest('/chat/completions', requestBody, controller.signal),
      );
      return this.parseCompletion(raw);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    // attempt 0 = pierwsze wywołanie, następnie maxRetries ponownych prób
    // czyli łącznie maxRetries + 1 prób
    // prosty backoff: 200ms * (attempt + 1)
    // brak backoffu przy ostatniej próbie
    // brak retries dla błędów trwałych
    // logowanie każdej nieudanej próby
    // brak retry jeśli brak loggera – działanie pozostaje takie samo
    // priorytet: prostota i czytelność
    // zgodnie z zasadą: guard clauses + happy path na końcu
    let lastError: unknown;

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
          this.logger('OpenRouterService transient error, retrying', {
            attempt,
            delayMs,
            code: error.code,
            status: error.status,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      attempt += 1;
    }

    // Nie powinno się zdarzyć, ale dla bezpieczeństwa:
    throw lastError ?? new OpenRouterError('API_ERROR', 'Nieznany błąd OpenRouter.');
  }

  private buildRequestBody(options: ChatCompletionOptions) {
    const model = options.model ?? this.defaultModel;
    const params = this.withDefaults(options.params);

    const body: Record<string, unknown> = {
      model,
      messages: options.messages,
      response_format: options.responseFormat,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      top_p: params.topP,
      presence_penalty: params.presencePenalty,
      frequency_penalty: params.frequencyPenalty,
      seed: params.seed,
    };

    // Usuń wszystkie pola z wartością undefined, aby nie nadpisywać domyślnych ustawień API.
    Object.keys(body).forEach((key) => {
      if (body[key] === undefined) {
        delete body[key];
      }
    });

    return body;
  }

  private buildRequestHeaders(): HeadersInit {
    const siteUrl =
      this.config.siteUrl ??
      // Astro często używa PUBLIC_SITE_URL jako adresu publicznego aplikacji.
      process.env.PUBLIC_SITE_URL ??
      'http://localhost';

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'HTTP-Referer': siteUrl,
      // Zgodnie z zaleceniami OpenRouter – prosta, rozpoznawalna nazwa aplikacji.
      'X-Title': 'Local App',
    };
  }

  private async doRequest(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await this.httpClient(url, {
        method: 'POST',
        headers: this.buildRequestHeaders(),
        body: JSON.stringify(body),
        signal,
      });

      return this.handleResponse(response);
    } catch (error) {
      if (error instanceof OpenRouterError) {
        throw error;
      }

      if (this.logger) {
        this.logger('OpenRouterService network error', { error });
      }

      throw new OpenRouterError('NETWORK_ERROR', 'Błąd sieci podczas komunikacji z OpenRouter.', {
        cause: error,
      });
    }
  }

  private async handleResponse(response: Response): Promise<unknown> {
    let json: unknown;

    try {
      json = await response.json();
    } catch (error) {
      if (this.logger) {
        this.logger('OpenRouterService invalid JSON', { error });
      }

      throw new OpenRouterError('INVALID_JSON', 'Nieprawidłowy JSON w odpowiedzi OpenRouter.', {
        cause: error,
      });
    }

    if (!response.ok) {
      if (this.logger) {
        this.logger('OpenRouterService API error', {
          status: response.status,
          body: json,
        });
      }

      throw OpenRouterError.fromApiResponse(response.status, json);
    }

    return json;
  }

  private parseCompletion(raw: any): ChatCompletionResult {
    const choice = raw?.choices?.[0];
    const content = choice?.message?.content;

    let parsedJson: unknown;

    if (typeof content === 'string') {
      try {
        parsedJson = JSON.parse(content);
      } catch {
        // Model mógł zwrócić zwykły tekst – to jest akceptowalne.
      }
    }

    return {
      id: raw.id,
      model: raw.model,
      createdAt: new Date(raw.created * 1000),
      raw,
      text: typeof content === 'string' ? content : undefined,
      parsedJson,
    };
  }
}

export {
  OpenRouterService,
  OpenRouterError,
  type OpenRouterServiceConfig,
  type OpenRouterModelParams,
  type ChatMessage,
  type ChatCompletionOptions,
  type ChatCompletionResult,
  type JsonSchema,
};


