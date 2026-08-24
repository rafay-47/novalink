import { z } from "zod"

export const phoneSchema = z.object({
  item_type: z.enum(["Phone", "Adapter", "Cable"]).optional(),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  imei: z.string().optional(),
  color: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  battery_health: z.string().optional(),
  condition: z.enum(["New", "Used", "Refurbished"]).optional(),
  pta_status: z.enum(["PTA", "NON-PTA", "JV"]).optional(),
  purchase_price: z.number().min(0).optional(),
  sale_price: z.number().min(0).optional(),
  status: z.enum(["In Stock", "Sold", "Reserved", "Returned"]).optional(),
  notes: z.string().optional(),
}).refine(
  (data) => (data.item_type && data.item_type !== "Phone") || (!!data.imei && data.imei.trim().length > 0),
  { message: "IMEI is required for mobile phones", path: ["imei"] }
)

export type PhoneFormValues = z.infer<typeof phoneSchema>

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>

export const purchaseSchema = z.object({
  item_type: z.enum(["Phone", "Adapter", "Cable"]).optional(),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  imei: z.string().optional(),
  color: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  battery_health: z.string().optional(),
  condition: z.enum(["New", "Used", "Refurbished"]).optional(),
  pta_status: z.enum(["PTA", "NON-PTA", "JV"]).optional(),
  seller_name: z.string().optional(),
  seller_phone: z.string().optional(),
  seller_cnic: z.string().optional(),
  purchase_price: z.number().min(1, "Purchase price is required"),
  payment_method: z.enum(["Cash", "Card", "Transfer", "JazzCash", "EasyPaisa", "Other"]),
  party_id: z.string().optional(),
  amount_paid: z.number().min(0).optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.seller_name || data.party_id,
  { message: "Either seller name or party is required", path: ["seller_name"] }
)

export type PurchaseFormValues = z.infer<typeof purchaseSchema>

export const saleSchema = z.object({
  phone_id: z.string().min(1, "Phone selection is required"),
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  sale_price: z.number().min(1, "Sale price is required"),
  payment_method: z.enum(["Cash", "Card", "Transfer", "JazzCash", "EasyPaisa", "Other"]),
  party_id: z.string().optional(),
  amount_paid: z.number().min(0).optional(),
  sold_by: z.string().optional(),
  notes: z.string().optional(),
  date_option: z.enum(["today", "custom"]).optional(),
  sale_date: z.string().optional(),
  created_at: z.string().optional(),
}).refine(
  (data) => data.customer_name || data.party_id,
  { message: "Either customer name or party is required", path: ["customer_name"] }
)

export type SaleFormValues = z.infer<typeof saleSchema>

export const expenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.number().min(1, "Amount is required"),
  category: z.enum(["Rent", "Electricity", "Internet", "Salary", "Accessories", "Repairs", "Miscellaneous"]),
  notes: z.string().optional(),
})

export type ExpenseFormValues = z.infer<typeof expenseSchema>

export const partySchema = z.object({
  name: z.string().min(1, "Party name is required"),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  opening_balance: z.number().optional(),
  notes: z.string().optional(),
})

export type PartyFormValues = z.infer<typeof partySchema>

export const partyTransactionSchema = z.object({
  party_id: z.string().min(1, "Party is required"),
  type: z.enum(["credit_sale", "credit_purchase", "receipt", "payment", "adjustment"]),
  amount: z.number().min(1, "Amount must be greater than 0"),
  reference_id: z.string().optional(),
  reference_type: z.enum(["sale", "purchase"]).optional(),
  payment_method: z.enum(["Cash", "Card", "Transfer", "JazzCash", "EasyPaisa", "Other"]).optional(),
  description: z.string().optional(),
})

export type PartyTransactionFormValues = z.infer<typeof partyTransactionSchema>

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(1, "Full name is required"),
})

export type SignUpFormValues = z.infer<typeof signUpSchema>