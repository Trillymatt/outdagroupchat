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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      activity_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          summary: string
          trip_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          summary: string
          trip_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          summary?: string
          trip_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          status: string
          trip_id: string
          type: string
        }
        Insert: {
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          trip_id: string
          type: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          trip_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          target_id: string
          target_type: CommentTargetType
          trip_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          target_id: string
          target_type: CommentTargetType
          trip_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          target_id?: string
          target_type?: CommentTargetType
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_splits: {
        Row: {
          amount: number
          expense_id: string
          user_id: string
        }
        Insert: {
          amount: number
          expense_id: string
          user_id: string
        }
        Update: {
          amount?: number
          expense_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_splits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: ExpenseCategory | null
          created_at: string
          created_by: string
          description: string
          expense_date: string
          id: string
          paid_by: string
          trip_id: string
        }
        Insert: {
          amount: number
          category?: ExpenseCategory | null
          created_at?: string
          created_by?: string
          description: string
          expense_date?: string
          id?: string
          paid_by: string
          trip_id: string
        }
        Update: {
          amount?: number
          category?: ExpenseCategory | null
          created_at?: string
          created_by?: string
          description?: string
          expense_date?: string
          id?: string
          paid_by?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_suggestions: {
        Row: {
          airline: string | null
          arrival_airport: string | null
          arrival_time: string | null
          booking_link: string | null
          created_at: string
          created_by: string
          departure_airport: string | null
          departure_time: string | null
          flight_number: string | null
          id: string
          nonstop: boolean
          notes: string | null
          price: number | null
          status: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          airline?: string | null
          arrival_airport?: string | null
          arrival_time?: string | null
          booking_link?: string | null
          created_at?: string
          created_by: string
          departure_airport?: string | null
          departure_time?: string | null
          flight_number?: string | null
          id?: string
          nonstop?: boolean
          notes?: string | null
          price?: number | null
          status?: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          airline?: string | null
          arrival_airport?: string | null
          arrival_time?: string | null
          booking_link?: string | null
          created_at?: string
          created_by?: string
          departure_airport?: string | null
          departure_time?: string | null
          flight_number?: string | null
          id?: string
          nonstop?: boolean
          notes?: string | null
          price?: number | null
          status?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_suggestions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_suggestions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      flights: {
        Row: {
          airline: string | null
          arrival_airport: string | null
          arrival_time: string | null
          booking_link: string | null
          confirmation_number: string | null
          created_at: string
          departure_airport: string | null
          departure_time: string | null
          flight_number: string | null
          id: string
          locked_in: boolean
          notes: string | null
          price: number | null
          status: FlightStatus
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          airline?: string | null
          arrival_airport?: string | null
          arrival_time?: string | null
          booking_link?: string | null
          confirmation_number?: string | null
          created_at?: string
          departure_airport?: string | null
          departure_time?: string | null
          flight_number?: string | null
          id?: string
          locked_in?: boolean
          notes?: string | null
          price?: number | null
          status?: FlightStatus
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          airline?: string | null
          arrival_airport?: string | null
          arrival_time?: string | null
          booking_link?: string | null
          confirmation_number?: string | null
          created_at?: string
          departure_airport?: string | null
          departure_time?: string | null
          flight_number?: string | null
          id?: string
          locked_in?: boolean
          notes?: string | null
          price?: number | null
          status?: FlightStatus
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flights_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          category: ItineraryCategory
          cost: number | null
          created_at: string
          created_by: string
          day: string
          description: string | null
          id: string
          link: string | null
          location: string | null
          position: number
          time: string | null
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          category?: ItineraryCategory
          cost?: number | null
          created_at?: string
          created_by: string
          day: string
          description?: string | null
          id?: string
          link?: string | null
          location?: string | null
          position?: number
          time?: string | null
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          category?: ItineraryCategory
          cost?: number | null
          created_at?: string
          created_by?: string
          day?: string
          description?: string | null
          id?: string
          link?: string | null
          location?: string | null
          position?: number
          time?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_votes: {
        Row: {
          created_at: string
          itinerary_item_id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          itinerary_item_id: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          itinerary_item_id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_votes_itinerary_item_id_fkey"
            columns: ["itinerary_item_id"]
            isOneToOne: false
            referencedRelation: "itinerary_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_votes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lodging_options: {
        Row: {
          booking_notes: string | null
          booking_url: string | null
          confirmation_number: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          price_per_night: number | null
          status: string
          trip_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          booking_notes?: string | null
          booking_url?: string | null
          confirmation_number?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          notes?: string | null
          price_per_night?: number | null
          status?: string
          trip_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          booking_notes?: string | null
          booking_url?: string | null
          confirmation_number?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          price_per_night?: number | null
          status?: string
          trip_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lodging_options_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lodging_options_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      lodging_votes: {
        Row: {
          created_at: string
          lodging_option_id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          lodging_option_id: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          lodging_option_id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lodging_votes_lodging_option_id_fkey"
            columns: ["lodging_option_id"]
            isOneToOne: false
            referencedRelation: "lodging_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lodging_votes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lodging_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_item_checks: {
        Row: {
          checked: boolean
          packing_item_id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          checked?: boolean
          packing_item_id: string
          trip_id: string
          user_id: string
        }
        Update: {
          checked?: boolean
          packing_item_id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_item_checks_packing_item_id_fkey"
            columns: ["packing_item_id"]
            isOneToOne: false
            referencedRelation: "packing_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_item_checks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_item_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          label: string
          source: string
          trip_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          label: string
          source?: string
          trip_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          label?: string
          source?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
          created_at: string
          email: string
          id: string
          name: string
          phone_number: string | null
          sms_opt_in: boolean
          updated_at: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          email: string
          id: string
          name: string
          phone_number?: string | null
          sms_opt_in?: boolean
          updated_at?: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone_number?: string | null
          sms_opt_in?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_votes: {
        Row: {
          created_at: string
          restaurant_id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          restaurant_id: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          restaurant_id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_votes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_votes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string
          created_by: string
          cuisine: string | null
          id: string
          name: string
          notes: string | null
          trip_id: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          cuisine?: string | null
          id?: string
          name: string
          notes?: string | null
          trip_id: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          cuisine?: string | null
          id?: string
          name?: string
          notes?: string | null
          trip_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_date_availability: {
        Row: {
          created_at: string
          date: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_date_availability_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_date_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_members: {
        Row: {
          can_edit_flights: boolean
          can_edit_food: boolean
          can_edit_itinerary: boolean
          can_edit_lodging: boolean
          display_name: string
          joined_at: string
          role: string
          trip_id: string
          user_id: string
        }
        Insert: {
          can_edit_flights?: boolean
          can_edit_food?: boolean
          can_edit_itinerary?: boolean
          can_edit_lodging?: boolean
          display_name: string
          joined_at?: string
          role?: string
          trip_id: string
          user_id: string
        }
        Update: {
          can_edit_flights?: boolean
          can_edit_food?: boolean
          can_edit_itinerary?: boolean
          can_edit_lodging?: boolean
          display_name?: string
          joined_at?: string
          role?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          cover_image: string | null
          created_at: string
          created_by: string
          dates_locked: boolean
          destination: string | null
          end_date: string | null
          id: string
          invite_code: string
          name: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          created_by: string
          dates_locked?: boolean
          destination?: string | null
          end_date?: string | null
          id?: string
          invite_code?: string
          name: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          created_by?: string
          dates_locked?: boolean
          destination?: string | null
          end_date?: string | null
          id?: string
          invite_code?: string
          name?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_category: {
        Args: { target_trip_id: string; category: string }
        Returns: boolean
      }
      create_trip: {
        Args: {
          p_name: string
          p_destination?: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          cover_image: string | null
          created_at: string
          created_by: string
          dates_locked: boolean
          destination: string | null
          end_date: string | null
          id: string
          invite_code: string
          name: string
          start_date: string | null
          updated_at: string
        }
      }
      delete_trip: {
        Args: { p_trip_id: string }
        Returns: undefined
      }
      gen_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_trip_member: {
        Args: { target_trip_id: string }
        Returns: boolean
      }
      is_trip_owner: {
        Args: { target_trip_id: string }
        Returns: boolean
      }
      join_trip_by_code: {
        Args: { p_invite_code: string }
        Returns: {
          cover_image: string | null
          created_at: string
          created_by: string
          dates_locked: boolean
          destination: string | null
          end_date: string | null
          id: string
          invite_code: string
          name: string
          start_date: string | null
          updated_at: string
        }
      }
      leave_trip: {
        Args: { p_trip_id: string }
        Returns: undefined
      }
      remove_trip_member: {
        Args: { p_trip_id: string; p_user_id: string }
        Returns: undefined
      }
      set_trip_member_permission: {
        Args: {
          p_trip_id: string
          p_user_id: string
          p_can_edit_lodging?: boolean
          p_can_edit_food?: boolean
          p_can_edit_itinerary?: boolean
          p_can_edit_flights?: boolean
        }
        Returns: undefined
      }
      shares_trip_with: {
        Args: { other_user: string }
        Returns: boolean
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

// Hand-added convenience aliases: the `category`/`status` columns below are
// plain `text` with a check constraint, not native Postgres enums, so codegen
// types them as `string`. These narrow them to match the check constraints —
// re-add after every `supabase gen types` regeneration.
export type ItineraryCategory = "activity" | "food" | "transport" | "lodging" | "other";
export type FlightStatus = "searching" | "booked" | "opted_out";
export type ExpenseCategory = "lodging" | "food" | "transport" | "activity" | "other";
export type CommentTargetType = "lodging" | "restaurant" | "itinerary" | "flight_suggestion";

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
