import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const createConsignmentSchema = z.object({
  phone_id: z.string().min(1, "Phone is required"),
  party_id: z.string().min(1, "Party is required"),
})

export async function GET() {
  const supabase = await createClient()

  // Select all phones with status 'Reserved' (with party) along with joined party info
  const { data: consignments, error } = await supabase
    .from("phones")
    .select(`
      *,
      party:reserved_party_id (
        id,
        name,
        phone,
        contact_person
      )
    `)
    .eq("status", "Reserved")
    .order("reserved_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ consignments: consignments || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = createConsignmentSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { phone_id, party_id } = result.data

    // Check if phone is available (In Stock)
    const { data: phone, error: phoneFetchError } = await supabase
      .from("phones")
      .select("*")
      .eq("id", phone_id)
      .single()

    if (phoneFetchError || !phone) {
      return NextResponse.json({ error: "Phone not found" }, { status: 404 })
    }

    if (phone.status !== "In Stock") {
      return NextResponse.json(
        { error: `Phone is currently ${phone.status} and cannot be handed over` },
        { status: 400 }
      )
    }

    // Update phone status to Reserved and set reserved_party_id
    const { data: updatedPhone, error: updateError } = await supabase
      .from("phones")
      .update({
        status: "Reserved",
        reserved_party_id: party_id,
        reserved_at: new Date().toISOString(),
      })
      .eq("id", phone_id)
      .select(`
        *,
        party:reserved_party_id (
          id,
          name,
          phone,
          contact_person
        )
      `)
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ consignment: updatedPhone }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }
}
