export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PhoneCondition = 'New' | 'Used' | 'Refurbished'
export type PhoneStatus = 'In Stock' | 'Sold' | 'Reserved' | 'Returned'
export type PTAStatus = 'PTA' | 'NON-PTA' | 'JV'
export type ItemType = 'Phone' | 'Adapter' | 'Cable'
export type PaymentMethod = 'Cash' | 'Card' | 'Transfer' | 'JazzCash' | 'EasyPaisa' | 'Other'
export type ExpenseCategory = 'Rent' | 'Electricity' | 'Internet' | 'Salary' | 'Accessories' | 'Repairs' | 'Miscellaneous'
export type PartyTransactionType = 'credit_sale' | 'credit_purchase' | 'receipt' | 'payment' | 'adjustment'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          role: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      phones: {
        Row: {
          id: string
          item_type: ItemType | null
          brand: string
          model: string
          imei: string
          color: string | null
          ram: string | null
          storage: string | null
          battery_health: string | null
          condition: PhoneCondition | null
          pta_status: PTAStatus | null
          purchase_price: number | null
          sale_price: number | null
          status: PhoneStatus | null
          notes: string | null
          reserved_party_id: string | null
          reserved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_type?: ItemType | null
          brand: string
          model: string
          imei?: string | null
          color?: string | null
          ram?: string | null
          storage?: string | null
          battery_health?: string | null
          condition?: PhoneCondition | null
          pta_status?: PTAStatus | null
          purchase_price?: number | null
          sale_price?: number | null
          status?: PhoneStatus | null
          notes?: string | null
          reserved_party_id?: string | null
          reserved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item_type?: ItemType | null
          brand?: string
          model?: string
          imei?: string | null
          color?: string | null
          ram?: string | null
          storage?: string | null
          battery_health?: string | null
          condition?: PhoneCondition | null
          pta_status?: PTAStatus | null
          purchase_price?: number | null
          sale_price?: number | null
          status?: PhoneStatus | null
          notes?: string | null
          reserved_party_id?: string | null
          reserved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          address: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          phone_id: string | null
          seller_name: string
          seller_phone: string | null
          seller_cnic: string | null
          purchase_price: number
          payment_method: PaymentMethod | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          phone_id?: string | null
          seller_name: string
          seller_phone?: string | null
          seller_cnic?: string | null
          purchase_price: number
          payment_method?: PaymentMethod | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          phone_id?: string | null
          seller_name?: string
          seller_phone?: string | null
          seller_cnic?: string | null
          purchase_price?: number
          payment_method?: PaymentMethod | null
          notes?: string | null
          created_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          phone_id: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          sale_price: number
          profit: number | null
          payment_method: PaymentMethod | null
          sold_by: string | null
          invoice_number: string | null
          created_at: string
        }
        Insert: {
          id?: string
          phone_id?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          sale_price: number
          profit?: number | null
          payment_method?: PaymentMethod | null
          sold_by?: string | null
          invoice_number?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          phone_id?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          sale_price?: number
          profit?: number | null
          payment_method?: PaymentMethod | null
          sold_by?: string | null
          invoice_number?: string | null
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          title: string
          amount: number
          category: ExpenseCategory | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          amount: number
          category?: ExpenseCategory | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          amount?: number
          category?: ExpenseCategory | null
          notes?: string | null
        }
      }
      parties: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          phone: string | null
          address: string | null
          opening_balance: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          phone?: string | null
          address?: string | null
          opening_balance?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          phone?: string | null
          address?: string | null
          opening_balance?: number | null
          notes?: string | null
          updated_at?: string
        }
      }
      party_transactions: {
        Row: {
          id: string
          party_id: string
          type: PartyTransactionType
          amount: number
          reference_id: string | null
          reference_type: string | null
          sale_id: string | null
          purchase_id: string | null
          payment_method: string | null
          description: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          party_id: string
          type: PartyTransactionType
          amount: number
          reference_id?: string | null
          reference_type?: string | null
          sale_id?: string | null
          purchase_id?: string | null
          payment_method?: string | null
          description?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          party_id?: string
          type?: PartyTransactionType
          amount?: number
          reference_id?: string | null
          reference_type?: string | null
          sale_id?: string | null
          purchase_id?: string | null
          payment_method?: string | null
          description?: string | null
          created_by?: string | null
        }
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
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Update<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type Phone = Row<'phones'>
export type Customer = Row<'customers'>
export type Purchase = Row<'purchases'>
export type Sale = Row<'sales'>
export type Expense = Row<'expenses'>
export type Profile = Row<'profiles'>
export type Party = Row<'parties'>
export type PartyTransaction = Row<'party_transactions'>

export type PhoneInsert = Insert<'phones'>
export type CustomerInsert = Insert<'customers'>
export type PurchaseInsert = Insert<'purchases'>
export type SaleInsert = Insert<'sales'>
export type ExpenseInsert = Insert<'expenses'>
export type PartyInsert = Insert<'parties'>
export type PartyTransactionInsert = Insert<'party_transactions'>