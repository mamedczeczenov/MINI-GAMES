import { s as supabaseClient } from './supabase.client_DSbpnknZ.mjs';

async function getGameByCode(code) {
  const { data, error } = await supabaseClient.from("games").select("*").eq("code", code).eq("is_active", true).maybeSingle();
  if (error) {
    throw new Error(`Failed to fetch game by code: ${error.message}`);
  }
  return data ?? null;
}
async function listActiveGames() {
  const { data, error } = await supabaseClient.from("games").select("id, code, name, description, is_active, created_at").eq("is_active", true).order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to fetch games list: ${error.message}`);
  }
  return data ?? [];
}

export { getGameByCode as g, listActiveGames as l };
