-- Migration: Create Explain Your Move game schema
-- Created: 2025-12-20
-- Description: Tables for room-based multiplayer game with AI judging

-- Tabela pokoi (ephemeral, TTL 1h)
CREATE TABLE IF NOT EXISTS explain_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('waiting', 'playing', 'finished')),
  current_round INTEGER DEFAULT 1 CHECK (current_round BETWEEN 1 AND 3),
  scores JSONB DEFAULT '{"host": 0, "guest": 0}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_explain_rooms_code ON explain_rooms(room_code);
CREATE INDEX idx_explain_rooms_expires ON explain_rooms(expires_at);
CREATE INDEX idx_explain_rooms_host ON explain_rooms(host_id);
CREATE INDEX idx_explain_rooms_guest ON explain_rooms(guest_id);
CREATE INDEX idx_explain_rooms_state ON explain_rooms(state);

-- Tabela rund (historia gry)
CREATE TABLE IF NOT EXISTS explain_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES explain_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 3),
  scenario JSONB NOT NULL,
  
  -- Dane gracza 1 (host)
  player1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player1_choice TEXT CHECK (player1_choice IN ('A', 'B')),
  player1_reason TEXT,
  player1_scores JSONB,
  player1_feedback TEXT,
  
  -- Dane gracza 2 (guest)
  player2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player2_choice TEXT CHECK (player2_choice IN ('A', 'B')),
  player2_reason TEXT,
  player2_scores JSONB,
  player2_feedback TEXT,
  
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(room_id, round_number)
);

CREATE INDEX idx_explain_rounds_room ON explain_rounds(room_id);
CREATE INDEX idx_explain_rounds_winner ON explain_rounds(winner_id);
CREATE INDEX idx_explain_rounds_created ON explain_rounds(created_at DESC);

