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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      event_flags: {
        Row: {
          created_at: string
          delete_token: string | null
          details: string | null
          event_id: string
          id: string
          is_resolved: boolean
          reason: Database["public"]["Enums"]["event_flag_reason"]
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          delete_token?: string | null
          details?: string | null
          event_id: string
          id?: string
          is_resolved?: boolean
          reason: Database["public"]["Enums"]["event_flag_reason"]
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          delete_token?: string | null
          details?: string | null
          event_id?: string
          id?: string
          is_resolved?: boolean
          reason?: Database["public"]["Enums"]["event_flag_reason"]
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_flags_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_submissions: {
        Row: {
          admin_notes: string | null
          booking_url: string | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          price_info: string | null
          reviewed_at: string | null
          source_url: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitter_email: string
          submitter_name: string | null
          title: string
          venue_location: string | null
          venue_name: string
        }
        Insert: {
          admin_notes?: string | null
          booking_url?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          price_info?: string | null
          reviewed_at?: string | null
          source_url?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitter_email: string
          submitter_name?: string | null
          title: string
          venue_location?: string | null
          venue_name: string
        }
        Update: {
          admin_notes?: string | null
          booking_url?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          price_info?: string | null
          reviewed_at?: string | null
          source_url?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitter_email?: string
          submitter_name?: string | null
          title?: string
          venue_location?: string | null
          venue_name?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          booking_url: string | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          image_url: string | null
          is_verified: boolean | null
          price_info: string | null
          source_url: string | null
          start_time: string | null
          title: string
          updated_at: string
          venue_location: string | null
          venue_name: string
        }
        Insert: {
          booking_url?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          image_url?: string | null
          is_verified?: boolean | null
          price_info?: string | null
          source_url?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
          venue_location?: string | null
          venue_name: string
        }
        Update: {
          booking_url?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          image_url?: string | null
          is_verified?: boolean | null
          price_info?: string | null
          source_url?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
          venue_location?: string | null
          venue_name?: string
        }
        Relationships: []
      }
      field_layouts: {
        Row: {
          author_name: string | null
          created_at: string
          delete_token: string | null
          description: string | null
          id: string
          name: string
          obstacle_count: number
          obstacles: Json
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          created_at?: string
          delete_token?: string | null
          description?: string | null
          id?: string
          name: string
          obstacle_count?: number
          obstacles: Json
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          created_at?: string
          delete_token?: string | null
          description?: string | null
          id?: string
          name?: string
          obstacle_count?: number
          obstacles?: Json
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      scrape_runs: {
        Row: {
          candidates_created: number
          errors: Json
          finished_at: string | null
          id: string
          sources_processed: number
          started_at: string
          status: string
          triggered_by: string
        }
        Insert: {
          candidates_created?: number
          errors?: Json
          finished_at?: string | null
          id?: string
          sources_processed?: number
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Update: {
          candidates_created?: number
          errors?: Json
          finished_at?: string | null
          id?: string
          sources_processed?: number
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Relationships: []
      }
      team_roster: {
        Row: {
          created_at: string
          id: string
          is_captain: boolean | null
          player_name: string
          player_number: string | null
          role: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_captain?: boolean | null
          player_name: string
          player_number?: string | null
          role?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_captain?: boolean | null
          player_name?: string
          player_number?: string | null
          role?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_roster_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          division: string
          home_venue: string | null
          id: string
          is_active: boolean | null
          league: string
          logo_url: string | null
          name: string
          points: number | null
          position: number | null
          region: string | null
          social_media: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          captain_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          division: string
          home_venue?: string | null
          id?: string
          is_active?: boolean | null
          league?: string
          logo_url?: string | null
          name: string
          points?: number | null
          position?: number | null
          region?: string | null
          social_media?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          captain_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          division?: string
          home_venue?: string | null
          id?: string
          is_active?: boolean | null
          league?: string
          logo_url?: string | null
          name?: string
          points?: number | null
          position?: number | null
          region?: string | null
          social_media?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      trusted_venue_sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_scraped_at: string | null
          last_status: string | null
          notes: string | null
          updated_at: string
          url: string
          venue_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_scraped_at?: string | null
          last_status?: string | null
          notes?: string | null
          updated_at?: string
          url: string
          venue_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_scraped_at?: string | null
          last_status?: string | null
          notes?: string | null
          updated_at?: string
          url?: string
          venue_name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_visits: {
        Row: {
          id: string
          page_path: string | null
          session_id: string | null
          user_id: string | null
          visited_at: string
        }
        Insert: {
          id?: string
          page_path?: string | null
          session_id?: string | null
          user_id?: string | null
          visited_at?: string
        }
        Update: {
          id?: string
          page_path?: string | null
          session_id?: string | null
          user_id?: string | null
          visited_at?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
          region: string | null
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
          region?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          region?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_event_flag: {
        Args: { _id: string; _token: string }
        Returns: boolean
      }
      delete_field_layout: {
        Args: { _id: string; _token: string }
        Returns: boolean
      }
      get_visit_stats: {
        Args: { days_back?: number }
        Returns: {
          total_visits: number
          unique_visitors: number
          visit_date: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      event_flag_reason:
        | "wrong_date"
        | "cancelled"
        | "does_not_exist"
        | "wrong_venue"
        | "other"
      event_type:
        | "walk_on"
        | "big_game"
        | "competition"
        | "tournament"
        | "speedball"
        | "scenario"
        | "other"
        | "mag_fed"
      submission_status: "pending" | "approved" | "rejected"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      event_flag_reason: [
        "wrong_date",
        "cancelled",
        "does_not_exist",
        "wrong_venue",
        "other",
      ],
      event_type: [
        "walk_on",
        "big_game",
        "competition",
        "tournament",
        "speedball",
        "scenario",
        "other",
        "mag_fed",
      ],
      submission_status: ["pending", "approved", "rejected"],
    },
  },
} as const
