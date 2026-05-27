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
          suggested_date: string | null
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
          suggested_date?: string | null
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
          suggested_date?: string | null
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
          image_url: string | null
          price_info: string | null
          reviewed_at: string | null
          sanity_warnings: string[]
          source_quote: string | null
          source_url: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitter_email: string
          submitter_name: string | null
          title: string
          venue_location: string | null
          venue_match_status: string
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
          image_url?: string | null
          price_info?: string | null
          reviewed_at?: string | null
          sanity_warnings?: string[]
          source_quote?: string | null
          source_url?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitter_email: string
          submitter_name?: string | null
          title: string
          venue_location?: string | null
          venue_match_status?: string
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
          image_url?: string | null
          price_info?: string | null
          reviewed_at?: string | null
          sanity_warnings?: string[]
          source_quote?: string | null
          source_url?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitter_email?: string
          submitter_name?: string | null
          title?: string
          venue_location?: string | null
          venue_match_status?: string
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
          last_verified_at: string | null
          price_info: string | null
          source_quote: string | null
          source_url: string | null
          start_time: string | null
          title: string
          updated_at: string
          venue_location: string | null
          venue_name: string
          verification_notes: string | null
          verification_status: string
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
          last_verified_at?: string | null
          price_info?: string | null
          source_quote?: string | null
          source_url?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
          venue_location?: string | null
          venue_name: string
          verification_notes?: string | null
          verification_status?: string
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
          last_verified_at?: string | null
          price_info?: string | null
          source_quote?: string | null
          source_url?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
          venue_location?: string | null
          venue_name?: string
          verification_notes?: string | null
          verification_status?: string
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
      freshness_snapshots: {
        Row: {
          alert_sent: boolean
          captured_at: string
          details: Json | null
          id: string
          last_event_update_at: string | null
          last_successful_scrape_at: string | null
          scrape_stale: boolean
          stale_event_count: number
          updates_stale: boolean
        }
        Insert: {
          alert_sent?: boolean
          captured_at?: string
          details?: Json | null
          id?: string
          last_event_update_at?: string | null
          last_successful_scrape_at?: string | null
          scrape_stale?: boolean
          stale_event_count?: number
          updates_stale?: boolean
        }
        Update: {
          alert_sent?: boolean
          captured_at?: string
          details?: Json | null
          id?: string
          last_event_update_at?: string | null
          last_successful_scrape_at?: string | null
          scrape_stale?: boolean
          stale_event_count?: number
          updates_stale?: boolean
        }
        Relationships: []
      }
      reverification_runs: {
        Row: {
          errors: Json
          events_checked: number
          events_flagged: number
          events_verified: number
          finished_at: string | null
          id: string
          started_at: string
          status: string
          triggered_by: string
        }
        Insert: {
          errors?: Json
          events_checked?: number
          events_flagged?: number
          events_verified?: number
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Update: {
          errors?: Json
          events_checked?: number
          events_flagged?: number
          events_verified?: number
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          triggered_by?: string
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
      seo_snapshots: {
        Row: {
          alert_sent: boolean
          avg_ctr: number | null
          avg_position: number | null
          captured_at: string
          id: string
          raw: Json | null
          regressions: Json | null
          sitemap_errors: number | null
          sitemap_indexed: number | null
          sitemap_last_downloaded: string | null
          sitemap_path: string | null
          sitemap_submitted: number | null
          sitemap_warnings: number | null
          top_pages: Json | null
          top_queries: Json | null
          total_clicks: number | null
          total_impressions: number | null
        }
        Insert: {
          alert_sent?: boolean
          avg_ctr?: number | null
          avg_position?: number | null
          captured_at?: string
          id?: string
          raw?: Json | null
          regressions?: Json | null
          sitemap_errors?: number | null
          sitemap_indexed?: number | null
          sitemap_last_downloaded?: string | null
          sitemap_path?: string | null
          sitemap_submitted?: number | null
          sitemap_warnings?: number | null
          top_pages?: Json | null
          top_queries?: Json | null
          total_clicks?: number | null
          total_impressions?: number | null
        }
        Update: {
          alert_sent?: boolean
          avg_ctr?: number | null
          avg_position?: number | null
          captured_at?: string
          id?: string
          raw?: Json | null
          regressions?: Json | null
          sitemap_errors?: number | null
          sitemap_indexed?: number | null
          sitemap_last_downloaded?: string | null
          sitemap_path?: string | null
          sitemap_submitted?: number | null
          sitemap_warnings?: number | null
          top_pages?: Json | null
          top_queries?: Json | null
          total_clicks?: number | null
          total_impressions?: number | null
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
          last_chars: number | null
          last_deduped: number | null
          last_error_message: string | null
          last_inserted: number | null
          last_invalid_date: number | null
          last_returned: number | null
          last_scraped_at: string | null
          last_status: string | null
          last_used_firecrawl: boolean | null
          notes: string | null
          source_type: string
          updated_at: string
          url: string
          venue_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_chars?: number | null
          last_deduped?: number | null
          last_error_message?: string | null
          last_inserted?: number | null
          last_invalid_date?: number | null
          last_returned?: number | null
          last_scraped_at?: string | null
          last_status?: string | null
          last_used_firecrawl?: boolean | null
          notes?: string | null
          source_type?: string
          updated_at?: string
          url: string
          venue_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_chars?: number | null
          last_deduped?: number | null
          last_error_message?: string | null
          last_inserted?: number | null
          last_invalid_date?: number | null
          last_returned?: number | null
          last_scraped_at?: string | null
          last_status?: string | null
          last_used_firecrawl?: boolean | null
          notes?: string | null
          source_type?: string
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
      create_event_flag:
        | {
            Args: {
              _details: string
              _event_id: string
              _reason: Database["public"]["Enums"]["event_flag_reason"]
            }
            Returns: {
              delete_token: string
              id: string
            }[]
          }
        | {
            Args: {
              _details: string
              _event_id: string
              _reason: Database["public"]["Enums"]["event_flag_reason"]
              _suggested_date?: string
            }
            Returns: {
              delete_token: string
              id: string
            }[]
          }
      create_field_layout: {
        Args: {
          _author_name: string
          _description: string
          _name: string
          _obstacle_count: number
          _obstacles: Json
          _tags: string[]
        }
        Returns: {
          delete_token: string
          id: string
        }[]
      }
      delete_event_flag: {
        Args: { _id: string; _token: string }
        Returns: boolean
      }
      delete_field_layout: {
        Args: { _id: string; _token: string }
        Returns: boolean
      }
      get_admin_team_contacts: {
        Args: never
        Returns: {
          contact_email: string
          contact_phone: string
          id: string
        }[]
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
