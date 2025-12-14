import { describe, it, expect } from "vitest";
import type { GameDto, ListResponseDto } from "../types";
import {
  mapGameDtoToHomeVM,
  mapGamesListResponseToVM,
} from "./homeViewModels";

const createGameDto = (overrides: Partial<GameDto> = {}): GameDto => ({
  id: "1",
  code: "reaction_test",
  name: "Reaction Test",
  description: "Test your reactions",
  is_active: true,
  created_at: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

describe("homeViewModels", () => {
  it("mapGameDtoToHomeVM mapuje pola i ustawia domyślne wartości", () => {
    const dto = createGameDto({ name: "", description: null as any });

    const vm = mapGameDtoToHomeVM(dto);

    expect(vm).toMatchInlineSnapshot(`
      {
        "code": "reaction_test",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "description": "",
        "iconKey": "reaction_test",
        "isActive": true,
        "name": "Bez nazwy",
      }
    `);
  });

  it("mapGamesListResponseToVM filtruje nieaktywne lub niepoprawne gry", () => {
    const response: ListResponseDto<GameDto> = {
      items: [
        createGameDto({ id: "1", is_active: true, code: "reaction_test" }),
        createGameDto({ id: "2", is_active: false, code: "inactive" }),
        // brak code -> odrzucone
        createGameDto({ id: "3", is_active: true, code: "" }),
      ],
    };

    const result = mapGamesListResponseToVM(response);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchInlineSnapshot(`
      {
        "code": "reaction_test",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "description": "Test your reactions",
        "iconKey": "reaction_test",
        "isActive": true,
        "name": "Reaction Test",
      }
    `);
  });

  it("rzuca błąd gdy items nie jest tablicą", () => {
    const badResponse = { items: null } as unknown as ListResponseDto<GameDto>;

    expect(() => mapGamesListResponseToVM(badResponse)).toThrowError(
      "Invalid games response: items is not an array",
    );
  });
});


