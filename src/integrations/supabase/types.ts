export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      categories: {
        Row: {
          id: number;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: number;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: number;
          title: string;
          category_id: number;
          image_url: string;
          description: string | null;
          is_active: boolean;
          stock_quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          title: string;
          category_id: number;
          image_url: string;
          description?: string | null;
          is_active?: boolean;
          stock_quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          title?: string;
          category_id?: number;
          image_url?: string;
          description?: string | null;
          is_active?: boolean;
          stock_quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          customer_name: string;
          customer_phone: string;
          delivery_place: string;
          total_price: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_name: string;
          customer_phone: string;
          delivery_place: string;
          total_price: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_name?: string;
          customer_phone?: string;
          delivery_place?: string;
          total_price?: number;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: number | null;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: number | null;
          quantity: number;
          unit_price: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: number | null;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      inventory_logs: {
        Row: {
          id: string;
          product_id: number;
          delta: number;
          previous_stock: number;
          new_stock: number;
          reason: string;
          order_id: string | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: number;
          delta: number;
          previous_stock: number;
          new_stock: number;
          reason: string;
          order_id?: string | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: number;
          delta?: number;
          previous_stock?: number;
          new_stock?: number;
          reason?: string;
          order_id?: string | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_logs_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      has_role: {
        Args: {
          required_role: string;
        };
        Returns: boolean;
      };
      create_verified_order: {
        Args: {
          p_customer_name: string;
          p_customer_phone: string;
          p_delivery_place: string;
          p_items: Json;
        };
        Returns: Json;
      };
      update_order_status: {
        Args: {
          p_order_id: string;
          p_new_status: string;
          p_notes?: string;
        };
        Returns: Json;
      };
      adjust_product_inventory: {
        Args: {
          p_product_id: number;
          p_delta: number;
          p_reason: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
