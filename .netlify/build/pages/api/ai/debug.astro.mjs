import { g as getOpenRouterService, O as OpenRouterError } from '../../../chunks/openrouter.config_B58yPM7B.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
function jsonResponse(body, init) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    ...init
  });
}
const GET = async () => {
  let connectivity = null;
  let rawChatTest = null;
  try {
    try {
      const resp = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET"
      });
      let responseBody = null;
      try {
        responseBody = await resp.text();
      } catch {
      }
      connectivity = {
        ok: resp.ok,
        status: resp.status,
        statusText: resp.statusText,
        headers: Object.fromEntries(resp.headers.entries()),
        bodyPreview: responseBody?.substring(0, 500)
      };
    } catch (e) {
      connectivity = {
        ok: false,
        error: e instanceof Error ? e.message : `Non-Error thrown: ${String(e)}`
      };
    }
    try {
      const apiKey = "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";
      const siteUrl = undefined                                ?? undefined                             ?? "http://localhost:4321";
      const chatResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": siteUrl,
          "Referer": siteUrl,
          "X-Title": "Mini Games Debug"
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: "Say 'pong'" }],
          max_tokens: 10
        })
      });
      let chatBody = null;
      try {
        chatBody = await chatResp.text();
      } catch {
      }
      rawChatTest = {
        ok: chatResp.ok,
        status: chatResp.status,
        statusText: chatResp.statusText,
        headers: Object.fromEntries(chatResp.headers.entries()),
        bodyPreview: chatBody?.substring(0, 1e3)
      };
    } catch (e) {
      rawChatTest = {
        ok: false,
        error: e instanceof Error ? e.message : `Non-Error thrown: ${String(e)}`
      };
    }
    const service = getOpenRouterService();
    const messages = service.buildSystemAndUserMessages({
      systemPrompt: "You are a simple health-check assistant. Reply concisely with the word 'pong'.",
      userPrompt: "Say 'pong'."
    });
    const result = await service.generateChatCompletion({
      messages,
      params: {
        temperature: 0,
        maxTokens: 10
      }
    });
    const body = {
      ok: true,
      model: result.model,
      text: result.text,
      createdAt: result.createdAt.toISOString(),
      connectivity,
      rawChatTest
    };
    return jsonResponse(body, { status: 200 });
  } catch (error) {
    if (error instanceof OpenRouterError) {
      const errorBody = {
        ok: false,
        type: "OpenRouterError",
        message: error.message,
        code: error.code,
        status: error.status ?? null,
        isTransient: error.isTransient,
        details: error.details,
        connectivity,
        rawChatTest
      };
      const status = typeof error.status === "number" && error.status >= 400 ? error.status : error.code === "NETWORK_ERROR" || error.code === "TIMEOUT" ? 503 : 500;
      return jsonResponse(errorBody, { status });
    }
    const unknownBody = {
      ok: false,
      type: "UnknownError",
      message: error instanceof Error ? error.message : "Unexpected non-error thrown",
      connectivity,
      rawChatTest
    };
    return jsonResponse(unknownBody, { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
