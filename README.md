# Dreary Disk - Mini Games Platform

Platforma mini-gier z integracją AI, wykorzystująca Astro, React, Supabase i OpenRouter.

## 🔧 Konfiguracja

### Zmienne środowiskowe (Development)

Stwórz plik `.env` w katalogu głównym projektu:

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Supabase Configuration
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Zmienne środowiskowe (Cloudflare Pages)

**WAŻNE:** Cloudflare Pages wymaga ręcznej konfiguracji zmiennych środowiskowych w panelu:

1. Zaloguj się do [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Przejdź do **Pages** → wybierz swój projekt
3. Otwórz **Settings** → **Environment Variables**
4. Dodaj następujące zmienne:

| Zmienna | Typ | Opis |
|---------|-----|------|
| `OPENROUTER_API_KEY` | Secret | Klucz API z [OpenRouter](https://openrouter.ai/keys) |
| `PUBLIC_SUPABASE_URL` | Public | URL projektu Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Public | Publiczny klucz Supabase |

5. **Pamiętaj:** Po dodaniu zmiennych musisz ponownie zbudować projekt (redeploy)

**Typowe problemy na Cloudflare:**
- ❌ Błąd 503: Brak `OPENROUTER_API_KEY` w Environment Variables
- ❌ "MISSING_API_KEY": Nie ustawiono zmiennej lub nie zrobiono redeploy po dodaniu

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

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
