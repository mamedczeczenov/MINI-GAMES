import { test, expect } from "@playwright/test";

test.describe("Strona główna", () => {
  test("wyświetla listę gier", async ({ page }) => {
    await page.goto("/");

    // Sprawdź, że widzimy główny nagłówek strony
    await expect(
      page.getByText("Rywalizuj w mini‑grach i wspinaj się w rankingach"),
    ).toBeVisible();

    // Sprawdź, że widzimy sekcję z listą gier
    await expect(
      page.getByRole("heading", { name: "Wybierz grę" }),
    ).toBeVisible();

    // Sprawdź, że w sekcji jest co najmniej jeden element listy gier
    const gamesList = page.getByRole("list").first();
    await expect(gamesList).toBeVisible();
    await expect(gamesList.getByRole("listitem").first()).toBeVisible();
  });
});


