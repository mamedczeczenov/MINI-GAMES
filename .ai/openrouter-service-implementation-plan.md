## 1. Opis usługi

Usługa `OpenRouterService` jest cienką, typizowaną warstwą nad API OpenRouter, wykorzystywaną do uzupełniania czatów LLM w aplikacji mini-gier.  
Jej główne zadania:

- **1) Budowanie zapytań do OpenRouter**: transformacja danych domenowych (np. informacje o użytkowniku, kontekście gry) na strukturę `messages`, `model`, `response_format` oraz parametry modeli.
- **2) Wysyłanie zapytań HTTP**: bezpieczne i odporne na błędy wywołania `POST` do endpointu OpenRouter (np. `/api/v1/chat/completions`) z użyciem `fetch` w środowisku Node.
- **3) Utrzymywanie konfiguracji**: enkapsulacja klucza API, domyślnego modelu, limitów, timeoutów oraz domyślnych parametrów modeli.
- **4) Walidacja odpowiedzi**: weryfikacja statusu HTTP, struktury JSON oraz – w przypadku `response_format` – opcjonalna walidacja odpowiedzi względem schematu (np. z użyciem Zod lub innego walidatora).
- **5) Standaryzacja błędów**: mapowanie błędów sieciowych, limitów, błędnych parametrów i błędów OpenRouter na spójne wyjątki domenowe (`OpenRouterError`), wykorzystywane później w API Astro (`src/pages/api/...`).
- **6) Integracja z resztą systemu**: użycie w warstwie usług (`src/services`) oraz w endpointach API (`src/pages/api`) zgodnie z architekturą Astro + Node + Supabase.

Usługa jest projektowana jako czysto backendowa – wywoływana wyłącznie z serwera (Astro endpoints / middleware), nigdy z przeglądarki, aby nie ujawnić klucza OpenRouter.

---

## 2. Opis konstruktora

Zakładana sygnatura klasy (TypeScript, backend Node w projekcie Astro):

```ts
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
  baseUrl?: string; // domyślnie: 'https://openrouter.ai/api/v1'
  defaultModel: string; // np. 'openai/gpt-4.1-mini'
  defaultParams?: OpenRouterModelParams;
  requestTimeoutMs?: number;
  httpClient?: typeof fetch;
  logger?: (message: string, meta?: unknown) => void;
};

class OpenRouterService {
  constructor(private readonly config: OpenRouterServiceConfig) {
    // walidacja klucza, URL, domyślnych parametrów itd.
  }
}
```

**Konstruktor – rola i zachowanie:**

- **1) Inicjalizacja konfiguracji**  
  - Odczyt klucza API z `config.apiKey` (w praktyce z `process.env.OPENROUTER_API_KEY` przekazanego podczas tworzenia instancji).  
  - Ustawienie `baseUrl` z domyślną wartością `https://openrouter.ai/api/v1`.

- **2) Walidacja wejścia**  
  - Sprawdzenie obecności klucza API (brak → rzucenie kontrolowanego błędu startowego).  
  - Walidacja logiki parametrów modeli (np. `temperature` w zakresie 0–2, `maxTokens` > 0).

- **3) Konfiguracja zależności**  
  - Użycie wstrzykniętego `httpClient` (ułatwia testy z msw/Vitest).  
  - Użycie wstrzykniętego `logger` do logowania błędów i metryk.

---

## 3. Publiczne metody i pola

Poniżej przykładowy interfejs publiczny usługi dopasowany do stacku (Node + Astro + TypeScript).

- **3.1. Pole `config` (tylko do odczytu)**  
  - **Cel**: ekspozycja minimalnych informacji konfiguracyjnych (np. nazwa domyślnego modelu) na potrzeby innych usług.  
  - **Zalecenie**: unikać zwracania wrażliwych danych (klucz API nie powinien być bezpośrednio dostępny).

- **3.2. `generateChatCompletion` – podstawowe wywołanie czatu**  

  ```ts
  type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

  type ChatCompletionOptions = {
    messages: ChatMessage[];
    model?: string;
    params?: OpenRouterModelParams;
    responseFormat?: unknown; // np. typ kompatybilny z OpenRouter response_format
    abortSignal?: AbortSignal;
  };

  type ChatCompletionResult = {
    id: string;
    model: string;
    createdAt: Date;
    raw: unknown; // surowa odpowiedź API
    text?: string; // złączone 'content' z pierwszego wyboru
    parsedJson?: unknown; // zparsowany JSON, jeśli użyto response_format
  };

  generateChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult>;
  ```

  - **Funkcjonalność**:
    - Buduje pełny request do OpenRouter: `model`, `messages`, `response_format`, parametry modeli.
    - Wysyła zapytanie `POST` do `/chat/completions` z nagłówkami autoryzacji i identyfikacji klienta.
    - Zwraca ujednolicony wynik z tekstem i opcjonalnie zparsowanym JSON-em.

