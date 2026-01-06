# Dzienniczek praktyk (26 dni) — MINI-GAMES

Poniżej znajduje się przykładowy (hipotetyczny) przebieg prac nad aplikacją **MINI-GAMES** (Astro + React + Supabase + API + testy).

| Dzień | Zakres prac (3 podpunkty) |
|---:|---|
| 1 | - przygotowanie stanowiska pracy<br>- instalacja potrzebnych programów (Node.js, Git, edytor)<br>- szkolenie BHP i omówienie zasad pracy |
| 2 | - pobranie repozytorium i uruchomienie projektu lokalnie<br>- konfiguracja środowiska (zmienne `env`, `.env`)<br>- przegląd struktury katalogów i technologii (Astro/React) |
| 3 | - zapoznanie z wymaganiami i planem aplikacji<br>- rozpisanie widoków i nawigacji (strona główna, gry)<br>- przygotowanie backlogu zadań i priorytetów |
| 4 | - konfiguracja jakości kodu (lint, formatowanie, TS)<br>- ustalenie konwencji commitów i gałęzi Git<br>- porządkowanie podstawowych stylów globalnych |
| 5 | - przygotowanie layoutu aplikacji (nagłówek, sekcje, stopka)<br>- stworzenie komponentów UI (przycisk, input, typografia)<br>- dopracowanie responsywności i dostępności |
| 6 | - implementacja strony głównej z listą gier<br>- przygotowanie kart gry (mini opis, link, stan)<br>- dodanie stanów ładowania i błędów |
| 7 | - integracja listy gier z API (pobieranie danych)<br>- stworzenie hooka do pobierania listy (`useGamesList`)<br>- obsługa pustych wyników i retry |
| 8 | - przygotowanie bazy danych w Supabase (schemat core)<br>- migracje i seed danych startowych (gry)<br>- weryfikacja typów DB i połączenia klienta |
| 9 | - implementacja systemu wyników (score) po stronie API<br>- zapis wyników do bazy dla wybranych gier<br>- walidacja danych wejściowych i błędy API |
| 10 | - przygotowanie leaderboardów (rankingów) po stronie API<br>- endpointy do odczytu rankingów dla gry<br>- paginacja / limity / sortowanie wyników |
| 11 | - dodanie widoków leaderboardów w UI (komponenty tabeli)<br>- integracja z endpointami leaderboardów<br>- dopracowanie UX (stany: loading/empty/error) |
| 12 | - implementacja gry Reaction Time (logika pomiaru czasu)<br>- obsługa start/stop/reset i wynik końcowy<br>- zapis wyniku do backendu po zakończeniu gry |
| 13 | - implementacja gry Aim Trainer (cele, trafienia, czas)<br>- dopracowanie sterowania i feedbacku wizualnego<br>- zapis i podgląd rankingu dla gry |
| 14 | - implementacja gry Tic-Tac-Toe (logika wygranej/remisu)<br>- UI planszy, restart, blokada ruchów<br>- podpięcie leaderboardu (np. czas/wygrane) |
| 15 | - przygotowanie modułu AI Quiz (pytania/odpowiedzi)<br>- integracja z serwisem AI (konfiguracja żądań)<br>- obsługa limitów, błędów i bezpiecznych promptów |
| 16 | - dopracowanie endpointów AI (chat/quiz/debug)<br>- walidacja i sanitizacja danych od klienta<br>- logowanie zdarzeń i podstawowa obserwowalność |
| 17 | - implementacja gry „Explain Your Move” (szkic funkcjonalny)<br>- przygotowanie stanu gry i modelu komunikacji<br>- planowanie trybu pokojów/rywalizacji |
| 18 | - przygotowanie WebSocket (serwer i klient)<br>- dołączanie do pokoju i wymiana wiadomości<br>- obsługa rozłączeń i ponownych połączeń |
| 19 | - wdrożenie zarządzania pokojami (tworzenie/join/limit)<br>- synchronizacja stanu i rankingów „Explain…”<br>- zabezpieczenia: limity, identyfikacja użytkownika |
| 20 | - przygotowanie systemu kont (rejestracja/logowanie)<br>- integracja Supabase Auth i sesji po stronie SSR<br>- UI modala auth + podstawowe walidacje |
| 21 | - reset/forgot password (flow + strony pomocnicze)<br>- dopracowanie komunikatów i błędów auth<br>- testy manualne kluczowych scenariuszy logowania |
| 22 | - dopięcie profilu użytkownika (endpoint `profile/me`)<br>- powiązanie wyników z użytkownikiem<br>- poprawki UX: nazwy, opisy, spójne przyciski |
| 23 | - pisanie testów jednostkowych (Vitest) dla usług<br>- testy logiki gry (engine/state) i walidacji API<br>- refaktor po testach (czytelność, podział na moduły) |
| 24 | - testy E2E (Playwright): homepage, podstawowe flow gier<br>- poprawki po testach (stabilność, selektory, edge cases)<br>- porządkowanie błędów i komunikatów użytkownika |
| 25 | - przygotowanie konfiguracji deploy (np. Netlify) i build<br>- weryfikacja zmiennych środowiskowych na produkcji<br>- testy smoke po wdrożeniu (logowanie, gry, rankingi) |
| 26 | - dokumentacja projektu (README, opis uruchomienia)<br>- podsumowanie praktyk i wnioski (co się udało, co poprawić)<br>- przygotowanie prezentacji/demo aplikacji |


