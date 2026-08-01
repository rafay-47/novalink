import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { partyTransactionSchema } from "@/lib/validations"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const type = searchParams.get("type") || ""

  const supabase = await createClient()

  let query = supabase
    .from("party_transactions")
    .select("*", { count: "exact" })
    .eq("party_id", id)
    .order("created_at", { ascending: false })

  if (type) {
    query = query.eq("type", type)
  }

  const { data, count, error } = await query
    .range((page - 1) * limit, page * limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ transactions: data, total: count })
}

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
    const result = partyTransactionSchema.safeParse({
      ...body,
      party_id: id,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { data: transaction, error } = await supabase
      .from("party_transactions")
      .insert({
        party_id: id,
        type: result.data.type,
        amount: result.data.amount,
        reference_id: result.data.reference_id || null,
        reference_type: result.data.reference_type || null,
        payment_method: result.data.payment_method || null,
        description: result.data.description || null,
        created_by: user.email,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ transaction }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
