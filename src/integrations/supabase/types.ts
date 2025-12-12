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
      behavioral_interview_feedback: {
        Row: {
          areas_for_improvement: string[] | null
          communication_score: number | null
          created_at: string | null
          detailed_feedback: string | null
          id: string
          overall_score: number | null
          problem_solving_score: number | null
          recommendations: string[] | null
          session_id: string | null
          strengths: string[] | null
          teamwork_score: number | null
          technical_competence_score: number | null
        }
        Insert: {
          areas_for_improvement?: string[] | null
          communication_score?: number | null
          created_at?: string | null
          detailed_feedback?: string | null
          id?: string
          overall_score?: number | null
          problem_solving_score?: number | null
          recommendations?: string[] | null
          session_id?: string | null
          strengths?: string[] | null
          teamwork_score?: number | null
          technical_competence_score?: number | null
        }
        Update: {
          areas_for_improvement?: string[] | null
          communication_score?: number | null
          created_at?: string | null
          detailed_feedback?: string | null
          id?: string
          overall_score?: number | null
          problem_solving_score?: number | null
          recommendations?: string[] | null
          session_id?: string | null
          strengths?: string[] | null
          teamwork_score?: number | null
          technical_competence_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_interview_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "behavioral_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      behavioral_interview_sessions: {
        Row: {
          call_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          feedback_generated: boolean | null
          id: string
          resume_text: string
          started_at: string | null
          status: string | null
          user_id: string | null
          voice: string
        }
        Insert: {
          call_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          feedback_generated?: boolean | null
          id?: string
          resume_text: string
          started_at?: string | null
          status?: string | null
          user_id?: string | null
          voice: string
        }
        Update: {
          call_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          feedback_generated?: boolean | null
          id?: string
          resume_text?: string
          started_at?: string | null
          status?: string | null
          user_id?: string | null
          voice?: string
        }
        Relationships: []
      }
      behavioral_interview_transcripts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string | null
          timestamp: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id?: string | null
          timestamp?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_interview_transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "behavioral_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      behavioral_questions: {
        Row: {
          category: string[]
          company_associations: string[] | null
          created_at: string | null
          custom_evaluation_prompt: string | null
          difficulty: string
          evaluation_type: string | null
          follow_up_questions: Json | null
          id: string
          key_traits: string[] | null
          question_text: string
          related_question_ids: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string[]
          company_associations?: string[] | null
          created_at?: string | null
          custom_evaluation_prompt?: string | null
          difficulty: string
          evaluation_type?: string | null
          follow_up_questions?: Json | null
          id?: string
          key_traits?: string[] | null
          question_text: string
          related_question_ids?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string[]
          company_associations?: string[] | null
          created_at?: string | null
          custom_evaluation_prompt?: string | null
          difficulty?: string
          evaluation_type?: string | null
          follow_up_questions?: Json | null
          id?: string
          key_traits?: string[] | null
          question_text?: string
          related_question_ids?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      data_structure_metadata: {
        Row: {
          created_at: string | null
          id: string
          name: string
          real_world_uses: Json | null
          related_problem_ids: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          real_world_uses?: Json | null
          related_problem_ids?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          real_world_uses?: Json | null
          related_problem_ids?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_notes: string | null
          category: string
          content: string
          created_at: string | null
          id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          content: string
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flashcard_decks: {
        Row: {
          ai_code_skeleton: string | null
          ai_hints: Json | null
          ai_key_insights: Json | null
          ai_summary: string | null
          created_at: string | null
          ease_factor: number | null
          id: string
          interval_days: number | null
          last_reviewed_at: string | null
          mastery_level: number | null
          next_review_date: string
          notes_highlight: string | null
          problem_id: string
          review_count: number | null
          solution_code: string | null
          solution_id: string | null
          solution_title: string | null
          user_id: string
        }
        Insert: {
          ai_code_skeleton?: string | null
          ai_hints?: Json | null
          ai_key_insights?: Json | null
          ai_summary?: string | null
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          mastery_level?: number | null
          next_review_date?: string
          notes_highlight?: string | null
          problem_id: string
          review_count?: number | null
          solution_code?: string | null
          solution_id?: string | null
          solution_title?: string | null
          user_id: string
        }
        Update: {
          ai_code_skeleton?: string | null
          ai_hints?: Json | null
          ai_key_insights?: Json | null
          ai_summary?: string | null
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          mastery_level?: number | null
          next_review_date?: string
          notes_highlight?: string | null
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
      mock_interview_answers: {
        Row: {
          answer_text: string
          content_score: number | null
          created_at: string | null
          delivery_score: number | null
          feedback: Json | null
          id: string
          mock_interview_id: string
          overall_score: number | null
          question_category: string[] | null
          question_difficulty: string | null
          question_text: string
          star_score: Json | null
          updated_at: string | null
        }
        Insert: {
          answer_text: string
          content_score?: number | null
          created_at?: string | null
          delivery_score?: number | null
          feedback?: Json | null
          id?: string
          mock_interview_id: string
          overall_score?: number | null
          question_category?: string[] | null
          question_difficulty?: string | null
          question_text: string
          star_score?: Json | null
          updated_at?: string | null
        }
        Update: {
          answer_text?: string
          content_score?: number | null
          created_at?: string | null
          delivery_score?: number | null
          feedback?: Json | null
          id?: string
          mock_interview_id?: string
          overall_score?: number | null
          question_category?: string[] | null
          question_difficulty?: string | null
          question_text?: string
          star_score?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_interview_answers_mock_interview_id_fkey"
            columns: ["mock_interview_id"]
            isOneToOne: false
            referencedRelation: "mock_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_interviews: {
        Row: {
          company: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          resume_text: string
          role: string
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          resume_text: string
          role: string
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          resume_text?: string
          role?: string
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      practice_answers: {
        Row: {
          answer_audio_url: string | null
          answer_text: string
          content_score: number | null
          created_at: string | null
          delivery_score: number | null
          feedback: Json | null
          id: string
          overall_score: number | null
          question_id: string | null
          revision_count: number | null
          session_id: string
          star_score: Json | null
          story_id: string | null
          time_spent_seconds: number | null
          transcript: string | null
          updated_at: string | null
        }
        Insert: {
          answer_audio_url?: string | null
          answer_text: string
          content_score?: number | null
          created_at?: string | null
          delivery_score?: number | null
          feedback?: Json | null
          id?: string
          overall_score?: number | null
          question_id?: string | null
          revision_count?: number | null
          session_id: string
          star_score?: Json | null
          story_id?: string | null
          time_spent_seconds?: number | null
          transcript?: string | null
          updated_at?: string | null
        }
        Update: {
          answer_audio_url?: string | null
          answer_text?: string
          content_score?: number | null
          created_at?: string | null
          delivery_score?: number | null
          feedback?: Json | null
          id?: string
          overall_score?: number | null
          question_id?: string | null
          revision_count?: number | null
          session_id?: string
          star_score?: Json | null
          story_id?: string | null
          time_spent_seconds?: number | null
          transcript?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "behavioral_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_answers_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "user_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          average_score: number | null
          company_id: string | null
          completed_at: string | null
          id: string
          session_type: string
          started_at: string | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          average_score?: number | null
          company_id?: string | null
          completed_at?: string | null
          id?: string
          session_type: string
          started_at?: string | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          average_score?: number | null
          company_id?: string | null
          completed_at?: string | null
          id?: string
          session_type?: string
          started_at?: string | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: []
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
      system_design_boards: {
        Row: {
          board_state: Json
          id: string
          session_id: string
          updated_at: string | null
        }
        Insert: {
          board_state?: Json
          id?: string
          session_id: string
          updated_at?: string | null
        }
        Update: {
          board_state?: Json
          id?: string
          session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_design_boards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "system_design_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      system_design_responses: {
        Row: {
          content: string
          created_at: string | null
          id: string
          message_role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          message_role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          message_role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_design_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "system_design_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      system_design_sessions: {
        Row: {
          completed_at: string | null
          context_thread_id: string | null
          draft_board_state: Json | null
          evaluation_feedback: string | null
          id: string
          is_completed: boolean | null
          problem_id: string
          score: number | null
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          context_thread_id?: string | null
          draft_board_state?: Json | null
          evaluation_feedback?: string | null
          id?: string
          is_completed?: boolean | null
          problem_id: string
          score?: number | null
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          context_thread_id?: string | null
          draft_board_state?: Json | null
          evaluation_feedback?: string | null
          id?: string
          is_completed?: boolean | null
          problem_id?: string
          score?: number | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_design_sessions_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      system_design_specs: {
        Row: {
          assumptions: Json
          coach_questions: Json
          constraints: Json
          created_at: string
          estimated_time_minutes: number | null
          expected_topics: Json
          functional_requirements: Json
          hints: Json
          nonfunctional_requirements: Json
          problem_id: string
          rubric: Json
          scale_estimates: Json
          starter_canvas: Json
          summary: string
          updated_at: string
        }
        Insert: {
          assumptions?: Json
          coach_questions?: Json
          constraints?: Json
          created_at?: string
          estimated_time_minutes?: number | null
          expected_topics?: Json
          functional_requirements?: Json
          hints?: Json
          nonfunctional_requirements?: Json
          problem_id: string
          rubric?: Json
          scale_estimates?: Json
          starter_canvas?: Json
          summary?: string
          updated_at?: string
        }
        Update: {
          assumptions?: Json
          coach_questions?: Json
          constraints?: Json
          created_at?: string
          estimated_time_minutes?: number | null
          expected_topics?: Json
          functional_requirements?: Json
          hints?: Json
          nonfunctional_requirements?: Json
          problem_id?: string
          rubric?: Json
          scale_estimates?: Json
          starter_canvas?: Json
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_design_specs_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: true
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_interview_code_snapshots: {
        Row: {
          code: string
          created_at: string | null
          id: string
          session_id: string | null
          timestamp: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          session_id?: string | null
          timestamp?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          session_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_interview_code_snapshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "technical_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_interview_feedback: {
        Row: {
          areas_for_improvement: string[] | null
          code_quality_score: number | null
          communication_score: number | null
          created_at: string | null
          detailed_feedback: string | null
          id: string
          interviewer_notes: string | null
          problem_solving_score: number | null
          session_id: string | null
          strengths: string[] | null
        }
        Insert: {
          areas_for_improvement?: string[] | null
          code_quality_score?: number | null
          communication_score?: number | null
          created_at?: string | null
          detailed_feedback?: string | null
          id?: string
          interviewer_notes?: string | null
          problem_solving_score?: number | null
          session_id?: string | null
          strengths?: string[] | null
        }
        Update: {
          areas_for_improvement?: string[] | null
          code_quality_score?: number | null
          communication_score?: number | null
          created_at?: string | null
          detailed_feedback?: string | null
          id?: string
          interviewer_notes?: string | null
          problem_solving_score?: number | null
          session_id?: string | null
          strengths?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_interview_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "technical_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_interview_sessions: {
        Row: {
          call_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          feedback_generated: boolean | null
          id: string
          overall_score: number | null
          passed: boolean | null
          problem_id: string
          started_at: string | null
          status: string | null
          user_id: string | null
          voice: string
        }
        Insert: {
          call_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          feedback_generated?: boolean | null
          id?: string
          overall_score?: number | null
          passed?: boolean | null
          problem_id: string
          started_at?: string | null
          status?: string | null
          user_id?: string | null
          voice: string
        }
        Update: {
          call_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          feedback_generated?: boolean | null
          id?: string
          overall_score?: number | null
          passed?: boolean | null
          problem_id?: string
          started_at?: string | null
          status?: string | null
          user_id?: string | null
          voice?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_interview_sessions_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_interview_test_results: {
        Row: {
          actual: string | null
          created_at: string | null
          error: string | null
          expected: string | null
          id: string
          input: string | null
          passed: boolean | null
          session_id: string | null
          test_case_number: number | null
          timestamp: string | null
        }
        Insert: {
          actual?: string | null
          created_at?: string | null
          error?: string | null
          expected?: string | null
          id?: string
          input?: string | null
          passed?: boolean | null
          session_id?: string | null
          test_case_number?: number | null
          timestamp?: string | null
        }
        Update: {
          actual?: string | null
          created_at?: string | null
          error?: string | null
          expected?: string | null
          id?: string
          input?: string | null
          passed?: boolean | null
          session_id?: string | null
          test_case_number?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_interview_test_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "technical_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_interview_transcripts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string | null
          timestamp: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id?: string | null
          timestamp?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_interview_transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "technical_interview_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      trigger_debug_log: {
        Row: {
          created_at: string | null
          id: string
          is_first_solve: boolean | null
          last_activity_date: string | null
          new_activity_date: string | null
          new_max_streak: number | null
          new_streak: number | null
          old_max_streak: number | null
          old_streak: number | null
          problem_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_first_solve?: boolean | null
          last_activity_date?: string | null
          new_activity_date?: string | null
          new_max_streak?: number | null
          new_streak?: number | null
          old_max_streak?: number | null
          old_streak?: number | null
          problem_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_first_solve?: boolean | null
          last_activity_date?: string | null
          new_activity_date?: string | null
          new_max_streak?: number | null
          new_streak?: number | null
          old_max_streak?: number | null
          old_streak?: number | null
          problem_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_ai_restrictions: {
        Row: {
          ai_chat_enabled: boolean | null
          ai_coach_enabled: boolean | null
          cooldown_reason: string | null
          cooldown_until: string | null
          created_at: string | null
          daily_limit_tokens: number | null
          id: string
          monthly_limit_tokens: number | null
          restricted_by: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_chat_enabled?: boolean | null
          ai_coach_enabled?: boolean | null
          cooldown_reason?: string | null
          cooldown_until?: string | null
          created_at?: string | null
          daily_limit_tokens?: number | null
          id?: string
          monthly_limit_tokens?: number | null
          restricted_by?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_chat_enabled?: boolean | null
          ai_coach_enabled?: boolean | null
          cooldown_reason?: string | null
          cooldown_until?: string | null
          created_at?: string | null
          daily_limit_tokens?: number | null
          id?: string
          monthly_limit_tokens?: number | null
          restricted_by?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_ai_usage: {
        Row: {
          created_at: string | null
          estimated_cost: number | null
          feature: string | null
          id: string
          model: string | null
          session_id: string | null
          tokens_input: number | null
          tokens_output: number | null
          tokens_total: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          estimated_cost?: number | null
          feature?: string | null
          id?: string
          model?: string | null
          session_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          estimated_cost?: number | null
          feature?: string | null
          id?: string
          model?: string | null
          session_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_usage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_behavioral_stats: {
        Row: {
          average_overall_score: number | null
          category_scores: Json | null
          last_practiced_at: string | null
          practice_streak: number | null
          total_questions_practiced: number | null
          total_stories_created: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_overall_score?: number | null
          category_scores?: Json | null
          last_practiced_at?: string | null
          practice_streak?: number | null
          total_questions_practiced?: number | null
          total_stories_created?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_overall_score?: number | null
          category_scores?: Json | null
          last_practiced_at?: string | null
          practice_streak?: number | null
          total_questions_practiced?: number | null
          total_stories_created?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_problem_attempts: {
        Row: {
          code: string | null
          complexity_analysis: Json | null
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
          complexity_analysis?: Json | null
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
          complexity_analysis?: Json | null
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
      user_stories: {
        Row: {
          action: string | null
          created_at: string | null
          description: string | null
          id: string
          last_used_at: string | null
          metrics: string | null
          practice_count: number | null
          related_problem_ids: string[] | null
          result: string | null
          situation: string | null
          tags: string[] | null
          task: string | null
          technical_skills: string[] | null
          technologies: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          versatility_score: number | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_used_at?: string | null
          metrics?: string | null
          practice_count?: number | null
          related_problem_ids?: string[] | null
          result?: string | null
          situation?: string | null
          tags?: string[] | null
          task?: string | null
          technical_skills?: string[] | null
          technologies?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          versatility_score?: number | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_used_at?: string | null
          metrics?: string | null
          practice_count?: number | null
          related_problem_ids?: string[] | null
          result?: string | null
          situation?: string | null
          tags?: string[] | null
          task?: string | null
          technical_skills?: string[] | null
          technologies?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          versatility_score?: number | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_problems_solved: {
        Row: {
          easy_solved: number | null
          hard_solved: number | null
          medium_solved: number | null
          total_attempts: number | null
          total_solved: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      backfill_json_test_cases: { Args: never; Returns: undefined }
      calculate_user_streak: {
        Args: { p_user_id: string }
        Returns: {
          current_streak: number
          max_streak: number
        }[]
      }
      can_user_use_ai: {
        Args: { p_feature: string; p_user_id: string }
        Returns: {
          allowed: boolean
          reason: string
        }[]
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
      get_data_structure_related_problems: {
        Args: { ds_slug: string }
        Returns: {
          difficulty: string
          problem_id: string
          problem_title: string
        }[]
      }
      get_user_daily_usage: {
        Args: { p_user_id: string }
        Returns: {
          cost_today: number
          tokens_today: number
        }[]
      }
      get_user_monthly_usage: {
        Args: { p_user_id: string }
        Returns: {
          cost_month: number
          tokens_month: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
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
      recalculate_user_statistics: { Args: never; Returns: undefined }
      recover_all_streaks: { Args: never; Returns: undefined }
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
