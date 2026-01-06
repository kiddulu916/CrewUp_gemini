// * Auto-generated Supabase database types
// * Generated using mcp_supabase_generate_typescript_types
// * Last updated: January 6, 2026

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_log_admin_id_fkey"
            columns: ["admin_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      application_drafts: {
        Row: {
          applicant_id: string
          cover_letter_url: string | null
          expires_at: string
          form_data: Json
          id: string
          job_id: string
          last_saved_at: string
          resume_extracted_text: string | null
          resume_url: string | null
        }
        Insert: {
          applicant_id: string
          cover_letter_url?: string | null
          expires_at: string
          form_data?: Json
          id?: string
          job_id: string
          last_saved_at?: string
          resume_extracted_text?: string | null
          resume_url?: string | null
        }
        Update: {
          applicant_id?: string
          cover_letter_url?: string | null
          expires_at?: string
          form_data?: Json
          id?: string
          job_id?: string
          last_saved_at?: string
          resume_extracted_text?: string | null
          resume_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_drafts_applicant_id_fkey"
            columns: ["applicant_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_drafts_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          created_at: string
          credential_id: string | null
          expiration_date: string | null
          id: string
          image_url: string | null
          issue_date: string | null
          issuing_organization: string
          name: string
          rejection_reason: string | null
          updated_at: string
          verification_status: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          credential_id?: string | null
          expiration_date?: string | null
          id?: string
          image_url?: string | null
          issue_date?: string | null
          issuing_organization: string
          name: string
          rejection_reason?: string | null
          updated_at?: string
          verification_status?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          credential_id?: string | null
          expiration_date?: string | null
          id?: string
          image_url?: string | null
          issue_date?: string | null
          issuing_organization?: string
          name?: string
          rejection_reason?: string | null
          updated_at?: string
          verification_status?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_worker_id_fkey"
            columns: ["worker_id"]
            referencedRelation: "workers"
            referencedColumns: ["user_id"]
          },
        ]
      }
      content_reports: {
        Row: {
          action_taken: string | null
          admin_notes: string | null
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          action_taken?: string | null
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          action_taken?: string | null
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          company_name: string | null
          has_cl: boolean | null
          user_id: string
          website: string | null
        }
        Insert: {
          company_name?: string | null
          has_cl?: boolean | null
          user_id: string
          website?: string | null
        }
        Update: {
          company_name?: string | null
          has_cl?: boolean | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_1_id?: string
          participant_2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_id_fkey"
            columns: ["participant_1_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_id_fkey"
            columns: ["participant_2_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      developers: {
        Row: {
          company_name: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          company_name?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          company_name?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "developers_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          degree: string | null
          end_date: string | null
          field_of_study: string | null
          id: string
          institution: string
          start_date: string | null
          user_id: string
        }
        Insert: {
          degree?: string | null
          end_date?: string | null
          field_of_study?: string | null
          id?: string
          institution: string
          start_date?: string | null
          user_id: string
        }
        Update: {
          degree?: string | null
          end_date?: string | null
          field_of_study?: string | null
          id?: string
          institution?: string
          start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      endorsement_requests: {
        Row: {
          created_at: string
          employer_id: string
          experience_id: string
          id: string
          responded_at: string | null
          status: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          employer_id: string
          experience_id: string
          id?: string
          responded_at?: string | null
          status?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          employer_id?: string
          experience_id?: string
          id?: string
          responded_at?: string | null
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "endorsement_requests_employer_id_fkey"
            columns: ["employer_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endorsement_requests_experience_id_fkey"
            columns: ["experience_id"]
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endorsement_requests_worker_id_fkey"
            columns: ["worker_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      endorsements: {
        Row: {
          created_at: string
          endorsed_by_company: string | null
          endorsed_by_name: string
          endorsed_by_user_id: string
          experience_id: string
          id: string
          recommendation_text: string | null
          verified_dates_worked: boolean
        }
        Insert: {
          created_at?: string
          endorsed_by_company?: string | null
          endorsed_by_name: string
          endorsed_by_user_id: string
          experience_id: string
          id?: string
          recommendation_text?: string | null
          verified_dates_worked?: boolean
        }
        Update: {
          created_at?: string
          endorsed_by_company?: string | null
          endorsed_by_name?: string
          endorsed_by_user_id?: string
          experience_id?: string
          id?: string
          recommendation_text?: string | null
          verified_dates_worked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "endorsements_endorsed_by_user_id_fkey"
            columns: ["endorsed_by_user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endorsements_experience_id_fkey"
            columns: ["experience_id"]
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          company: string
          created_at: string | null
          description: string | null
          end_date: string | null
          endorsement_count: number | null
          id: string
          is_current: boolean | null
          is_verified: boolean | null
          job_title: string
          start_date: string
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          endorsement_count?: number | null
          id?: string
          is_current?: boolean | null
          is_verified?: boolean | null
          job_title: string
          start_date: string
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          endorsement_count?: number | null
          id?: string
          is_current?: boolean | null
          is_verified?: boolean | null
          job_title?: string
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      home_owners: {
        Row: {
          project_description: string | null
          user_id: string
        }
        Insert: {
          project_description?: string | null
          user_id: string
        }
        Update: {
          project_description?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_owners_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_id: string
          cover_letter: string | null
          cover_letter_url: string | null
          created_at: string
          custom_answers: Json | null
          form_data: Json | null
          id: string
          job_id: string
          resume_extracted_text: string | null
          resume_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          cover_letter?: string | null
          cover_letter_url?: string | null
          created_at?: string
          custom_answers?: Json | null
          form_data?: Json | null
          id?: string
          job_id: string
          resume_extracted_text?: string | null
          resume_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          cover_letter?: string | null
          cover_letter_url?: string | null
          created_at?: string
          custom_answers?: Json | null
          form_data?: Json | null
          id?: string
          job_id?: string
          resume_extracted_text?: string | null
          resume_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_views: {
        Row: {
          id: string
          job_id: string
          session_id: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          job_id: string
          session_id: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          session_id?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_views_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_views_viewer_id_fkey"
            columns: ["viewer_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          application_count: number | null
          coords: unknown
          created_at: string
          custom_questions: Json | null
          description: string
          employer_id: string
          id: string
          job_type: string
          location: string
          pay_max: number | null
          pay_min: number | null
          pay_rate: string | null
          required_certs: string[] | null
          status: string
          sub_trades: string[] | null
          title: string
          trades: string[]
          updated_at: string
          view_count: number | null
        }
        Insert: {
          application_count?: number | null
          coords?: unknown
          created_at?: string
          custom_questions?: Json | null
          description: string
          employer_id: string
          id?: string
          job_type: string
          location: string
          pay_max?: number | null
          pay_min?: number | null
          pay_rate?: string | null
          required_certs?: string[] | null
          status?: string
          sub_trades?: string[] | null
          title: string
          trades: string[]
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          application_count?: number | null
          coords?: unknown
          created_at?: string
          custom_questions?: Json | null
          description?: string
          employer_id?: string
          id?: string
          job_type?: string
          location?: string
          pay_max?: number | null
          pay_min?: number | null
          pay_rate?: string | null
          required_certs?: string[] | null
          status?: string
          sub_trades?: string[] | null
          title?: string
          trades?: string[]
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_employer_id_fkey"
            columns: ["employer_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          classification: string | null
          contractor_id: string
          created_at: string
          expiration_date: string | null
          id: string
          image_url: string | null
          issue_date: string | null
          issuing_state: string | null
          license_number: string
          rejection_reason: string | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          classification?: string | null
          contractor_id: string
          created_at?: string
          expiration_date?: string | null
          id?: string
          image_url?: string | null
          issue_date?: string | null
          issuing_state?: string | null
          license_number: string
          rejection_reason?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          classification?: string | null
          contractor_id?: string
          created_at?: string
          expiration_date?: string | null
          id?: string
          image_url?: string | null
          issue_date?: string | null
          issuing_state?: string | null
          license_number?: string
          rejection_reason?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_contractor_id_fkey"
            columns: ["contractor_id"]
            referencedRelation: "contractors"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string | null
          read_at: string | null
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          read_at?: string | null
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string | null
          read_at?: string | null
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_images: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_images_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_references: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          relationship: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          relationship: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          relationship?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_references_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          id: string
          viewed_at: string
          viewed_profile_id: string
          viewer_id: string
        }
        Insert: {
          id?: string
          viewed_at?: string
          viewed_profile_id: string
          viewer_id: string
        }
        Update: {
          id?: string
          viewed_at?: string
          viewed_profile_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_viewed_profile_id_fkey"
            columns: ["viewed_profile_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      proximity_alerts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          radius_km: number
          trades: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          radius_km?: number
          trades?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          radius_km?: number
          trades?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proximity_alerts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiters: {
        Row: {
          agency_website: string | null
          company_name: string | null
          user_id: string
        }
        Insert: {
          agency_website?: string | null
          company_name?: string | null
          user_id: string
        }
        Update: {
          agency_website?: string | null
          company_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiters_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_processed_events: {
        Row: {
          created_at: string
          id: string
          type: string
        }
        Insert: {
          created_at?: string
          id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          event_type: string
          id: string
          metadata: Json | null
          plan_type: string | null
          status: string
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          plan_type?: string | null
          status: string
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          plan_type?: string | null
          status?: string
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_type: string
          status: string
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          plan_type: string
          status: string
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string
          stripe_price_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_moderation_actions: {
        Row: {
          action_type: string
          actioned_by: string
          created_at: string
          duration_days: number | null
          expires_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          action_type: string
          actioned_by: string
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          action_type?: string
          actioned_by?: string
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_moderation_actions_actioned_by_fkey"
            columns: ["actioned_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_moderation_actions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          bio: string | null
          created_at: string
          email: string
          employer_type: string | null
          first_name: string
          geo_coords: unknown
          id: string
          is_admin: boolean | null
          is_lifetime_pro: boolean | null
          last_name: string
          lifetime_pro_granted_at: string | null
          location: string
          phone: string | null
          profile_image_url: string | null
          role: string
          subscription_status: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email: string
          employer_type?: string | null
          first_name: string
          geo_coords?: unknown
          id: string
          is_admin?: boolean | null
          is_lifetime_pro?: boolean | null
          last_name: string
          lifetime_pro_granted_at?: string | null
          location?: string
          phone?: string | null
          profile_image_url?: string | null
          role: string
          subscription_status?: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string
          employer_type?: string | null
          first_name?: string
          geo_coords?: unknown
          id?: string
          is_admin?: boolean | null
          is_lifetime_pro?: boolean | null
          last_name?: string
          lifetime_pro_granted_at?: string | null
          location?: string
          phone?: string | null
          profile_image_url?: string | null
          role?: string
          subscription_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          authorized_to_work: boolean | null
          boost_expires_at: string | null
          dl_class: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          has_certifications: boolean | null
          has_dl: boolean | null
          has_portfolio: boolean | null
          has_tools: boolean | null
          hourly_rate: number | null
          is_profile_boosted: boolean | null
          reliable_transportation: boolean | null
          sub_trade: string | null
          tools_owned: string[] | null
          trade: string
          trade_skills: string[] | null
          union_status: string | null
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          authorized_to_work?: boolean | null
          boost_expires_at?: string | null
          dl_class?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          has_certifications?: boolean | null
          has_dl?: boolean | null
          has_portfolio?: boolean | null
          has_tools?: boolean | null
          hourly_rate?: number | null
          is_profile_boosted?: boolean | null
          reliable_transportation?: boolean | null
          sub_trade?: string | null
          tools_owned?: string[] | null
          trade: string
          trade_skills?: string[] | null
          union_status?: string | null
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          authorized_to_work?: boolean | null
          boost_expires_at?: string | null
          dl_class?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          has_certifications?: boolean | null
          has_dl?: boolean | null
          has_portfolio?: boolean | null
          has_tools?: boolean | null
          hourly_rate?: number | null
          is_profile_boosted?: boolean | null
          reliable_transportation?: boolean | null
          sub_trade?: string | null
          tools_owned?: string[] | null
          trade?: string
          trade_skills?: string[] | null
          union_status?: string | null
          user_id?: string
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_total_experience: {
        Args: { p_user_id: string }
        Returns: number
      }
      create_job_with_coords: {
        Args: {
          p_description: string
          p_employer_id: string
          p_job_type: string
          p_lat: number
          p_lng: number
          p_location: string
          p_pay_rate: string
          p_title: string
          p_trades: string[]
        }
        Returns: string
      }
      get_workers_by_experience: {
        Args: { p_min_years: number; p_trade_filter?: string }
        Returns: {
          first_name: string
          geo_coords: unknown
          id: string
          last_name: string
          location: string
          trade: string
          years_exp: number
        }[]
      }
      update_job_coords: {
        Args: { p_job_id: string; p_lat: number; p_lng: number }
        Returns: undefined
      }
      update_user_coords: {
        Args: {
          p_lat: number
          p_lng: number
          p_location?: string
          p_user_id: string
        }
        Returns: undefined
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

// * Helper types for easier table access
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// * Convenient table row type exports
export type User = Tables<'users'>
export type Worker = Tables<'workers'>
export type Job = Tables<'jobs'>
export type JobApplication = Tables<'job_applications'>
export type Certification = Tables<'certifications'>
export type License = Tables<'licenses'>
export type Conversation = Tables<'conversations'>
export type Message = Tables<'messages'>
export type Notification = Tables<'notifications'>
export type Subscription = Tables<'subscriptions'>
export type ContentReport = Tables<'content_reports'>
export type UserModerationAction = Tables<'user_moderation_actions'>
export type AdminActivityLog = Tables<'admin_activity_log'>
export type Experience = Tables<'experiences'>
export type Education = Tables<'education'>
export type PortfolioImage = Tables<'portfolio_images'>
export type ProfessionalReference = Tables<'professional_references'>
export type ProximityAlert = Tables<'proximity_alerts'>
export type ProfileView = Tables<'profile_views'>
export type JobView = Tables<'job_views'>

