import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""

  const supabase = await createClient()

  // Get party info
  const { data: party, error: partyError } = await supabase
    .from("parties")
    .select("*")
    .eq("id", id)
    .single()

  if (partyError || !party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 })
  }

  // Get opening balance from view (total before any filters)
  const { data: balanceData } = await supabase
    .from("party_balances")
    .select("balance")
    .eq("party_id", id)
    .single()

  // Get all transactions with native join through sale_id FK (optionally filtered by date)
  let query = supabase
    .from("party_transactions")
    .select(`
      *,
      sales:sale_id (
        phone_id,
        phones (
          brand,
          model,
          imei
        )
      ),
      purchases:purchase_id (
        phone_id,
        phones (
          brand,
          model,
          imei
        )
      )
    `)
    .eq("party_id", id)
    .order("created_at", { ascending: true })

  if (from) {
    query = query.gte("created_at", from)
  }
  if (to) {
    query = query.lte("created_at", to + "T23:59:59.999Z")
  }

  const { data: transactions, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const closingBalance = Number(balanceData?.balance) || 0

  return NextResponse.json({
    party,
    opening_balance: Number(party.opening_balance) || 0,
    transactions: transactions || [],
    closing_balance: closingBalance,
  })
}
