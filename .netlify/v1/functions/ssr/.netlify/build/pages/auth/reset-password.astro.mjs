import { d as createComponent, j as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_BTtRWRX2.mjs';
import 'piccolore';
import { T as Text, I as Input, B as Button, r as resetPassword, R as ResetPasswordError, $ as $$AppShell } from '../../chunks/AppShell_DlUaiTou.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState } from 'react';
export { renderers } from '../../renderers.mjs';

const ResetPasswordForm = ({
  onSubmit,
  title = "Ustaw nowe hasło"
}) => {
  const [values, setValues] = useState({
    newPassword: "",
    newPasswordConfirm: ""
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [infoMessage, setInfoMessage] = useState(null);
  const validate = (nextValues) => {
    const nextErrors = {};
    if (!nextValues.newPassword) {
      nextErrors.newPassword = "Podaj nowe hasło.";
    } else if (nextValues.newPassword.length < 8) {
      nextErrors.newPassword = "Hasło powinno mieć co najmniej 8 znaków.";
    }
    if (!nextValues.newPasswordConfirm) {
      nextErrors.newPasswordConfirm = "Powtórz nowe hasło.";
    } else if (nextValues.newPassword !== nextValues.newPasswordConfirm) {
      nextErrors.newPasswordConfirm = "Hasła muszą być takie same.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const handleChange = (field) => (event) => {
    const nextValues = { ...values, [field]: event.target.value };
    setValues(nextValues);
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setInfoMessage(null);
    const isValid = validate(values);
    if (!isValid) {
      return;
    }
    if (onSubmit) {
      try {
        setStatus("submitting");
        await onSubmit(values);
        setStatus("success");
        setInfoMessage("Hasło zostało zmienione. Możesz teraz się zalogować.");
      } catch {
        setStatus("error");
        setInfoMessage("Nie udało się zmienić hasła. Spróbuj ponownie.");
      }
      return;
    }
    try {
      setStatus("submitting");
      await resetPassword({ newPassword: values.newPassword });
      setStatus("success");
      setInfoMessage("Hasło zostało zmienione. Możesz teraz się zalogować.");
    } catch (error) {
      setStatus("error");
      if (error instanceof ResetPasswordError) {
        if (error.code === "NETWORK_ERROR") {
          setInfoMessage(
            "Nie udało się połączyć z serwerem. Sprawdź swoje połączenie i spróbuj ponownie."
          );
          return;
        }
        if (error.code === "UNAUTHORIZED") {
          setInfoMessage(
            "Link do resetu hasła jest nieaktywny lub wygasł. Poproś o nową instrukcję."
          );
          return;
        }
        if (error.code === "VALIDATION_ERROR") {
          setInfoMessage(
            "Nowe hasło nie spełnia wymagań bezpieczeństwa. Spróbuj z innym hasłem."
          );
          return;
        }
        setInfoMessage("Nie udało się zmienić hasła. Spróbuj ponownie.");
        return;
      }
      setInfoMessage("Coś poszło nie tak. Spróbuj ponownie.");
    }
  };
  const isSubmitting = status === "submitting";
  return /* @__PURE__ */ jsxs(
    "form",
    {
      onSubmit: handleSubmit,
      className: "space-y-5",
      noValidate: true,
      children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx(Text, { variant: "title", className: "text-slate-50", children: title }),
          /* @__PURE__ */ jsx(Text, { variant: "body-small", children: "Wybierz nowe, silne hasło, którego nie używasz w innych serwisach." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              name: "newPassword",
              type: "password",
              label: "Nowe hasło",
              placeholder: "Min. 8 znaków",
              autoComplete: "new-password",
              value: values.newPassword,
              onChange: handleChange("newPassword"),
              error: errors.newPassword
            }
          ),
          /* @__PURE__ */ jsx(
            Input,
            {
              name: "newPasswordConfirm",
              type: "password",
              label: "Powtórz nowe hasło",
              placeholder: "Powtórz hasło",
              autoComplete: "new-password",
              value: values.newPasswordConfirm,
              onChange: handleChange("newPasswordConfirm"),
              error: errors.newPasswordConfirm
            }
          )
        ] }),
        infoMessage && /* @__PURE__ */ jsx(
          Text,
          {
            variant: "body-small",
            className: "rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-200",
            children: infoMessage
          }
        ),
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "submit",
            variant: "primary",
            size: "md",
            loading: isSubmitting,
            fullWidth: true,
            children: "Zmień hasło"
          }
        )
      ]
    }
  );
};

const prerender = false;
const $$ResetPassword = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppShell", $$AppShell, {}, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="mx-auto flex max-w-md flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/60"> <header class="space-y-1"> <h1 class="text-2xl font-semibold tracking-tight text-slate-50">
Ustaw nowe hasło
</h1> <p class="text-sm text-slate-300">
Formularz zmiany hasła po kliknięciu w link z wiadomości e‑mail.
        Jeśli link jest nieaktywny lub wygasł, przejdź do ekranu „Nie pamiętasz hasła?” i poproś o nową instrukcję.
</p> </header> ${renderComponent($$result2, "ResetPasswordForm", ResetPasswordForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/macbook/Desktop/folder/dreary-disk/src/components/auth/ResetPasswordForm.tsx", "client:component-export": "default" })} </section> ` })}`;
}, "/Users/macbook/Desktop/folder/dreary-disk/src/pages/auth/reset-password.astro", void 0);

const $$file = "/Users/macbook/Desktop/folder/dreary-disk/src/pages/auth/reset-password.astro";
const $$url = "/auth/reset-password";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$ResetPassword,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
