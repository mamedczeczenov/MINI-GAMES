-- Add Explain Your Move to games table

INSERT INTO games (code, name, description, is_active)
VALUES (
  'explain_your_move',
  'Explain Your Move',
  'Gra multiplayer z AI-judging. Wybierz strategię, wyjaśnij swoją decyzję i przekonaj AI, że Twoje rozumowanie jest najlepsze! Best of 3, gra w parach z kodem pokoju.',
  true
)
ON CONFLICT (code) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

