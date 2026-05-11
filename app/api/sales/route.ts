import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { saleSchema, customerSchema } from "@/lib/validations"
import { generateInvoiceNumber } from "@/lib/utils"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")

  const supabase = await createClient()

  const { data, count, error } = await supabase
    .from("sales")
    .select("*, phones(brand, model, imei)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sales: data, total: count })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = saleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { phone_id, sale_price, payment_method, customer_name, customer_phone, notes } = result.data

    const { data: phone } = await supabase
      .from("phones")
      .select("purchase_price")
      .eq("id", phone_id)
      .single()

    const profit = phone?.purchase_price ? sale_price - phone.purchase_price : null

    const invoice_number = generateInvoiceNumber()

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        phone_id,
        sale_price,
        profit,
        payment_method: payment_method || "Cash",
        customer_name,
        customer_phone,
        sold_by: user.email,
        invoice_number,
        notes,
      })
      .select("*, phones(brand, model, imei)")
      .single()

    if (saleError) {
      return NextResponse.json({ error: saleError.message }, { status: 500 })
    }

    await supabase
      .from("phones")
      .update({ status: "Sold" })
      .eq("id", phone_id)

    return NextResponse.json({ sale }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}