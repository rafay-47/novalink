"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { partyTransactionSchema, PartyTransactionFormValues } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { Party } from "@/types/database"

interface RecordTransactionDialogProps {
  party: Party
  type: "receipt" | "payment" | "adjustment"
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransactionRecorded?: () => void
}

const typeLabels = {
  receipt: "Record Receipt",
  payment: "Record Payment",
  adjustment: "Adjustment Entry",
}

const typeDescriptions = {
  receipt: "Dealer is paying you",
  payment: "You are paying the dealer",
  adjustment: "Discount, return, or price correction",
}

export function RecordTransactionDialog({
  party,
  type,
  open,
  onOpenChange,
  onTransactionRecorded,
}: RecordTransactionDialogProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<PartyTransactionFormValues>({
    resolver: zodResolver(partyTransactionSchema),
    defaultValues: {
      party_id: party.id,
      type,
      amount: 0,
      payment_method: "Cash",
      description: "",
    },
  })

  const onSubmit = async (values: PartyTransactionFormValues) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/parties/${party.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, type }),
      })

      if (response.ok) {
        form.reset({ party_id: party.id, type, amount: 0, payment_method: "Cash", description: "" })
        onOpenChange(false)
        onTransactionRecorded?.()
      }
    } catch (error) {
      console.error("Failed to record transaction:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{typeLabels[type]}</DialogTitle>
          <p className="text-sm text-muted-foreground">{typeDescriptions[type]}</p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="p-3 rounded-md bg-muted text-sm">
              <span className="text-muted-foreground">Party: </span>
              <span className="font-medium">{party.name}</span>
              <span className="text-muted-foreground ml-2">| Balance: </span>
              <span className="font-medium">
                {Math.abs((party as any).balance || 0).toLocaleString()} PKR
              </span>
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (PKR) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {type !== "adjustment" && (
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="JazzCash">JazzCash</SelectItem>
                        <SelectItem value="EasyPaisa">EasyPaisa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
