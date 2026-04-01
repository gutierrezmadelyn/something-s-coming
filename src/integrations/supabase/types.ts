export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      cohort_members: {
        Row: {
          cohort_id: string
          id: string
          joined_at: string | null
          profile_id: string
        }
        Insert: {
          cohort_id: string
          id?: string
          joined_at?: string | null
          profile_id: string
        }
        Update: {
          cohort_id?: string
          id?: string
          joined_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          short_name: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id: string
          is_active?: boolean | null
          name: string
          short_name?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          short_name?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          is_active: boolean | null
          last_message_at: string | null
          match_id: string
          started_at: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          match_id: string
          started_at?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          match_id?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      icebreakers: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          question: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string | null
          has_conversation: boolean | null
          icebreaker: string | null
          id: string
          match_type: string | null
          matched_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          has_conversation?: boolean | null
          icebreaker?: string | null
          id?: string
          match_type?: string | null
          matched_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          has_conversation?: boolean | null
          icebreaker?: string | null
          id?: string
          match_type?: string | null
          matched_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_matched_user_id_fkey"
            columns: ["matched_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          message_type: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string | null
          avatar_initials: string | null
          city: string | null
          conversations_started: number | null
          country: string | null
          created_at: string | null
          email: string | null
          expertise: string[] | null
          has_logged_in: boolean | null
          id: string
          is_admin: boolean | null
          last_active: string | null
          lat: number | null
          league: string | null
          linkedin: string | null
          lng: number | null
          match_count: number | null
          name: string
          offers: string[] | null
          organization: string | null
          photo_url: string | null
          pitch: string | null
          role: string | null
          sectors: string[] | null
          seeks: string[] | null
          show_location: boolean | null
          show_phone: boolean | null
          streak: number | null
          swipe_count: number | null
          updated_at: string | null
          wants_to_learn: string | null
          whatsapp: string | null
          work_type: string | null
          xp: number | null
        }
        Insert: {
          avatar_color?: string | null
          avatar_initials?: string | null
          city?: string | null
          conversations_started?: number | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          expertise?: string[] | null
          has_logged_in?: boolean | null
          id: string
          is_admin?: boolean | null
          last_active?: string | null
          lat?: number | null
          league?: string | null
          linkedin?: string | null
          lng?: number | null
          match_count?: number | null
          name: string
          offers?: string[] | null
          organization?: string | null
          photo_url?: string | null
          pitch?: string | null
          role?: string | null
          sectors?: string[] | null
          seeks?: string[] | null
          show_location?: boolean | null
          show_phone?: boolean | null
          streak?: number | null
          swipe_count?: number | null
          updated_at?: string | null
          wants_to_learn?: string | null
          whatsapp?: string | null
          work_type?: string | null
          xp?: number | null
        }
        Update: {
          avatar_color?: string | null
          avatar_initials?: string | null
          city?: string | null
          conversations_started?: number | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          expertise?: string[] | null
          has_logged_in?: boolean | null
          id?: string
          is_admin?: boolean | null
          last_active?: string | null
          lat?: number | null
          league?: string | null
          linkedin?: string | null
          lng?: number | null
          match_count?: number | null
          name?: string
          offers?: string[] | null
          organization?: string | null
          photo_url?: string | null
          pitch?: string | null
          role?: string | null
          sectors?: string[] | null
          seeks?: string[] | null
          show_location?: boolean | null
          show_phone?: boolean | null
          streak?: number | null
          swipe_count?: number | null
          updated_at?: string | null
          wants_to_learn?: string | null
          whatsapp?: string | null
          work_type?: string | null
          xp?: number | null
        }
        Relationships: []
      }
      swipes: {
        Row: {
          created_at: string | null
          direction: string
          id: string
          swiped_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          swiped_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          swiped_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_swiped_user_id_fkey"
            columns: ["swiped_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          user_id: string
          xp_earned: number
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_to_cohort: {
        Args: { p_cohort_id: string; p_profile_id: string }
        Returns: Json
      }
      admin_create_auth_user: {
        Args: { p_email: string; p_name?: string; p_password: string }
        Returns: Json
      }
      admin_import_user: {
        Args: {
          p_city?: string
          p_country?: string
          p_email: string
          p_expertise?: string[]
          p_linkedin?: string
          p_name: string
          p_password?: string
          p_role?: string
          p_whatsapp?: string
          p_work_type?: string
        }
        Returns: Json
      }
      award_xp: {
        Args: { p_action: string; p_user_id: string }
        Returns: undefined
      }
      calculate_compatibility: {
        Args: { user_a: string; user_b: string }
        Returns: number
      }
      claim_profile_by_email: {
        Args: { p_auth_id: string; p_email: string; p_name?: string }
        Returns: Json
      }
      delete_user_data: {
        Args: { user_id_to_delete: string }
        Returns: undefined
      }
      get_leaderboard:
        | {
            Args: { p_cohort_id?: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_leaderboard(p_cohort_id => text), public.get_leaderboard(p_cohort_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
        | {
            Args: { p_cohort_id?: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_leaderboard(p_cohort_id => text), public.get_leaderboard(p_cohort_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
      get_random_icebreaker: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
