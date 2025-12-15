import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AuthState } from "../../viewModels/homeViewModels";
import AppHeader from "./AppHeader";

vi.mock("../../services/authService", () => {
  return {
    getCurrentProfile: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../auth/AuthModal", () => {
  const MockAuthModal = (props: any) => {
    if (!props.isOpen) return null;
    return (
      <div
        data-testid="auth-modal"
        data-initial-tab={props.initialTab}
        onClick={props.onClose}
      />
    );
  };

  return { default: MockAuthModal };
});

const guestAuthState: AuthState = { status: "guest" };

describe("AppHeader", () => {
  it("wyświetla stan gościa i przyciski logowania/rejestracji", async () => {
    render(
      <AppHeader
        authState={guestAuthState}
        onLoginClick={vi.fn()}
        onRegisterClick={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("MINI GRY - RANKINGI I RYWALIZACJA"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Grasz jako gość")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Zaloguj się" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Zarejestruj się" }),
    ).toBeInTheDocument();
  });

  it("otwiera modal logowania z zakładką login po kliknięciu 'Zaloguj się'", async () => {
    const handleLoginClick = vi.fn();

    render(<AppHeader authState={guestAuthState} onLoginClick={handleLoginClick} />);

    const loginButton = await screen.findByRole("button", { name: "Zaloguj się" });
    fireEvent.click(loginButton);

    expect(handleLoginClick).toHaveBeenCalledTimes(1);

    const modal = await screen.findByTestId("auth-modal");
    expect(modal).toBeInTheDocument();
    expect(modal.getAttribute("data-initial-tab")).toBe("login");
  });

  it("otwiera modal rejestracji z zakładką register po kliknięciu 'Zarejestruj się'", async () => {
    const handleRegisterClick = vi.fn();

    render(
      <AppHeader authState={guestAuthState} onRegisterClick={handleRegisterClick} />,
    );

    const registerButton = await screen.findByRole("button", {
      name: "Zarejestruj się",
    });
    fireEvent.click(registerButton);

    expect(handleRegisterClick).toHaveBeenCalledTimes(1);

    const modal = await screen.findByTestId("auth-modal");
    expect(modal).toBeInTheDocument();
    expect(modal.getAttribute("data-initial-tab")).toBe("register");
  });

  it("wyświetla stan zalogowanego użytkownika i przycisk wylogowania", async () => {
    const authState: AuthState = {
      status: "authenticated",
      nick: "PlayerOne",
      userId: "user-1",
    };

    const handleLogoutClick = vi.fn();

    render(
      <AppHeader authState={authState} onLogoutClick={handleLogoutClick} />,
    );

    expect(await screen.findByText("Zalogowano jako")).toBeInTheDocument();
    expect(await screen.findByText("PlayerOne")).toBeInTheDocument();

    const logoutButton = await screen.findByRole("button", { name: "Wyloguj" });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(handleLogoutClick).toHaveBeenCalledTimes(1);
    });
  });
});


