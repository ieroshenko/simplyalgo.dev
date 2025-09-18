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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_chat_messages: {
        Row: {
          code_snippets: Json | null
          content: string
          created_at: string
          diagram: Json | null
          id: string
          is_context_init: boolean | null
          response_id: string | null
          role: string
          session_id: string
          suggest_diagram: boolean | null
        }
        Insert: {
          code_snippets?: Json | null
          content: string
          created_at?: string
          diagram?: Json | null
          id?: string
          is_context_init?: boolean | null
          response_id?: string | null
          role: string
          session_id: string
          suggest_diagram?: boolean | null
        }
        Update: {
          code_snippets?: Json | null
          content?: string
          created_at?: string
          diagram?: Json | null
          id?: string
          is_context_init?: boolean | null
          response_id?: string | null
          role?: string
          session_id?: string
          suggest_diagram?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          context_created_at: string | null
          context_initialized: boolean | null
          created_at: string
          id: string
          last_code_state: string | null
          problem_id: string | null
          response_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_created_at?: string | null
          context_initialized?: boolean | null
          created_at?: string
          id?: string
          last_code_state?: string | null
          problem_id?: string | null
          response_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_created_at?: string | null
          context_initialized?: boolean | null
          created_at?: string
          id?: string
          last_code_state?: string | null
          problem_id?: string | null
          response_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_sessions_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      coaching_responses: {
        Row: {
          created_at: string | null
          id: string
          is_correct: boolean
          question: string
          session_id: string | null
          step_number: number
          student_response: string
          submitted_code: string
          validation_result: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_correct: boolean
          question: string
          session_id?: string | null
          step_number: number
          student_response: string
          submitted_code: string
          validation_result: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          is_correct?: boolean
          question?: string
          session_id?: string | null
          step_number?: number
          student_response?: string
          submitted_code?: string
          validation_result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "coaching_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_session_steps: {
        Row: {
          attempts_count: number | null
          completed_at: string | null
          expected_keywords: string[] | null
          feedback: string | null
          highlight_area: Json | null
          hint: string | null
          id: string
          is_completed: boolean | null
          question: string
          session_id: string
          started_at: string | null
          step_number: number
          user_response: string | null
        }
        Insert: {
          attempts_count?: number | null
          completed_at?: string | null
          expected_keywords?: string[] | null
          feedback?: string | null
          highlight_area?: Json | null
          hint?: string | null
          id?: string
          is_completed?: boolean | null
          question: string
          session_id: string
          started_at?: string | null
          step_number: number
          user_response?: string | null
        }
        Update: {
          attempts_count?: number | null
          completed_at?: string | null
          expected_keywords?: string[] | null
          feedback?: string | null
          highlight_area?: Json | null
          hint?: string | null
          id?: string
          is_completed?: boolean | null
          question?: string
          session_id?: string
          started_at?: string | null
          step_number?: number
          user_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_session_steps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          awaiting_submission: boolean | null
          completed_at: string | null
          context_created_at: string | null
          context_initialized: boolean | null
          current_question: string | null
          current_step: number | null
          current_step_number: number | null
          difficulty: string
          id: string
          initial_code: string | null
          is_active: boolean | null
          is_completed: boolean | null
          last_code_snapshot: string | null
          problem_id: string
          progress_percent: number | null
          response_id: string | null
          session_state: string | null
          started_at: string | null
          steps: Json
          total_steps: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          awaiting_submission?: boolean | null
          completed_at?: string | null
          context_created_at?: string | null
          context_initialized?: boolean | null
          current_question?: string | null
          current_step?: number | null
          current_step_number?: number | null
          difficulty: string
          id?: string
          initial_code?: string | null
          is_active?: boolean | null
          is_completed?: boolean | null
          last_code_snapshot?: string | null
          problem_id: string
          progress_percent?: number | null
          response_id?: string | null
          session_state?: string | null
          started_at?: string | null
          steps?: Json
          total_steps: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          awaiting_submission?: boolean | null
          completed_at?: string | null
          context_created_at?: string | null
          context_initialized?: boolean | null
          current_question?: string | null
          current_step?: number | null
          current_step_number?: number | null
          difficulty?: string
          id?: string
          initial_code?: string | null
          is_active?: boolean | null
          is_completed?: boolean | null
          last_code_snapshot?: string | null
          problem_id?: string
          progress_percent?: number | null
          response_id?: string | null
          session_state?: string | null
          started_at?: string | null
          steps?: Json
          total_steps?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flashcard_decks: {
        Row: {
          created_at: string | null
          ease_factor: number | null
          id: string
          interval_days: number | null
          last_reviewed_at: string | null
          mastery_level: number | null
          next_review_date: string
          problem_id: string
          review_count: number | null
          solution_code: string | null
          solution_id: string | null
          solution_title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          mastery_level?: number | null
          next_review_date?: string
          problem_id: string
          review_count?: number | null
          solution_code?: string | null
          solution_id?: string | null
          solution_title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          mastery_level?: number | null
          next_review_date?: string
          problem_id?: string
          review_count?: number | null
          solution_code?: string | null
          solution_id?: string | null
          solution_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_decks_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "problem_solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_reviews: {
        Row: {
          ai_evaluation: Json | null
          ai_questions: Json
          deck_id: string
          id: string
          notes: string | null
          reviewed_at: string | null
          time_spent_seconds: number | null
          user_answers: Json
          user_difficulty_rating: number
        }
        Insert: {
          ai_evaluation?: Json | null
          ai_questions?: Json
          deck_id: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          time_spent_seconds?: number | null
          user_answers?: Json
          user_difficulty_rating: number
        }
        Update: {
          ai_evaluation?: Json | null
          ai_questions?: Json
          deck_id?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          time_spent_seconds?: number | null
          user_answers?: Json
          user_difficulty_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          problem_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          problem_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          problem_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_solutions: {
        Row: {
          approach_type: string | null
          code: string
          created_at: string | null
          difficulty_rating: number | null
          explanation: string | null
          id: string
          is_preferred: boolean | null
          language: string | null
          problem_id: string
          space_complexity: string | null
          time_complexity: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approach_type?: string | null
          code: string
          created_at?: string | null
          difficulty_rating?: number | null
          explanation?: string | null
          id?: string
          is_preferred?: boolean | null
          language?: string | null
          problem_id: string
          space_complexity?: string | null
          time_complexity?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approach_type?: string | null
          code?: string
          created_at?: string | null
          difficulty_rating?: number | null
          explanation?: string | null
          id?: string
          is_preferred?: boolean | null
          language?: string | null
          problem_id?: string
          space_complexity?: string | null
          time_complexity?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problem_solutions_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      problems: {
        Row: {
          acceptance_rate: number | null
          category_id: string
          companies: Json
          constraints: Json
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          dislikes: number | null
          examples: Json
          function_signature: string
          hints: Json
          id: string
          likes: number | null
          recommended_space_complexity: string | null
          recommended_time_complexity: string | null
          title: string
          updated_at: string
        }
        Insert: {
          acceptance_rate?: number | null
          category_id: string
          companies?: Json
          constraints?: Json
          created_at?: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          dislikes?: number | null
          examples?: Json
          function_signature: string
          hints?: Json
          id: string
          likes?: number | null
          recommended_space_complexity?: string | null
          recommended_time_complexity?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          acceptance_rate?: number | null
          category_id?: string
          companies?: Json
          constraints?: Json
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          dislikes?: number | null
          examples?: Json
          function_signature?: string
          hints?: Json
          id?: string
          likes?: number | null
          recommended_space_complexity?: string | null
          recommended_time_complexity?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "problems_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          completed_at: string | null
          completed_steps: number[]
          created_at: string | null
          id: string
          survey_data: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: number[]
          created_at?: string | null
          id?: string
          survey_data?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: number[]
          created_at?: string | null
          id?: string
          survey_data?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      test_cases: {
        Row: {
          created_at: string
          expected_json: Json | null
          expected_output: string
          explanation: string | null
          id: string
          input: string
          input_json: Json | null
          is_example: boolean | null
          problem_id: string
        }
        Insert: {
          created_at?: string
          expected_json?: Json | null
          expected_output: string
          explanation?: string | null
          id?: string
          input: string
          input_json?: Json | null
          is_example?: boolean | null
          problem_id: string
        }
        Update: {
          created_at?: string
          expected_json?: Json | null
          expected_output?: string
          explanation?: string | null
          id?: string
          input?: string
          input_json?: Json | null
          is_example?: boolean | null
          problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_cases_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      user_problem_attempts: {
        Row: {
          code: string | null
          created_at: string
          execution_time: number | null
          id: string
          language: string | null
          memory_usage: number | null
          problem_id: string
          status: Database["public"]["Enums"]["attempt_status"] | null
          test_results: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          execution_time?: number | null
          id?: string
          language?: string | null
          memory_usage?: number | null
          problem_id: string
          status?: Database["public"]["Enums"]["attempt_status"] | null
          test_results?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          execution_time?: number | null
          id?: string
          language?: string | null
          memory_usage?: number | null
          problem_id?: string
          status?: Database["public"]["Enums"]["attempt_status"] | null
          test_results?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_problem_attempts_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_starred_problems: {
        Row: {
          created_at: string
          id: string
          problem_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          problem_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          problem_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_starred_problems_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      user_statistics: {
        Row: {
          ai_sessions: number | null
          created_at: string
          current_streak: number | null
          easy_solved: number | null
          hard_solved: number | null
          id: string
          last_activity_date: string | null
          max_streak: number | null
          medium_solved: number | null
          total_solved: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_sessions?: number | null
          created_at?: string
          current_streak?: number | null
          easy_solved?: number | null
          hard_solved?: number | null
          id?: string
          last_activity_date?: string | null
          max_streak?: number | null
          medium_solved?: number | null
          total_solved?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_sessions?: number | null
          created_at?: string
          current_streak?: number | null
          easy_solved?: number | null
          hard_solved?: number | null
          id?: string
          last_activity_date?: string | null
          max_streak?: number | null
          medium_solved?: number | null
          total_solved?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backfill_json_test_cases: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_cards_due_for_review: {
        Args: { p_user_id: string }
        Returns: {
          days_overdue: number
          deck_id: string
          is_custom_solution: boolean
          mastery_level: number
          next_review_date: string
          problem_id: string
          problem_title: string
          review_count: number
          solution_code: string
          solution_title: string
        }[]
      }
      migrate_test_case_to_json: {
        Args: {
          expected_text: string
          input_text: string
          problem_signature: string
        }
        Returns: {
          expected_json: Json
          input_json: Json
        }[]
      }
      update_flashcard_schedule: {
        Args: { p_deck_id: string; p_difficulty_rating: number }
        Returns: undefined
      }
    }
    Enums: {
      attempt_status: "pending" | "passed" | "failed" | "error"
      difficulty_level: "Easy" | "Medium" | "Hard"
      problem_status: "solved" | "attempted" | "not-started"
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
      attempt_status: ["pending", "passed", "failed", "error"],
      difficulty_level: ["Easy", "Medium", "Hard"],
      problem_status: ["solved", "attempted", "not-started"],
    },
  },
} as const
