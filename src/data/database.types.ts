export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      fixtures: {
        Row: {
          away_score: number | null
          away_team_id: string
          edited_by_admin: boolean
          group_id: string | null
          home_score: number | null
          home_team_id: string
          id: string
          kickoff_utc: string
          man_of_match_player_id: string | null
          minute: number | null
          stage: string
          status: string
          venue_id: string
        }
        Insert: {
          away_score?: number | null
          away_team_id: string
          edited_by_admin?: boolean
          group_id?: string | null
          home_score?: number | null
          home_team_id: string
          id: string
          kickoff_utc: string
          man_of_match_player_id?: string | null
          minute?: number | null
          stage: string
          status?: string
          venue_id: string
        }
        Update: {
          away_score?: number | null
          away_team_id?: string
          edited_by_admin?: boolean
          group_id?: string | null
          home_score?: number | null
          home_team_id?: string
          id?: string
          kickoff_utc?: string
          man_of_match_player_id?: string | null
          minute?: number | null
          stage?: string
          status?: string
          venue_id?: string
        }
        Relationships: []
      }
      groups: {
        Row: { id: string; label: string }
        Insert: { id: string; label: string }
        Update: { id?: string; label?: string }
        Relationships: []
      }
      insights: {
        Row: {
          blurb: string
          id: string
          is_published: boolean
          kind: string
          team_id: string | null
          value: string
        }
        Insert: {
          blurb: string
          id?: string
          is_published?: boolean
          kind: string
          team_id?: string | null
          value: string
        }
        Update: {
          blurb?: string
          id?: string
          is_published?: boolean
          kind?: string
          team_id?: string | null
          value?: string
        }
        Relationships: []
      }
      match_events: {
        Row: {
          assist_player_id: string | null
          fixture_id: string
          id: string
          minute: number
          player_id: string
          team_id: string
          type: string
        }
        Insert: {
          assist_player_id?: string | null
          fixture_id: string
          id: string
          minute: number
          player_id: string
          team_id: string
          type: string
        }
        Update: {
          assist_player_id?: string | null
          fixture_id?: string
          id?: string
          minute?: number
          player_id?: string
          team_id?: string
          type?: string
        }
        Relationships: []
      }
      match_lineups: {
        Row: {
          fixture_id: string
          team_id: string
          player_id: string
          player_name: string
          shirt_number: number
          position: string
          is_starter: boolean
          formation: string | null
          subbed_off_minute: number | null
          subbed_on_minute: number | null
          subbed_for_player_id: string | null
          source: string | null
          edited_by_admin: boolean
          updated_at: string
        }
        Insert: {
          fixture_id: string
          team_id: string
          player_id: string
          player_name: string
          shirt_number?: number
          position: string
          is_starter?: boolean
          formation?: string | null
          subbed_off_minute?: number | null
          subbed_on_minute?: number | null
          subbed_for_player_id?: string | null
          source?: string | null
          edited_by_admin?: boolean
          updated_at?: string
        }
        Update: {
          fixture_id?: string
          team_id?: string
          player_id?: string
          player_name?: string
          shirt_number?: number
          position?: string
          is_starter?: boolean
          formation?: string | null
          subbed_off_minute?: number | null
          subbed_on_minute?: number | null
          subbed_for_player_id?: string | null
          source?: string | null
          edited_by_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      match_team_stats: {
        Row: {
          fixture_id: string
          team_id: string
          possession_pct: number | null
          shots_on_target: number | null
          shots_off_target: number | null
          shots_blocked: number | null
          corners: number | null
          offsides: number | null
          fouls: number | null
          yellow_cards: number | null
          red_cards: number | null
          source: string | null
          edited_by_admin: boolean
          updated_at: string
        }
        Insert: {
          fixture_id: string
          team_id: string
          possession_pct?: number | null
          shots_on_target?: number | null
          shots_off_target?: number | null
          shots_blocked?: number | null
          corners?: number | null
          offsides?: number | null
          fouls?: number | null
          yellow_cards?: number | null
          red_cards?: number | null
          source?: string | null
          edited_by_admin?: boolean
          updated_at?: string
        }
        Update: {
          fixture_id?: string
          team_id?: string
          possession_pct?: number | null
          shots_on_target?: number | null
          shots_off_target?: number | null
          shots_blocked?: number | null
          corners?: number | null
          offsides?: number | null
          fouls?: number | null
          yellow_cards?: number | null
          red_cards?: number | null
          source?: string | null
          edited_by_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          fixture_id: string | null
          headline: string
          id: string
          published_at: string
          team_id: string | null
          url: string | null
        }
        Insert: {
          fixture_id?: string | null
          headline: string
          id?: string
          published_at?: string
          team_id?: string | null
          url?: string | null
        }
        Update: {
          fixture_id?: string | null
          headline?: string
          id?: string
          published_at?: string
          team_id?: string | null
          url?: string | null
        }
        Relationships: []
      }
      players: {
        Row: {
          date_of_birth: string | null
          edited_by_admin: boolean
          id: string
          name: string
          position: string
          shirt_number: number
          source: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          date_of_birth?: string | null
          edited_by_admin?: boolean
          id: string
          name: string
          position: string
          shirt_number: number
          source?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          date_of_birth?: string | null
          edited_by_admin?: boolean
          id?: string
          name?: string
          position?: string
          shirt_number?: number
          source?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          edited_by_admin: boolean
          fifa_code: string | null
          flag_emoji: string
          flag_url: string | null
          form: string[]
          fun_fact: string
          trivia_facts: string[]
          group_id: string
          id: string
          kit_image_url: string | null
          name: string
          on_primary: string | null
          on_secondary: string | null
          primary_hex: string
          secondary_hex: string
          seed: number
          short_code: string
          source: string | null
          tertiary_hex: string
          texture_id: string | null
          title_odds: string
          updated_at: string
        }
        Insert: {
          edited_by_admin?: boolean
          fifa_code?: string | null
          flag_emoji: string
          flag_url?: string | null
          form?: string[]
          fun_fact: string
          trivia_facts?: string[]
          group_id: string
          id: string
          kit_image_url?: string | null
          name: string
          on_primary?: string | null
          on_secondary?: string | null
          primary_hex: string
          secondary_hex: string
          seed: number
          short_code: string
          source?: string | null
          tertiary_hex: string
          texture_id?: string | null
          title_odds: string
          updated_at?: string
        }
        Update: {
          edited_by_admin?: boolean
          fifa_code?: string | null
          flag_emoji?: string
          flag_url?: string | null
          form?: string[]
          fun_fact?: string
          trivia_facts?: string[]
          group_id?: string
          id?: string
          kit_image_url?: string | null
          name?: string
          on_primary?: string | null
          on_secondary?: string | null
          primary_hex?: string
          secondary_hex?: string
          seed?: number
          short_code?: string
          source?: string | null
          tertiary_hex?: string
          texture_id?: string | null
          title_odds?: string
          updated_at?: string
        }
        Relationships: []
      }
      textures: {
        Row: {
          enabled: boolean
          file_path: string
          id: string
          name: string
        }
        Insert: {
          enabled?: boolean
          file_path: string
          id: string
          name: string
        }
        Update: {
          enabled?: boolean
          file_path?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          city: string
          country: string
          fun_fact: string
          id: string
          stadium: string
        }
        Insert: {
          city: string
          country: string
          fun_fact: string
          id: string
          stadium: string
        }
        Update: {
          city?: string
          country?: string
          fun_fact?: string
          id?: string
          stadium?: string
        }
        Relationships: []
      }
    }
    Views: {
      player_stats: {
        Row: {
          assists: number | null
          goals: number | null
          player_id: string | null
          player_name: string | null
          red_cards: number | null
          team_id: string | null
          yellow_cards: number | null
        }
        Relationships: []
      }
      standings: {
        Row: {
          drawn: number | null
          goal_diff: number | null
          goals_against: number | null
          goals_for: number | null
          group_id: string | null
          lost: number | null
          played: number | null
          points: number | null
          team_id: string | null
          won: number | null
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
