import { render, screen } from "@testing-library/react";
import HomePage from "./HomePage";

describe("HomePage", () => {
  it("renders default intro title and description", () => {
    render(<HomePage />);

    expect(
      screen.getByText("Rywalizuj w mini‑grach i wspinaj się w rankingach"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Wybierz jedną z dostępnych gier, zagraj w trybie gościa lub jako zalogowany gracz i sprawdź swoje wyniki w tygodniowych rankingach.",
      ),
    ).toBeInTheDocument();
  });
});


