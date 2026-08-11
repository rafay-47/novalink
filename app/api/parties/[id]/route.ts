import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { partySchema } from "@/lib/validations"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: party, error } = await supabase
    .from("parties")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 })
  }

  // Get balance from view
  const { data: balanceData } = await supabase
    .from("party_balances")
    .select("balance")
    .eq("party_id", id)
    .single()

  // Get transactions with native join through sale_id FK
  const { data: transactions } = await supabase
    .from("party_transactions")
    .select(`
      *,
      sales:sale_id (
        phone_id,
        notes,
        phones (
          brand,
          model,
          imei,
          color,
          storage,
          ram,
          pta_status,
          condition,
          item_type
        )
      ),
      purchases:purchase_id (
        phone_id,
        notes,
        phones (
          brand,
          model,
          imei,
          color,
          storage,
          ram,
          pta_status,
          condition,
          item_type
        )
      )
    `)
    .eq("party_id", id)
    .order("created_at", { ascending: false })

  return NextResponse.json({
    party: {
      ...party,
      balance: Number(balanceData?.balance) || 0,
    },
    transactions: transactions || [],
  })
}

export async function PATCH(
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
    const result = partySchema.partial().safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { data: party, error } = await supabase
      .from("parties")
      .update(result.data)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ party })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if party has transactions
  const { count } = await supabase
    .from("party_transactions")
    .select("*", { count: "exact", head: true })
    .eq("party_id", id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: "Cannot delete party with existing transactions. Delete transactions first or archive instead." },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from("parties")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
