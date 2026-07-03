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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          nickname: string
          role: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          nickname: string
          role: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          nickname?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoint_progress: {
        Row: {
          checked_at: string
          checkpoint_id: string
          id: string
          user_id: string
        }
        Insert: {
          checked_at?: string
          checkpoint_id: string
          id?: string
          user_id: string
        }
        Update: {
          checked_at?: string
          checkpoint_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkpoint_progress_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkpoint_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoints: {
        Row: {
          created_at: string
          hint: string | null
          id: string
          label: string
          seq: number
          stage_no: number
        }
        Insert: {
          created_at?: string
          hint?: string | null
          id?: string
          label: string
          seq: number
          stage_no: number
        }
        Update: {
          created_at?: string
          hint?: string | null
          id?: string
          label?: string
          seq?: number
          stage_no?: number
        }
        Relationships: []
      }
      help_signals: {
        Row: {
          id: string
          level: string
          note: string | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          level?: string
          note?: string | null
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          level?: string
          note?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      morning_memos: {
        Row: {
          created_at: string
          id: string
          session_id: string
          stage_no: number
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          stage_no: number
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          stage_no?: number
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "morning_memos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "morning_memos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      s2_test_cases: {
        Row: {
          created_at: string
          expected_then: string
          given_when: string
          id: string
          session_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expected_then: string
          given_when: string
          id?: string
          session_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          expected_then?: string
          given_when?: string
          id?: string
          session_id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      s3_grill_questions: {
        Row: {
          created_at: string
          draft_snapshot: string
          id: string
          questions: Json
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_snapshot: string
          id?: string
          questions: Json
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_snapshot?: string
          id?: string
          questions?: Json
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      s3_prd_drafts: {
        Row: {
          created_at: string
          features: string
          id: string
          nonfunctional: string
          out_of_scope: string
          problem: string
          session_id: string
          submitted_v1_at: string | null
          submitted_v2_at: string | null
          success_metric: string
          updated_at: string
          user_id: string
          users: string
        }
        Insert: {
          created_at?: string
          features?: string
          id?: string
          nonfunctional?: string
          out_of_scope?: string
          problem?: string
          session_id: string
          submitted_v1_at?: string | null
          submitted_v2_at?: string | null
          success_metric?: string
          updated_at?: string
          user_id: string
          users?: string
        }
        Update: {
          created_at?: string
          features?: string
          id?: string
          nonfunctional?: string
          out_of_scope?: string
          problem?: string
          session_id?: string
          submitted_v1_at?: string | null
          submitted_v2_at?: string | null
          success_metric?: string
          updated_at?: string
          user_id?: string
          users?: string
        }
        Relationships: []
      }
      s3_reviews: {
        Row: {
          good: string
          id: string
          question: string
          reviewee_id: string
          reviewer_id: string
          session_id: string
          submitted_at: string
          suggestion: string
          updated_at: string
        }
        Insert: {
          good: string
          id?: string
          question?: string
          reviewee_id: string
          reviewer_id: string
          session_id: string
          submitted_at?: string
          suggestion?: string
          updated_at?: string
        }
        Update: {
          good?: string
          id?: string
          question?: string
          reviewee_id?: string
          reviewer_id?: string
          session_id?: string
          submitted_at?: string
          suggestion?: string
          updated_at?: string
        }
        Relationships: []
      }
      s4_prompts: {
        Row: {
          confirmed_at: string | null
          context: string
          created_at: string
          id: string
          nonfunctional: string
          role: string
          session_id: string
          task: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          context?: string
          created_at?: string
          id?: string
          nonfunctional?: string
          role?: string
          session_id: string
          task?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          context?: string
          created_at?: string
          id?: string
          nonfunctional?: string
          role?: string
          session_id?: string
          task?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      s4_test_cases: {
        Row: {
          created_at: string
          given: string
          id: string
          order_index: number
          session_id: string
          then_step: string
          title: string
          updated_at: string
          user_id: string
          when_step: string
        }
        Insert: {
          created_at?: string
          given?: string
          id?: string
          order_index?: number
          session_id: string
          then_step?: string
          title?: string
          updated_at?: string
          user_id: string
          when_step?: string
        }
        Update: {
          created_at?: string
          given?: string
          id?: string
          order_index?: number
          session_id?: string
          then_step?: string
          title?: string
          updated_at?: string
          user_id?: string
          when_step?: string
        }
        Relationships: []
      }
      s5_checklist_results: {
        Row: {
          note: string
          session_id: string
          status: string
          test_case_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          note?: string
          session_id: string
          status: string
          test_case_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          note?: string
          session_id?: string
          status?: string
          test_case_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "s5_checklist_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s5_checklist_results_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "s4_test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s5_checklist_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      s5_qa_reviews: {
        Row: {
          good: string
          id: string
          issue: string
          reviewee_id: string
          reviewer_id: string
          session_id: string
          submitted_at: string
          suggestion: string
          updated_at: string
        }
        Insert: {
          good: string
          id?: string
          issue?: string
          reviewee_id: string
          reviewer_id: string
          session_id: string
          submitted_at?: string
          suggestion?: string
          updated_at?: string
        }
        Update: {
          good?: string
          id?: string
          issue?: string
          reviewee_id?: string
          reviewer_id?: string
          session_id?: string
          submitted_at?: string
          suggestion?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "s5_qa_reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s5_qa_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s5_qa_reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      s5_revised_prompts: {
        Row: {
          add_list: string
          confirmed_at: string | null
          constraints: string
          created_at: string
          evidence: string
          keep_list: string
          session_id: string
          target: string
          updated_at: string
          user_id: string
        }
        Insert: {
          add_list?: string
          confirmed_at?: string | null
          constraints?: string
          created_at?: string
          evidence?: string
          keep_list?: string
          session_id: string
          target?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          add_list?: string
          confirmed_at?: string | null
          constraints?: string
          created_at?: string
          evidence?: string
          keep_list?: string
          session_id?: string
          target?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "s5_revised_prompts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s5_revised_prompts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          current_slide_index: number | null
          current_stage: number
          id: string
          instructor_code: string
          name: string
          participant_code: string
        }
        Insert: {
          created_at?: string
          current_slide_index?: number | null
          current_stage?: number
          id?: string
          instructor_code: string
          name: string
          participant_code: string
        }
        Update: {
          created_at?: string
          current_slide_index?: number | null
          current_stage?: number
          id?: string
          instructor_code?: string
          name?: string
          participant_code?: string
        }
        Relationships: []
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
