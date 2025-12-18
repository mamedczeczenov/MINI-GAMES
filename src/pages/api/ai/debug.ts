import type { APIRoute } from "astro";
import { getOpenRouterService } from "../../../openrouter.config";
import { OpenRouterError } from "../../../openrouter.service";

export const prerender = false;

type DebugSuccessBody = {
  ok: true;
  model: string;
  text?: string;
  createdAt: string;
  connectivity?: unknown;
  rawChatTest?: unknown;
};

type DebugErrorBody = {
  ok: false;
  type: "OpenRouterError" | "UnknownError";
  message: string;
  code?: string;
  status?: number | null;
  isTransient?: boolean;
  details?: unknown;
  connectivity?: unknown;
  rawChatTest?: unknown;
};

function jsonResponse<T>(body: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    ...init,
  });
}

export const GET: APIRoute = async () => {
  let connectivity: unknown = null;
  let rawChatTest: unknown = null;

  try {
    // Prosty test surowego fetch do OpenRoutera – pomaga zdiagnozować problemy sieciowe na Cloudflare.
    try {
      const resp = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
      });

      let responseBody = null;
      try {
        responseBody = await resp.text();
      } catch {}

      connectivity = {
        ok: resp.ok,
        status: resp.status,
        statusText: resp.statusText,
        headers: Object.fromEntries(resp.headers.entries()),
        bodyPreview: responseBody?.substring(0, 500),
      };
    } catch (e) {
      connectivity = {
        ok: false,
        error:
          e instanceof Error ? e.message : `Non-Error thrown: ${String(e)}`,
      };
    }

    // Test bezpośredniego wywołania chat/completions
    try {
      const apiKey = import.meta.env.OPENROUTER_API_KEY ?? import.meta.env.OPENROUTER ?? "";
      const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? import.meta.env.CF_PAGES_URL ?? "http://localhost:4321";
      
      const chatResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": siteUrl,
          "Referer": siteUrl,
          "X-Title": "Mini Games Debug",
        },
        body: JSON.stringify({
          model: "google/gemini-flash-1.5-8b",
          messages: [{ role: "user", content: "Say 'pong'" }],
          max_tokens: 10,
        }),
      });

      let chatBody = null;
      try {
        chatBody = await chatResp.text();
      } catch {}

      rawChatTest = {
        ok: chatResp.ok,
        status: chatResp.status,
        statusText: chatResp.statusText,
        headers: Object.fromEntries(chatResp.headers.entries()),
        bodyPreview: chatBody?.substring(0, 1000),
      };
    } catch (e) {
      rawChatTest = {
        ok: false,
        error: e instanceof Error ? e.message : `Non-Error thrown: ${String(e)}`,
      };
    }

    const service = getOpenRouterService();

    const messages = service.buildSystemAndUserMessages({
      systemPrompt:
        "You are a simple health-check assistant. Reply concisely with the word 'pong'.",
      userPrompt: "Say 'pong'.",
    });

    const result = await service.generateChatCompletion({
      messages,
      params: {
        temperature: 0,
        maxTokens: 10,
      },
    });

    const body: DebugSuccessBody = {
      ok: true,
      model: result.model,
      text: result.text,
      createdAt: result.createdAt.toISOString(),
      connectivity,
      rawChatTest,
    };

    return jsonResponse(body, { status: 200 });
  } catch (error) {
    if (error instanceof OpenRouterError) {
      const errorBody: DebugErrorBody = {
        ok: false,
        type: "OpenRouterError",
        message: error.message,
        code: error.code,
        status: error.status ?? null,
        isTransient: error.isTransient,
        details: error.details,
        connectivity,
        rawChatTest,
      };

      const status =
        typeof error.status === "number" && error.status >= 400
          ? error.status
          : error.code === "NETWORK_ERROR" || error.code === "TIMEOUT"
          ? 503
          : 500;

      return jsonResponse(errorBody, { status });
    }

    const unknownBody: DebugErrorBody = {
      ok: false,
      type: "UnknownError",
      message:
        error instanceof Error ? error.message : "Unexpected non-error thrown",
      connectivity,
      rawChatTest,
    };

    return jsonResponse(unknownBody, { status: 500 });
  }
};


