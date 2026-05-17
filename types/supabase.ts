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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          added_at: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      brand_synonyms: {
        Row: {
          brand_id: number
          id: number
          synonym: string
        }
        Insert: {
          brand_id: number
          id?: number
          synonym: string
        }
        Update: {
          brand_id?: number
          id?: number
          synonym?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_synonyms_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: number
          kind: string | null
          logo_url: string | null
          name: string
          popularity: number
          slug: string
          synonyms: string[]
        }
        Insert: {
          created_at?: string
          id?: number
          kind?: string | null
          logo_url?: string | null
          name: string
          popularity?: number
          slug: string
          synonyms?: string[]
        }
        Update: {
          created_at?: string
          id?: number
          kind?: string | null
          logo_url?: string | null
          name?: string
          popularity?: number
          slug?: string
          synonyms?: string[]
        }
        Relationships: []
      }
      message_threads: {
        Row: {
          buyer_id: string | null
          created_at: string | null
          deal_id: string | null
          id: string
          product_id: string | null
          seller_id: string | null
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          id?: string
          product_id?: string | null
          seller_id?: string | null
        }
        Update: {
          buyer_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          id?: string
          product_id?: string | null
          seller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_threads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mini_liked_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "message_threads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_bot: boolean | null
          sender_id: string | null
          thread_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_bot?: boolean | null
          sender_id?: string | null
          thread_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_bot?: boolean | null
          sender_id?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_products: {
        Row: {
          apparel_size: string | null
          approved: boolean | null
          brand: string | null
          category: string | null
          condition: string | null
          created_at: string | null
          description: string | null
          gender: string | null
          id: string
          images: string[] | null
          price: number | null
          profile_id: string | null
          seller_tg: string | null
          shoe_size: string | null
          size: string | null
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          apparel_size?: string | null
          approved?: boolean | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          gender?: string | null
          id?: string
          images?: string[] | null
          price?: number | null
          profile_id?: string | null
          seller_tg?: string | null
          shoe_size?: string | null
          size?: string | null
          status?: string
          title: string
          user_id?: string | null
        }
        Update: {
          apparel_size?: string | null
          approved?: boolean | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          gender?: string | null
          id?: string
          images?: string[] | null
          price?: number | null
          profile_id?: string | null
          seller_tg?: string | null
          shoe_size?: string | null
          size?: string | null
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_products_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "mini_liked_profiles"
            referencedColumns: ["liked_profile_id"]
          },
          {
            foreignKeyName: "pending_products_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_likes: {
        Row: {
          created_at: string | null
          liker_user_id: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          liker_user_id: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          liker_user_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_likes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mini_liked_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_likes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          apparel_size: string | null
          brand: string | null
          category: string | null
          condition: string | null
          created_at: string | null
          description: string | null
          gender: string | null
          id: string
          images: string[] | null
          price: number | null
          profile_id: string | null
          seller_tg: string | null
          shoe_size: string | null
          size: string | null
          status: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          apparel_size?: string | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          gender?: string | null
          id?: string
          images?: string[] | null
          price?: number | null
          profile_id?: string | null
          seller_tg?: string | null
          shoe_size?: string | null
          size?: string | null
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          apparel_size?: string | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          gender?: string | null
          id?: string
          images?: string[] | null
          price?: number | null
          profile_id?: string | null
          seller_tg?: string | null
          shoe_size?: string | null
          size?: string | null
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "mini_liked_profiles"
            referencedColumns: ["liked_profile_id"]
          },
          {
            foreignKeyName: "products_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profile_likes: {
        Row: {
          created_at: string | null
          liker_user_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          liker_user_id: string
          profile_id: string
        }
        Update: {
          created_at?: string | null
          liker_user_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "mini_liked_profiles"
            referencedColumns: ["liked_profile_id"]
          },
          {
            foreignKeyName: "profile_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          default_delivery: Json | null
          id: string
          is_verified: boolean
          name: string
          telegram_first_name: string | null
          telegram_id: string | null
          telegram_last_name: string | null
          telegram_photo_url: string | null
          telegram_username: string | null
          updated_at: string
          user_id: string | null
          username: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          default_delivery?: Json | null
          id?: string
          is_verified?: boolean
          name: string
          telegram_first_name?: string | null
          telegram_id?: string | null
          telegram_last_name?: string | null
          telegram_photo_url?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string | null
          username: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          default_delivery?: Json | null
          id?: string
          is_verified?: boolean
          name?: string
          telegram_first_name?: string | null
          telegram_id?: string | null
          telegram_last_name?: string | null
          telegram_photo_url?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      tg_admins: {
        Row: {
          chat_id: number
          note: string | null
        }
        Insert: {
          chat_id: number
          note?: string | null
        }
        Update: {
          chat_id?: number
          note?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      mini_liked_products: {
        Row: {
          brand: string | null
          images: string[] | null
          liked_at: string | null
          price: number | null
          product_id: string | null
          profile_id: string | null
          title: string | null
        }
        Relationships: []
      }
      mini_liked_profiles: {
        Row: {
          liked_at: string | null
          liked_avatar: string | null
          liked_city: string | null
          liked_name: string | null
          liked_profile_id: string | null
          liked_verified: boolean | null
          profile_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      brand_search: {
        Args: { lim?: number; q: string }
        Returns: {
          created_at: string
          id: number
          kind: string
          logo_url: string
          name: string
          popularity: number
          slug: string
          synonyms: string[]
        }[]
      }
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      count_product_likes_for_profile: {
        Args: { p_profile_id: string }
        Returns: number
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { data: Json; uri: string } | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { data: Json; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      products_search: {
        Args: { lim?: number; off?: number; q: string }
        Returns: {
          brand: string
          category: string
          condition: string
          created_at: string
          gender: string
          id: string
          images: string[]
          price: number
          rank: number
          size: string
          title: string
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      slugify: {
        Args: { txt: string }
        Returns: string
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
