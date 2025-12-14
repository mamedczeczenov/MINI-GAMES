import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { AuthState } from "../../viewModels/homeViewModels";
import AppHeader from "./AppHeader";

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
  it("wyświetla stan gościa i przyciski logowania/rejestracji", () => {
    render(
      <AppHeader
        authState={guestAuthState}
        onLoginClick={vi.fn()}
        onRegisterClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Dreary Disk")).toBeInTheDocument();
    expect(screen.getByText("Grasz jako gość")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zaloguj się" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Zarejestruj się" }),
    ).toBeInTheDocument();
  });

  it("otwiera modal logowania z zakładką login po kliknięciu 'Zaloguj się'", () => {
    const handleLoginClick = vi.fn();

    render(<AppHeader authState={guestAuthState} onLoginClick={handleLoginClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Zaloguj się" }));

    expect(handleLoginClick).toHaveBeenCalledTimes(1);

    const modal = screen.getByTestId("auth-modal");
    expect(modal).toBeInTheDocument();
    expect(modal.getAttribute("data-initial-tab")).toBe("login");
  });

  it("otwiera modal rejestracji z zakładką register po kliknięciu 'Zarejestruj się'", () => {
    const handleRegisterClick = vi.fn();

    render(
      <AppHeader authState={guestAuthState} onRegisterClick={handleRegisterClick} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Zarejestruj się" }));

    expect(handleRegisterClick).toHaveBeenCalledTimes(1);

    const modal = screen.getByTestId("auth-modal");
    expect(modal).toBeInTheDocument();
    expect(modal.getAttribute("data-initial-tab")).toBe("register");
  });

  it("wyświetla stan zalogowanego użytkownika i przycisk wylogowania", () => {
    const authState: AuthState = {
      status: "authenticated",
      nick: "PlayerOne",
      userId: "user-1",
    };

    const handleLogoutClick = vi.fn();

    render(
      <AppHeader authState={authState} onLogoutClick={handleLogoutClick} />,
    );

    expect(screen.getByText("Zalogowano jako")).toBeInTheDocument();
    expect(screen.getByText("PlayerOne")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Wyloguj" }));
    expect(handleLogoutClick).toHaveBeenCalledTimes(1);
  });
});


