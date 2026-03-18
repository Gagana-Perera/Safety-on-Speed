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
      guardians: {
        Row: {
          created_at: string;
          g1_name: string | null;
          g1_phone: string | null;
          g1_verified: boolean | null;
          g2_name: string | null;
          g2_phone: string | null;
          g2_verified: boolean | null;
          g3_name: string | null;
          g3_phone: string | null;
          g3_verified: boolean | null;
          g4_name: string | null;
          g4_phone: string | null;
          g4_verified: boolean | null;
          g5_name: string | null;
          g5_phone: string | null;
          g5_verified: boolean | null;
          id: number;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          g1_name?: string | null;
          g1_phone?: string | null;
          g1_verified?: boolean | null;
          g2_name?: string | null;
          g2_phone?: string | null;
          g2_verified?: boolean | null;
          g3_name?: string | null;
          g3_phone?: string | null;
          g3_verified?: boolean | null;
          g4_name?: string | null;
          g4_phone?: string | null;
          g4_verified?: boolean | null;
          g5_name?: string | null;
          g5_phone?: string | null;
          g5_verified?: boolean | null;
          id?: number;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          g1_name?: string | null;
          g1_phone?: string | null;
          g1_verified?: boolean | null;
          g2_name?: string | null;
          g2_phone?: string | null;
          g2_verified?: boolean | null;
          g3_name?: string | null;
          g3_phone?: string | null;
          g3_verified?: boolean | null;
          g4_name?: string | null;
          g4_phone?: string | null;
          g4_verified?: boolean | null;
          g5_name?: string | null;
          g5_phone?: string | null;
          g5_verified?: boolean | null;
          id?: number;
          user_id?: string | null;
        };
        Relationships: [];
      };
      live_locations: {
        Row: {
          is_active: boolean | null
          latitude: number
          longitude: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          is_active?: boolean | null
          latitude: number
          longitude: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          is_active?: boolean | null
          latitude?: number
          longitude?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_locations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string | null
          full_name: string | null
          id: string
          location: string | null
          phone_number: string | null
          updated_at: string | null
          email_notif: boolean | null
          push_notif: boolean | null
          alert_notif: boolean | null
          personal_data_access: boolean | null
          camera_access: boolean | null
          live_location: boolean | null
        }
        Insert: {
          id: string;
          first_name?: string | null;
          surname?: string | null;
          phone_number?: string | null;
          nic_number?: string | null;
          email?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          first_name?: string | null;
          surname?: string | null;
          phone_number?: string | null;
          nic_number?: string | null;
          email?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      sos_locations: {
        Row: {
          accuracy: number | null
          created_at: string
          id: number
          lat: number
          lng: number
          session_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          id?: number
          lat: number
          lng: number
          session_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          id?: number
          lat?: number
          lng?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_locations_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "sos_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_sessions: {
        Row: {
          accuracy: number | null
          alert_delivery_method: string | null
          alert_delivery_status: string | null
          ended_at: string | null
          first_lat: number | null
          first_lng: number | null
          guardian_count: number | null
          id: string
          last_lat: number | null
          last_lng: number | null
          last_updated_at: string | null
          mode: string
          share_token: string
          started_at: string
          status: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          accuracy?: number | null
          alert_delivery_method?: string | null
          alert_delivery_status?: string | null
          ended_at?: string | null
          first_lat?: number | null
          first_lng?: number | null
          guardian_count?: number | null
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_updated_at?: string | null
          mode: string
          share_token?: string
          started_at?: string
          status?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          accuracy?: number | null
          alert_delivery_method?: string | null
          alert_delivery_status?: string | null
          ended_at?: string | null
          first_lat?: number | null
          first_lng?: number | null
          guardian_count?: number | null
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_updated_at?: string | null
          mode?: string
          share_token?: string
          started_at?: string
          status?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      };
    };
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
