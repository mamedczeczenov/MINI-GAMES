import type { FC } from "react";
import { useEffect, useState } from "react";
import type { AuthState } from "../../viewModels/homeViewModels";
import type { LoginResult } from "../../services/authService";
import { getCurrentProfile, logout as logoutRequest } from "../../services/authService";
import AuthModal from "../auth/AuthModal";

export interface AppHeaderProps {
  authState: AuthState;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
  onLogoutClick?: () => void;
}

const AppHeader: FC<AppHeaderProps> = ({
  authState,
  onLoginClick,
  onRegisterClick,
  onLogoutClick,
}) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<"login" | "register">("login");
  const [currentAuthState, setCurrentAuthState] = useState<AuthState>(authState);

  useEffect(() => {
    setCurrentAuthState(authState);
  }, [authState]);

  /**
   * Przy pierwszym załadowaniu aplikacji sprawdzamy, czy istnieje aktywna sesja
   * (cookie) i jeśli tak – pobieramy profil z `/api/profile/me`.
   *
   * Dzięki temu po odświeżeniu strony albo przejściu na inną podstronę
   * nagłówek pokazuje faktycznie zalogowanego użytkownika, zamiast traktować
   * go jak gościa.
   */
  useEffect(() => {
    let isMounted = true;

    const initializeAuthFromSession = async () => {
      // Jeśli w przyszłości przekażemy z serwera stan "authenticated",
      // nie nadpisujmy go dodatkowym zapytaniem.
      if (authState.status === "authenticated") {
        return;
      }

      // Upewniamy się, że UI pokazuje stan "ładowania" na czas sprawdzania.
      setCurrentAuthState((prev) =>
        prev.status === "loading" ? prev : { status: "loading" },
      );

      const profile = await getCurrentProfile();

      if (!isMounted) {
        return;
      }

      if (profile) {
        setCurrentAuthState({
          status: "authenticated",
          nick: profile.nick ?? undefined,
          userId: profile.user_id,
        });
      } else {
        setCurrentAuthState({ status: "guest" });
      }
    };

    void initializeAuthFromSession();

    return () => {
      isMounted = false;
    };
  }, [authState.status]);

  useEffect(() => {
    const handleOpenAuthModal = () => {
      setInitialTab("login");
      setIsAuthModalOpen(true);
    };

    window.addEventListener("dreary:open-auth-modal", handleOpenAuthModal);

    return () => {
      window.removeEventListener("dreary:open-auth-modal", handleOpenAuthModal);
    };
  }, []);

  const openLoginModal = () => {
    setInitialTab("login");
    setIsAuthModalOpen(true);
  };

  const openRegisterModal = () => {
    setInitialTab("register");
    setIsAuthModalOpen(true);
  };

  const handleLoginClick = () => {
    onLoginClick?.();
    openLoginModal();
  };

  const handleRegisterClick = () => {
    onRegisterClick?.();
    openRegisterModal();
  };

  const handleCloseModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleLoginSuccess = (result: LoginResult) => {
    setCurrentAuthState({
      status: "authenticated",
      nick: result.nick ?? undefined,
      userId: result.userId,
    });
    setIsAuthModalOpen(false);
  };

  const handleLogoutClick = async () => {
    // Optymistycznie pokażemy stan „ładowania” podczas wylogowywania.
    setCurrentAuthState({ status: "loading" });

    await logoutRequest();

    setCurrentAuthState({ status: "guest" });
    onLogoutClick?.();
  };

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a
            href="/"
            className="text-lg font-semibold tracking-tight text-slate-50 no-underline decoration-transparent"
          >
            MINI GRY - RANKINGI I RYWALIZACJA
          </a>

          <div className="flex items-center gap-3 text-sm">
            {currentAuthState.status === "loading" && (
              <span className="text-slate-300">
                Sprawdzanie stanu logowania…
              </span>
            )}

            {currentAuthState.status === "guest" && (
              <>
                <span className="hidden text-slate-300 sm:inline">
                  Grasz jako gość
                </span>
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Zaloguj się
                </button>
                <button
                  type="button"
                  onClick={handleRegisterClick}
                  className="hidden rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:inline-flex"
                >
                  Zarejestruj się
                </button>
              </>
            )}

            {currentAuthState.status === "authenticated" && (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-sm font-semibold text-slate-950">
                    {(currentAuthState.nick ?? "gracz").charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden text-slate-200 sm:inline">
                    Zalogowano jako{" "}
                    <span className="font-semibold">
                      {currentAuthState.nick ?? "gracz"}
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-100 transition hover:border-red-500 hover:bg-red-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Wyloguj
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen && currentAuthState.status !== "authenticated"}
        initialTab={initialTab}
        onClose={handleCloseModal}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
};

export default AppHeader;


