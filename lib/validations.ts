import { z } from "zod"

export const phoneSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  imei: z.string().min(1, "IMEI is required").max(20, "IMEI too long"),
  color: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  battery_health: z.string().optional(),
  condition: z.enum(["New", "Used", "Refurbished"]),
  pta_status: z.enum(["PTA", "NON-PTA", "JV"]).optional(),
  purchase_price: z.number().min(0).optional(),
  sale_price: z.number().min(0).optional(),
  status: z.enum(["In Stock", "Sold", "Reserved", "Returned"]).optional(),
  notes: z.string().optional(),
})

export type PhoneFormValues = z.infer<typeof phoneSchema>

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>

export const purchaseSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  imei: z.string().min(1, "IMEI is required").max(20, "IMEI too long"),
  color: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  battery_health: z.string().optional(),
  condition: z.enum(["New", "Used", "Refurbished"]),
  pta_status: z.enum(["PTA", "NON-PTA", "JV"]).optional(),
  seller_name: z.string().min(1, "Seller name is required"),
  seller_phone: z.string().optional(),
  seller_cnic: z.string().optional(),
  purchase_price: z.number().min(1, "Purchase price is required"),
  payment_method: z.enum(["Cash", "Card", "Transfer", "JazzCash", "EasyPaisa", "Other"]),
  notes: z.string().optional(),
})

export type PurchaseFormValues = z.infer<typeof purchaseSchema>

export const saleSchema = z.object({
  phone_id: z.string().min(1, "Phone selection is required"),
  customer_id: z.string().optional(),
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().optional(),
  sale_price: z.number().min(1, "Sale price is required"),
  payment_method: z.enum(["Cash", "Card", "Transfer", "JazzCash", "EasyPaisa", "Other"]),
  sold_by: z.string().optional(),
  notes: z.string().optional(),
})

export type SaleFormValues = z.infer<typeof saleSchema>

export const expenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.number().min(1, "Amount is required"),
  category: z.enum(["Rent", "Electricity", "Internet", "Salary", "Accessories", "Repairs", "Miscellaneous"]),
  notes: z.string().optional(),
})

export type ExpenseFormValues = z.infer<typeof expenseSchema>

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