- **3.3. `buildSystemAndUserMessages` – pomocnicze budowanie wiadomości**  

  ```ts
  type MessageBuilderInput = {
    systemPrompt?: string;
    userPrompt: string;
    history?: ChatMessage[];
  };

  buildSystemAndUserMessages(input: MessageBuilderInput): ChatMessage[];
  ```

  - **Funkcjonalność**:
    - Tworzy tablicę `messages` zaczynającą się od opcjonalnego komunikatu systemowego i wiadomości użytkownika.
    - Dołącza historię dialogu, jeśli jest przekazana (np. multi-turn chat).

- **3.4. `buildJsonSchemaResponseFormat` – konstrukcja `response_format`**  

  ```ts
  type JsonSchema = Record<string, unknown>;

  buildJsonSchemaResponseFormat(schemaName: string, schema: JsonSchema) {
    return {
      type: 'json_schema',
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
      },
    } as const;
  }
  ```

  - **Funkcjonalność**:
    - Tworzy poprawnie ustrukturyzowany obiekt `response_format` dla OpenRouter.
    - Ułatwia ponowne wykorzystanie schematów (np. te same struktury odpowiedzi w różnych grach).

- **3.5. `withDefaults` – stosowanie domyślnych parametrów modelu**  

  ```ts
  withDefaults(params?: OpenRouterModelParams): OpenRouterModelParams;
  ```

  - **Funkcjonalność**:
    - Łączy parametry przekazane per-wywołanie z parametrami domyślnymi z konfiguracji.

- **3.6. Publiczne typy pomocnicze**  
  - **Cel**: eksportowanie typów (`ChatMessage`, `ChatCompletionOptions`, `OpenRouterModelParams`) z modułu usługi, aby endpointy API i komponenty serwerowe używały tych samych definicji.

---

## 4. Prywatne metody i pola

- **4.1. Prywatne pola**

  - **`private readonly apiKey: string`**  
    - Przechowuje klucz OpenRouter.  
    - Wyzwania:
      1. Bezpieczne przechowywanie (env, brak logowania).
      2. Rotacja kluczy bez restartu aplikacji (w bardziej zaawansowanych scenariuszach).  
    - Rozwiązania:
      1. Odczyt z `process.env` tylko po stronie serwera, nigdy nie eksportować do frontendu; maskować w logach.
      2. Utrzymywać pojedynczą instancję usługi inicjalizowaną przy starcie; rotację realizować na poziomie infrastruktury (sekrety w CI/CD, zmiana env + restart).

  - **`private readonly httpClient: typeof fetch`**  
    - Wyzwania:
      1. Testowalność (mockowanie wywołań).  
    - Rozwiązania:
      1. Wstrzyknięcie zależności w konstruktorze, użycie `msw` w testach oraz `node-fetch` / globalnego `fetch` w runtime.

- **4.2. `private buildRequestBody` – składanie payloadu**

  ```ts
  private buildRequestBody(options: ChatCompletionOptions) {
    const model = options.model ?? this.config.defaultModel;
    const params = this.withDefaults(options.params);

    return {
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
  }
  ```

  - **Wyzwania**:
    1. Spójne mapowanie nazw pól (np. `maxTokens` → `max_tokens`).  
    2. Pomijanie `undefined`, aby nie nadpisywać domyślnych ustawień API.  
  - **Rozwiązania**:
    1. Jeden centralny mapper w tej metodzie; brak duplikacji w innych miejscach.  
    2. Użycie filtrowania obiektu (np. tworzenie nowego obiektu bez pól `undefined`).

- **4.3. `private buildRequestHeaders` – nagłówki HTTP**

  ```ts
  private buildRequestHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://twoja-domena.example', // jeśli wymagane
      'X-Title': 'Mini Games Platform', // identyfikacja klienta
    };
  }
  ```

  - **Wyzwania**:
    1. Spójne ustawianie nagłówków wymaganych przez OpenRouter (np. identyfikacja clienta).  
  - **Rozwiązania**:
    1. Pojedyncza metoda prywatna, brak rozproszonych definicji nagłówków.

