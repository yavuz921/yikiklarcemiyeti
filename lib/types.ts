export interface Match {
  id: number
  round: 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  team_a: string | null
  team_b: string | null
  winner: string | null
  is_final: boolean
  left_from_match: number | null
  right_from_match: number | null
  match_time: string | null
}

export interface Player {
  id: string
  nickname: string
  emoji: string
  avatar_url: string | null
  is_locked: boolean
  created_at: string
}

export interface Prediction {
  id: string
  player_id: string
  match_id: number
  predicted_winner: string
}

export interface Score {
  player_id: string
  total_points: number
  correct_predictions: number
  rank: number
  players: {
    nickname: string
    emoji: string
    avatar_url: string | null
  }
}
