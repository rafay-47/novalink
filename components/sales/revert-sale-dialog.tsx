"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Undo2, AlertTriangle } from "lucide-react"

interface RevertSaleDialogProps {
  sale: {
    id: string
    invoice_number?: string | null
    customer_name?: string | null
    sale_price?: number | null
  }
  onReverted?: () => void
  onOpenChange?: (open: boolean) => void
}

export function RevertSaleDialog({ sale, onReverted, onOpenChange }: RevertSaleDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    setError("")
    if (!next) setReason("")
    onOpenChange?.(next)
  }

  const handleRevert = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/sales/${sale.id}/revert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to revert sale")
        return
      }

      handleOpenChange(false)
      onReverted?.()
    } catch {
      setError("Failed to revert sale")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-destructive hover:text-destructive"
        onClick={() => handleOpenChange(true)}
      >
        <Undo2 className="h-3.5 w-3.5 mr-1" />
        Revert
      </Button>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Revert this sale?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-mono font-medium">{sale.invoice_number || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span>{sale.customer_name || "Walk-in"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                {sale.sale_price != null ? `Rs ${Number(sale.sale_price).toLocaleString()}` : "-"}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Reverting this sale will remove it from sales/profit reports, restore the item to
            inventory, and clear any party credit created for it.
          </p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea
              placeholder="e.g. Wrong sale, customer returned device, entered incorrectly"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={loading} onClick={handleRevert}>
            <Undo2 className="mr-2 h-4 w-4" />
            {loading ? "Reverting..." : "Revert Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