- **4.4. `private async doRequest` – realizacja wywołania HTTP**

  ```ts
  private async doRequest(
    path: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const url = `${this.config.baseUrl ?? 'https://openrouter.ai/api/v1'}${path}`;

    const response = await this.httpClient(url, {
      method: 'POST',
      headers: this.buildRequestHeaders(),
      body: JSON.stringify(body),
      signal,
    });

    return this.handleResponse(response);
  }
  ```

  - **Wyzwania**:
    1. Obsługa timeoutów i przerwań (np. użytkownik opuścił stronę).  
    2. Rozpoznanie błędów sieciowych vs. błędów odpowiedzi API.  
  - **Rozwiązania**:
    1. Użycie `AbortController` i `setTimeout` po stronie wywołującej (Astro endpoint).  
    2. Delegowanie logiki do `handleResponse` + dedykowane typy błędów.

- **4.5. `private async handleResponse` – interpretacja odpowiedzi**

  ```ts
  private async handleResponse(response: Response): Promise<unknown> {
    let json: any;
    try {
      json = await response.json();
    } catch (error) {
      throw new OpenRouterError('INVALID_JSON', 'Nieprawidłowy JSON w odpowiedzi OpenRouter', { cause: error });
    }

    if (!response.ok) {
      throw OpenRouterError.fromApiResponse(response.status, json);
    }

    return json;
  }
  ```

  - **Wyzwania**:
    1. Błędy deserializacji JSON.  
    2. Spójne mapowanie błędów statusu HTTP na błędy domenowe.  
  - **Rozwiązania**:
    1. Wyłapywanie błędów parsowania i rzucanie kontrolowanego `OpenRouterError`.  
    2. Statyczna metoda `fromApiResponse` w `OpenRouterError` (patrz sekcja błędów).

- **4.6. `private parseCompletion` – wyciąganie tekstu / JSON z odpowiedzi**

  ```ts
  private parseCompletion(raw: any): ChatCompletionResult {
    const choice = raw?.choices?.[0];
    const content = choice?.message?.content;

    let parsedJson: unknown;
    if (typeof content === 'string') {
      try {
        parsedJson = JSON.parse(content);
      } catch {
        // dopuszczalne: model mógł zwrócić zwykły tekst
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
  ```

  - **Wyzwania**:
    1. Różne formaty `content` (tekst vs. struktura JSON).  
    2. Błędy parsowania JSON przy `response_format`.  
  - **Rozwiązania**:
    1. Defensive programming (sprawdzanie typów, opcjonalne parsowanie).  
    2. Walidacja wyniku (np. Zod) na wyższej warstwie po otrzymaniu `parsedJson`.

---

## 5. Obsługa błędów

Zalecane jest wprowadzenie klasy domenowej `OpenRouterError`, zawierającej kod, wiadomość i dane dodatkowe.

- **5.1. Typowe scenariusze błędów (numerowane)**

  1. **Brak lub nieprawidłowy klucz API**  
     - Detekcja przy tworzeniu instancji usługi lub przy pierwszym żądaniu (`401/403`).
  2. **Błędy sieciowe / timeout**  
     - Przekroczenie limitu czasu, brak połączenia z OpenRouter.
  3. **Błąd walidacji parametrów wejściowych**  
     - Niewspierany model, `temperature` poza zakresem, niepoprawny `response_format`.
  4. **Błędy po stronie OpenRouter (4xx/5xx)**  
     - Limit zapytań, błąd wewnętrzny, nieprawidłowe dane wejściowe zgłoszone przez API.
  5. **Nieprawidłowy JSON w odpowiedzi**  
     - Odpowiedź nie jest poprawnym JSON-em lub jest niezgodna z oczekiwanym kształtem.
  6. **Błąd parsowania/zgodności z `response_format`**  
     - Model nie zwrócił poprawnego JSON-a lub nie spełnił schematu.
  7. **Błędy integracyjne w endpointach Astro**  
     - Nieprawidłowe mapowanie danych z requestu użytkownika na wywołanie usługi.

- **5.2. Odpowiedzi HTTP w endpointach Astro**

Endpointy w `src/pages/api/...` powinny mapować `OpenRouterError` na spójne statusy HTTP:

