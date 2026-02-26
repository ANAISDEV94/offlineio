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
      bookings: {
        Row: {
          category: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          price: number | null
          title: string
          trip_id: string
          url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          price?: number | null
          title: string
          trip_id: string
          url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          price?: number | null
          title?: string
          trip_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          amount: number
          created_at: string
          id: string
          name: string
          spent: number
          trip_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          name: string
          spent?: number
          trip_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          name?: string
          spent?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "budget_categories_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          activity: string
          created_at: string
          day_number: number
          id: string
          notes: string | null
          time: string | null
          trip_id: string
        }
        Insert: {
          activity: string
          created_at?: string
          day_number: number
          id?: string
          notes?: string | null
          time?: string | null
          trip_id: string
        }
        Update: {
          activity?: string
          created_at?: string
          day_number?: number
          id?: string
          notes?: string | null
          time?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "itinerary_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      member_share_overrides: {
        Row: {
          created_at: string
          id: string
          set_by: string
          share_amount: number
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          set_by: string
          share_amount: number
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          set_by?: string
          share_amount?: number
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_share_overrides_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "member_share_overrides_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          trigger_date: string | null
          trip_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          trigger_date?: string | null
          trip_id: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          trigger_date?: string | null
          trip_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "notifications_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_bookings: {
        Row: {
          booking_url: string | null
          category: string
          confirmation_number: string | null
          created_at: string
          id: string
          notes: string | null
          receipt_url: string | null
          status: string
          trip_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          booking_url?: string | null
          category: string
          confirmation_number?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          status?: string
          trip_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          booking_url?: string | null
          category?: string
          confirmation_number?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          status?: string
          trip_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizer_bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "organizer_bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_posts: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          occasion: string
          trip_id: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          occasion?: string
          trip_id: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          occasion?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_posts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "outfit_posts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_reactions: {
        Row: {
          comment: string | null
          created_at: string
          emoji: string | null
          id: string
          outfit_post_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          outfit_post_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          outfit_post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_reactions_outfit_post_id_fkey"
            columns: ["outfit_post_id"]
            isOneToOne: false
            referencedRelation: "outfit_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_items: {
        Row: {
          created_at: string
          id: string
          is_checked: boolean
          is_suggested: boolean
          item_name: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_checked?: boolean
          is_suggested?: boolean
          item_name: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_checked?: boolean
          is_suggested?: boolean
          item_name?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "packing_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string
          stripe_session_id: string | null
          trip_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string
          stripe_session_id?: string | null
          trip_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          stripe_session_id?: string | null
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "payment_history_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          amount_paid: number
          auto_pay: boolean
          created_at: string
          id: string
          installment_plan: string
          next_due_date: string | null
          status: string
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          amount_paid?: number
          auto_pay?: boolean
          created_at?: string
          id?: string
          installment_plan?: string
          next_due_date?: string | null
          status?: string
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          auto_pay?: boolean
          created_at?: string
          id?: string
          installment_plan?: string
          next_due_date?: string | null
          status?: string
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_creator: boolean
          onboarding_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_creator?: boolean
          onboarding_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_creator?: boolean
          onboarding_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_documents: {
        Row: {
          created_at: string
          file_url: string
          id: string
          title: string
          trip_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          title: string
          trip_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          title?: string
          trip_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "trip_documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_members: {
        Row: {
          created_at: string
          id: string
          role: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_plan_items: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          day_number: number | null
          description: string | null
          est_cost: number | null
          id: string
          source_url: string | null
          status: string
          time_block: string | null
          title: string
          trip_id: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          day_number?: number | null
          description?: string | null
          est_cost?: number | null
          id?: string
          source_url?: string | null
          status?: string
          time_block?: string | null
          title: string
          trip_id: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          day_number?: number | null
          description?: string | null
          est_cost?: number | null
          id?: string
          source_url?: string | null
          status?: string
          time_block?: string | null
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_plan_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "trip_plan_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_plan_sessions: {
        Row: {
          answers_json: Json | null
          created_at: string
          generated_plan_json: Json | null
          id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          answers_json?: Json | null
          created_at?: string
          generated_plan_json?: Json | null
          id?: string
          trip_id: string
          user_id: string
        }
        Update: {
          answers_json?: Json | null
          created_at?: string
          generated_plan_json?: Json | null
          id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_plan_sessions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "trip_plan_sessions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string
          destination: string
          end_date: string
          group_size: number
          host_bio: string | null
          id: string
          invite_code: string | null
          is_verified_host: boolean
          join_deadline: string | null
          max_spots: number | null
          min_spots_required: number | null
          name: string
          payment_deadline: string | null
          per_person_budget: number
          start_date: string
          total_cost: number
          trip_description: string | null
          updated_at: string
          vibe: string
          visibility: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          destination: string
          end_date: string
          group_size?: number
          host_bio?: string | null
          id?: string
          invite_code?: string | null
          is_verified_host?: boolean
          join_deadline?: string | null
          max_spots?: number | null
          min_spots_required?: number | null
          name: string
          payment_deadline?: string | null
          per_person_budget?: number
          start_date: string
          total_cost?: number
          trip_description?: string | null
          updated_at?: string
          vibe?: string
          visibility?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          destination?: string
          end_date?: string
          group_size?: number
          host_bio?: string | null
          id?: string
          invite_code?: string | null
          is_verified_host?: boolean
          join_deadline?: string | null
          max_spots?: number | null
          min_spots_required?: number | null
          name?: string
          payment_deadline?: string | null
          per_person_budget?: number
          start_date?: string
          total_cost?: number
          trip_description?: string | null
          updated_at?: string
          vibe?: string
          visibility?: string
        }
        Relationships: []
      }
      user_payment_methods: {
        Row: {
          billing_name: string | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last_four: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_name?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_name?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      trip_funding_summary: {
        Row: {
          days_to_deadline: number | null
          member_count: number | null
          payment_deadline: string | null
          per_person_cost: number | null
          percent_funded: number | null
          total_cost: number | null
          total_funded: number | null
          total_remaining: number | null
          trip_id: string | null
          trip_name: string | null
        }
        Relationships: []
      }
      trip_member_funding: {
        Row: {
          amount_paid: number | null
          amount_remaining: number | null
          display_name: string | null
          member_status: string | null
          pct_complete: number | null
          per_person_cost: number | null
          role: string | null
          trip_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_funding_summary"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_member_funding: {
        Args: { p_trip_id: string }
        Returns: {
          amount_paid: number
          amount_remaining: number
          display_name: string
          member_status: string
          pct_complete: number
          per_person_cost: number
          role: string
          trip_id: string
          user_id: string
        }[]
      }
      get_trip_dashboard: { Args: { p_trip_id: string }; Returns: Json }
      get_trip_funding_summary: {
        Args: { p_trip_id: string }
        Returns: {
          days_to_deadline: number
          member_count: number
          payment_deadline: string
          per_person_cost: number
          percent_funded: number
          total_cost: number
          total_funded: number
          total_remaining: number
          trip_id: string
          trip_name: string
        }[]
      }
      is_trip_member: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      is_trip_organizer: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      recalc_trip_total: { Args: { p_trip_id: string }; Returns: number }
      set_member_share_override: {
        Args: { p_amount: number; p_trip_id: string; p_user_id: string }
        Returns: undefined
      }
      update_trip_total: {
        Args: { p_total: number; p_trip_id: string }
        Returns: number
      }
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
