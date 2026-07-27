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
          avatar: Json | null
          created_at: string
          deployed_url: string | null
          id: string
          is_seated: boolean
          last_seen_at: string
          nickname: string
          role: string
          seat_id: string | null
          session_id: string
        }
        Insert: {
          avatar?: Json | null
          created_at?: string
          deployed_url?: string | null
          id?: string
          is_seated?: boolean
          last_seen_at?: string
          nickname: string
          role: string
          seat_id?: string | null
          session_id: string
        }
        Update: {
          avatar?: Json | null
          created_at?: string
          deployed_url?: string | null
          id?: string
          is_seated?: boolean
          last_seen_at?: string
          nickname?: string
          role?: string
          seat_id?: string | null
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
      help_mission_comments: {
        Row: {
          author_id: string
          author_role: string
          body: string
          created_at: string
          id: string
          mission_id: string
        }
        Insert: {
          author_id: string
          author_role: string
          body: string
          created_at?: string
          id?: string
          mission_id: string
        }
        Update: {
          author_id?: string
          author_role?: string
          body?: string
          created_at?: string
          id?: string
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_mission_comments_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "help_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      help_mission_helpers: {
        Row: {
          helper_id: string
          joined_at: string
          mission_id: string
          state: string
          submission_attachments: Json
          submission_text: string
          submitted_at: string | null
        }
        Insert: {
          helper_id: string
          joined_at?: string
          mission_id: string
          state?: string
          submission_attachments?: Json
          submission_text?: string
          submitted_at?: string | null
        }
        Update: {
          helper_id?: string
          joined_at?: string
          mission_id?: string
          state?: string
          submission_attachments?: Json
          submission_text?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_mission_helpers_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "help_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      help_missions: {
        Row: {
          attachments: Json
          created_at: string
          id: string
          raw_description: string
          repro_steps: string
          requester_id: string
          requester_role: string
          resolved_at: string | null
          resolved_helper_id: string | null
          session_id: string
          status: string
          summary: string
          tags: Json
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          id?: string
          raw_description?: string
          repro_steps?: string
          requester_id: string
          requester_role: string
          resolved_at?: string | null
          resolved_helper_id?: string | null
          session_id: string
          status?: string
          summary?: string
          tags?: Json
          title?: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          id?: string
          raw_description?: string
          repro_steps?: string
          requester_id?: string
          requester_role?: string
          resolved_at?: string | null
          resolved_helper_id?: string | null
          session_id?: string
          status?: string
          summary?: string
          tags?: Json
          title?: string
          updated_at?: string
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
      message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          kind: string
          recipient_id: string | null
          sender_id: string
          sender_role: string
          session_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          kind: string
          recipient_id?: string | null
          sender_id: string
          sender_role: string
          session_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          kind?: string
          recipient_id?: string | null
          sender_id?: string
          sender_role?: string
          session_id?: string
        }
        Relationships: []
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
          source: string
          status: string
          test_case_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          note?: string
          session_id: string
          source?: string
          status: string
          test_case_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          note?: string
          session_id?: string
          source?: string
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
      s6_comments: {
        Row: {
          commenter_id: string
          created_at: string
          good: string
          id: string
          presenter_id: string
          question: string | null
          session_id: string
        }
        Insert: {
          commenter_id: string
          created_at?: string
          good: string
          id?: string
          presenter_id: string
          question?: string | null
          session_id: string
        }
        Update: {
          commenter_id?: string
          created_at?: string
          good?: string
          id?: string
          presenter_id?: string
          question?: string | null
          session_id?: string
        }
        Relationships: []
      }
      s6_presentation_queue: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          order_index: number
          session_id: string
          started_at: string | null
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          order_index: number
          session_id: string
          started_at?: string | null
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          order_index?: number
          session_id?: string
          started_at?: string | null
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      s6_slide_decks: {
        Row: {
          confirmed_at: string | null
          created_at: string
          draft_generated_at: string | null
          id: string
          session_id: string
          slides: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          draft_generated_at?: string | null
          id?: string
          session_id: string
          slides?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          draft_generated_at?: string | null
          id?: string
          session_id?: string
          slides?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      s7_retrospectives: {
        Row: {
          id: string
          learned: string
          next_try: string | null
          session_id: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          learned: string
          next_try?: string | null
          session_id: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          learned?: string
          next_try?: string | null
          session_id?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "s7_retrospectives_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s7_retrospectives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          closed_at: string | null
          created_at: string
          current_slide_index: number | null
          current_stage: number
          id: string
          instructor_code: string
          name: string
          participant_code: string
          s6_timer_started_at: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          current_slide_index?: number | null
          current_stage?: number
          id?: string
          instructor_code: string
          name: string
          participant_code: string
          s6_timer_started_at?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          current_slide_index?: number | null
          current_stage?: number
          id?: string
          instructor_code?: string
          name?: string
          participant_code?: string
          s6_timer_started_at?: string | null
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