- **1)** `400 Bad Request` – błędne parametry wejściowe (np. brak wymaganych pól, zły model).  
- **2)** `401 Unauthorized` – brak konfiguracji klucza API (błąd serwera, ale bez ujawniania szczegółów).  
- **3)** `429 Too Many Requests` – przekroczony limit zapytań (jeśli rozpoznany w odpowiedzi OpenRouter).  
- **4)** `502/503` – problemy sieciowe / niedostępność usługi zewnętrznej.  
- **5)** `500 Internal Server Error` – wszystkie pozostałe błędy niesklasyfikowane.

W treści odpowiedzi API zwracaj prostą strukturę JSON (bez szczegółów wewnętrznych):

```json
{
  "error": {
    "code": "OPENROUTER_TIMEOUT",
    "message": "Usługa AI jest chwilowo niedostępna. Spróbuj ponownie za chwilę."
  }
}
```

---

## 6. Kwestie bezpieczeństwa

- **6.1. Bezpieczne przechowywanie klucza API**
  - Przechowywać klucz w zmiennej środowiskowej (`OPENROUTER_API_KEY`) skonfigurowanej w środowisku uruchomieniowym (np. `.env` lokalnie, sekrety w CI/CD/hostingu).  
  - Nigdy nie udostępniać klucza do frontendu ani nie logować go w całości.

- **6.2. Ograniczenie ekspozycji danych w logach**
  - Logować tylko niezbędne informacje (np. identyfikator żądania, czas odpowiedzi, status).  
  - Nie logować pełnych promptów, jeśli mogą zawierać dane osobowe lub wrażliwe.

- **6.3. Kontrola dostępu**
  - Endpointy, które wykorzystują OpenRouter do obsługi funkcji dostępnych tylko dla zalogowanych użytkowników, muszą weryfikować sesję Supabase (middleware w `src/middleware` lub w samym endpointzie).  
  - Utrzymywać rozdział odpowiedzialności: autoryzacja w warstwie auth/Supabase, a `OpenRouterService` nie zarządza tożsamością.

- **6.4. Ochrona przed nadużyciami**
  - Możliwe ograniczanie liczby zapytań na użytkownika/czas (rate limiting) na poziomie endpointu Astro.  
  - Walidacja wejścia (np. maksymalna długość promptów) przed przekazaniem do OpenRouter.

- **6.5. Ochrona przed prompt injection**
  - Komunikat systemowy powinien jasno określać ograniczenia modelu i zakazać ignorowania poleceń systemowych.  
  - Nie dołączać danych poufnych do promptu, jeśli nie jest to konieczne.

---

## 7. Plan wdrożenia krok po kroku

### 7.1. Przygotowanie środowiska i konfiguracji

- **1)** Dodaj zmienną środowiskową `OPENROUTER_API_KEY` we wszystkich środowiskach (dev, stage, prod).  
- **2)** Zaktualizuj `README.md`, opisując wymóg ustawienia tej zmiennej.  
- **3)** Jeśli potrzebujesz dodatkowych bibliotek (np. `zod` do walidacji JSON), dodaj je do `package.json` i zainstaluj.

### 7.2. Implementacja usługi w `src/services`

- **1)** Utwórz plik `src/services/openRouterService.ts` i zaimplementuj klasę `OpenRouterService` zgodnie z opisem (konstruktor, metody publiczne i prywatne).  
- **2)** Dodaj eksport pojedynczej instancji skonfigurowanej z env:

```ts
export const openRouterService = new OpenRouterService({
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultModel: 'openai/gpt-4.1-mini',
  defaultParams: { temperature: 0.7, maxTokens: 512 },
});
```

- **3)** Dodaj typy (`ChatMessage`, `ChatCompletionOptions`, `OpenRouterModelParams`) oraz wyeksportuj je z modułu.

### 7.3. Integracja z endpointem Astro

- **1)** Utwórz plik `src/pages/api/ai/chat.ts` (lub inny uzgodniony endpoint).  
- **2)** W endpointzie:
  - Pobierz dane z `request` (np. `systemPrompt`, `userPrompt`, `history`, `schemaName`, `schema`).  
  - Zbuduj `messages` za pomocą `openRouterService.buildSystemAndUserMessages`.  
  - Jeśli wymagany jest wynik strukturalny, zbuduj `response_format` przez `buildJsonSchemaResponseFormat`.  
  - Wywołaj `openRouterService.generateChatCompletion` i zwróć wynik do frontendu.
