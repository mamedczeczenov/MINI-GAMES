import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./HomePage";

describe("HomePage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders default intro title and description", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      }),
    );

    render(<HomePage />);

    expect(
      await screen.findByText("Rywalizuj w mini‑grach i wspinaj się w rankingach"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Wybierz jedną z dostępnych gier, zagraj w trybie gościa lub jako zalogowany gracz i sprawdź swoje wyniki w tygodniowych rankingach.",
      ),
    ).toBeInTheDocument();
  });
});


