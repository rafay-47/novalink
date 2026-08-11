import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { saleSchema, customerSchema } from "@/lib/validations"
import { generateInvoiceNumber } from "@/lib/utils"

interface SaleRow {
  phones?: { item_type?: string | null } | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const category = searchParams.get("category") // "phones" | "accessories" | null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sales")
    .select("*, phones(brand, model, imei, item_type)")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const allSales = (data as SaleRow[]) || []

  let sales = allSales
  if (category === "phones") {
    sales = allSales.filter((s) => !s.phones?.item_type || s.phones.item_type === "Phone")
  } else if (category === "accessories") {
    sales = allSales.filter(
      (s) => s.phones?.item_type === "Adapter" || s.phones?.item_type === "Cable"
    )
  }

  const total = sales.length
  const paged = sales.slice((page - 1) * limit, page * limit)

  return NextResponse.json({ sales: paged, total })
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

    const { phone_id, sale_price, payment_method, customer_name, customer_phone, notes, party_id, amount_paid, quantity } = body

    const { data: phone } = await supabase
      .from("phones")
      .select("purchase_price, item_type")
      .eq("id", phone_id)
      .single()

    const itemQty = quantity && Number(quantity) > 0 ? Number(quantity) : 1
    const totalUnitCost = (phone?.purchase_price || 0) * itemQty
    const profit = phone?.purchase_price ? sale_price - totalUnitCost : null

    const invoice_number = generateInvoiceNumber()

    // If party_id provided, fetch party name to use as customer_name
    let finalCustomerName = customer_name
    if (party_id) {
      const { data: party } = await supabase
        .from("parties")
        .select("name")
        .eq("id", party_id)
        .single()
      if (party) {
        finalCustomerName = party.name
      }
    }

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        phone_id,
        sale_price,
        profit,
        payment_method: payment_method || "Cash",
        customer_name: finalCustomerName,
        customer_phone,
        sold_by: user.email,
        invoice_number,
        notes: itemQty > 1 ? `Qty: ${itemQty}${notes ? ` | ${notes}` : ""}` : notes,
      })
      .select("*, phones(brand, model, imei, item_type)")
      .single()

    if (saleError) {
      return NextResponse.json({ error: saleError.message }, { status: 500 })
    }

    // Only update status to "Sold" if the item is a Mobile Phone (Adapters & Cables are sold in quantity and stay in catalog)
    if (!phone?.item_type || phone.item_type === "Phone") {
      await supabase
        .from("phones")
        .update({ status: "Sold" })
        .eq("id", phone_id)
    }

    // Dual-write: if party_id provided, create credit sale entry for unpaid amount
    if (party_id) {
      const paid = amount_paid || 0
      const remaining = sale_price - paid
      if (remaining > 0) {
        await supabase
          .from("party_transactions")
          .insert({
            party_id,
            type: "credit_sale",
            amount: remaining,
            reference_id: sale.id,
            reference_type: "sale",
            sale_id: sale.id,
            payment_method: payment_method || null,
            description: `Credit sale: ${invoice_number}`,
            created_by: user.email,
          })
      }
    }

    return NextResponse.json({ sale }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}