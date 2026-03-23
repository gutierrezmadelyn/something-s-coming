export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string | null
          country: string | null
          city: string | null
          lat: number | null
          lng: number | null
          role: string | null
          work_type: string | null
          organization: string | null
          pitch: string | null
          avatar_initials: string | null
          avatar_color: string | null
          photo_url: string | null
          expertise: string[] | null
          wants_to_learn: string | null
          sectors: string[] | null
          offers: string[] | null
          seeks: string[] | null
          whatsapp: string | null
          linkedin: string | null
          xp: number
          streak: number
          league: string
          swipe_count: number
          conversations_started: number
          match_count: number
          show_location: boolean
          show_phone: boolean
          last_active: string | null
          has_logged_in: boolean
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email?: string | null
          country?: string | null
          city?: string | null
          lat?: number | null
          lng?: number | null
          role?: string | null
          work_type?: string | null
          organization?: string | null
          pitch?: string | null
          avatar_initials?: string | null
          avatar_color?: string | null
          photo_url?: string | null
          expertise?: string[] | null
          wants_to_learn?: string | null
          sectors?: string[] | null
          offers?: string[] | null
          seeks?: string[] | null
          whatsapp?: string | null
          linkedin?: string | null
          xp?: number
          streak?: number
          league?: string
          swipe_count?: number
          conversations_started?: number
          match_count?: number
          show_location?: boolean
          show_phone?: boolean
          last_active?: string | null
          has_logged_in?: boolean
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          country?: string | null
          city?: string | null
          lat?: number | null
          lng?: number | null
          role?: string | null
          work_type?: string | null
          organization?: string | null
          pitch?: string | null
          avatar_initials?: string | null
          avatar_color?: string | null
          photo_url?: string | null
          expertise?: string[] | null
          wants_to_learn?: string | null
          sectors?: string[] | null
          offers?: string[] | null
          seeks?: string[] | null
          whatsapp?: string | null
          linkedin?: string | null
          xp?: number
          streak?: number
          league?: string
          swipe_count?: number
          conversations_started?: number
          match_count?: number
          show_location?: boolean
          show_phone?: boolean
          last_active?: string | null
          has_logged_in?: boolean
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      cohorts: {
        Row: {
          id: string
          name: string
          short_name: string | null
          description: string | null
          color: string | null
          icon: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          short_name?: string | null
          description?: string | null
          color?: string | null
          icon?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          short_name?: string | null
          description?: string | null
          color?: string | null
          icon?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      cohort_members: {
        Row: {
          id: string
          cohort_id: string
          profile_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          cohort_id: string
          profile_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          cohort_id?: string
          profile_id?: string
          joined_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          user_id: string
          matched_user_id: string
          match_type: string | null
          icebreaker: string | null
          has_conversation: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          matched_user_id: string
          match_type?: string | null
          icebreaker?: string | null
          has_conversation?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          matched_user_id?: string
          match_type?: string | null
          icebreaker?: string | null
          has_conversation?: boolean
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          match_id: string
          started_at: string
          last_message_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          match_id: string
          started_at?: string
          last_message_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          match_id?: string
          started_at?: string
          last_message_at?: string | null
          is_active?: boolean
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          message_type: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          message_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          message_type?: string
          created_at?: string
        }
      }
      swipes: {
        Row: {
          id: string
          user_id: string
          swiped_user_id: string
          direction: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          swiped_user_id: string
          direction: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          swiped_user_id?: string
          direction?: string
          created_at?: string
        }
      }
      xp_log: {
        Row: {
          id: string
          user_id: string
          action: string
          xp_earned: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          xp_earned: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          xp_earned?: number
          created_at?: string
        }
      }
      icebreakers: {
        Row: {
          id: string
          question: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          question: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          question?: string
          is_active?: boolean
          created_at?: string
        }
      }
    }
    Functions: {
      calculate_compatibility: {
        Args: { user_a: string; user_b: string }
        Returns: number
      }
      award_xp: {
        Args: { p_user_id: string; p_action: string }
        Returns: void
      }
      get_leaderboard: {
        Args: { p_cohort_id?: string }
        Returns: {
          user_id: string
          name: string
          avatar_initials: string | null
          avatar_color: string | null
          photo_url: string | null
          xp: number
          league: string
          rank: number
        }[]
      }
      get_random_icebreaker: {
        Args: Record<string, never>
        Returns: string
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Cohort = Database['public']['Tables']['cohorts']['Row']
export type CohortMember = Database['public']['Tables']['cohort_members']['Row']

export type Match = Database['public']['Tables']['matches']['Row']
export type MatchInsert = Database['public']['Tables']['matches']['Insert']

export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']

export type Swipe = Database['public']['Tables']['swipes']['Row']
export type SwipeInsert = Database['public']['Tables']['swipes']['Insert']

export type Icebreaker = Database['public']['Tables']['icebreakers']['Row']
