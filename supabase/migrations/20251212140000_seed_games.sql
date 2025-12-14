-- migration: seed initial games into public.games
-- depends on: 20251206120000_create_core_game_schema.sql
-- purpose:
--   - register core mini-games in the games catalog
--   - make inserts idempotent via ON CONFLICT (code)
-- notes:
--   - ids are generated via default gen_random_uuid()
--   - code is unique and used as stable identifier in the app

insert into public.games (code, name, description, is_active)
values
  (
    'reaction_test',
    'Test czasu reakcji',
    'Zmierz swój czas reakcji: poczekaj na zielony ekran i kliknij jak najszybciej. Wynik podajemy w milisekundach, a tygodniowy ranking pokazuje TOP 10 najszybszych graczy.',
    true
  ),
  (
    'aim_trainer',
    'Aim Trainer – 30 sekund',
    'Trafiaj w małe czerwone tarcze przez 30 sekund. Na ekranie zawsze jest dokładnie jeden cel, który nie znika bez kliknięcia. Liczy się liczba trafień w czasie rundy.',
    true
  ),
  (
    'tic_tac_toe',
    'Kółko i krzyżyk vs bot',
    'Zagraj w klasyczne kółko i krzyżyk przeciwko botowi na planszy 3x3. Każda wygrana runda daje Ci punkt w tygodniowym rankingu zwycięstw z botem.',
    true
  ),
  (
    'ai_quiz',
    'AI Quiz – 5 pytań',
    'Weź udział w krótkim quizie z losowo generowanymi przez AI pytaniami z różnych dziedzin. Każdy quiz to 5 pytań A–D z jedną poprawną odpowiedzią, a ranking liczy łączną liczbę poprawnych odpowiedzi z ostatnich 7 dni.',
    true
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active;