- **3)** Zaimplementuj obsługę błędów:
  - Opakuj wywołanie w `try/catch`.  
  - W przypadku `OpenRouterError` – zwracaj status i kod zgodnie z sekcją 5.2.  
  - W przypadku innych wyjątków – loguj je i zwróć `500`.

### 7.4. Konfiguracja komunikatu systemowego, komunikatu użytkownika, response_format, nazwy modelu i parametrów modelu

Poniżej konkretne, numerowane przykłady użycia w kodzie endpointu (niezależne od kontekstu gry).

- **1) Komunikat systemowy**

```ts
const systemPrompt = `
Jesteś asystentem wspierającym graczy w prostej platformie mini-gier.
Odpowiadasz zwięźle po polsku, bez zbędnych dygresji.
Nie ujawniasz szczegółów implementacyjnych ani klucza API.
`.trim();
```

- **2) Komunikat użytkownika**

```ts
const userPrompt = 'Podpowiedz, jak mogę poprawić swój czas reakcji w tej grze?';

const messages = openRouterService.buildSystemAndUserMessages({
  systemPrompt,
  userPrompt,
  history: [], // opcjonalnie poprzednie wiadomości
});
```

- **3) Ustrukturyzowana odpowiedź poprzez `response_format` (JSON Schema)**  

Przykład schematu oczekiwanej odpowiedzi (np. wskazówki poprawy wyniku):

```ts
const tipsSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    tips: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['title', 'summary', 'tips'],
} as const;

const responseFormat = openRouterService.buildJsonSchemaResponseFormat(
  'reaction_time_tips',
  tipsSchema,
);
```

Powstały obiekt będzie miał formę:

```ts
{
  type: 'json_schema',
  json_schema: {
    name: 'reaction_time_tips',
    strict: true,
    schema: tipsSchema,
  },
}
```

Następnie używasz go w wywołaniu:

```ts
const result = await openRouterService.generateChatCompletion({
  messages,
  responseFormat,
});

// opcjonalna walidacja tipsSchema vs. result.parsedJson
```

- **4) Nazwa modelu**

```ts
const result = await openRouterService.generateChatCompletion({
  messages,
  model: 'openai/gpt-4.1-mini', // nadpisanie defaultModel, jeśli potrzeba
});
```

Jeśli nie podasz `model`, usługa użyje `config.defaultModel`.

- **5) Parametry modelu**

```ts
const result = await openRouterService.generateChatCompletion({
  messages,
  params: {
    temperature: 0.6,
    maxTokens: 256,
    topP: 0.9,
    presencePenalty: 0.1,
    frequencyPenalty: 0.1,
  },
});
```

Parametry te zostaną połączone z domyślnymi z konfiguracji przez `withDefaults`, a następnie zmapowane na pola wymagane przez OpenRouter.

### 7.5. Testy jednostkowe i integracyjne

- **1)** Napisz testy jednostkowe dla `OpenRouterService` w `src/services/__tests__/openRouterService.test.ts`:
  - Mockuj `httpClient` (lub użyj `msw`) do symulowania odpowiedzi sukcesu i błędów.  
  - Sprawdź poprawność budowania `messages`, ustawiania `model`, `response_format` i mapowania błędów.
- **2)** Dodaj testy integracyjne endpointu (`Vitest + @testing-library` + `msw`):
  - Wywołaj endpoint z przykładowym requestem; zweryfikuj odpowiedź JSON i kody błędów.  
  - Zadbaj o scenariusze braku klucza API, timeoutu i błędnej odpowiedzi schematowej.

### 7.6. Włączenie usługi w UI (frontend Astro/React)

- **1)** W komponentach React/astro (np. panel podpowiedzi w grach) wywołuj stworzony endpoint `/api/ai/chat` po stronie klienta:  
  - Wysyłaj dane potrzebne do budowy promptu (`userPrompt`, ewentualnie kontekst gry).  
  - Nie przekazuj po stronie klienta danych wrażliwych, które nie są potrzebne do odpowiedzi.  
- **2)** Obsłuż stany ładowania, sukcesu i błędu:
  - W przypadku błędów wyświetl prosty komunikat dla użytkownika (np. „Asystent jest chwilowo niedostępny”).  
- **3)** Upewnij się, że logika UI jest niezależna od konkretnego modelu – model można zmieniać w konfiguracji usługi.


