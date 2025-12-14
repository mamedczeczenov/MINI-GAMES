import type { FC } from "react";
import { useEffect, useState } from "react";
import type { LoginResult } from "../../services/authService";
import { Text } from "../ui/Typography";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import ForgotPasswordForm from "./ForgotPasswordForm";

type AuthTab = "login" | "register" | "forgot";

export interface AuthModalProps {
  isOpen: boolean;
  initialTab?: AuthTab;
  onClose?: () => void;
  onLoginSuccess?: (result: LoginResult) => void;
}

const AuthModal: FC<AuthModalProps> = ({
  isOpen,
  initialTab = "login",
  onClose,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSwitchToLogin = () => setActiveTab("login");
  const handleSwitchToRegister = () => setActiveTab("register");
  const handleSwitchToForgot = () => setActiveTab("forgot");

  const renderContent = () => {
    if (activeTab === "login") {
      return (
        <LoginForm
          showForgotPasswordLink
          onForgotPasswordClick={handleSwitchToForgot}
          onSuccess={onLoginSuccess}
        />
      );
    }

    if (activeTab === "register") {
      return (
        <RegisterForm
          onSuccess={() => {
            // Po pomyślnej rejestracji (i automatycznym zalogowaniu)
            // zamykamy modal; nagłówek może w kolejnych krokach odświeżyć stan sesji.
            onClose?.();
          }}
        />
      );
    }

    return <ForgotPasswordForm />;
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-5 shadow-2xl shadow-slate-950/80">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Text variant="subtitle" className="text-slate-100">
              Konto gracza
            </Text>
            <Text variant="body-small">
              Zaloguj się lub załóż konto, aby zapisywać swoje wyniki w rankingach.
            </Text>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij okno logowania"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-slate-500 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-2 rounded-full bg-slate-900/60 p-1 text-sm">
          <button
            type="button"
            onClick={handleSwitchToLogin}
            className={[
              "flex-1 rounded-full px-3 py-1.5 font-medium transition",
              activeTab === "login"
                ? "bg-sky-500 text-slate-950 shadow-sm"
                : "text-slate-300 hover:bg-slate-800",
            ].join(" ")}
          >
            Zaloguj się
          </button>
          <button
            type="button"
            onClick={handleSwitchToRegister}
            className={[
              "flex-1 rounded-full px-3 py-1.5 font-medium transition",
              activeTab === "register"
                ? "bg-sky-500 text-slate-950 shadow-sm"
                : "text-slate-300 hover:bg-slate-800",
            ].join(" ")}
          >
            Zarejestruj się
          </button>
          <button
            type="button"
            onClick={handleSwitchToForgot}
            className={[
              "hidden flex-1 rounded-full px-3 py-1.5 font-medium transition sm:block",
              activeTab === "forgot"
                ? "bg-sky-500 text-slate-950 shadow-sm"
                : "text-slate-300 hover:bg-slate-800",
            ].join(" ")}
          >
            Odzyskaj konto
          </button>
        </div>

        <div className="mt-4">{renderContent()}</div>

        <div className="mt-5 border-t border-slate-800 pt-3">
          <Text variant="body-small" className="text-slate-400">
            Możesz nadal grać jako gość. Logowanie jest wymagane tylko do zapisu
            wyniku w rankingu.
          </Text>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;


