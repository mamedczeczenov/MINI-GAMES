import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { HomeGameCardViewModel } from "../viewModels/homeViewModels";
import type { GameDto } from "../types";
import { useGamesList } from "./useGamesList";

const createInitialGame = (
  overrides: Partial<HomeGameCardViewModel> = {},
) =>
  ({
    code: "reaction_test",
    name: "Test game",
    description: "Desc",
    isActive: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    iconKey: "reaction_test",
    ...overrides,
  }) satisfies HomeGameCardViewModel;

const createGameDto = (overrides: Partial<GameDto> = {}): GameDto => ({
  id: "1",
  code: "reaction_test",
  name: "Test game",
  description: "Desc",
  is_active: true,
  created_at: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

function HookTestComponent({
  initialGames,
}: {
  initialGames?: HomeGameCardViewModel[];
}) {
  const state = useGamesList(initialGames);

  return (
    <div>
      <pre data-testid="state">{JSON.stringify(state)}</pre>
      <button type="button" onClick={state.refetch}>
        refetch
      </button>
    </div>
  );
}

describe("useGamesList", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("korzysta z initialGames i nie wywołuje fetch przy starcie", () => {
    const initialGames = [createInitialGame()];
    const fetchSpy = vi.fn();

    vi.stubGlobal("fetch", fetchSpy);

    render(<HookTestComponent initialGames={initialGames} />);

    const parsed = JSON.parse(
      screen.getByTestId("state").textContent ?? "{}",
    ) as ReturnType<typeof useGamesList>;

    expect(parsed.games).toHaveLength(1);
    expect(parsed.isLoading).toBe(false);
    expect(parsed.isError).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ładuje listę gier z API i ustawia poprawny stan", async () => {
    const apiGames = [createGameDto({ code: "reaction_test" })];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: apiGames }),
      }),
    );

    render(<HookTestComponent />);

    await waitFor(() => {
      const parsed = JSON.parse(
        screen.getByTestId("state").textContent ?? "{}",
      ) as ReturnType<typeof useGamesList>;

      expect(parsed.isLoading).toBe(false);
      expect(parsed.isError).toBe(false);
      expect(parsed.games).toHaveLength(1);
    });
  });

  it("ustawia stan błędu i domyślny komunikat, gdy API zwróci błąd", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    render(<HookTestComponent />);

    await waitFor(() => {
      const parsed = JSON.parse(
        screen.getByTestId("state").textContent ?? "{}",
      ) as ReturnType<typeof useGamesList>;

      expect(parsed.isLoading).toBe(false);
      expect(parsed.isError).toBe(true);
      expect(parsed.errorMessage).toBe(
        "Nie udało się załadować listy gier. Spróbuj ponownie.",
      );
    });
  });

  it("po wywołaniu refetch ponownie pyta o dane", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          ({ items: [createGameDto({ code: "reaction_test" })] }) as {
            items: GameDto[];
          },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          ({ items: [createGameDto({ code: "aim_trainer_30s" })] }) as {
            items: GameDto[];
          },
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<HookTestComponent />);

    await waitFor(() => {
      const parsed = JSON.parse(
        screen.getByTestId("state").textContent ?? "{}",
      ) as ReturnType<typeof useGamesList>;

      expect(parsed.games).toHaveLength(1);
      expect(parsed.games?.[0].code).toBe("reaction_test");
    });

    fireEvent.click(screen.getByText("refetch"));

    await waitFor(() => {
      const parsed = JSON.parse(
        screen.getByTestId("state").textContent ?? "{}",
      ) as ReturnType<typeof useGamesList>;

      expect(parsed.games?.[0].code).toBe("aim_trainer_30s");
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});


