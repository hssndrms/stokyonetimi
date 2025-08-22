import { AccountType } from "../types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          code: string
          name: string
          type: AccountType
          phone: string | null
          email: string | null
          address: string | null
          created_at: string
        }
        Insert: {
          code: string
          name: string
          type: AccountType
          phone?: string | null
          email?: string | null
          address?: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          type?: AccountType
          phone?: string | null
          email?: string | null
          address?: string | null
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          name: string
          sku: string
          unit_id: string
          group_id: string
          created_at: string
        }
        Insert: {
          name: string
          sku: string
          unit_id: string
          group_id: string
        }
        Update: {
          id?: string
          name?: string
          sku?: string
          unit_id?: string
          group_id?: string
          created_at?: string
        }
        Relationships: []
      }
      product_groups: {
        Row: {
          id: string
          name: string
          sku_prefix: string
          sku_length: number
          created_at: string
        }
        Insert: {
          name: string
          sku_prefix: string
          sku_length: number
        }
        Update: {
          id?: string
          name?: string
          sku_prefix?: string
          sku_length?: number
          created_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          id: string
          name: string
          abbreviation: string
          created_at: string
        }
        Insert: {
          name: string
          abbreviation: string
        }
        Update: {
          id?: string
          name?: string
          abbreviation?: string
          created_at?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          id: string
          name: string
          code: string
          group_id: string
          created_at: string
        }
        Insert: {
          name: string
          code: string
          group_id: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          group_id?: string
          created_at?: string
        }
        Relationships: []
      }
      warehouse_groups: {
        Row: {
            id: string
            name: string
            created_at: string
        }
        Insert: {
            name: string
        }
        Update: {
            id?: string
            name?: string
            created_at?: string
        }
        Relationships: []
      }
      shelves: {
        Row: {
          id: string
          name: string
          code: string
          warehouse_id: string
          created_at: string
        }
        Insert: {
          name: string
          code: string
          warehouse_id: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          warehouse_id?: string
          created_at?: string
        }
        Relationships: []
      }
      stock_items: {
        Row: {
            id: number
            product_id: string
            warehouse_id: string
            shelf_id: string
            quantity: number
            updated_at: string
        }
        Insert: {
            product_id: string
            warehouse_id: string
            shelf_id: string
            quantity: number
        }
        Update: {
            id?: number
            product_id?: string
            warehouse_id?: string
            shelf_id?: string
            quantity?: number
            updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
            id: string
            voucher_number: string
            product_id: string
            quantity: number
            warehouse_id: string
            shelf_id: string
            type: "IN" | "OUT"
            date: string
            source_or_destination: string
            notes: string | null
            created_at: string
            updated_at: string
        }
        Insert: {
            voucher_number: string
            product_id: string
            quantity: number
            warehouse_id: string
            shelf_id: string
            type: "IN" | "OUT"
            date: string
            source_or_destination: string
            notes?: string | null
        }
        Update: {
            id?: string
            voucher_number?: string
            product_id?: string
            quantity?: number
            warehouse_id?: string
            shelf_id?: string
            type?: "IN" | "OUT"
            date?: string
            source_or_destination?: string
            notes?: string | null
            created_at?: string
            updated_at?: string
        }
        Relationships: []
      }
      general_settings: {
          Row: {
              id: number
              customer_code_prefix: string;
              customer_code_length: number;
              supplier_code_prefix: string;
              supplier_code_length: number;
              stock_in_prefix: string;
              stock_in_length: number;
              stock_out_prefix: string;
              stock_out_length: number;
              stock_transfer_prefix: string;
              stock_transfer_length: number;
          }
          Insert: {
              id?: number
              customer_code_prefix: string;
              customer_code_length: number;
              supplier_code_prefix: string;
              supplier_code_length: number;
              stock_in_prefix: string;
              stock_in_length: number;
              stock_out_prefix: string;
              stock_out_length: number;
              stock_transfer_prefix: string;
              stock_transfer_length: number;
          }
          Update: {
              id?: number
              customer_code_prefix?: string;
              customer_code_length?: number;
              supplier_code_prefix?: string;
              supplier_code_length?: number;
              stock_in_prefix?: string;
              stock_in_length?: number;
              stock_out_prefix?: string;
              stock_out_length?: number;
              stock_transfer_prefix?: string;
              stock_transfer_length?: number;
          }
          Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
        get_next_account_code: {
            Args: { p_type: AccountType },
            Returns: string
        },
        get_next_sku: {
            Args: { p_group_id: string },
            Returns: string
        },
        get_next_voucher_number: {
            Args: { p_type: 'IN' | 'OUT' | 'TRANSFER' },
            Returns: string
        },
        stock_in: {
            Args: { header_data: Json, lines_data: Json[] },
            Returns: undefined
        },
        stock_out: {
            Args: { header_data: Json, lines_data: Json[] },
            Returns: undefined
        },
        stock_transfer: {
            Args: { header_data: Json, lines_data: Json[] },
            Returns: undefined
        },
        edit_stock_voucher: {
            Args: { p_voucher_number: string, header_data: Json, lines_data: Json[] },
            Returns: undefined
        },
        edit_stock_transfer: {
            Args: { p_voucher_number: string, header_data: Json, lines_data: Json[] },
            Returns: undefined
        },
        delete_stock_voucher: {
            Args: { p_voucher_number: string },
            Returns: undefined
        },
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}