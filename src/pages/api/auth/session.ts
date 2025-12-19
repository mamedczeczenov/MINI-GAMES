import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

export const prerender = false;

interface SessionResponse {
  userId: string;
  nickname: string;
  accessToken: string;
}

function jsonResponse<T>(body: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    ...init,
  });
}

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerInstance({
      headers: request.headers,
      cookies,
    });

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      return jsonResponse(
        { error: "UNAUTHORIZED" },
        {
          status: 401,
        },
      );
    }

    const user = session.user;
    const nickname =
      (user.user_metadata as any)?.nickname ||
      (user.user_metadata as any)?.nick ||
      user.email ||
      "Player";

    const body: SessionResponse = {
      userId: user.id,
      nickname,
      accessToken: session.access_token,
    };

    return jsonResponse(body, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/auth/session:", err);
    return jsonResponse(
      { error: "INTERNAL_ERROR" },
      {
        status: 500,
      },
    );
  }
};


