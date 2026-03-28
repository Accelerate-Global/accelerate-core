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
      dataset_versions: {
        Row: {
          column_definitions: Json;
          created_at: string;
          dataset_id: string;
          id: string;
          metadata: Json;
          row_count: number;
          source_ref: string | null;
          version_number: number;
        };
        Insert: {
          column_definitions?: Json;
          created_at?: string;
          dataset_id: string;
          id?: string;
          metadata?: Json;
          row_count?: number;
          source_ref?: string | null;
          version_number: number;
        };
        Update: {
          column_definitions?: Json;
          created_at?: string;
          dataset_id?: string;
          id?: string;
          metadata?: Json;
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
    Views: Record<string, never>;
    Functions: {
      current_app_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      is_admin: {
        Args: {
          target_user_id?: string;
        };
        Returns: boolean;
      };
      user_can_read_dataset: {
        Args: {
          target_dataset_id: string;
          target_user_id?: string;
        };
        Returns: boolean;
      };
      user_can_read_dataset_version: {
        Args: {
          target_dataset_version_id: string;
          target_user_id?: string;
        };
        Returns: boolean;
      };
      user_is_workspace_member: {
        Args: {
          target_user_id?: string;
          target_workspace_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      dataset_visibility: "global" | "private" | "shared" | "workspace";
      invite_status: "accepted" | "expired" | "pending" | "revoked";
      workspace_member_role: "admin" | "member" | "owner";
    };
    CompositeTypes: Record<string, never>;
  };
}

type PublicSchema = Database["public"];

export type Tables<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Row"];

export type TablesInsert<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Insert"];

export type TablesUpdate<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Update"];

export type Enums<EnumName extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][EnumName];
