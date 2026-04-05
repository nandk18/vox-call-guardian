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
      agents: {
        Row: {
          bolna_agent_id: string | null
          bolna_phone_number_id: string | null
          business_name: string | null
          compiled_prompt: string | null
          created_at: string | null
          greeting: string | null
          id: string
          industry: string | null
          language_auto_detect: boolean | null
          language_primary: string | null
          notification_email: boolean | null
          notification_sms: boolean | null
          notification_whatsapp: boolean | null
          onboarding_complete: boolean | null
          owner_mobile: string | null
          owner_whatsapp: string | null
          phone_number: string | null
          plan: string | null
          status: string | null
          talk_speed: string | null
          trial_ends_at: string | null
          user_id: string
          voice: string | null
          vox_number: string | null
        }
        Insert: {
          bolna_agent_id?: string | null
          bolna_phone_number_id?: string | null
          business_name?: string | null
          compiled_prompt?: string | null
          created_at?: string | null
          greeting?: string | null
          id?: string
          industry?: string | null
          language_auto_detect?: boolean | null
          language_primary?: string | null
          notification_email?: boolean | null
          notification_sms?: boolean | null
          notification_whatsapp?: boolean | null
          onboarding_complete?: boolean | null
          owner_mobile?: string | null
          owner_whatsapp?: string | null
          phone_number?: string | null
          plan?: string | null
          status?: string | null
          talk_speed?: string | null
          trial_ends_at?: string | null
          user_id: string
          voice?: string | null
          vox_number?: string | null
        }
        Update: {
          bolna_agent_id?: string | null
          bolna_phone_number_id?: string | null
          business_name?: string | null
          compiled_prompt?: string | null
          created_at?: string | null
          greeting?: string | null
          id?: string
          industry?: string | null
          language_auto_detect?: boolean | null
          language_primary?: string | null
          notification_email?: boolean | null
          notification_sms?: boolean | null
          notification_whatsapp?: boolean | null
          onboarding_complete?: boolean | null
          owner_mobile?: string | null
          owner_whatsapp?: string | null
          phone_number?: string | null
          plan?: string | null
          status?: string | null
          talk_speed?: string | null
          trial_ends_at?: string | null
          user_id?: string
          voice?: string | null
          vox_number?: string | null
        }
        Relationships: []
      }
      calls: {
        Row: {
          agent_id: string
          caller_name: string | null
          caller_need: string | null
          caller_number: string | null
          caller_urgency: string | null
          created_at: string | null
          duration_secs: number | null
          id: string
          is_read: boolean | null
          notification_sent: boolean | null
          outcome: string | null
          preferred_callback_time: string | null
          recording_url: string | null
          summary: string | null
          transcript: Json | null
        }
        Insert: {
          agent_id: string
          caller_name?: string | null
          caller_need?: string | null
          caller_number?: string | null
          caller_urgency?: string | null
          created_at?: string | null
          duration_secs?: number | null
          id?: string
          is_read?: boolean | null
          notification_sent?: boolean | null
          outcome?: string | null
          preferred_callback_time?: string | null
          recording_url?: string | null
          summary?: string | null
          transcript?: Json | null
        }
        Update: {
          agent_id?: string
          caller_name?: string | null
          caller_need?: string | null
          caller_number?: string | null
          caller_urgency?: string | null
          created_at?: string | null
          duration_secs?: number | null
          id?: string
          is_read?: boolean | null
          notification_sent?: boolean | null
          outcome?: string | null
          preferred_callback_time?: string | null
          recording_url?: string | null
          summary?: string | null
          transcript?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge: {
        Row: {
          address: string | null
          agent_id: string
          extra_notes: string | null
          faq: string | null
          hours: string | null
          id: string
          services: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          agent_id: string
          extra_notes?: string | null
          faq?: string | null
          hours?: string | null
          id?: string
          services?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string
          extra_notes?: string | null
          faq?: string | null
          hours?: string | null
          id?: string
          services?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
