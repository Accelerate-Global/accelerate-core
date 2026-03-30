export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      dataset_access: {
        Row: {
          created_at: string;
          dataset_id: string;
          granted_by: string | null;
          id: string;
          user_id: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string;
          dataset_id: string;
          granted_by?: string | null;
          id?: string;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string;
          dataset_id?: string;
          granted_by?: string | null;
          id?: string;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dataset_access_dataset_id_fkey";
            columns: ["dataset_id"];
            isOneToOne: false;
            referencedRelation: "datasets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dataset_access_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      dataset_rows: {
        Row: {
          attributes: Json;
          created_at: string;
          dataset_version_id: string;
          id: string;
          lineage: Json | null;
          pipeline_row_id: string;
          row_index: number | null;
          updated_at: string;
        };
        Insert: {
          attributes?: Json;
          created_at?: string;
          dataset_version_id: string;
          id?: string;
          lineage?: Json | null;
          pipeline_row_id: string;
          row_index?: number | null;
          updated_at?: string;
        };
        Update: {
          attributes?: Json;
          created_at?: string;
          dataset_version_id?: string;
          id?: string;
          lineage?: Json | null;
          pipeline_row_id?: string;
          row_index?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dataset_rows_dataset_version_id_fkey";
            columns: ["dataset_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      dataset_version_sources: {
        Row: {
          created_at: string;
          dataset_version_id: string;
          id: string;
          relation_type: string;
          source_dataset_version_id: string;
        };
        Insert: {
          created_at?: string;
          dataset_version_id: string;
          id?: string;
          relation_type?: string;
          source_dataset_version_id: string;
        };
        Update: {
          created_at?: string;
          dataset_version_id?: string;
          id?: string;
          relation_type?: string;
          source_dataset_version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dataset_version_sources_dataset_version_id_fkey";
            columns: ["dataset_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dataset_version_sources_source_dataset_version_id_fkey";
            columns: ["source_dataset_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      dataset_version_events: {
        Row: {
          actor_user_id: string | null;
          created_at: string;
          dataset_id: string;
          dataset_version_id: string;
          event_type: string;
          id: string;
          metadata: Json;
          previous_dataset_version_id: string | null;
        };
        Insert: {
          actor_user_id?: string | null;
          created_at?: string;
          dataset_id: string;
          dataset_version_id: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          previous_dataset_version_id?: string | null;
        };
        Update: {
          actor_user_id?: string | null;
          created_at?: string;
          dataset_id?: string;
          dataset_version_id?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          previous_dataset_version_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dataset_version_events_dataset_id_fkey";
            columns: ["dataset_id"];
            isOneToOne: false;
            referencedRelation: "datasets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dataset_version_events_dataset_version_id_fkey";
            columns: ["dataset_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dataset_version_events_previous_dataset_version_id_fkey";
            columns: ["previous_dataset_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      dataset_versions: {
        Row: {
          change_summary: string | null;
          column_definitions: Json;
          created_at: string;
          dataset_id: string;
          id: string;
          metadata: Json;
          notes: string | null;
          published_at: string | null;
          published_by: string | null;
          row_count: number;
          source_ref: string | null;
          version_number: number;
        };
        Insert: {
          change_summary?: string | null;
          column_definitions?: Json;
          created_at?: string;
          dataset_id: string;
          id?: string;
          metadata?: Json;
          notes?: string | null;
          published_at?: string | null;
          published_by?: string | null;
          row_count?: number;
          source_ref?: string | null;
          version_number: number;
        };
        Update: {
          change_summary?: string | null;
          column_definitions?: Json;
          created_at?: string;
          dataset_id?: string;
          id?: string;
          metadata?: Json;
          notes?: string | null;
          published_at?: string | null;
          published_by?: string | null;
          row_count?: number;
          source_ref?: string | null;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "dataset_versions_dataset_id_fkey";
            columns: ["dataset_id"];
            isOneToOne: false;
            referencedRelation: "datasets";
            referencedColumns: ["id"];
          },
        ];
      };
      datasets: {
        Row: {
          active_version_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_default_global: boolean;
          metadata: Json;
          name: string;
          owner_workspace_id: string | null;
          slug: string;
          updated_at: string;
          visibility: Database["public"]["Enums"]["dataset_visibility"];
        };
        Insert: {
          active_version_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_default_global?: boolean;
          metadata?: Json;
          name: string;
          owner_workspace_id?: string | null;
          slug: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["dataset_visibility"];
        };
        Update: {
          active_version_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_default_global?: boolean;
          metadata?: Json;
          name?: string;
          owner_workspace_id?: string | null;
          slug?: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["dataset_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "datasets_active_version_matches_dataset_fkey";
            columns: ["id", "active_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["dataset_id", "id"];
          },
          {
            foreignKeyName: "datasets_owner_workspace_id_fkey";
            columns: ["owner_workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      invites: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          created_by: string | null;
          email: string;
          expires_at: string;
          id: string;
          metadata: Json;
          status: Database["public"]["Enums"]["invite_status"];
          token_hash: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          email: string;
          expires_at: string;
          id?: string;
          metadata?: Json;
          status?: Database["public"]["Enums"]["invite_status"];
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          metadata?: Json;
          status?: Database["public"]["Enums"]["invite_status"];
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          app_role: Database["public"]["Enums"]["app_role"];
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          app_role?: Database["public"]["Enums"]["app_role"];
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          app_role?: Database["public"]["Enums"]["app_role"];
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["workspace_member_role"];
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          role?: Database["public"]["Enums"]["workspace_member_role"];
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["workspace_member_role"];
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_dataset_version: {
        Args: {
          target_actor_user_id: string;
          target_dataset_id: string;
          target_dataset_version_id: string;
        };
        Returns: Json;
      };
      current_app_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      is_admin: { Args: { target_user_id?: string }; Returns: boolean };
      query_dataset_rows: {
        Args: {
          target_dataset_version_id: string;
          target_filters?: Json;
          target_page?: number;
          target_page_size?: number;
          target_sorts?: Json;
        };
        Returns: Json;
      };
      user_can_read_dataset: {
        Args: { target_dataset_id: string; target_user_id?: string };
        Returns: boolean;
      };
      user_can_read_dataset_version: {
        Args: { target_dataset_version_id: string; target_user_id?: string };
        Returns: boolean;
      };
      user_is_workspace_member: {
        Args: { target_user_id?: string; target_workspace_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "user" | "admin";
      dataset_visibility: "global" | "private" | "workspace" | "shared";
      invite_status: "pending" | "accepted" | "revoked" | "expired";
      workspace_member_role: "owner" | "admin" | "member";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin"],
      dataset_visibility: ["global", "private", "workspace", "shared"],
      invite_status: ["pending", "accepted", "revoked", "expired"],
      workspace_member_role: ["owner", "admin", "member"],
    },
  },
} as const;
