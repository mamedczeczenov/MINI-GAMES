import { describe, it, expect, vi } from "vitest";
import {
  OpenRouterService,
  OpenRouterError,
  type OpenRouterServiceConfig,
} from "./openrouter.service";

const createTestConfig = (overrides: Partial<OpenRouterServiceConfig> = {}): OpenRouterServiceConfig => ({
  apiKey: "test-key",
  defaultModel: "test-model",
  httpClient: vi.fn(),
  ...overrides,
});

describe("OpenRouterService", () => {
  it("throws when apiKey is missing", () => {
    expect(
      () =>
        new OpenRouterService(
          createTestConfig({
            // @ts-expect-error – testuje brak klucza
            apiKey: "",
          }),
        ),
    ).toThrow(OpenRouterError);
  });

  it("builds system and user messages", () => {
    const service = new OpenRouterService(createTestConfig());

    const messages = service.buildSystemAndUserMessages({
      systemPrompt: "System prompt",
      userPrompt: "User prompt",
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ role: "system", content: "System prompt" });
    expect(messages[1]).toEqual({ role: "user", content: "User prompt" });
  });

  it("throws on empty user prompt", () => {
    const service = new OpenRouterService(createTestConfig());

    expect(() =>
      service.buildSystemAndUserMessages({
        systemPrompt: "System",
        userPrompt: "   ",
      }),
    ).toThrow(OpenRouterError);
  });
});