-- Tabela wyników końcowych (dla rankingu)
CREATE TABLE IF NOT EXISTS explain_game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_points INTEGER NOT NULL CHECK (total_points >= 0),
  rounds_won INTEGER NOT NULL CHECK (rounds_won >= 0),
  rounds_total INTEGER NOT NULL DEFAULT 3,
  game_won BOOLEAN NOT NULL,
  opponent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  room_id UUID REFERENCES explain_rooms(id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_explain_results_user ON explain_game_results(user_id);
CREATE INDEX idx_explain_results_points ON explain_game_results(total_points DESC);
CREATE INDEX idx_explain_results_ranking ON explain_game_results(total_points DESC, played_at DESC);
CREATE INDEX idx_explain_results_played_at ON explain_game_results(played_at DESC);

-- Tabela limitów dziennych
CREATE TABLE IF NOT EXISTS explain_daily_limits (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  games_played_today INTEGER DEFAULT 0 CHECK (games_played_today >= 0),
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_explain_limits_reset_date ON explain_daily_limits(last_reset_date);

-- Function: Increment daily games counter
CREATE OR REPLACE FUNCTION increment_explain_games(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO explain_daily_limits (user_id, games_played_today, last_reset_date)
  VALUES (p_user_id, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    games_played_today = CASE
      WHEN explain_daily_limits.last_reset_date < CURRENT_DATE THEN 1
      ELSE explain_daily_limits.games_played_today + 1
    END,
    last_reset_date = CURRENT_DATE,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check daily limit
CREATE OR REPLACE FUNCTION check_explain_daily_limit(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS BOOLEAN AS $$
DECLARE
  v_games_today INTEGER;
  v_last_reset DATE;
BEGIN
  SELECT games_played_today, last_reset_date
  INTO v_games_today, v_last_reset
  FROM explain_daily_limits
  WHERE user_id = p_user_id;
  
  -- If no record exists, user hasn't played today
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;
  
  -- If last reset was before today, reset counter
  IF v_last_reset < CURRENT_DATE THEN
    RETURN TRUE;
  END IF;
  
  -- Check if under limit
  RETURN v_games_today < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's daily stats
CREATE OR REPLACE FUNCTION get_explain_user_daily_stats(p_user_id UUID)
RETURNS TABLE (
  games_played_today INTEGER,
  limit_default INTEGER,
  remaining INTEGER,
  resets_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(edl.games_played_today, 0)::INTEGER,
    20::INTEGER as limit_default,
    GREATEST(0, 20 - COALESCE(edl.games_played_today, 0))::INTEGER,
    (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ
  FROM (SELECT p_user_id) u
  LEFT JOIN explain_daily_limits edl ON edl.user_id = u.p_user_id
    AND edl.last_reset_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cleanup expired rooms (to be run by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_explain_rooms()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM explain_rooms
  WHERE expires_at < NOW()
  OR (state = 'waiting' AND created_at < NOW() - INTERVAL '10 minutes')
  OR (state = 'finished' AND updated_at < NOW() - INTERVAL '1 hour');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get ranking (top 10 last 7 days)
CREATE OR REPLACE FUNCTION get_explain_ranking(p_period_days INTEGER DEFAULT 7)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  best_score INTEGER,
  games_played BIGINT,
  wins BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    egr.user_id,
    COALESCE(u.raw_user_meta_data->>'nickname', u.email) as nickname,
    MAX(egr.total_points)::INTEGER as best_score,
    COUNT(egr.id) as games_played,
    SUM(CASE WHEN egr.game_won THEN 1 ELSE 0 END) as wins
  FROM explain_game_results egr
  JOIN auth.users u ON egr.user_id = u.id
  WHERE egr.played_at >= NOW() - (p_period_days || ' days')::INTERVAL
  GROUP BY egr.user_id, u.email, u.raw_user_meta_data
  ORDER BY best_score DESC, egr.user_id
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security Policies

-- explain_rooms policies
ALTER TABLE explain_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rooms they're in"
  ON explain_rooms FOR SELECT
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE POLICY "Users can create rooms"
  ON explain_rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can update their rooms"
  ON explain_rooms FOR UPDATE
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- explain_rounds policies
ALTER TABLE explain_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rounds from their games"
  ON explain_rounds FOR SELECT
  USING (
    auth.uid() = player1_id OR auth.uid() = player2_id
  );

CREATE POLICY "System can insert rounds"
  ON explain_rounds FOR INSERT
  WITH CHECK (true); -- Controlled by backend

-- explain_game_results policies
ALTER TABLE explain_game_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own results"
  ON explain_game_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view rankings"
  ON explain_game_results FOR SELECT
  USING (true);

CREATE POLICY "System can insert results"
  ON explain_game_results FOR INSERT
  WITH CHECK (true); -- Controlled by backend

-- explain_daily_limits policies
ALTER TABLE explain_daily_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own limits"
  ON explain_daily_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage limits"
  ON explain_daily_limits FOR ALL
  USING (true); -- Controlled by backend functions

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION increment_explain_games(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_explain_daily_limit(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_explain_user_daily_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_explain_ranking(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_explain_rooms() TO authenticated;

-- Comments
COMMENT ON TABLE explain_rooms IS 'Active game rooms for Explain Your Move (ephemeral, auto-cleanup after 1h)';
COMMENT ON TABLE explain_rounds IS 'Round history for each game (3 rounds max per game)';
COMMENT ON TABLE explain_game_results IS 'Final game results for ranking system';
COMMENT ON TABLE explain_daily_limits IS 'Daily game limit tracking per user (20 games/day)';

COMMENT ON FUNCTION increment_explain_games IS 'Atomically increment user daily game counter';
COMMENT ON FUNCTION check_explain_daily_limit IS 'Check if user can play another game today';
COMMENT ON FUNCTION get_explain_user_daily_stats IS 'Get user daily stats (games played, remaining)';
COMMENT ON FUNCTION get_explain_ranking IS 'Get top 10 ranking for specified period';
COMMENT ON FUNCTION cleanup_expired_explain_rooms IS 'Cleanup expired/abandoned rooms (run via cron)';

