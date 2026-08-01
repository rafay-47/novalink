import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { purchaseSchema } from "@/lib/validations"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data, count, error } = await supabase
    .from("purchases")
    .select("*, phones(brand, model, imei)", { count: "exact" })
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ purchases: data, total: count })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = purchaseSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      item_type,
      brand,
      model,
      imei,
      color,
      ram,
      storage,
      battery_health,
      condition,
      pta_status,
      seller_name,
      seller_phone,
      seller_cnic,
      purchase_price,
      payment_method,
      notes,
      party_id,
      amount_paid,
    } = result.data

    const finalImei = imei || ("ACC-" + Math.random().toString(36).substring(2, 9).toUpperCase())

    // If party_id provided, fetch party name to use as seller_name
    let finalSellerName = seller_name
    if (party_id) {
      const { data: party } = await supabase
        .from("parties")
        .select("name")
        .eq("id", party_id)
        .single()
      if (party) {
        finalSellerName = party.name
      }
    }

    // First, create the item in inventory
    const { data: phone, error: phoneError } = await supabase
      .from("phones")
      .insert({
        item_type: item_type || "Phone",
        brand,
        model,
        imei: finalImei,
        color,
        ram,
        storage,
        battery_health,
        condition,
        pta_status,
        purchase_price,
        status: "In Stock",
      })
      .select()
      .single()

    if (phoneError) {
      return NextResponse.json({ error: phoneError.message }, { status: 500 })
    }

    // Then create the purchase record linked to the phone
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        phone_id: phone.id,
        seller_name: finalSellerName || "Individual Seller",
        seller_phone,
        seller_cnic,
        purchase_price,
        payment_method,
        notes,
      })
      .select("*, phones(brand, model, imei)")
      .single()

    if (purchaseError) {
      return NextResponse.json({ error: purchaseError.message }, { status: 500 })
    }

    // Dual-write: if party_id provided and remaining balance > 0, create credit purchase entry
    if (party_id) {
      const paid = amount_paid || 0
      const remaining = purchase_price - paid
      if (remaining > 0) {
        await supabase
          .from("party_transactions")
          .insert({
            party_id,
            type: "credit_purchase",
            amount: remaining,
            reference_id: purchase.id,
            reference_type: "purchase",
            purchase_id: purchase.id,
            payment_method: payment_method || null,
            description: `Credit purchase: ${brand} ${model}`,
            created_by: user.email,
          })
      }
    }

    return NextResponse.json({ purchase, phone }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}