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
    } = result.data

    // First, create the phone in inventory
    const { data: phone, error: phoneError } = await supabase
      .from("phones")
      .insert({
        brand,
        model,
        imei,
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
        seller_name,
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

    return NextResponse.json({ purchase, phone }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}