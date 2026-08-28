import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { phoneSchema } from "@/lib/validations"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")
  const status = searchParams.get("status")
  const brand = searchParams.get("brand")
  const condition = searchParams.get("condition")
  const item_type = searchParams.get("item_type")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")

  const supabase = await createClient()

  let query = supabase
    .from("phones")
    .select(`
      *,
      party:reserved_party_id (
        id,
        name
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (search) {
    query = query.or(`imei.ilike.%${search}%,model.ilike.%${search}%,brand.ilike.%${search}%`)
  }

  if (status) {
    if (status === "In Stock") {
      query = query.in("status", ["In Stock", "Reserved"])
    } else {
      query = query.eq("status", status)
    }
  }

  if (brand) {
    query = query.eq("brand", brand)
  }

  if (condition) {
    query = query.eq("condition", condition)
  }

  if (item_type) {
    const itLower = item_type.toLowerCase()
    if (itLower === "accessories") {
      query = query.in("item_type", ["Adapter", "Cable", "adapter", "cable"])
    } else if (itLower === "phone") {
      query = query.or("item_type.eq.Phone,item_type.eq.phone,item_type.is.null")
    } else if (itLower === "adapter") {
      query = query.in("item_type", ["Adapter", "adapter"])
    } else if (itLower === "cable") {
      query = query.in("item_type", ["Cable", "cable"])
    } else {
      query = query.eq("item_type", item_type)
    }
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ phones: data, total: count })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = phoneSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const itemData = { ...result.data }
    if (!itemData.imei) {
      itemData.imei = "ACC-" + Math.random().toString(36).substring(2, 9).toUpperCase()
    }

    const { data, error } = await supabase
      .from("phones")
      .insert(itemData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ phone: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}