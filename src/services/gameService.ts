import { supabaseClient } from "../db/supabase.client";
import type { GameDto, GameRow } from "../types";

/**
 * Fetch a single game by its public code.
 * Returns `null` if the game does not exist (or is inactive, depending on filter).
 */
export async function getGameByCode(code: string): Promise<GameRow | null> {
  const { data, error } = await supabaseClient
    .from("games")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch game by code: ${error.message}`);
  }

  return data ?? null;
}

/**
 * Fetch all active games for listing purposes.
 * Returns a list of `GameDto` ordered by creation time (newest first).
 */
export async function listActiveGames(): Promise<GameDto[]> {
  const { data, error } = await supabaseClient
    .from("games")
    .select("id, code, name, description, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch games list: ${error.message}`);
  }

  return (data ?? []) as GameDto[];
}

