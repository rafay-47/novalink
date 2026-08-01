import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { generateInvoiceNumber } from "@/lib/utils"

const convertConsignmentToSaleSchema = z.object({
  sale_price: z.number().min(1, "Sale price is required"),
  payment_method: z.enum(["Cash", "Card", "Transfer", "JazzCash", "EasyPaisa", "Other"]),
  amount_paid: z.number().min(0).optional(),
  notes: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = convertConsignmentToSaleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { sale_price, payment_method, amount_paid, notes } = result.data

    // Fetch consignment phone details
    const { data: phone, error: phoneError } = await supabase
      .from("phones")
      .select("*")
      .eq("id", id)
      .single()

    if (phoneError || !phone) {
      return NextResponse.json({ error: "Consignment phone not found" }, { status: 404 })
    }

    const party_id = phone.reserved_party_id
    let customer_name = "Party Consignment"

    if (party_id) {
      const { data: party } = await supabase
        .from("parties")
        .select("name")
        .eq("id", party_id)
        .single()
      if (party) {
        customer_name = party.name
      }
    }

    const profit = phone.purchase_price ? sale_price - phone.purchase_price : null
    const invoice_number = generateInvoiceNumber()

    // Insert sale record
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        phone_id: phone.id,
        sale_price,
        profit,
        payment_method: payment_method || "Cash",
        customer_name,
        sold_by: user.email,
        invoice_number,
        notes: notes || `Converted from party consignment (${customer_name})`,
      })
      .select("*, phones(brand, model, imei)")
      .single()

    if (saleError) {
      return NextResponse.json({ error: saleError.message }, { status: 500 })
    }

    // Update phone status to Sold and clear consignment fields
    await supabase
      .from("phones")
      .update({
        status: "Sold",
        reserved_party_id: null,
      })
      .eq("id", phone.id)

    // Dual-write: if party_id provided and remaining credit balance > 0
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
            description: `Credit sale: ${phone.brand} ${phone.model} (Invoice #${invoice_number})`,
            created_by: user.email,
          })
      }
    }

    return NextResponse.json({ sale, success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }
}
