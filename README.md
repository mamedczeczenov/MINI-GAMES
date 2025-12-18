# Dreary Disk - Mini Games Platform

Platforma mini-gier z integracją AI, wykorzystująca Astro, React, Supabase i OpenRouter.

## 🔧 Konfiguracja

### Zmienne środowiskowe (Development)

Stwórz plik `.env` w katalogu głównym projektu:

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
```

### Zmienne środowiskowe (Netlify)

**WAŻNE:** Netlify wymaga ręcznej konfiguracji zmiennych środowiskowych w panelu:

1. Zaloguj się do [Netlify Dashboard](https://app.netlify.com)
2. Przejdź do swojego projektu → **Site configuration** → **Environment variables**
3. Dodaj następujące zmienne:

| Zmienna | Typ | Opis |
|---------|-----|------|
| `OPENROUTER_API_KEY` | Secret | Klucz API z [OpenRouter](https://openrouter.ai/keys) |
| `SUPABASE_URL` | Public | URL projektu Supabase |
| `SUPABASE_KEY` | Public | Publiczny klucz Supabase (anon key) |

4. **Pamiętaj:** Po dodaniu zmiennych Netlify automatycznie zrobi redeploy

**Typowe problemy na Netlify:**
- ❌ Błąd 500: Brak `OPENROUTER_API_KEY` w Environment Variables
- ❌ "MISSING_API_KEY": Nie ustawiono zmiennej w panelu Netlify
- ❌ Build fail: Sprawdź czy wszystkie dependencies są zainstalowane (`npm install`)

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 🚀 Deployment na Netlify

### Krok 1: Przygotowanie projektu

Upewnij się, że masz wszystkie pliki konfiguracyjne (projekt już je zawiera):
- ✅ `netlify.toml` - konfiguracja buildu
- ✅ `astro.config.mjs` - z adapterem `@astrojs/netlify`
- ✅ `env.template` - przykład zmiennych środowiskowych

### Krok 2: Deploy przez Netlify CLI (opcja 1)

```bash
# Zainstaluj Netlify CLI globalnie
npm install -g netlify-cli

# Zaloguj się do Netlify
netlify login

# Zainicjuj nowy projekt Netlify
netlify init

# Deploy na produkcję
netlify deploy --prod
```

### Krok 3: Deploy przez GitHub/GitLab (opcja 2 - zalecana)

1. Wypchnij kod do repozytorium na GitHub/GitLab
2. Zaloguj się do [Netlify](https://app.netlify.com)
3. Kliknij **"Add new site"** → **"Import an existing project"**
4. Wybierz swoje repozytorium
5. Netlify automatycznie wykryje ustawienia z `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`

### Krok 4: Konfiguracja zmiennych środowiskowych

Po utworzeniu projektu na Netlify:

1. Przejdź do **Site configuration** → **Environment variables**
2. Dodaj wymagane zmienne (patrz sekcja wyżej)
3. Netlify automatycznie wykona redeploy

### Weryfikacja deploymentu

Po deploymencie sprawdź:
- ✅ Strona główna ładuje się poprawnie
- ✅ Gry działają bez błędów
- ✅ Funkcje AI odpowiadają (wymaga `OPENROUTER_API_KEY`)
- ✅ Autoryzacja przez Supabase działa

### Przydatne komendy Netlify CLI

```bash
# Podgląd buildu lokalnie
netlify build

# Deploy na środowisko testowe (draft)
netlify deploy

# Otwórz panel projektu w przeglądarce
netlify open

# Sprawdź logi
netlify logs:function
```

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
