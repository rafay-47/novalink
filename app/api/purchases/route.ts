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

    const { data, error } = await supabase
      .from("purchases")
      .insert(result.data)
      .select("*, phones(brand, model, imei)")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ purchase: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}