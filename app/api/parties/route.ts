import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { partySchema } from "@/lib/validations"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search") || ""

  const supabase = await createClient()

  let query = supabase
    .from("parties")
    .select("*")
    .order("name", { ascending: true })

  if (search) {
    query = query.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data: parties, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch balances from view
  const { data: balances } = await supabase
    .from("party_balances")
    .select("*")

  const balanceMap = new Map(
    (balances || []).map((b: any) => [b.party_id, Number(b.balance)])
  )

  const partiesWithBalance = (parties || []).map((p) => ({
    ...p,
    balance: balanceMap.get(p.id) || 0,
  }))

  return NextResponse.json({ parties: partiesWithBalance })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = partySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { data: party, error } = await supabase
      .from("parties")
      .insert({
        name: result.data.name,
        contact_person: result.data.contact_person || null,
        phone: result.data.phone || null,
        address: result.data.address || null,
        opening_balance: result.data.opening_balance || 0,
        notes: result.data.notes || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ party }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
