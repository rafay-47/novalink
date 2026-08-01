import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

  const { data: phone, error: fetchError } = await supabase
    .from("phones")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError || !phone) {
    return NextResponse.json({ error: "Phone not found" }, { status: 404 })
  }

  const { data: updatedPhone, error: updateError } = await supabase
    .from("phones")
    .update({
      status: "In Stock",
      reserved_party_id: null,
      reserved_at: null,
    })
    .eq("id", id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ phone: updatedPhone, success: true })
}
