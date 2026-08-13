/**
 * Hand-written to mirror supabase/migrations/*.sql exactly. Once the project
 * is linked to a real Supabase instance, this can be regenerated with:
 *   supabase gen types typescript --linked > types/supabase.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type EventType =
  | 'wedding'
  | 'graduation'
  | 'university_meetup'
  | 'workshop'
  | 'sports'
  | 'conference'
  | 'private'
  | 'other';

export type EventVisibility = 'public' | 'private';
export type EventStatus = 'draft' | 'published' | 'ended';
export type Locale = 'ar' | 'en';
export type RsvpStatus = 'attending' | 'not_attending' | 'maybe';
export type CustomQuestionType =
  'short_text' | 'long_text' | 'yes_no' | 'single_choice' | 'multi_choice' | 'number';
export type TicketTypeStatus = 'active' | 'paused' | 'ended';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type TicketStatus = 'valid' | 'used' | 'cancelled';
export type OrganizationRole = 'owner' | 'admin' | 'staff';
export type NotificationType = 'rsvp_new' | 'ticket_purchased' | 'ticket_checked_in';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          preferred_locale: Locale;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_locale?: Locale;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrganizationRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: OrganizationRole;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organization_members']['Insert']>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string;
          slug: string;
          name: string;
          type: EventType;
          description: string | null;
          event_date: string | null;
          rsvp_deadline: string | null;
          location_text: string | null;
          location_map_url: string | null;
          cover_image_url: string | null;
          primary_locale: Locale;
          visibility: EventVisibility;
          is_rsvp_enabled: boolean;
          is_ticketing_enabled: boolean;
          is_qr_enabled: boolean;
          password_hash: string | null;
          status: EventStatus;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by: string;
          slug: string;
          name: string;
          type: EventType;
          description?: string | null;
          event_date?: string | null;
          rsvp_deadline?: string | null;
          location_text?: string | null;
          location_map_url?: string | null;
          cover_image_url?: string | null;
          primary_locale?: Locale;
          visibility?: EventVisibility;
          is_rsvp_enabled?: boolean;
          is_ticketing_enabled?: boolean;
          is_qr_enabled?: boolean;
          password_hash?: string | null;
          status?: EventStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
        Relationships: [];
      };
      event_settings: {
        Row: {
          id: string;
          event_id: string;
          allow_attending: boolean;
          allow_not_attending: boolean;
          allow_maybe: boolean;
          collect_guest_name: boolean;
          collect_companions: boolean;
          max_companions: number;
          collect_message: boolean;
          allow_guest_edit: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          allow_attending?: boolean;
          allow_not_attending?: boolean;
          allow_maybe?: boolean;
          collect_guest_name?: boolean;
          collect_companions?: boolean;
          max_companions?: number;
          collect_message?: boolean;
          allow_guest_edit?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['event_settings']['Insert']>;
        Relationships: [];
      };
      event_designs: {
        Row: {
          id: string;
          event_id: string;
          template: string;
          primary_color: string | null;
          secondary_color: string | null;
          font_family: string | null;
          design_json: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          template?: string;
          primary_color?: string | null;
          secondary_color?: string | null;
          font_family?: string | null;
          design_json?: Json;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['event_designs']['Insert']>;
        Relationships: [];
      };
      guests: {
        Row: {
          id: string;
          event_id: string;
          name: string | null;
          phone: string | null;
          email: string | null;
          secure_token: string;
          // How many people the ORGANIZER expects this invitation to cover
          // ("family of 4"), set when they add the guest. Deliberately
          // separate from rsvp_responses.companions_count, which is the
          // guest's own stated number once they actually reply.
          expected_companions: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          secure_token?: string;
          expected_companions?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['guests']['Insert']>;
        Relationships: [];
      };
      rsvp_responses: {
        Row: {
          id: string;
          event_id: string;
          guest_id: string;
          status: RsvpStatus;
          companions_count: number;
          companions_names: Json;
          message: string | null;
          responded_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          guest_id: string;
          status: RsvpStatus;
          companions_count?: number;
          companions_names?: Json;
          message?: string | null;
          responded_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['rsvp_responses']['Insert']>;
        Relationships: [];
      };
      custom_questions: {
        Row: {
          id: string;
          event_id: string;
          question_text_ar: string;
          question_text_en: string | null;
          type: CustomQuestionType;
          is_required: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          question_text_ar: string;
          question_text_en?: string | null;
          type: CustomQuestionType;
          is_required?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['custom_questions']['Insert']>;
        Relationships: [];
      };
      custom_question_options: {
        Row: {
          id: string;
          question_id: string;
          option_text_ar: string;
          option_text_en: string | null;
          display_order: number;
        };
        Insert: {
          id?: string;
          question_id: string;
          option_text_ar: string;
          option_text_en?: string | null;
          display_order?: number;
        };
        Update: Partial<Database['public']['Tables']['custom_question_options']['Insert']>;
        Relationships: [];
      };
      custom_answers: {
        Row: {
          id: string;
          response_id: string;
          question_id: string;
          answer_value: Json;
        };
        Insert: {
          id?: string;
          response_id: string;
          question_id: string;
          answer_value: Json;
        };
        Update: Partial<Database['public']['Tables']['custom_answers']['Insert']>;
        Relationships: [];
      };
      ticket_types: {
        Row: {
          id: string;
          event_id: string;
          name_ar: string;
          name_en: string | null;
          price: number;
          currency: string;
          quantity_total: number;
          quantity_sold: number;
          sale_start_at: string | null;
          sale_end_at: string | null;
          max_per_order: number;
          status: TicketTypeStatus;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          name_ar: string;
          name_en?: string | null;
          price?: number;
          currency?: string;
          quantity_total: number;
          quantity_sold?: number;
          sale_start_at?: string | null;
          sale_end_at?: string | null;
          max_per_order?: number;
          status?: TicketTypeStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['ticket_types']['Insert']>;
        Relationships: [];
      };
      ticket_orders: {
        Row: {
          id: string;
          event_id: string;
          buyer_name: string;
          buyer_email: string | null;
          buyer_phone: string | null;
          total_amount: number;
          currency: string;
          payment_provider: string;
          payment_status: PaymentStatus;
          payment_reference: string | null;
          ticket_type_id: string | null;
          quantity: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          buyer_name: string;
          buyer_email?: string | null;
          buyer_phone?: string | null;
          total_amount?: number;
          currency?: string;
          payment_provider?: string;
          payment_status?: PaymentStatus;
          payment_reference?: string | null;
          ticket_type_id?: string | null;
          quantity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ticket_orders']['Insert']>;
        Relationships: [];
      };
      tickets: {
        Row: {
          id: string;
          order_id: string;
          ticket_type_id: string;
          event_id: string;
          qr_token: string;
          holder_name: string;
          holder_email: string | null;
          status: TicketStatus;
          price_paid: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          ticket_type_id: string;
          event_id: string;
          qr_token?: string;
          holder_name: string;
          holder_email?: string | null;
          status?: TicketStatus;
          price_paid?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tickets']['Insert']>;
        Relationships: [];
      };
      ticket_check_ins: {
        Row: {
          id: string;
          ticket_id: string;
          checked_in_by: string | null;
          checked_in_at: string;
          device_info: string | null;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          checked_in_by?: string | null;
          checked_in_at?: string;
          device_info?: string | null;
        };
        Update: Partial<Database['public']['Tables']['ticket_check_ins']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          event_id: string | null;
          type: NotificationType;
          payload: Json;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_id?: string | null;
          type: NotificationType;
          payload?: Json;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_org_member: {
        Args: { p_organization_id: string };
        Returns: boolean;
      };
      has_org_role: {
        Args: { p_organization_id: string; p_roles: string[] };
        Returns: boolean;
      };
      submit_rsvp: {
        Args: {
          p_event_slug: string;
          p_guest_name: string;
          p_phone: string | null;
          p_email: string | null;
          p_status: RsvpStatus;
          p_companions_count: number;
          p_companions_names: Json;
          p_message: string | null;
          p_answers: Json | null;
        };
        Returns: { guest_id: string; response_id: string; secure_token: string }[];
      };
      get_rsvp_by_token: {
        Args: { p_secure_token: string };
        Returns: Json;
      };
      update_rsvp_by_token: {
        Args: {
          p_secure_token: string;
          p_status: RsvpStatus;
          p_companions_count: number;
          p_companions_names: Json;
          p_message: string | null;
          p_answers: Json | null;
        };
        Returns: boolean;
      };
      purchase_tickets_mock: {
        Args: {
          p_event_slug: string;
          p_ticket_type_id: string;
          p_quantity: number;
          p_buyer_name: string;
          p_buyer_email: string | null;
          p_buyer_phone: string | null;
        };
        Returns: Json;
      };
      check_in_ticket: {
        Args: { p_qr_token: string };
        Returns: Json;
      };
      get_ticket_by_qr_token: {
        Args: { p_qr_token: string };
        Returns: Json;
      };
      check_rate_limit: {
        Args: { p_key: string; p_max_hits: number; p_window_seconds: number };
        Returns: boolean;
      };
      create_pending_ticket_order: {
        Args: {
          p_event_slug: string;
          p_ticket_type_id: string;
          p_quantity: number;
          p_buyer_name: string;
          p_buyer_email: string | null;
          p_buyer_phone: string | null;
        };
        Returns: Json;
      };
      confirm_ticket_order: {
        Args: { p_order_id: string; p_payment_reference: string };
        Returns: Json;
      };
      fail_ticket_order: {
        Args: { p_order_id: string };
        Returns: undefined;
      };
      get_order_status: {
        Args: { p_order_id: string };
        Returns: Json;
      };
      respond_via_whatsapp: {
        Args: { p_guest_id: string; p_status: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
  };
}
