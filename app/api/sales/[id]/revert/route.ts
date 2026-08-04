import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const revertSaleSchema = z.object({
  reason: z.string().optional(),
})

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
    const body = await request.json().catch(() => ({}))
    const result = revertSaleSchema.safeParse(body)
    const reason = result.success ? result.data.reason : undefined

    // Fetch sale with phone details to determine inventory restoration
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .select("*, phones(item_type)")
      .eq("id", id)
      .single()

    if (saleError || !sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 })
    }

    // Guard against double-revert: only flip rows still marked 'active'
    const { data: updatedSale, error: updateError } = await supabase
      .from("sales")
      .update({
        status: "reversed",
        reversed_at: new Date().toISOString(),
        reversed_by: user.email,
        revert_reason: reason || null,
      })
      .eq("id", id)
      .eq("status", "active")
      .select()
      .single()

    if (updateError || !updatedSale) {
      return NextResponse.json(
        { error: "Sale is already reversed or cannot be reverted" },
        { status: 400 }
      )
    }

    // Remove any party credit entries linked to this sale (restores party balance)
    const { error: txError } = await supabase
      .from("party_transactions")
      .delete()
      .eq("sale_id", id)

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 })
    }

    // Restore phone to stock if it was a mobile phone sold from inventory
    const phone = sale.phones as { item_type?: string | null } | null
    const isMobilePhone = !phone?.item_type || phone.item_type === "Phone"
    if (isMobilePhone && sale.phone_id) {
      const { error: phoneError } = await supabase
        .from("phones")
        .update({ status: "In Stock" })
        .eq("id", sale.phone_id)
        .eq("status", "Sold")

      if (phoneError) {
        return NextResponse.json({ error: phoneError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ sale: updatedSale, success: true })
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }
}
