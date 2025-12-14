import type { GameDto, ListResponseDto, ProfileDto } from "../types";

/**
 * ViewModel dopasowany do prezentacji kafelka gry na stronie głównej.
 */
export interface HomeGameCardViewModel {
  code: GameDto["code"];
  name: GameDto["name"];
  description: GameDto["description"];
  isActive: GameDto["is_active"];
  createdAt: GameDto["created_at"];
  /**
   * Identyfikator ikony, np. "reaction_test" albo "aim_trainer_30s".
   * Może być wyprowadzony na podstawie code.
   */
  iconKey?: string;
}

/**
 * Stan lokalny widoku listy gier.
 */
export interface HomeViewState {
  games: HomeGameCardViewModel[] | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}

/**
 * Minimalny stan auth wykorzystywany przez nagłówek aplikacji.
 */
export interface AuthState {
  status: "guest" | "authenticated" | "loading";
  nick?: ProfileDto["nick"];
  userId?: ProfileDto["user_id"];
}

/**
 * Funkcja mapująca pojedynczy GameDto na HomeGameCardViewModel.
 */
export function mapGameDtoToHomeVM(game: GameDto): HomeGameCardViewModel {
  const iconKey = deriveIconKeyFromCode(game.code);

  return {
    code: game.code,
    name: game.name || "Bez nazwy",
    description: game.description ?? "",
    isActive: game.is_active,
    createdAt: game.created_at,
    iconKey,
  };
}

/**
 * Mapuje odpowiedź listy gier na tablicę ViewModeli,
 * z filtracją nieaktywnych gier i podstawową walidacją struktury.
 */
export function mapGamesListResponseToVM(
  response: ListResponseDto<GameDto>
): HomeGameCardViewModel[] {
  if (!Array.isArray(response.items)) {
    throw new Error("Invalid games response: items is not an array");
  }

  return response.items
    .filter(
      (game) =>
        game &&
        game.is_active === true &&
        typeof game.code === "string" &&
        game.code.length > 0
    )
    .map(mapGameDtoToHomeVM);
}

/**
 * Prosta mapa kodu gry na klucz ikony.
 * W razie braku dopasowania zwracamy sam code, aby umożliwić domyślną ikonę.
 */
function deriveIconKeyFromCode(code: GameDto["code"]): string | undefined {
  const iconByCode: Record<string, string> = {
    reaction_test: "reaction_test",
    aim_trainer: "aim_trainer_30s",
  };

  if (!code) {
    return undefined;
  }

  return iconByCode[code] ?? code;
}


