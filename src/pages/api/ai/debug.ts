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

  try {
    // Prosty test surowego fetch do OpenRoutera – pomaga zdiagnozować problemy sieciowe na Cloudflare.
    try {
      const resp = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
      });

      connectivity = {
        ok: resp.ok,
        status: resp.status,
        statusText: resp.statusText,
      };
    } catch (e) {
      connectivity = {
        ok: false,
        error:
          e instanceof Error ? e.message : `Non-Error thrown: ${String(e)}`,
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
    };

    return jsonResponse(unknownBody, { status: 500 });
  }
};


