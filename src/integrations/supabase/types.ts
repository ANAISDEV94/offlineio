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
          onboarding_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          created_by: string
          destination: string
          end_date: string
          group_size: number
          id: string
          invite_code: string | null
          name: string
          payment_deadline: string | null
          per_person_budget: number
          start_date: string
          updated_at: string
          vibe: string
        }
        Insert: {
          created_at?: string
          created_by: string
          destination: string
          end_date: string
          group_size?: number
          id?: string
          invite_code?: string | null
          name: string
          payment_deadline?: string | null
          per_person_budget?: number
          start_date: string
          updated_at?: string
          vibe?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          destination?: string
          end_date?: string
          group_size?: number
          id?: string
          invite_code?: string | null
          name?: string
          payment_deadline?: string | null
          per_person_budget?: number
          start_date?: string
          updated_at?: string
          vibe?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_trip_member: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      is_trip_organizer: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
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
