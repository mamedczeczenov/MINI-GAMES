import type { APIRoute } from "astro";
import type { GameDto, ListResponseDto } from "../../../types";
import { listActiveGames } from "../../../services/gameService";

export const prerender = false;

type ErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

function jsonResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export const GET: APIRoute = async () => {
  try {
    const games: GameDto[] = await listActiveGames();

    const body: ListResponseDto<GameDto> = {
      items: games,
    };

    return jsonResponse(body, 200);
  } catch (error) {
    console.error("Unhandled error in games list endpoint:", error);

    const body: ErrorBody = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error while fetching games list.",
      },
    };

    return jsonResponse(body, 500);
  }
};


